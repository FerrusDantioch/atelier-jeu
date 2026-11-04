// =============================================================================
// Tests automatiques de l'étape 3 : quêtes enchaînées, lieux, sauvegarde.
// Lancement : « npm test » (ou « node --test ») dans le dossier du jeu.
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MONDE,
  ETAPES,
  etapeLampe,
  creerEtatJeu,
  appliquerAction,
  utiliserEtabli,
  objectifActuel,
  objectifSecondaire,
  marqueursActifs,
  deplacerJoueur,
  calculerPas,
  toucheUnObstacle,
} from '../js/logique.js';
import { lancerFabrication, acheterMateriau, avancerTemps, recettesDisponibles, peutFabriquer } from '../js/logique-atelier.js';
import {
  QUETES,
  queteEnCours,
  queteDisponible,
  verifierQuetes,
  appliquerActionQuete,
  dialoguePnjQuete,
  objetsARamasser,
  ramasserObjetsQuete,
  utiliserObjetQuete,
  objectifQuetes,
  marqueursQuetes,
} from '../js/logique-quetes.js';
import {
  ZONES,
  obstaclesZone,
  sortieAtteinte,
  cibleProcheZone,
  conditionRemplie,
  dialogueLeon,
  libelleZone,
} from '../js/logique-zones.js';
import { serialiserPartie, chargerPartie } from '../js/logique-sauvegarde.js';

// --- Petits outils -------------------------------------------------------------------

// Joue la quête de la lampe d'Odile jusqu'au bout.
function finirQueteLampe(etat) {
  appliquerAction(etat, 'quete:accepter:lampe-odile');
  for (const e of MONDE.engrenages) ramasserObjetsQuete(etat, 'place', e.x, e.z);
  utiliserEtabli(etat);
  appliquerAction(etat, 'quete:parler:lampe-odile');
}

// Fabrique un objet de quête en achetant ce qu'il faut, puis attend la fin.
function fabriquer(etat, id) {
  for (const m of ['cuivre', 'bois', 'ressort']) acheterMateriau(etat, m, Math.max(0, 3 - etat.atelier.stock[m]));
  const messages = lancerFabrication(etat, id);
  assert.ok(messages[0].startsWith('Fabrication lancée'), messages[0]);
  for (let t = 0; t < 20; t += 0.5) avancerTemps(etat, 0.5);
  return verifierQuetes(etat);
}

// Fait marcher Ferrus vers un point dans un lieu ; renvoie la position finale.
function marcher(zoneId, etat, depart, dirX, dirZ, secondes) {
  const obstacles = obstaclesZone(zoneId, etat);
  let p = { ...depart };
  for (let t = 0; t < secondes; t += 1 / 30) {
    const { dx, dz } = calculerPas(dirX, dirZ, MONDE.joueur.vitesse, 1 / 30);
    p = deplacerJoueur(p, dx, dz, obstacles, ZONES[zoneId]);
  }
  return p;
}

// --- La chaîne de quêtes ------------------------------------------------------------

test('au début, seule la lampe d\'Odile est disponible ; les autres quêtes sont verrouillées', () => {
  const etat = creerEtatJeu();
  assert.equal(queteDisponible(etat).id, 'lampe-odile');
  assert.equal(queteEnCours(etat), null);
  assert.equal(etat.quetes['balance-capucine'].statut, 'verrouillee');
  assert.equal(etat.quetes['roue-moulin'].statut, 'verrouillee');
  assert.equal(objectifQuetes(etat), 'Va parler à Odile, devant sa maison à droite de la place.');
});

