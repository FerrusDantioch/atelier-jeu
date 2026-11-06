// =============================================================================
// personnages.js — Ferrus, Odile et les habitants, en formes simples et rondes
// -----------------------------------------------------------------------------
// Chaque personnage est un « groupe » : plusieurs formes assemblées (corps,
// tête, bras, jambes…). Bouger le groupe fait bouger tout le personnage.
// Depuis la version 1.1, toutes les formes sont arrondies (voir formes.js) :
// bras et jambes en « gélules », buste et robes « tournés » comme un vase,
// têtes bien rondes.
// Par défaut, un personnage regarde vers le sud (vers la caméra, l'axe +z).
// Les personnages projettent une ombre (contrairement au décor léger).
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { matiere } from './decor.js';
import { boite, cylindre, boule, tour, gelule } from './formes.js';
import { MATIERE_LUEUR } from './vie.js';

// Une tête bien ronde, et le dessus d'une tête (cheveux, bonnet…).
const tete = (rayon) => new THREE.SphereGeometry(rayon, 20, 14);
const calotte = (rayon) => new THREE.SphereGeometry(rayon, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);

// Un buste aux épaules arrondies, de y = bas à y = haut (en « tour » de potier).
function buste(rayonBas, rayonHaut, bas, haut) {
  const h = haut - bas;
  return tour([
    [0, bas],
    [rayonBas - 0.01, bas],
    [rayonBas, bas + h * 0.1],
    [(rayonBas + rayonHaut) / 2, bas + h * 0.45],
    [rayonHaut, bas + h * 0.8],
    [rayonHaut * 0.92, bas + h * 0.9],
    [rayonHaut * 0.7, bas + h * 0.97],
    [rayonHaut * 0.35, bas + h],
    [0, bas + h + 0.01],
  ]);
}

// Un tablier de cuir (ou de toile) qui épouse le ventre : un morceau de
// cylindre, visible des deux côtés.
function tablier(rayon, hauteur) {
  return new THREE.CylinderGeometry(rayon, rayon + 0.01, hauteur, 12, 1, true, -0.72, 1.44);
}

// Deux petits yeux sombres (pour les personnages sans lunettes d'artisan).
function yeux(parent, y, z, ecart = 0.08) {
  for (const cote of [-1, 1]) piece(parent, boule(0.024, 1), '#3b2a22', cote * ecart, y, z);
}

