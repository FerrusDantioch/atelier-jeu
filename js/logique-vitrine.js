// =============================================================================
// logique-vitrine.js — LA VITRINE DE L'ATELIER (version 1.6), sans aucune 3D
// -----------------------------------------------------------------------------
// Sur la place, à droite de l'atelier, une belle vitrine vitrée a six places.
// On y expose ce dont on est fier :
//   - ses CRÉATIONS (une lanterne, un automate…) : l'objet quitte le stock
//     (il revient si on le retire de la vitrine) ;
//   - le PORTRAIT d'un poisson déjà pêché au lac ;
//   - ses CURIOSITÉS (la vieille botte du lac, les trouvailles de la forêt…).
// De temps en temps, un VISITEUR vient admirer la vitrine et laisse quelques
// pièces. Plus la vitrine est belle (« attrait »), plus il est généreux.
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { RECETTES, capaciteStock } from './logique-atelier.js';
import { ESPECES } from './logique-peche.js';
import { CURIOSITES } from './logique-foret.js';

export const PLACES_VITRINE = 6;
export const PREMIER_VISITEUR = 30;       // secondes après la première exposition
export const INTERVALLE_VISITEURS = 75;   // secondes entre deux visiteurs
export const POURBOIRE_MAX = 25;

// Ce qui plaît le plus aux visiteurs.
export const ATTRAIT_CREATIONS = Object.freeze({ lanterne: 2, bouilloire: 2, horloge: 4, 'boite-musique': 4, 'train-miniature': 5, automate: 6 });
export const ATTRAIT_POISSONS = Object.freeze({ gardon: 1, perche: 1, truite: 2, tanche: 2, carpe: 3, brochet: 3, lotte: 3, 'poisson-lune': 8 });

// Les visiteurs (ils ne font que passer).
const VISITEURS = [
  { nom: 'Une promeneuse', verbe: 'admire' },
  { nom: 'Un voyageur descendu du train', verbe: 'admire' },
  { nom: 'Une famille du quartier', verbe: 'admire' },
  { nom: 'Un vieux monsieur', verbe: 'contemple' },
  { nom: 'Une petite fille', verbe: 'regarde, émerveillée,' },
  { nom: 'Un peintre de passage', verbe: 'dessine' },
];

export function creerEtatVitrine() {
  return { objets: Array(PLACES_VITRINE).fill(''), prochain: PREMIER_VISITEUR, visiteurs: 0, pourboires: 0, graine: 909 };
}

function hasard(v) {
  v.graine = (v.graine * 16807) % 2147483647;
  return (v.graine - 1) / 2147483646;
}

// Ce qu'on expose est noté par un petit code : « creation:automate »,
// « poisson:truite », « curiosite:fossile ». Renvoie sa description, ou null.
export function decrireObjetVitrine(code) {
  const [type, id] = String(code).split(':');
  if (type === 'creation' && ATTRAIT_CREATIONS[id] && RECETTES[id]) {
    return { code, type, id, nom: RECETTES[id].nom, attrait: ATTRAIT_CREATIONS[id], possessif: `votre ${RECETTES[id].nom.toLowerCase()}` };
  }
  if (type === 'poisson') {
    const e = ESPECES.find((x) => x.id === id);
    if (e) return { code, type, id, nom: `Portrait : ${e.nom.toLowerCase()}`, attrait: ATTRAIT_POISSONS[id] || 1, couleur: e.couleur, possessif: `votre portrait de ${e.nom.toLowerCase()}` };
  }
  if (type === 'curiosite' && CURIOSITES[id]) {
    return { code, type, id, nom: CURIOSITES[id].nom, attrait: CURIOSITES[id].attrait, possessif: `votre ${CURIOSITES[id].nom.toLowerCase()}` };
  }
  return null;
}

