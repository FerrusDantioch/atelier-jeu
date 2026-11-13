// =============================================================================
// Tests de la version 1.7 — à lancer avec : npm test
// =============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../lib/three/three.module.js';
import { fusionnerDecor } from '../js/fusion.js';

// Un petit lieu d'essai : trois caisses fixes de même matière, une roue qui
// tourne (connue du jeu), un volet qui bouge par une animation, et un objet caché.
function lieuDEssai() {
  const scene = new THREE.Scene();
  const bois = new THREE.MeshLambertMaterial({ color: '#9a7652' });
  const caisses = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bois);
    c.position.set(i * 2, 0.5, 0);
    scene.add(c);
    caisses.push(c);
  }
  const roue = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), bois);
  scene.add(roue);
  const volet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.1), bois);
  scene.add(volet);
  const cache = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bois);
  cache.visible = false;
  scene.add(cache);
  return { scene, bois, caisses, roue, volet, cache };
}

test('fusion : les formes fixes de même matière sont soudées en une seule', () => {
  const { scene, bois, caisses, roue, volet, cache } = lieuDEssai();
  const bilan = fusionnerDecor(scene, { roue }, [() => { volet.rotation.y = 1; }]);
  assert.deepEqual(bilan, { avant: 3, apres: 1 });
  for (const c of caisses) assert.equal(c.parent, null);
  const soude = scene.children.find((o) => o.userData.soude === 3);
  assert.ok(soude);
  assert.equal(soude.material, bois);
  // 3 boîtes de 24 points et 12 triangles, placées là où elles étaient.
  assert.equal(soude.geometry.attributes.position.count, 72);
  assert.equal(soude.geometry.index.count, 108);
  soude.geometry.computeBoundingBox();
  assert.ok(Math.abs(soude.geometry.boundingBox.max.x - 4.5) < 1e-6);
  assert.ok(Math.abs(soude.geometry.boundingBox.min.y) < 1e-6);
  // Ce qui vit reste libre : la roue (tenue par le jeu), le volet (qui bouge), l'objet caché.
  assert.equal(roue.parent, scene);
  assert.equal(volet.parent, scene);
  assert.equal(cache.parent, scene);
});

test('fusion : le transparent, le vent et les objets marqués « vivants » ne sont pas soudés', () => {
  const scene = new THREE.Scene();
  const verre = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.5 });
  const feuille = new THREE.MeshLambertMaterial();
  feuille.userData.vent = true;
  const pierre = new THREE.MeshLambertMaterial();
  for (const m of [verre, verre, feuille, feuille]) scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m));
  const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pierre);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pierre);
  b.userData.vivant = true;
  scene.add(a, b);
  assert.deepEqual(fusionnerDecor(scene), { avant: 0, apres: 0 });
  assert.equal(scene.children.length, 6);
});

test('fusion : les ombres sont respectées, et une forme retournée garde ses faces à l\'endroit', () => {
  const scene = new THREE.Scene();
  const m = new THREE.MeshLambertMaterial();
  const faire = (ombre, x) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m);
    o.castShadow = ombre;
    o.position.x = x;
    scene.add(o);
    return o;
  };
  faire(true, 0);
  faire(true, 2).scale.x = -1; // un miroir
  faire(false, 4);
  faire(false, 6);
  assert.deepEqual(fusionnerDecor(scene), { avant: 4, apres: 2 });
  const avecOmbre = scene.children.find((o) => o.castShadow);
  assert.equal(avecOmbre.userData.soude, 2);
  // Chaque triangle regarde vers l'extérieur : sa normale calculée va dans le
  // même sens que la normale enregistrée.
  const g = avecOmbre.geometry;
  const [pa, pb, pc, n] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < g.index.count; i += 3) {
    pa.fromBufferAttribute(g.attributes.position, g.index.getX(i));
    pb.fromBufferAttribute(g.attributes.position, g.index.getX(i + 1));
    pc.fromBufferAttribute(g.attributes.position, g.index.getX(i + 2));
    const calculee = pb.sub(pa).cross(pc.sub(pa));
    n.fromBufferAttribute(g.attributes.normal, g.index.getX(i));
    assert.ok(calculee.dot(n) > 0);
  }
});
