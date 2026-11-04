// =============================================================================
// logique-zones.js — LES LIEUX DE CUIVREBOURG (étape 3), sans aucune 3D
// -----------------------------------------------------------------------------
// Trois lieux reliés par des sorties :
//
//      [ La place ]  ── portail du sud ──  [ Le marché ]  ── chemin de l'est ──  [ Le moulin ]
//
// - Le portail de la place s'ouvre quand l'atelier ouvre (fin de la quête d'Odile).
// - Le chemin du moulin est bloqué par un arbre tombé jusqu'à la fin de la
//   quête de Capucine.
//
// Pour chaque lieu : ses limites, ses obstacles, ses personnages, les choses
// avec lesquelles on peut interagir, ses sorties et ses points d'arrivée.
// Comme pour la place (MONDE, dans logique.js), ce que l'on voit en 3D est
// construit à partir de ces mêmes données.
// =============================================================================

import { MONDE, obstaclesDuMonde, libelleInteraction } from './logique.js';
import { queteTerminee, queteEnCours, objetsARamasser } from './logique-quetes.js';

// Raccourci : un rectangle d'obstacle.
const rect = (id, x, z, largeur, profondeur) => ({ type: 'rectangle', id, x, z, largeur, profondeur });

// -----------------------------------------------------------------------------
// 1. LES LIEUX
// -----------------------------------------------------------------------------
export const ZONES = Object.freeze({
  // --- La place (étapes 1 et 2) : son plan détaillé est MONDE, dans logique.js.
  place: {
    id: 'place',
    nom: 'La place de Cuivrebourg',
    limites: MONDE.limites,
    joueur: MONDE.joueur,
    camera: { minX: -11, maxX: 11, minZ: -8, maxZ: 8 },
    interactifs: [
      { id: 'odile', ...pick(MONDE.odile) },
      { id: 'etabli', ...pick(MONDE.etabli) },
      { id: 'comptoir', ...pick(MONDE.comptoir) },
    ],
    sorties: [
      // Le portail du sud : on sort en marchant tout au bout, entre les poteaux.
      { vers: 'marche', minX: -1.4, maxX: 1.4, minZ: 11.35, maxZ: 99, condition: 'portail' },
    ],
    arrivees: {
      marche: { x: 0, z: 10.3, orientation: Math.PI },
    },
  },

  // --- Le marché : des étals, une fontaine, Capucine et Léon le facteur.
  marche: {
    id: 'marche',
    nom: 'Le marché',
    limites: { minX: -14, maxX: 14, minZ: -9, maxZ: 9 },
    joueur: MONDE.joueur,
    camera: { minX: -7, maxX: 7, minZ: -5, maxZ: 5 },
    haies: [
      { id: 'haie-nord-gauche', x: -8.25, z: -9.5, largeur: 13.5, profondeur: 1 },
      { id: 'haie-nord-droite', x: 8.25, z: -9.5, largeur: 13.5, profondeur: 1 },
      { id: 'haie-sud', x: 0, z: 9.5, largeur: 30, profondeur: 1 },
      { id: 'haie-ouest', x: -14.5, z: 0, largeur: 1, profondeur: 20 },
      { id: 'haie-est-haut', x: 14.5, z: -5.75, largeur: 1, profondeur: 8.5 },
      { id: 'haie-est-bas', x: 14.5, z: 5.75, largeur: 1, profondeur: 8.5 },
    ],
    // Deux maisons-boutiques adossées à la haie du nord, de part et d'autre de l'entrée.
    batiments: [
      { id: 'boutique-ouest', x: -8.5, z: -6.5, largeur: 7, profondeur: 4, murs: '#d9b98f', toit: '#8f6f8a', enseigne: 'TISSUS' },
      { id: 'boutique-est', x: 8.5, z: -6.5, largeur: 7, profondeur: 4, murs: '#c9a27e', toit: '#7f8f6a', enseigne: 'ÉPICES' },
    ],
    // Les étals du marché (des tables couvertes d'un auvent rayé).
    etals: [
      { id: 'etal-capucine', x: -6.5, z: 0, largeur: 3, profondeur: 1.2, couleur: '#c98b7a', marchandise: 'balance' },
      { id: 'etal-fruits', x: 6.5, z: 0.5, largeur: 3, profondeur: 1.2, couleur: '#8fa77a', marchandise: 'fruits' },
      { id: 'etal-tissus', x: 6.5, z: 5, largeur: 3, profondeur: 1.2, couleur: '#8f8fb0', marchandise: 'tissus' },
    ],
    fontaine: { id: 'fontaine', x: 0, z: 3, rayon: 1.5 },
    arbres: [{ x: -12, z: 6.5 }, { x: -8.5, z: 7.2 }, { x: 11.5, z: 6.6 }, { x: -12, z: -2.5 }],
    rayonArbre: 0.65,
    // L'arbre tombé qui bloque le chemin du moulin (tant que la quête de Capucine n'est pas finie).
    barriere: { id: 'barriere', x: 13.2, z: 0, largeur: 0.8, profondeur: 3.2 },
    pnj: [
      { id: 'capucine', nom: 'Capucine', x: -4.2, z: 0.4, rayon: 0.45, distanceInteraction: 2.2 },
      { id: 'leon', nom: 'Léon', x: 2.6, z: 6.6, rayon: 0.45, distanceInteraction: 2.2 },
    ],
    interactifs: [
      { id: 'capucine', x: -4.2, z: 0.4, distanceInteraction: 2.2 },
      { id: 'leon', x: 2.6, z: 6.6, distanceInteraction: 2.2 },
      { id: 'barriere', x: 12.6, z: 0, distanceInteraction: 2.2, condition: 'chemin-bloque' },
    ],
    sorties: [
      { vers: 'place', minX: -1.4, maxX: 1.4, minZ: -99, maxZ: -8.4 },
      { vers: 'moulin', minX: 13.4, maxX: 99, minZ: -1.4, maxZ: 1.4, condition: 'chemin-moulin' },
    ],
    arrivees: {
      place: { x: 0, z: -7.4, orientation: 0 },
      moulin: { x: 12.3, z: 0, orientation: -Math.PI / 2 },
    },
  },

  // --- Le moulin : le canal (au nord, d'ouest en est), le moulin à eau et Barnabé.
  moulin: {
    id: 'moulin',
    nom: 'Le moulin',
    limites: { minX: -14, maxX: 14, minZ: -9, maxZ: 9 },
    joueur: MONDE.joueur,
    camera: { minX: -7, maxX: 7, minZ: -4, maxZ: 5 },
    haies: [
      { id: 'haie-nord', x: 0, z: -9.5, largeur: 30, profondeur: 1 },
      { id: 'haie-sud', x: 0, z: 9.5, largeur: 30, profondeur: 1 },
      { id: 'haie-ouest-haut', x: -14.5, z: -5.75, largeur: 1, profondeur: 8.5 },
      { id: 'haie-ouest-bas', x: -14.5, z: 5.75, largeur: 1, profondeur: 8.5 },
      { id: 'haie-est', x: 14.5, z: 0, largeur: 1, profondeur: 20 },
    ],
    // Le canal coule d'ouest en est ; on ne peut pas y entrer.
    canal: { id: 'canal', x: 0, z: -6.5, largeur: 30, profondeur: 3 },
    // Le moulin, adossé au canal ; sa roue est juste à côté, à l'est, dans l'eau.
    batiments: [
      { id: 'moulin', x: -4, z: -2.75, largeur: 6, profondeur: 4.5, murs: '#e2d4b8', toit: '#9a6a4f', enseigne: 'MOULIN' },
    ],
    roue: { x: 0.9, z: -6.3, rayon: 1.7 },
    // Le mécanisme de la roue : une boîte d'engrenages sur la berge.
    mecanisme: { id: 'mecanisme', x: 0.9, z: -3.6, rayon: 0.4 },
    arbres: [{ x: -11.5, z: -3.2 }, { x: -9, z: 7 }, { x: 3.5, z: 7.2 }, { x: 9, z: 6.5 }, { x: 11, z: -2.5 }, { x: 6.5, z: -3 }],
    rayonArbre: 0.65,
    pnj: [
      { id: 'barnabe', nom: 'Barnabé', x: -5.6, z: 1.0, rayon: 0.45, distanceInteraction: 2.2 },
    ],
    interactifs: [
      { id: 'barnabe', x: -5.6, z: 1.0, distanceInteraction: 2.2 },
      { id: 'mecanisme', x: 0.9, z: -3.6, distanceInteraction: 1.9 },
    ],
    sorties: [
      { vers: 'marche', minX: -99, maxX: -13.4, minZ: -1.4, maxZ: 1.4 },
    ],
    arrivees: {
      marche: { x: -12.3, z: 0, orientation: Math.PI / 2 },
    },
  },
});

