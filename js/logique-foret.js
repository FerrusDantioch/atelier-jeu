// =============================================================================
// logique-foret.js — LA FORÊT DE L'INVENTEUR (version 1.6), sans aucune 3D
// -----------------------------------------------------------------------------
// À l'est de la place, une forêt paisible où vit Anatole, un vieil inventeur.
//   - la CUEILLETTE : six buissons donnent, selon la saison, des baies
//     (printemps, été), des champignons (automne) ou des pommes de pin
//     (hiver). Chacun repousse en deux minutes. Ça se vend au comptoir, ou
//     s'offre aux habitants ;
//   - parfois, sous les feuilles, une CURIOSITÉ (une plume, un fossile…), à
//     exposer dans la vitrine de l'atelier ;
//   - le TÉLESCOPE d'Anatole (une fois réparé, voir sa quête) : la nuit, on
//     découvre une constellation. Chaque saison en a deux ; elles vont dans
//     l'album. Quand on les a toutes, Anatole offre un cadeau.
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { RECETTES, capaciteStock } from './logique-atelier.js';
import { queteTerminee, dialoguePnjQuete } from './logique-quetes.js';

// Les six buissons de la forêt (leur position sert aussi aux obstacles).
export const CUEILLETTES = Object.freeze([
  { id: 'cueillette-1', x: -10, z: -3.6 },
  { id: 'cueillette-2', x: -9.8, z: 3.4 },
  { id: 'cueillette-3', x: -3.6, z: 4.4 },
  { id: 'cueillette-4', x: 2.8, z: 3.4 },
  { id: 'cueillette-5', x: 8.6, z: 4.6 },
  { id: 'cueillette-6', x: 11.8, z: -0.4 },
]);
export const RAYON_BUISSON = 0.5;
export const DUREE_REPOUSSE_FORET = 120; // secondes

// Ce que donnent les buissons à chaque saison.
export const RECOLTE_SAISON = Object.freeze({ printemps: 'baies', ete: 'baies', automne: 'champignons', hiver: 'pommes-pin' });

// Les curiosités, à exposer dans la vitrine. « attrait » : combien elles
// plaisent aux visiteurs.
export const CURIOSITES = Object.freeze({
  'vieille-botte': { nom: 'Vieille botte', lieu: 'lac', attrait: 3, description: 'Repêchée au fond du lac. Elle fait sourire tout le monde.' },
  'plume-geai': { nom: 'Plume de geai', lieu: 'foret', attrait: 2, description: 'Une plume bleue, trouvée sous un buisson de la forêt.' },
  'pomme-pin-doree': { nom: 'Pomme de pin dorée', lieu: 'foret', attrait: 4, description: 'Elle brille comme du laiton. Personne ne sait pourquoi.' },
  fossile: { nom: "Fossile d'ammonite", lieu: 'foret', attrait: 5, description: 'Un coquillage de pierre, vieux de millions d\'années.' },
  'eclat-meteorite': { nom: 'Éclat de météorite', lieu: 'ciel', attrait: 8, description: "Un morceau d'étoile filante, offert par Anatole." },
});
export const CHANCE_CURIOSITE = 0.15;

