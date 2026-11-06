// =============================================================================
// logique-musique.js — LA COMPOSITION DE LA MUSIQUE (étape 4)
// -----------------------------------------------------------------------------
// Il n'y a aucun fichier de musique dans le jeu. La musique est COMPOSÉE par
// le code, mesure après mesure, avec un peu de hasard : elle ne se répète
// jamais tout à fait, et elle ne pèse rien à télécharger.
//
// Ce fichier décide seulement QUELLES notes jouer, et QUAND. C'est musique.js
// qui les fait sonner dans le navigateur. Ici, il n'y a ni son ni navigateur :
// tout peut donc être vérifié avec « node --test ».
//
// Pour le confort : pas de percussions, des notes longues et douces, une
// mélodie qui avance par petits pas (jamais de grands sauts vers l'aigu), un
// tempo lent, et des silences pour respirer.
// =============================================================================

// Les notes sont des numéros « MIDI » : 60 = le do du milieu du piano,
// 61 = do dièse, 62 = ré… (12 numéros = une octave).

// Les gammes, décrites par l'écart (en demi-tons) de chaque note avec la première.
export const GAMMES = {
  majeur: [0, 2, 4, 5, 7, 9, 11],
  dorien: [0, 2, 3, 5, 7, 9, 10],
};

// Une « ambiance » par lieu.
//   - tonique : la note de base (MIDI) ;
//   - progression : les accords, mesure après mesure (numéros de note dans la
//     gamme : 0 = accord sur la 1re note, 3 = sur la 4e…) ;
//   - densite : la probabilité qu'une note de mélodie tombe sur un temps.
export const AMBIANCES = {
  place: {
    nom: 'La place',
    tempo: 66,
    tonique: 53, // fa
    gamme: 'majeur',
    progression: [0, 5, 3, 4, 0, 3, 1, 4],
    densite: 0.42,
  },
  marche: {
    nom: 'Le marché',
    tempo: 74,
    tonique: 55, // sol
    gamme: 'majeur',
    progression: [0, 3, 5, 4, 0, 1, 3, 4],
    densite: 0.5,
  },
  moulin: {
    nom: 'Le moulin',
    tempo: 60,
    tonique: 50, // ré
    gamme: 'dorien',
    progression: [0, 3, 0, 6, 0, 3, 4, 6],
    densite: 0.34,
  },
  // Version 1.2 : la gare, un peu plus allante (comme un train qui roule tranquillement).
  gare: {
    nom: 'La gare',
    tempo: 70,
    tonique: 52, // mi
    gamme: 'majeur',
    progression: [0, 4, 5, 3, 0, 4, 1, 4],
    densite: 0.46,
  },
  // Version 1.3 : la mine, grave et paisible (l'écho des collines).
  mine: {
    nom: 'La mine de cuivre',
    tempo: 58,
    tonique: 52, // mi (en mode dorien : plus grave et rêveur que la gare)
    gamme: 'dorien',
    progression: [0, 6, 3, 0, 4, 3, 6, 0],
    densite: 0.3,
  },
};

export const TEMPS_PAR_MESURE = 4;

// Les limites de hauteur de chaque voix (numéros MIDI).
export const TESSITURES = {
  basse: [36, 60],
  nappe: [55, 80],
  melodie: [60, 84],
};

