// =============================================================================
// logique-photo.js — LE MODE PHOTO (version 1.6), sans aucune 3D
// -----------------------------------------------------------------------------
// On fige le temps, on tourne la caméra librement autour de Ferrus, et on
// prend une photo. Les photos sont rangées dans l'album (12 au plus : la plus
// ancienne laisse sa place) et peuvent être téléchargées.
// Ce fichier fait les calculs (la caméra, la liste des photos). Il ne touche
// ni à la 3D, ni au navigateur : il est testé avec « node --test ».
// =============================================================================

export const CLE_PHOTOS = 'atelier-cuivrebourg-photos';
export const MAX_PHOTOS = 12;

// Les limites de la caméra libre : elle ne passe jamais sous le sol, ni trop
// près, ni trop loin.
export const LIMITES_PHOTO = Object.freeze({ hauteurMin: 0.12, hauteurMax: 1.35, distanceMin: 3.5, distanceMax: 28 });

// La caméra photo démarre là où était la caméra du jeu (au sud, en hauteur).
export function creerCameraPhoto() {
  return { angle: 0, hauteur: Math.atan2(15, 12.5), distance: Math.hypot(15, 12.5) };
}

// Tourner (angle), monter ou descendre (hauteur), avancer ou reculer (distance).
export function bougerCameraPhoto(cam, dAngle = 0, dHauteur = 0, dDistance = 0) {
  const l = LIMITES_PHOTO;
  cam.angle = (cam.angle + dAngle) % (Math.PI * 2);
  cam.hauteur = Math.min(l.hauteurMax, Math.max(l.hauteurMin, cam.hauteur + dHauteur));
  cam.distance = Math.min(l.distanceMax, Math.max(l.distanceMin, cam.distance + dDistance));
  return cam;
}

// La position de la caméra autour du point visé { x, y, z }.
export function positionCameraPhoto(cam, cible) {
  const horizontal = Math.cos(cam.hauteur) * cam.distance;
  return {
    x: cible.x + Math.sin(cam.angle) * horizontal,
    y: Math.max(0.6, cible.y + Math.sin(cam.hauteur) * cam.distance),
    z: cible.z + Math.cos(cam.angle) * horizontal,
  };
}

// Relit la liste des photos enregistrées (tout ce qui est abîmé est ignoré).
export function lirePhotos(texte) {
  let liste;
  try {
    liste = JSON.parse(texte);
  } catch {
    return [];
  }
  if (!Array.isArray(liste)) return [];
  return liste
    .filter((p) => p && typeof p.image === 'string' && p.image.startsWith('data:image/') && typeof p.date === 'string')
    .map((p) => ({ image: p.image, date: p.date, lieu: typeof p.lieu === 'string' ? p.lieu : '' }))
    .slice(0, MAX_PHOTOS);
}

// Ajoute une photo en tête de liste (la plus récente d'abord).
export function ajouterPhoto(liste, photo) {
  return [photo, ...liste].slice(0, MAX_PHOTOS);
}

// Le nom du fichier téléchargé : « cuivrebourg-photo-2026-11-07-1432.jpg ».
export function nomFichierPhoto(date) {
  const d = date instanceof Date ? date : new Date(date);
  const deux = (n) => String(n).padStart(2, '0');
  return `cuivrebourg-photo-${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}-${deux(d.getHours())}${deux(d.getMinutes())}.jpg`;
}

// La date d'une photo, en clair : « 7/11/2026 à 14 h 32 ».
export function dateLisible(texte) {
  const d = new Date(texte);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
}