// Garde seulement la position et la distance d'interaction d'un objet de MONDE.
function pick(o) {
  return { x: o.x, z: o.z, distanceInteraction: o.distanceInteraction };
}

// -----------------------------------------------------------------------------
// 2. LES CONDITIONS (portes ouvertes ou fermées)
// -----------------------------------------------------------------------------
export function conditionRemplie(etat, condition) {
  switch (condition) {
    case undefined:
      return true;
    case 'portail': // le portail de la place s'ouvre avec l'atelier
      return etat.atelier.ouvert;
    case 'chemin-moulin': // l'arbre tombé est dégagé après la quête de Capucine
      return queteTerminee(etat, 'balance-capucine');
    case 'chemin-bloque':
      return !queteTerminee(etat, 'balance-capucine');
    default:
      return false;
  }
}

// -----------------------------------------------------------------------------
// 3. OBSTACLES, SORTIES, INTERACTIONS
// -----------------------------------------------------------------------------

// Tous les obstacles d'un lieu, selon l'état du jeu (portes ouvertes ou non).
export function obstaclesZone(zoneId, etat) {
  if (zoneId === 'place') {
    const liste = obstaclesDuMonde(MONDE);
    // Portail ouvert : on peut passer entre les poteaux.
    return conditionRemplie(etat, 'portail') ? liste.filter((o) => o.id !== 'portail') : liste;
  }
  const z = ZONES[zoneId];
  const liste = [];
  const ajouterRect = (o) => liste.push(rect(o.id, o.x, o.z, o.largeur, o.profondeur));
  (z.haies || []).forEach(ajouterRect);
  (z.batiments || []).forEach(ajouterRect);
  (z.etals || []).forEach(ajouterRect);
  if (z.canal) ajouterRect(z.canal);
  if (z.barriere && !conditionRemplie(etat, 'chemin-moulin')) ajouterRect(z.barriere);
  for (const c of [z.fontaine, z.mecanisme].filter(Boolean)) liste.push({ type: 'cercle', id: c.id, x: c.x, z: c.z, rayon: c.rayon });
  for (const p of z.pnj || []) liste.push({ type: 'cercle', id: p.id, x: p.x, z: p.z, rayon: p.rayon });
  (z.arbres || []).forEach((a, i) => liste.push({ type: 'cercle', id: `arbre-${i + 1}`, x: a.x, z: a.z, rayon: z.rayonArbre }));
  return liste;
}

