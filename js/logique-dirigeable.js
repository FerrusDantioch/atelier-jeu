// =============================================================================
// logique-dirigeable.js — LE DIRIGEABLE (version 1.6), sans aucune 3D
// -----------------------------------------------------------------------------
// Le grand projet d'Anatole se construit en cinq étapes (cinq quêtes, voir
// logique-quetes.js). Une fois fini, le dirigeable « Le Cuivrebourg » emmène
// Ferrus d'un lieu à l'autre en survolant le village : on touche le bouton du
// dirigeable (ou la touche V), on choisit où aller, et le voyage commence.
// On ne peut pas l'appeler depuis un lieu couvert (l'atelier, la galerie).
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { queteTerminee } from './logique-quetes.js';

// Les cinq étapes du grand projet, dans l'ordre.
export const QUETES_DIRIGEABLE = Object.freeze(['dirigeable-nacelle', 'dirigeable-enveloppe', 'dirigeable-chaudiere', 'dirigeable-helice', 'dirigeable-envol']);

// Combien d'étapes sont finies (0 à 5) : le dirigeable se construit peu à peu, en 3D.
export function etapesDirigeable(etat) {
  return QUETES_DIRIGEABLE.filter((q) => queteTerminee(etat, q)).length;
}

export function dirigeablePret(etat) {
  return queteTerminee(etat, 'dirigeable-envol');
}

// Les lieux où le dirigeable peut se poser (et ce qu'il faut pour y aller).
export const DESTINATIONS = Object.freeze([
  { zone: 'place', nom: 'La place' },
  { zone: 'marche', nom: 'Le marché', ouvert: (etat) => etat.atelier.ouvert },
  { zone: 'moulin', nom: 'Le moulin', ouvert: (etat) => queteTerminee(etat, 'balance-capucine') },
  { zone: 'gare', nom: 'La gare', ouvert: (etat) => queteTerminee(etat, 'roue-moulin') },
  { zone: 'mine', nom: 'La mine de cuivre', ouvert: (etat) => queteTerminee(etat, 'train-cuivrebourg') },
  { zone: 'lac', nom: 'Le lac', ouvert: (etat) => etat.atelier.ouvert },
  { zone: 'foret', nom: 'La forêt', ouvert: (etat) => etat.atelier.ouvert },
]);

// Les lieux couverts, d'où l'on ne peut pas partir en dirigeable.
export const LIEUX_COUVERTS = Object.freeze(['interieur', 'galerie']);

// Où Ferrus descend de l'échelle de corde, dans chaque lieu (des endroits
// dégagés, vérifiés par les tests).
export const ATTERRISSAGES = Object.freeze({
  place: { x: 3.5, z: 5, orientation: 0 },
  marche: { x: 1.5, z: -1.5, orientation: 0 },
  moulin: { x: 3, z: 1.5, orientation: 0 },
  gare: { x: -3, z: 1.5, orientation: 0 },
  mine: { x: -2, z: 2.5, orientation: 0 },
  lac: { x: 4, z: -0.4, orientation: 0 },
  foret: { x: -3.5, z: -1.4, orientation: 0 },
});

// La petite carte du village vue du ciel (pour le voyage) : la position de
// chaque lieu, en mètres, sur la carte miniature.
export const CARTE_VOL = Object.freeze({
  place: { x: 0, z: 0 },
  marche: { x: 0, z: 9 },
  moulin: { x: 10, z: 9 },
  gare: { x: 20, z: 9 },
  lac: { x: -10, z: 9 },
  foret: { x: 11, z: 0 },
  mine: { x: 27, z: -7 },
});

// Les destinations possibles depuis un lieu.
export function destinationsPossibles(etat, depuis) {
  return DESTINATIONS.filter((d) => d.zone !== depuis && (!d.ouvert || d.ouvert(etat)));
}

// Le dialogue du voyage (null si le dirigeable n'est pas prêt).
export function dialogueVoyage(etat, depuis) {
  if (!dirigeablePret(etat)) return null;
  if (LIEUX_COUVERTS.includes(depuis)) {
    return { orateur: 'Le dirigeable', repliques: ["Le dirigeable ne peut pas venir vous chercher ici : sortez d'abord à l'air libre !"], choix: [{ texte: "D'accord", action: 'fermer' }] };
  }
  return {
    orateur: 'Le dirigeable',
    repliques: ['« Le Cuivrebourg » descend doucement et déroule son échelle de corde. Où voulez-vous aller ?'],
    choix: [
      ...destinationsPossibles(etat, depuis).map((d) => ({ texte: d.nom, action: `voyage:${d.zone}` })),
      { texte: 'Rester ici', action: 'fermer' },
    ],
  };
}

// La destination d'une action « voyage:lac » : { zone, x, z, orientation } ou null.
export function destinationDuChoix(etat, depuis, action) {
  const [prefixe, zone] = String(action).split(':');
  if (prefixe !== 'voyage' || !dirigeablePret(etat)) return null;
  if (!destinationsPossibles(etat, depuis).some((d) => d.zone === zone)) return null;
  return { zone, ...ATTERRISSAGES[zone] };
}

// La durée du vol (en secondes) : un peu plus longue pour aller loin.
export function dureeVol(depuis, vers) {
  const a = CARTE_VOL[depuis] || CARTE_VOL.place;
  const b = CARTE_VOL[vers] || CARTE_VOL.place;
  return Math.min(6.5, 3.5 + Math.hypot(b.x - a.x, b.z - a.z) * 0.09);
}

// La position du dirigeable pendant le vol (t de 0 à 1) : une courbe douce,
// qui monte, plane, puis redescend. { x, y, z, cap } (cap = la direction).
export function positionVol(depuis, vers, t) {
  const a = CARTE_VOL[depuis] || CARTE_VOL.place;
  const b = CARTE_VOL[vers] || CARTE_VOL.place;
  const u = Math.max(0, Math.min(1, t));
  const doux = u * u * (3 - 2 * u); // il accélère et ralentit en douceur
  return {
    x: a.x + (b.x - a.x) * doux,
    z: a.z + (b.z - a.z) * doux,
    y: 1.2 + Math.sin(u * Math.PI) * 3.2,
    cap: Math.atan2(b.x - a.x, b.z - a.z),
  };
}