test('une ancienne sauvegarde (version 1) en pleine quête de la lampe reprend au bon endroit', () => {
  const ancienne = (etape, engrenages) => JSON.stringify({
    version: 1,
    etat: { argent: 20, quete: { etape, engrenagesRamasses: engrenages } },
    zone: 'place',
    position: { x: 0, z: 5 },
  });
  const cherche = chargerPartie(ancienne('acceptee', ['engrenage-2'])).etat;
  assert.equal(etapeLampe(cherche), ETAPES.ACCEPTEE);
  assert.deepEqual(objetsARamasser(cherche, 'place').map((o) => o.id), ['engrenage-1', 'engrenage-3']);
  assert.match(objectifQuetes(cherche), /1\/3/);
  const reunis = chargerPartie(ancienne('engrenages_reunis', ['engrenage-1', 'engrenage-2', 'engrenage-3'])).etat;
  assert.equal(etapeLampe(reunis), ETAPES.ENGRENAGES_REUNIS);
  const reparee = chargerPartie(ancienne('lampe_reparee', [])).etat;
  assert.equal(etapeLampe(reparee), ETAPES.LAMPE_REPAREE);
  // Et la suite se joue normalement : Odile paie, l'atelier ouvre.
  appliquerAction(reparee, 'quete:parler:lampe-odile');
  assert.equal(reparee.argent, 140);
  assert.equal(reparee.atelier.ouvert, true);
});

test('finir la lampe d\'Odile rend la quête de Capucine disponible', () => {
  const etat = creerEtatJeu();
  finirQueteLampe(etat);
  assert.equal(queteDisponible(etat).id, 'balance-capucine');
  assert.match(objectifActuel(etat), /Capucine, au marché/);
  assert.ok(marqueursQuetes(etat).has('capucine'));
});

test('la balance ne se fabrique que pendant la quête, et les clients ne la commandent pas', () => {
  const etat = creerEtatJeu();
  finirQueteLampe(etat);
  assert.ok(!recettesDisponibles(etat).includes('balance'));
  assert.equal(peutFabriquer(etat, 'balance').possible, false);
  appliquerActionQuete(etat, 'quete:accepter:balance-capucine');
  assert.ok(recettesDisponibles(etat).includes('balance'));
  // Beaucoup de clients plus tard, aucun n'a commandé une balance.
  etat.argent = 1000;
  for (let t = 0; t < 400; t += 1) {
    avancerTemps(etat, 1);
    etat.atelier.clients.forEach((c) => assert.notEqual(c.commande, 'balance'));
    etat.atelier.clients = [];
  }
});

test('quête de Capucine : accepter, fabriquer, livrer → récompense et chemin du moulin ouvert', () => {
  const etat = creerEtatJeu();
  finirQueteLampe(etat);
  etat.argent = 200;
  assert.equal(conditionRemplie(etat, 'chemin-moulin'), false);

  const dialogue = dialoguePnjQuete(etat, 'capucine', 'Capucine');
  assert.ok(dialogue.choix.some((c) => c.action === 'quete:accepter:balance-capucine'));
  appliquerAction(etat, 'fermer');
  appliquerActionQuete(etat, 'quete:accepter:balance-capucine');
  assert.equal(queteEnCours(etat).etape.type, 'fabriquer');
  assert.ok(marqueursActifs(etat).etabli, 'le marqueur devrait être sur l\'établi');

  fabriquer(etat, 'balance');
  assert.equal(queteEnCours(etat).etape.type, 'livrer');
  assert.ok(marqueursQuetes(etat).has('capucine'));

  const argentAvant = etat.argent;
  const livraison = dialoguePnjQuete(etat, 'capucine', 'Capucine');
  assert.ok(livraison.choix.some((c) => c.action === 'quete:livrer:balance-capucine'));
  const messages = appliquerActionQuete(etat, 'quete:livrer:balance-capucine');
  assert.equal(etat.argent, argentAvant + QUETES['balance-capucine'].recompense);
  assert.equal(etat.atelier.stock.balance, 0);
  assert.ok(messages.includes('Quête terminée : La balance de Capucine'));
  assert.ok(messages.includes('Nouvelle quête : La roue du moulin'));
  assert.equal(conditionRemplie(etat, 'chemin-moulin'), true);
  // La recette de quête redevient inaccessible.
  assert.ok(!recettesDisponibles(etat).includes('balance'));
});

