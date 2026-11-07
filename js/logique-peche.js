// =============================================================================
// logique-peche.js — LA PÊCHE AU LAC (version 1.5), sans aucune 3D
// -----------------------------------------------------------------------------
// Au bout du ponton du lac, on peut pêcher calmement. Il faut une canne :
// Gaston, le vieux pêcheur, prête la sienne quand on lui parle.
//
//   - on lance la ligne, on attend quelques secondes en regardant le
//     bouchon… et ça mord ! Pas besoin de réflexes : la prise est assurée ;
//   - les poissons sont remis doucement à l'eau, mais chaque nouvelle
//     espèce est notée dans l'album ;
//   - certaines espèces ne se montrent qu'à certaines saisons, et une est
//     très rare (le poisson-lune doré) ;
//   - parfois, on remonte autre chose : un ressort, une plaque de cuivre,
//     quelques pièces… ou une vieille botte !
//   - quand l'album compte toutes les espèces, Gaston offre une récompense.
//
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { capaciteStock } from './logique-atelier.js';
import { trouverCuriosite } from './logique-foret.js';

// Les espèces du lac. « saisons » : quand elles mordent ; « poids » : plus il
// est grand, plus elles sont fréquentes.
export const ESPECES = Object.freeze([
  { id: 'gardon', nom: 'Gardon', saisons: ['printemps', 'ete', 'automne', 'hiver'], poids: 30, couleur: '#b8b8a8' },
  { id: 'perche', feminin: true, nom: 'Perche', saisons: ['printemps', 'ete', 'automne', 'hiver'], poids: 22, couleur: '#9aa060' },
  { id: 'truite', feminin: true, nom: 'Truite', saisons: ['printemps', 'ete'], poids: 16, couleur: '#a89a8a' },
  { id: 'tanche', feminin: true, nom: 'Tanche', saisons: ['ete', 'automne'], poids: 16, couleur: '#7f8a50' },
  { id: 'carpe', feminin: true, nom: 'Carpe', saisons: ['ete', 'automne'], poids: 12, couleur: '#b8935a' },
  { id: 'brochet', nom: 'Brochet', saisons: ['automne', 'hiver'], poids: 12, couleur: '#7a8a6a' },
  { id: 'lotte', feminin: true, nom: 'Lotte', saisons: ['hiver'], poids: 16, couleur: '#8a7a62' },
  { id: 'poisson-lune', nom: 'Poisson-lune doré', saisons: ['printemps', 'ete', 'automne', 'hiver'], poids: 2, couleur: '#e6c060' },
]);

// Ce qu'on remonte d'autre (et la chance sur 100 que ça arrive).
export const TROUVAILLES = Object.freeze([
  { id: 'ressort', chance: 8 },
  { id: 'cuivre', chance: 8 },
  { id: 'pieces', chance: 7 },
  { id: 'botte', chance: 5 },
]);

export const RECOMPENSE_ALBUM_PECHE = 150;

export function creerEtatPeche() {
  const especes = {};
  for (const e of ESPECES) especes[e.id] = 0;
  return { canne: false, especes, prises: 0, recompense: false, graine: 777 };
}

function hasard(peche) {
  peche.graine = (peche.graine * 16807) % 2147483647;
  return (peche.graine - 1) / 2147483646;
}

export const especesTrouvees = (etat) => ESPECES.filter((e) => etat.peche.especes[e.id] > 0).length;

// Combien de secondes avant que ça morde (entre 3 et 6 s, au hasard).
export function attenteTouche(etat) {
  return 3 + hasard(etat.peche) * 3;
}

// Ça mord ! On découvre ce qu'on a pêché. Renvoie { messages, prise }.
export function pecher(etat, saisonId) {
  const p = etat.peche;
  if (!p.canne) return { messages: ['Il vous faudrait une canne à pêche. Gaston, le pêcheur, en a peut-être une.'], prise: null };
  // Une trouvaille ?
  let tirage = hasard(p) * 100;
  for (const t of TROUVAILLES) {
    if (tirage < t.chance) return trouvaille(etat, t.id);
    tirage -= t.chance;
  }
  // Sinon, un poisson de la saison.
  const possibles = ESPECES.filter((e) => e.saisons.includes(saisonId));
  const total = possibles.reduce((s, e) => s + e.poids, 0);
  let x = hasard(p) * total;
  let espece = possibles[possibles.length - 1];
  for (const e of possibles) {
    if (x < e.poids) { espece = e; break; }
    x -= e.poids;
  }
  const nouvelle = p.especes[espece.id] === 0;
  p.especes[espece.id] += 1;
  p.prises += 1;
  const messages = [`${espece.feminin ? 'Une' : 'Un'} ${espece.nom.toLowerCase()} ! Vous ${espece.feminin ? 'la' : 'le'} remettez doucement à l'eau.`];
  if (nouvelle) messages.push(`Nouvelle espèce dans l'album (${especesTrouvees(etat)}/${ESPECES.length}) !`);
  return { messages, prise: { type: 'poisson', id: espece.id } };
}

