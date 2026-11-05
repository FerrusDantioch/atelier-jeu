// =============================================================================
// vie.js — un décor qui vit : fumée, vent, lanternes (version 1.2)
// -----------------------------------------------------------------------------
//   1. LE VENT : le feuillage des arbres et des buissons se balance un tout
//      petit peu, chacun à son rythme (calculé par la carte graphique : léger).
//   2. LA FUMÉE : de petites bouffées rondes sortent des cheminées, montent
//      lentement en grossissant, penchent avec le vent et s'effacent.
//   3. LA NUIT : les fenêtres et les lanternes s'allument doucement quand le
//      soir tombe, avec un halo chaud autour des lanternes.
//
// Confort : tout est lent et doux, rien ne clignote. Si le système demande
// « moins d'animations », main.js n'anime ni le vent ni la fumée.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { boite, cylindre, boule } from './formes.js';

// -----------------------------------------------------------------------------
// 1. LE VENT
// -----------------------------------------------------------------------------
const temps = { value: 0 };

// La matière d'un feuillage qui se balance au vent. Chaque arbre a son propre
// rythme (calculé à partir de sa position), pour que tout ne bouge pas en même
// temps ; le haut du feuillage bouge plus que le bas.
const feuillages = new Map();
export function matiereFeuillage(couleur, force = 1) {
  const cle = couleur + force;
  if (feuillages.has(cle)) return feuillages.get(cle);
  const m = new THREE.MeshLambertMaterial({ color: couleur });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uVent = temps;
    shader.uniforms.uForceVent = { value: force };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uVent;\nuniform float uForceVent;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 baseVent = modelMatrix[3].xyz;
        #ifdef USE_INSTANCING
          baseVent += instanceMatrix[3].xyz;
        #endif
        float phaseVent = baseVent.x * 0.37 + baseVent.z * 0.23;
        float hauteurVent = clamp(position.y + 0.8, 0.0, 2.2) * uForceVent;
        transformed.x += (sin(uVent * 1.1 + phaseVent) * 0.045 + sin(uVent * 2.3 + phaseVent * 1.7) * 0.012) * hauteurVent;
        transformed.z += cos(uVent * 0.8 + phaseVent) * 0.025 * hauteurVent;`);
  };
  feuillages.set(cle, m);
  return m;
}

// À appeler à chaque image : fait souffler le vent (et monter la fumée).
export function animerVent(tempsTotal) {
  temps.value = tempsTotal;
}

// -----------------------------------------------------------------------------
// 2. LA FUMÉE
// -----------------------------------------------------------------------------
// Renvoie un groupe à placer en haut d'une cheminée, avec :
//   - userData.animer(t) : fait monter les bouffées ;
//   - userData.force : de 0 (pas de fumée) à 1 (beaucoup), modifiable.
const formeBouffee = boule(1, 1);
export function creerFumee({ nombre = 5, hauteur = 2.4, taille = 0.3, couleur = '#ece7de', periode = 7, opacite = 0.55, vent = [0.9, -0.25], force = 1 } = {}) {
  const groupe = new THREE.Group();
  const bouffees = [];
  for (let i = 0; i < nombre; i++) {
    const b = new THREE.Mesh(
      formeBouffee,
      new THREE.MeshLambertMaterial({ color: couleur, transparent: true, opacity: 0, depthWrite: false })
    );
    b.userData.decalage = i / nombre;
    groupe.add(b);
    bouffees.push(b);
  }
  groupe.userData.force = force;
  // Le vent peut changer (par exemple pour la fumée d'un train qui roule).
  groupe.userData.vent = vent;
  groupe.userData.animer = (t) => {
    const f = groupe.userData.force;
    const [vx, vz] = groupe.userData.vent;
    for (const b of bouffees) {
      // « a » va de 0 (la bouffée sort) à 1 (elle a disparu), puis recommence.
      const a = ((t / periode + b.userData.decalage) % 1 + 1) % 1;
      b.position.set(vx * a * a * hauteur * 0.6, a * hauteur, vz * a * a * hauteur * 0.6);
      const s = taille * (0.45 + a * 1.5);
      b.scale.set(s, s * 0.85, s);
      // Elle apparaît en douceur, puis s'efface en montant.
      b.material.opacity = opacite * f * Math.min(1, a * 5) * (1 - a) ** 1.3;
      b.visible = b.material.opacity > 0.005;
    }
  };
  groupe.userData.animer(0);
  return groupe;
}

// -----------------------------------------------------------------------------
// 3. LA NUIT : fenêtres, lanternes et halos
// -----------------------------------------------------------------------------
// Les vitres des fenêtres : une lueur chaude, plus forte la nuit.
export const MATIERE_FENETRE = new THREE.MeshLambertMaterial({ color: '#f0cf8c', emissive: '#7a5524' });
// Le verre des lanternes : presque éteint le jour, doré la nuit.
export const MATIERE_LUEUR = new THREE.MeshLambertMaterial({ color: '#efe0bc', emissive: '#d0943c', emissiveIntensity: 0.1 });

// Le halo autour d'une lanterne : une petite image ronde et floue, toujours
// tournée vers la caméra, qui s'éclaire la nuit. Toutes les lanternes
// partagent la même matière : un seul réglage les allume toutes.
let matiereHalo = null;
function obtenirMatiereHalo() {
  if (matiereHalo) return matiereHalo;
  const toile = document.createElement('canvas');
  toile.width = 64;
  toile.height = 64;
  const ctx = toile.getContext('2d');
  const degrade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  degrade.addColorStop(0, 'rgba(255, 224, 160, 1)');
  degrade.addColorStop(0.35, 'rgba(255, 205, 130, 0.45)');
  degrade.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  matiereHalo = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return matiereHalo;
}
export function creerHalo(taille = 1.6) {
  const halo = new THREE.Sprite(obtenirMatiereHalo());
  halo.scale.set(taille, taille, 1);
  return halo;
}

// « nuit » : de 0 (plein jour) à 1 (pleine nuit). Allume tout doucement les
// fenêtres, les lanternes et leurs halos.
export function eclairerNuit(nuit) {
  MATIERE_FENETRE.emissiveIntensity = 1 + nuit * 1.5;
  MATIERE_LUEUR.emissiveIntensity = 0.1 + nuit * 1.7;
  obtenirMatiereHalo().opacity = nuit * 0.6;
}

// Une lanterne sur un poteau de fonte (2,6 m de haut), avec son halo.
const COULEUR_FONTE = '#3f4a46';
export function creerLampadaire() {
  const g = new THREE.Group();
  const fonte = new THREE.MeshLambertMaterial({ color: COULEUR_FONTE });
  const piece = (forme, matiere, y) => {
    const m = new THREE.Mesh(forme, matiere);
    m.position.y = y;
    g.add(m);
    return m;
  };
  piece(cylindre(0.17, 0.2, 0.25), fonte, 0.125);           // le socle
  piece(cylindre(0.055, 0.07, 2.1), fonte, 1.25).castShadow = true; // le poteau
  piece(boite(0.32, 0.06, 0.32, 0.025), fonte, 2.3);          // le support
  piece(cylindre(0.12, 0.09, 0.3, 12, 0.03), MATIERE_LUEUR, 2.48); // le verre
  piece(new THREE.ConeGeometry(0.2, 0.18, 14), fonte, 2.72);  // le chapeau
  piece(boule(0.035, 1), fonte, 2.83);                        // la petite boule du haut
  const halo = creerHalo(1.7);
  halo.position.y = 2.48;
  g.add(halo);
  return g;
}
