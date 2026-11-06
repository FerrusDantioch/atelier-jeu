// =============================================================================
// logique-zones.js — LES LIEUX DE CUIVREBOURG (étape 3), sans aucune 3D
// -----------------------------------------------------------------------------
// Quatre lieux reliés par des sorties :
//
//   [ La place ] ─ portail du sud ─ [ Le marché ] ─ chemin de l'est ─ [ Le moulin ] ─ route de l'est ─ [ La gare ]
//
// - Le portail de la place s'ouvre quand l'atelier ouvre (fin de la quête d'Odile).
// - Le chemin du moulin est bloqué par un arbre tombé jusqu'à la fin de la
//   quête de Capucine.
// - La route de la gare (version 1.2) est fermée par une barrière jusqu'à la
//   fin de la quête de Barnabé.
// - La mine de cuivre (version 1.3) n'a pas de chemin : on y va EN TRAIN,
//   depuis la gare, une fois la quête du premier train terminée.
//
// Pour chaque lieu : ses limites, ses obstacles, ses personnages, les choses
// avec lesquelles on peut interagir, ses sorties et ses points d'arrivée.
// Comme pour la place (MONDE, dans logique.js), ce que l'on voit en 3D est
// construit à partir de ces mêmes données.
// =============================================================================

import { MONDE, obstaclesDuMonde, libelleInteraction } from './logique.js';
import { queteTerminee, queteEnCours, objetsARamasser } from './logique-quetes.js';
import { heureAffichee } from './logique-temps.js';

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
    // Les lanternes de la place (elles s'allument le soir).
    lampadaires: MONDE.lampadaires,
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
    barriere: { id: 'barriere', x: 13.2, z: 0, largeur: 0.8, profondeur: 3.2, ouverteSi: 'chemin-moulin' },
    lampadaires: [{ x: -3, z: -3.5 }, { x: 3, z: -3.5 }, { x: -3.4, z: 6.4 }],
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
      // À l'est, une ouverture pour la route de la gare (version 1.2).
      { id: 'haie-est-haut', x: 14.5, z: -5.75, largeur: 1, profondeur: 8.5 },
      { id: 'haie-est-bas', x: 14.5, z: 5.75, largeur: 1, profondeur: 8.5 },
    ],
    // La barrière de la route de la gare (ouverte après la quête de Barnabé).
    barriere: { id: 'barriere-gare', x: 13.9, z: 0, largeur: 0.5, profondeur: 3, ouverteSi: 'chemin-gare' },
    lampadaires: [{ x: -0.6, z: 2.6 }, { x: 12.2, z: 2.5 }],
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
      { id: 'barriere-gare', x: 13, z: 0, distanceInteraction: 2.2, condition: 'gare-fermee' },
    ],
    sorties: [
      { vers: 'marche', minX: -99, maxX: -13.4, minZ: -1.4, maxZ: 1.4 },
      { vers: 'gare', minX: 13.4, maxX: 99, minZ: -1.4, maxZ: 1.4, condition: 'chemin-gare' },
    ],
    arrivees: {
      marche: { x: -12.3, z: 0, orientation: Math.PI / 2 },
      gare: { x: 12.3, z: 0, orientation: -Math.PI / 2 },
    },
  },

  // --- La gare à vapeur (version 1.2) : la voie ferrée au nord, le quai, la
  // grande horloge, la locomotive, et Augustin, le chef de gare.
  gare: {
    id: 'gare',
    nom: 'La gare de Cuivrebourg',
    limites: { minX: -14, maxX: 14, minZ: -9, maxZ: 9 },
    joueur: MONDE.joueur,
    camera: { minX: -7, maxX: 7, minZ: -4, maxZ: 5 },
    haies: [
      { id: 'haie-nord', x: 0, z: -9.5, largeur: 30, profondeur: 1 },
      { id: 'haie-sud', x: 0, z: 9.5, largeur: 30, profondeur: 1 },
      // À l'ouest : l'entrée depuis le moulin (et le passage de la voie ferrée).
      { id: 'haie-ouest-haut', x: -14.5, z: -3.5, largeur: 1, profondeur: 4 },
      { id: 'haie-ouest-bas', x: -14.5, z: 5.75, largeur: 1, profondeur: 8.5 },
      // À l'est : seulement le passage de la voie ferrée.
      { id: 'haie-est', x: 14.5, z: 2.25, largeur: 1, profondeur: 15.5 },
    ],
    // La voie ferrée traverse tout le lieu, au nord. On ne marche pas dessus.
    voie: { id: 'voie', x: 0, z: -7, largeur: 30, profondeur: 2.6 },
    // Le bâtiment de la gare, à l'ouest du quai.
    batiments: [
      { id: 'gare', x: -9, z: -3, largeur: 7, profondeur: 3, murs: '#dcc4a0', toit: '#6f7d8c', enseigne: 'GARE' },
    ],
    // La grande horloge, sur un pilier au milieu du quai.
    horloge: { id: 'horloge', x: 1, z: -4.4, rayon: 0.3 },
    // La locomotive attend sur la voie, à l'est du quai (son centre).
    locomotive: { x: 6, z: -7 },
    // Le château d'eau qui remplit la chaudière de la locomotive.
    chateauEau: { id: 'chateau-eau', x: 11.6, z: -3.6, rayon: 0.95 },
    // Un banc sur le quai.
    // (Entre le quai et la voie, on laisse toujours au moins 1 m pour passer.)
    bancs: [{ id: 'banc', x: -3.4, z: -4.4, largeur: 1.5, profondeur: 0.55 }],
    lampadaires: [{ x: -4.9, z: -4.4 }, { x: 3.6, z: -4.4 }, { x: 9.4, z: -4.4 }, { x: -6, z: 1.4 }],
    arbres: [{ x: -11.5, z: 6.5 }, { x: -5.5, z: 7.3 }, { x: 4, z: 7.4 }, { x: 10.5, z: 6.8 }, { x: 12.2, z: 2.8 }],
    rayonArbre: 0.65,
    pnj: [
      { id: 'augustin', nom: 'Augustin', x: -1.3, z: -3.3, rayon: 0.45, distanceInteraction: 2.2 },
    ],
    interactifs: [
      { id: 'augustin', x: -1.3, z: -3.3, distanceInteraction: 2.2 },
      { id: 'horloge', x: 1, z: -4.4, distanceInteraction: 1.9 },
      { id: 'locomotive', x: 6, z: -5.3, distanceInteraction: 2.1 },
    ],
    sorties: [
      { vers: 'moulin', minX: -99, maxX: -13.4, minZ: -1.4, maxZ: 1.4 },
    ],
    arrivees: {
      moulin: { x: -12.3, z: 0, orientation: Math.PI / 2 },
      mine: { x: 6, z: -4.3, orientation: 0 }, // en descendant du train
    },
  },

  // --- La mine de cuivre (version 1.3) : dans les collines, au bout de la voie
  // ferrée. Une petite gare en bois, la cabane des mineurs, l'entrée de la
  // mine creusée dans les rochers, le wagonnet et Sidonie, la mineuse.
  mine: {
    id: 'mine',
    nom: 'La mine de cuivre',
    limites: { minX: -14, maxX: 14, minZ: -9, maxZ: 9 },
    joueur: MONDE.joueur,
    camera: { minX: -7, maxX: 7, minZ: -4, maxZ: 5 },
    haies: [
      { id: 'haie-nord', x: 0, z: -9.5, largeur: 30, profondeur: 1 },
      { id: 'haie-sud', x: 0, z: 9.5, largeur: 30, profondeur: 1 },
      { id: 'haie-ouest', x: -14.5, z: 0, largeur: 1, profondeur: 20 },
      { id: 'haie-est', x: 14.5, z: 0, largeur: 1, profondeur: 20 },
    ],
    voie: { id: 'voie', x: 0, z: -7, largeur: 30, profondeur: 2.6 },
    batiments: [
      { id: 'cabane', x: -9.5, z: -2.6, largeur: 6, profondeur: 3, murs: '#c4a582', toit: '#7d6a5a', enseigne: 'MINE' },
    ],
    // Le train qui attend à quai pour redescendre à Cuivrebourg (son centre).
    locomotive: { x: 1, z: -7 },
    // L'entrée de la mine, dans la colline, et les gros rochers autour.
    entree: { id: 'entree-mine', x: 10, z: -3.4, largeur: 2.6, profondeur: 1.9 },
    rochers: [
      { x: 8, z: -3.5, rayon: 1.2 },
      { x: 12.4, z: -3.3, rayon: 1.5 },
      { x: 13, z: -0.8, rayon: 1.3 },
      { x: 12.6, z: 1.2, rayon: 0.9 }, // collé au précédent : pas de passage trop étroit
    ],
    // Le wagonnet, sur ses petits rails qui sortent de la mine.
    wagonnet: { id: 'wagonnet', x: 9.6, z: 0.4, largeur: 1, profondeur: 1.5 },
    lampadaires: [{ x: -4.8, z: -4.4 }, { x: 4.6, z: -4.4 }, { x: 7, z: 1.6 }, { x: -6, z: 1.4 }],
    arbres: [{ x: -11.5, z: 6.5 }, { x: -5, z: 7.2 }, { x: 4, z: 7.2 }, { x: 9.5, z: 7 }],
    rayonArbre: 0.65,
    pnj: [
      { id: 'sidonie', nom: 'Sidonie', x: 3.4, z: -1.3, rayon: 0.45, distanceInteraction: 2.2 },
    ],
    interactifs: [
      { id: 'sidonie', x: 3.4, z: -1.3, distanceInteraction: 2.2 },
      { id: 'wagonnet', x: 9.6, z: 0.4, distanceInteraction: 2.0 },
      { id: 'train-retour', x: 1.5, z: -5.3, distanceInteraction: 2.1 },
    ],
    sorties: [],
    arrivees: {
      gare: { x: 1, z: -4.3, orientation: 0 }, // en descendant du train
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
    case 'chemin-gare': // la barrière de la gare s'ouvre après la quête de Barnabé
      return queteTerminee(etat, 'roue-moulin');
    case 'gare-fermee':
      return !queteTerminee(etat, 'roue-moulin');
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
  (z.bancs || []).forEach(ajouterRect);
  if (z.canal) ajouterRect(z.canal);
  if (z.voie) ajouterRect(z.voie);
  if (z.entree) ajouterRect(z.entree);
  if (z.wagonnet) ajouterRect(z.wagonnet);
  (z.rochers || []).forEach((r, i) => liste.push({ type: 'cercle', id: `rocher-${i + 1}`, x: r.x, z: r.z, rayon: r.rayon }));
  // Une barrière (arbre tombé, barrière de la gare) bloque tant qu'elle n'est pas ouverte.
  if (z.barriere && !conditionRemplie(etat, z.barriere.ouverteSi)) ajouterRect(z.barriere);
  for (const c of [z.fontaine, z.mecanisme, z.horloge, z.chateauEau].filter(Boolean)) liste.push({ type: 'cercle', id: c.id, x: c.x, z: c.z, rayon: c.rayon });
  (z.lampadaires || []).forEach((l, i) => liste.push({ type: 'cercle', id: `lampadaire-${i + 1}`, x: l.x, z: l.z, rayon: RAYON_LAMPADAIRE }));
  for (const p of z.pnj || []) liste.push({ type: 'cercle', id: p.id, x: p.x, z: p.z, rayon: p.rayon });
  (z.arbres || []).forEach((a, i) => liste.push({ type: 'cercle', id: `arbre-${i + 1}`, x: a.x, z: a.z, rayon: z.rayonArbre }));
  return liste;
}

// Le pied d'une lanterne : on ne passe pas au travers.
export const RAYON_LAMPADAIRE = 0.2;

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
  if (cible === 'barriere-gare') return 'La route de la gare';
  // Un objet du décor que la quête en cours demande d'utiliser ?
  const enCours = queteEnCours(etat);
  const aUtiliser = enCours && enCours.etape.type === 'utiliser' && enCours.etape.cible === cible;
  if (cible === 'mecanisme') return aUtiliser ? "Installer l'axe" : 'Le mécanisme de la roue';
  if (cible === 'horloge') return aUtiliser ? 'Réparer l\'horloge' : "L'horloge de la gare";
  if (cible === 'locomotive') {
    if (aUtiliser) return 'Installer le sifflet';
    return voyageTrain(etat, 'gare') ? 'Monter dans le train (vers la mine)' : 'La locomotive';
  }
  if (cible === 'train-retour') return 'Rentrer à Cuivrebourg en train';
  if (cible === 'wagonnet') return aUtiliser ? 'Poser la roue neuve' : 'Le wagonnet';
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
  if (!queteTerminee(etat, 'lampe-odile')) {
    repliques = [
      'Bonjour ! Moi, c\'est Léon, le facteur. Vous êtes le nouvel artisan ?',
      'Odile, sur la place, cherche quelqu\'un pour réparer sa lampe. Allez la voir !',
    ];
  } else if (!queteTerminee(etat, 'balance-capucine')) {
    repliques = [
      'Bonjour, Ferrus ! Moi, c\'est Léon, le facteur. Je connais tout le monde ici.',
      'Capucine, à son étal, a un souci avec sa balance. Allez donc la voir !',
    ];
  } else if (!queteTerminee(etat, 'roue-moulin')) {
    repliques = [
      "Le chemin du moulin est enfin dégagé ! Il part à l'est du marché.",
      'Barnabé, le meunier, a bien besoin de vous : sa roue ne tourne plus.',
    ];
  } else if (!queteTerminee(etat, 'horloge-gare')) {
    repliques = [
      "La route de la gare est rouverte, à l'est du moulin ! J'y passe chercher le courrier.",
      "Augustin, le chef de gare, a bien besoin d'un artisan : sa grande horloge s'est arrêtée.",
    ];
  } else if (!queteTerminee(etat, 'train-cuivrebourg')) {
    repliques = [
      "L'horloge de la gare donne de nouveau l'heure ! Il ne manque plus que le train…",
      'Augustin dit que la locomotive a juste besoin d\'un sifflet neuf.',
    ];
  } else if (!queteTerminee(etat, 'wagonnet-mine')) {
    repliques = [
      "Le train monte jusqu'à la mine de cuivre, dans les collines ! Montez-y depuis la gare.",
      'Sidonie, la mineuse, a des ennuis avec son wagonnet, paraît-il.',
    ];
  } else {
    repliques = [
      'Le train m\'apporte des lettres de partout ! Elles disent toutes : « Cuivrebourg revit ! »',
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
  if (cible === 'barriere-gare') {
    return ['La barrière de la route de la gare est fermée. Barnabé, le meunier, sait peut-être pourquoi.'];
  }
  if (cible === 'horloge') {
    if (horlogeReparee(etat)) return [`L'horloge de la gare indique ${heureAffichee(etat.journee)}.`];
    return ["La grande horloge est arrêtée à quatre heures dix. Il lui manque des rouages et un régulateur."];
  }
  if (cible === 'wagonnet') {
    if (wagonnetRepare(etat)) return ['Le wagonnet est plein de beau cuivre, prêt à descendre en ville.'];
    return ['Le wagonnet a déraillé : il lui manque une roue.'];
  }
  if (cible === 'train-retour') return ['Le train attend à quai.'];
  if (cible === 'locomotive') {
    if (queteTerminee(etat, 'train-cuivrebourg')) return ['Le train de Cuivrebourg roule de nouveau !'];
    return ['Une belle locomotive, froide et silencieuse. Son vieux sifflet est tout rouillé.'];
  }
  return [];
}

// Le voyage en train (version 1.3) : depuis la gare, le train mène à la mine ;
// depuis la mine, il ramène à la gare. Possible seulement une fois la quête du
// premier train terminée. Renvoie { zone, x, z, orientation } ou null.
export function voyageTrain(etat, depuis) {
  if (!queteTerminee(etat, 'train-cuivrebourg')) return null;
  const vers = { gare: 'mine', mine: 'gare' }[depuis];
  if (!vers) return null;
  const a = ZONES[vers].arrivees[depuis];
  return { zone: vers, x: a.x, z: a.z, orientation: a.orientation };
}

// Le wagonnet de la mine est-il réparé ? (dès que la roue neuve est posée)
export function wagonnetRepare(etat) {
  if (queteTerminee(etat, 'wagonnet-mine')) return true;
  const enCours = queteEnCours(etat);
  return Boolean(enCours && enCours.id === 'wagonnet-mine' && enCours.etape.type === 'parler');
}

// L'horloge de la gare est-elle réparée ? (dès que le régulateur est installé)
export function horlogeReparee(etat) {
  if (queteTerminee(etat, 'horloge-gare')) return true;
  const enCours = queteEnCours(etat);
  return Boolean(enCours && enCours.id === 'horloge-gare' && enCours.etape.type === 'parler');
}

// La locomotive est-elle prête ? (dès que le sifflet est installé : elle fume)
export function locomotiveEnMarche(etat) {
  if (queteTerminee(etat, 'train-cuivrebourg')) return true;
  const enCours = queteEnCours(etat);
  return Boolean(enCours && enCours.id === 'train-cuivrebourg' && enCours.etape.type === 'parler');
}