// Ajoute une forme au groupe, avec ombre portée.
// « couleur » peut aussi être une matière toute faite (pour un tablier, par exemple).
function piece(parent, forme, couleur, x, y, z) {
  const m = new THREE.Mesh(forme, typeof couleur === 'string' ? matiere(couleur) : couleur);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Un membre (bras ou jambe) en DEUX morceaux, comme un vrai membre :
//   - le haut (cuisse ou bras) pivote depuis la hanche ou l'épaule ;
//   - le bas (tibia ou avant-bras) pivote depuis le genou ou le coude.
// Chaque morceau est une « gélule » (aux bouts ronds) : le genou et le coude
// restent bien arrondis quand ils se plient.
// On place chaque forme sous son point de rotation : en tournant ce point, le
// morceau se balance. Renvoie le pivot du haut ; celui du bas est rangé dans
// « pivot.userData.articulation ».
// « bout » (facultatif) = { forme, couleur, z } : la botte ou la main.
function membre(parent, largeur, longueur, couleur, x, y, z, bout) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const haut = longueur * 0.52;
  const bas = longueur - haut;
  const rayonHaut = largeur / 2;
  const rayonBas = largeur * 0.46;
  piece(pivot, gelule(rayonHaut, haut), couleur, 0, -haut / 2, 0);
  const articulation = new THREE.Group();
  articulation.position.y = -haut;
  pivot.add(articulation);
  piece(articulation, gelule(rayonBas, bas - rayonBas), couleur, 0, -(bas - rayonBas) / 2, 0);
  if (bout) piece(articulation, bout.forme, bout.couleur, 0, -bas, bout.z || 0);
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
  const botte = { forme: boite(0.22, 0.13, 0.3, 0.06), couleur: bottes, z: 0.04 };
  const jambeG = membre(silhouette, 0.19, 0.58, pantalon, -0.12, 0.62, 0, botte);
  const jambeD = membre(silhouette, 0.19, 0.58, pantalon, 0.12, 0.62, 0, botte);

  // Le buste, la ceinture à outils et le tablier de cuir.
  piece(corps, buste(0.3, 0.27, 0.62, 1.37), chemise, 0, 0, 0);
  piece(corps, cylindre(0.31, 0.31, 0.1, 20, 0.03), '#4a3226', 0, 0.7, 0);
  piece(corps, boite(0.1, 0.08, 0.05), '#c99a4a', 0, 0.7, 0.32);
  piece(corps, tablier(0.305, 0.62), matiere(cuir, { side: THREE.DoubleSide }), 0, 0.83, 0);
  piece(corps, boite(0.08, 0.14, 0.06), '#6b6660', -0.3, 0.62, 0.12); // une clé à molette à la ceinture

  // Les bras (avec les mains).
  const main = { forme: boule(0.072, 2), couleur: peau };
  const brasG = membre(corps, 0.14, 0.56, chemise, -0.36, 1.28, 0, main);
  const brasD = membre(corps, 0.14, 0.56, chemise, 0.36, 1.28, 0, main);

  // La tête, les cheveux, le nez et une barbe courte.
  piece(corps, tete(0.24), peau, 0, 1.58, 0);
  const coiffe = piece(corps, calotte(0.255), cheveux, 0, 1.62, -0.02);
  coiffe.scale.set(1, 0.85, 1);
  piece(corps, boule(0.04, 1), '#dcae8c', 0, 1.53, 0.24);
  const barbe = piece(corps, boule(0.15, 2), cheveux, 0, 1.45, 0.12);
  barbe.scale.set(1, 0.5, 0.6);

  // Les lunettes d'artisan : une sangle autour de la tête, deux verres cerclés de cuivre.
  const sangle = piece(corps, new THREE.TorusGeometry(0.245, 0.03, 8, 32), '#3e2c22', 0, 1.62, 0);
  sangle.rotation.x = Math.PI / 2;
  for (const cote of [-1, 1]) {
    const cercle = piece(corps, cylindre(0.085, 0.085, 0.09, 20, 0.02), cuivre, cote * 0.1, 1.62, 0.22);
    cercle.rotation.x = Math.PI / 2;
    const verre = piece(corps, new THREE.CylinderGeometry(0.062, 0.062, 0.02, 20), '#6f9e9b', cote * 0.1, 1.62, 0.27);
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

  // Une longue robe en cloche, d'une seule pièce (du sol jusqu'aux épaules).
  piece(corps, tour([
    [0, 0], [0.43, 0], [0.47, 0.04], [0.45, 0.18], [0.37, 0.48], [0.27, 0.8],
    [0.22, 0.98], [0.21, 1.16], [0.19, 1.3], [0.12, 1.38], [0, 1.4],
  ]), robe, 0, 0, 0);
  // Le châle sur les épaules.
  piece(corps, tour([[0.26, 1.16], [0.3, 1.22], [0.29, 1.32], [0.22, 1.4], [0.11, 1.44], [0, 1.45]]), matiere(chale, { side: THREE.DoubleSide }), 0, 0, 0);
  // Les bras repliés devant elle (comme si elle tenait ses mains).
  for (const cote of [-1, 1]) {
    const bras = piece(corps, gelule(0.065, 0.3), chale, cote * 0.27, 1.1, 0.08);
    bras.rotation.x = -0.5;
    bras.rotation.z = cote * 0.15;
  }
  const mains = piece(corps, boule(0.1, 2), peau, 0, 0.96, 0.26);
  mains.scale.set(1.15, 0.9, 1);
  // La tête, les yeux, les cheveux gris et le chignon.
  piece(corps, tete(0.22), peau, 0, 1.6, 0);
  yeux(corps, 1.6, 0.2);
  const coiffe = piece(corps, calotte(0.235), cheveux, 0, 1.63, -0.02);
  coiffe.scale.set(1, 0.9, 1);
  piece(corps, boule(0.12, 2), cheveux, 0, 1.85, -0.1);
  // De petites lunettes rondes.
  for (const cote of [-1, 1]) {
    piece(corps, new THREE.TorusGeometry(0.05, 0.012, 8, 20), '#8a5427', cote * 0.08, 1.6, 0.205);
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
  // Augustin, le chef de gare (version 1.2) : uniforme gris-bleu, casquette rouge, moustache grise.
  augustin: { peau: '#e2b48f', haut: '#56677a', bas: '#3f434a', cheveux: '#9a948a', chapeau: 'casquette', couleurChapeau: '#a05a4c', moustache: '#9a948a', boutons: '#c99a4a' },
  // Sidonie, la mineuse (version 1.3) : veste de cuir, casque de laiton avec sa lampe.
  sidonie: { peau: '#d9a882', haut: '#8a6a50', bas: '#4a4038', cheveux: '#5b3e2c', chapeau: 'casque', couleurChapeau: '#c9a35a', tablier: '#6f5a48' },
};

// Crée un personnage à partir d'une tenue (voir TENUES et TENUES_PNJ).
export function creerPersonnage(t, numero = 0) {
  const habitant = new THREE.Group();
  const silhouette = new THREE.Group();
  habitant.add(silhouette);
  const corps = new THREE.Group();
  silhouette.add(corps);

  const chaussure = { forme: boite(0.21, 0.12, 0.28, 0.055), couleur: '#3a2a20', z: 0.04 };
  const jambeG = membre(silhouette, 0.18, 0.58, t.bas, -0.12, 0.62, 0, chaussure);
  const jambeD = membre(silhouette, 0.18, 0.58, t.bas, 0.12, 0.62, 0, chaussure);
  // Une jupe évasée (ouverte en bas et en haut : le buste la recouvre).
  if (t.jupe) {
    piece(corps, tour([[0.37, 0.3], [0.39, 0.33], [0.35, 0.5], [0.29, 0.7], [0.26, 0.8]]), matiere(t.jupe, { side: THREE.DoubleSide }), 0, 0, 0);
  }
  piece(corps, buste(0.29, 0.26, 0.63, 1.35), t.haut, 0, 0, 0);
  const main = { forme: boule(0.068, 2), couleur: t.peau };
  const brasG = membre(corps, 0.13, 0.54, t.haut, -0.35, 1.27, 0, main);
  const brasD = membre(corps, 0.13, 0.54, t.haut, 0.35, 1.27, 0, main);
  piece(corps, tete(0.23), t.peau, 0, 1.56, 0);
  yeux(corps, 1.58, 0.205);
  const coiffe = piece(corps, calotte(0.245), t.cheveux, 0, 1.6, -0.02);
  coiffe.scale.set(1, 0.85, 1);
  // Une belle moustache, et des boutons dorés sur la veste.
  if (t.moustache) {
    for (const cote of [-1, 1]) {
      const m = piece(corps, boule(0.06, 1), t.moustache, cote * 0.055, 1.5, 0.21);
      m.scale.set(1.3, 0.55, 0.7);
      m.rotation.z = cote * 0.35;
    }
  }
  if (t.boutons) for (const [y, z] of [[0.88, 0.288], [1.03, 0.28], [1.18, 0.268]]) piece(corps, boule(0.025, 1), t.boutons, 0, y, z);

  // Le chapeau.
  if (t.chapeau === 'haut-de-forme') {
    piece(corps, cylindre(0.3, 0.3, 0.035, 24, 0.015), t.couleurChapeau, 0, 1.76, 0);
    piece(corps, cylindre(0.18, 0.19, 0.32, 20, 0.03), t.couleurChapeau, 0, 1.92, 0);
  } else if (t.chapeau === 'beret') {
    const beret = piece(corps, boule(0.27, 2), t.couleurChapeau, 0.03, 1.77, 0);
    beret.scale.set(1, 0.32, 1);
    beret.rotation.z = 0.15;
  } else if (t.chapeau === 'casquette') {
    piece(corps, calotte(0.25), t.couleurChapeau, 0, 1.68, 0);
    const visiere = piece(corps, cylindre(0.15, 0.15, 0.03, 20, 0.012), t.couleurChapeau, 0, 1.69, 0.2);
    visiere.scale.set(1, 1, 0.75);
  } else if (t.chapeau === 'foulard') {
    const foulard = piece(corps, calotte(0.265), t.couleurChapeau, 0, 1.6, -0.02);
    foulard.scale.set(1, 0.9, 1);
    piece(corps, boule(0.07, 2), t.couleurChapeau, 0, 1.55, -0.26);
  } else if (t.chapeau === 'casque') {
    // Un casque de mineur en laiton, avec une petite lampe qui s'allume la nuit.
    const casque = piece(corps, calotte(0.27), t.couleurChapeau, 0, 1.64, 0);
    casque.scale.set(1, 0.95, 1.05);
    const bord = piece(corps, new THREE.TorusGeometry(0.27, 0.025, 6, 24), t.couleurChapeau, 0, 1.64, 0);
    bord.rotation.x = Math.PI / 2;
    piece(corps, cylindre(0.05, 0.05, 0.06, 12, 0.015).rotateX(Math.PI / 2), '#6b6660', 0, 1.76, 0.24);
    piece(corps, boule(0.04, 1), MATIERE_LUEUR, 0, 1.76, 0.27);
  } else if (t.chapeau === 'bonnet') {
    const bonnet = piece(corps, new THREE.ConeGeometry(0.22, 0.4, 18), t.couleurChapeau, 0, 1.92, -0.04);
    bonnet.rotation.x = -0.35;
    piece(corps, boule(0.06, 1), t.couleurChapeau, 0, 2.1, -0.11); // un petit pompon
  }
  // Un tablier sur le devant, et une sacoche en bandoulière.
  if (t.tablier) piece(corps, tablier(0.3, 0.58), matiere(t.tablier, { side: THREE.DoubleSide }), 0, 0.84, 0);
  if (t.sacoche) {
    piece(corps, boite(0.1, 0.3, 0.28, 0.04), t.sacoche, 0.33, 0.78, 0.05);
    const bandouliere = piece(corps, boite(0.05, 0.75, 0.04), t.sacoche, 0.05, 1.05, 0.27);
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
