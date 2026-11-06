// =============================================================================
// Tests de la version 1.2 : la gare à vapeur (lieu et quêtes), le jour et la
// nuit, l'horaire du train, et la sauvegarde du moment de la journée.
// Lancement : npm test   (ou : node --test)
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MONDE, creerEtatJeu, deplacerJoueur, calculerPas, toucheUnObstacle } from '../js/logique.js';
import { ouvrirAtelier, lancerFabrication, acheterMateriau, avancerTemps } from '../js/logique-atelier.js';
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
  sortieAtteinte,
  libelleZone,
  messageObjet,
  dialogueLeon,
  horlogeReparee,
  locomotiveEnMarche,
} from '../js/logique-zones.js';
import {
  DUREE_JOURNEE,
  DEBUT_JOURNEE,
  MOMENTS,
  lumiereDuMoment,
  avancerJournee,
  heureAffichee,
  anglesAiguilles,
  bouclerJournee,
  etatTrain,
  CYCLE_TRAIN,
} from '../js/logique-temps.js';
import { serialiserPartie, chargerPartie } from '../js/logique-sauvegarde.js';
import { creerReglages, lireReglages } from '../js/logique-reglages.js';

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

// Fabrique un objet de quête (en achetant ce qu'il faut), puis attend la fin.
function fabriquer(etat, id) {
  for (const m of ['cuivre', 'bois', 'ressort']) acheterMateriau(etat, m, Math.max(0, 3 - etat.atelier.stock[m]));
  const messages = lancerFabrication(etat, id);
  assert.ok(messages[0].startsWith('Fabrication lancée'), messages[0]);
  for (let t = 0; t < 20; t += 0.5) avancerTemps(etat, 0.5);
  return verifierQuetes(etat);
}

// -----------------------------------------------------------------------------
// La gare : le lieu
// -----------------------------------------------------------------------------
test('la route de la gare est fermée jusqu\'à la fin de la quête de Barnabé', () => {
  const avant = partieFinieJusqua('balance-capucine');
  assert.equal(sortieAtteinte('moulin', 14, 0, avant), null);
  assert.ok(obstaclesZone('moulin', avant).some((o) => o.id === 'barriere-gare'));
  assert.match(messageObjet(avant, 'barriere-gare')[0], /Barnabé/);

  const apres = partieFinieJusqua('roue-moulin');
  assert.deepEqual(sortieAtteinte('moulin', 14, 0, apres), { zone: 'gare', x: -12.3, z: 0, orientation: Math.PI / 2 });
  assert.ok(!obstaclesZone('moulin', apres).some((o) => o.id === 'barriere-gare'));
  // Et on revient au moulin par l'ouest de la gare.
  assert.equal(sortieAtteinte('gare', -14, 0, apres).zone, 'moulin');
});

