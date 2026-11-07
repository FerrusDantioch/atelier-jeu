// =============================================================================
// Tests de la version 1.6 : la forêt de l'inventeur, le dirigeable, l'amitié,
// le journal, la vitrine, la garde-robe, le transfert de partie, le mode
// photo, le petit jeu d'assemblage et la taille du texte.
// Lancement : npm test   (ou : node --test)
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MONDE, creerEtatJeu, deplacerJoueur, calculerPas, toucheUnObstacle, appliquerAction, dialogueOdile, objectifActuel } from '../js/logique.js';
import { RECETTES, ouvrirAtelier, lancerFabrication, avancerTemps, recetteDebloquee, peutFabriquer, acheterAmelioration, estRecolte, capaciteStock } from '../js/logique-atelier.js';
import { QUETES, majDisponibilites, queteEnCours, queteDisponible, dialoguePnjQuete, dialogueEtapeQuete, appliquerActionQuete, ramasserObjetsQuete, utiliserObjetQuete, verifierQuetes, marqueursQuetes } from '../js/logique-quetes.js';
import { ZONES, obstaclesZone, cibleProcheZone, sortieAtteinte, libelleZone, dialogueLeon } from '../js/logique-zones.js';
import { TENUES, CATEGORIES_TENUE, possedeTenue, acheterTenue, porterTenue, recevoirTenue, tenuePortee, tenuesDeCategorie } from '../js/logique-garderobe.js';
import {
  AMIS, POINTS_PAR_COEUR, GAINS_AMITIE, coeurs, pointsAmitie, parlerAmi, peutOffrir, offrirCadeau, ajouterChoixAmitie, dialogueCadeau,
  anniversairesDuJour, estAnniversaire, texteAnniversaire, recompenseEnAttente, dialogueRecompense, recevoirRecompense, texteCoeurs, saisonEtJour,
} from '../js/logique-amitie.js';
import { majJournal, journalNonLu, lireJournal, editionDuJour, HEURE_JOURNAL } from '../js/logique-journal.js';
import { CUEILLETTES, DUREE_REPOUSSE_FORET, RECOLTE_SAISON, CURIOSITES, CONSTELLATIONS, cueillir, avancerForet, progressionCueillette, observerCiel, numeroNuit, telescopeRepare, dialogueAnatole, etoilesAlbum, RECOMPENSE_ETOILES } from '../js/logique-foret.js';
import { PLACES_VITRINE, exposer, retirer, objetsExposables, attraitVitrine, pourboire, avancerVitrine, plusBelObjet, decrireObjetVitrine, POURBOIRE_MAX, INTERVALLE_VISITEURS } from '../js/logique-vitrine.js';
import { PLANCHES, OBJETS_ASSEMBLAGE, creerAssemblage, basculer, estAssemble, engrenagesEntraines, plusCourtChemin, engrenagesRestants, contenuCase } from '../js/logique-assemblage.js';
import { QUETES_DIRIGEABLE, etapesDirigeable, dirigeablePret, ATTERRISSAGES, DESTINATIONS, destinationsPossibles, dialogueVoyage, destinationDuChoix, dureeVol, positionVol, CARTE_VOL } from '../js/logique-dirigeable.js';
import { creerCameraPhoto, bougerCameraPhoto, positionCameraPhoto, LIMITES_PHOTO, lirePhotos, ajouterPhoto, MAX_PHOTOS, nomFichierPhoto } from '../js/logique-photo.js';
import { serialiserPartie, chargerPartie, resumePartie, nomFichierSauvegarde } from '../js/logique-sauvegarde.js';
import { lireReglages, creerReglages, TAILLES_TEXTE } from '../js/logique-reglages.js';
import { habitantsAlbum, souvenirsAlbum, HABITANTS_ALBUM } from '../js/logique-album.js';
import { majCarnet, livrerCommande } from '../js/logique-commandes.js';
import { pecher, ESPECES } from '../js/logique-peche.js';
import { AMBIANCES } from '../js/logique-musique.js';

// -----------------------------------------------------------------------------
// Petits outils
// -----------------------------------------------------------------------------
function partieFinieJusqua(jusqua = null) {
  const etat = creerEtatJeu();
  ouvrirAtelier(etat);
  for (const id of Object.keys(QUETES)) {
    if (id === jusqua) break;
    etat.quetes[id].statut = 'terminee';
    etat.quetes[id].etape = QUETES[id].etapes.length;
  }
  majDisponibilites(etat);
  etat.argent = 1000;
  return etat;
}
const partieFinie = () => partieFinieJusqua(null);

