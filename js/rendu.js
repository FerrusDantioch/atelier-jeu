// =============================================================================
// rendu.js — une plus belle image : lumière, ciel, reflets (version 1.7)
// -----------------------------------------------------------------------------
//   1. LE MOTEUR : une « correction tonale » (les couleurs très claires ne
//      « brûlent » plus, les ombres sont plus profondes) et des ombres aux
//      bords plus doux.
//   2. LES REFLETS : une petite image du ciel, fabriquée par le jeu, que le
//      cuivre et le laiton reflètent (voir « matiere » dans decor.js).
//   3. LE CIEL : un grand dôme autour du lieu, avec un dégradé, le soleil (ou
//      la lune), des étoiles la nuit et de légers nuages qui dérivent. On le
//      voit surtout en mode photo et pendant les voyages en dirigeable.
//
// Tout est calculé par le jeu : aucune image, aucun fichier à télécharger.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';

// -----------------------------------------------------------------------------
// 1. LE MOTEUR
// -----------------------------------------------------------------------------
export function reglerMoteur(renderer) {
  // « Neutre » : la correction qui garde le mieux les couleurs choisies pour le jeu.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.25;
}

// Les lumières du jeu ont été réglées avant la correction tonale. Avec elle,
// on peut donner plus de force au soleil et un peu moins à la lumière du ciel :
// les volumes se lisent mieux (un côté éclairé, un côté à l'ombre).
export const FORCES = { ciel: 0.72, soleil: 1.5 };