// Les constellations (inventées par les gens de Cuivrebourg !). Deux par
// saison. « etoiles » : leurs positions sur un petit dessin de 100 × 70 ;
// « traits » : les étoiles reliées par un trait.
export const CONSTELLATIONS = Object.freeze([
  {
    id: 'grand-engrenage', nom: 'Le Grand Engrenage', saison: 'printemps',
    texte: "Sept étoiles en cercle, comme les dents d'une roue. Les anciens disaient qu'elle fait tourner le ciel.",
    etoiles: [[50, 12], [68, 22], [72, 40], [60, 56], [40, 56], [28, 40], [32, 22], [50, 35]],
    traits: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [7, 0], [7, 3]],
  },
  {
    id: 'bouilloire', nom: 'La Bouilloire', saison: 'printemps',
    texte: 'Un bec, une anse et un gros ventre rond. Au printemps, elle annonce le thé du matin.',
    etoiles: [[34, 52], [66, 52], [70, 34], [50, 26], [30, 34], [84, 24], [50, 13]],
    traits: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [2, 5], [3, 6]],
  },
  {
    id: 'lanterne', nom: 'La Lanterne', saison: 'ete',
    texte: "Elle brille juste au-dessus de l'horizon, les nuits d'été. Les marins s'en servaient pour rentrer au port.",
    etoiles: [[50, 8], [41, 19], [59, 19], [39, 48], [61, 48], [50, 59], [50, 34]],
    traits: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 5], [4, 5]],
  },
  {
    id: 'chat-endormi', nom: 'Le Chat endormi', saison: 'ete',
    texte: 'Une étoile pour chaque oreille, et une longue queue. Rouille fait la même tête quand il dort près de la forge.',
    etoiles: [[22, 46], [40, 53], [60, 53], [75, 45], [78, 32], [72, 22], [84, 25], [38, 38]],
    traits: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [0, 7]],
  },
  {
    id: 'roue-moulin', nom: 'La Roue du moulin', saison: 'automne',
    texte: "Elle se lève quand les feuilles tombent, et tourne lentement toute la nuit, comme celle de Barnabé.",
    etoiles: [[50, 10], [71, 22], [71, 48], [50, 60], [29, 48], [29, 22], [50, 35]],
    traits: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [6, 0], [6, 2], [6, 4]],
  },
  {
    id: 'pomme', nom: 'La Pomme', saison: 'automne',
    texte: 'Ronde et dorée, avec sa queue et sa feuille. Elle brille fort la nuit de la Foire aux pommes.',
    etoiles: [[50, 22], [36, 17], [25, 32], [30, 50], [50, 58], [70, 50], [75, 32], [64, 17], [52, 9], [63, 6]],
    traits: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [0, 8], [8, 9]],
  },
  {
    id: 'train-neiges', nom: 'Le Train des neiges', saison: 'hiver',
    texte: "Une locomotive et deux wagons qui filent dans le ciel d'hiver. Augustin dit qu'il est toujours à l'heure.",
    etoiles: [[12, 46], [30, 46], [30, 30], [20, 30], [20, 21], [38, 46], [54, 46], [38, 34], [54, 34], [62, 46], [80, 46], [62, 34], [80, 34]],
    traits: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 3], [1, 5], [5, 6], [6, 8], [8, 7], [7, 5], [6, 9], [9, 10], [10, 12], [12, 11], [11, 9]],
  },
  {
    id: 'cle-molette', nom: 'La Clé à molette', saison: 'hiver',
    texte: "La plus grande clé du ciel. On dit qu'elle sert à resserrer les étoiles qui se dévissent.",
    etoiles: [[18, 60], [32, 50], [46, 40], [54, 28], [66, 22], [72, 34], [62, 44]],
    traits: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 6], [6, 5]],
  },
]);
export const RECOMPENSE_ETOILES = 150;

export function creerEtatForet() {
  const cueillettes = {};
  for (const c of CUEILLETTES) cueillettes[c.id] = 0; // 0 = prêt à cueillir
  return { cueillettes, recoltes: 0, constellations: [], derniereNuit: 0, recompenseEtoiles: false, graine: 4242 };
}

function hasard(foret) {
  foret.graine = (foret.graine * 16807) % 2147483647;
  return (foret.graine - 1) / 2147483646;
}

const jourActuel = (etat) => (Number.isFinite(etat.jour) && etat.jour >= 1 ? Math.floor(etat.jour) : 1);

// -----------------------------------------------------------------------------
// 1. LA CUEILLETTE
// -----------------------------------------------------------------------------
export const estCueillette = (id) => CUEILLETTES.some((c) => c.id === id);

