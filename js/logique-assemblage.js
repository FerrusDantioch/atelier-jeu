// =============================================================================
// logique-assemblage.js — LE PETIT JEU D'ASSEMBLAGE (version 1.6), sans 3D
// -----------------------------------------------------------------------------
// Pour les objets rares (horloge, boîte à musique, automate, train miniature),
// Ferrus peut assembler lui-même le mécanisme : sur une petite planche à
// trous, il pose des engrenages pour relier le MOTEUR (à gauche) à l'AIGUILLE
// (à droite). Deux engrenages posés côte à côte (à gauche, à droite, en haut ou
// en bas) s'entraînent l'un l'autre. Quand la chaîne relie le moteur à
// l'aiguille, tout se met à tourner !
//
// C'est un casse-tête tranquille : pas de chronomètre, pas d'échec possible.
// On peut retirer un engrenage autant qu'on veut, et même passer son tour.
// Réussir l'assemblage fait aller la fabrication deux fois plus vite.
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

// Les objets qui ont un petit jeu d'assemblage.
export const OBJETS_ASSEMBLAGE = Object.freeze(['horloge', 'boite-musique', 'automate', 'train-miniature']);

export const COLONNES = 7;
export const LIGNES = 4;

// Les planches. « moteur » et « aiguille » : [colonne, ligne] ; « bloques » :
// les trous bouchés par un rivet ; « engrenages » : combien on en a dans la
// main (toujours un de plus que le plus court chemin : on a le droit de
// tâtonner).
export const PLANCHES = Object.freeze([
  { moteur: [0, 1], aiguille: [6, 1], bloques: [[3, 1], [3, 2]], engrenages: 8 },
  { moteur: [0, 0], aiguille: [6, 3], bloques: [[2, 0], [2, 1], [4, 2], [4, 3]], engrenages: 11 },
  { moteur: [0, 2], aiguille: [6, 0], bloques: [[1, 0], [3, 1], [3, 2], [3, 3], [5, 1]], engrenages: 8 },
  { moteur: [0, 1], aiguille: [6, 2], bloques: [[2, 1], [2, 2], [4, 0], [4, 1]], engrenages: 9 },
  { moteur: [0, 0], aiguille: [6, 1], bloques: [[1, 1], [3, 0], [3, 1], [5, 2]], engrenages: 9 },
  { moteur: [0, 3], aiguille: [6, 0], bloques: [[2, 3], [2, 2], [4, 0], [4, 1], [5, 3]], engrenages: 11 },
]);

const cle = (x, y) => `${x},${y}`;
const VOISINS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Une nouvelle partie pour un objet. « numero » change la planche (on en
// change à chaque assemblage, pour ne pas toujours refaire la même).
export function creerAssemblage(objet, numero = 0) {
  const n = Math.abs(Math.floor(numero)) % PLANCHES.length;
  return { objet, numeroPlanche: n, planche: PLANCHES[n], poses: [] };
}

// Que contient une case ? 'moteur', 'aiguille', 'bloque', 'engrenage' ou 'vide'.
export function contenuCase(partie, x, y) {
  const p = partie.planche;
  if (x === p.moteur[0] && y === p.moteur[1]) return 'moteur';
  if (x === p.aiguille[0] && y === p.aiguille[1]) return 'aiguille';
  if (p.bloques.some(([bx, by]) => bx === x && by === y)) return 'bloque';
  if (partie.poses.some(([gx, gy]) => gx === x && gy === y)) return 'engrenage';
  return 'vide';
}

export function engrenagesRestants(partie) {
  return partie.planche.engrenages - partie.poses.length;
}

// Toucher une case : on pose un engrenage (s'il en reste), ou on le retire.
// Renvoie vrai si quelque chose a changé.
export function basculer(partie, x, y) {
  if (x < 0 || y < 0 || x >= COLONNES || y >= LIGNES) return false;
  const contenu = contenuCase(partie, x, y);
  if (contenu === 'engrenage') {
    partie.poses = partie.poses.filter(([gx, gy]) => gx !== x || gy !== y);
    return true;
  }
  if (contenu === 'vide' && engrenagesRestants(partie) > 0) {
    partie.poses.push([x, y]);
    return true;
  }
  return false;
}

// Les engrenages entraînés par le moteur, avec leur sens de rotation (+1 ou -1 :
// deux engrenages qui se touchent tournent en sens contraire). Map « x,y » → sens.
export function engrenagesEntraines(partie) {
  const poses = new Set(partie.poses.map(([x, y]) => cle(x, y)));
  const sens = new Map();
  const [mx, my] = partie.planche.moteur;
  const file = [];
  for (const [dx, dy] of VOISINS) {
    const k = cle(mx + dx, my + dy);
    if (poses.has(k) && !sens.has(k)) { sens.set(k, -1); file.push([mx + dx, my + dy]); }
  }
  while (file.length > 0) {
    const [x, y] = file.shift();
    for (const [dx, dy] of VOISINS) {
      const k = cle(x + dx, y + dy);
      if (poses.has(k) && !sens.has(k)) { sens.set(k, -sens.get(cle(x, y))); file.push([x + dx, y + dy]); }
    }
  }
  return sens;
}

// L'assemblage est-il réussi ? (un engrenage entraîné touche l'aiguille)
export function estAssemble(partie) {
  const sens = engrenagesEntraines(partie);
  const [ax, ay] = partie.planche.aiguille;
  return VOISINS.some(([dx, dy]) => sens.has(cle(ax + dx, ay + dy)));
}

// Le plus court chemin possible (le nombre d'engrenages), pour vérifier les
// planches : null si impossible.
export function plusCourtChemin(planche) {
  const partie = { planche, poses: [] };
  const [mx, my] = planche.moteur;
  const [ax, ay] = planche.aiguille;
  const distance = new Map();
  const file = [];
  for (const [dx, dy] of VOISINS) {
    const x = mx + dx;
    const y = my + dy;
    if (x >= 0 && y >= 0 && x < COLONNES && y < LIGNES && contenuCase(partie, x, y) === 'vide') {
      distance.set(cle(x, y), 1);
      file.push([x, y]);
    }
  }
  while (file.length > 0) {
    const [x, y] = file.shift();
    const d = distance.get(cle(x, y));
    if (Math.abs(x - ax) + Math.abs(y - ay) === 1) return d;
    for (const [dx, dy] of VOISINS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLONNES || ny >= LIGNES) continue;
      if (contenuCase(partie, nx, ny) !== 'vide' || distance.has(cle(nx, ny))) continue;
      distance.set(cle(nx, ny), d + 1);
      file.push([nx, ny]);
    }
  }
  return null;
}