test('quête du moulin : pales, axe, mécanisme, Barnabé', () => {
  const etat = creerEtatJeu();
  finirQueteLampe(etat);
  etat.argent = 500;
  appliquerActionQuete(etat, 'quete:accepter:balance-capucine');
  fabriquer(etat, 'balance');
  appliquerActionQuete(etat, 'quete:livrer:balance-capucine');

  appliquerActionQuete(etat, 'quete:accepter:roue-moulin');
  // Les pales n'apparaissent qu'au moulin.
  assert.equal(objetsARamasser(etat, 'marche').length, 0);
  const pales = objetsARamasser(etat, 'moulin');
  assert.equal(pales.length, 3);
  assert.deepEqual(ramasserObjetsQuete(etat, 'moulin', pales[0].x + 3, pales[0].z), []);
  assert.deepEqual(ramasserObjetsQuete(etat, 'moulin', pales[0].x, pales[0].z), ['Pale ramassée 1/3']);
  assert.match(objectifActuel(etat), /1\/3/);
  for (const p of pales) ramasserObjetsQuete(etat, 'moulin', p.x, p.z);
  assert.equal(queteEnCours(etat).etape.type, 'fabriquer');

  // Le mécanisme refuse tant que l'axe n'est pas fabriqué.
  assert.equal(utiliserObjetQuete(etat, 'mecanisme'), null);
  fabriquer(etat, 'axe');
  assert.equal(queteEnCours(etat).etape.type, 'utiliser');
  assert.ok(marqueursQuetes(etat).has('mecanisme'));
  utiliserObjetQuete(etat, 'mecanisme');
  assert.equal(queteEnCours(etat).etape.type, 'parler');

  const argentAvant = etat.argent;
  const fin = dialoguePnjQuete(etat, 'barnabe', 'Barnabé');
  appliquerActionQuete(etat, fin.choix[0].action);
  assert.equal(etat.argent, argentAvant + QUETES['roue-moulin'].recompense);
  assert.equal(queteEnCours(etat), null);
  assert.equal(queteDisponible(etat), null);
  // Plus de quête : l'objectif revient à l'atelier.
  assert.equal(objectifQuetes(etat), null);
  assert.ok(objectifActuel(etat).length > 10);
  assert.match(dialogueLeon(etat).repliques[0], /Cuivrebourg revit/);
});

test('une seule quête en cours à la fois, et on ne peut pas tricher avec les actions', () => {
  const etat = creerEtatJeu();
  // Accepter une quête verrouillée : rien ne se passe.
  assert.deepEqual(appliquerActionQuete(etat, 'quete:accepter:roue-moulin'), []);
  finirQueteLampe(etat);
  appliquerActionQuete(etat, 'quete:accepter:balance-capucine');
  // Livrer sans avoir la balance : rien ne se passe.
  assert.deepEqual(appliquerActionQuete(etat, 'quete:livrer:balance-capucine'), []);
  assert.equal(queteEnCours(etat).suivi.etape, 0);
  // Action inconnue : ignorée.
  assert.deepEqual(appliquerActionQuete(etat, 'quete:voler:tout'), []);
});

test('pendant une quête, un client qui attend apparaît en deuxième ligne d\'objectif', () => {
  const etat = creerEtatJeu();
  finirQueteLampe(etat);
  appliquerActionQuete(etat, 'quete:accepter:balance-capucine');
  assert.equal(objectifSecondaire(etat), null);
  etat.atelier.clients = [{ id: 1, nom: 'Berthe', salut: 'Bonjour !', commande: 'lanterne' }];
  assert.match(objectifSecondaire(etat), /^Atelier : .*Berthe/);
});

test('chaque quête a des textes pour chaque situation', () => {
  for (const [id, q] of Object.entries(QUETES)) {
    for (const cle of ['proposition', 'enCours', 'apres']) assert.ok(q.textes[cle].length > 0, `${id} : textes.${cle}`);
    for (const e of q.etapes) assert.ok(e.objectif.length > 10, `${id} : objectif manquant`);
  }
});

// --- Les lieux ------------------------------------------------------------------------

test('le portail de la place est fermé avant l\'ouverture de l\'atelier', () => {
  const etat = creerEtatJeu();
  const arrivee = marcher('place', etat, { x: 0, z: 9 }, 0, 1, 4);
  assert.equal(sortieAtteinte('place', arrivee.x, arrivee.z, etat), null);
  finirQueteLampe(etat);
  const apres = marcher('place', etat, { x: 0, z: 9 }, 0, 1, 4);
  const sortie = sortieAtteinte('place', apres.x, apres.z, etat);
  assert.equal(sortie && sortie.zone, 'marche');
});

