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

// Un membre (bras ou jambe) en DEUX morceaux, comme un vrai membre :
//   - le haut (cuisse ou bras) pivote depuis la hanche ou l'épaule ;
//   - le bas (tibia ou avant-bras) pivote depuis le genou ou le coude.
// On place chaque forme sous son point de rotation : en tournant ce point, le
// morceau se balance. Renvoie le pivot du haut ; celui du bas est rangé dans
// « pivot.userData.articulation ».
function membre(parent, largeur, longueur, couleur, x, y, z, couleurBout, tailleBout) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const haut = longueur * 0.52;
  const bas = longueur - haut;
  piece(pivot, new THREE.BoxGeometry(largeur, haut + 0.02, largeur), couleur, 0, -haut / 2, 0);
  const articulation = new THREE.Group();
  articulation.position.y = -haut;
  pivot.add(articulation);
  piece(articulation, new THREE.BoxGeometry(largeur * 0.92, bas, largeur * 0.92), couleur, 0, -bas / 2, 0);
  if (couleurBout) piece(articulation, new THREE.BoxGeometry(tailleBout[0], tailleBout[1], tailleBout[2]), couleurBout, 0, -bas, tailleBout[3] || 0);
  pivot.userData.articulation = articulation;
  parent.add(pivot);
  return pivot;
}

// -----------------------------------------------------------------------------
// FERRUS DANTIOCH : artisan-ingénieur, tablier de cuir et lunettes d'artisan.
// -----------------------------------------------------------------------------
export function creerFerrus() {
  const ferrus = new THREE.Group();
  // « silhouette » porte tout le personnage (pour le petit rebond de la marche) ;
  // « corps » porte tout sauf les jambes (pour que le buste tourne un peu).
  const silhouette = new THREE.Group();
  ferrus.add(silhouette);
  const corps = new THREE.Group();
  silhouette.add(corps);

  const peau = '#e6bf9c';
  const chemise = '#e4d5b7';
  const cuir = '#8a5a3a';
  const pantalon = '#4c3d35';
  const bottes = '#3a2a20';
  const cheveux = '#5b3e2c';
  const cuivre = '#c47f3c';

  // Les jambes (avec les bottes).
  const jambeG = membre(silhouette, 0.19, 0.58, pantalon, -0.12, 0.62, 0, bottes, [0.22, 0.12, 0.3, 0.04]);
  const jambeD = membre(silhouette, 0.19, 0.58, pantalon, 0.12, 0.62, 0, bottes, [0.22, 0.12, 0.3, 0.04]);

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

  ferrus.userData = { silhouette, corps, jambeG, jambeD, brasG, brasD, phase: 0 };
  return ferrus;
}

