// =============================================================================
// Tests de la version 1.5 : les fêtes des saisons, la météo douce, les
// compagnons, l'intérieur de l'atelier, l'apprentie, le potager, le lac et la
// pêche, et l'album de souvenirs.
// Lancement : npm test   (ou : node --test)
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MONDE, creerEtatJeu, deplacerJoueur, calculerPas, toucheUnObstacle, objectifActuel, marqueursActifs, appliquerAction, dialogueOdile } from '../js/logique.js';
import {
  RECETTES,
  DECORATIONS,
  ouvrirAtelier,
  acheterMateriau,
  acheterAmelioration,
  lancerFabrication,
  avancerTemps,
  recetteDebloquee,
  vendableAuComptoir,
  atelierCoince,
  dialogueApprentie,
  choisirTacheApprentie,
  dureeFabrication,
  RESERVE_APPRENTIE,
} from '../js/logique-atelier.js';
import { QUETES, majDisponibilites } from '../js/logique-quetes.js';
import { ZONES, obstaclesZone, cibleProcheZone, sortieAtteinte, libelleZone, conditionRemplie } from '../js/logique-zones.js';
import { FETES, fetePrevue, feteDuJour, majFetes, dialogueFete, livrerFete, feteAAider } from '../js/logique-fetes.js';
import { meteoDuJour, meteoDuMoment, messageMeteo } from '../js/logique-meteo.js';
import { chatAAdopter, adopterChat, dialogueChat, creerTrace, suivreTrace, pointDerriere } from '../js/logique-compagnons.js';
import { utiliserPotager, avancerPotager, DUREE_POUSSE, BOUQUETS_PAR_RECOLTE } from '../js/logique-potager.js';
import { ESPECES, pecher, dialogueGaston, appliquerActionPeche, especesTrouvees, RECOMPENSE_ALBUM_PECHE } from '../js/logique-peche.js';
import { noterRencontre, habitantsAlbum, souvenirsAlbum, chiffresAlbum, pecheAlbum } from '../js/logique-album.js';
import { DUREE_JOURNEE } from '../js/logique-temps.js';
import { serialiserPartie, chargerPartie } from '../js/logique-sauvegarde.js';
import { lireReglages, creerReglages } from '../js/logique-reglages.js';
import { AMBIANCES } from '../js/logique-musique.js';

// Une partie où toutes les quêtes sont finies.
function partieFinie() {
  const etat = creerEtatJeu();
  ouvrirAtelier(etat);
  for (const id of Object.keys(QUETES)) {
    etat.quetes[id].statut = 'terminee';
    etat.quetes[id].etape = QUETES[id].etapes.length;
  }
  majDisponibilites(etat);
  etat.argent = 1000;
  return etat;
}

