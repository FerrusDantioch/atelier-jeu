// =============================================================================
// decor-lac.js — le lac en 3D (version 1.5)
// -----------------------------------------------------------------------------
// Un grand lac paisible au nord (il se perd dans la brume au loin), une berge
// de sable, un ponton en bois qui avance dans l'eau, la cabane du pêcheur, une
// barque qui se balance, des roseaux, des nénuphars, et deux canards qui
// nagent tranquillement. La nuit, des lucioles au bord de l'eau, et les
// étoiles se reflètent dans le lac.
// Aussi : la canne à pêche de Ferrus, son fil et son bouchon (main.js les
// montre pendant la pêche).
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS, panneauTexte, construireHaies, construireArbres, construireBatiment, ajouterLampadaires, creerHasard } from './decor.js';
import { boite, cylindre, boule, gelule } from './formes.js';
import { EAU_CALME, creerRonds } from './eau.js';
import { creerLucioles } from './vie.js';

const BERGE = -2.2; // la limite entre l'herbe et l'eau (z)

export function construireLac(scene, zone) {
  construireSol(scene);
  construireHaies(scene, zone);
  construireArbres(scene, zone);
  ajouterLampadaires(scene, zone.lampadaires);
  construireCabane(scene, zone.batiments[0]);
  construireBanc(scene, zone.bancs[0]);
  construirePonton(scene, zone.ponton);
  const barque = construireBarque(scene);
  construireRoseaux(scene);
  const canards = [creerCanard(scene, -6, -5.2, 2.2, 0), creerCanard(scene, 7.5, -6.5, 1.6, 2.5)];
  // Des ronds dans l'eau (des poissons qui remontent), à deux endroits.
  const ronds = [];
  for (const [x, z, decalage] of [[-3.5, -6.8, 0], [9, -4.5, 2.6], [2.6, -8, 1.3]]) {
    const r = creerRonds({ rayonDepart: 0.1, rayonFin: 1.0, nombre: 2, duree: 6, opacite: 0.3, decalage });
    r.position.set(x, 0.0, z);
    scene.add(r);
    ronds.push(r);
  }
  const lucioles = creerLucioles({ x: 0, z: -1.2, largeur: 24, profondeur: 2.5, nombre: 10, graine: 7 });
  scene.add(lucioles);
  const peche = creerMaterielPeche(scene);
  return { eau: [...ronds, ...canards, barque], vie: [lucioles], peche };
}

// --- Le sol : l'herbe, la berge de sable, le chemin, et l'eau ------------------------------
function construireSol(scene) {
  const plat = (largeur, profondeur, couleur, x, y, z, options = { recoit: true }) => {
    const p = objet(new THREE.PlaneGeometry(largeur, profondeur), couleur, x, y, z, options);
    p.rotation.x = -Math.PI / 2;
    scene.add(p);
    return p;
  };
  plat(160, 80, COULEURS.herbe, 0, 0, BERGE + 40);           // l'herbe, au sud de la berge
  plat(160, 1.1, '#cdbb92', 0, 0.015, BERGE + 0.55);          // la bande de sable
  plat(11, 2.2, COULEURS.chemin, 8.5, 0.02, 0);              // le chemin qui vient du marché
  plat(3, 2.6, COULEURS.chemin, 2, 0.022, -0.6);              // jusqu'au ponton
  // Le talus de la berge, puis l'eau, un peu plus bas que l'herbe.
  scene.add(objet(boite(160, 0.25, 0.12), '#7a6248', 0, -0.1, BERGE - 0.02));
  const eau = new THREE.Mesh(new THREE.PlaneGeometry(160, 70), EAU_CALME);
  eau.rotation.x = -Math.PI / 2;
  eau.position.set(0, -0.12, BERGE - 35);
  scene.add(eau);
  // Des galets le long de la berge.
  const hasard = creerHasard(61);
  const galets = new THREE.InstancedMesh(boule(1, 1), new THREE.MeshLambertMaterial({ color: '#a99d8d' }), 40);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) {
    const r = 0.08 + hasard() * 0.12;
    m.compose(new THREE.Vector3(-14 + hasard() * 28, -0.02, BERGE + (hasard() - 0.6) * 0.3), new THREE.Quaternion(), new THREE.Vector3(r, r * 0.6, r));
    galets.setMatrixAt(i, m);
  }
  scene.add(galets);
  // Des nénuphars, flottant sur l'eau.
  const formeNenuphar = new THREE.CircleGeometry(0.32, 14, 0.4, Math.PI * 2 - 0.4);
  const vert = new THREE.MeshLambertMaterial({ color: '#7d9e5c' });
  const rose = new THREE.MeshLambertMaterial({ color: '#f0c3cc' });
  for (let i = 0; i < 12; i++) {
    const x = -12 + hasard() * 24;
    const z = -3.4 - hasard() * 4.5;
    if (Math.abs(x - 2) < 1.6) continue; // pas sur le chemin de la barque ni du bouchon
    const n = new THREE.Mesh(formeNenuphar, vert);
    n.rotation.x = -Math.PI / 2;
    n.rotation.z = hasard() * 6;
    n.position.set(x, -0.1, z);
    n.scale.setScalar(0.7 + hasard() * 0.6);
    scene.add(n);
    if (i % 3 === 0) scene.add(objet(boule(0.07, 1), rose, x + 0.05, -0.05, z));
  }
}