test('à la gare, on ne marche ni sur la voie ferrée, ni dans l\'horloge, ni dans le château d\'eau', () => {
  const etat = partieFinieJusqua('roue-moulin');
  const obstacles = obstaclesZone('gare', etat);
  for (const id of ['voie', 'horloge', 'chateau-eau', 'banc', 'gare', 'augustin']) {
    assert.ok(obstacles.some((o) => o.id === id), `${id} manque dans les obstacles`);
  }
  assert.ok(toucheUnObstacle(0, -7, MONDE.joueur.rayon, obstacles), 'la voie ferrée');
  // Ferrus se promène au hasard dans la gare : jamais dans un obstacle.
  const zone = ZONES.gare;
  let graine = 11;
  const hasard = () => ((graine = (graine * 16807) % 2147483647) / 2147483647) * 2 - 1;
  let p = { x: zone.arrivees.moulin.x, z: zone.arrivees.moulin.z };
  for (let i = 0; i < 200; i++) {
    const dx = hasard();
    const dz = hasard();
    for (let j = 0; j < 30; j++) {
      const pas = calculerPas(dx, dz, MONDE.joueur.vitesse, 1 / 30);
      p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, zone);
      assert.equal(toucheUnObstacle(p.x, p.z, MONDE.joueur.rayon, obstacles), false, `dans un obstacle en (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
    }
  }
});

test('les rouages de l\'horloge sont tous accessibles', () => {
  const etat = partieFinieJusqua('roue-moulin');
  const obstacles = obstaclesZone('gare', etat);
  for (const o of QUETES['horloge-gare'].etapes[0].objets) {
    assert.equal(o.lieu, 'gare');
    assert.equal(toucheUnObstacle(o.x, o.z, MONDE.joueur.rayon, obstacles), false, `${o.id} inaccessible`);
  }
});

test('les lanternes sont des obstacles (on ne passe pas à travers leur poteau)', () => {
  const etat = partieFinieJusqua('roue-moulin');
  for (const zoneId of ['place', 'marche', 'moulin', 'gare']) {
    const lanternes = obstaclesZone(zoneId, etat).filter((o) => o.id.startsWith('lampadaire'));
    assert.ok(lanternes.length >= 2, `${zoneId} : ${lanternes.length} lanterne(s)`);
  }
});

// -----------------------------------------------------------------------------
// La gare : les deux quêtes
// -----------------------------------------------------------------------------
test('quête de l\'horloge : rouages, régulateur, horloge, Augustin', () => {
  const etat = partieFinieJusqua('roue-moulin');
  assert.equal(queteDisponible(etat).id, 'horloge-gare');
  assert.ok(marqueursQuetes(etat).has('augustin'));
  const proposition = dialoguePnjQuete(etat, 'augustin', 'Augustin');
  appliquerActionQuete(etat, proposition.choix[0].action);
  assert.equal(queteEnCours(etat).id, 'horloge-gare');

  // Les rouages n'apparaissent qu'à la gare.
  assert.equal(objetsARamasser(etat, 'moulin').length, 0);
  const rouages = objetsARamasser(etat, 'gare');
  assert.equal(rouages.length, 3);
  for (const r of rouages) ramasserObjetsQuete(etat, 'gare', r.x, r.z);
  assert.equal(queteEnCours(etat).etape.type, 'fabriquer');

  // L'horloge refuse tant que le régulateur n'est pas fabriqué.
  assert.equal(utiliserObjetQuete(etat, 'horloge'), null);
  assert.match(messageObjet(etat, 'horloge')[0], /arrêtée/);
  fabriquer(etat, 'regulateur');
  assert.equal(queteEnCours(etat).etape.type, 'utiliser');
  assert.ok(marqueursQuetes(etat).has('horloge'));
  assert.equal(libelleZone(etat, 'horloge'), "Réparer l'horloge");
  assert.equal(horlogeReparee(etat), false);
  utiliserObjetQuete(etat, 'horloge');
  assert.equal(etat.atelier.stock.regulateur, 0);
  assert.equal(horlogeReparee(etat), true);

  // Réparée, l'horloge donne l'heure du jeu.
  etat.journee = 0.5;
  assert.equal(messageObjet(etat, 'horloge')[0], "L'horloge de la gare indique 12 h 00.");

  const argentAvant = etat.argent;
  const fin = dialoguePnjQuete(etat, 'augustin', 'Augustin');
  appliquerActionQuete(etat, fin.choix[0].action);
  assert.equal(etat.argent, argentAvant + QUETES['horloge-gare'].recompense);
  assert.equal(queteDisponible(etat).id, 'train-cuivrebourg');
});

test('quête du premier train : sifflet, locomotive, Augustin → le train roule', () => {
  const etat = partieFinieJusqua('horloge-gare');
  appliquerActionQuete(etat, 'quete:accepter:train-cuivrebourg');
  assert.match(objectifQuetes(etat), /sifflet/);
  assert.equal(locomotiveEnMarche(etat), false);
  assert.match(messageObjet(etat, 'locomotive')[0], /rouillé/);
  fabriquer(etat, 'sifflet');
  assert.ok(marqueursQuetes(etat).has('locomotive'));
  assert.equal(libelleZone(etat, 'locomotive'), 'Installer le sifflet');
  utiliserObjetQuete(etat, 'locomotive');
  assert.equal(locomotiveEnMarche(etat), true);
  assert.ok(marqueursQuetes(etat).has('augustin'));

  const argentAvant = etat.argent;
  const fin = dialoguePnjQuete(etat, 'augustin', 'Augustin');
  assert.equal(fin.choix[0].texte, 'En voiture !');
  appliquerActionQuete(etat, fin.choix[0].action);
  assert.equal(etat.argent, argentAvant + QUETES['train-cuivrebourg'].recompense);
  // Version 1.3 : la quête suivante attend à la mine, chez Sidonie (on y va en train).
  assert.equal(queteEnCours(etat), null);
  assert.equal(queteDisponible(etat).id, 'wagonnet-mine');
  assert.match(objectifQuetes(etat), /Sidonie/);
  assert.match(dialogueLeon(etat).repliques[0], /mine/);
  assert.match(messageObjet(etat, 'locomotive')[0], /roule/);
});

test('les recettes de la gare ne se fabriquent que pendant leur quête', () => {
  const etat = partieFinieJusqua('roue-moulin');
  for (const m of ['cuivre', 'bois', 'ressort']) acheterMateriau(etat, m, 3);
  assert.ok(!lancerFabrication(etat, 'regulateur')[0].startsWith('Fabrication lancée'));
  assert.ok(!lancerFabrication(etat, 'sifflet')[0].startsWith('Fabrication lancée'));
});

// -----------------------------------------------------------------------------
// Le jour et la nuit
// -----------------------------------------------------------------------------
test('une nouvelle partie commence le matin', () => {
  const etat = creerEtatJeu();
  assert.equal(etat.journee, DEBUT_JOURNEE);
  assert.equal(heureAffichee(etat.journee), '8 h 00');
  assert.equal(lumiereDuMoment(etat.journee).nuit, 0);
});

test('à midi il fait jour (comme avant), à minuit il fait nuit', () => {
  const midi = lumiereDuMoment(0.5);
  assert.equal(midi.nuit, 0);
  assert.equal(midi.forceCiel, 1.75);
  assert.equal(midi.forceSoleil, 1.5);
  const minuit = lumiereDuMoment(0);
  assert.equal(minuit.nuit, 1);
  // La nuit reste claire : on voit toujours où l'on marche.
  assert.ok(minuit.forceCiel >= 1, `ciel la nuit : ${minuit.forceCiel}`);
  assert.ok(minuit.basSol.reduce((s, c) => s + c, 0) > 0.6, 'le sol reste visible la nuit');
});

test('la lumière change tout doucement : jamais de saut d\'une image à l\'autre', () => {
  // On avance la journée par tout petits pas (une image à 60 images par seconde).
  const pas = 1 / 60 / DUREE_JOURNEE;
  let avant = lumiereDuMoment(0);
  let ecartMax = 0;
  for (let f = pas; f <= 1 + pas; f += pas) {
    const l = lumiereDuMoment(f);
    for (const cle of ['ciel', 'hautCiel', 'basSol', 'soleil']) {
      for (let i = 0; i < 3; i++) ecartMax = Math.max(ecartMax, Math.abs(l[cle][i] - avant[cle][i]));
    }
    ecartMax = Math.max(ecartMax, Math.abs(l.forceCiel - avant.forceCiel) / 2, Math.abs(l.nuit - avant.nuit));
    avant = l;
  }
  // Moins de 0,2 % de changement par image : invisible à l'œil, aucun clignotement.
  assert.ok(ecartMax < 0.002, `plus grand changement par image : ${ecartMax}`);
});

test('les moments de la journée sont bien rangés, du début à la fin', () => {
  assert.equal(MOMENTS[0].a, 0);
  assert.equal(MOMENTS.at(-1).a, 1);
  for (let i = 1; i < MOMENTS.length; i++) assert.ok(MOMENTS[i].a > MOMENTS[i - 1].a);
  // Minuit « avant » et minuit « après » sont pareils : la boucle est sans couture.
  assert.deepEqual(lumiereDuMoment(0), lumiereDuMoment(0.99999999));
});

test('la journée avance, fait le tour, et prévient au lever et au coucher du soleil', () => {
  const etat = creerEtatJeu();
  const messages = [];
  for (let t = 0; t < DUREE_JOURNEE; t += 0.5) messages.push(...avancerJournee(etat, 0.5));
  assert.ok(Math.abs(etat.journee - DEBUT_JOURNEE) < 1e-6, `après un tour : ${etat.journee}`);
  assert.equal(messages.length, 2);
  assert.ok(messages.some((m) => /soir/.test(m)));
  assert.ok(messages.some((m) => /jour se lève/.test(m)));
  // Cycle coupé dans les options : le temps passe (l'horloge tourne), sans message.
  const silencieux = [];
  for (let t = 0; t < DUREE_JOURNEE; t += 0.5) silencieux.push(...avancerJournee(etat, 0.5, false));
  assert.equal(silencieux.length, 0);
});

test('l\'heure et les aiguilles de l\'horloge', () => {
  assert.equal(heureAffichee(0), '0 h 00');
  assert.equal(heureAffichee(0.75), '18 h 00');
  assert.equal(heureAffichee(0.5 + 5 / (24 * 60)), '12 h 05');
  const a = anglesAiguilles(0.25); // 6 h pile : la petite aiguille en bas, la grande en haut
  assert.ok(Math.abs(a.heures - Math.PI) < 1e-9);
  assert.ok(Math.abs(a.minutes) < 1e-9);
  assert.equal(bouclerJournee(1.25), 0.25);
  assert.equal(bouclerJournee(-0.25), 0.75);
  assert.equal(bouclerJournee(NaN), DEBUT_JOURNEE);
});

// -----------------------------------------------------------------------------
// L'horaire du train
// -----------------------------------------------------------------------------
test('le train attend à quai, part en douceur, disparaît, et revient en ralentissant', () => {
  assert.deepEqual(etatTrain(0), { decalage: 0, vitesse: 0, visible: true });
  assert.equal(etatTrain(30).decalage, 0);
  assert.ok(etatTrain(50).decalage > 0, 'il part vers l\'est');
  assert.equal(etatTrain(70).visible, false);
  assert.ok(etatTrain(85).decalage < 0, 'il revient de l\'ouest');
  assert.equal(etatTrain(97).decalage, 0);
  assert.deepEqual(etatTrain(CYCLE_TRAIN), etatTrain(0));
  // Pas de saut : quand il est visible, il avance de moins de 15 cm par image.
  let avant = etatTrain(0);
  for (let t = 1 / 60; t < CYCLE_TRAIN * 2; t += 1 / 60) {
    const e = etatTrain(t);
    if (e.visible && avant.visible) assert.ok(Math.abs(e.decalage - avant.decalage) < 0.15, `saut à t = ${t.toFixed(2)}`);
    assert.ok(e.vitesse <= 6.01, `trop rapide à t = ${t.toFixed(2)}`);
    avant = e;
  }
});

// -----------------------------------------------------------------------------
// Sauvegarde et options
// -----------------------------------------------------------------------------
test('le moment de la journée et la gare sont sauvegardés', () => {
  const etat = partieFinieJusqua('roue-moulin');
  etat.journee = 0.9;
  const relue = chargerPartie(serialiserPartie({ etat, zone: 'gare', position: { x: 2, z: 1 } }));
  assert.equal(relue.zone, 'gare');
  assert.equal(relue.etat.journee, 0.9);
  assert.deepEqual(relue.etat, etat);
});

test('une sauvegarde de la version 1.1 (sans heure) reprend le matin, avec la nouvelle quête', () => {
  const etat = partieFinieJusqua('roue-moulin');
  const ancienne = JSON.parse(serialiserPartie({ etat, zone: 'moulin', position: { x: 0, z: 2 } }));
  delete ancienne.etat.journee;
  delete ancienne.etat.quetes['horloge-gare'];
  delete ancienne.etat.quetes['train-cuivrebourg'];
  const relue = chargerPartie(JSON.stringify(ancienne));
  assert.equal(relue.etat.journee, DEBUT_JOURNEE);
  assert.equal(relue.etat.quetes['horloge-gare'].statut, 'disponible');
  assert.equal(relue.etat.quetes['train-cuivrebourg'].statut, 'verrouillee');
});

test('une heure trafiquée dans la sauvegarde est corrigée', () => {
  const etat = creerEtatJeu();
  for (const [valeur, attendu] of [[7.5, 0.5], [-0.25, 0.75], ['midi', DEBUT_JOURNEE]]) {
    const texte = JSON.parse(serialiserPartie({ etat, zone: 'place', position: { x: 0, z: 0 } }));
    texte.etat.journee = valeur;
    assert.equal(chargerPartie(JSON.stringify(texte)).etat.journee, attendu, `valeur ${valeur}`);
  }
});

test('l\'option « Jour et nuit » est activée au départ, et se relit', () => {
  assert.equal(creerReglages().jourNuit, true);
  assert.equal(lireReglages('{"jourNuit":false}').jourNuit, false);
  assert.equal(lireReglages('{"jourNuit":"non"}').jourNuit, true);
});
