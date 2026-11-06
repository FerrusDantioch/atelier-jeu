// =============================================================================
// logique-saisons.js — LES SAISONS (version 1.4), sans aucune 3D
// -----------------------------------------------------------------------------
// Cuivrebourg passe par quatre saisons. Chacune dure 2 jours du jeu (environ
// 16 minutes) : une année entière dure donc 8 jours (un peu plus d'une heure).
//
//   printemps → été → automne → hiver → printemps…
//
// Une nouvelle partie commence au printemps. Pour chaque saison, on donne la
// couleur de l'herbe, des feuillages et des haies, et ce qui flotte dans l'air
// (des pétales, des feuilles mortes ou des flocons de neige).
//
// Comme pour le jour et la nuit, tout change TRÈS doucement : le passage d'une
// saison à la suivante prend un quart de journée de chaque côté (environ
// 4 minutes en tout). Rien ne saute, rien ne clignote.
//
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { versRvb } from './logique-temps.js';

// La durée d'une saison, en jours du jeu.
export const DUREE_SAISON = 2;
// Le passage d'une saison à l'autre dure 2 × TRANSITION jours.
export const TRANSITION_SAISON = 0.25;

// Les quatre saisons, dans l'ordre.
//   couleurs : l'herbe, les deux feuillages des arbres, les haies et leurs buissons ;
//   fleurs   : les petites fleurs dans l'herbe (0 = aucune, 1 = toutes) ;
//   petales, feuilles, flocons : ce qui tombe doucement du ciel.
// L'été garde exactement les couleurs des versions précédentes.
export const SAISONS = Object.freeze([
  {
    id: 'printemps',
    nom: 'Printemps',
    message: 'Le printemps arrive à Cuivrebourg : les fleurs s\'ouvrent.',
    couleurs: { herbe: '#a8b97c', feuillage: '#86a862', feuillageClair: '#a4c27a', haie: '#7e9c5f', buisson: '#8cab69' },
    fleurs: 1, petales: 1, feuilles: 0, flocons: 0,
  },
  {
    id: 'ete',
    nom: 'Été',
    message: "C'est l'été à Cuivrebourg. Il fait bon flâner.",
    couleurs: { herbe: '#a7b47c', feuillage: '#83a25e', feuillageClair: '#98b46d', haie: '#7d995e', buisson: '#88a567' },
    fleurs: 0, petales: 0, feuilles: 0, flocons: 0,
  },
  {
    id: 'automne',
    nom: 'Automne',
    message: "L'automne arrive : les arbres se colorent de roux.",
    couleurs: { herbe: '#b0aa76', feuillage: '#bf8a52', feuillageClair: '#d2a35e', haie: '#8e8c5a', buisson: '#a98a55' },
    fleurs: 0, petales: 0, feuilles: 1, flocons: 0,
  },
  {
    id: 'hiver',
    nom: 'Hiver',
    message: "L'hiver arrive : il neige tout doucement sur Cuivrebourg.",
    couleurs: { herbe: '#dde4e6', feuillage: '#8c9a88', feuillageClair: '#e2e8ea', haie: '#8b9a8a', buisson: '#dce3e5' },
    fleurs: 0, petales: 0, feuilles: 0, flocons: 1,
  },
]);

// La saison quand l'option « Saisons » est coupée : toujours l'été.
export const SAISON_FIXE = 1;

// Le « temps du calendrier » : le nombre de jours passés depuis le début de la
// partie (avec la fraction du jour en cours). Le jour 1 à 8 h donne 0,33.
export function tempsCalendrier(jour, journee) {
  const j = Number.isFinite(jour) && jour >= 1 ? Math.floor(jour) : 1;
  const f = Number.isFinite(journee) ? journee - Math.floor(journee) : 0;
  return j - 1 + f;
}

// Le numéro de la saison (0 à 3) pour un temps du calendrier.
const numeroSaison = (t) => ((Math.floor(t / DUREE_SAISON) % 4) + 4) % 4;

// La saison du moment : { id, nom, index, suivante, melange }.
//   - id, nom, index : la saison « officielle » (celle qu'affiche le calendrier) ;
//   - de, vers, melange : pendant un passage, on mélange la saison « de » et la
//     saison « vers » (melange va de 0 à 1). Hors passage, de = vers.
export function saisonDuMoment(jour, journee, actif = true) {
  if (!actif) {
    const s = SAISONS[SAISON_FIXE];
    return { id: s.id, nom: s.nom, index: SAISON_FIXE, de: SAISON_FIXE, vers: SAISON_FIXE, melange: 0 };
  }
  const t = tempsCalendrier(jour, journee);
  const index = numeroSaison(t);
  // Le changement de saison le plus proche, et l'écart avec lui.
  const changement = Math.round(t / DUREE_SAISON) * DUREE_SAISON;
  const ecart = t - changement;
  let de = index;
  let vers = index;
  let melange = 0;
  if (Math.abs(ecart) < TRANSITION_SAISON) {
    vers = numeroSaison(changement + 0.001);
    de = (vers + 3) % 4;
    const brut = (ecart + TRANSITION_SAISON) / (2 * TRANSITION_SAISON);
    melange = brut * brut * (3 - 2 * brut); // une courbe douce
  }
  return { id: SAISONS[index].id, nom: SAISONS[index].nom, index, de, vers, melange };
}

// Tout ce que la 3D doit savoir pour dessiner la saison du moment.
// Les couleurs sont rendues en trois nombres [rouge, vert, bleu] entre 0 et 1.
export function ambianceSaison(jour, journee, actif = true) {
  const s = saisonDuMoment(jour, journee, actif);
  const a = SAISONS[s.de];
  const b = SAISONS[s.vers];
  const t = s.melange;
  const melanger = (x, y) => x + (y - x) * t;
  const couleurs = {};
  for (const cle of Object.keys(a.couleurs)) {
    const ca = versRvb(a.couleurs[cle]);
    const cb = versRvb(b.couleurs[cle]);
    couleurs[cle] = [0, 1, 2].map((i) => melanger(ca[i], cb[i]));
  }
  return {
    id: s.id,
    couleurs,
    fleurs: melanger(a.fleurs, b.fleurs),
    petales: melanger(a.petales, b.petales),
    feuilles: melanger(a.feuilles, b.feuilles),
    flocons: melanger(a.flocons, b.flocons),
  };
}

// Le petit calendrier affiché en haut de l'écran : « Printemps · jour 3 ».
export function texteCalendrier(etat, actif = true) {
  const jour = Number.isFinite(etat.jour) && etat.jour >= 1 ? Math.floor(etat.jour) : 1;
  if (!actif) return `Jour ${jour}`;
  return `${saisonDuMoment(jour, etat.journee).nom} · jour ${jour}`;
}

// Le message à afficher quand on passe d'une saison à une autre (ou null).
export function messageSaison(idAvant, idApres) {
  if (!idAvant || idAvant === idApres) return null;
  const s = SAISONS.find((x) => x.id === idApres);
  return s ? s.message : null;
}
