// =============================================================================
// formes.js — des formes de base aux bords ARRONDIS (version 1.1)
// -----------------------------------------------------------------------------
// Three.js sait dessiner des boîtes, des cylindres… mais avec des arêtes
// vives, ce qui donne un aspect très « carré ». Ici, on fabrique les mêmes
// formes avec des coins et des bords arrondis, pour un style plus doux,
// comme des jouets en bois.
//
// Ce fichier ne touche pas au navigateur : il peut être testé avec
// « node --test ».
// =============================================================================

import * as THREE from '../lib/three/three.module.js';

// -----------------------------------------------------------------------------
// Une BOÎTE aux coins arrondis.
//   largeur, hauteur, profondeur : la taille (comme une boîte normale) ;
//   rayon : l'arrondi des coins (choisi tout seul si on ne le donne pas) ;
//   segments : le nombre de petites facettes dans chaque arrondi (choisi tout
//              seul : 2 pour un grand arrondi, 1 pour un petit, qui suffit).
//
// Comment ça marche : on part d'une boîte découpée en petits carreaux, on
// resserre ces carreaux près des bords, puis on « gonfle » chaque coin pour
// qu'il devienne un morceau de boule.
// -----------------------------------------------------------------------------
export function boite(largeur, hauteur, profondeur, rayon, segments) {
  const plusPetit = Math.min(largeur, hauteur, profondeur);
  // L'arrondi ne peut pas dépasser la moitié de la plus petite dimension.
  const voulu = rayon ?? Math.min(0.12, plusPetit * 0.25);
  const r = Math.min(voulu, plusPetit / 2 - 0.001);
  if (!(r > 0.003)) return new THREE.BoxGeometry(largeur, hauteur, profondeur);
  segments = segments ?? (r >= 0.05 ? 2 : 1);

  const n = segments * 2 + 1; // des carreaux pour chaque arrondi, un seul pour le plat
  const forme = new THREE.BoxGeometry(1, 1, 1, n, n, n);
  const position = forme.attributes.position;
  const normale = forme.attributes.normal;
  const demi = [largeur / 2, hauteur / 2, profondeur / 2];
  const interieur = [0, 0, 0];
  const ecart = [0, 0, 0];

  for (let i = 0; i < position.count; i++) {
    let longueur = 0;
    for (let axe = 0; axe < 3; axe++) {
      // Le numéro du carreau le long de cet axe (de 0 à n).
      const k = Math.round((position.getComponent(i, axe) + 0.5) * n);
      // Les carreaux 0 à « segments » vont dans l'arrondi du début, les autres
      // dans celui de la fin : le grand carreau du milieu fait la partie plate.
      const v = k <= segments
        ? -demi[axe] + r * (k / segments)
        : demi[axe] - r * ((n - k) / segments);
      interieur[axe] = Math.min(demi[axe] - r, Math.max(-demi[axe] + r, v));
      ecart[axe] = v - interieur[axe];
      longueur += ecart[axe] * ecart[axe];
    }
    longueur = Math.sqrt(longueur);
    // On pousse le point à la distance « r » de la boîte intérieure : les coins
    // deviennent ronds, les faces restent plates.
    for (let axe = 0; axe < 3; axe++) {
      const direction = ecart[axe] / longueur;
      position.setComponent(i, axe, interieur[axe] + direction * r);
      normale.setComponent(i, axe, direction);
    }
  }
  return forme;
}

// -----------------------------------------------------------------------------
// Un CYLINDRE aux bords arrondis (comme un galet ou un tonneau poli).
//   rayonHaut, rayonBas, hauteur : comme un cylindre normal ;
//   segments : le nombre de côtés (16 = bien rond) ;
//   bord : l'arrondi des bords (choisi tout seul si on ne le donne pas).
//
// On dessine la moitié du profil (comme un dessin de vase vu de côté), puis on
// le fait tourner autour de l'axe : c'est un « tour » de potier.
// -----------------------------------------------------------------------------
export function cylindre(rayonHaut, rayonBas, hauteur, segments = 16, bord) {
  const b = bord ?? Math.min(0.06, hauteur * 0.25, Math.min(rayonHaut, rayonBas) * 0.35);
  if (!(b > 0.004)) return new THREE.CylinderGeometry(rayonHaut, rayonBas, hauteur, segments);
  const h = hauteur / 2;
  const pas = b > 0.03 ? 3 : 2; // facettes dans chaque arrondi
  const profil = [new THREE.Vector2(0, -h)];
  // L'arrondi du bas (un quart de cercle).
  for (let i = 0; i <= pas; i++) {
    const angle = -Math.PI / 2 + (i / pas) * (Math.PI / 2);
    profil.push(new THREE.Vector2(rayonBas - b + Math.cos(angle) * b, -h + b + Math.sin(angle) * b));
  }
  // L'arrondi du haut.
  for (let i = 0; i <= pas; i++) {
    const angle = (i / pas) * (Math.PI / 2);
    profil.push(new THREE.Vector2(rayonHaut - b + Math.cos(angle) * b, h - b + Math.sin(angle) * b));
  }
  profil.push(new THREE.Vector2(0, h));
  return normaliser(new THREE.LatheGeometry(profil, segments));
}

// -----------------------------------------------------------------------------
// Une forme « tournée » à partir d'un profil [[rayon, hauteur], …] (du bas
// vers le haut). Sert pour les bustes, les robes, les sacs de farine…
// -----------------------------------------------------------------------------
export function tour(points, segments = 18) {
  return normaliser(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments));
}

// Les « normales » disent dans quelle direction regarde chaque point de la
// surface (c'est ce qui permet à la lumière de glisser en douceur). Three.js
// en laisse parfois une trop courte au sommet d'une forme tournée : on les
// remet toutes à la bonne longueur (1).
function normaliser(forme) {
  const n = forme.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    v.fromBufferAttribute(n, i).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  return forme;
}

// Une boule bien ronde.
export function boule(rayon, details = 2) {
  return new THREE.IcosahedronGeometry(rayon, details);
}

// Une « gélule » : un cylindre terminé par deux demi-boules (bras, jambes).
// « longueur » est celle de la partie droite, sans les deux bouts ronds.
export function gelule(rayon, longueur, cotes = 12) {
  return new THREE.CapsuleGeometry(rayon, Math.max(0.001, longueur), 4, cotes);
}