// Un petit générateur de hasard « reproductible » : avec la même graine, il
// donne toujours la même suite de nombres (entre 0 et 1). Utile pour les tests.
export function creerHasard(graine = 1) {
  let a = graine >>> 0;
  return function hasard() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// La hauteur MIDI de la note numéro « degre » de la gamme (0 = la tonique ;
// 7 = la tonique une octave plus haut ; -1 = la note juste en dessous…).
export function noteDeGamme(ambiance, degre) {
  const gamme = GAMMES[ambiance.gamme];
  const octave = Math.floor(degre / gamme.length);
  const rang = degre - octave * gamme.length;
  return ambiance.tonique + octave * 12 + gamme[rang];
}

// La fréquence (en hertz) d'une note MIDI : le la 69 vaut 440 Hz.
export function frequence(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// La durée d'une mesure, en secondes.
export function dureeMesure(ambiance) {
  return (TEMPS_PAR_MESURE * 60) / ambiance.tempo;
}

// Le « souvenir » de la mélodie d'une mesure à l'autre (où elle en est).
export function creerEtatMelodie() {
  return { degre: 4 };
}

// Les temps où la mélodie peut jouer, et leur chance d'être joués (les temps
// forts plus souvent que les contretemps).
const POSITIONS_MELODIE = [
  { temps: 0, poids: 1.3 },
  { temps: 1, poids: 0.8 },
  { temps: 1.5, poids: 0.45 },
  { temps: 2, poids: 1.1 },
  { temps: 3, poids: 0.8 },
  { temps: 3.5, poids: 0.4 },
];

// Les écarts possibles entre deux notes de la mélodie (en notes de la gamme),
// avec leur poids : on reste souvent sur place ou on fait un petit pas.
const PAS_MELODIE = [
  { pas: -2, poids: 1 },
  { pas: -1, poids: 3 },
  { pas: 0, poids: 1.2 },
  { pas: 1, poids: 3 },
  { pas: 2, poids: 1 },
];

function tirerPas(hasard) {
  const total = PAS_MELODIE.reduce((s, p) => s + p.poids, 0);
  let r = hasard() * total;
  for (const p of PAS_MELODIE) {
    r -= p.poids;
    if (r < 0) return p.pas;
  }
  return 0;
}

// Les degrés de la mélodie restent entre ces deux bornes (environ une octave
// et demie, dans le médium : rien de perçant).
const DEGRE_MIN = 0;
const DEGRE_MAX = 9;

// Compose la mesure numéro « numero » d'une ambiance. Renvoie une liste de
// notes : { voix, temps, duree, midi, force }.
//   - voix : 'nappe' (l'accord tenu), 'basse' ou 'melodie' ;
//   - temps : le moment où la note commence, en temps depuis le début de la
//     mesure (de 0 à 4) ; duree : en temps ;
//   - force : de 0 à 1 (le volume relatif de la note).
export function composerMesure(ambiance, numero, hasard, etatMelodie) {
  const notes = [];
  const racine = ambiance.progression[numero % ambiance.progression.length];

  // 1. La nappe : l'accord (3 notes) tenu pendant toute la mesure.
  for (const ecart of [0, 2, 4]) {
    let midi = noteDeGamme(ambiance, racine + ecart) + 12;
    if (midi > 76) midi -= 12; // une note trop aiguë redescend d'une octave
    notes.push({ voix: 'nappe', temps: 0, duree: TEMPS_PAR_MESURE, midi, force: 0.5 });
  }

  // 2. La basse : la note de l'accord au premier temps, puis sa quinte.
  const fondamentale = noteDeGamme(ambiance, racine);
  // On la garde bien grave : une note trop haute descend d'une octave.
  const decalage = fondamentale > ambiance.tonique + 7 ? -24 : -12;
  notes.push({ voix: 'basse', temps: 0, duree: 2, midi: fondamentale + decalage, force: 0.75 });
  // La quinte, prise dans la gamme (5e note à partir de la racine).
  notes.push({ voix: 'basse', temps: 2, duree: 2, midi: noteDeGamme(ambiance, racine + 4) + decalage, force: 0.5 });

  // 3. La mélodie : quelques notes, par petits pas. Toutes les 4 mesures, elle
  //    se fait plus rare (comme une respiration à la fin d'une phrase).
  const finDePhrase = numero % 4 === 3;
  const densite = ambiance.densite * (finDePhrase ? 0.45 : 1);
  const accord = [racine, racine + 2, racine + 4];
  const choisis = POSITIONS_MELODIE.filter((p) => hasard() < densite * p.poids);
  choisis.forEach((p, i) => {
    let degre = etatMelodie.degre + tirerPas(hasard);
    // Sur un temps fort, on se pose sur une note de l'accord (c'est plus doux).
    if (Number.isInteger(p.temps) && p.temps % 2 === 0) degre = noteDeLAccordLaPlusProche(degre, accord);
    degre = Math.max(DEGRE_MIN, Math.min(DEGRE_MAX, degre));
    etatMelodie.degre = degre;
    const suivant = choisis[i + 1] ? choisis[i + 1].temps : TEMPS_PAR_MESURE;
    notes.push({
      voix: 'melodie',
      temps: p.temps,
      duree: Math.min(1.5, suivant - p.temps),
      midi: noteDeGamme(ambiance, degre) + 12,
      force: 0.45 + hasard() * 0.2,
    });
  });
  return notes;
}

// La note de l'accord (à n'importe quelle octave) la plus proche d'un degré.
function noteDeLAccordLaPlusProche(degre, accord) {
  let meilleur = degre;
  let ecartMin = Infinity;
  for (const note of accord) {
    for (const octave of [-14, -7, 0, 7, 14]) {
      const candidat = note + octave;
      const ecart = Math.abs(candidat - degre);
      if (ecart < ecartMin) {
        ecartMin = ecart;
        meilleur = candidat;
      }
    }
  }
  return meilleur;
}

// -----------------------------------------------------------------------------
// Les petits sons (coupés au départ, comme la musique)
// -----------------------------------------------------------------------------
// Chaque son est une ou quelques notes de clochette très douces.
// « temps » et « duree » sont ici en secondes.
export const SONS = {
  // Un objet ramassé : deux notes qui montent.
  ramasser: [
    { temps: 0, duree: 0.5, midi: 76, force: 0.5 },
    { temps: 0.11, duree: 0.7, midi: 81, force: 0.45 },
  ],
  // Des pièces gagnées : trois petites notes.
  pieces: [
    { temps: 0, duree: 0.5, midi: 79, force: 0.45 },
    { temps: 0.09, duree: 0.5, midi: 83, force: 0.4 },
    { temps: 0.18, duree: 0.8, midi: 86, force: 0.35 },
  ],
  // Une fabrication terminée : un accord grave et rond.
  fabrication: [
    { temps: 0, duree: 1, midi: 60, force: 0.45 },
    { temps: 0.04, duree: 1, midi: 67, force: 0.35 },
  ],
  // Un client arrive : une seule note, très discrète.
  client: [{ temps: 0, duree: 0.8, midi: 72, force: 0.3 }],
  // Une boîte à musique vendue (version 1.3) : sa petite ritournelle.
  boiteMusique: [
    { temps: 0, duree: 0.4, midi: 84, force: 0.3 },
    { temps: 0.22, duree: 0.4, midi: 79, force: 0.28 },
    { temps: 0.44, duree: 0.4, midi: 81, force: 0.28 },
    { temps: 0.66, duree: 0.7, midi: 76, force: 0.26 },
  ],
  // Le train part (version 1.2) : un « tchou » tout doux, deux notes qui descendent.
  sifflet: [
    { temps: 0, duree: 0.45, midi: 81, force: 0.28 },
    { temps: 0.32, duree: 0.8, midi: 77, force: 0.24 },
  ],
};
