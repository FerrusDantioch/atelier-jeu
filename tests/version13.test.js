// =============================================================================
// Tests de la version 1.3 : le voyage en train, la mine de cuivre et la quête
// de Sidonie, la boîte à musique et l'automate pour les clients.
// Lancement : npm test   (ou : node --test)
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MONDE, creerEtatJeu, deplacerJoueur, calculerPas, toucheUnObstacle, objectifActuel } from '../js/logique.js';
import {
  RECETTES,
  AMELIORATIONS,
  ouvrirAtelier,
  lancerFabrication,
  acheterMateriau,
  acheterAmelioration,
  avancerTemps,
  recetteDebloquee,
  servirClient,
  clientAuComptoir,
} from '../js/logique-atelier.js';
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
  majDisponibilites,
} from '../js/logique-quetes.js';
import {
  ZONES,
  obstaclesZone,
  libelleZone,
  messageObjet,
  dialogueLeon,
  voyageTrain,
  wagonnetRepare,
} from '../js/logique-zones.js';
import { serialiserPartie, chargerPartie } from '../js/logique-sauvegarde.js';

// Une partie où les quêtes sont finies jusqu'à « jusqua » (compris).
function partieFinieJusqua(jusqua) {
  const etat = creerEtatJeu();
  ouvrirAtelier(etat);
  for (const id of Object.keys(QUETES)) {
    etat.quetes[id].statut = 'terminee';
    etat.quetes[id].etape = QUETES[id].etapes.length;
    if (id === jusqua) break;
  }
  majDisponibilites(etat);
  etat.argent = 500;
  return etat;
}

function fabriquer(etat, id) {
  for (const m of ['cuivre', 'bois', 'ressort']) acheterMateriau(etat, m, Math.max(0, 3 - etat.atelier.stock[m]));
  const messages = lancerFabrication(etat, id);
  assert.ok(messages[0].startsWith('Fabrication lancée'), messages[0]);
  for (let t = 0; t < 30; t += 0.5) avancerTemps(etat, 0.5);
  return verifierQuetes(etat);
}

// -----------------------------------------------------------------------------
// Le voyage en train
// -----------------------------------------------------------------------------
test('on ne peut prendre le train qu\'une fois la locomotive réparée', () => {
  const avant = partieFinieJusqua('horloge-gare');
  assert.equal(voyageTrain(avant, 'gare'), null);
  assert.equal(libelleZone(avant, 'locomotive'), 'La locomotive');

  const apres = partieFinieJusqua('train-cuivrebourg');
  assert.deepEqual(voyageTrain(apres, 'gare'), { zone: 'mine', ...ZONES.mine.arrivees.gare });
  assert.deepEqual(voyageTrain(apres, 'mine'), { zone: 'gare', ...ZONES.gare.arrivees.mine });
  assert.equal(voyageTrain(apres, 'place'), null, 'pas de train sur la place');
  assert.match(libelleZone(apres, 'locomotive'), /Monter dans le train/);
  assert.match(libelleZone(apres, 'train-retour'), /Rentrer/);
});

test('en descendant du train, Ferrus arrive sur un quai libre', () => {
  const etat = partieFinieJusqua('train-cuivrebourg');
  for (const depuis of ['gare', 'mine']) {
    const v = voyageTrain(etat, depuis);
    assert.equal(toucheUnObstacle(v.x, v.z, MONDE.joueur.rayon, obstaclesZone(v.zone, etat)), false, `arrivée à ${v.zone}`);
  }
});

// -----------------------------------------------------------------------------
// La mine de cuivre
// -----------------------------------------------------------------------------
test('à la mine, on ne traverse ni les rochers, ni l\'entrée, ni le wagonnet, ni la voie', () => {
  const etat = partieFinieJusqua('train-cuivrebourg');
  const obstacles = obstaclesZone('mine', etat);
  for (const id of ['voie', 'entree-mine', 'wagonnet', 'cabane', 'rocher-1', 'sidonie']) {
    assert.ok(obstacles.some((o) => o.id === id), `${id} manque dans les obstacles`);
  }
  // La mine n'a pas de sortie à pied : on en repart en train.
  assert.equal(ZONES.mine.sorties.length, 0);
});

