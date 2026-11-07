// =============================================================================
// logique-potager.js — LE POTAGER (version 1.5), sans aucune 3D
// -----------------------------------------------------------------------------
// Sur la place, à gauche de l'atelier, un petit jardin entouré d'une barrière.
// On y sème des fleurs, qui poussent tout doucement ; une fois fleuries, on
// les cueille pour faire des BOUQUETS, qui se vendent au comptoir.
//
//   - on sème au printemps ou en été (les graines ne coûtent rien) ;
//   - les fleurs mettent un jour et demi du jeu à pousser (12 minutes) ;
//     quand il pleut, elles poussent une fois et demie plus vite ;
//   - en hiver, elles ne poussent pas (mais elles ne meurent pas : elles
//     attendent le printemps) ;
//   - la récolte donne 4 bouquets (s'il y a de la place dans le stock).
//
// Si l'option « Saisons » est coupée, c'est toujours l'été : on peut semer
// quand on veut. Ce fichier ne contient aucune 3D : il est testé.
// =============================================================================

import { capaciteStock } from './logique-atelier.js';
import { DUREE_JOURNEE } from './logique-temps.js';

export const DUREE_POUSSE = 1.5 * DUREE_JOURNEE; // en secondes
export const BOUQUETS_PAR_RECOLTE = 4;
export const SAISONS_SEMIS = Object.freeze(['printemps', 'ete']);

export function creerEtatPotager() {
  return { pousse: -1, recoltes: 0 }; // pousse : -1 = rien de semé, puis de 0 à 1
}

export const potagerSeme = (etat) => etat.potager.pousse >= 0;
export const potagerPret = (etat) => etat.potager.pousse >= 1;

// Le temps passe : les fleurs poussent (pas en hiver ; plus vite sous la pluie).
export function avancerPotager(etat, dt, saisonId, pluie = 0) {
  const p = etat.potager;
  if (p.pousse < 0 || p.pousse >= 1 || saisonId === 'hiver' || dt <= 0) return;
  const vitesse = pluie >= 0.5 ? 1.5 : 1;
  p.pousse = Math.min(1, p.pousse + (dt * vitesse) / DUREE_POUSSE);
}

// Utiliser le potager : semer, regarder, ou récolter. Renvoie les messages.
export function utiliserPotager(etat, saisonId) {
  const p = etat.potager;
  if (!etat.atelier.ouvert) return ["Un petit potager en friche. Il servira quand l'atelier sera ouvert."];
  if (p.pousse < 0) {
    if (!SAISONS_SEMIS.includes(saisonId)) {
      return [saisonId === 'hiver'
        ? 'La terre est gelée. On sème au printemps ou en été.'
        : "C'est l'automne : trop tard pour semer. On sème au printemps ou en été."];
    }
    p.pousse = 0;
    return ['Vous semez des graines de fleurs. Elles fleuriront dans un jour et demi (plus vite s\'il pleut).'];
  }
  if (p.pousse < 1) {
    const pourcent = Math.floor(p.pousse * 100);
    if (saisonId === 'hiver') return [`Les fleurs dorment sous la neige (${pourcent} %). Elles repartiront au printemps.`];
    return [`Les fleurs poussent tranquillement : ${pourcent} %.`];
  }
  const place = capaciteStock(etat) - etat.atelier.stock.bouquet;
  if (place <= 0) return ["Plus de place pour les bouquets : vendez-en d'abord au comptoir."];
  const n = Math.min(BOUQUETS_PAR_RECOLTE, place);
  etat.atelier.stock.bouquet += n;
  p.pousse = -1;
  p.recoltes += 1;
  return [`+${n} bouquets de fleurs (ils se vendent au comptoir)`];
}

// Le petit texte d'aide près du potager.
export function libellePotager(etat, saisonId) {
  const p = etat.potager;
  if (p.pousse < 0) return SAISONS_SEMIS.includes(saisonId) ? 'Semer des fleurs' : 'Le potager';
  if (p.pousse < 1) return 'Regarder les fleurs';
  return 'Cueillir les bouquets';
}
