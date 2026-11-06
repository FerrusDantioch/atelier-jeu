// =============================================================================
// Tests de l'étape 4 : les options, la musique composée par le code, et les
// fichiers qui permettent d'installer le jeu (manifeste, service worker).
// Lancement : npm test   (ou : node --test)
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  VERSION_JEU,
  NIVEAUX_VOLUME,
  creerReglages,
  lireReglages,
  ecrireReglages,
  changerVolume,
  volumeReel,
  parametresQualite,
} from '../js/logique-reglages.js';
import {
  AMBIANCES,
  GAMMES,
  TESSITURES,
  SONS,
  TEMPS_PAR_MESURE,
  composerMesure,
  creerEtatMelodie,
  creerHasard,
  dureeMesure,
  frequence,
  noteDeGamme,
} from '../js/logique-musique.js';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(join(racine, chemin), 'utf8');

// -----------------------------------------------------------------------------
// Les réglages
// -----------------------------------------------------------------------------
test('au départ, la musique et les sons sont coupés (confort)', () => {
  const r = creerReglages();
  assert.equal(r.musique, false);
  assert.equal(r.sons, false);
  assert.equal(r.qualite, 'normale');
});

test('des réglages abîmés ou trafiqués redonnent des valeurs sûres', () => {
  for (const texte of [null, '', 'pas du json', '[]', '42', '"texte"', '{"musique":"oui"}']) {
    assert.deepEqual(lireReglages(texte), creerReglages(), `texte : ${texte}`);
  }
  const lu = lireReglages(JSON.stringify({ musique: true, volumeMusique: 99, sons: true, volumeSons: -4, qualite: 'ultra' }));
  assert.equal(lu.musique, true);
  assert.equal(lu.volumeMusique, NIVEAUX_VOLUME);
  assert.equal(lu.sons, true);
  assert.equal(lu.volumeSons, 1);
  assert.equal(lu.qualite, 'normale');
  assert.equal(lireReglages('{"volumeMusique":2.5}').volumeMusique, creerReglages().volumeMusique);
});

test('les réglages enregistrés se relisent à l\'identique', () => {
  const r = { musique: true, volumeMusique: 2, sons: false, volumeSons: 5, qualite: 'economie', jourNuit: false };
  assert.deepEqual(lireReglages(ecrireReglages(r)), r);
});

test('le volume monte et descend d\'un cran, sans sortir de 1 à 5', () => {
  const r = creerReglages();
  for (let i = 0; i < 10; i++) changerVolume(r, 'volumeMusique', 1);
  assert.equal(r.volumeMusique, NIVEAUX_VOLUME);
  for (let i = 0; i < 10; i++) changerVolume(r, 'volumeMusique', -1);
  assert.equal(r.volumeMusique, 1);
});

test('le volume réel monte doucement et ne dépasse jamais 1', () => {
  let avant = 0;
  for (let n = 1; n <= NIVEAUX_VOLUME; n++) {
    const v = volumeReel(n);
    assert.ok(v > avant && v <= 1, `niveau ${n} : ${v}`);
    avant = v;
  }
  assert.ok(volumeReel(1) < 0.1, 'le niveau 1 est très doux');
});

test('le mode Économie dessine moins de pixels, sans ombres, à 30 images par seconde', () => {
  assert.deepEqual(parametresQualite('economie', 3), { pixelRatio: 1, ombres: false, imagesParSeconde: 30 });
  assert.deepEqual(parametresQualite('normale', 3), { pixelRatio: 1.5, ombres: true, imagesParSeconde: 60 });
  assert.equal(parametresQualite('normale', 1).pixelRatio, 1);
});

// -----------------------------------------------------------------------------
// La musique
// -----------------------------------------------------------------------------
// Compose beaucoup de mesures d'une ambiance (avec une graine fixe).
function composer(nom, mesures = 400, graine = 11) {
  const hasard = creerHasard(graine);
  const etat = creerEtatMelodie();
  const toutes = [];
  for (let n = 0; n < mesures; n++) toutes.push(composerMesure(AMBIANCES[nom], n, hasard, etat));
  return toutes;
}

test('les notes de base : le la 69 vaut 440 Hz, une octave double la fréquence', () => {
  assert.equal(frequence(69), 440);
  assert.ok(Math.abs(frequence(81) - 880) < 1e-9);
  const place = AMBIANCES.place;
  assert.equal(noteDeGamme(place, 0), place.tonique);
  assert.equal(noteDeGamme(place, 7), place.tonique + 12);
  assert.equal(noteDeGamme(place, -1), place.tonique - 1);
});

test('chaque lieu a une musique lente', () => {
  for (const nom of ['place', 'marche', 'moulin', 'gare', 'mine']) {
    const a = AMBIANCES[nom];
    assert.ok(a, nom);
    assert.ok(a.tempo >= 50 && a.tempo <= 80, `${nom} : tempo ${a.tempo}`);
    assert.ok(dureeMesure(a) > 3, `${nom} : une mesure dure plus de 3 secondes`);
  }
});