// Anime la marche de Ferrus (et des habitants). « vitesse » = sa vitesse
// actuelle (0 = immobile).
//
// Pour une démarche naturelle (et pas « robot »), plusieurs mouvements doux
// se combinent, tous réglés sur la même « phase » (le rythme des pas) :
//   - les jambes se balancent, et le genou se plie quand la jambe revient
//     vers l'avant (le pied ne racle pas le sol) ;
//   - les bras se balancent à l'opposé des jambes, coudes un peu pliés ;
//   - le corps monte un peu entre deux pas, et redescend quand le pied se pose ;
//   - les épaules tournent légèrement à l'opposé des hanches ;
//   - le buste se penche à peine vers l'avant.
// À l'arrêt, le personnage respire doucement et ses bras bougent à peine.
export function animerFerrus(ferrus, vitesse, dt) {
  const d = ferrus.userData;
  const enMarche = vitesse > 0.2;
  // La « phase » avance avec la distance parcourue : les pas suivent la vitesse.
  if (enMarche) d.phase += dt * vitesse * 1.9;
  d.repos = (d.repos || 0) + dt;
  // L'amplitude (0 = immobile, 1 = pleine marche) varie en douceur : pas d'à-coup
  // au départ ni à l'arrêt.
  const cible = enMarche ? Math.min(1, vitesse / 4) : 0;
  d.amplitude = (d.amplitude || 0) + (cible - (d.amplitude || 0)) * Math.min(1, dt * 7);
  const a = d.amplitude;
  const s = Math.sin(d.phase);
  const c = Math.cos(d.phase);

  // Les jambes : la gauche avance quand s > 0, la droite à l'opposé.
  d.jambeG.rotation.x = -s * 0.5 * a;
  d.jambeD.rotation.x = s * 0.5 * a;
  // Les genoux se plient pendant que la jambe revient vers l'avant.
  d.jambeG.userData.articulation.rotation.x = (0.08 + 0.85 * Math.max(0, c)) * a;
  d.jambeD.userData.articulation.rotation.x = (0.08 + 0.85 * Math.max(0, -c)) * a;

  // Les bras, à l'opposé des jambes ; le coude plie davantage quand le bras avance.
  const souffle = Math.sin(d.repos * 1.7);
  d.brasG.rotation.x = s * 0.45 * a + souffle * 0.03 * (1 - a);
  d.brasD.rotation.x = -s * 0.45 * a - souffle * 0.03 * (1 - a);
  d.brasG.rotation.z = -0.07;
  d.brasD.rotation.z = 0.07;
  d.brasG.userData.articulation.rotation.x = -0.18 - (0.1 + 0.4 * Math.max(0, -s)) * a;
  d.brasD.userData.articulation.rotation.x = -0.18 - (0.1 + 0.4 * Math.max(0, s)) * a;

  // Le corps entier monte un peu entre deux pas (deux fois par cycle).
  if (d.silhouette) {
    d.silhouette.position.y = (0.5 + 0.5 * Math.cos(2 * d.phase)) * 0.045 * a;
    d.silhouette.rotation.z = s * 0.025 * a; // un tout petit roulis d'un pied sur l'autre
  }
  // Les épaules tournent un peu à l'opposé des hanches ; le buste se penche à peine.
  d.corps.rotation.y = s * 0.12 * a;
  d.corps.rotation.x = 0.05 * a;
  // À l'arrêt : une respiration presque invisible.
  d.corps.scale.y = 1 + souffle * 0.006 * (1 - a);
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

// -----------------------------------------------------------------------------
// LES HABITANTS (clients de l'atelier, étape 2)
// -----------------------------------------------------------------------------
// Même gabarit que Ferrus, mais avec des tenues et des chapeaux variés.
// « numero » choisit la tenue : chaque client a donc toujours la même allure.
const TENUES = [
  { peau: '#e8c3a0', haut: '#7d8fa6', bas: '#4f4a45', cheveux: '#6b4a33', chapeau: 'haut-de-forme', couleurChapeau: '#4a4240' },
  { peau: '#d9a882', haut: '#b0786a', bas: '#5a4d42', cheveux: '#2f2723', chapeau: 'beret', couleurChapeau: '#6f7f5c', jupe: '#8a6a5e' },
  { peau: '#f0cdb0', haut: '#9c8bb0', bas: '#4c4652', cheveux: '#b9864f', chapeau: 'aucun' },
  { peau: '#c99674', haut: '#8aa07a', bas: '#55493f', cheveux: '#3a2c24', chapeau: 'casquette', couleurChapeau: '#5b6a78' },
  { peau: '#efc6a6', haut: '#c9a36a', bas: '#5c4a3c', cheveux: '#d8d0c4', chapeau: 'aucun', jupe: '#7f6f8f' },
  { peau: '#dcb393', haut: '#6f8f8a', bas: '#463f3a', cheveux: '#8a5a3a', chapeau: 'haut-de-forme', couleurChapeau: '#5e4330' },
];

export function creerHabitant(numero) {
  return creerPersonnage(TENUES[numero % TENUES.length], numero);
}

// Les tenues des personnages qui ont un nom (étape 3).
export const TENUES_PNJ = {
  // Capucine, la marchande : foulard, tablier rayé.
  capucine: { peau: '#e9bf9b', haut: '#c98b7a', bas: '#5a4a42', cheveux: '#7a4a2e', chapeau: 'foulard', couleurChapeau: '#e3c27e', jupe: '#8a6a5e', tablier: '#efe2c4' },
  // Barnabé, le meunier : tout blanc de farine, bonnet de meunier.
  barnabe: { peau: '#dcae8c', haut: '#ece6da', bas: '#b9ad99', cheveux: '#6b5a4a', chapeau: 'bonnet', couleurChapeau: '#f3eee4', tablier: '#d8cdb8' },
  // Léon, le facteur : uniforme bleu doux, casquette et sacoche.
  leon: { peau: '#c99674', haut: '#6f86a6', bas: '#4a4f5c', cheveux: '#2f2723', chapeau: 'casquette', couleurChapeau: '#4f6585', sacoche: '#8a5a3a' },
};

// Crée un personnage à partir d'une tenue (voir TENUES et TENUES_PNJ).
export function creerPersonnage(t, numero = 0) {
  const habitant = new THREE.Group();
  const silhouette = new THREE.Group();
  habitant.add(silhouette);
  const corps = new THREE.Group();
  silhouette.add(corps);

  const jambeG = membre(silhouette, 0.18, 0.58, t.bas, -0.12, 0.62, 0, '#3a2a20', [0.21, 0.12, 0.28, 0.04]);
  const jambeD = membre(silhouette, 0.18, 0.58, t.bas, 0.12, 0.62, 0, '#3a2a20', [0.21, 0.12, 0.28, 0.04]);
  if (t.jupe) piece(corps, new THREE.CylinderGeometry(0.27, 0.38, 0.5, 8), t.jupe, 0, 0.55, 0);
  piece(corps, new THREE.CylinderGeometry(0.25, 0.29, 0.7, 8), t.haut, 0, 0.98, 0);
  const brasG = membre(corps, 0.13, 0.54, t.haut, -0.35, 1.27, 0, t.peau, [0.12, 0.12, 0.12]);
  const brasD = membre(corps, 0.13, 0.54, t.haut, 0.35, 1.27, 0, t.peau, [0.12, 0.12, 0.12]);
  piece(corps, new THREE.IcosahedronGeometry(0.23, 1), t.peau, 0, 1.56, 0);
  const coiffe = piece(corps, new THREE.SphereGeometry(0.245, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), t.cheveux, 0, 1.6, -0.02);
  coiffe.scale.set(1, 0.85, 1);

  // Le chapeau.
  if (t.chapeau === 'haut-de-forme') {
    piece(corps, new THREE.CylinderGeometry(0.3, 0.3, 0.03, 10), t.couleurChapeau, 0, 1.76, 0);
    piece(corps, new THREE.CylinderGeometry(0.18, 0.19, 0.32, 10), t.couleurChapeau, 0, 1.92, 0);
  } else if (t.chapeau === 'beret') {
    const beret = piece(corps, new THREE.CylinderGeometry(0.27, 0.25, 0.08, 10), t.couleurChapeau, 0.03, 1.78, 0);
    beret.rotation.z = 0.15;
  } else if (t.chapeau === 'casquette') {
    piece(corps, new THREE.SphereGeometry(0.25, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), t.couleurChapeau, 0, 1.68, 0);
    piece(corps, new THREE.BoxGeometry(0.3, 0.03, 0.18), t.couleurChapeau, 0, 1.69, 0.24);
  } else if (t.chapeau === 'foulard') {
    const foulard = piece(corps, new THREE.SphereGeometry(0.265, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), t.couleurChapeau, 0, 1.6, -0.02);
    foulard.scale.set(1, 0.9, 1);
    piece(corps, new THREE.IcosahedronGeometry(0.07, 0), t.couleurChapeau, 0, 1.55, -0.26);
  } else if (t.chapeau === 'bonnet') {
    const bonnet = piece(corps, new THREE.ConeGeometry(0.22, 0.4, 8), t.couleurChapeau, 0, 1.92, -0.04);
    bonnet.rotation.x = -0.35;
  }
  // Un tablier sur le devant, et une sacoche en bandoulière.
  if (t.tablier) piece(corps, new THREE.BoxGeometry(0.4, 0.58, 0.05), t.tablier, 0, 0.84, 0.28);
  if (t.sacoche) {
    piece(corps, new THREE.BoxGeometry(0.1, 0.3, 0.28), t.sacoche, 0.33, 0.78, 0.05);
    const bandouliere = piece(corps, new THREE.BoxGeometry(0.05, 0.75, 0.04), t.sacoche, 0.05, 1.05, 0.27);
    bandouliere.rotation.z = 0.6;
  }

  // « repos » décalé : les habitants immobiles ne respirent pas tous en même temps.
  habitant.userData = { silhouette, corps, jambeG, jambeD, brasG, brasD, phase: numero * 1.3, repos: numero * 0.7 };
  return habitant;
}

// Les habitants marchent exactement comme Ferrus (même gabarit, mêmes membres).
export const animerMarche = animerFerrus;

// Libère la mémoire utilisée par un personnage qui quitte la scène.
export function supprimerPersonnage(personnage) {
  personnage.removeFromParent();
  personnage.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}
