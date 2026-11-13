// =============================================================================
// logique-reglages.js — LES OPTIONS DU JOUEUR (étape 4)
// -----------------------------------------------------------------------------
// Musique, petits sons, qualité de l'image, cycle du jour et de la nuit,
// saisons (version 1.4), météo (version 1.5), taille du texte et petit jeu
// d'assemblage (version 1.6). Les réglages sont enregistrés à
// part de la partie : « Nouvelle partie » ne les efface pas.
//
// Confort avant tout : la musique et les sons sont COUPÉS au départ. C'est le
// joueur qui choisit de les activer, dans les options.
//
// Ce fichier ne touche pas au navigateur : main.js lit et écrit le texte.
// Il peut donc être testé avec « node --test ».
// =============================================================================

// Le numéro de version du jeu (le même que dans package.json et sw.js).
export const VERSION_JEU = '1.7.1';

export const CLE_REGLAGES = 'atelier-cuivrebourg-reglages';

// Les volumes vont de 1 (très doux) à 5 (le plus fort, qui reste modéré).
export const NIVEAUX_VOLUME = 5;

export const QUALITES = {
  elevee: { nom: 'Élevée', detail: 'Pour un ordinateur ou un téléphone récent : image très fine, ombres plus précises, halo lumineux autour des lanternes.' },
  normale: { nom: 'Normale', detail: 'Image fine et ombres douces.' },
  economie: { nom: 'Économie', detail: 'Pour un téléphone qui chauffe ou se décharge vite : image moins fine, sans ombres, 30 images par seconde.' },
};

// Les tailles du texte (version 1.6) : le texte de l'interface est multiplié
// par ce nombre.
export const TAILLES_TEXTE = {
  normal: { nom: 'Normal', echelle: 1 },
  grand: { nom: 'Grand', echelle: 1.15 },
  'tres-grand': { nom: 'Très grand', echelle: 1.3 },
};

export function creerReglages() {
  return {
    musique: false,   // coupée au départ
    volumeMusique: 3,
    sons: false,      // coupés au départ
    volumeSons: 3,
    qualite: 'normale',
    jourNuit: true,   // le jour et la nuit se succèdent (version 1.2) ; sinon, toujours le jour
    saisons: true,    // les saisons se succèdent (version 1.4) ; sinon, toujours l'été
    meteo: true,      // pluie douce et brume du matin (version 1.5) ; sinon, toujours beau
    texte: 'normal',  // la taille du texte (version 1.6)
    assemblage: true, // proposer le petit jeu d'assemblage pour les objets rares (version 1.6)
  };
}

// Relit les réglages enregistrés. Tout ce qui est abîmé reprend sa valeur
// par défaut : on ne renvoie jamais de réglage impossible.
export function lireReglages(texte) {
  const reglages = creerReglages();
  let lu;
  try {
    lu = JSON.parse(texte);
  } catch {
    return reglages;
  }
  if (lu === null || typeof lu !== 'object' || Array.isArray(lu)) return reglages;
  if (typeof lu.musique === 'boolean') reglages.musique = lu.musique;
  if (typeof lu.sons === 'boolean') reglages.sons = lu.sons;
  if (typeof lu.jourNuit === 'boolean') reglages.jourNuit = lu.jourNuit;
  if (typeof lu.saisons === 'boolean') reglages.saisons = lu.saisons;
  if (typeof lu.meteo === 'boolean') reglages.meteo = lu.meteo;
  if (typeof lu.assemblage === 'boolean') reglages.assemblage = lu.assemblage;
  if (typeof lu.texte === 'string' && TAILLES_TEXTE[lu.texte]) reglages.texte = lu.texte;
  for (const cle of ['volumeMusique', 'volumeSons']) {
    if (Number.isInteger(lu[cle])) reglages[cle] = Math.min(NIVEAUX_VOLUME, Math.max(1, lu[cle]));
  }
  if (typeof lu.qualite === 'string' && QUALITES[lu.qualite]) reglages.qualite = lu.qualite;
  return reglages;
}

export function ecrireReglages(reglages) {
  return JSON.stringify(reglages);
}

// Monte ou baisse un volume d'un cran (sens = +1 ou -1), sans sortir de 1 à 5.
export function changerVolume(reglages, cle, sens) {
  reglages[cle] = Math.min(NIVEAUX_VOLUME, Math.max(1, reglages[cle] + sens));
  return reglages[cle];
}

// Le volume réel (entre 0 et 1) pour un niveau de 1 à 5. La courbe monte
// doucement : le niveau 1 est à peine audible, le niveau 5 reste modéré.
export function volumeReel(niveau) {
  const n = Math.min(NIVEAUX_VOLUME, Math.max(1, niveau));
  return Number(((n / NIVEAUX_VOLUME) ** 2).toFixed(3));
}

// Ce que la qualité choisie change pour l'affichage.
export function parametresQualite(qualite, densitePixels) {
  if (qualite === 'economie') return { pixelRatio: 1, ombres: false, imagesParSeconde: 30 };
  // Version 1.7 : « Élevée » = image plus fine, ombres plus précises, et les
  // effets de lumière (voir effets.js).
  if (qualite === 'elevee') return { pixelRatio: Math.min(densitePixels || 1, 2), ombres: true, imagesParSeconde: 60, ombresFines: true, effets: true };
  return { pixelRatio: Math.min(densitePixels || 1, 1.5), ombres: true, imagesParSeconde: 60 };
}
