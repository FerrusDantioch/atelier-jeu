// =============================================================================
// stockage.js — ce que le jeu range dans le navigateur (le « localStorage »)
// -----------------------------------------------------------------------------
// La partie en cours et les réglages. (Ce fichier a été sorti de main.js dans
// la version 1.7, pour l'alléger.)
// =============================================================================

import { CLE_SAUVEGARDE, chargerPartie } from './logique-sauvegarde.js';
import { CLE_REGLAGES, lireReglages, ecrireReglages } from './logique-reglages.js';

// -----------------------------------------------------------------------------
// La sauvegarde dans le navigateur (le « localStorage »).
// Tout est protégé par try/catch : en navigation privée, par exemple, le
// navigateur peut refuser. Le jeu marche alors quand même, sans sauvegarde.
// -----------------------------------------------------------------------------
export function lireSauvegarde() {
  try {
    const texte = window.localStorage.getItem(CLE_SAUVEGARDE);
    return texte ? chargerPartie(texte) : null;
  } catch {
    return null;
  }
}
export function ecrireSauvegarde(texte) {
  try {
    window.localStorage.setItem(CLE_SAUVEGARDE, texte);
  } catch {
    // Pas de place ou stockage interdit : tant pis, on continue sans sauvegarder.
  }
}
export function effacerSauvegarde() {
  try {
    window.localStorage.removeItem(CLE_SAUVEGARDE);
  } catch {
    // Rien à faire.
  }
}

// Les réglages (musique, sons, qualité) sont rangés à part de la partie.
export function lireReglagesNavigateur() {
  try {
    return lireReglages(window.localStorage.getItem(CLE_REGLAGES));
  } catch {
    return lireReglages(null);
  }
}
export function ecrireReglagesNavigateur(reglages) {
  try {
    window.localStorage.setItem(CLE_REGLAGES, ecrireReglages(reglages));
  } catch {
    // Tant pis : les réglages resteront valables jusqu'à la fermeture de la page.
  }
}