test('toutes les notes restent dans la gamme, dans leur tessiture, et dans la mesure', () => {
  for (const nom of Object.keys(AMBIANCES)) {
    const a = AMBIANCES[nom];
    const gamme = GAMMES[a.gamme];
    for (const mesure of composer(nom)) {
      for (const note of mesure) {
        const [min, max] = TESSITURES[note.voix];
        assert.ok(note.midi >= min && note.midi <= max, `${nom} ${note.voix} : ${note.midi}`);
        const rang = (((note.midi - a.tonique) % 12) + 12) % 12;
        assert.ok(gamme.includes(rang), `${nom} : la note ${note.midi} est hors de la gamme`);
        assert.ok(note.temps >= 0 && note.temps < TEMPS_PAR_MESURE);
        assert.ok(note.duree > 0 && note.temps + note.duree <= TEMPS_PAR_MESURE + 1e-9);
        assert.ok(note.force > 0 && note.force <= 1);
      }
    }
  }
});

test('chaque mesure a son accord tenu (3 notes) et sa basse', () => {
  for (const mesure of composer('place', 50)) {
    assert.equal(mesure.filter((n) => n.voix === 'nappe').length, 3);
    assert.equal(mesure.filter((n) => n.voix === 'basse').length, 2);
  }
});

test('la mélodie avance par petits pas : jamais de grand saut', () => {
  for (const nom of Object.keys(AMBIANCES)) {
    let precedente = null;
    for (const mesure of composer(nom)) {
      for (const note of mesure.filter((n) => n.voix === 'melodie')) {
        if (precedente !== null) assert.ok(Math.abs(note.midi - precedente) <= 7, `${nom} : saut de ${precedente} à ${note.midi}`);
        precedente = note.midi;
      }
    }
  }
});

test('la mélodie respire : des silences, et moins de notes en fin de phrase', () => {
  const mesures = composer('marche', 800);
  const compter = (filtre) => {
    const choisies = mesures.filter((_, n) => filtre(n));
    return choisies.reduce((s, m) => s + m.filter((n) => n.voix === 'melodie').length, 0) / choisies.length;
  };
  const milieu = compter((n) => n % 4 !== 3);
  const fin = compter((n) => n % 4 === 3);
  assert.ok(fin < milieu, `fin de phrase ${fin.toFixed(2)} contre ${milieu.toFixed(2)}`);
  assert.ok(milieu < 5, 'jamais une note sur chaque demi-temps');
  assert.ok(mesures.some((m) => m.every((n) => n.voix !== 'melodie')), 'certaines mesures sont sans mélodie');
});

test('avec la même graine, la musique est la même (et elle change avec une autre graine)', () => {
  assert.deepEqual(composer('moulin', 30, 5), composer('moulin', 30, 5));
  assert.notDeepEqual(composer('moulin', 30, 5), composer('moulin', 30, 6));
});

test('les petits sons sont courts et doux', () => {
  for (const [nom, notes] of Object.entries(SONS)) {
    assert.ok(notes.length >= 1, nom);
    for (const n of notes) {
      assert.ok(n.temps + n.duree <= 1.5, `${nom} : trop long`);
      assert.ok(n.midi >= 55 && n.midi <= 90, `${nom} : note ${n.midi}`);
      assert.ok(n.force > 0 && n.force <= 0.6, `${nom} : force ${n.force}`);
    }
  }
});

// -----------------------------------------------------------------------------
// L'installation du jeu (manifeste, service worker, icônes)
// -----------------------------------------------------------------------------
test('le numéro de version est le même partout', () => {
  const paquet = JSON.parse(lire('package.json'));
  assert.equal(paquet.version, VERSION_JEU);
  assert.match(lire('sw.js'), new RegExp(`const VERSION = '${VERSION_JEU.replace(/\./g, '\\.')}'`));
});

test('le service worker garde une copie de TOUS les fichiers du jeu', () => {
  const texte = lire('sw.js');
  const liste = texte.slice(texte.indexOf('const FICHIERS = ['), texte.indexOf('];'));
  const gardes = new Set([...liste.matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const attendus = [
    'index.html',
    'manifest.webmanifest',
    'css/style.css',
    ...readdirSync(join(racine, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
    ...readdirSync(join(racine, 'lib/three')).filter((f) => f.endsWith('.js')).map((f) => `lib/three/${f}`),
    ...readdirSync(join(racine, 'icones')).filter((f) => f.endsWith('.png')).map((f) => `icones/${f}`),
  ];
  for (const f of attendus) assert.ok(gardes.has(f), `${f} manque dans sw.js`);
  for (const f of gardes) {
    if (f !== './') assert.ok(existsSync(join(racine, f)), `${f} est dans sw.js mais n'existe pas`);
  }
});

test('le manifeste est valide et ses icônes existent', () => {
  const m = JSON.parse(lire('manifest.webmanifest'));
  assert.equal(m.start_url, './');
  assert.equal(m.lang, 'fr');
  assert.ok(m.icons.some((i) => i.sizes === '192x192'));
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(existsSync(join(racine, i.src)), i.src);
  const page = lire('index.html');
  assert.match(page, /<link rel="manifest" href="manifest\.webmanifest">/);
});