test('le chemin du moulin est bloqué par l\'arbre tombé jusqu\'à la fin de la quête de Capucine', () => {
  const etat = creerEtatJeu();
  finirQueteLampe(etat);
  const bloque = marcher('marche', etat, { x: 10, z: 0 }, 1, 0, 4);
  assert.equal(sortieAtteinte('marche', bloque.x, bloque.z, etat), null);
  assert.equal(cibleProcheZone('marche', bloque.x, bloque.z, etat), 'barriere');
  etat.quetes['balance-capucine'].statut = 'terminee';
  const libre = marcher('marche', etat, { x: 10, z: 0 }, 1, 0, 4);
  assert.equal(sortieAtteinte('marche', libre.x, libre.z, etat).zone, 'moulin');
});

test('chaque sortie mène à un point d\'arrivée libre, qui ne renvoie pas aussitôt en arrière', () => {
  const etat = creerEtatJeu();
  etat.atelier.ouvert = true;
  etat.quetes['balance-capucine'].statut = 'terminee';
  for (const [id, zone] of Object.entries(ZONES)) {
    for (const s of zone.sorties) {
      const arrivee = ZONES[s.vers].arrivees[id];
      assert.ok(arrivee, `pas d'arrivée dans ${s.vers} depuis ${id}`);
      assert.equal(toucheUnObstacle(arrivee.x, arrivee.z, MONDE.joueur.rayon, obstaclesZone(s.vers, etat)), false, `arrivée bloquée dans ${s.vers}`);
      assert.equal(sortieAtteinte(s.vers, arrivee.x, arrivee.z, etat), null, `arrivée dans ${s.vers} = déjà une sortie`);
    }
  }
});

