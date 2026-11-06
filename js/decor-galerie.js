// =============================================================================
// decor-galerie.js — la galerie souterraine de la mine en 3D (version 1.4)
// -----------------------------------------------------------------------------
// Sous la colline : un sol de terre battue, des parois de roche soutenues par
// des étais en bois, des lanternes, une petite source où tombent des gouttes,
// un vieux chariot sur ses rails… et les FILONS de cuivre qui brillent dans la
// roche. Quand on détache du cuivre d'un filon, ses cristaux deviennent tout
// petits, puis regrandissent peu à peu.
//
// Même principe que les autres lieux : formes arrondies, couleurs douces, et
// positions lues dans les données du lieu (logique-zones.js).
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, matiere, COULEURS, panneauTexte, creerHasard, ajouterLampadaires } from './decor.js';
import { boite, cylindre, boule } from './formes.js';
import { EAU_CALME, creerRonds } from './eau.js';
import { MATIERE_LUEUR, creerHalo } from './vie.js';

const ROCHE = '#8a7f74';
const ROCHE_FONCEE = '#6f655c';
const SOL = '#8c7865';
const FONTE = '#3f4a46';

export function construireGalerie(scene, zone) {
  construireSol(scene, zone);
  construireParois(scene, zone);
  ajouterLampadaires(scene, zone.lampadaires);
  construireEtais(scene);
  construireTunnel(scene);
  const eau = [construireSource(scene, zone.bassin)];
  construireRochers(scene, zone.rochers);
  construireChariot(scene, zone.caisses[0]);
  construireCaisses(scene, zone.caisses[1]);
  const filons = new Map();
  for (const f of zone.filons) filons.set(f.id, construireFilon(scene, f));
  return { filons, eau, vie: [] };
}

// --- Le sol : de la terre battue, plus claire au milieu ------------------------------
function construireSol(scene, zone) {
  const plat = (largeur, profondeur, couleur, x, y, z) => {
    const p = objet(new THREE.PlaneGeometry(largeur, profondeur), couleur, x, y, z, { recoit: true });
    p.rotation.x = -Math.PI / 2;
    scene.add(p);
  };
  plat(90, 90, '#4a3e35', 0, -0.01, 0);        // la roche tout autour (dans l'ombre)
  const l = zone.limites;
  plat(l.maxX - l.minX + 1, l.maxZ - l.minZ + 1, SOL, (l.minX + l.maxX) / 2, 0, (l.minZ + l.maxZ) / 2);
  // Quelques cailloux sur le sol.
  const hasard = creerHasard(31);
  const cailloux = new THREE.InstancedMesh(boule(1, 1), matiere(ROCHE_FONCEE), 26);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 26; i++) {
    const r = 0.06 + hasard() * 0.09;
    const x = l.minX + 0.6 + hasard() * (l.maxX - l.minX - 1.2);
    const z = l.minZ + 0.6 + hasard() * (l.maxZ - l.minZ - 1.2);
    m.compose(new THREE.Vector3(x, r * 0.4, z), new THREE.Quaternion(), new THREE.Vector3(r, r * 0.6, r));
    cailloux.setMatrixAt(i, m);
  }
  cailloux.receiveShadow = true;
  scene.add(cailloux);
}

// --- Les parois de roche, avec de gros blocs arrondis -----------------------------------
function construireParois(scene, zone) {
  const hasard = creerHasard(17);
  const blocs = [];
  for (const p of zone.parois) {
    // Le nord est haut (on y voit les filons) ; le sud est bas (pour ne pas
    // cacher Ferrus à la caméra) ; l'est et l'ouest sont entre les deux.
    const hauteur = p.id === 'paroi-nord' ? 3.4 : p.id === 'paroi-sud' ? 1.0 : 2.4;
    scene.add(objet(boite(p.largeur, hauteur, p.profondeur, 0.3), ROCHE_FONCEE, p.x, hauteur / 2, p.z, { recoit: true }));
    // Des blocs arrondis devant la paroi, pour un aspect de vraie roche.
    const longueur = Math.max(p.largeur, p.profondeur);
    const surX = p.largeur > p.profondeur;
    for (let d = -longueur / 2 + 0.5; d <= longueur / 2 - 0.3; d += 1.1) {
      const r = 0.55 + hasard() * 0.35;
      const x = surX ? p.x + d : p.x;
      const z = surX ? p.z : p.z + d;
      blocs.push([x, hauteur * (0.35 + hasard() * 0.5), z, r]);
    }
  }
  const roche = new THREE.InstancedMesh(boule(1, 1), matiere(ROCHE), blocs.length);
  const m = new THREE.Matrix4();
  blocs.forEach(([x, y, z, r], i) => {
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(hasard(), hasard() * 3, 0)), new THREE.Vector3(r, r * 0.85, r));
    roche.setMatrixAt(i, m);
  });
  roche.receiveShadow = true;
  scene.add(roche);
}