// --- La cabane du pêcheur -------------------------------------------------------------------
function construireCabane(scene, b) {
  const { groupe, avant } = construireBatiment(scene, b, { murs: b.murs, toit: b.toit, hauteurToit: 1.8, porteX: 0.9, fenetres: [-1.2] });
  const enseigne = panneauTexte(b.enseigne, 1.5, 0.4);
  enseigne.position.set(0.9, 2.85, avant + 0.08);
  groupe.add(enseigne);
  // Des cannes à pêche appuyées contre le mur, et un filet.
  for (const x of [-2.1, -1.95]) {
    const canne = objet(cylindre(0.02, 0.03, 2.4), COULEURS.boisClair, x, 1.3, avant + 0.15);
    canne.rotation.z = 0.12;
    groupe.add(canne);
  }
  groupe.add(objet(boite(0.6, 0.45, 0.4, 0.05), '#8a6a4a', 2.0, 0.62, avant + 0.3)); // une caisse
}

function construireBanc(scene, b) {
  const g = new THREE.Group();
  g.position.set(b.x, 0, b.z);
  g.add(objet(boite(b.largeur, 0.08, 0.45, 0.03), COULEURS.boisClair, 0, 0.45, 0, { ombre: true }));
  g.add(objet(boite(b.largeur, 0.35, 0.06, 0.03), COULEURS.boisClair, 0, 0.72, -0.22));
  for (const x of [-0.6, 0.6]) g.add(objet(boite(0.08, 0.45, 0.4, 0.02), '#3f4a46', x, 0.22, 0));
  scene.add(g);
}

// --- Le ponton -------------------------------------------------------------------------------
function construirePonton(scene, p) {
  const g = new THREE.Group();
  const debut = BERGE + 0.4;
  const fin = p.z - p.profondeur / 2 - 0.2;
  for (let z = debut; z > fin; z -= 0.32) {
    g.add(objet(boite(p.largeur, 0.07, 0.28, 0.02), z > debut - 0.5 ? '#9a7652' : '#a88866', p.x, 0.03, z, { recoit: true }));
  }
  // Les pieux dans l'eau, et deux poteaux au bout.
  for (let z = BERGE - 0.5; z > fin; z -= 1.4) {
    for (const cote of [-1, 1]) g.add(objet(cylindre(0.08, 0.09, 0.6), COULEURS.boisFonce, p.x + cote * (p.largeur / 2 + 0.03), -0.2, z));
  }
  for (const cote of [-1, 1]) g.add(objet(cylindre(0.07, 0.08, 1.0), COULEURS.boisFonce, p.x + cote * (p.largeur / 2), 0.4, fin + 0.15));
  scene.add(g);
}

// --- La barque, qui se balance doucement --------------------------------------------------------
function construireBarque(scene) {
  const g = new THREE.Group();
  g.position.set(-3.2, -0.1, -4.6);
  g.rotation.y = 0.5;
  const coque = objet(gelule(0.42, 1.4, 14), '#8a5a3a', 0, 0.06, 0, { ombre: true });
  coque.rotation.x = Math.PI / 2;
  coque.scale.set(1, 1, 0.45);
  g.add(coque);
  g.add(objet(boite(0.7, 0.04, 0.22), COULEURS.boisClair, 0, 0.2, 0.15));
  g.add(objet(boite(0.7, 0.04, 0.22), COULEURS.boisClair, 0, 0.2, -0.45));
  const rame = objet(boite(0.05, 0.04, 1.5), COULEURS.boisClair, 0.42, 0.22, -0.1);
  rame.rotation.y = 0.3;
  g.add(rame);
  scene.add(g);
  g.userData.animer = (t) => {
    g.rotation.z = Math.sin(t * 0.7) * 0.04;
    g.position.y = -0.1 + Math.sin(t * 0.9) * 0.015;
  };
  return g;
}