// Où en est la repousse d'un buisson : 1 = prêt à cueillir.
export function progressionCueillette(etat, id) {
  const restant = etat.foret.cueillettes[id];
  if (restant === undefined) return 1;
  return Math.max(0, Math.min(1, 1 - restant / DUREE_REPOUSSE_FORET));
}

// Les buissons repoussent (même quand Ferrus est ailleurs).
export function avancerForet(etat, dt) {
  if (!(dt > 0)) return;
  for (const id of Object.keys(etat.foret.cueillettes)) {
    etat.foret.cueillettes[id] = Math.max(0, etat.foret.cueillettes[id] - dt);
  }
}

// Cueillir un buisson. Renvoie les messages à afficher.
export function cueillir(etat, id, saisonId) {
  if (!estCueillette(id)) return [];
  if (etat.foret.cueillettes[id] > 0) return ['Ce buisson repousse doucement. Revenez dans un petit moment !'];
  const objet = RECOLTE_SAISON[saisonId] || 'baies';
  const r = RECETTES[objet];
  if (etat.atelier.stock[objet] >= capaciteStock(etat)) return [`Plus de place à l'atelier pour les ${r.pluriel}.`];
  etat.atelier.stock[objet] += 1;
  etat.foret.cueillettes[id] = DUREE_REPOUSSE_FORET;
  etat.foret.recoltes += 1;
  const messages = [`Vous cueillez ${r.article} (+1). À vendre au comptoir, ou à offrir !`];
  // Une curiosité cachée sous les feuilles ?
  const restantes = Object.keys(CURIOSITES).filter((c) => CURIOSITES[c].lieu === 'foret' && !etat.curiosites.includes(c));
  if (restantes.length > 0 && hasard(etat.foret) < CHANCE_CURIOSITE) {
    const trouvee = restantes[Math.floor(hasard(etat.foret) * restantes.length)];
    etat.curiosites.push(trouvee);
    messages.push(`Tiens ! Sous les feuilles : ${CURIOSITES[trouvee].nom.toLowerCase()} ! (à exposer dans la vitrine)`);
  }
  return messages;
}

// Le petit texte d'aide près d'un buisson.
export function libelleCueillette(etat, id, saisonId) {
  if (etat.foret.cueillettes[id] > 0) return 'Le buisson repousse';
  const objet = RECOLTE_SAISON[saisonId] || 'baies';
  if (objet === 'baies') return 'Cueillir des baies';
  if (objet === 'champignons') return 'Ramasser des champignons';
  return 'Ramasser des pommes de pin';
}

// Trouver une curiosité ailleurs (la vieille botte du lac). Renvoie vrai si c'est nouveau.
export function trouverCuriosite(etat, id) {
  if (!CURIOSITES[id] || etat.curiosites.includes(id)) return false;
  etat.curiosites.push(id);
  return true;
}

// -----------------------------------------------------------------------------
// 2. LE TÉLESCOPE ET LES ÉTOILES
// -----------------------------------------------------------------------------
export function telescopeRepare(etat) {
  return queteTerminee(etat, 'telescope-anatole');
}

// Le numéro de la nuit (la nuit du jour 3 au jour 4 est la nuit 3), ou null
// en pleine journée.
export function numeroNuit(jour, journee) {
  const j = Number.isFinite(jour) && jour >= 1 ? Math.floor(jour) : 1;
  if (journee >= 0.78) return j;
  if (journee < 0.22) return j - 1;
  return null;
}

