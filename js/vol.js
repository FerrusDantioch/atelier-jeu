// =============================================================================
// vol.js — le voyage en dirigeable, au-dessus du village (version 1.6)
// -----------------------------------------------------------------------------
// Pendant le voyage, on voit Cuivrebourg en tout petit, comme sur une carte en
// relief : la place et son puits, le marché, le moulin et son canal, la gare et
// sa voie ferrée qui monte vers les collines de la mine, le lac, la forêt…
// Le dirigeable part d'un lieu, monte doucement, plane, puis redescend sur le
// lieu choisi. La caméra le suit tranquillement, sans secousse.
// Les positions des lieux sur la carte sont dans logique-dirigeable.js.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS, creerHasard, construireArbres } from './decor.js';
import { boite, cylindre, boule } from './formes.js';
import { EAU_CALME } from './eau.js';
import { matiereFeuillage } from './vie.js';
import { creerDirigeable } from './dirigeable3d.js';
import { CARTE_VOL, positionVol } from './logique-dirigeable.js';

// Construit la carte miniature dans « scene » (une scène avec ciel et lumière).
export function construireVol(scene) {
  const plat = (forme, couleur, x, y, z) => {
    const p = objet(forme, couleur, x, y, z, { recoit: true });
    p.rotation.x = -Math.PI / 2;
    scene.add(p);
    return p;
  };
  plat(new THREE.PlaneGeometry(200, 200), COULEURS.herbe, 8, 0, 0);
  const C = CARTE_VOL;

  // Les chemins entre les lieux (et la voie ferrée vers la mine).
  const chemin = (a, b, largeur = 0.7, couleur = COULEURS.chemin, y = 0.02) => {
    const longueur = Math.hypot(b.x - a.x, b.z - a.z);
    const p = plat(new THREE.PlaneGeometry(largeur, longueur), couleur, (a.x + b.x) / 2, y, (a.z + b.z) / 2);
    p.rotation.z = -Math.atan2(b.x - a.x, b.z - a.z);
  };
  chemin(C.place, C.marche);
  chemin(C.marche, C.moulin);
  chemin(C.moulin, C.gare);
  chemin(C.marche, C.lac);
  chemin(C.place, C.foret);
  chemin({ x: C.gare.x, z: C.gare.z - 1.6 }, { x: C.mine.x - 1.5, z: C.mine.z + 1.5 }, 0.45, '#5a4d42', 0.025);
  // Version 1.7 : la ligne de tramway, de la gare à la ville nouvelle.
  chemin({ x: C.gare.x + 1.5, z: C.gare.z + 0.4 }, { x: C.ville.x - 1.6, z: C.ville.z - 0.2 }, 0.35, '#727880', 0.025);

  const maison = (x, z, l, p, murs, toit, h = 0.7) => {
    scene.add(objet(boite(l, h, p, 0.05), murs, x, h / 2, z, { ombre: true }));
    const t = objet(new THREE.ConeGeometry(Math.max(l, p) * 0.75, 0.5, 4), toit, x, h + 0.25, z, { ombre: true });
    t.rotation.y = Math.PI / 4;
    scene.add(t);
  };

  // La place : les pavés, l'atelier, la maison d'Odile et le puits.
  plat(new THREE.CircleGeometry(2.2, 28), COULEURS.pavage, C.place.x, 0.03, C.place.z);
  maison(C.place.x - 1.6, C.place.z - 2.2, 1.6, 1.0, COULEURS.brique, COULEURS.vertDeGris);
  maison(C.place.x + 1.8, C.place.z - 2.2, 1.3, 1.0, COULEURS.creme, COULEURS.tuile);
  scene.add(objet(cylindre(0.3, 0.32, 0.3, 14), COULEURS.pierre, C.place.x, 0.15, C.place.z));
  // Le marché : pavés, étals colorés, fontaine.
  plat(new THREE.PlaneGeometry(4, 3.2), COULEURS.pavage, C.marche.x, 0.03, C.marche.z);
  for (const [dx, couleur] of [[-1.2, '#c98b7a'], [0, '#8fa77a'], [1.2, '#8f8fb0']]) {
    scene.add(objet(boite(0.8, 0.35, 0.45, 0.04), COULEURS.boisClair, C.marche.x + dx, 0.18, C.marche.z - 0.6));
    scene.add(objet(boite(0.9, 0.06, 0.55, 0.02), couleur, C.marche.x + dx, 0.55, C.marche.z - 0.6));
  }
  scene.add(objet(cylindre(0.45, 0.5, 0.2, 18), COULEURS.pierre, C.marche.x, 0.1, C.marche.z + 0.8));
  // Le moulin : le canal, le moulin et sa roue.
  const canal = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.9), EAU_CALME);
  canal.rotation.x = -Math.PI / 2;
  canal.position.set(C.moulin.x, 0.03, C.moulin.z - 1.8);
  scene.add(canal);
  maison(C.moulin.x - 0.9, C.moulin.z - 0.6, 1.3, 1.0, '#e2d4b8', '#9a6a4f', 0.9);
  const roue = objet(new THREE.TorusGeometry(0.45, 0.08, 6, 16), COULEURS.boisFonce, C.moulin.x + 0.4, 0.45, C.moulin.z - 1.4);
  scene.add(roue);
  // La gare : le bâtiment, le quai, et un petit train.
  maison(C.gare.x - 1.2, C.gare.z - 0.5, 1.8, 0.9, '#dcc4a0', '#6f7d8c');
  scene.add(objet(boite(1.0, 0.3, 0.35, 0.05), '#5a6a5a', C.gare.x + 1.2, 0.2, C.gare.z - 1.6));
  scene.add(objet(cylindre(0.08, 0.08, 0.25), COULEURS.metal, C.gare.x + 1.5, 0.45, C.gare.z - 1.6));
  // La ville nouvelle (version 1.7) : une dalle claire, la rue, des immeubles
  // à toit plat, et le petit tramway.
  plat(new THREE.PlaneGeometry(5.2, 4.2), '#cfcac0', C.ville.x, 0.03, C.ville.z);
  plat(new THREE.PlaneGeometry(5.2, 0.8), '#5d626a', C.ville.x, 0.035, C.ville.z + 0.5);
  for (const [dx, l, h, couleur] of [[-1.5, 1.3, 1.5, '#e4e1da'], [0, 1.1, 0.7, '#efe9dc'], [1.5, 1.3, 2.0, '#dc9a7c']]) {
    scene.add(objet(boite(l, h, 0.9, 0.05), couleur, C.ville.x + dx, h / 2, C.ville.z - 1.0, { ombre: true }));
    scene.add(objet(boite(l * 0.8, 0.12, 0.04), '#86aec4', C.ville.x + dx, h * 0.6, C.ville.z - 0.54));
  }
  scene.add(objet(boite(1.2, 0.3, 0.3, 0.08), '#f3f1ec', C.ville.x - 0.8, 0.2, C.ville.z + 0.5, { ombre: true }));
  scene.add(objet(boite(1.22, 0.08, 0.32, 0.03), '#2f8f96', C.ville.x - 0.8, 0.12, C.ville.z + 0.5));
  // Le lac, son ponton et la cabane du pêcheur.
  const lac = new THREE.Mesh(new THREE.CircleGeometry(3.2, 36), EAU_CALME);
  lac.rotation.x = -Math.PI / 2;
  lac.scale.set(1.3, 0.8, 1);
  lac.position.set(C.lac.x, 0.03, C.lac.z - 2.4);
  scene.add(lac);
  scene.add(objet(boite(0.3, 0.05, 1.4), COULEURS.boisClair, C.lac.x + 0.6, 0.06, C.lac.z - 0.5));
  maison(C.lac.x - 1.8, C.lac.z + 0.8, 1.0, 0.7, '#b9a284', '#6f8a8a', 0.6);
  // La forêt : la cabane d'Anatole, son mât, et beaucoup de sapins.
  maison(C.foret.x + 0.6, C.foret.z - 1.2, 1.2, 0.8, '#b9a080', '#5f7a6a', 0.6);
  scene.add(objet(cylindre(0.05, 0.07, 1.6), COULEURS.boisFonce, C.foret.x - 1.2, 0.8, C.foret.z - 1.0));
  // La mine : des collines de roche, et l'entrée de la galerie.
  for (const [dx, dz, r] of [[0, -1.5, 2.4], [2.6, -0.4, 1.8], [-2.4, -1.0, 1.6], [1.2, -3.2, 2.0]]) {
    const colline = objet(boule(r, 2), '#a89a88', C.mine.x + dx, 0, C.mine.z + dz, { recoit: true });
    colline.scale.set(1, 0.55, 1);
    scene.add(colline);
  }
  scene.add(objet(boite(0.7, 0.6, 0.3, 0.05), '#3a3028', C.mine.x + 0.2, 0.3, C.mine.z + 0.6));

  // Des arbres et des sapins un peu partout (sauf sur les lieux eux-mêmes).
  const hasard = creerHasard(97);
  const arbres = [];
  const sapins = [];
  const libre = (x, z) => Object.values(C).every((p) => Math.hypot(x - p.x, z - p.z) > 3.4) && Math.hypot(x - C.lac.x, z - C.lac.z + 2.4) > 4.6;
  for (let i = 0; i < 260 && arbres.length + sapins.length < 120; i++) {
    const x = -22 + hasard() * 58;
    const z = -18 + hasard() * 34;
    if (!libre(x, z)) continue;
    (Math.hypot(x - C.foret.x, z - C.foret.z) < 7 || hasard() < 0.3 ? sapins : arbres).push({ x, z });
  }
  // Les arbres « ronds » : ceux du décor, en petit (0,35 fois leur taille).
  const groupeArbres = new THREE.Group();
  construireArbres(groupeArbres, { arbres: arbres.map((a) => ({ x: a.x / 0.35, z: a.z / 0.35 })) });
  groupeArbres.scale.setScalar(0.35);
  scene.add(groupeArbres);
  const n = sapins.length;
  const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(0.4, 1.1, 8), matiereFeuillage('#6f8f5c', 0.6), n);
  const m = new THREE.Matrix4();
  sapins.forEach((s, i) => {
    const t = 0.7 + hasard() * 0.6;
    m.compose(new THREE.Vector3(s.x, 0.55 * t, s.z), new THREE.Quaternion(), new THREE.Vector3(t, t, t));
    cone.setMatrixAt(i, m);
  });
  scene.add(cone);

  // Quelques nuages blancs et doux, qui dérivent lentement.
  const nuages = new THREE.Group();
  const blanc = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const nuage = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Mesh(boule(0.9 + hasard() * 0.6, 1), blanc);
      b.position.set(k * 0.9 - 0.9, hasard() * 0.3, hasard() * 0.5);
      b.scale.y = 0.55;
      nuage.add(b);
    }
    nuage.position.set(-18 + hasard() * 52, 7.5 + hasard() * 1.5, -14 + hasard() * 26);
    nuages.add(nuage);
  }
  scene.add(nuages);

  // Le dirigeable, en petit.
  const dirigeable = creerDirigeable();
  dirigeable.userData.regler(5);
  dirigeable.scale.setScalar(0.3);
  scene.add(dirigeable);

  const cible = new THREE.Vector3();
  return {
    // Place le dirigeable et la caméra à l'instant « t » du voyage (0 à 1).
    placer(depuis, vers, t, temps, camera) {
      const p = positionVol(depuis, vers, t);
      dirigeable.position.set(p.x, p.y + Math.sin(temps * 1.1) * 0.04, p.z);
      dirigeable.rotation.y = p.cap;
      dirigeable.userData.animer(temps, 1.2);
      roue.rotation.z = -temps * 0.6;
      nuages.position.x = Math.sin(temps * 0.05) * 2;
      // La caméra suit, un peu en arrière et au-dessus.
      const recul = 6.5;
      camera.position.set(p.x - Math.sin(p.cap) * recul, p.y + 3.6, p.z - Math.cos(p.cap) * recul);
      cible.set(p.x + Math.sin(p.cap) * 2, p.y - 0.4, p.z + Math.cos(p.cap) * 2);
      camera.lookAt(cible);
    },
  };
}