function trouvaille(etat, id) {
  const a = etat.atelier;
  if (id === 'ressort' || id === 'cuivre') {
    const nom = id === 'ressort' ? 'un ressort' : 'une plaque de cuivre';
    if (a.stock[id] >= capaciteStock(etat)) return { messages: [`Vous remontez ${nom}… mais l'atelier est plein. Vous le rendez au lac.`], prise: { type: 'objet', id } };
    a.stock[id] += 1;
    return { messages: [`Tiens ! Vous remontez ${nom}, tout à fait utilisable. (+1 ${id})`], prise: { type: 'objet', id } };
  }
  if (id === 'pieces') {
    const n = 10 + Math.floor(hasard(etat.peche) * 11);
    etat.argent += n;
    return { messages: [`+${n} pièces`, 'Une petite bourse oubliée au fond du lac !'], prise: { type: 'objet', id } };
  }
  // Version 1.6 : la première vieille botte rejoint les curiosités (pour la vitrine).
  if (trouverCuriosite(etat, 'vieille-botte')) {
    return { messages: ['Une vieille botte ! Vous la gardez en souvenir : elle ira très bien dans la vitrine.'], prise: { type: 'objet', id: 'botte' } };
  }
  return { messages: ['Une vieille botte ! Vous la posez sur le ponton en souriant.'], prise: { type: 'objet', id: 'botte' } };
}

// Le dialogue de Gaston, le vieux pêcheur.
export function dialogueGaston(etat) {
  const p = etat.peche;
  if (!p.canne) {
    return {
      orateur: 'Gaston',
      repliques: [
        "Bonjour, l'ami. Moi, c'est Gaston. Je pêche sur ce lac depuis cinquante ans.",
        "Vous voulez essayer ? Tenez, prenez ma vieille canne. J'en ai une autre à la cabane.",
        "Allez au bout du ponton, lancez la ligne, et patientez. Ici, on ne se presse jamais.",
      ],
      choix: [{ texte: 'Merci, Gaston !', action: 'peche:canne' }],
    };
  }
  const n = especesTrouvees(etat);
  if (n === ESPECES.length && !p.recompense) {
    return {
      orateur: 'Gaston',
      repliques: [
        `Toutes les espèces du lac ! Même le poisson-lune doré ! En cinquante ans, je n'en ai vu que trois.`,
        `Vous méritez bien ceci : ${RECOMPENSE_ALBUM_PECHE} pièces, mes économies de pêcheur. Si, si, j'insiste !`,
      ],
      choix: [{ texte: 'Merci, Gaston !', action: 'peche:recompense' }],
    };
  }
  let conseil;
  if (n === ESPECES.length) conseil = 'Vous connaissez ce lac mieux que moi, maintenant !';
  else if (n === 0) conseil = 'Le bout du ponton, c\'est le meilleur coin. Patience !';
  else conseil = 'Chaque saison a ses poissons : la truite au printemps, le brochet en automne, la lotte en hiver… Et on dit qu\'un poisson-lune doré vit au fond du lac.';
  return {
    orateur: 'Gaston',
    repliques: [`Vous avez trouvé ${n} espèce${n > 1 ? 's' : ''} sur ${ESPECES.length}.`, conseil],
    choix: [{ texte: 'Au revoir, Gaston', action: 'fermer' }],
  };
}

// Les actions des choix de Gaston. Renvoie les messages à afficher.
export function appliquerActionPeche(etat, action) {
  const p = etat.peche;
  if (action === 'peche:canne' && !p.canne) {
    p.canne = true;
    return ['Gaston vous prête sa vieille canne à pêche.'];
  }
  if (action === 'peche:recompense' && !p.recompense && especesTrouvees(etat) === ESPECES.length) {
    p.recompense = true;
    etat.argent += RECOMPENSE_ALBUM_PECHE;
    return [`+${RECOMPENSE_ALBUM_PECHE} pièces`];
  }
  return [];
}
