// =============================================================================
// decor-potager.js — le potager de la place, en 3D (version 1.5)
// -----------------------------------------------------------------------------
// Une petite barrière en bois, quatre carrés de terre, un arrosoir. Quand on
// a semé, de petites pousses sortent de terre, grandissent, puis fleurissent.
// Tout grandit tout doucement (la carte graphique change seulement la taille
// des pousses et des fleurs, sur place).
// Les règles (semer, pousser, récolter) sont dans logique-potager.js.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS, panneauTexte } from './decor.js';
import { boite, cylindre, gelule } from './formes.js';

// Une matière dont la taille des objets (sur place) suit une valeur partagée.
function matiereQuiPousse(couleur, taille) {
  const m = new THREE.MeshLambertMaterial({ color: couleur });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTaillePousse = taille;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTaillePousse;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed *= uTaillePousse;');
  };
  // Chaque matière a son propre programme (les tailles sont différentes).
  m.customProgramCacheKey = () => `pousse-${couleur}`;
  return m;
}

export function construirePotager(scene, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  const l = p.largeur;
  const pr = p.profondeur;

  // La terre, et quatre carrés un peu bombés.
  const terre = objet(new THREE.PlaneGeometry(l - 0.1, pr - 0.1), '#8a6a4c', 0, 0.025, 0, { recoit: true });
  terre.rotation.x = -Math.PI / 2;
  g.add(terre);
  const carres = [];
  for (const cx of [-0.95, 0.95]) {
    for (const cz of [-0.65, 0.65]) {
      g.add(objet(boite(1.55, 0.14, 1.0, 0.06), '#6f5240', cx, 0.07, cz, { recoit: true }));
      carres.push([cx, cz]);
    }
  }

  // La barrière : des piquets et deux lisses, tout autour.
  const piquet = boite(0.09, 0.75, 0.09, 0.03);
  const ajouterPiquet = (x, z) => g.add(objet(piquet, COULEURS.boisClair, x, 0.375, z, { ombre: true }));
  const hx = l / 2;
  const hz = pr / 2;
  for (let x = -hx; x <= hx + 1e-6; x += l / 5) { ajouterPiquet(x, -hz); ajouterPiquet(x, hz); }
  for (let z = -hz + pr / 4; z < hz - 1e-6; z += pr / 4) { ajouterPiquet(-hx, z); ajouterPiquet(hx, z); }
  for (const y of [0.3, 0.6]) {
    for (const z of [-hz, hz]) g.add(objet(boite(l, 0.05, 0.04, 0.015), COULEURS.boisFonce, 0, y, z));
    for (const x of [-hx, hx]) g.add(objet(boite(0.04, 0.05, pr, 0.015), COULEURS.boisFonce, x, y, 0));
  }
  // Un petit panneau et un arrosoir en cuivre.
  const panneau = panneauTexte('POTAGER', 1.3, 0.32);
  panneau.position.set(0, 0.95, hz + 0.05);
  g.add(panneau);
  g.add(objet(boite(0.06, 0.5, 0.06), COULEURS.boisFonce, 0, 0.6, hz + 0.02));
  const arrosoir = new THREE.Group();
  arrosoir.position.set(hx + 0.35, 0, -hz + 0.4);
  arrosoir.add(objet(cylindre(0.14, 0.16, 0.26, 14, 0.03), COULEURS.cuivre, 0, 0.13, 0, { ombre: true }));
  const bec = objet(cylindre(0.025, 0.035, 0.32), COULEURS.cuivre, 0.16, 0.22, 0);
  bec.rotation.z = -0.9;
  arrosoir.add(bec);
  const anse = objet(new THREE.TorusGeometry(0.09, 0.015, 6, 16, Math.PI), COULEURS.cuivre, 0, 0.27, 0);
  arrosoir.add(anse);
  g.add(arrosoir);

  // Les pousses (des tiges vertes) et les fleurs, 6 par carré.
  const tailleTiges = { value: 0 };
  const tailleFleurs = { value: 0 };
  const tiges = new THREE.InstancedMesh(gelule(0.035, 0.22, 6), matiereQuiPousse('#7d9e5c', tailleTiges), carres.length * 6);
  const fleurs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 0), matiereQuiPousse('#ffffff', tailleFleurs), carres.length * 6);
  const couleurs = ['#e8b4c0', '#f0d68a', '#f4efe4', '#c7b4dc', '#eec39a', '#e39a8c'];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  let i = 0;
  for (const [cx, cz] of carres) {
    for (let k = 0; k < 6; k++) {
      const x = cx - 0.5 + (k % 3) * 0.5;
      const z = cz - 0.22 + Math.floor(k / 3) * 0.44;
      m.compose(new THREE.Vector3(x, 0.26, z), q, new THREE.Vector3(1, 1, 1));
      tiges.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, 0.44, z), q, new THREE.Vector3(1, 0.75, 1));
      fleurs.setMatrixAt(i, m);
      fleurs.setColorAt(i, c.set(couleurs[(i * 5) % couleurs.length]));
      i++;
    }
  }
  g.add(tiges, fleurs);

  // « pousse » : -1 (rien de semé), puis de 0 à 1 (fleuri).
  g.userData.regler = (pousse) => {
    const seme = pousse >= 0;
    tiges.visible = seme;
    fleurs.visible = seme && pousse > 0.66;
    tailleTiges.value = seme ? 0.25 + 0.75 * Math.min(1, pousse / 0.66) : 0;
    tailleFleurs.value = Math.max(0, Math.min(1, (pousse - 0.66) / 0.34));
  };
  g.userData.regler(-1);
  scene.add(g);
  return g;
}