// Ce qu'on pourrait exposer (pas encore dans la vitrine), par catégorie.
export function objetsExposables(etat) {
  const exposes = new Set(etat.vitrine.objets.filter(Boolean));
  const liste = [];
  for (const id of Object.keys(ATTRAIT_CREATIONS)) {
    const code = `creation:${id}`;
    if (!exposes.has(code) && etat.atelier.stock[id] > 0) liste.push({ ...decrireObjetVitrine(code), categorie: 'Vos créations', detail: `En stock : ${etat.atelier.stock[id]} (il quitte le stock)` });
  }
  for (const e of ESPECES) {
    const code = `poisson:${e.id}`;
    if (!exposes.has(code) && etat.peche.especes[e.id] > 0) liste.push({ ...decrireObjetVitrine(code), categorie: 'Vos plus belles pêches', detail: `Pêché ${etat.peche.especes[e.id]} fois` });
  }
  for (const id of etat.curiosites) {
    const code = `curiosite:${id}`;
    if (!exposes.has(code) && CURIOSITES[id]) liste.push({ ...decrireObjetVitrine(code), categorie: 'Vos curiosités', detail: CURIOSITES[id].description });
  }
  return liste;
}

// Exposer un objet à une place de la vitrine (0 à 5). Renvoie les messages.
export function exposer(etat, place, code) {
  const v = etat.vitrine;
  const d = decrireObjetVitrine(code);
  if (!d || !Number.isInteger(place) || place < 0 || place >= PLACES_VITRINE) return [];
  if (v.objets[place]) return ['Cette place est déjà prise : retirez d\'abord ce qui y est exposé.'];
  if (!objetsExposables(etat).some((o) => o.code === code)) return ['Vous ne pouvez pas exposer cela pour l\'instant.'];
  if (d.type === 'creation') etat.atelier.stock[d.id] -= 1;
  const premiere = v.objets.every((o) => !o);
  v.objets[place] = code;
  if (premiere) v.prochain = PREMIER_VISITEUR;
  return [`Exposé dans la vitrine : ${d.nom.charAt(0).toLowerCase()}${d.nom.slice(1)}.`];
}

// Retirer un objet de la vitrine (une création revient dans le stock).
export function retirer(etat, place) {
  const v = etat.vitrine;
  const code = v.objets[place];
  const d = code ? decrireObjetVitrine(code) : null;
  if (!d) return [];
  if (d.type === 'creation') {
    if (etat.atelier.stock[d.id] >= capaciteStock(etat)) return [`Plus de place à l'atelier pour ranger ${RECETTES[d.id].article}.`];
    etat.atelier.stock[d.id] += 1;
  }
  v.objets[place] = '';
  return [`Retiré de la vitrine : ${d.nom.charAt(0).toLowerCase()}${d.nom.slice(1)}.`];
}

// La beauté de la vitrine : la somme des attraits.
export function attraitVitrine(etat) {
  return etat.vitrine.objets.reduce((s, code) => s + (code ? (decrireObjetVitrine(code) || { attrait: 0 }).attrait : 0), 0);
}

// Ce que laisse un visiteur.
export function pourboire(etat) {
  const a = attraitVitrine(etat);
  if (a <= 0) return 0;
  return Math.min(POURBOIRE_MAX, 3 + Math.round(a * 0.8));
}

// Le plus bel objet de la vitrine (ou null).
export function plusBelObjet(etat) {
  let meilleur = null;
  for (const code of etat.vitrine.objets) {
    const d = code ? decrireObjetVitrine(code) : null;
    if (d && (!meilleur || d.attrait > meilleur.attrait)) meilleur = d;
  }
  return meilleur;
}

// Le temps passe : un visiteur vient de temps en temps (si la vitrine n'est
// pas vide et que l'atelier est ouvert). Renvoie { messages, visite }.
export function avancerVitrine(etat, dt) {
  const v = etat.vitrine;
  if (!etat.atelier.ouvert || !(dt > 0) || attraitVitrine(etat) === 0) return { messages: [], visite: false };
  v.prochain -= dt;
  if (v.prochain > 0) return { messages: [], visite: false };
  v.prochain = INTERVALLE_VISITEURS;
  const n = pourboire(etat);
  const visiteur = VISITEURS[Math.floor(hasard(v) * VISITEURS.length)];
  v.visiteurs += 1;
  v.pourboires += n;
  etat.argent += n;
  const bel = plusBelObjet(etat);
  return {
    messages: [`+${n} pièces`, `${visiteur.nom} ${visiteur.verbe} votre vitrine (surtout ${bel.possessif}) et laisse ${n} pièces.`],
    visite: true,
  };
}