// --- Les étais : des cadres en bois qui soutiennent la roche, avec une lanterne --------
function construireEtais(scene) {
  for (const x of [-9.8, -4, 2.2, 8.4]) {
    const g = new THREE.Group();
    g.position.set(x, 0, -7.95);
    const poteau = cylindre(0.12, 0.14, 3.0);
    g.add(objet(poteau, COULEURS.boisFonce, -1.1, 1.5, 0, { ombre: true }));
    g.add(objet(poteau, COULEURS.boisFonce, 1.1, 1.5, 0, { ombre: true }));
    g.add(objet(boite(2.7, 0.24, 0.3, 0.06), COULEURS.boisFonce, 0, 3.05, 0, { ombre: true }));
    // Une petite lanterne accrochée à la poutre.
    g.add(objet(cylindre(0.012, 0.012, 0.3), FONTE, 0, 2.8, 0.18));
    g.add(objet(cylindre(0.09, 0.07, 0.22, 12, 0.02), MATIERE_LUEUR, 0, 2.55, 0.18));
    const halo = creerHalo(1.5);
    halo.position.set(0, 2.55, 0.25);
    g.add(halo);
    scene.add(g);
  }
}

// --- Le tunnel de sortie, à l'ouest ------------------------------------------------------
function construireTunnel(scene) {
  const g = new THREE.Group();
  g.position.set(-12.1, 0, 0);
  g.rotation.y = Math.PI / 2; // il regarde vers l'est (vers l'intérieur)
  const sombre = new THREE.MeshBasicMaterial({ color: '#1f1915' });
  const bas = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), sombre);
  bas.position.y = 0.65;
  const haut = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20, 0, Math.PI), sombre);
  haut.position.y = 1.3;
  g.add(bas, haut);
  for (const cote of [-1, 1]) g.add(objet(boite(0.24, 2.6, 0.24), COULEURS.boisFonce, cote * 1.45, 1.3, 0.1, { ombre: true }));
  g.add(objet(boite(3.3, 0.26, 0.3), COULEURS.boisFonce, 0, 2.65, 0.1, { ombre: true }));
  const panneau = panneauTexte('SORTIE', 1.4, 0.36);
  panneau.position.set(0, 3.0, 0.2);
  g.add(panneau);
  scene.add(g);
}

// --- La petite source, avec des gouttes qui tombent de la roche --------------------------
function construireSource(scene, b) {
  const g = new THREE.Group();
  g.position.set(b.x, 0, b.z);
  const bord = objet(new THREE.TorusGeometry(b.rayon - 0.15, 0.2, 10, 36), ROCHE, 0, 0.12, 0, { recoit: true });
  bord.rotation.x = Math.PI / 2;
  g.add(bord);
  const eau = new THREE.Mesh(new THREE.CircleGeometry(b.rayon - 0.2, 36), EAU_CALME);
  eau.rotation.x = -Math.PI / 2;
  eau.position.y = 0.1;
  g.add(eau);
  const ronds = creerRonds({ rayonDepart: 0.08, rayonFin: 0.9, nombre: 2, duree: 5.5, opacite: 0.35 });
  ronds.position.y = 0.11;
  g.add(ronds);
  scene.add(g);
  return ronds;
}

function construireRochers(scene, rochers) {
  rochers.forEach((r, i) => {
    const rocher = objet(boule(r.rayon, 2), i % 2 ? ROCHE : ROCHE_FONCEE, r.x, r.rayon * 0.5, r.z, { ombre: true, recoit: true });
    rocher.scale.set(1, 0.75, 1);
    scene.add(rocher);
    // Une petite stalagmite à côté de chaque rocher.
    scene.add(objet(new THREE.ConeGeometry(0.22, 0.9, 10), ROCHE, r.x + r.rayon * 0.9, 0.45, r.z - r.rayon * 0.5));
  });
}