// Regarder dans le télescope. « nuit » : fait-il assez sombre ? (main.js le
// sait ; si le cycle du jour est coupé dans les options, c'est toujours vrai.)
// Renvoie { messages, constellation, nouvelle }.
export function observerCiel(etat, saisonId, { nuit }) {
  if (!telescopeRepare(etat)) return { messages: ['Le télescope est en panne. Anatole saura sûrement quoi faire.'], constellation: null, nouvelle: false };
  if (!nuit) return { messages: ['Il fait trop clair pour voir les étoiles. Revenez à la nuit tombée !'], constellation: null, nouvelle: false };
  const f = etat.foret;
  const cetteNuit = numeroNuit(etat.jour, etat.journee) ?? jourActuel(etat);
  const deLaSaison = CONSTELLATIONS.filter((c) => c.saison === saisonId);
  const inconnue = deLaSaison.find((c) => !f.constellations.includes(c.id));
  const connue = deLaSaison.find((c) => f.constellations.includes(c.id)) || null;
  if (inconnue && f.derniereNuit !== cetteNuit) {
    f.constellations.push(inconnue.id);
    f.derniereNuit = cetteNuit;
    return {
      messages: [`Nouvelle constellation : ${inconnue.nom} ! (${f.constellations.length}/${CONSTELLATIONS.length}, dans l'album)`],
      constellation: inconnue,
      nouvelle: true,
    };
  }
  if (inconnue) return { messages: ['Une constellation par nuit : revenez demain soir pour en découvrir une autre !'], constellation: connue, nouvelle: false };
  return { messages: ['Vous connaissez les constellations de cette saison. Les autres saisons en cachent d\'autres !'], constellation: connue, nouvelle: false };
}

export function libelleTelescope(etat) {
  return telescopeRepare(etat) ? 'Regarder dans le télescope' : 'Le télescope d\'Anatole';
}

// Les étoiles pour l'album : chaque constellation, connue ou non.
export function etoilesAlbum(etat) {
  const NOMS = { printemps: 'printemps', ete: 'été', automne: 'automne', hiver: 'hiver' };
  return CONSTELLATIONS.map((c) => {
    const connue = etat.foret.constellations.includes(c.id);
    return { ...c, connue, nom: connue ? c.nom : '???', saisonNom: NOMS[c.saison] };
  });
}

// -----------------------------------------------------------------------------
// 3. ANATOLE, L'INVENTEUR
// -----------------------------------------------------------------------------
export function dialogueAnatole(etat) {
  // Toutes les constellations : Anatole offre un cadeau tombé du ciel.
  if (etat.foret.constellations.length >= CONSTELLATIONS.length && !etat.foret.recompenseEtoiles) {
    return {
      orateur: 'Anatole',
      repliques: [
        'Toutes les constellations ! Vous connaissez le ciel aussi bien que moi, maintenant.',
        `Tenez : ${RECOMPENSE_ETOILES} pièces, et un éclat de météorite que j'ai trouvé il y a bien longtemps. Il sera magnifique dans votre vitrine !`,
      ],
      choix: [{ texte: 'Merci, Anatole !', action: 'foret:etoiles' }],
    };
  }
  const quete = dialoguePnjQuete(etat, 'anatole', 'Anatole');
  if (quete) return quete;
  // Avant sa quête (il faut d'abord que la mine produise de nouveau).
  return {
    orateur: 'Anatole',
    repliques: [
      'Bonjour, bonjour ! Je suis Anatole, inventeur. Bienvenue dans ma forêt.',
      "Mon grand télescope est en panne… Pour le réparer, il me faudrait du cuivre de la mine. Revenez quand Sidonie aura remis son wagonnet en route !",
      'En attendant, servez-vous dans les buissons : baies, champignons ou pommes de pin, selon la saison.',
    ],
    choix: [{ texte: 'Au revoir, Anatole', action: 'fermer' }],
  };
}

// Les actions des choix d'Anatole. Renvoie les messages à afficher.
export function appliquerActionForet(etat, action) {
  if (action === 'foret:etoiles' && !etat.foret.recompenseEtoiles && etat.foret.constellations.length >= CONSTELLATIONS.length) {
    etat.foret.recompenseEtoiles = true;
    etat.argent += RECOMPENSE_ETOILES;
    trouverCuriosite(etat, 'eclat-meteorite');
    return [`+${RECOMPENSE_ETOILES} pièces`, "Un éclat de météorite rejoint vos curiosités (à exposer dans la vitrine)."];
  }
  return [];
}