// Ferrus est-il dans une sortie ouverte ? Renvoie { zone, x, z, orientation } ou null.
export function sortieAtteinte(zoneId, x, z, etat) {
  for (const s of ZONES[zoneId].sorties) {
    if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ && conditionRemplie(etat, s.condition)) {
      const arrivee = ZONES[s.vers].arrivees[zoneId];
      return { zone: s.vers, x: arrivee.x, z: arrivee.z, orientation: arrivee.orientation };
    }
  }
  return null;
}

// La chose la plus proche avec laquelle Ferrus peut interagir dans ce lieu, ou null.
export function cibleProcheZone(zoneId, x, z, etat) {
  let meilleure = null;
  for (const i of ZONES[zoneId].interactifs) {
    if (!conditionRemplie(etat, i.condition)) continue;
    const distance = Math.hypot(x - i.x, z - i.z);
    if (distance <= i.distanceInteraction && (!meilleure || distance < meilleure.distance)) meilleure = { id: i.id, distance };
  }
  return meilleure ? meilleure.id : null;
}

// Le petit texte d'aide (« Parler à Capucine »).
export function libelleZone(etat, cible) {
  const pnj = Object.values(ZONES).flatMap((z) => z.pnj || []).find((p) => p.id === cible);
  if (pnj) return `Parler à ${pnj.nom}`;
  if (cible === 'barriere') return 'Le chemin du moulin';
  if (cible === 'mecanisme') {
    const enCours = queteEnCours(etat);
    return enCours && enCours.etape.type === 'utiliser' ? "Installer l'axe" : 'Le mécanisme de la roue';
  }
  return libelleInteraction(etat, cible);
}

