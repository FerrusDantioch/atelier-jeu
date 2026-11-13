// =============================================================================
// saisons.js — les saisons en 3D (version 1.4)
// -----------------------------------------------------------------------------
// Les règles (quelle saison, quelles couleurs) sont dans logique-saisons.js.
// Ici, on les montre :
//   1. LES COULEURS : l'herbe, les feuillages et les haies changent de teinte
//      (vert tendre au printemps, roux en automne, enneigé en hiver). Comme
//      toutes les herbes et tous les arbres partagent les mêmes matières, il
//      suffit de changer quelques couleurs pour que tout le village suive ;
//   2. LES FLEURS du printemps : de petites touffes colorées dans l'herbe,
//      le long des haies et autour des arbres. Elles poussent et se fanent
//      doucement (elles grandissent ou rapetissent, sans clignoter) ;
//   3. CE QUI TOMBE DU CIEL : des pétales au printemps, des feuilles mortes en
//      automne, des flocons en hiver. Peu nombreux, lents, et ils apparaissent
//      et disparaissent en douceur.
//
// Si le système demande moins d'animations, main.js cache ce qui tombe.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { matiere, COULEURS } from './decor.js';
import { matiereFeuillage } from './vie.js';
import { toucheUnObstacle } from './logique.js';

// -----------------------------------------------------------------------------
// 1. LES COULEURS
// -----------------------------------------------------------------------------
// Les matières à teinter, pour chaque couleur de la saison.
let cibles = null;
function obtenirCibles() {
  if (cibles) return cibles;
  cibles = {
    herbe: [matiere(COULEURS.herbe), matiereFeuillage(COULEURS.herbe, 0.35)],
    feuillage: [matiereFeuillage(COULEURS.feuillage), matiere(COULEURS.feuillage)],
    feuillageClair: [matiereFeuillage(COULEURS.feuillageClair, 1.4), matiere(COULEURS.feuillageClair)],
    haie: [matiere(COULEURS.haie)],
    buisson: [matiereFeuillage(COULEURS.buisson, 0.5)],
  };
  return cibles;
}

// La taille des fleurs (de 0 à 1), partagée par toutes les fleurs du jeu.
const tailleFleurs = { value: 0 };
const fleursDuJeu = [];

// « ambiance » vient de ambianceSaison (logique-saisons.js).
export function appliquerSaison(ambiance) {
  for (const [cle, matieres] of Object.entries(obtenirCibles())) {
    const [r, v, b] = ambiance.couleurs[cle];
    for (const m of matieres) m.color.setRGB(r, v, b, THREE.SRGBColorSpace);
  }
  tailleFleurs.value = ambiance.fleurs;
  for (const f of fleursDuJeu) f.visible = ambiance.fleurs > 0.01;
}

// -----------------------------------------------------------------------------
// 2. LES FLEURS DU PRINTEMPS
// -----------------------------------------------------------------------------
// Les endroits où il ne faut pas de fleurs : les places pavées, les chemins,
// les quais, la terre battue… [x, z, largeur, profondeur] (ou un cercle :
// { x, z, rayon }). Le marché est entièrement pavé : il n'a pas de fleurs.
const SANS_FLEURS = {
  place: [{ x: 0, z: 0.5, rayon: 8 }, [-7, -4.5, 2.6, 6.4], [8, -4.5, 2.4, 6.4], [0, 9.5, 2.8, 6.4], [-14.6, -0.5, 4.6, 3.6], [16.2, 1, 6, 2.8], [-1.3, -11.4, 3, 1.6]],
  // Version 1.6 : le sentier de la forêt et la clairière autour de la cabane.
  foret: [[-7, 0, 14.4, 2.4], [6.5, -2.8, 2.4, 5], [2.6, -0.9, 9, 2.4], [-6.5, -1.6, 2.2, 2.6], { x: -6.5, z: -3.4, rayon: 2 }, { x: 11.3, z: -3.8, rayon: 2 }],
  lac: [[0, -6, 40, 9.6], [8.5, 0, 11.4, 2.6], [2, -0.6, 3.4, 3], [2, -4.2, 2.2, 5.4]],
  moulin: [[-8, 0.5, 13.4, 2.8], [0, -6.5, 30, 3.6]],
  gare: [[-9.5, 0, 10.4, 2.8], [-3.5, -2.2, 3.4, 5], [3.75, -4.65, 21, 2.5], [0, -7, 30, 3.2]],
  mine: [[2.5, -0.9, 14.4, 6], [-5.5, 0.4, 4.4, 2.6], [0.5, -4.65, 13.4, 2.5], [0, -7, 30, 3.2], { x: 10.2, z: -4.2, rayon: 3 }],
};

// La distance d'un point à un rectangle (0 s'il est dedans).
function distanceRect(x, z, r) {
  const dx = Math.max(Math.abs(x - r.x) - r.largeur / 2, 0);
  const dz = Math.max(Math.abs(z - r.z) - r.profondeur / 2, 0);
  return Math.hypot(dx, dz);
}