test('les pépites de cuivre sont toutes accessibles', () => {
  const etat = partieFinieJusqua('train-cuivrebourg');
  const obstacles = obstaclesZone('mine', etat);
  for (const o of QUETES['wagonnet-mine'].etapes[0].objets) {
    assert.equal(o.lieu, 'mine');
    assert.equal(toucheUnObstacle(o.x, o.z, MONDE.joueur.rayon, obstacles), false, `${o.id} inaccessible`);
  }
});

test('quête du wagonnet : pépites, roue, wagonnet, Sidonie → les plans de l\'automate en cadeau', () => {
  const etat = partieFinieJusqua('train-cuivrebourg');
  assert.equal(queteDisponible(etat).id, 'wagonnet-mine');
  assert.ok(marqueursQuetes(etat).has('sidonie'));
  appliquerActionQuete(etat, dialoguePnjQuete(etat, 'sidonie', 'Sidonie').choix[0].action);

  const pepites = objetsARamasser(etat, 'mine');
  assert.equal(pepites.length, 3);
  for (const o of pepites) ramasserObjetsQuete(etat, 'mine', o.x, o.z);
  assert.equal(queteEnCours(etat).etape.type, 'fabriquer');

  assert.equal(utiliserObjetQuete(etat, 'wagonnet'), null);
  assert.match(messageObjet(etat, 'wagonnet')[0], /roue/);
  fabriquer(etat, 'roue-wagonnet');
  assert.ok(marqueursQuetes(etat).has('wagonnet'));
  assert.equal(libelleZone(etat, 'wagonnet'), 'Poser la roue neuve');
  assert.equal(wagonnetRepare(etat), false);
  utiliserObjetQuete(etat, 'wagonnet');
  assert.equal(wagonnetRepare(etat), true);

  const argentAvant = etat.argent;
  assert.equal(recetteDebloquee(etat, 'automate'), false);
  const messages = appliquerActionQuete(etat, dialoguePnjQuete(etat, 'sidonie', 'Sidonie').choix[0].action);
  assert.equal(etat.argent, argentAvant + QUETES['wagonnet-mine'].recompense);
  assert.ok(messages.includes("Cadeau : Plans d'automate"), messages.join(' | '));
  assert.ok(etat.atelier.ameliorations.includes('plans-automate'));
  assert.equal(recetteDebloquee(etat, 'automate'), true);
  // C'est la dernière quête : plus rien à aller chercher.
  assert.equal(queteDisponible(etat), null);
  assert.equal(objectifQuetes(etat), null);
  assert.match(dialogueLeon(etat).repliques[0], /Cuivrebourg revit/);
});