// --- Le vieux chariot de mine, sur ses rails (il ne bouge plus) -------------------------
function construireChariot(scene, c) {
  for (const cote of [-1, 1]) scene.add(objet(boite(6, 0.06, 0.06, 0.02), '#8a857c', -9, 0.08, c.z + cote * 0.32));
  for (let x = -11.6; x <= -6.4; x += 0.7) scene.add(objet(boite(0.16, 0.05, 0.9, 0.02), '#6b5543', x, 0.04, c.z));
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  g.add(objet(boite(1.4, 0.5, 0.8, 0.06), '#6b6660', 0, 0.55, 0, { ombre: true }));
  for (const cote of [-1, 1]) g.add(objet(boite(1.48, 0.06, 0.06, 0.02), COULEURS.laiton, 0, 0.82, cote * 0.42));
  for (const x of [-0.45, 0.45]) {
    for (const z of [-0.42, 0.42]) {
      const roue = objet(cylindre(0.15, 0.15, 0.07, 14, 0.02), FONTE, x, 0.17, z);
      roue.rotation.x = Math.PI / 2;
      g.add(roue);
    }
  }
  // Quelques morceaux de roche dedans.
  [[-0.3, 0], [0.1, -0.1], [0.35, 0.12]].forEach(([x, z]) => g.add(objet(boule(0.16, 1), ROCHE, x, 0.8, z)));
  scene.add(g);
}

function construireCaisses(scene, c) {
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  g.add(objet(boite(0.75, 0.6, 0.8, 0.05), COULEURS.boisClair, -0.4, 0.3, 0, { ombre: true }));
  g.add(objet(boite(0.7, 0.55, 0.75, 0.05), '#8a6a4a', 0.4, 0.28, 0.02, { ombre: true }));
  g.add(objet(boite(0.6, 0.5, 0.6, 0.05), COULEURS.boisClair, 0, 0.85, 0, { ombre: true }));
  // Une pioche posée contre les caisses.
  const manche = objet(cylindre(0.03, 0.03, 1.1), COULEURS.boisClair, 0.9, 0.5, 0.3);
  manche.rotation.z = 0.35;
  g.add(manche);
  const fer = objet(boite(0.5, 0.06, 0.06, 0.02), '#6b6660', 0.72, 1.02, 0.3);
  fer.rotation.z = 0.35;
  g.add(fer);
  scene.add(g);
}

// --- Un filon de cuivre : des cristaux qui sortent de la roche ---------------------------
// Renvoie un groupe avec « userData.regler(p) » : p = 1 (le filon est prêt),
// plus petit pendant qu'il se reforme.
const formeCristal = new THREE.OctahedronGeometry(0.17, 0);
const matiereCristal = new THREE.MeshLambertMaterial({ color: '#d0874a', emissive: '#6a3412', flatShading: true });
function construireFilon(scene, f) {
  const g = new THREE.Group();
  // Le filon est dans la roche, juste derrière l'endroit où se tient Ferrus.
  if (f.paroi === 'nord') {
    g.position.set(f.x, 1.0, -8.05);
  } else {
    g.position.set(12.05, 1.0, f.z);
    g.rotation.y = -Math.PI / 2;
  }
  // Une veine plus sombre dans la roche.
  const veine = objet(boule(0.75, 2), '#6b4d3b', 0, 0.1, -0.15);
  veine.scale.set(1.2, 0.8, 0.45);
  g.add(veine);
  const cristaux = new THREE.Group();
  g.add(cristaux);
  const hasard = creerHasard(f.x * 10 + f.z * 7 + 300);
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(formeCristal, matiereCristal);
    const angle = (i / 7) * Math.PI * 2;
    c.position.set(Math.cos(angle) * 0.38 * (0.5 + hasard()), Math.sin(angle) * 0.3 * (0.5 + hasard()) + 0.1, 0.25);
    c.scale.set(0.8, 1.6 + hasard() * 0.8, 0.8);
    c.rotation.set(0.9 + hasard() * 0.4, 0, (hasard() - 0.5) * 1.6);
    cristaux.add(c);
  }
  // Une petite lueur douce : le cuivre reflète la lumière des lanternes.
  const halo = creerHalo(1.3);
  halo.position.set(0, 0.1, 0.5);
  g.add(halo);
  g.userData.regler = (p) => {
    const s = 0.25 + 0.75 * p;
    cristaux.scale.setScalar(s);
    halo.visible = p >= 1;
  };
  g.userData.regler(1);
  scene.add(g);
  return g;
}
