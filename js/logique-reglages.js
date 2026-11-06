// =============================================================================
// logique-reglages.js — LES OPTIONS DU JOUEUR (étape 4)
// -----------------------------------------------------------------------------
// Musique, petits sons, qualité de l'image, cycle du jour et de la nuit,
// saisons (version 1.4). Les réglages sont enregistrés à
// part de la partie : « Nouvelle partie » ne les efface pas.
//
// Confort avant tout : la musique et les sons sont COUPÉS au départ. C'est le
// joueur qui choisit de les activer, dans les options.
//
// Ce fichier ne touche pas au navigateur : main.js lit et écrit le texte.
// Il peut donc être testé avec « node --test ».
// =============================================================================

// Le numéro de version du jeu (le même que dans package.json et sw.js).
export const VERSION_JEU = '1.4.0';

export const CLE_REGLAGES = 'atelier-cuivrebourg-reglages';

// Les volumes vont de 1 (très doux) à 5 (le plus fort, qui reste modéré).
export const NIVEAUX_VOLUME = 5;

export const QUALITES = {
  normale: { nom: 'Normale', detail: 'Image fine et ombres douces.' },
  economie: { nom: 'Économie', detail: 'Pour un téléphone qui chauffe ou se décharge vite : image moins fine, sans ombres, 30 images par seconde.' },
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
  return { pixelRatio: Math.min(densitePixels || 1, 1.5), ombres: true, imagesParSeconde: 60 };
}
