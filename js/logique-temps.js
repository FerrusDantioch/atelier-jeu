// =============================================================================
// logique-temps.js — LE JOUR ET LA NUIT, et l'horaire du train (version 1.2)
// (version 1.4 : on compte aussi les jours qui passent)
// -----------------------------------------------------------------------------
// Une journée entière de Cuivrebourg dure 8 minutes. On la mesure par un
// nombre « journee » qui va de 0 à 1 :
//     0    = minuit        0,25 = 6 h du matin
//     0,5  = midi          0,75 = 18 h
//
// Pour chaque moment, on calcule la couleur du ciel, de la brume et des
// lumières. Tout change TRÈS lentement (rien ne clignote, rien ne saute), et
// la nuit reste claire : on voit toujours bien où l'on marche.
// Les ombres ne bougent pas (le soleil garde sa place) : seules les couleurs
// et la force de la lumière changent.
//
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

// La durée d'une journée complète, en secondes réelles.
export const DUREE_JOURNEE = 480;
// Une nouvelle partie commence le matin, vers 8 heures.
export const DEBUT_JOURNEE = 1 / 3;
// Quand le cycle jour/nuit est coupé (dans les options), il fait toujours jour.
export const MOMENT_JOUR_FIXE = 0.6;

// Les grands moments de la journée. Entre deux moments, les couleurs se
// mélangent peu à peu.
//   ciel : le fond et la brume ;
//   hautCiel, basSol : la lumière douce qui vient du ciel et du sol ;
//   soleil : la lumière qui fait les ombres (le soleil, ou la lune la nuit) ;
//   nuit : 0 en plein jour, 1 en pleine nuit (les lanternes et les fenêtres
//          s'allument avec ce nombre).
export const MOMENTS = Object.freeze([
  { a: 0.0, ciel: '#4a5672', hautCiel: '#a9b6d6', basSol: '#4f4a5a', forceCiel: 1.1, soleil: '#c3cdea', forceSoleil: 0.5, nuit: 1 },
  { a: 0.17, ciel: '#4a5672', hautCiel: '#a9b6d6', basSol: '#4f4a5a', forceCiel: 1.1, soleil: '#c3cdea', forceSoleil: 0.5, nuit: 1 },
  { a: 0.23, ciel: '#d9b7a3', hautCiel: '#ffd8c2', basSol: '#7d6a5c', forceCiel: 1.5, soleil: '#ffc8a2', forceSoleil: 1.05, nuit: 0.35 },
  { a: 0.3, ciel: '#e9dcc3', hautCiel: '#fff1d8', basSol: '#8a7558', forceCiel: 1.75, soleil: '#ffe0b8', forceSoleil: 1.5, nuit: 0 },
  { a: 0.7, ciel: '#e9dcc3', hautCiel: '#fff1d8', basSol: '#8a7558', forceCiel: 1.75, soleil: '#ffe0b8', forceSoleil: 1.5, nuit: 0 },
  { a: 0.77, ciel: '#e8bf98', hautCiel: '#ffd7ae', basSol: '#856a52', forceCiel: 1.6, soleil: '#ffbe8e', forceSoleil: 1.2, nuit: 0.3 },
  { a: 0.84, ciel: '#7b7590', hautCiel: '#cdbfd9', basSol: '#5e5560', forceCiel: 1.35, soleil: '#cdb6d2', forceSoleil: 0.75, nuit: 0.8 },
  { a: 0.9, ciel: '#4a5672', hautCiel: '#a9b6d6', basSol: '#4f4a5a', forceCiel: 1.1, soleil: '#c3cdea', forceSoleil: 0.5, nuit: 1 },
  { a: 1.0, ciel: '#4a5672', hautCiel: '#a9b6d6', basSol: '#4f4a5a', forceCiel: 1.1, soleil: '#c3cdea', forceSoleil: 0.5, nuit: 1 },
]);

// Les petits messages quand le jour se lève ou que le soir tombe.
const PASSAGES = [
  { a: 0.21, message: 'Le jour se lève sur Cuivrebourg.' },
  { a: 0.79, message: 'Le soir tombe sur Cuivrebourg. Les lanternes s\'allument.' },
];

// --- Petits outils de couleur -----------------------------------------------------
// Une couleur « #rrggbb » devient trois nombres entre 0 et 1, et inversement.
export function versRvb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const melanger = (a, b, t) => a + (b - a) * t;
const melangerCouleurs = (a, b, t) => {
  const ca = versRvb(a);
  const cb = versRvb(b);
  return [0, 1, 2].map((i) => melanger(ca[i], cb[i], t));
};

// Ramène n'importe quel nombre entre 0 (inclus) et 1 (exclu).
export function bouclerJournee(f) {
  const r = f - Math.floor(f);
  return Number.isFinite(r) ? r : DEBUT_JOURNEE;
}