// --- Les roseaux, au bord de l'eau ------------------------------------------------------------
function construireRoseaux(scene) {
  const hasard = creerHasard(77);
  const tiges = [];
  for (const [cx, cz] of [[-11, -2.6], [-7.5, -2.5], [6, -2.6], [11.5, -2.5], [-1, -2.6]]) {
    for (let i = 0; i < 9; i++) tiges.push([cx + (hasard() - 0.5) * 1.6, cz - hasard() * 0.5, 0.7 + hasard() * 0.6]);
  }
  const tige = new THREE.InstancedMesh(cylindre(0.018, 0.022, 1), new THREE.MeshLambertMaterial({ color: '#8a9a5a' }), tiges.length);
  const epi = new THREE.InstancedMesh(gelule(0.035, 0.16, 6), new THREE.MeshLambertMaterial({ color: '#7a5a3e' }), tiges.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  tiges.forEach(([x, z, h], i) => {
    q.setFromEuler(new THREE.Euler((hasard() - 0.5) * 0.2, 0, (hasard() - 0.5) * 0.2));
    m.compose(new THREE.Vector3(x, h / 2 - 0.12, z), q, new THREE.Vector3(1, h, 1));
    tige.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, h - 0.1, z), q, new THREE.Vector3(1, 1, 1));
    epi.setMatrixAt(i, m);
  });
  scene.add(tige, epi);
}

// --- Un canard qui nage en rond, lentement ----------------------------------------------------
function creerCanard(scene, cx, cz, rayon, phase) {
  const g = new THREE.Group();
  const corps = objet(boule(0.2, 2), '#f2ede2', 0, 0.02, 0, { ombre: true });
  corps.scale.set(0.9, 0.7, 1.3);
  g.add(corps);
  g.add(objet(boule(0.11, 2), '#5f7a5a', 0, 0.2, 0.2));
  const bec = objet(boite(0.08, 0.03, 0.1, 0.015), '#e2a24a', 0, 0.18, 0.32);
  g.add(bec);
  g.add(objet(boite(0.1, 0.04, 0.12, 0.02), '#d8d2c4', 0, 0.12, -0.25)); // la queue
  scene.add(g);
  g.userData.animer = (t) => {
    const a = t * 0.12 + phase;
    g.position.set(cx + Math.cos(a) * rayon, -0.1 + Math.sin(t * 1.3 + phase) * 0.012, cz + Math.sin(a) * rayon * 0.6);
    g.rotation.y = -a; // il regarde dans le sens où il nage
  };
  return g;
}

// --- La canne à pêche de Ferrus -----------------------------------------------------------------
// Un groupe placé sur Ferrus (et tourné comme lui) pendant la pêche : la canne,
// le fil, et le bouchon rouge et blanc qui flotte sur l'eau.
function creerMaterielPeche(scene) {
  const g = new THREE.Group();
  const base = new THREE.Vector3(0.22, 1.0, 0.3);
  const bout = new THREE.Vector3(0.34, 2.25, 1.9);
  const longueur = base.distanceTo(bout);
  const canne = objet(cylindre(0.012, 0.025, longueur), COULEURS.boisClair, 0, 0, 0);
  canne.position.copy(base).add(bout).multiplyScalar(0.5);
  canne.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bout.clone().sub(base).normalize());
  g.add(canne);
  g.add(objet(cylindre(0.035, 0.035, 0.06, 12), COULEURS.laiton, base.x + 0.02, base.y + 0.15, base.z + 0.18).rotateZ(Math.PI / 2)); // le moulinet
  const bouchon = new THREE.Group();
  bouchon.add(objet(boule(0.06, 1), '#c9564a', 0, 0.03, 0));
  bouchon.add(objet(boule(0.045, 1), '#f4efe4', 0, 0.08, 0));
  g.add(bouchon);
  const fil = new THREE.Line(new THREE.BufferGeometry().setFromPoints([bout, bout]), new THREE.LineBasicMaterial({ color: '#efe6d4' }));
  g.add(fil);
  // « attente » : de 0 (on vient de lancer) à 1 (ça mord !).
  g.userData.animer = (t, attente, y) => {
    const touche = attente > 0.85;
    // Le bouchon flotte à 3,3 m devant Ferrus, sur l'eau (« y » : la hauteur de
    // l'eau par rapport aux pieds de Ferrus) ; il s'enfonce un peu quand ça mord.
    bouchon.position.set(0.4, y + Math.sin(t * 2.2) * 0.012 - (touche ? 0.05 + Math.sin(t * 9) * 0.02 : 0), 3.3);
    fil.geometry.setFromPoints([bout, bouchon.position.clone().add(new THREE.Vector3(0, 0.06, 0))]);
  };
  g.visible = false;
  scene.add(g);
  return g;
}
