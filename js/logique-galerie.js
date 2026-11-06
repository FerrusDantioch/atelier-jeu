// =============================================================================
// logique-galerie.js — LA GALERIE DE LA MINE (version 1.4), sans aucune 3D
// -----------------------------------------------------------------------------
// Une fois le wagonnet de Sidonie réparé, on peut descendre dans la mine.
// Dans la galerie, éclairée par des lanternes, des FILONS de cuivre affleurent
// dans la roche : on y détache soi-même des plaques de cuivre, gratuitement.
//
//   - chaque filon donne 1 plaque de cuivre ;
//   - ensuite il est vide, et de nouveaux cristaux se forment peu à peu :
//     il est de nouveau prêt au bout de 90 secondes ;
//   - il faut de la place dans le stock de l'atelier (le cuivre y est rangé
//     directement : les mineurs le descendent par le wagonnet).
//
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { capaciteStock } from './logique-atelier.js';
import { queteTerminee } from './logique-quetes.js';
import { versRvb } from './logique-temps.js';

// Le temps (en secondes de jeu) pour qu'un filon se reforme.
export const DUREE_REPOUSSE = 90;

// Les filons, dans la roche de la galerie (x, z = l'endroit où se tenir).
// Trois dans la paroi du nord, un dans la paroi de l'est.
export const FILONS = Object.freeze([
  { id: 'filon-1', x: -7, z: -7.3, paroi: 'nord' },
  { id: 'filon-2', x: -1, z: -7.3, paroi: 'nord' },
  { id: 'filon-3', x: 5.5, z: -7.3, paroi: 'nord' },
  { id: 'filon-4', x: 11.2, z: 1.8, paroi: 'est' },
]);

// L'état de la galerie : pour chaque filon, le temps qu'il lui faut encore
// pour se reformer (0 = il est prêt).
export function creerEtatGalerie() {
  const filons = {};
  for (const f of FILONS) filons[f.id] = 0;
  return { filons, recoltes: 0 };
}

// Peut-on descendre dans la galerie ? (après la quête du wagonnet)
export function galerieOuverte(etat) {
  return queteTerminee(etat, 'wagonnet-mine');
}

export function estFilon(id) {
  return FILONS.some((f) => f.id === id);
}

export function filonPret(etat, id) {
  return (etat.galerie.filons[id] || 0) <= 0;
}

// Où en est un filon qui se reforme : de 0 (il vient d'être vidé) à 1 (prêt).
export function progressionFilon(etat, id) {
  const reste = Math.max(0, etat.galerie.filons[id] || 0);
  return 1 - Math.min(1, reste / DUREE_REPOUSSE);
}

// Détacher du cuivre d'un filon. Renvoie les messages à afficher.
export function recolterFilon(etat, id) {
  if (!estFilon(id)) return [];
  if (!filonPret(etat, id)) return ['Ce filon est vide pour l\'instant. De nouveaux cristaux se forment : revenez dans un moment.'];
  if (etat.atelier.stock.cuivre >= capaciteStock(etat)) return ["Plus de place pour le cuivre à l'atelier (les étagères en donnent plus)."];
  etat.atelier.stock.cuivre += 1;
  etat.galerie.filons[id] = DUREE_REPOUSSE;
  etat.galerie.recoltes += 1;
  return [`+1 plaque de cuivre (cuivre : ${etat.atelier.stock.cuivre}/${capaciteStock(etat)})`];
}

// Le temps passe : les filons se reforment (même quand Ferrus est ailleurs).
export function avancerGalerie(etat, dt) {
  if (dt <= 0) return;
  for (const id of Object.keys(etat.galerie.filons)) {
    etat.galerie.filons[id] = Math.max(0, etat.galerie.filons[id] - dt);
  }
}

// Le petit texte d'aide près d'un filon.
export function libelleFilon(etat, id) {
  return filonPret(etat, id) ? 'Détacher du cuivre' : 'Le filon se reforme…';
}

// La lumière sous terre : toujours la même, chaude et tamisée, quelle que soit
// l'heure dehors. « nuit » est à 0,85 : les lanternes brillent.
export const LUMIERE_GALERIE = Object.freeze({
  ciel: versRvb('#2c241f'),
  hautCiel: versRvb('#f0d2a6'),
  basSol: versRvb('#5e4a3c'),
  forceCiel: 1.35,
  soleil: versRvb('#ffcf96'),
  forceSoleil: 0.75,
  nuit: 0.85,
});