test('dans les nouveaux lieux, Ferrus ne sort jamais du terrain et ne traverse rien', () => {
  const etat = creerEtatJeu();
  etat.atelier.ouvert = true;
  for (const zoneId of ['marche', 'moulin']) {
    const zone = ZONES[zoneId];
    const obstacles = obstaclesZone(zoneId, etat);
    let graine = 7;
    const hasard = () => ((graine = (graine * 16807) % 2147483647) / 2147483647) * 2 - 1;
    let p = { x: Object.values(zone.arrivees)[0].x, z: Object.values(zone.arrivees)[0].z };
    for (let i = 0; i < 200; i++) {
      const dx = hasard();
      const dz = hasard();
      for (let j = 0; j < 30; j++) {
        const pas = calculerPas(dx, dz, MONDE.joueur.vitesse, 1 / 30);
        p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, zone);
        assert.equal(toucheUnObstacle(p.x, p.z, MONDE.joueur.rayon, obstacles), false, `${zoneId} : dans un obstacle en (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
      }
    }
  }
});

test('les pales et les personnages sont accessibles', () => {
  const etat = creerEtatJeu();
  const obstacles = obstaclesZone('moulin', etat);
  for (const o of QUETES['roue-moulin'].etapes[0].objets) {
    assert.equal(toucheUnObstacle(o.x, o.z, MONDE.joueur.rayon, obstacles), false, `${o.id} inaccessible`);
  }
  // On trouve une position libre, à portée, pour chaque personnage ou objet.
  for (const [zoneId, zone] of Object.entries(ZONES)) {
    if (zoneId === 'place') continue;
    const obs = obstaclesZone(zoneId, etat);
    for (const i of zone.interactifs) {
      let trouve = false;
      for (let a = 0; a < Math.PI * 2 && !trouve; a += Math.PI / 16) {
        for (let d = 0.6; d <= i.distanceInteraction && !trouve; d += 0.1) {
          const x = i.x + Math.cos(a) * d;
          const z = i.z + Math.sin(a) * d;
          if (!toucheUnObstacle(x, z, MONDE.joueur.rayon, obs) && cibleProcheZone(zoneId, x, z, etat) === i.id) trouve = true;
        }
      }
      assert.ok(trouve, `${zoneId} : impossible d'approcher ${i.id}`);
    }
  }
});

test('les aides d\'interaction ont un texte clair', () => {
  const etat = creerEtatJeu();
  assert.equal(libelleZone(etat, 'capucine'), 'Parler à Capucine');
  assert.equal(libelleZone(etat, 'barnabe'), 'Parler à Barnabé');
  assert.equal(libelleZone(etat, 'etabli'), "Regarder l'établi");
});

// --- La sauvegarde ----------------------------------------------------------------------

test('sauvegarder puis relire redonne exactement la même partie', () => {
  const etat = creerEtatJeu();
  finirQueteLampe(etat);
  appliquerActionQuete(etat, 'quete:accepter:balance-capucine');
  etat.atelier.clients = [{ id: 4, nom: 'Lison', salut: 'Coucou !', commande: 'lanterne' }];
  etat.atelier.fabrication = { recette: 'balance', restant: 3, total: 8 };
  const texte = serialiserPartie({ etat, zone: 'marche', position: { x: 2, z: -3 }, orientation: 1.5 });
  const relu = chargerPartie(texte);
  assert.deepEqual(relu.etat, etat);
  assert.equal(relu.zone, 'marche');
  assert.deepEqual(relu.position, { x: 2, z: -3 });
  assert.equal(relu.orientation, 1.5);
});

test('une partie entièrement terminée se relit à l\'identique', () => {
  const etat = creerEtatJeu();
  finirQueteLampe(etat);
  for (const id of Object.keys(QUETES)) {
    etat.quetes[id].statut = 'terminee';
    etat.quetes[id].etape = QUETES[id].etapes.length;
  }
  const relu = chargerPartie(serialiserPartie({ etat, zone: 'moulin', position: { x: 0, z: 0 } }));
  assert.deepEqual(relu.etat, etat);
});

test('une sauvegarde illisible ou d\'une autre version est refusée (sans planter)', () => {
  assert.equal(chargerPartie('ceci n\'est pas du JSON'), null);
  assert.equal(chargerPartie(''), null);
  assert.equal(chargerPartie('null'), null);
  assert.equal(chargerPartie(JSON.stringify({ version: 99, etat: {} })), null);
});

test('une sauvegarde incomplète est complétée avec les valeurs de départ', () => {
  // Par exemple une sauvegarde faite avant l'ajout des quêtes.
  const ancienne = { version: 1, etat: { argent: 77, quete: { etape: 'terminee' } }, zone: 'place', position: { x: 1, z: 1 } };
  const relu = chargerPartie(JSON.stringify(ancienne));
  assert.equal(relu.etat.argent, 77);
  // Ancienne version : la quête de la lampe est rangée avec les autres quêtes.
  assert.equal(relu.etat.quete, undefined);
  assert.equal(etapeLampe(relu.etat), ETAPES.TERMINEE);
  assert.equal(relu.etat.quetes['balance-capucine'].statut, 'disponible');
  assert.ok(relu.etat.quetes['balance-capucine']);
  assert.ok(relu.etat.atelier.stock.cuivre === 0);
});

test('une sauvegarde trafiquée est corrigée', () => {
  const triche = {
    version: 1,
    etat: {
      argent: -500,
      quete: { etape: 'n_importe_quoi' },
      atelier: {
        ouvert: true,
        stock: { cuivre: 'beaucoup', bois: -4, ressort: 2.7 },
        fabrication: { recette: 'licorne', restant: 1, total: 1 },
        clients: [{ id: 1, nom: 'X', commande: 'licorne' }, 'bizarre'],
      },
      quetes: { 'roue-moulin': { statut: 'magique', etape: 99 } },
    },
    zone: 'atlantide',
    position: { x: 'loin', z: 0 },
  };
  const relu = chargerPartie(JSON.stringify(triche));
  assert.equal(relu.etat.argent, 0);
  assert.equal(etapeLampe(relu.etat), ETAPES.PAS_COMMENCEE);
  assert.equal(relu.etat.quetes['lampe-odile'].statut, 'disponible');
  assert.equal(relu.etat.atelier.stock.cuivre, 0);
  assert.equal(relu.etat.atelier.stock.bois, 0);
  assert.equal(relu.etat.atelier.stock.ressort, 2);
  assert.equal(relu.etat.atelier.fabrication, null);
  assert.deepEqual(relu.etat.atelier.clients, []);
  assert.equal(relu.etat.quetes['roue-moulin'].statut, 'verrouillee');
  assert.equal(relu.etat.quetes['roue-moulin'].etape, QUETES['roue-moulin'].etapes.length - 1);
  assert.equal(relu.zone, 'place');
  assert.equal(relu.position, null);
});
