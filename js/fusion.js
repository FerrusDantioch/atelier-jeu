// =============================================================================
// fusion.js — dessiner le décor FIXE en beaucoup moins de fois (version 1.7)
// -----------------------------------------------------------------------------
// Un lieu est fait de centaines de petites formes (un mur, une poutre, un
// tonneau…). La carte graphique travaille plus vite quand on lui donne peu de
// gros objets plutôt que beaucoup de petits. Ici, on « soude » donc entre elles
// toutes les formes qui ne bougeront jamais et qui ont la même matière : elles
// deviennent un seul objet, dessiné d'un seul coup.
//
// Le plus délicat est de ne souder QUE ce qui est vraiment fixe. On laisse
// tranquille :
//   - tout ce que le jeu peut retrouver à partir du « decor » renvoyé par le
//     constructeur du lieu (une barrière qui s'ouvre, une roue qui tourne…) ;
//   - tout ce qui change quand on essaie les animations du lieu (les
//     « sondes ») : on prend une photo des positions, on fait vivre le lieu,
//     et ce qui a bougé ou changé de visibilité est mis de côté ;
//   - ce qui est caché, transparent, animé par la carte graphique (le vent
//     dans les feuilles), ou marqué « userData.vivant ».
//
// Ce fichier ne touche pas au navigateur : il peut être testé avec
// « node --test ».
// =============================================================================

import * as THREE from '../lib/three/three.module.js';

// Tous les objets 3D qu'on peut atteindre depuis une valeur (objet, liste, Map…).
function objetsAtteignables(valeur, trouves = new Set(), vus = new Set(), profondeur = 0) {
  if (!valeur || typeof valeur !== 'object' || vus.has(valeur) || profondeur > 6) return trouves;
  vus.add(valeur);
  if (valeur.isObject3D) {
    trouves.add(valeur);
    return trouves;
  }
  if (valeur.isMaterial || valeur.isBufferGeometry || valeur.isTexture) return trouves;
  const enfants = valeur instanceof Map ? [...valeur.values()] : Array.isArray(valeur) ? valeur : Object.values(valeur);
  for (const e of enfants) objetsAtteignables(e, trouves, vus, profondeur + 1);
  return trouves;
}

// Une forme peut-elle être soudée ? (Sans regarder encore si elle bouge.)
function estSoudable(o) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return false;
  const m = o.material;
  if (!m || Array.isArray(m) || m.transparent || m.userData.vent || m.vertexColors) return false;
  if (o.renderOrder !== 0 || o.userData.vivant || o.userData.animer) return false;
  const g = o.geometry;
  if (!g.attributes.position || !g.attributes.normal || g.morphAttributes.position) return false;
  if (m.map && !g.attributes.uv) return false;
  return true;
}