// Le nom d'un personnage à partir de son identifiant.
export function nomPnj(id) {
  if (id === 'odile') return 'Odile';
  const pnj = Object.values(ZONES).flatMap((z) => z.pnj || []).find((p) => p.id === id);
  return pnj ? pnj.nom : id;
}

// Les objets de quête à ramasser dans ce lieu (pour les afficher).
export function objetsQueteZone(etat, zoneId) {
  return objetsARamasser(etat, zoneId);
}

// -----------------------------------------------------------------------------
// 4. LES RÉPLIQUES ORDINAIRES (hors quêtes)
// -----------------------------------------------------------------------------

// Léon, le facteur, connaît toutes les nouvelles : il donne des indices.
export function dialogueLeon(etat) {
  let repliques;
  if (!queteTerminee(etat, 'balance-capucine')) {
    repliques = [
      'Bonjour, Ferrus ! Moi, c\'est Léon, le facteur. Je connais tout le monde ici.',
      'Capucine, à son étal, a un souci avec sa balance. Allez donc la voir !',
    ];
  } else if (!queteTerminee(etat, 'roue-moulin')) {
    repliques = [
      "Le chemin du moulin est enfin dégagé ! Il part à l'est du marché.",
      'Barnabé, le meunier, a bien besoin de vous : sa roue ne tourne plus.',
    ];
  } else {
    repliques = [
      'Toutes mes lettres disent la même chose : « Cuivrebourg revit ! »',
      "Et c'est grâce à vous, Ferrus. Bravo !",
    ];
  }
  return { orateur: 'Léon', repliques, choix: [{ texte: 'Merci, Léon', action: 'fermer' }] };
}

// Un personnage de quête qui n'a rien de spécial à dire.
export function dialogueParDefaut(id) {
  return { orateur: nomPnj(id), repliques: ['Bonjour, Ferrus ! Belle journée, n\'est-ce pas ?'], choix: [{ texte: 'Au revoir', action: 'fermer' }] };
}

// Les messages des objets du décor (quand ce n'est pas le moment de s'en servir).
export function messageObjet(etat, cible) {
  if (cible === 'barriere') {
    return ['Un gros arbre est tombé sur le chemin du moulin. Capucine sait peut-être quand il sera dégagé.'];
  }
  if (cible === 'mecanisme') {
    if (queteTerminee(etat, 'roue-moulin')) return ['La roue tourne à merveille.'];
    return ["Le mécanisme de la roue est bloqué : il manque des pales et l'axe est tordu."];
  }
  return [];
}