const COULEURS_FLEURS = ['#e8b4c0', '#f0d68a', '#f4efe4', '#c7b4dc', '#eec39a'];

// La matière des fleurs : la carte graphique les fait grandir ou rapetisser
// toutes ensemble, sur place (selon « tailleFleurs »).
let matiereFleur = null;
function obtenirMatiereFleur() {
  if (matiereFleur) return matiereFleur;
  matiereFleur = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  matiereFleur.onBeforeCompile = (shader) => {
    shader.uniforms.uTailleFleurs = tailleFleurs;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTailleFleurs;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed *= uTailleFleurs;');
  };
  return matiereFleur;
}

// Ajoute les fleurs d'un lieu. « donnees » : les limites, haies et arbres du
// lieu ; « obstacles » : pour ne pas en mettre dans les murs ou les étals.
export function creerFleurs(scene, zoneId, donnees, obstacles, graine = 5) {
  const exclusions = SANS_FLEURS[zoneId] || [];
  const exclu = (x, z) => exclusions.some((e) => (Array.isArray(e)
    ? distanceRect(x, z, { x: e[0], z: e[1], largeur: e[2], profondeur: e[3] }) === 0
    : Math.hypot(x - e.x, z - e.z) < e.rayon));
  const haies = donnees.haies || [];
  const arbres = donnees.arbres || [];
  const l = donnees.limites;
  let valeur = graine * 4813;
  const hasard = () => ((valeur = (valeur * 16807) % 2147483647) / 2147483647);

  // On tire des points au hasard, et on garde ceux qui sont au bord d'une
  // haie ou autour d'un arbre (là où les fleurs poussent naturellement).
  const touffes = [];
  for (let essai = 0; essai < 5000 && touffes.length < 80; essai++) {
    const x = l.minX + 0.3 + hasard() * (l.maxX - l.minX - 0.6);
    const z = l.minZ + 0.3 + hasard() * (l.maxZ - l.minZ - 0.6);
    const presHaie = haies.some((h) => { const d = distanceRect(x, z, h); return d > 0.2 && d < 1.5; });
    const presArbre = arbres.some((a) => { const d = Math.hypot(x - a.x, z - a.z); return d > 1.45 && d < 2.4; });
    if (!presHaie && !presArbre) continue;
    if (exclu(x, z) || toucheUnObstacle(x, z, 0.2, obstacles)) continue;
    if (touffes.some((t) => Math.hypot(t.x - x, t.z - z) < 0.7)) continue;
    touffes.push({ x, z, couleur: COULEURS_FLEURS[Math.floor(hasard() * COULEURS_FLEURS.length)] });
  }

  // Chaque touffe = 3 petites fleurs, dessinées toutes ensemble (InstancedMesh).
  const forme = new THREE.IcosahedronGeometry(0.1, 0);
  const fleurs = new THREE.InstancedMesh(forme, obtenirMatiereFleur(), touffes.length * 3);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const couleur = new THREE.Color();
  let i = 0;
  for (const t of touffes) {
    couleur.set(t.couleur);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + hasard();
      const px = t.x + Math.cos(a) * 0.17;
      const pz = t.z + Math.sin(a) * 0.17;
      m.compose(new THREE.Vector3(px, 0.12 + hasard() * 0.05, pz), q, new THREE.Vector3(1, 0.65, 1));
      fleurs.setMatrixAt(i, m);
      fleurs.setColorAt(i, couleur);
      i++;
    }
  }
  fleurs.visible = false;
  scene.add(fleurs);
  fleursDuJeu.push(fleurs);
  creerTouffes(scene, l, exclu, obstacles, hasard);
  return fleurs;
}

// Version 1.7 : des touffes d'herbe un peu partout dans les prés (pas sur les
// chemins ni les pavés). Chaque touffe = 3 brins pointus ; toutes sont
// dessinées d'un seul coup, se balancent au vent et suivent la couleur de
// l'herbe au fil des saisons (blanches sous la neige).
function creerTouffes(scene, l, exclu, obstacles, hasard) {
  const places = [];
  for (let essai = 0; essai < 4000 && places.length < 170; essai++) {
    const x = l.minX - 3 + hasard() * (l.maxX - l.minX + 6);
    const z = l.minZ - 2 + hasard() * (l.maxZ - l.minZ + 5);
    if (exclu(x, z) || toucheUnObstacle(x, z, 0.3, obstacles)) continue;
    places.push({ x, z });
  }
  const brins = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.3, 4), matiereFeuillage(COULEURS.herbe, 0.35), places.length * 3);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const penche = new THREE.Euler();
  const teinte = new THREE.Color();
  let i = 0;
  for (const p of places) {
    const clair = 0.98 + hasard() * 0.3; // certaines touffes sont plus claires, d'autres plus sombres
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + hasard() * 2;
      const taille = 0.7 + hasard() * 0.7;
      q.setFromEuler(penche.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35));
      m.compose(new THREE.Vector3(p.x + Math.sin(a) * 0.07, 0.13 * taille, p.z + Math.cos(a) * 0.07), q, new THREE.Vector3(1, taille, 1));
      brins.setMatrixAt(i, m);
      brins.setColorAt(i, teinte.setScalar(clair));
      i++;
    }
  }
  brins.receiveShadow = true;
  scene.add(brins);
  return brins;
}