// -----------------------------------------------------------------------------
// La lumière d'un moment de la journée.
// Les couleurs sont rendues en trois nombres [rouge, vert, bleu] entre 0 et 1.
// -----------------------------------------------------------------------------
export function lumiereDuMoment(journee) {
  const f = bouclerJournee(journee);
  let i = 0;
  while (i < MOMENTS.length - 2 && MOMENTS[i + 1].a <= f) i++;
  const a = MOMENTS[i];
  const b = MOMENTS[i + 1];
  // Le mélange suit une courbe douce (pas de changement brusque aux moments clés).
  const brut = b.a > a.a ? (f - a.a) / (b.a - a.a) : 0;
  const t = brut * brut * (3 - 2 * brut);
  return {
    ciel: melangerCouleurs(a.ciel, b.ciel, t),
    hautCiel: melangerCouleurs(a.hautCiel, b.hautCiel, t),
    basSol: melangerCouleurs(a.basSol, b.basSol, t),
    forceCiel: melanger(a.forceCiel, b.forceCiel, t),
    soleil: melangerCouleurs(a.soleil, b.soleil, t),
    forceSoleil: melanger(a.forceSoleil, b.forceSoleil, t),
    nuit: melanger(a.nuit, b.nuit, t),
  };
}

// Version 1.7 : le soleil se déplace dans le ciel. Renvoie la direction d'où
// vient la lumière (un vecteur de longueur 1), pour un moment de la journée
// (de 0 à 1 : 0 = minuit, 0,5 = midi).
//   - le matin, le soleil est à l'est (x positif) : les ombres partent vers l'ouest ;
//   - à midi, il est au plus haut ;
//   - le soir, il est à l'ouest ; la nuit, la lune prend le relais, en douceur
//     (il n'y a jamais de saut : les ombres tournent très lentement).
// La lumière vient toujours un peu du sud (du côté de la caméra) et reste
// assez haute : les ombres ne s'allongent jamais au point de tout recouvrir.
export function directionSoleil(journee) {
  const angle = (bouclerJournee(journee) - 0.5) * Math.PI * 2;
  const x = -Math.sin(angle) * 13;
  const y = 20 + Math.cos(angle * 2) * 4;
  const z = 12;
  const longueur = Math.hypot(x, y, z);
  return { x: x / longueur, y: y / longueur, z: z / longueur };
}

// Fait avancer la journée de « dt » secondes. Renvoie les messages à afficher
// (seulement si le cycle jour/nuit est activé dans les options).
// Version 1.4 : à chaque minuit, on passe au jour suivant (« etat.jour » :
// 1 le premier jour de la partie, puis 2, 3…). Les saisons et les commandes
// spéciales comptent les jours avec ce nombre.
export function avancerJournee(etat, dt, cycleActif = true) {
  const avant = bouclerJournee(etat.journee);
  const total = avant + Math.max(0, dt) / DUREE_JOURNEE;
  const apres = bouclerJournee(total);
  etat.journee = apres;
  const jour = Number.isFinite(etat.jour) && etat.jour >= 1 ? Math.floor(etat.jour) : 1;
  etat.jour = jour + Math.floor(total);
  if (!cycleActif) return [];
  const messages = [];
  for (const p of PASSAGES) {
    // On a franchi ce moment pendant ce petit pas de temps ? (minuit compris)
    const franchi = apres >= avant ? avant < p.a && apres >= p.a : avant < p.a || apres >= p.a;
    if (franchi) messages.push(p.message);
  }
  return messages;
}

// L'heure qu'il est, en toutes lettres : « 8 h 05 ».
export function heureAffichee(journee) {
  // (le petit « + 1e-6 » évite qu'un calcul à virgule donne 12 h 04 au lieu de 12 h 05)
  const minutes = Math.floor(bouclerJournee(journee) * 24 * 60 + 1e-6) % (24 * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

// Les angles des aiguilles d'une horloge (en radians, dans le sens des
// aiguilles d'une montre, 0 = midi pile en haut).
export function anglesAiguilles(journee) {
  const heures = bouclerJournee(journee) * 24;
  return {
    heures: ((heures % 12) / 12) * Math.PI * 2,
    minutes: ((heures % 1)) * Math.PI * 2,
  };
}

// -----------------------------------------------------------------------------
// L'HORAIRE DU TRAIN (une fois la locomotive réparée)
// -----------------------------------------------------------------------------
// Le train fait un tour toutes les 100 secondes :
//   - 0 à 45 s : il attend à quai, en fumant doucement ;
//   - 45 à 60 s : il démarre lentement et part vers l'est ;
//   - 60 à 80 s : il est parti (on ne le voit plus) ;
//   - 80 à 95 s : il revient de l'ouest et ralentit en douceur ;
//   - 95 à 100 s : il est de nouveau à quai.
export const CYCLE_TRAIN = 100;
export const DISTANCE_TRAIN = 45; // jusqu'où il s'éloigne (en mètres)

// Renvoie { decalage, vitesse, visible } : « decalage » = la distance au quai
// (positive vers l'est), « vitesse » en mètres par seconde.
export function etatTrain(temps) {
  const t = ((temps % CYCLE_TRAIN) + CYCLE_TRAIN) % CYCLE_TRAIN;
  const D = DISTANCE_TRAIN;
  if (t < 45 || t >= 95) return { decalage: 0, vitesse: 0, visible: true };
  if (t < 60) {
    const s = (t - 45) / 15; // il accélère doucement
    return { decalage: D * s * s, vitesse: (2 * D * s) / 15, visible: true };
  }
  if (t < 80) return { decalage: D, vitesse: 0, visible: false };
  const s = (t - 80) / 15; // il ralentit doucement jusqu'au quai
  return { decalage: -D * (1 - s) * (1 - s), vitesse: (2 * D * (1 - s)) / 15, visible: true };
}
