// =============================================================================
// stockage.js — ce que le jeu range dans le navigateur (le « localStorage »)
// -----------------------------------------------------------------------------
// La partie en cours, les réglages et les photos de l'album ; et de quoi donner
// un fichier au joueur (une photo, ou sa partie). (Ce fichier a été sorti de
// main.js dans la version 1.7, pour l'alléger.)
// =============================================================================

import { CLE_SAUVEGARDE, chargerPartie } from './logique-sauvegarde.js';
import { CLE_PHOTOS, lirePhotos } from './logique-photo.js';
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
// Renvoie vrai si la partie a bien été rangée.
export function ecrireSauvegarde(texte) {
  try {
    window.localStorage.setItem(CLE_SAUVEGARDE, texte);
    return true;
  } catch {
    // Pas de place ou stockage interdit : tant pis, on continue sans sauvegarder.
    return false;
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

// Les photos de l'album (version 1.6) sont rangées à part elles aussi.
export function lirePhotosNavigateur() {
  try {
    return lirePhotos(window.localStorage.getItem(CLE_PHOTOS));
  } catch {
    return [];
  }
}
// Range la liste des photos. Si le navigateur manque de place, on retire les
// plus anciennes (la liste est modifiée). Renvoie faux si rien n'a pu être gardé.
export function ecrirePhotosNavigateur(photos) {
  while (photos.length > 0) {
    try {
      window.localStorage.setItem(CLE_PHOTOS, JSON.stringify(photos));
      return true;
    } catch {
      photos.pop();
    }
  }
  try { window.localStorage.removeItem(CLE_PHOTOS); } catch { /* rien à faire */ }
  return false;
}

// Le texte de la partie telle qu'elle est rangée (ou null).
export function lireTexteSauvegarde() {
  try {
    return window.localStorage.getItem(CLE_SAUVEGARDE);
  } catch {
    return null;
  }
}

// Télécharge un fichier (une photo, ou la partie). « liberer » : l'adresse a
// été créée pour l'occasion, on la libère ensuite.
export function telechargerFichier(adresse, nom, liberer = false) {
  const lien = document.createElement('a');
  lien.href = adresse;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  lien.remove();
  if (liberer) setTimeout(() => URL.revokeObjectURL(adresse), 3000);
}
