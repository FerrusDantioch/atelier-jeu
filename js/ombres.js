// =============================================================================
// ombres.js — dessiner les « ombres de contact » (version 1.7.1)
// -----------------------------------------------------------------------------
// La liste des ombres d'un lieu vient de logique-ombres.js. Ici, on les
// dessine : chaque ombre est un rectangle posé à plat, juste au-dessus du sol.
// Un petit programme de la carte graphique (un « shader ») calcule, pour
// chaque point du rectangle, à quelle distance il est du pied de l'objet :
// tout près, l'ombre est foncée ; plus loin, elle s'efface en douceur.
//
// Toutes les ombres d'un lieu forment UN SEUL objet : la carte graphique les
// dessine d'un seul coup. Les personnages ont un deuxième objet, dont les
// ombres sont déplacées à chaque image.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';

const HAUTEUR = 0.07; // juste au-dessus de l'herbe, des pavés et des chemins

// La matière des ombres (la même pour tous les lieux).
//   forme : (demi-largeur, demi-profondeur, arrondi, marge) de chaque ombre ;
//   local : la position du point par rapport au centre de l'ombre.
const matiereOmbre = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uForce: { value: 1 } }]),
  transparent: true,
  depthWrite: false,
  fog: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
  vertexShader: `
    attribute vec4 forme;
    attribute vec2 local;
    attribute float force;
    varying vec4 vForme;
    varying vec2 vLocal;
    varying float vForce;
    #include <fog_pars_vertex>
    void main() {
      vForme = forme;
      vLocal = local;
      vForce = force;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: `
    uniform float uForce;
    varying vec4 vForme;
    varying vec2 vLocal;
    varying float vForce;
    #include <fog_pars_fragment>
    void main() {
      // La distance au bord de l'objet (un rectangle aux coins arrondis, ou un rond).
      vec2 q = abs(vLocal) - (vForme.xy - vForme.z);
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - vForme.z;
      // Foncée contre l'objet, puis de plus en plus légère jusqu'à la marge.
      float a = 1.0 - smoothstep(0.0, vForme.w, d);
      a = a * a * vForce * uForce;
      #ifdef USE_FOG
        a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth); // au loin, l'ombre se perd dans la brume
      #endif
      gl_FragColor = vec4(0.07, 0.06, 0.09, a);
    }`,
});

// Prépare un objet capable de dessiner jusqu'à « nombre » ombres.
function creerPlaque(nombre) {
  const forme = new THREE.BufferGeometry();
  forme.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nombre * 12), 3));
  forme.setAttribute('local', new THREE.BufferAttribute(new Float32Array(nombre * 8), 2));
  forme.setAttribute('forme', new THREE.BufferAttribute(new Float32Array(nombre * 16), 4));
  forme.setAttribute('force', new THREE.BufferAttribute(new Float32Array(nombre * 4), 1));
  const index = [];
  for (let i = 0; i < nombre; i++) index.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 1, i * 4 + 2, i * 4 + 3);
  forme.setIndex(index);
  const plaque = new THREE.Mesh(forme, matiereOmbre);
  plaque.frustumCulled = false; // (les ombres bougent : on ne recalcule pas leur boîte)
  plaque.userData.vivant = true; // à ne pas souder au décor (voir fusion.js)
  return plaque;
}

// Écrit les ombres d'une liste dans une plaque (au plus autant que sa taille).
const COINS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
function ecrireOmbres(plaque, liste) {
  const { position, local, forme, force } = plaque.geometry.attributes;
  const nombre = Math.min(liste.length, position.count / 4);
  for (let i = 0; i < nombre; i++) {
    const o = liste[i];
    const lx = o.demiLargeur + o.marge;
    const lz = o.demiProfondeur + o.marge;
    COINS.forEach(([sx, sz], c) => {
      const k = i * 4 + c;
      position.setXYZ(k, o.x + sx * lx, HAUTEUR, o.z + sz * lz);
      local.setXY(k, sx * lx, sz * lz);
      forme.setXYZW(k, o.demiLargeur, o.demiProfondeur, o.arrondi, o.marge);
      force.setX(k, o.force);
    });
  }
  for (const a of [position, local, forme, force]) a.needsUpdate = true;
  plaque.geometry.setDrawRange(0, nombre * 6);
}

// Les ombres FIXES d'un lieu. « liste » : voir ombresDeContact (logique-ombres.js).
export function creerOmbresContact(liste) {
  const plaque = creerPlaque(Math.max(1, liste.length));
  ecrireOmbres(plaque, liste);
  return plaque;
}

// Les ombres des PERSONNAGES : un seul objet, qui suit Ferrus de lieu en lieu.
// À chaque image, on lui donne la liste des ombres à dessiner :
//   ombres.userData.placer(liste)   (voir ombrePersonnage dans logique-ombres.js)
export function creerOmbresPersonnages(nombre = 24) {
  const plaque = creerPlaque(nombre);
  for (const a of Object.values(plaque.geometry.attributes)) a.setUsage(THREE.DynamicDrawUsage);
  plaque.geometry.setDrawRange(0, 0);
  plaque.userData.placer = (liste) => ecrireOmbres(plaque, liste);
  return plaque;
}

// La force de toutes les ombres de contact, de 0 à 1 (pour les essais).
export function reglerOmbresContact(force) {
  matiereOmbre.uniforms.uForce.value = force;
}
