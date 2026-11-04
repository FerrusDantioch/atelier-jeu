// =============================================================================
// personnages.js — Ferrus et Odile, en formes simples
// -----------------------------------------------------------------------------
// Chaque personnage est un « groupe » : plusieurs formes assemblées (corps,
// tête, bras, jambes…). Bouger le groupe fait bouger tout le personnage.
// Par défaut, un personnage regarde vers le sud (vers la caméra, l'axe +z).
// Les personnages projettent une ombre (contrairement au décor léger).
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { matiere } from './decor.js';

// Ajoute une forme au groupe, avec ombre portée.
function piece(parent, forme, couleur, x, y, z) {
  const m = new THREE.Mesh(forme, matiere(couleur));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Un membre (bras ou jambe) qui pivote depuis le haut (l'épaule ou la hanche).
// On place la forme sous un point de rotation : en tournant ce point, le
// membre se balance comme un vrai bras.
function membre(parent, largeur, longueur, couleur, x, y, z, couleurBout, tailleBout) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  piece(pivot, new THREE.BoxGeometry(largeur, longueur, largeur), couleur, 0, -longueur / 2, 0);
  if (couleurBout) piece(pivot, new THREE.BoxGeometry(tailleBout[0], tailleBout[1], tailleBout[2]), couleurBout, 0, -longueur, tailleBout[3] || 0);
  parent.add(pivot);
  return pivot;
}

// -----------------------------------------------------------------------------
// FERRUS DANTIOCH : artisan-ingénieur, tablier de cuir et lunettes d'artisan.
// -----------------------------------------------------------------------------
export function creerFerrus() {
  const ferrus = new THREE.Group();
  const corps = new THREE.Group(); // tout sauf les jambes (pour un léger balancement)
  ferrus.add(corps);

  const peau = '#e6bf9c';
  const chemise = '#e4d5b7';
  const cuir = '#8a5a3a';
  const pantalon = '#4c3d35';
  const bottes = '#3a2a20';
  const cheveux = '#5b3e2c';
  const cuivre = '#c47f3c';

  // Les jambes (avec les bottes).
  const jambeG = membre(ferrus, 0.19, 0.58, pantalon, -0.12, 0.62, 0, bottes, [0.22, 0.12, 0.3, 0.04]);
  const jambeD = membre(ferrus, 0.19, 0.58, pantalon, 0.12, 0.62, 0, bottes, [0.22, 0.12, 0.3, 0.04]);

  // Le buste, la ceinture à outils et le tablier de cuir.
  piece(corps, new THREE.CylinderGeometry(0.26, 0.3, 0.72, 8), chemise, 0, 0.98, 0);
  piece(corps, new THREE.CylinderGeometry(0.31, 0.31, 0.1, 8), '#4a3226', 0, 0.7, 0);
  piece(corps, new THREE.BoxGeometry(0.1, 0.08, 0.05), '#c99a4a', 0, 0.7, 0.3);
  piece(corps, new THREE.BoxGeometry(0.42, 0.62, 0.05), cuir, 0, 0.83, 0.28);
  piece(corps, new THREE.BoxGeometry(0.08, 0.14, 0.06), '#6b6660', -0.3, 0.62, 0.12); // une clé à molette à la ceinture

  // Les bras (avec les mains).
  const brasG = membre(corps, 0.14, 0.56, chemise, -0.36, 1.28, 0, peau, [0.13, 0.13, 0.13]);
  const brasD = membre(corps, 0.14, 0.56, chemise, 0.36, 1.28, 0, peau, [0.13, 0.13, 0.13]);

  // La tête, les cheveux et une barbe courte.
  piece(corps, new THREE.IcosahedronGeometry(0.24, 1), peau, 0, 1.58, 0);
  const coiffe = piece(corps, new THREE.SphereGeometry(0.255, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), cheveux, 0, 1.62, -0.02);
  coiffe.scale.set(1, 0.85, 1);
  piece(corps, new THREE.BoxGeometry(0.3, 0.12, 0.12), cheveux, 0, 1.43, 0.14);

  // Les lunettes d'artisan : une sangle autour de la tête, deux verres cerclés de cuivre.
  const sangle = piece(corps, new THREE.TorusGeometry(0.245, 0.03, 4, 16), '#3e2c22', 0, 1.62, 0);
  sangle.rotation.x = Math.PI / 2;
  for (const cote of [-1, 1]) {
    const cercle = piece(corps, new THREE.CylinderGeometry(0.085, 0.085, 0.09, 10), cuivre, cote * 0.1, 1.62, 0.22);
    cercle.rotation.x = Math.PI / 2;
    const verre = piece(corps, new THREE.CylinderGeometry(0.062, 0.062, 0.02, 10), '#6f9e9b', cote * 0.1, 1.62, 0.27);
    verre.rotation.x = Math.PI / 2;
  }

  ferrus.userData = { corps, jambeG, jambeD, brasG, brasD, phase: 0 };
  return ferrus;
}

// Anime la marche de Ferrus. « vitesse » = sa vitesse actuelle (0 = immobile).
export function animerFerrus(ferrus, vitesse, dt) {
  const d = ferrus.userData;
  const enMarche = vitesse > 0.2;
  // La « phase » avance avec la distance parcourue : les pas suivent la vitesse.
  if (enMarche) d.phase += dt * vitesse * 2.4;
  // Amplitude du balancement : on l'adoucit pour éviter les à-coups.
  const cible = enMarche ? Math.min(1, vitesse / 4) : 0;
  d.amplitude = (d.amplitude || 0) + (cible - (d.amplitude || 0)) * Math.min(1, dt * 10);
  const angle = Math.sin(d.phase) * 0.6 * d.amplitude;
  d.jambeG.rotation.x = angle;
  d.jambeD.rotation.x = -angle;
  d.brasG.rotation.x = -angle * 0.8;
  d.brasD.rotation.x = angle * 0.8;
  // Un tout petit rebond du buste à chaque pas (très léger).
  d.corps.position.y = Math.abs(Math.sin(d.phase)) * 0.035 * d.amplitude;
}

// -----------------------------------------------------------------------------
// ODILE : une habitante âgée, robe lavande, châle et chignon gris.
// -----------------------------------------------------------------------------
export function creerOdile() {
  const odile = new THREE.Group();
  const corps = new THREE.Group();
  odile.add(corps);

  const peau = '#eec7a8';
  const robe = '#8f80a0';
  const chale = '#c9a37b';
  const cheveux = '#cdc6bd';

  piece(corps, new THREE.CylinderGeometry(0.22, 0.46, 0.98, 9), robe, 0, 0.49, 0);
  piece(corps, new THREE.CylinderGeometry(0.19, 0.23, 0.42, 8), robe, 0, 1.17, 0);
  piece(corps, new THREE.CylinderGeometry(0.25, 0.3, 0.2, 8), chale, 0, 1.3, 0);
  // Les bras repliés devant elle (comme si elle tenait ses mains).
  for (const cote of [-1, 1]) {
    const bras = piece(corps, new THREE.BoxGeometry(0.12, 0.42, 0.12), chale, cote * 0.27, 1.1, 0.08);
    bras.rotation.x = -0.5;
    bras.rotation.z = cote * 0.15;
  }
  piece(corps, new THREE.IcosahedronGeometry(0.11, 0), peau, 0, 0.93, 0.25);
  // La tête, les cheveux gris et le chignon.
  piece(corps, new THREE.IcosahedronGeometry(0.22, 1), peau, 0, 1.6, 0);
  const coiffe = piece(corps, new THREE.SphereGeometry(0.235, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), cheveux, 0, 1.63, -0.02);
  coiffe.scale.set(1, 0.9, 1);
  piece(corps, new THREE.IcosahedronGeometry(0.12, 0), cheveux, 0, 1.85, -0.1);
  // De petites lunettes rondes.
  for (const cote of [-1, 1]) {
    const lunette = piece(corps, new THREE.TorusGeometry(0.05, 0.012, 4, 10), '#8a5427', cote * 0.08, 1.6, 0.2);
    lunette.rotation.y = 0;
  }

  odile.userData = { corps, temps: 0 };
  return odile;
}

// Odile respire doucement (presque invisible : juste pour qu'elle ait l'air vivante).
export function animerOdile(odile, dt) {
  const d = odile.userData;
  d.temps += dt;
  d.corps.scale.y = 1 + Math.sin(d.temps * 1.6) * 0.008;
}