// Une promenade au hasard : Ferrus ne doit jamais se coincer.
function promenade(zoneId, etat, graines = 10) {
  const zone = ZONES[zoneId];
  const obstacles = obstaclesZone(zoneId, etat);
  for (let graine = 1; graine <= graines; graine++) {
    let g = graine * 97;
    const hasard = () => ((g = (g * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const depart = Object.values(zone.arrivees)[0] || MONDE.joueur;
    let p = deplacerJoueur({ x: depart.x, z: depart.z }, 0, 0, obstacles, zone);
    for (let i = 0; i < 100; i++) {
      const dx = hasard();
      const dz = hasard();
      for (let j = 0; j < 30; j++) {
        const pas = calculerPas(dx, dz, MONDE.joueur.vitesse, 1 / 30);
        p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, zone);
        assert.equal(toucheUnObstacle(p.x, p.z, MONDE.joueur.rayon, obstacles), false, `${zoneId} : coincé en (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
      }
    }
  }
}

// Trouve un endroit libre, à portée d'une chose, d'où c'est bien elle qu'on vise.
function peutApprocher(zoneId, etat, id) {
  const i = ZONES[zoneId].interactifs.find((x) => x.id === id);
  const obs = obstaclesZone(zoneId, etat);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
    for (let d = 0.2; d <= i.distanceInteraction; d += 0.1) {
      const x = i.x + Math.cos(a) * d;
      const z = i.z + Math.sin(a) * d;
      if (!toucheUnObstacle(x, z, MONDE.joueur.rayon, obs) && cibleProcheZone(zoneId, x, z, etat) === id) return true;
    }
  }
  return false;
}

// -----------------------------------------------------------------------------
// Les fêtes des saisons
// -----------------------------------------------------------------------------
test('une fête le 2e jour de chaque saison', () => {
  const vues = [];
  for (let jour = 1; jour <= 10; jour++) vues.push(fetePrevue(jour) ? fetePrevue(jour).id : null);
  assert.deepEqual(vues, [null, 'fete-lanternes', null, 'bal-ete', null, 'foire-pommes', null, 'fete-lumieres', null, 'fete-lanternes']);
  assert.equal(FETES.length, 4);
});

test("pas de fête tant que la lampe d'Odile n'est pas réparée (c'est elle qui l'organise)", () => {
  const etat = creerEtatJeu();
  etat.jour = 2;
  assert.equal(feteDuJour(etat), null);
  assert.equal(partieFinie().jour, 1);
});

test("le jour de la fête : l'objet se débloque à l'établi, et la fête est annoncée le matin", () => {
  const etat = partieFinie();
  etat.jour = 2;
  etat.journee = 0.2; // 4 h 48 : trop tôt pour l'annonce
  assert.deepEqual(majFetes(etat), []);
  assert.equal(recetteDebloquee(etat, 'lanterne-papier'), true);
  etat.journee = 0.3;
  assert.equal(majFetes(etat).length, 1);
  assert.deepEqual(majFetes(etat), []); // une seule annonce
  // Le lendemain, l'objet n'est plus disponible.
  etat.jour = 3;
  majFetes(etat);
  assert.equal(recetteDebloquee(etat, 'lanterne-papier'), false);
});

test('aider Odile pour la fête : fabriquer, apporter, être payé (une fois par an)', () => {
  const etat = partieFinie();
  etat.jour = 4; // le Bal d'été
  etat.journee = 0.5;
  majFetes(etat);
  assert.match(objectifActuel(etat), /^Bal d'été : fabrique 2 carillons à vent/);
  assert.equal(marqueursActifs(etat).odile, true);
  assert.equal(dialogueOdile(etat).choix[0].action, 'fermer');
  // Fabriquer les deux carillons.
  for (let k = 0; k < 2; k++) {
    acheterMateriau(etat, 'cuivre', 1);
    acheterMateriau(etat, 'ressort', 1);
    assert.match(lancerFabrication(etat, 'carillon')[0], /^Fabrication lancée/);
    for (let t = 0; t < 10; t += 0.5) avancerTemps(etat, 0.5);
  }
  assert.equal(etat.atelier.stock.carillon, 2);
  const dialogue = dialogueOdile(etat);
  assert.equal(dialogue.choix[0].action, 'fete:livrer:bal-ete');
  const argent = etat.argent;
  const messages = appliquerAction(etat, dialogue.choix[0].action);
  assert.equal(messages[0], '+120 pièces');
  assert.equal(etat.argent, argent + 120);
  assert.equal(etat.atelier.stock.carillon, 0);
  assert.equal(feteAAider(etat), null);
  assert.deepEqual(livrerFete(etat, 'bal-ete'), []); // pas deux fois
  assert.equal(marqueursActifs(etat).odile, false);
  // L'année suivante (jour 12), on peut de nouveau aider.
  etat.jour = 12;
  assert.equal(feteAAider(etat).id, 'bal-ete');
});

test('les objets des fêtes et l\'oiseau mécanique ne se vendent jamais au comptoir', () => {
  for (const [id, r] of Object.entries(RECETTES)) {
    if (r.fete || r.quete || r.compagnon) assert.equal(vendableAuComptoir(id), false, id);
  }
  assert.equal(vendableAuComptoir('bouquet'), true);
  assert.equal(dialogueFete(creerEtatJeu()), null);
});

// -----------------------------------------------------------------------------
// La météo douce
// -----------------------------------------------------------------------------
test("environ un jour sur trois est pluvieux, jamais en hiver, et toujours l'après-midi", () => {
  let pluvieux = 0;
  for (let jour = 1; jour <= 300; jour++) {
    const m = meteoDuJour(jour, 'ete');
    if (m.pluie) {
      pluvieux++;
      assert.ok(m.pluie.debut >= 0.45 && m.pluie.fin <= 0.95, `jour ${jour}`);
    }
    assert.equal(meteoDuJour(jour, 'hiver').pluie, null);
  }
  assert.ok(pluvieux > 60 && pluvieux < 150, `${pluvieux} jours de pluie sur 300`);
  assert.deepEqual(meteoDuJour(7, 'ete'), meteoDuJour(7, 'ete')); // toujours la même météo pour un même jour
});

test('la pluie et la brume arrivent et repartent en douceur ; les flaques sèchent peu à peu', () => {
  let jour = 1;
  while (!meteoDuJour(jour, 'ete').pluie) jour++;
  const { fin } = meteoDuJour(jour, 'ete').pluie;
  let avant = meteoDuMoment(jour, 0, 'ete');
  let maxPluie = 0;
  for (let s = 1; s <= DUREE_JOURNEE; s++) {
    const m = meteoDuMoment(jour, s / DUREE_JOURNEE, 'ete');
    for (const cle of ['pluie', 'brume', 'flaques']) assert.ok(Math.abs(m[cle] - avant[cle]) < 0.12, `${cle} saute à ${s} s`);
    maxPluie = Math.max(maxPluie, m.pluie);
    avant = m;
  }
  assert.equal(maxPluie, 1);
  assert.ok(meteoDuMoment(jour, fin + 0.02, 'ete').flaques > 0.5, 'les flaques restent un peu après la pluie');
  assert.equal(meteoDuMoment(jour, Math.min(0.999, fin + 0.2), 'ete').flaques, 0);
  assert.deepEqual(meteoDuMoment(jour, (fin + 0.6) / 2, 'ete', false), { pluie: 0, brume: 0, flaques: 0 });
  assert.match(messageMeteo(0.2, 0.6), /pluie/);
  assert.match(messageMeteo(0.6, 0.2), /s'arrête/);
  assert.equal(messageMeteo(0.6, 0.7), null);
});

test("l'option « Météo » est activée au départ, et se relit", () => {
  assert.equal(creerReglages().meteo, true);
  assert.equal(lireReglages(JSON.stringify({ meteo: false })).meteo, false);
});

// -----------------------------------------------------------------------------
// Les compagnons
// -----------------------------------------------------------------------------
test('Rouille, le petit chat : il attend sur la place, on peut l\'adopter une fois', () => {
  const etat = creerEtatJeu();
  assert.equal(chatAAdopter(etat), false); // pas avant l'ouverture de l'atelier
  ouvrirAtelier(etat);
  assert.equal(chatAAdopter(etat), true);
  assert.ok(peutApprocher('place', etat, 'chat'), 'on peut approcher le chat');
  assert.equal(dialogueChat(etat).choix[0].action, 'compagnon:adopter-chat');
  assert.match(appliquerAction(etat, 'compagnon:adopter-chat')[0], /Rouille/);
  assert.equal(etat.compagnons.chat, true);
  assert.equal(dialogueChat(etat), null);
  assert.deepEqual(adopterChat(etat), []);
  assert.equal(conditionRemplie(etat, 'chat-errant'), false);
});

test("Cliquet, l'oiseau mécanique : on le fabrique une fois ; il ne va pas dans le stock", () => {
  const etat = partieFinie();
  assert.equal(recetteDebloquee(etat, 'oiseau-mecanique'), true);
  acheterMateriau(etat, 'cuivre', 2);
  acheterMateriau(etat, 'ressort', 1);
  lancerFabrication(etat, 'oiseau-mecanique');
  const messages = [];
  for (let t = 0; t < 20; t += 0.5) messages.push(...avancerTemps(etat, 0.5));
  assert.ok(messages.some((m) => m.startsWith('Cliquet')));
  assert.equal(etat.compagnons.oiseau, true);
  assert.equal(etat.atelier.stock['oiseau-mecanique'], 0);
  assert.equal(recetteDebloquee(etat, 'oiseau-mecanique'), false);
});

test('les compagnons marchent dans les pas de Ferrus : jamais dans un mur', () => {
  const etat = partieFinie();
  for (const zoneId of ['place', 'interieur', 'lac']) {
    const zone = ZONES[zoneId];
    const obstacles = obstaclesZone(zoneId, etat);
    const depart = Object.values(zone.arrivees)[0] || MONDE.joueur;
    let p = deplacerJoueur({ x: depart.x, z: depart.z }, 0, 0, obstacles, zone);
    const trace = creerTrace(p.x, p.z, depart.orientation || 0);
    let g = 31;
    const hasard = () => ((g = (g * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (let i = 0; i < 150; i++) {
      const dx = hasard();
      const dz = hasard();
      for (let j = 0; j < 20; j++) {
        const pas = calculerPas(dx, dz, MONDE.joueur.vitesse, 1 / 30);
        p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, zone);
        suivreTrace(trace, p.x, p.z);
        const chat = pointDerriere(trace, p, 1.1);
        assert.equal(toucheUnObstacle(chat.x, chat.z, 0.15, obstacles), false, `${zoneId} : le chat est dans un mur en (${chat.x.toFixed(2)}, ${chat.z.toFixed(2)})`);
      }
    }
    // Le chat reste toujours à peu près à la bonne distance (jamais devant Ferrus).
    const chat = pointDerriere(trace, p, 1.1);
    assert.ok(Math.hypot(chat.x - p.x, chat.z - p.z) <= 1.1 + 1e-9);
  }
});

// -----------------------------------------------------------------------------
// L'intérieur de l'atelier et l'apprentie
// -----------------------------------------------------------------------------
test("on entre dans l'atelier par la porte (une fois ouvert), et on en ressort par le sud", () => {
  const ferme = creerEtatJeu();
  assert.equal(cibleProcheZone('place', -7, -6.0, ferme), null);
  const etat = partieFinie();
  assert.equal(cibleProcheZone('place', -7, -6.0, etat), 'porte-atelier');
  assert.equal(libelleZone(etat, 'porte-atelier'), "Entrer dans l'atelier");
  const obstacles = obstaclesZone('interieur', etat);
  const a = ZONES.interieur.arrivees.place;
  assert.equal(toucheUnObstacle(a.x, a.z, MONDE.joueur.rayon, obstacles), false);
  // Dedans, l'établi est le même que dehors.
  assert.ok(peutApprocher('interieur', etat, 'etabli'));
  let p = { x: a.x, z: a.z };
  let sortie = null;
  for (let i = 0; i < 60 && !sortie; i++) {
    const pas = calculerPas(0, 1, MONDE.joueur.vitesse, 1 / 30);
    p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, ZONES.interieur);
    sortie = sortieAtteinte('interieur', p.x, p.z, etat);
  }
  assert.equal(sortie && sortie.zone, 'place');
  assert.equal(toucheUnObstacle(sortie.x, sortie.z, MONDE.joueur.rayon, obstaclesZone('place', etat)), false);
});

test("les meubles de l'intérieur n'enferment jamais Ferrus (même tout décoré)", () => {
  const etat = partieFinie();
  etat.atelier.decorations = Object.keys(DECORATIONS);
  etat.atelier.ameliorations.push('apprentie');
  for (const id of ['fauteuil', 'gramophone', 'plante-verte']) assert.ok(obstaclesZone('interieur', etat).some((o) => o.id === id), id);
  assert.ok(peutApprocher('interieur', etat, 'lucie'));
  promenade('interieur', etat);
});

test("Lucie, l'apprentie : elle fabrique toute seule, un peu moins vite, et garde 3 objets en réserve", () => {
  const etat = partieFinie();
  assert.equal(conditionRemplie(etat, 'apprentie'), false);
  assert.match(acheterAmelioration(etat, 'apprentie')[0], /apprentie/i);
  assert.equal(conditionRemplie(etat, 'apprentie'), true);
  etat.atelier.stock.cuivre = 5;
  etat.atelier.stock.ressort = 5;
  avancerTemps(etat, 0.1);
  const f = etat.atelier.apprentie.fabrication;
  assert.equal(f.recette, 'lanterne');
  assert.equal(f.total, dureeFabrication(etat, 'lanterne') * 1.5);
  assert.equal(atelierCoince(etat), false);
  const messages = [];
  for (let t = 0; t < 200; t += 0.5) messages.push(...avancerTemps(etat, 0.5).filter((m) => m.startsWith('Lucie')));
  assert.equal(etat.atelier.stock.lanterne, RESERVE_APPRENTIE); // elle s'arrête à 3
  assert.ok(messages.length >= 3);
  assert.equal(etat.atelier.stock.cuivre, 5 - RESERVE_APPRENTIE);
  // On lui demande des bouilloires, puis de se reposer.
  assert.equal(dialogueApprentie(etat).choix.length, 3);
  assert.match(appliquerAction(etat, 'apprentie:bouilloire')[0], /bouilloires/);
  assert.equal(etat.atelier.apprentie.tache, 'bouilloire');
  assert.deepEqual(choisirTacheApprentie(etat, 'n-importe-quoi'), []);
  appliquerAction(etat, 'apprentie:repos');
  const cuivre = etat.atelier.stock.cuivre;
  for (let t = 0; t < 60; t += 0.5) avancerTemps(etat, 0.5);
  assert.equal(etat.atelier.stock.cuivre, cuivre); // elle ne touche plus à rien
});

// -----------------------------------------------------------------------------
// Le potager
// -----------------------------------------------------------------------------
test('le potager : on sème au printemps ou en été, les fleurs poussent en un jour et demi', () => {
  const etat = partieFinie();
  assert.match(utiliserPotager(etat, 'automne')[0], /trop tard/);
  assert.match(utiliserPotager(etat, 'hiver')[0], /gelée/);
  assert.match(utiliserPotager(etat, 'printemps')[0], /semez/);
  avancerPotager(etat, DUREE_POUSSE / 2, 'printemps');
  assert.ok(Math.abs(etat.potager.pousse - 0.5) < 1e-9);
  assert.match(utiliserPotager(etat, 'printemps')[0], /50 %/);
  // En hiver, rien ne pousse (mais rien ne meurt).
  avancerPotager(etat, DUREE_POUSSE, 'hiver');
  assert.ok(Math.abs(etat.potager.pousse - 0.5) < 1e-9);
  // Sous la pluie, une fois et demie plus vite.
  avancerPotager(etat, DUREE_POUSSE / 3, 'ete', 1);
  assert.ok(Math.abs(etat.potager.pousse - 1) < 1e-9);
  etat.atelier.stock.bouquet = 3;
  assert.match(utiliserPotager(etat, 'ete')[0], /^\+2 bouquets/); // il ne reste que 2 places
  assert.equal(etat.atelier.stock.bouquet, 5);
  assert.equal(etat.potager.pousse, -1);
  assert.equal(BOUQUETS_PAR_RECOLTE, 4);
  assert.ok(peutApprocher('place', etat, 'potager'));
});

test("les clients achètent des bouquets… seulement s'il y en a en stock", () => {
  const etat = partieFinie();
  etat.atelier.clientsServis = 1;
  const commandes = new Set();
  for (let i = 0; i < 80; i++) {
    etat.atelier.clients = [];
    etat.atelier.prochainClient = 0;
    avancerTemps(etat, 0.01);
    commandes.add(etat.atelier.clients[0].commande);
  }
  assert.equal(commandes.has('bouquet'), false);
  etat.atelier.stock.bouquet = 4;
  for (let i = 0; i < 80; i++) {
    etat.atelier.clients = [];
    etat.atelier.prochainClient = 0;
    avancerTemps(etat, 0.01);
    commandes.add(etat.atelier.clients[0].commande);
  }
  assert.equal(commandes.has('bouquet'), true);
  for (const c of commandes) assert.equal(vendableAuComptoir(c), true, c);
});

// -----------------------------------------------------------------------------
// Le lac et la pêche
// -----------------------------------------------------------------------------
test('le lac : on y va depuis le marché ; on ne marche pas sur l\'eau, sauf sur le ponton', () => {
  const etat = creerEtatJeu();
  const s = sortieAtteinte('marche', -13.5, 0, etat);
  assert.equal(s.zone, 'lac');
  const obstacles = obstaclesZone('lac', etat);
  assert.equal(toucheUnObstacle(s.x, s.z, MONDE.joueur.rayon, obstacles), false);
  assert.equal(sortieAtteinte('lac', 13.5, 0, etat).zone, 'marche');
  // Vers le nord depuis la berge : on s'arrête au bord de l'eau.
  let p = { x: -6, z: 0 };
  for (let i = 0; i < 120; i++) { const pas = calculerPas(0, -1, MONDE.joueur.vitesse, 1 / 30); p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, ZONES.lac); }
  assert.ok(p.z > -2.2, `au bord : z = ${p.z.toFixed(2)}`);
  // Sur le ponton, on va jusqu'au bout.
  p = { x: 2, z: 0 };
  for (let i = 0; i < 120; i++) { const pas = calculerPas(0, -1, MONDE.joueur.vitesse, 1 / 30); p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, ZONES.lac); }
  assert.ok(p.z < -5.8, `au bout du ponton : z = ${p.z.toFixed(2)}`);
  assert.equal(cibleProcheZone('lac', p.x, p.z, etat), 'ponton');
  assert.ok(peutApprocher('lac', etat, 'gaston'));
  promenade('lac', etat);
  assert.ok(AMBIANCES.lac && AMBIANCES.interieur);
});

test('la pêche : Gaston prête sa canne, les poissons changent avec les saisons', () => {
  const etat = partieFinie();
  assert.match(pecher(etat, 'ete').messages[0], /canne/);
  assert.equal(libelleZone(etat, 'ponton'), 'Le bout du ponton');
  const d = dialogueGaston(etat);
  assert.equal(d.choix[0].action, 'peche:canne');
  appliquerAction(etat, 'peche:canne');
  assert.equal(etat.peche.canne, true);
  assert.equal(libelleZone(etat, 'ponton'), 'Pêcher');
  // En hiver, jamais de truite ; en été, jamais de lotte.
  for (let i = 0; i < 200; i++) {
    const r = pecher(etat, 'hiver');
    if (r.prise.type === 'poisson') assert.notEqual(r.prise.id, 'truite');
    const s = pecher(etat, 'ete');
    if (s.prise.type === 'poisson') assert.notEqual(s.prise.id, 'lotte');
  }
  assert.ok(etat.peche.prises > 250);
  // Avec de la patience et toutes les saisons, on trouve toutes les espèces.
  for (let i = 0; i < 400 && especesTrouvees(etat) < ESPECES.length; i++) {
    for (const saison of ['printemps', 'ete', 'automne', 'hiver']) pecher(etat, saison);
  }
  assert.equal(especesTrouvees(etat), ESPECES.length);
  // Gaston offre alors sa récompense, une seule fois.
  assert.equal(dialogueGaston(etat).choix[0].action, 'peche:recompense');
  const argent = etat.argent;
  appliquerActionPeche(etat, 'peche:recompense');
  assert.equal(etat.argent, argent + RECOMPENSE_ALBUM_PECHE);
  assert.deepEqual(appliquerActionPeche(etat, 'peche:recompense'), []);
  assert.equal(dialogueGaston(etat).choix[0].action, 'fermer');
});

test('une trouvaille de pêche ne déborde jamais du stock', () => {
  const etat = partieFinie();
  etat.peche.canne = true;
  etat.atelier.stock.cuivre = 5;
  etat.atelier.stock.ressort = 5;
  for (let i = 0; i < 300; i++) pecher(etat, 'ete');
  assert.equal(etat.atelier.stock.cuivre, 5);
  assert.equal(etat.atelier.stock.ressort, 5);
});

// -----------------------------------------------------------------------------
// L'album de souvenirs
// -----------------------------------------------------------------------------
test("l'album : les habitants rencontrés, les souvenirs, la pêche", () => {
  const etat = partieFinie();
  assert.equal(habitantsAlbum(etat).filter((h) => h.connu).length, 0);
  assert.equal(noterRencontre(etat, 'gaston'), true);
  assert.equal(noterRencontre(etat, 'gaston'), false);
  assert.equal(noterRencontre(etat, 'inconnu'), false);
  assert.equal(noterRencontre(etat, 'chat'), false); // le chat entre dans l'album quand on l'adopte
  etat.compagnons.chat = true;
  const connus = habitantsAlbum(etat).filter((h) => h.connu).map((h) => h.id);
  assert.deepEqual(connus, ['gaston', 'chat']);
  // Les souvenirs : toutes les quêtes (12 depuis la version 1.6), puis les fêtes.
  etat.fetes.faites.push('foire-pommes-1');
  const souvenirs = souvenirsAlbum(etat);
  const nombre = Object.keys(QUETES).length;
  assert.equal(souvenirs.length, nombre + 1);
  assert.equal(souvenirs[nombre].titre, 'Foire aux pommes (année 1)');
  assert.equal(chiffresAlbum(etat).length, 12);
  const peche = pecheAlbum(etat);
  assert.equal(peche.length, ESPECES.length);
  assert.ok(peche.every((e) => e.nom === '???'));
});

// -----------------------------------------------------------------------------
// La sauvegarde
// -----------------------------------------------------------------------------
test('tout ce qui est nouveau est sauvegardé', () => {
  const etat = partieFinie();
  etat.jour = 6;
  etat.fetes.faites = ['bal-ete-1'];
  etat.fetes.annonce = 6;
  etat.compagnons = { chat: true, oiseau: true };
  etat.potager.pousse = 0.4;
  etat.potager.recoltes = 2;
  etat.peche.canne = true;
  etat.peche.especes.carpe = 2;
  etat.peche.prises = 2;
  etat.album.rencontres = ['odile', 'gaston'];
  etat.atelier.ameliorations.push('apprentie');
  etat.atelier.apprentie = { tache: 'bouilloire', fabrication: { recette: 'bouilloire', restant: 4, total: 13.5 } };
  etat.atelier.recettesFete = ['presse-pommes'];
  etat.atelier.stock.bouquet = 3;
  const relue = chargerPartie(serialiserPartie({ etat, zone: 'lac', position: { x: 2, z: -5 } }));
  assert.equal(relue.zone, 'lac');
  assert.deepEqual(relue.etat, etat);
});

test('une partie de la version 1.4 reprend sans souci (rien de neuf)', () => {
  const etat = partieFinie();
  for (const cle of ['fetes', 'compagnons', 'potager', 'peche', 'album']) delete etat[cle];
  delete etat.atelier.apprentie;
  delete etat.atelier.recettesFete;
  const relue = chargerPartie(serialiserPartie({ etat, zone: 'place', position: { x: 0, z: 0 } }));
  assert.deepEqual(relue.etat.compagnons, { chat: false, oiseau: false });
  assert.equal(relue.etat.potager.pousse, -1);
  assert.equal(relue.etat.peche.canne, false);
  assert.equal(relue.etat.atelier.apprentie.tache, 'lanterne');
  assert.deepEqual(relue.etat.fetes.faites, []);
});

test('des données trafiquées sont corrigées', () => {
  const donnees = JSON.parse(serialiserPartie({ etat: partieFinie(), zone: 'place', position: { x: 0, z: 0 } }));
  donnees.etat.atelier.apprentie = { tache: 'dormir', fabrication: { recette: 'automate', restant: 2, total: 4 } };
  donnees.etat.fetes.faites = ['bal-ete-1', 'bal-ete-1', 'carnaval-2', 3];
  donnees.etat.potager.pousse = 42;
  donnees.etat.peche.especes.gardon = -5;
  donnees.etat.album.rencontres = ['odile', 'fantome', 'odile'];
  donnees.etat.atelier.recettesFete = ['automate', 'carillon'];
  const relue = chargerPartie(JSON.stringify(donnees)).etat;
  assert.deepEqual(relue.atelier.apprentie, { tache: 'lanterne', fabrication: null });
  assert.deepEqual(relue.fetes.faites, ['bal-ete-1']);
  assert.equal(relue.potager.pousse, 1);
  assert.equal(relue.peche.especes.gardon, 0);
  assert.deepEqual(relue.album.rencontres, ['odile']);
  assert.deepEqual(relue.atelier.recettesFete, ['carillon']);
});

test('promenades au hasard : la place avec le potager et le lac, tout débloqué', () => {
  const etat = partieFinie();
  etat.atelier.decorations = Object.keys(DECORATIONS);
  promenade('place', etat, 8);
});