// -----------------------------------------------------------------------------
// 3. CE QUI TOMBE DU CIEL
// -----------------------------------------------------------------------------
// Un seul nuage de petites choses qui tombent, qui suit Ferrus d'un lieu à
// l'autre (main.js le change de scène avec lui). Les flocons et les pétales
// restent à leur place dans le monde : seule la « boîte » où on les dessine
// suit la caméra.
const NOMBRE_CHUTES = 60;
const LARGEUR = 26;
const PROFONDEUR = 22;
const HAUTEUR = 7;
// Pour chaque sorte : sa couleur, sa vitesse de chute, sa façon de tourner.
const SORTES = {
  petales: { couleur: [0.95, 0.84, 0.86], vitesse: 0.55, tour: 0.9, forme: [1, 0.7] },
  feuilles: { couleur: [0.81, 0.56, 0.31], vitesse: 0.7, tour: 1.2, forme: [1.5, 0.85] },
  flocons: { couleur: [1, 1, 1], vitesse: 0.42, tour: 0.15, forme: [0.9, 0.9] },
};

export function creerChutes() {
  const materiau = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false });
  materiau.emissive = new THREE.Color('#2a2a2a');
  const chutes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.1, 7), materiau, NOMBRE_CHUTES);
  chutes.frustumCulled = false; // la boîte bouge avec la caméra
  let valeur = 2027;
  const hasard = () => ((valeur = (valeur * 16807) % 2147483647) / 2147483647);
  const graines = [];
  const couleur = new THREE.Color();
  for (let i = 0; i < NOMBRE_CHUTES; i++) {
    graines.push({ u: hasard(), v: hasard(), h: hasard(), phase: hasard() * 6.28, vitesse: 0.8 + hasard() * 0.4 });
    // De petites différences de teinte, pour que tout ne soit pas pareil.
    const nuance = 0.88 + hasard() * 0.12;
    couleur.setRGB(nuance, 0.86 + hasard() * 0.14, nuance * (0.9 + hasard() * 0.1));
    chutes.setColorAt(i, couleur);
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const boucler = (a, n) => ((a % n) + n) % n;

  // t : le temps (s) ; cx, cz : le centre de la vue ; ambiance : la saison.
  chutes.userData.animer = (t, cx, cz, ambiance) => {
    const poids = { petales: ambiance.petales, feuilles: ambiance.feuilles, flocons: ambiance.flocons };
    const total = poids.petales + poids.feuilles + poids.flocons;
    chutes.visible = total > 0.01;
    if (!chutes.visible) return;
    // On mélange les sortes (pendant un changement de saison).
    const melange = (cle) => Object.entries(SORTES).reduce((somme, [nom, sorte]) => somme + sorte[cle] * (poids[nom] / total), 0);
    const r = Object.entries(SORTES).reduce((c, [nom, sorte]) => c.map((x, k) => x + sorte.couleur[k] * (poids[nom] / total)), [0, 0, 0]);
    materiau.color.setRGB(r[0], r[1], r[2]);
    const vitesse = melange('vitesse');
    const tour = melange('tour');
    const forme = [0, 1].map((k) => Object.entries(SORTES).reduce((somme, [nom, sorte]) => somme + sorte.forme[k] * (poids[nom] / total), 0));
    // Moins il y en a, moins on en dessine (elles arrivent peu à peu).
    chutes.count = Math.round(NOMBRE_CHUTES * Math.min(1, total));
    const x0 = cx - LARGEUR / 2;
    const z0 = cz - PROFONDEUR / 2;
    for (let i = 0; i < chutes.count; i++) {
      const g = graines[i];
      const chute = boucler(g.h * HAUTEUR + t * vitesse * g.vitesse, HAUTEUR);
      const y = HAUTEUR - chute;
      // Elles se balancent un peu de gauche à droite en tombant.
      const wx = g.u * LARGEUR + Math.sin(t * 0.5 + g.phase) * 0.6 + t * 0.15;
      const wz = g.v * PROFONDEUR + Math.cos(t * 0.4 + g.phase) * 0.4;
      p.set(x0 + boucler(wx - x0, LARGEUR), y, z0 + boucler(wz - z0, PROFONDEUR));
      e.set(t * tour + g.phase, t * tour * 0.7 + g.phase * 2, 0);
      q.setFromEuler(e);
      // Elles apparaissent en haut et disparaissent au sol en douceur.
      const a = chute / HAUTEUR;
      const taille = Math.min(1, a / 0.15) * Math.min(1, (1 - a) / 0.08);
      s.set(forme[0] * taille, forme[1] * taille, 1);
      m.compose(p, q, s);
      chutes.setMatrixAt(i, m);
    }
    chutes.instanceMatrix.needsUpdate = true;
  };
  chutes.visible = false;
  return chutes;
}
