// =============================================================================
// fetes.js — les fêtes des saisons, en 3D (version 1.5)
// -----------------------------------------------------------------------------
// Le jour d'une fête, la place se décore. Des guirlandes partent du toit du
// puits vers les lanternes de la place, et vers l'atelier et la maison d'Odile :
//   - Fête des lanternes (printemps) : des lanternes de papier colorées, qui
//     s'allument doucement le soir ;
//   - Bal d'été : des fanions de toutes les couleurs, et un parquet rond pour
//     danser ;
//   - Foire aux pommes (automne) : des fanions roux et dorés, des pommes, des
//     potirons le long des haies ;
//   - Fête des lumières (hiver) : de petites ampoules partout (dans les arbres
//     aussi) et une étoile de cuivre en haut du puits.
// Rien ne clignote : les lumières s'allument doucement avec la nuit.
// Les règles des fêtes sont dans logique-fetes.js.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS, creerHasard } from './decor.js';
import { boule, cylindre } from './formes.js';

// Les lumières des fêtes : elles brillent un peu le jour, beaucoup la nuit.
const lumieres = [];
function matiereLumineuse(couleur) {
  const m = new THREE.MeshLambertMaterial({ color: couleur, emissive: couleur, emissiveIntensity: 0.2 });
  lumieres.push(m);
  return m;
}
export function eclairerFetes(nuit) {
  for (const m of lumieres) m.emissiveIntensity = 0.15 + nuit * 0.9;
}

// Un fil qui pend entre deux points (une courbe douce), et les points où
// accrocher des décorations tout du long.
function guirlande(groupe, a, b, ecart) {
  const milieu = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  milieu.y -= a.distanceTo(b) * 0.08; // le fil pend un peu
  const courbe = new THREE.QuadraticBezierCurve3(a, milieu, b);
  const fil = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(courbe.getPoints(24)),
    new THREE.LineBasicMaterial({ color: '#5e4330' })
  );
  groupe.add(fil);
  const nombre = Math.max(2, Math.floor(courbe.getLength() / ecart));
  const points = [];
  for (let i = 1; i < nombre; i++) points.push(courbe.getPoint(i / nombre));
  return points;
}

// Les fils de la place : du haut du puits vers les trois lanternes, et des
// lanternes vers l'atelier et vers la maison d'Odile.
function fils(monde) {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const puits = v(monde.puits.x, 3.05, monde.puits.z);
  const [l1, l2, l3] = monde.lampadaires.map((l) => v(l.x, 2.75, l.z));
  return [[puits, l1], [puits, l2], [puits, l3], [l1, v(-3.15, 3.2, -6.95)], [l2, v(4.85, 3.2, -7.4)]];
}