// La « photo » d'un objet : où il est, et s'il est visible.
function photographier(scene, candidats) {
  scene.updateMatrixWorld(true);
  return candidats.map((o) => {
    let visible = true;
    for (let p = o; p; p = p.parent) visible = visible && p.visible;
    return { visible, matrice: o.matrixWorld.elements.slice() };
  });
}
function memePhoto(a, b) {
  if (a.visible !== b.visible) return false;
  for (let i = 0; i < 16; i++) {
    // (NaN ≠ NaN : un objet dont la position devient invalide est « vivant ».)
    if (!(Math.abs(a.matrice[i] - b.matrice[i]) < 1e-6)) return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Soude le décor fixe d'un lieu.
//   scene  : la scène du lieu ;
//   decor  : ce que le constructeur du lieu a renvoyé (ce qui s'y trouve reste libre) ;
//   sondes : des fonctions qui font vivre le lieu (animations, réglages) ; on
//            les appelle une par une pour repérer ce qui bouge.
// Renvoie { avant, apres } : le nombre de formes concernées, avant et après.
// -----------------------------------------------------------------------------
export function fusionnerDecor(scene, decor = null, sondes = []) {
  // 1. Ce que le jeu tient « en main » reste libre, avec tout ce qu'il contient.
  const libres = new Set();
  for (const o of objetsAtteignables(decor)) o.traverse((e) => libres.add(e));

  const candidats = [];
  scene.traverse((o) => {
    if (!libres.has(o) && estSoudable(o)) candidats.push(o);
  });

  // 2. On fait vivre le lieu : ce qui change n'est pas fixe.
  const vivants = new Set();
  let reference = photographier(scene, candidats);
  reference.forEach((p, i) => { if (!p.visible) vivants.add(candidats[i]); });
  for (const sonde of sondes) {
    try { sonde(); } catch { /* une sonde qui échoue ne doit pas empêcher le jeu de démarrer */ }
    const photo = photographier(scene, candidats);
    photo.forEach((p, i) => { if (!memePhoto(p, reference[i])) vivants.add(candidats[i]); });
    reference = photo;
  }

  // 3. On range les formes fixes par matière (et par type d'ombre).
  const paquets = new Map();
  for (const o of candidats) {
    if (vivants.has(o)) continue;
    const cle = `${o.material.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    if (!paquets.has(cle)) paquets.set(cle, []);
    paquets.get(cle).push(o);
  }

  // 4. On soude chaque paquet en un seul objet.
  let avant = 0;
  let apres = 0;
  for (const formes of paquets.values()) {
    if (formes.length < 2) continue;
    const soude = souder(formes);
    for (const o of formes) o.removeFromParent();
    scene.add(soude);
    avant += formes.length;
    apres += 1;
  }
  return { avant, apres };
}

// Fabrique un seul objet à partir de plusieurs formes de même matière : on
// recopie tous leurs points, placés là où ils sont dans le lieu.
function souder(formes) {
  const matiere = formes[0].material;
  const avecUv = Boolean(matiere.map);
  let points = 0;
  let indices = 0;
  for (const o of formes) {
    const g = o.geometry;
    points += g.attributes.position.count;
    indices += g.index ? g.index.count : g.attributes.position.count;
  }
  const positions = new Float32Array(points * 3);
  const normales = new Float32Array(points * 3);
  const uvs = avecUv ? new Float32Array(points * 2) : null;
  const index = points > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);

  const v = new THREE.Vector3();
  const matriceNormale = new THREE.Matrix3();
  let p = 0; // le prochain point à écrire
  let k = 0; // le prochain indice à écrire
  for (const o of formes) {
    const g = o.geometry;
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    matriceNormale.getNormalMatrix(o.matrixWorld);
    // Une forme « retournée » (échelle négative) : on inverse le sens de ses triangles.
    const retournee = o.matrixWorld.determinant() < 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      positions.set([v.x, v.y, v.z], (p + i) * 3);
      v.fromBufferAttribute(nor, i).applyMatrix3(matriceNormale).normalize();
      normales.set([v.x, v.y, v.z], (p + i) * 3);
      if (avecUv) uvs.set([g.attributes.uv.getX(i), g.attributes.uv.getY(i)], (p + i) * 2);
    }
    const nombre = g.index ? g.index.count : pos.count;
    for (let i = 0; i < nombre; i += 3) {
      const a = g.index ? g.index.getX(i) : i;
      const b = g.index ? g.index.getX(i + 1) : i + 1;
      const c = g.index ? g.index.getX(i + 2) : i + 2;
      index[k++] = p + a;
      index[k++] = p + (retournee ? c : b);
      index[k++] = p + (retournee ? b : c);
    }
    p += pos.count;
  }

  const forme = new THREE.BufferGeometry();
  forme.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  forme.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
  if (avecUv) forme.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  forme.setIndex(new THREE.BufferAttribute(index, 1));
  const soude = new THREE.Mesh(forme, matiere);
  soude.castShadow = formes[0].castShadow;
  soude.receiveShadow = formes[0].receiveShadow;
  soude.userData.soude = formes.length;
  return soude;
}
