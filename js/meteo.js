// =============================================================================
// meteo.js — la météo douce, en 3D (version 1.5)
// -----------------------------------------------------------------------------
// Les règles (quel jour il pleut, quand la brume se lève) sont dans
// logique-meteo.js. Ici :
//   1. LA PLUIE : de fines gouttes, transparentes et peu nombreuses, qui
//      tombent un peu en biais. Elles suivent Ferrus d'un lieu à l'autre ;
//   2. LES FLAQUES : sur les chemins et les pavés, elles apparaissent sous la
//      pluie et sèchent peu à peu ensuite ;
//   3. LA LUMIÈRE : sous la pluie, le ciel devient un peu plus gris et plus
//      doux ; dans la brume, on voit moins loin. Jamais d'éclair.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';

// -----------------------------------------------------------------------------
// 1. La pluie
// -----------------------------------------------------------------------------
const NOMBRE_GOUTTES = 110;
const LARGEUR = 26;
const PROFONDEUR = 22;
const HAUTEUR = 8;

export function creerPluie() {
  const materiau = new THREE.MeshBasicMaterial({ color: '#d4dde2', transparent: true, opacity: 0.32, depthWrite: false });
  const pluie = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.42, 0.014), materiau, NOMBRE_GOUTTES);
  pluie.frustumCulled = false;
  let valeur = 4242;
  const hasard = () => ((valeur = (valeur * 16807) % 2147483647) / 2147483647);
  const graines = [];
  for (let i = 0; i < NOMBRE_GOUTTES; i++) graines.push({ u: hasard(), v: hasard(), h: hasard(), vitesse: 0.85 + hasard() * 0.3 });
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.12)); // un peu en biais
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  const boucler = (a, n) => ((a % n) + n) % n;
  pluie.userData.animer = (t, cx, cz, force) => {
    pluie.visible = force > 0.01;
    if (!pluie.visible) return;
    pluie.count = Math.round(NOMBRE_GOUTTES * Math.min(1, force));
    const x0 = cx - LARGEUR / 2;
    const z0 = cz - PROFONDEUR / 2;
    for (let i = 0; i < pluie.count; i++) {
      const g = graines[i];
      const chute = boucler(g.h * HAUTEUR + t * 6 * g.vitesse, HAUTEUR);
      p.set(x0 + boucler(g.u * LARGEUR - chute * 0.12 - x0, LARGEUR), HAUTEUR - chute, z0 + boucler(g.v * PROFONDEUR - z0, PROFONDEUR));
      m.compose(p, q, s);
      pluie.setMatrixAt(i, m);
    }
    pluie.instanceMatrix.needsUpdate = true;
  };
  pluie.visible = false;
  return pluie;
}

// -----------------------------------------------------------------------------
// 2. Les flaques
// -----------------------------------------------------------------------------
// Où se forment les flaques, dans chaque lieu (sur les chemins et les pavés).
export const FLAQUES = {
  place: [[-7, -3.6, 0.7], [2.6, 3.4, 0.9], [-3, -1.6, 0.6], [0.3, 8.6, 0.8], [4.8, -2.2, 0.55]],
  marche: [[-2, 1.2, 0.8], [4, -2.2, 0.7], [-6.2, 5, 0.9], [2.5, -6.2, 0.6], [9.5, 3, 0.7]],
  moulin: [[-9.4, 0.5, 0.7], [-3.6, 0.8, 0.6]],
  gare: [[-8, 0.2, 0.7], [2, -4.6, 0.6], [-3.6, -1.2, 0.55], [6, -4.5, 0.5]],
  mine: [[0, -0.6, 0.8], [5, -1.6, 0.6], [-5.4, 0.4, 0.55]],
  lac: [[6.5, 0, 0.7], [10, 0.2, 0.6], [-2.5, 0.8, 0.6]],
  foret: [[-9.5, 0.2, 0.7], [-3, -0.1, 0.6], [4.6, -1.6, 0.6]],
};

const matiereFlaque = new THREE.MeshBasicMaterial({ color: '#8f9fa6', transparent: true, opacity: 0, depthWrite: false });
export function creerFlaques(scene, liste = []) {
  const forme = new THREE.CircleGeometry(1, 24);
  for (const [x, z, r] of liste) {
    const f = new THREE.Mesh(forme, matiereFlaque);
    f.rotation.x = -Math.PI / 2;
    f.position.set(x, 0.065, z);
    f.scale.set(r, r * 0.7, 1);
    scene.add(f);
  }
}
export function mouillerFlaques(flaques) {
  matiereFlaque.opacity = flaques * 0.42;
}

// -----------------------------------------------------------------------------
// 3. La lumière sous la pluie et dans la brume
// -----------------------------------------------------------------------------
// À appeler APRÈS la lumière du moment (elle part de ses couleurs).
// « distance » : de la caméra à Ferrus (plus grande sur un téléphone en hauteur).
export function appliquerMeteo(scene, meteo, distance = 19.5) {
  const { ciel, soleil } = scene.userData.lumieres;
  const { pluie, brume } = meteo;
  ciel.intensity *= 1 - 0.18 * pluie;
  soleil.intensity *= 1 - 0.45 * pluie - 0.2 * brume;
  // Le ciel devient un peu plus gris sous la pluie (on garde sa clarté), et
  // un peu plus pâle et laiteux dans la brume.
  const gris = 0.4 * pluie + 0.3 * brume;
  for (const couleur of [scene.background, scene.fog.color]) {
    const l = 0.3 * couleur.r + 0.59 * couleur.g + 0.11 * couleur.b;
    couleur.r += (l - couleur.r) * gris;
    couleur.g += (l - couleur.g) * gris;
    couleur.b += (l * 1.04 - couleur.b) * gris;
    const pale = 0.35 * brume;
    couleur.r += (0.5 * couleur.r + 0.45 - couleur.r) * pale;
    couleur.g += (0.5 * couleur.g + 0.44 - couleur.g) * pale;
    couleur.b += (0.5 * couleur.b + 0.42 - couleur.b) * pale;
  }
  // Dans la brume, on voit moins loin (jamais au point de ne plus voir Ferrus).
  const ecart = distance - 19.5;
  scene.fog.near = Math.max(distance - 1, 34 + ecart - 14 * brume - 8 * pluie);
  scene.fog.far = Math.max(distance + 14, 70 + ecart - 34 * brume - 12 * pluie);
}