// Pour dessiner vite : toutes les décorations d'une même forme et d'une même
// couleur sont dessinées d'un seul coup (un « InstancedMesh »). « objets » :
// une liste de { position, rotation (Euler, facultatif), echelle (facultatif) }.
// Renvoie le maillage, avec « userData.poser(i, rotationX) » pour faire
// bouger un objet (les fanions qui se balancent).
function enUneFois(groupe, forme, materiau, objets) {
  const maillage = new THREE.InstancedMesh(forme, materiau, objets.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const poser = (i, rotationX = 0) => {
    const o = objets[i];
    e.set((o.rotation ? o.rotation.x : 0) + rotationX, o.rotation ? o.rotation.y : 0, o.rotation ? o.rotation.z : 0);
    q.setFromEuler(e);
    m.compose(o.position, q, o.echelle || new THREE.Vector3(1, 1, 1));
    maillage.setMatrixAt(i, m);
  };
  objets.forEach((o, i) => poser(i));
  maillage.userData.poser = poser;
  maillage.userData.objets = objets;
  groupe.add(maillage);
  return maillage;
}

// Range des objets par couleur (pour les dessiner couleur par couleur).
function parCouleur(groupe, forme, materiaux, objets) {
  return materiaux.map((materiau, k) => enUneFois(groupe, forme, materiau, objets.filter((o) => o.couleur === k)));
}

// Un fanion triangulaire (pointe en bas).
const triangle = new THREE.Shape();
triangle.moveTo(-0.12, 0);
triangle.lineTo(0.12, 0);
triangle.lineTo(0, -0.28);
triangle.closePath();
const formeFanion = new THREE.ShapeGeometry(triangle);

export function construireFetes(scene, monde) {
  const hasard = creerHasard(53);
  const fetes = {};

  // --- Printemps : les lanternes de papier -------------------------------------------
  {
    const g = new THREE.Group();
    const couleurs = ['#f0b8b8', '#f3d58c', '#f6efe0', '#f2b98a', '#c9b8e0'].map(matiereLumineuse);
    const lanternes = [];
    let n = 0;
    for (const [a, b] of fils(monde)) {
      for (const p of guirlande(g, a, b, 0.8)) {
        lanternes.push({ position: new THREE.Vector3(p.x, p.y - 0.2, p.z), echelle: new THREE.Vector3(1, 1.25, 1), couleur: n++ % couleurs.length });
      }
    }
    parCouleur(g, boule(0.15, 2), couleurs, lanternes);
    fetes['fete-lanternes'] = g;
  }

  // --- Été : les fanions et le parquet de danse ----------------------------------------
  {
    const g = new THREE.Group();
    const couleurs = ['#c98b7a', '#e2c27e', '#8fa77a', '#8f8fb0', '#d9a08f', '#7fa7b0']
      .map((c) => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
    const liste = [];
    let n = 0;
    for (const [a, b] of fils(monde)) {
      for (const p of guirlande(g, a, b, 0.42)) {
        liste.push({ position: p.clone(), rotation: new THREE.Euler(0, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2, 0), couleur: n % couleurs.length, phase: n * 0.7 });
        n++;
      }
    }
    const fanions = parCouleur(g, formeFanion, couleurs, liste);
    // Un parquet rond pour danser, au sud du puits.
    const parquet = objet(new THREE.CylinderGeometry(1.7, 1.7, 0.04, 40), '#b08a62', 3.4, 0.07, 3.8, { recoit: true });
    g.add(parquet);
    const bord = objet(new THREE.TorusGeometry(1.7, 0.04, 6, 40), COULEURS.laiton, 3.4, 0.09, 3.8);
    bord.rotation.x = Math.PI / 2;
    g.add(bord);
    // Les fanions se balancent un tout petit peu dans la brise.
    g.userData.animer = (t) => {
      for (const maillage of fanions) {
        maillage.userData.objets.forEach((o, i) => maillage.userData.poser(i, Math.sin(t * 1.1 + o.phase) * 0.18));
        maillage.instanceMatrix.needsUpdate = true;
      }
    };
    fetes['bal-ete'] = g;
  }

  // --- Automne : fanions roux, pommes et potirons --------------------------------------
  {
    const g = new THREE.Group();
    const couleurs = ['#c0703a', '#d9a04a', '#a85a3a', '#c9a35a']
      .map((c) => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
    const pomme = boule(0.08, 1);
    const rouge = new THREE.MeshLambertMaterial({ color: '#b84a3a' });
    const pommes = [];
    const fanions = [];
    let n = 0;
    for (const [a, b] of fils(monde)) {
      for (const p of guirlande(g, a, b, 0.5)) {
        if (n % 3 === 2) pommes.push({ position: new THREE.Vector3(p.x, p.y - 0.1, p.z) });
        else fanions.push({ position: p.clone(), rotation: new THREE.Euler(0, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2, 0), couleur: n % couleurs.length });
        n++;
      }
    }
    parCouleur(g, formeFanion, couleurs, fanions);
    // Des potirons le long des haies du sud, et des paniers de pommes sur la margelle du puits.
    const potirons = [];
    const queues = [];
    for (const x of [-15, -12.5, -9.5, -5, 4.5, 8, 11.5, 14.8]) {
      const px = x + (hasard() - 0.5) * 0.6;
      potirons.push({ position: new THREE.Vector3(px, 0.2, 11.85), echelle: new THREE.Vector3(1.15, 0.8, 1.1) });
      queues.push({ position: new THREE.Vector3(px, 0.42, 11.85) });
    }
    enUneFois(g, boule(0.26, 2), new THREE.MeshLambertMaterial({ color: '#d9893a' }), potirons);
    enUneFois(g, cylindre(0.025, 0.03, 0.12), new THREE.MeshLambertMaterial({ color: '#6b7a3a' }), queues);
    for (const angle of [0.6, 2.4, 4.2]) {
      const x = monde.puits.x + Math.cos(angle) * 1.03;
      const z = monde.puits.z + Math.sin(angle) * 1.03;
      g.add(objet(cylindre(0.16, 0.12, 0.14, 12, 0.02), COULEURS.boisClair, x, 1.03, z));
      for (let k = 0; k < 3; k++) pommes.push({ position: new THREE.Vector3(x + (k - 1) * 0.07, 1.12, z) });
    }
    enUneFois(g, pomme, rouge, pommes);
    fetes['foire-pommes'] = g;
  }

  // --- Hiver : les petites lumières et l'étoile du puits ------------------------------
  {
    const g = new THREE.Group();
    const ampoules = [matiereLumineuse('#ffe2a8'), matiereLumineuse('#ffd0a0'), matiereLumineuse('#fff1d0')];
    const liste = [];
    let n = 0;
    for (const [a, b] of fils(monde)) {
      for (const p of guirlande(g, a, b, 0.35)) liste.push({ position: new THREE.Vector3(p.x, p.y - 0.06, p.z), couleur: n++ % ampoules.length });
    }
    // Des lumières dans les arbres (tout autour du feuillage).
    for (const arbre of monde.arbres) {
      for (let k = 0; k < 10; k++) {
        const angle = (k / 10) * Math.PI * 2 + hasard();
        const y = 1.6 + hasard() * 1.6;
        const r = 1.0 + (1 - Math.abs(y - 2.2) / 1.6) * 0.35;
        liste.push({ position: new THREE.Vector3(arbre.x + Math.cos(angle) * r, y, arbre.z + Math.sin(angle) * r), couleur: (n + k) % ampoules.length });
      }
      n++;
    }
    parCouleur(g, boule(0.055, 1), ampoules, liste);
    // L'étoile de cuivre en haut du puits.
    const etoile = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.12 : 0.3;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) etoile.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else etoile.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    etoile.closePath();
    const forme3d = new THREE.ExtrudeGeometry(etoile, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
    forme3d.center();
    const e = new THREE.Mesh(forme3d, matiereLumineuse('#e8b45a'));
    e.position.set(monde.puits.x, 3.45, monde.puits.z);
    g.add(e);
    g.userData.animer = (t) => { e.rotation.y = t * 0.4; };
    fetes['fete-lumieres'] = g;
  }

  for (const g of Object.values(fetes)) {
    g.visible = false;
    scene.add(g);
  }
  return fetes;
}
