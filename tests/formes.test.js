// =============================================================================
// Tests de la version 1.1 : les formes arrondies (formes.js).
// On vérifie que les boîtes et cylindres arrondis gardent leur taille, que leur
// surface est bien tournée vers l'extérieur (sinon ils seraient invisibles ou
// troués à l'écran), et que l'éclairage y glisse correctement.
// Lancement : npm test   (ou : node --test)
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as THREE from '../lib/three/three.module.js';
import { boite, cylindre, tour, gelule, boule } from '../js/formes.js';

// Compte les petits triangles tournés vers l'extérieur et ceux tournés vers
// l'intérieur (pour une forme « pleine », centrée sur son axe).
function orientation(forme, centre = new THREE.Vector3()) {
  const p = forme.attributes.position;
  const index = forme.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const m = new THREE.Vector3();
  let dehors = 0;
  let dedans = 0;
  const total = (index ? index.count : p.count) / 3;
  for (let f = 0; f < total; f++) {
    const i = index ? [index.getX(3 * f), index.getX(3 * f + 1), index.getX(3 * f + 2)] : [3 * f, 3 * f + 1, 3 * f + 2];
    a.fromBufferAttribute(p, i[0]);
    b.fromBufferAttribute(p, i[1]);
    c.fromBufferAttribute(p, i[2]);
    n.subVectors(c, b).cross(m.subVectors(a, b));
    if (n.length() < 1e-9) continue; // un triangle aplati (sur l'axe) : sans importance
    m.addVectors(a, b).add(c).divideScalar(3).sub(centre);
    if (n.dot(m) > 0) dehors++;
    else dedans++;
  }
  return { dehors, dedans };
}

function taille(forme) {
  forme.computeBoundingBox();
  const t = new THREE.Vector3();
  forme.boundingBox.getSize(t);
  return t;
}

test('une boîte arrondie garde exactement sa taille', () => {
  for (const [l, h, p, r] of [[2, 1, 0.5, undefined], [3, 3, 3, 0.18], [0.1, 0.3, 0.28, 0.04], [5, 0.16, 2, 0.07]]) {
    const t = taille(boite(l, h, p, r));
    assert.ok(Math.abs(t.x - l) < 1e-6 && Math.abs(t.y - h) < 1e-6 && Math.abs(t.z - p) < 1e-6, `${l}×${h}×${p} : ${t.x}×${t.y}×${t.z}`);
  }
});

test('l\'arrondi d\'une boîte ne dépasse jamais la moitié de son épaisseur', () => {
  // Une planche très fine avec un arrondi demandé trop grand : elle reste une planche.
  const t = taille(boite(1, 0.04, 1, 0.5));
  assert.ok(Math.abs(t.y - 0.04) < 1e-6);
  // Sans arrondi possible, on retombe sur une boîte normale.
  assert.equal(boite(1, 0.004, 1).type, 'BoxGeometry');
});

test('les coins sont vraiment arrondis (le coin pointu a disparu)', () => {
  const forme = boite(2, 2, 2, 0.3);
  const p = forme.attributes.position;
  let plusLoin = 0;
  for (let i = 0; i < p.count; i++) plusLoin = Math.max(plusLoin, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
  // Un vrai coin de cube serait à √3 ≈ 1,732 du centre.
  assert.ok(plusLoin < Math.sqrt(3) - 0.1, `point le plus éloigné : ${plusLoin}`);
});

test('l\'éclairage glisse bien : chaque normale a une longueur de 1', () => {
  for (const forme of [boite(1, 2, 3, 0.2), cylindre(0.5, 0.6, 1)]) {
    const n = forme.attributes.normal;
    for (let i = 0; i < n.count; i++) {
      const longueur = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
      assert.ok(Math.abs(longueur - 1) < 1e-3, `normale ${i} : ${longueur}`);
    }
  }
});

test('toutes les surfaces sont tournées vers l\'extérieur (pas de trou à l\'écran)', () => {
  const formes = {
    boite: boite(2, 1, 0.5),
    'petite boîte': boite(0.1, 0.3, 0.28, 0.04),
    cylindre: cylindre(1, 1.2, 0.9),
    'buste tourné': tour([[0, 0], [0.3, 0], [0.3, 0.5], [0.2, 0.7], [0, 0.72]]),
    gelule: gelule(0.1, 0.3),
    boule: boule(1, 2),
  };
  for (const [nom, forme] of Object.entries(formes)) {
    // Pour le buste, le « centre » est sur l'axe, à mi-hauteur.
    const centre = nom === 'buste tourné' ? new THREE.Vector3(0, 0.36, 0) : new THREE.Vector3();
    const { dehors, dedans } = orientation(forme, centre);
    assert.equal(dedans, 0, `${nom} : ${dedans} triangle(s) à l'envers`);
    assert.ok(dehors > 0, nom);
  }
});

test('un cylindre arrondi garde sa hauteur et son rayon', () => {
  const t = taille(cylindre(0.5, 0.5, 2));
  assert.ok(Math.abs(t.y - 2) < 1e-6);
  assert.ok(Math.abs(t.x - 1) < 0.02);
  // Très fin : on garde un cylindre normal (rien à arrondir).
  assert.equal(cylindre(1, 1, 0.01).type, 'CylinderGeometry');
});

test('les formes restent légères (pour les téléphones)', () => {
  const triangles = (f) => (f.index ? f.index.count : f.attributes.position.count) / 3;
  assert.ok(triangles(boite(3, 3, 3, 0.18)) <= 300, 'grande boîte');
  assert.ok(triangles(boite(0.3, 0.2, 0.3, 0.03)) <= 120, 'petite boîte');
  assert.ok(triangles(cylindre(1, 1, 1)) <= 300, 'cylindre');
});