// Une promenade au hasard : Ferrus ne doit jamais se coincer.
function promenade(zoneId, etat, graines = 8) {
  const zone = ZONES[zoneId];
  const obstacles = obstaclesZone(zoneId, etat);
  for (let graine = 1; graine <= graines; graine++) {
    let g = graine * 131;
    const hasard = () => ((g = (g * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const depart = Object.values(zone.arrivees)[0];
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

// Toutes les cases (de 25 cm) où Ferrus peut aller en partant d'un point
// (on « inonde » le lieu, comme de l'eau qui se répand).
function casesAccessibles(zoneId, etat, depart) {
  const zone = ZONES[zoneId];
  const obs = obstaclesZone(zoneId, etat);
  const r = MONDE.joueur.rayon;
  const pas = 0.25;
  const l = zone.limites;
  const libre = (x, z) => x >= l.minX + r && x <= l.maxX - r && z >= l.minZ + r && z <= l.maxZ - r && !toucheUnObstacle(x, z, r, obs);
  const cle = (i, j) => `${i},${j}`;
  const vues = new Set();
  const i0 = Math.round(depart.x / pas);
  const j0 = Math.round(depart.z / pas);
  const file = [[i0, j0]];
  vues.add(cle(i0, j0));
  while (file.length > 0) {
    const [i, j] = file.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = cle(i + di, j + dj);
      if (vues.has(k) || !libre((i + di) * pas, (j + dj) * pas)) continue;
      vues.add(k);
      file.push([i + di, j + dj]);
    }
  }
  return { vues, pas };
}

// Peut-on atteindre cette chose depuis l'entrée du lieu ?
function atteignable(zoneId, etat, id, depart) {
  const { vues, pas } = casesAccessibles(zoneId, etat, depart);
  const i = ZONES[zoneId].interactifs.find((x) => x.id === id);
  for (const k of vues) {
    const [a, b] = k.split(',').map(Number);
    const x = a * pas;
    const z = b * pas;
    if (Math.hypot(x - i.x, z - i.z) <= i.distanceInteraction && cibleProcheZone(zoneId, x, z, etat) === id) return true;
  }
  return false;
}

// Termine l'étape « fabriquer » en mettant l'objet dans le stock.
function fabriquer(etat, objet) {
  etat.atelier.stock[objet] += 1;
  return verifierQuetes(etat);
}

// -----------------------------------------------------------------------------
// 1. La forêt de l'inventeur
// -----------------------------------------------------------------------------
test("la forêt s'ouvre à l'est de la place avec l'atelier, et l'on en revient", () => {
  const debut = creerEtatJeu();
  // Avant l'ouverture de l'atelier, une petite barrière ferme le chemin.
  assert.ok(obstaclesZone('place', debut).some((o) => o.id === 'passage-est'));
  assert.equal(sortieAtteinte('place', 17.5, 1, debut), null);
  const etat = partieFinieJusqua('balance-capucine');
  assert.ok(!obstaclesZone('place', etat).some((o) => o.id === 'passage-est'));
  const vers = sortieAtteinte('place', 17.5, 1, etat);
  assert.equal(vers.zone, 'foret');
  const retour = sortieAtteinte('foret', -13.5, 0, etat);
  assert.equal(retour.zone, 'place');
  // On arrive à des endroits libres.
  assert.equal(toucheUnObstacle(vers.x, vers.z, MONDE.joueur.rayon, obstaclesZone('foret', etat)), false);
  assert.equal(toucheUnObstacle(retour.x, retour.z, MONDE.joueur.rayon, obstaclesZone('place', etat)), false);
  // Depuis l'arrivée sur la place, on peut bien marcher jusqu'au chemin de la forêt.
  const { vues, pas } = casesAccessibles('place', etat, MONDE.joueur);
  assert.ok([...vues].some((k) => { const [a, b] = k.split(',').map(Number); return a * pas >= 17.4 && Math.abs(b * pas - 1) < 1; }));
});

test('promenades au hasard dans la forêt (et sur la place, avec la vitrine) : jamais coincé', () => {
  for (const etat of [partieFinieJusqua('balance-capucine'), partieFinie()]) {
    promenade('foret', etat);
    promenade('place', etat, 4);
    promenade('interieur', etat, 4);
  }
});

test("tout ce qu'on utilise dans la forêt est accessible depuis l'entrée", () => {
  const etat = partieFinie();
  const entree = ZONES.foret.arrivees.place;
  for (const i of ZONES.foret.interactifs) assert.ok(atteignable('foret', etat, i.id, entree), i.id);
  // La vitrine sur la place, et l'armoire dans l'atelier.
  assert.ok(atteignable('place', etat, 'vitrine', MONDE.joueur));
  assert.ok(atteignable('interieur', etat, 'armoire', ZONES.interieur.arrivees.place));
  // Les vis dorées de la quête du télescope sont toutes à portée.
  const { vues, pas } = casesAccessibles('foret', etat, entree);
  for (const o of QUETES['telescope-anatole'].etapes[0].objets) {
    assert.ok([...vues].some((k) => { const [a, b] = k.split(',').map(Number); return Math.hypot(a * pas - o.x, b * pas - o.z) <= 0.9; }), o.id);
  }
});

test('la cueillette : selon la saison, un buisson donne une récolte, puis repousse', () => {
  const etat = partieFinie();
  const id = CUEILLETTES[0].id;
  assert.equal(libelleZone(etat, id, 'automne'), 'Ramasser des champignons');
  cueillir(etat, id, 'automne');
  assert.equal(etat.atelier.stock.champignons, 1);
  assert.equal(progressionCueillette(etat, id), 0);
  assert.match(cueillir(etat, id, 'automne')[0], /repousse/);
  assert.equal(libelleZone(etat, id, 'automne'), 'Le buisson repousse');
  avancerForet(etat, DUREE_REPOUSSE_FORET / 2);
  assert.equal(progressionCueillette(etat, id), 0.5);
  avancerForet(etat, DUREE_REPOUSSE_FORET);
  cueillir(etat, id, 'printemps');
  assert.equal(etat.atelier.stock.baies, 1);
  // Chaque saison a sa récolte, et aucune ne se fabrique à l'établi.
  assert.deepEqual(Object.values(RECOLTE_SAISON), ['baies', 'baies', 'champignons', 'pommes-pin']);
  for (const r of ['baies', 'champignons', 'pommes-pin', 'bouquet']) {
    assert.ok(estRecolte(r));
    assert.equal(recetteDebloquee(etat, r), false);
    assert.equal(peutFabriquer(etat, r).possible, false);
  }
  // Atelier plein : on ne cueille pas.
  etat.atelier.stock['pommes-pin'] = capaciteStock(etat);
  avancerForet(etat, DUREE_REPOUSSE_FORET);
  assert.match(cueillir(etat, CUEILLETTES[1].id, 'hiver')[0], /Plus de place/);
});

test('en cueillant, on finit par trouver les trois curiosités de la forêt (une seule fois chacune)', () => {
  const etat = partieFinie();
  for (let i = 0; i < 200; i++) {
    for (const c of CUEILLETTES) {
      etat.atelier.stock.baies = 0;
      cueillir(etat, c.id, 'ete');
    }
    avancerForet(etat, DUREE_REPOUSSE_FORET);
  }
  assert.deepEqual([...etat.curiosites].sort(), ['fossile', 'plume-geai', 'pomme-pin-doree']);
});

test('les clients achètent aussi les paniers de la forêt, quand il y en a en stock', () => {
  const etat = partieFinieJusqua('balance-capucine');
  etat.atelier.stock.champignons = 3;
  const commandes = new Set();
  for (let i = 0; i < 60; i++) {
    etat.atelier.clients = [];
    avancerTemps(etat, 30);
    for (const c of etat.atelier.clients) commandes.add(c.commande);
  }
  assert.ok(commandes.has('champignons'));
  assert.ok(!commandes.has('baies')); // pas en stock : personne n'en demande
});

test("la quête du télescope d'Anatole : les vis, la monture, le télescope", () => {
  const etat = partieFinieJusqua('telescope-anatole');
  assert.equal(queteDisponible(etat).id, 'telescope-anatole');
  assert.equal(telescopeRepare(etat), false);
  appliquerAction(etat, dialogueAnatole(etat).choix[0].action);
  assert.equal(queteEnCours(etat).id, 'telescope-anatole');
  for (const o of QUETES['telescope-anatole'].etapes[0].objets) ramasserObjetsQuete(etat, 'foret', o.x, o.z);
  assert.equal(queteEnCours(etat).etape.type, 'fabriquer');
  assert.ok(recetteDebloquee(etat, 'monture-lentille'));
  fabriquer(etat, 'monture-lentille');
  assert.equal(libelleZone(etat, 'telescope'), 'Réparer le télescope');
  assert.ok(utiliserObjetQuete(etat, 'telescope').includes('La lentille est en place : le télescope est réparé !'));
  const argent = etat.argent;
  appliquerAction(etat, dialogueAnatole(etat).choix[0].action);
  assert.equal(etat.argent, argent + 200);
  assert.ok(telescopeRepare(etat));
  assert.equal(libelleZone(etat, 'telescope'), 'Regarder dans le télescope');
  // Le grand projet commence.
  assert.equal(queteDisponible(etat).id, 'dirigeable-nacelle');
});

test('les étoiles : la nuit seulement, une constellation par nuit, deux par saison', () => {
  const etat = partieFinie();
  etat.jour = 3;
  etat.journee = 0.5;
  assert.equal(numeroNuit(3, 0.5), null);
  assert.equal(numeroNuit(3, 0.9), 3);
  assert.equal(numeroNuit(4, 0.1), 3);
  assert.equal(observerCiel(etat, 'ete', { nuit: false }).constellation, null);
  etat.journee = 0.85;
  const a = observerCiel(etat, 'ete', { nuit: true });
  assert.equal(a.nouvelle, true);
  assert.equal(a.constellation.saison, 'ete');
  // Même nuit (après minuit) : pas de deuxième découverte.
  etat.jour = 4;
  etat.journee = 0.1;
  const b = observerCiel(etat, 'ete', { nuit: true });
  assert.equal(b.nouvelle, false);
  assert.equal(b.constellation.id, a.constellation.id);
  // La nuit suivante : la deuxième constellation de l'été.
  etat.journee = 0.9;
  assert.equal(observerCiel(etat, 'ete', { nuit: true }).nouvelle, true);
  etat.jour = 5;
  assert.match(observerCiel(etat, 'ete', { nuit: true }).messages[0], /autres saisons/);
  assert.equal(CONSTELLATIONS.length, 8);
  for (const s of ['printemps', 'ete', 'automne', 'hiver']) assert.equal(CONSTELLATIONS.filter((c) => c.saison === s).length, 2);
  // Chaque trait relie deux étoiles qui existent.
  for (const c of CONSTELLATIONS) for (const [i, j] of c.traits) assert.ok(c.etoiles[i] && c.etoiles[j], c.id);
  assert.equal(etoilesAlbum(etat).filter((e) => e.connue).length, 2);
});

test("toutes les constellations : Anatole offre des pièces et un éclat de météorite", () => {
  const etat = partieFinie();
  etat.foret.constellations = CONSTELLATIONS.map((c) => c.id);
  const d = dialogueAnatole(etat);
  assert.equal(d.choix[0].action, 'foret:etoiles');
  const argent = etat.argent;
  appliquerAction(etat, 'foret:etoiles');
  assert.equal(etat.argent, argent + RECOMPENSE_ETOILES);
  assert.ok(etat.curiosites.includes('eclat-meteorite'));
  appliquerAction(etat, 'foret:etoiles'); // une seule fois
  assert.equal(etat.argent, argent + RECOMPENSE_ETOILES);
  assert.notEqual(dialogueAnatole(etat).choix[0].action, 'foret:etoiles');
});

test("avant sa quête, Anatole explique qu'il faut d'abord le cuivre de la mine", () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  assert.match(dialogueAnatole(etat).repliques.join(' '), /cuivre de la mine/);
  assert.match(dialogueLeon(partieFinieJusqua('telescope-anatole')).repliques.join(' '), /Anatole/);
});

// -----------------------------------------------------------------------------
// 2. Le dirigeable
// -----------------------------------------------------------------------------
test('le grand projet : cinq étapes, chacune avec l\'aide d\'un habitant', () => {
  const etat = partieFinieJusqua('dirigeable-nacelle');
  assert.equal(etapesDirigeable(etat), 0);
  for (const id of QUETES_DIRIGEABLE) {
    assert.equal(queteDisponible(etat).id, id);
    appliquerAction(etat, dialoguePnjQuete(etat, 'anatole', 'Anatole').choix[0].action);
    for (const etape of QUETES[id].etapes) {
      const enCours = queteEnCours(etat);
      assert.equal(enCours.etape, etape);
      if (etape.type === 'parler') {
        // L'habitant qui aide a un marqueur et ses propres répliques.
        assert.ok(marqueursQuetes(etat).has(etape.pnj));
        const nom = AMIS.find((a) => a.id === etape.pnj).nom;
        const d = etape.pnj === 'odile' ? dialogueOdile(etat) : dialogueEtapeQuete(etat, etape.pnj, nom);
        assert.deepEqual(d.repliques, etape.repliques);
        const messages = appliquerAction(etat, d.choix[0].action);
        assert.equal(messages[0], etape.messageFait);
      } else if (etape.type === 'fabriquer') {
        assert.ok(recetteDebloquee(etat, etape.objet));
        fabriquer(etat, etape.objet);
      } else {
        assert.equal(etape.type, 'livrer');
        const d = dialoguePnjQuete(etat, 'anatole', 'Anatole');
        appliquerAction(etat, d.choix[0].action);
        assert.equal(etat.atelier.stock[etape.objet], 0); // la pièce est bien partie
      }
    }
    assert.equal(etat.quetes[id].statut, 'terminee');
  }
  assert.equal(etapesDirigeable(etat), 5);
  assert.ok(dirigeablePret(etat));
  assert.ok(possedeTenue(etat, 'casquette-aviateur'));
  assert.equal(queteDisponible(etat), null);
  assert.equal(queteEnCours(etat), null);
  assert.equal(libelleZone(etat, 'chantier'), 'Monter dans le dirigeable');
  // Les habitants qui aident : Barnabé, Capucine, Gaston, Sidonie, Augustin, Léon, Odile.
  const aides = QUETES_DIRIGEABLE.flatMap((id) => QUETES[id].etapes.filter((e) => e.type === 'parler').map((e) => e.pnj));
  assert.deepEqual(aides, ['barnabe', 'capucine', 'gaston', 'sidonie', 'augustin', 'leon', 'odile']);
});

test('le voyage en dirigeable : les destinations ouvertes, pas depuis un lieu couvert', () => {
  const avant = partieFinieJusqua('dirigeable-envol');
  assert.equal(dialogueVoyage(avant, 'place'), null);
  const etat = partieFinie();
  const d = dialogueVoyage(etat, 'place');
  assert.equal(d.choix.length, DESTINATIONS.length); // les 6 autres lieux + « Rester ici »
  assert.ok(!d.choix.some((c) => c.action === 'voyage:place'));
  assert.equal(dialogueVoyage(etat, 'interieur').choix.length, 1);
  assert.equal(dialogueVoyage(etat, 'galerie').choix[0].action, 'fermer');
  const lac = destinationDuChoix(etat, 'place', 'voyage:lac');
  assert.deepEqual(lac, { zone: 'lac', ...ATTERRISSAGES.lac });
  assert.equal(destinationDuChoix(etat, 'lac', 'voyage:lac'), null);
  assert.equal(destinationDuChoix(etat, 'place', 'voyage:nulle-part'), null);
  // Une destination pas encore ouverte n'est pas proposée.
  etat.quetes['train-cuivrebourg'].statut = 'en_cours';
  assert.ok(!destinationsPossibles(etat, 'place').some((x) => x.zone === 'mine'));
});

test("on descend du dirigeable à un endroit libre (et d'où l'on peut aller partout)", () => {
  const etat = partieFinie();
  for (const [zone, a] of Object.entries(ATTERRISSAGES)) {
    const obs = obstaclesZone(zone, etat);
    assert.equal(toucheUnObstacle(a.x, a.z, MONDE.joueur.rayon, obs), false, zone);
    // Depuis là, on peut rejoindre l'entrée habituelle du lieu.
    const entree = Object.values(ZONES[zone].arrivees)[0];
    const { vues, pas } = casesAccessibles(zone, etat, a);
    assert.ok([...vues].some((k) => { const [i, j] = k.split(',').map(Number); return Math.hypot(i * pas - entree.x, j * pas - entree.z) < 0.5; }), zone);
    assert.ok(CARTE_VOL[zone], zone);
  }
  assert.equal(Object.keys(ATTERRISSAGES).length, DESTINATIONS.length);
  // Le vol : une courbe douce, qui part et arrive au bon endroit.
  const depart = positionVol('place', 'mine', 0);
  const arrivee = positionVol('place', 'mine', 1);
  assert.deepEqual([depart.x, depart.z], [CARTE_VOL.place.x, CARTE_VOL.place.z]);
  assert.deepEqual([arrivee.x, arrivee.z], [CARTE_VOL.mine.x, CARTE_VOL.mine.z]);
  assert.ok(positionVol('place', 'mine', 0.5).y > depart.y);
  assert.ok(dureeVol('place', 'marche') < dureeVol('lac', 'mine'));
  assert.ok(dureeVol('lac', 'mine') <= 6.5);
});

// -----------------------------------------------------------------------------
// 3. L'amitié
// -----------------------------------------------------------------------------
test("parler compte une fois par jour ; les cœurs se remplissent", () => {
  const etat = partieFinieJusqua('lampe-odile');
  assert.equal(pointsAmitie(etat, 'odile'), 0);
  parlerAmi(etat, 'odile');
  parlerAmi(etat, 'odile');
  assert.equal(pointsAmitie(etat, 'odile'), GAINS_AMITIE.parler);
  etat.jour = 2;
  parlerAmi(etat, 'odile');
  assert.equal(pointsAmitie(etat, 'odile'), 2 * GAINS_AMITIE.parler);
  assert.equal(texteCoeurs(2), '♥♥♡♡♡');
  assert.deepEqual(parlerAmi(etat, 'inconnu'), []);
});

test("les cadeaux : chacun ses goûts, une fois par jour, et double le jour de l'anniversaire", () => {
  const etat = partieFinieJusqua('lampe-odile');
  etat.jour = 3; // pas l'anniversaire de Capucine (le 1er jour de l'été = jour 3 !)
  etat.jour = 4;
  etat.atelier.stock['boite-musique'] = 2;
  etat.atelier.stock.lanterne = 2;
  assert.ok(peutOffrir(etat, 'capucine'));
  const r = offrirCadeau(etat, 'capucine', 'boite-musique');
  assert.match(r.reaction, /boîte à musique/);
  assert.equal(pointsAmitie(etat, 'capucine'), GAINS_AMITIE.adore);
  assert.equal(etat.atelier.stock['boite-musique'], 1);
  assert.equal(peutOffrir(etat, 'capucine'), false);
  assert.match(offrirCadeau(etat, 'capucine', 'lanterne').messages[0], /déjà offert/);
  // Le jour de son anniversaire, ça compte double.
  const a = AMIS.find((x) => x.id === 'odile');
  etat.jour = a.saison * 2 + a.jour; // le 2e jour du printemps = jour 2 (puis 10, 18…)
  assert.ok(estAnniversaire(etat, 'odile'));
  const avant = pointsAmitie(etat, 'odile');
  offrirCadeau(etat, 'odile', 'lanterne'); // Odile aime les lanternes
  assert.equal(pointsAmitie(etat, 'odile') - avant, GAINS_AMITIE.aime * 2);
  // Un cadeau qui ne plaît pas spécialement compte quand même un peu.
  etat.jour = 20;
  etat.atelier.stock.bouilloire = 1;
  const b = pointsAmitie(etat, 'sidonie');
  offrirCadeau(etat, 'sidonie', 'bouilloire');
  assert.equal(pointsAmitie(etat, 'sidonie') - b, GAINS_AMITIE.cadeau);
  // Le dialogue des cadeaux liste ce qu'on a en stock.
  etat.jour = 21;
  const d = dialogueCadeau(etat, 'leon');
  assert.ok(d.choix.some((c) => c.action === 'amitie:offrir:leon:boite-musique'));
  assert.equal(d.choix[d.choix.length - 1].action, 'fermer');
});

test("le choix « Offrir un cadeau » n'apparaît que dans un dialogue ordinaire", () => {
  const etat = partieFinieJusqua('lampe-odile');
  etat.jour = 5;
  etat.atelier.stock.lanterne = 1;
  const simple = { orateur: 'Léon', repliques: ['Bonjour !'], choix: [{ texte: 'Au revoir', action: 'fermer' }] };
  assert.equal(ajouterChoixAmitie(etat, 'leon', simple).choix[0].action, 'amitie:cadeau:leon');
  const quete = { orateur: 'Capucine', repliques: ['…'], choix: [{ texte: "J'accepte !", action: 'quete:accepter:x' }, { texte: 'Plus tard', action: 'fermer' }] };
  assert.equal(ajouterChoixAmitie(etat, 'capucine', quete), quete);
  etat.atelier.stock.lanterne = 0;
  assert.equal(ajouterChoixAmitie(etat, 'leon', simple).choix.length, 1);
  // Le jour de son anniversaire, l'habitant le dit.
  etat.jour = 4; // le 2e jour de l'été : Léon
  assert.match(ajouterChoixAmitie(etat, 'leon', simple).repliques.join(' '), /anniversaire/);
});

test('les anniversaires : chaque habitant a le sien, et chaque jour de l\'année fête quelqu\'un', () => {
  const vus = new Set();
  for (let jour = 1; jour <= 8; jour++) {
    const liste = anniversairesDuJour(jour);
    assert.ok(liste.length >= 1, `jour ${jour}`);
    for (const a of liste) vus.add(a.id);
    // L'année suivante, les mêmes.
    assert.deepEqual(anniversairesDuJour(jour + 8).map((a) => a.id), liste.map((a) => a.id));
  }
  assert.equal(vus.size, AMIS.length);
  assert.equal(texteAnniversaire('odile'), 'le 2e jour du printemps');
  assert.deepEqual(saisonEtJour(7), { saison: 3, jour: 1 });
  // Chaque habitant adore un objet qui existe, et aime trois autres.
  for (const a of AMIS) {
    assert.ok(RECETTES[a.adore], a.id);
    assert.equal(a.aime.length, 3);
    for (const o of a.aime) assert.ok(RECETTES[o], `${a.id} ${o}`);
  }
});

test("l'aide compte aussi : les quêtes, les fêtes pour Odile, les poissons pour Gaston, le carnet", () => {
  const etat = partieFinie();
  assert.equal(pointsAmitie(etat, 'odile'), 30); // la lampe
  assert.equal(pointsAmitie(etat, 'augustin'), 60); // l'horloge et le train
  assert.equal(pointsAmitie(etat, 'anatole'), 100); // six quêtes, mais 100 au plus
  etat.fetes.faites = ['fete-lanternes-1', 'bal-ete-1'];
  assert.equal(pointsAmitie(etat, 'odile'), 60);
  etat.peche.especes.gardon = 3;
  etat.peche.especes.truite = 1;
  assert.equal(pointsAmitie(etat, 'gaston'), 10);
  etat.carnet.commandes = [{ id: 3, client: 'capucine', objet: 'lanterne', quantite: 1, limite: 9, recompense: 50 }];
  etat.atelier.stock.lanterne = 1;
  livrerCommande(etat, 3);
  assert.equal(pointsAmitie(etat, 'capucine'), 30 + GAINS_AMITIE.commande);
});

test("les cadeaux d'amitié : un petit à 3 cœurs, un grand à 5 cœurs (une seule fois)", () => {
  const etat = partieFinie();
  etat.amitie.amis.augustin.points = 3 * POINTS_PAR_COEUR;
  assert.equal(coeurs(etat, 'augustin'), 4);
  assert.equal(recompenseEnAttente(etat, 'augustin'), 3);
  const d = dialogueRecompense(etat, 'augustin');
  const ressorts = etat.atelier.stock.ressort;
  appliquerAction(etat, d.choix[0].action);
  assert.equal(etat.atelier.stock.ressort, ressorts + 3);
  assert.equal(recompenseEnAttente(etat, 'augustin'), null);
  // À 5 cœurs : les plans du train miniature.
  etat.amitie.amis.augustin.points = 250;
  assert.equal(recompenseEnAttente(etat, 'augustin'), 5);
  assert.equal(recetteDebloquee(etat, 'train-miniature'), false);
  assert.match(acheterAmelioration(etat, 'plans-train')[0], /Augustin/);
  recevoirRecompense(etat, 'augustin', 5);
  assert.ok(recetteDebloquee(etat, 'train-miniature'));
  assert.deepEqual(recevoirRecompense(etat, 'augustin', 5), []);
  // Les autres offrent une tenue pour la garde-robe.
  etat.amitie.amis.odile.points = 250;
  recevoirRecompense(etat, 'odile', 3);
  recevoirRecompense(etat, 'odile', 5);
  assert.ok(possedeTenue(etat, 'echarpe-tricot'));
  for (const a of AMIS) {
    if (a.cadeau5.tenue) assert.ok(TENUES[a.cadeau5.tenue] && TENUES[a.cadeau5.tenue].origine === a.id, a.id);
  }
});

// -----------------------------------------------------------------------------
// 4. Le journal
// -----------------------------------------------------------------------------
test('le journal arrive le matin, une fois par jour (une fois l\'atelier ouvert)', () => {
  const debut = creerEtatJeu();
  debut.journee = 0.5;
  assert.deepEqual(majJournal(debut), []);
  const etat = partieFinieJusqua('balance-capucine');
  etat.journee = HEURE_JOURNAL - 0.01;
  assert.deepEqual(majJournal(etat), []);
  etat.journee = 0.4;
  assert.equal(majJournal(etat).length, 1);
  assert.deepEqual(majJournal(etat), []);
  assert.ok(journalNonLu(etat));
  lireJournal(etat);
  assert.equal(journalNonLu(etat), false);
  etat.jour = 2;
  majJournal(etat);
  assert.ok(journalNonLu(etat));
});

test('le journal dit vrai : météo, fête, anniversaire, carnet', () => {
  const etat = partieFinie();
  // Un jour de pluie (trouvé dans le calendrier de la météo).
  let jourPluie = 1;
  while (!editionDuJour({ ...etat, jour: jourPluie }, { saisonId: 'ete' }).articles[0].texte.includes('pluie douce')) jourPluie++;
  assert.ok(jourPluie < 30);
  assert.match(editionDuJour({ ...etat, jour: jourPluie }, { saisonId: 'ete', meteo: false }).articles[0].texte, /beau temps/);
  // Le jour d'une fête.
  etat.jour = 2;
  const e = editionDuJour(etat, { saisonId: 'printemps' });
  assert.match(e.date, /^Jour 2 · Printemps, 2e jour · Année 1/);
  assert.match(e.articles.find((a) => a.titre === 'Les fêtes').texte, /Fête des lanternes/);
  assert.match(e.articles.find((a) => a.titre === 'Les anniversaires').texte, /Odile.*bouquet de fleurs/);
  etat.carnet.commandes = [{ id: 1, client: 'odile', objet: 'lanterne', quantite: 2, limite: 4, recompense: 95 }];
  assert.ok(editionDuJour(etat).articles.some((a) => a.titre === 'Le carnet de commandes'));
  assert.ok(editionDuJour(etat).articles.some((a) => a.titre === 'On dit que…'));
});

// -----------------------------------------------------------------------------
// 5. La vitrine
// -----------------------------------------------------------------------------
test('exposer et retirer : une création quitte le stock, et y revient', () => {
  const etat = partieFinie();
  etat.atelier.stock.automate = 1;
  assert.ok(objetsExposables(etat).some((o) => o.code === 'creation:automate'));
  exposer(etat, 0, 'creation:automate');
  assert.equal(etat.atelier.stock.automate, 0);
  assert.equal(etat.vitrine.objets[0], 'creation:automate');
  assert.ok(!objetsExposables(etat).some((o) => o.code === 'creation:automate'));
  assert.match(exposer(etat, 0, 'creation:lanterne')[0], /déjà prise/);
  retirer(etat, 0);
  assert.equal(etat.atelier.stock.automate, 1);
  assert.equal(etat.vitrine.objets[0], '');
  // On ne peut pas exposer ce qu'on n'a pas.
  assert.match(exposer(etat, 1, 'creation:horloge')[0], /pas exposer/);
  assert.deepEqual(exposer(etat, 9, 'creation:automate'), []);
  assert.equal(decrireObjetVitrine('nimporte:quoi'), null);
});

test('les poissons et les curiosités vont aussi dans la vitrine ; la vieille botte vient du lac', () => {
  const etat = partieFinie();
  etat.peche.canne = true;
  etat.peche.especes['poisson-lune'] = 1;
  // On pêche jusqu'à remonter une vieille botte.
  for (let i = 0; i < 400 && !etat.curiosites.includes('vieille-botte'); i++) pecher(etat, 'ete');
  assert.ok(etat.curiosites.includes('vieille-botte'));
  const lunes = etat.peche.especes['poisson-lune'];
  exposer(etat, 2, 'poisson:poisson-lune');
  exposer(etat, 3, 'curiosite:vieille-botte');
  assert.equal(attraitVitrine(etat), 8 + 3);
  assert.equal(plusBelObjet(etat).id, 'poisson-lune');
  assert.equal(etat.peche.especes['poisson-lune'], lunes); // le portrait ne retire rien
  for (const id of Object.keys(CURIOSITES)) assert.ok(decrireObjetVitrine(`curiosite:${id}`));
  for (const e of ESPECES) assert.ok(decrireObjetVitrine(`poisson:${e.id}`));
});

test('les visiteurs : seulement si la vitrine est garnie ; plus elle est belle, plus ils donnent', () => {
  const etat = partieFinie();
  assert.equal(avancerVitrine(etat, 500).visite, false);
  etat.atelier.stock.lanterne = 1;
  exposer(etat, 0, 'creation:lanterne');
  const petit = pourboire(etat);
  assert.equal(avancerVitrine(etat, 10).visite, false);
  const argent = etat.argent;
  const v = avancerVitrine(etat, 100);
  assert.equal(v.visite, true);
  assert.equal(etat.argent, argent + petit);
  assert.match(v.messages[1], /votre lanterne/);
  assert.equal(etat.vitrine.prochain, INTERVALLE_VISITEURS);
  // Une vitrine pleine de merveilles : le pourboire grandit, sans dépasser le maximum.
  etat.curiosites = Object.keys(CURIOSITES);
  etat.peche.especes['poisson-lune'] = 1;
  etat.atelier.stock.automate = 1;
  exposer(etat, 1, 'creation:automate');
  exposer(etat, 2, 'poisson:poisson-lune');
  exposer(etat, 3, 'curiosite:eclat-meteorite');
  exposer(etat, 4, 'curiosite:fossile');
  exposer(etat, 5, 'curiosite:pomme-pin-doree');
  assert.ok(pourboire(etat) > petit);
  assert.ok(pourboire(etat) <= POURBOIRE_MAX);
  assert.equal(etat.vitrine.objets.length, PLACES_VITRINE);
});

// -----------------------------------------------------------------------------
// 6. La garde-robe
// -----------------------------------------------------------------------------
test("la garde-robe : acheter, porter ; les cadeaux ne s'achètent pas", () => {
  const etat = partieFinie();
  assert.deepEqual(tenuePortee(etat), { chapeau: 'sans-chapeau', lunettes: 'lunettes-artisan', tablier: 'tablier-cuir', echarpe: 'sans-echarpe', chemise: 'chemise-creme' });
  const argent = etat.argent;
  acheterTenue(etat, 'haut-de-forme');
  assert.equal(etat.argent, argent - TENUES['haut-de-forme'].prix);
  assert.equal(tenuePortee(etat).chapeau, 'haut-de-forme');
  porterTenue(etat, 'sans-chapeau');
  assert.equal(tenuePortee(etat).chapeau, 'sans-chapeau');
  acheterTenue(etat, 'haut-de-forme'); // déjà à nous : on le remet, sans payer
  assert.equal(etat.argent, argent - TENUES['haut-de-forme'].prix);
  assert.match(acheterTenue(etat, 'casque-mineur')[0], /ne s'achète pas/);
  assert.deepEqual(porterTenue(etat, 'casque-mineur'), []);
  recevoirTenue(etat, 'casque-mineur');
  porterTenue(etat, 'casque-mineur');
  assert.equal(tenuePortee(etat).chapeau, 'casque-mineur');
  etat.argent = 5;
  assert.match(acheterTenue(etat, 'monocle')[0], /Pas assez/);
  // Une tenue abîmée dans la partie est remplacée par celle du départ.
  etat.garderobe.porte.lunettes = 'casque-mineur';
  assert.equal(tenuePortee(etat).lunettes, 'lunettes-artisan');
  // Chaque catégorie a au moins une tenue de départ, et une à acheter ou à recevoir.
  for (const c of CATEGORIES_TENUE) {
    const liste = tenuesDeCategorie(etat, c.id);
    assert.ok(liste.some((t) => t.defaut), c.id);
    assert.ok(liste.some((t) => !t.defaut), c.id);
  }
});

// -----------------------------------------------------------------------------
// 7. Le petit jeu d'assemblage
// -----------------------------------------------------------------------------
test("chaque planche d'assemblage a une solution, avec un engrenage d'avance", () => {
  for (const p of PLANCHES) {
    const n = plusCourtChemin(p);
    assert.ok(n !== null);
    assert.equal(p.engrenages, n + 1);
  }
  assert.deepEqual(OBJETS_ASSEMBLAGE, ['horloge', 'boite-musique', 'automate', 'train-miniature']);
});

test("l'assemblage : poser, retirer ; quand la chaîne touche l'aiguille, tout tourne", () => {
  const partie = creerAssemblage('horloge', 0);
  assert.equal(contenuCase(partie, 0, 1), 'moteur');
  assert.equal(basculer(partie, 0, 1), false); // le moteur ne bouge pas
  assert.equal(basculer(partie, 3, 1), false); // un rivet
  // Le chemin : par le haut du rivet.
  for (const [x, y] of [[1, 1], [2, 1], [2, 0], [3, 0], [4, 0], [4, 1]]) basculer(partie, x, y);
  assert.equal(estAssemble(partie), false);
  basculer(partie, 9, 9); // hors de la planche : rien
  basculer(partie, 5, 1);
  assert.equal(estAssemble(partie), true);
  // Deux engrenages qui se touchent tournent en sens contraire.
  const sens = engrenagesEntraines(partie);
  assert.equal(sens.get('1,1'), -1);
  assert.equal(sens.get('2,1'), 1);
  assert.equal(sens.get('5,1'), -1);
  // On retire un engrenage : la chaîne est coupée.
  basculer(partie, 3, 0);
  assert.equal(estAssemble(partie), false);
  assert.equal(engrenagesRestants(partie), 2);
  // On ne peut pas poser plus d'engrenages qu'on en a.
  const pleine = creerAssemblage('automate', 0);
  let poses = 0;
  for (let x = 1; x < 6; x++) for (let y = 0; y < 4; y++) if (basculer(pleine, x, y)) poses += 1;
  assert.equal(poses, pleine.planche.engrenages);
});

test("un objet assemblé à la main se fabrique deux fois plus vite", () => {
  const etat = partieFinie();
  etat.atelier.ameliorations.push('plans-horloge');
  etat.atelier.stock.cuivre = 5;
  etat.atelier.stock.bois = 5;
  etat.atelier.stock.ressort = 5;
  lancerFabrication(etat, 'horloge', { assemble: true });
  assert.equal(etat.atelier.fabrication.total, RECETTES.horloge.duree / 2);
  assert.equal(etat.atelier.assemblages, 1);
  avancerTemps(etat, 100);
  lancerFabrication(etat, 'horloge');
  assert.equal(etat.atelier.fabrication.total, RECETTES.horloge.duree);
  // Le petit jeu change de planche à chaque fois.
  assert.notDeepEqual(creerAssemblage('horloge', 1).planche, creerAssemblage('horloge', 0).planche);
});

// -----------------------------------------------------------------------------
// 8. Le mode photo
// -----------------------------------------------------------------------------
test('la caméra photo part de la vue du jeu, et ne passe jamais sous le sol', () => {
  const cam = creerCameraPhoto();
  const p = positionCameraPhoto(cam, { x: 0, y: 0.8, z: 0 });
  assert.ok(Math.abs(p.y - 15.8) < 1e-9);
  assert.ok(Math.abs(p.z - 12.5) < 1e-9);
  bougerCameraPhoto(cam, 0, -10, -100);
  assert.equal(cam.hauteur, LIMITES_PHOTO.hauteurMin);
  assert.equal(cam.distance, LIMITES_PHOTO.distanceMin);
  bougerCameraPhoto(cam, Math.PI, 10, 100);
  assert.equal(cam.hauteur, LIMITES_PHOTO.hauteurMax);
  assert.equal(cam.distance, LIMITES_PHOTO.distanceMax);
  assert.ok(positionCameraPhoto(bougerCameraPhoto(cam, 0, -10, -100), { x: 0, y: 0, z: 0 }).y >= 0.6);
});

test('les photos de l\'album : 12 au plus, la plus récente d\'abord ; une liste abîmée est ignorée', () => {
  let liste = [];
  for (let i = 0; i < 15; i++) liste = ajouterPhoto(liste, { image: `data:image/jpeg;base64,${i}`, date: new Date(2026, 0, 1, 10, i).toISOString(), lieu: 'place' });
  assert.equal(liste.length, MAX_PHOTOS);
  assert.equal(liste[0].image, 'data:image/jpeg;base64,14');
  assert.deepEqual(lirePhotos(JSON.stringify(liste)), liste);
  assert.deepEqual(lirePhotos('pas du json'), []);
  assert.deepEqual(lirePhotos(JSON.stringify([{ image: 'javascript:alert(1)', date: 'x' }, 3, null])), []);
  assert.equal(nomFichierPhoto(new Date(2026, 10, 7, 14, 5)), 'cuivrebourg-photo-2026-11-07-1405.jpg');
});

// -----------------------------------------------------------------------------
// 9. La sauvegarde, le fichier de partie et les réglages
// -----------------------------------------------------------------------------
test('tout ce qui est nouveau est sauvegardé, puis relu', () => {
  const etat = partieFinie();
  etat.amitie.amis.odile.points = 120;
  etat.amitie.recompenses = ['odile-3'];
  recevoirTenue(etat, 'casque-mineur');
  porterTenue(etat, 'casque-mineur');
  etat.atelier.stock.automate = 1;
  exposer(etat, 4, 'creation:automate');
  etat.foret.constellations = ['lanterne'];
  etat.foret.cueillettes['cueillette-2'] = 40;
  etat.curiosites = ['fossile'];
  etat.journal = { dernierJour: 3, lu: 2 };
  etat.atelier.assemblages = 4;
  const relu = chargerPartie(serialiserPartie({ etat, zone: 'foret', position: { x: 1, z: 2 } })).etat;
  assert.equal(relu.amitie.amis.odile.points, 120);
  assert.deepEqual(relu.amitie.recompenses, ['odile-3']);
  assert.equal(relu.garderobe.porte.chapeau, 'casque-mineur');
  assert.equal(relu.vitrine.objets[4], 'creation:automate');
  assert.deepEqual(relu.foret.constellations, ['lanterne']);
  assert.equal(relu.foret.cueillettes['cueillette-2'], 40);
  assert.deepEqual(relu.curiosites, ['fossile']);
  assert.deepEqual(relu.journal, { dernierJour: 3, lu: 2 });
  assert.equal(relu.atelier.assemblages, 4);
});

test('une sauvegarde trafiquée ne casse rien ; une ancienne partie reçoit les nouveautés', () => {
  const etat = partieFinie();
  const texte = serialiserPartie({ etat, zone: 'foret', position: { x: 0, z: 0 } });
  const lu = JSON.parse(texte);
  lu.etat.amitie.amis.odile.points = 99999;
  lu.etat.amitie.recompenses = ['odile-3', 'odile-3', 'triche-5', 7];
  lu.etat.garderobe.possedes = ['casquette-aviateur', 'chapeau-en-or', 'casquette-aviateur'];
  lu.etat.garderobe.porte.chapeau = 'bonnet-marin'; // pas possédé
  lu.etat.vitrine.objets = ['creation:automate', 'creation:automate', 'poisson:requin', 12, '', '', '', '', ''];
  lu.etat.foret.constellations = ['lanterne', 'etoile-inventee', 'lanterne'];
  lu.etat.foret.cueillettes['cueillette-1'] = -5;
  lu.etat.curiosites = ['fossile', 'diamant'];
  lu.etat.journal = { dernierJour: 4, lu: 99 };
  const relu = chargerPartie(JSON.stringify(lu)).etat;
  assert.equal(relu.amitie.amis.odile.points, 250);
  assert.deepEqual(relu.amitie.recompenses, ['odile-3']);
  assert.deepEqual(relu.garderobe.possedes, ['casquette-aviateur']);
  assert.equal(relu.garderobe.porte.chapeau, 'sans-chapeau');
  assert.deepEqual(relu.vitrine.objets, ['creation:automate', '', '', '', '', '']);
  assert.deepEqual(relu.foret.constellations, ['lanterne']);
  assert.equal(relu.foret.cueillettes['cueillette-1'], 0);
  assert.deepEqual(relu.curiosites, ['fossile']);
  assert.equal(relu.journal.lu, 4);
  // Une partie de la version 1.5 (sans aucune de ces clés) se relit très bien.
  for (const cle of ['amitie', 'garderobe', 'vitrine', 'foret', 'curiosites', 'journal']) delete lu.etat[cle];
  const ancienne = chargerPartie(JSON.stringify(lu));
  assert.ok(ancienne);
  assert.equal(ancienne.etat.vitrine.objets.length, PLACES_VITRINE);
  assert.equal(ancienne.etat.garderobe.porte.lunettes, 'lunettes-artisan');
});

test('le fichier de partie : un nom daté, et un petit résumé avant de l\'ouvrir', () => {
  assert.equal(nomFichierSauvegarde(new Date(2026, 0, 5)), 'cuivrebourg-partie-2026-01-05.json');
  const etat = partieFinieJusqua('roue-moulin');
  etat.jour = 12;
  etat.argent = 340;
  const partie = chargerPartie(serialiserPartie({ etat, zone: 'place', position: { x: 0, z: 0 } }));
  assert.equal(resumePartie(partie), `Jour 12 · 340 pièces · 2 quêtes terminées sur ${Object.keys(QUETES).length}`);
  assert.equal(resumePartie(null), '');
  assert.equal(chargerPartie('{"pas": "une partie"}'), null);
});

test('les réglages : la taille du texte et le petit jeu d\'assemblage', () => {
  const r = creerReglages();
  assert.equal(r.texte, 'normal');
  assert.equal(r.assemblage, true);
  assert.equal(lireReglages(JSON.stringify({ texte: 'tres-grand', assemblage: false })).texte, 'tres-grand');
  assert.equal(lireReglages(JSON.stringify({ texte: 'gigantesque' })).texte, 'normal');
  assert.equal(lireReglages(JSON.stringify({ assemblage: 'oui' })).assemblage, true);
  assert.deepEqual(Object.keys(TAILLES_TEXTE), ['normal', 'grand', 'tres-grand']);
  assert.ok(Object.values(TAILLES_TEXTE).every((t) => t.echelle >= 1 && t.echelle <= 1.3));
});

// -----------------------------------------------------------------------------
// 10. L'album, la musique et les petits textes
// -----------------------------------------------------------------------------
test("l'album : Anatole, les cœurs et les anniversaires, les souvenirs du grand projet", () => {
  const etat = partieFinie();
  assert.ok(HABITANTS_ALBUM.some((h) => h.id === 'anatole'));
  const odile = habitantsAlbum(etat).find((h) => h.id === 'odile');
  assert.equal(odile.coeurs, 0);
  assert.equal(odile.anniversaire, 'le 2e jour du printemps');
  assert.equal(habitantsAlbum(etat).find((h) => h.id === 'chat').coeurs, undefined);
  assert.ok(souvenirsAlbum(etat).some((s) => /grand envol/.test(s.titre)));
  assert.ok(AMBIANCES.foret);
  // Tous les habitants de l'album (sauf les compagnons) ont des cœurs d'amitié.
  for (const h of HABITANTS_ALBUM.filter((x) => !x.compagnon)) assert.ok(AMIS.some((a) => a.id === h.id), h.id);
  assert.equal(libelleZone(etat, 'vitrine'), "La vitrine de l'atelier");
  assert.equal(libelleZone(etat, 'armoire'), 'La garde-robe');
  assert.equal(libelleZone(etat, 'anatole'), 'Parler à Anatole');
  assert.match(objectifActuel(partieFinieJusqua('telescope-anatole')), /Anatole/);
  assert.ok(majCarnet);
});