// -----------------------------------------------------------------------------
// 2. LES REFLETS
// -----------------------------------------------------------------------------
// On fabrique un petit « studio » : un ciel clair en haut, un sol chaud en bas,
// et deux grandes taches de lumière. Le moteur en tire une image que les métaux
// reflètent. Renvoie cette image (à ranger dans « scene.environment »).
export function creerReflets(renderer) {
  const studio = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(10, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vDir;
        void main() {
          float h = normalize(vDir).y;
          vec3 sol = vec3(0.30, 0.24, 0.17);
          vec3 horizon = vec3(1.0, 0.90, 0.74);
          vec3 zenith = vec3(0.62, 0.76, 0.90);
          vec3 c = h < 0.0 ? mix(horizon, sol, smoothstep(0.0, -0.35, h)) : mix(horizon, zenith, smoothstep(0.0, 0.8, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  studio.add(dome);
  const tache = (x, y, z, taille, force) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(taille, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(force, force * 0.92, force * 0.78) }));
    m.position.set(x, y, z);
    studio.add(m);
  };
  tache(-5, 6, 4, 2.2, 6);   // le soleil
  tache(6, 3, -3, 1.6, 2.5); // une lueur de l'autre côté
  const fabrique = new THREE.PMREMGenerator(renderer);
  const reflets = fabrique.fromScene(studio, 0.03, 0.1, 100, { size: 64 }).texture; // (petite : elle sert seulement à de petits objets)
  fabrique.dispose();
  dome.geometry.dispose();
  dome.material.dispose();
  return reflets;
}

// Les matières de métal du jeu. Elles reçoivent l'image des reflets dès qu'elle
// est prête (« definirReflets »), et brillent moins la nuit (« eclairerMetaux »).
const metaux = [];
let imageReflets = null;
export function matiereMetal(couleur, options = {}) {
  const m = new THREE.MeshStandardMaterial({ color: couleur, metalness: 0.8, roughness: 0.4, envMap: imageReflets, ...options });
  metaux.push(m);
  return m;
}
export function definirReflets(image) {
  imageReflets = image;
  for (const m of metaux) {
    m.envMap = image;
    m.needsUpdate = true;
  }
}
// « nuit » : de 0 (plein jour) à 1 (pleine nuit).
export function eclairerMetaux(nuit) {
  const force = 0.3 + 0.7 * (1 - nuit);
  for (const m of metaux) m.envMapIntensity = force;
}

// -----------------------------------------------------------------------------
// 3. LE CIEL
// -----------------------------------------------------------------------------
// Renvoie le dôme, avec « userData.regler({ horizon, nuit, soleil, temps, pluie }) » :
//   horizon : la couleur du bas du ciel (celle de la brume du lieu) ;
//   nuit    : de 0 (plein jour) à 1 (pleine nuit) ;
//   soleil  : la direction du soleil (ou de la lune) ;
//   temps   : le temps du jeu, pour faire dériver les nuages ;
//   pluie   : de 0 à 1 (le ciel se couvre).
export function creerCiel() {
  const uniforms = {
    uHorizon: { value: new THREE.Color('#e9dcc3') },
    uZenith: { value: new THREE.Color('#8fb8d6') },
    uAstre: { value: new THREE.Vector3(-0.4, 0.8, 0.45) },
    uNuit: { value: 0 },
    uTemps: { value: 0 },
    uCouvert: { value: 0 },
  };
  const ciel = new THREE.Mesh(
    new THREE.SphereGeometry(100, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uAstre;
        uniform float uNuit; uniform float uTemps; uniform float uCouvert;
        varying vec3 vDir;
        float hasard(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float bruit(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hasard(i), hasard(i + vec2(1.0, 0.0)), f.x), mix(hasard(i + vec2(0.0, 1.0)), hasard(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          vec3 d = normalize(vDir);
          float h = max(d.y, 0.0);
          // Le dégradé : la couleur de la brume à l'horizon, plus bleue vers le haut.
          vec3 c = mix(uHorizon, uZenith, smoothstep(0.02, 0.75, h));
          // Les étoiles, la nuit (elles ne clignotent pas).
          vec2 pe = d.xz / (0.35 + h) * 34.0;
          vec2 cel = floor(pe);
          float he = hasard(cel);
          vec2 centre = vec2(fract(he * 13.7), fract(he * 71.3)) * 0.7 + 0.15;
          float etoile = step(0.9, he) * smoothstep(0.11, 0.0, length(fract(pe) - centre));
          c += vec3(0.9, 0.92, 1.0) * etoile * uNuit * smoothstep(0.05, 0.35, h) * (1.0 - uCouvert);
          // Le soleil (le jour) ou la lune (la nuit) : un disque et une lueur douce.
          float a = dot(d, normalize(uAstre));
          vec3 teinte = mix(vec3(1.0, 0.93, 0.78), vec3(0.86, 0.9, 1.0), uNuit);
          float disque = smoothstep(mix(0.9987, 0.9992, uNuit), mix(0.9993, 0.9996, uNuit), a);
          float lueur = pow(max(a, 0.0), 24.0) * mix(0.35, 0.12, uNuit);
          c += teinte * (disque * mix(0.9, 0.7, uNuit) + lueur) * (1.0 - 0.8 * uCouvert);
          // Les nuages : un bruit doux qui dérive lentement, plus épais sous la pluie.
          vec2 pn = d.xz / (0.22 + h) * 1.6 + vec2(uTemps * 0.006, uTemps * 0.002);
          float n = bruit(pn) * 0.55 + bruit(pn * 2.1 + 7.3) * 0.3 + bruit(pn * 4.3 + 2.1) * 0.15;
          float nuage = smoothstep(0.56 - 0.3 * uCouvert, 0.8 - 0.25 * uCouvert, n) * smoothstep(0.02, 0.22, h);
          vec3 blanc = mix(mix(vec3(1.0), uHorizon, 0.35), uHorizon * 1.25, uNuit);
          blanc = mix(blanc, uHorizon * 0.92, uCouvert * 0.6);
          c = mix(c, blanc, nuage * mix(0.85, 0.45, uNuit));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  ciel.frustumCulled = false;
  ciel.renderOrder = -10;
  ciel.userData.vivant = true;
  const jour = new THREE.Color('#86b3d4');
  const nuitee = new THREE.Color('#141a36');
  ciel.userData.regler = ({ horizon, nuit, soleil, temps, pluie = 0 }) => {
    uniforms.uHorizon.value.copy(horizon);
    // Le haut du ciel : bleu le jour, bleu nuit la nuit, toujours un peu teinté
    // par l'horizon (rose à l'aube, doré le soir, gris sous la pluie).
    uniforms.uZenith.value.copy(jour).lerp(nuitee, nuit).lerp(horizon, 0.22 + 0.5 * pluie);
    uniforms.uAstre.value.copy(soleil);
    uniforms.uNuit.value = nuit;
    uniforms.uTemps.value = temps;
    uniforms.uCouvert.value = pluie;
  };
  return ciel;
}