test('promenades au hasard dans les cinq lieux : Ferrus ne se coince jamais dans un obstacle', () => {
  // On essaie avec la partie au début, puis avec toutes les quêtes finies
  // (les barrières sont alors ouvertes, les passages changent).
  for (const fini of [false, true]) {
    const etat = fini ? partieFinieJusqua('wagonnet-mine') : creerEtatJeu();
    if (!fini) ouvrirAtelier(etat);
    for (const [zoneId, zone] of Object.entries(ZONES)) {
      const obstacles = obstaclesZone(zoneId, etat);
      for (let graine = 1; graine <= 12; graine++) {
        let g = graine * 7;
        const hasard = () => ((g = (g * 16807) % 2147483647) / 2147483647) * 2 - 1;
        const depart = Object.values(zone.arrivees)[0] || MONDE.joueur;
        let p = { x: depart.x, z: depart.z };
        for (let i = 0; i < 120; i++) {
          const dx = hasard();
          const dz = hasard();
          for (let j = 0; j < 30; j++) {
            const pas = calculerPas(dx, dz, MONDE.joueur.vitesse, 1 / 30);
            p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, zone);
            assert.equal(toucheUnObstacle(p.x, p.z, MONDE.joueur.rayon, obstacles), false,
              `${zoneId} (graine ${graine}) : coincé en (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
          }
        }
      }
    }
  }
});

test('Ferrus glisse toujours le long des murs (il ne reste pas bloqué contre une haie)', () => {
  const zone = ZONES.marche;
  const etat = creerEtatJeu();
  const obstacles = obstaclesZone('marche', etat);
  // Il marche en diagonale contre la haie du sud : il doit continuer vers l'est.
  let p = { x: -4, z: 8 };
  for (let j = 0; j < 60; j++) {
    const pas = calculerPas(1, 1, MONDE.joueur.vitesse, 1 / 30);
    p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, zone);
  }
  assert.ok(p.x > -2, `il a glissé jusqu'à x = ${p.x.toFixed(2)}`);
});

// -----------------------------------------------------------------------------
// La boîte à musique et l'automate
// -----------------------------------------------------------------------------
test('la boîte à musique se débloque en achetant ses plans à l\'établi', () => {
  const etat = partieFinieJusqua('lampe-odile');
  etat.argent = 300;
  assert.equal(recetteDebloquee(etat, 'boite-musique'), false);
  assert.deepEqual(acheterAmelioration(etat, 'plans-boite-musique'), ['Nouvelle amélioration : Plans de boîte à musique']);
  assert.equal(etat.argent, 300 - AMELIORATIONS['plans-boite-musique'].prix);
  assert.equal(recetteDebloquee(etat, 'boite-musique'), true);
});

test('les plans de l\'automate ne s\'achètent pas : c\'est le cadeau de Sidonie', () => {
  const etat = partieFinieJusqua('lampe-odile');
  etat.argent = 1000;
  const messages = acheterAmelioration(etat, 'plans-automate');
  assert.match(messages[0], /Sidonie/);
  assert.equal(etat.argent, 1000);
  assert.ok(!etat.atelier.ameliorations.includes('plans-automate'));
  // L'objectif de l'atelier ne propose jamais de les « acheter ».
  etat.atelier.ameliorations = Object.keys(AMELIORATIONS).filter((id) => id !== 'plans-automate');
  assert.doesNotMatch(objectifActuel(etat) || '', /automate/i);
});

test('une fois débloqués, les clients commandent des boîtes à musique et des automates', () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  // (ici, on donne directement les deux plans : la quête n'a pas été jouée)
  etat.atelier.ameliorations.push('plans-boite-musique', 'plans-automate');
  const commandes = new Set();
  for (let t = 0; t < 3000; t += 1) {
    avancerTemps(etat, 1);
    const client = clientAuComptoir(etat);
    if (client) {
      commandes.add(client.commande);
      etat.atelier.stock[client.commande] = 1;
      servirClient(etat);
    }
  }
  assert.ok(commandes.has('boite-musique'), [...commandes].join(', '));
  assert.ok(commandes.has('automate'), [...commandes].join(', '));
  for (const id of commandes) assert.ok(!RECETTES[id].quete, `un client a commandé un objet de quête : ${id}`);
});

test('l\'automate se vend plus cher que tout le reste, et rapporte plus qu\'il ne coûte', () => {
  const prixMateriaux = { cuivre: 8, bois: 4, ressort: 6 };
  for (const id of ['boite-musique', 'automate']) {
    const r = RECETTES[id];
    const cout = Object.entries(r.ingredients).reduce((s, [m, n]) => s + prixMateriaux[m] * n, 0);
    assert.ok(r.prixVente > cout * 2, `${id} : vendu ${r.prixVente}, coûte ${cout}`);
  }
  const autres = Object.values(RECETTES).filter((r) => r !== RECETTES.automate).map((r) => r.prixVente);
  assert.ok(RECETTES.automate.prixVente > Math.max(...autres));
});

// -----------------------------------------------------------------------------
// Sauvegarde
// -----------------------------------------------------------------------------
test('une partie à la mine se sauvegarde et se relit', () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  etat.atelier.ameliorations.push('plans-automate');
  const relue = chargerPartie(serialiserPartie({ etat, zone: 'mine', position: { x: 2, z: 1 } }));
  assert.equal(relue.zone, 'mine');
  assert.deepEqual(relue.etat, etat);
});
