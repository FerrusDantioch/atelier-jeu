// =============================================================================
// camera.js — la caméra qui suit Ferrus en douceur (sorti de main.js en 1.7.1)
// -----------------------------------------------------------------------------
// On vise un point un peu au-dessus de Ferrus. La caméra est placée derrière
// et au-dessus de ce point. Sur un écran en hauteur (téléphone tenu droit),
// on recule un peu pour voir assez du lieu.
//
// À chaque image, la caméra parcourt une petite partie du chemin qui la sépare
// de sa place idéale : elle « glisse » vers Ferrus, sans secousse.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { ZONES } from './logique-zones.js';
import { positionCameraPhoto } from './logique-photo.js';

// « camera » : la caméra du moteur 3D (voir moteur.js).
export function creerCameraSuiveuse(camera) {
  const visee = new THREE.Vector3();        // le point que la caméra doit regarder
  const viseeLissee = new THREE.Vector3();  // le point qu'elle regarde vraiment (il suit en douceur)
  const placeVoulue = new THREE.Vector3();  // l'endroit où la caméra doit se trouver

  // Calcule la visée et range la place idéale de la caméra dans « sortie ».
  function calculer(zone, position, sortie) {
    const enHauteur = camera.aspect < 1;
    const recul = enHauteur ? 1.8 : 1;
    // La visée reste un peu à l'intérieur du lieu, pour ne pas montrer le vide.
    const b = ZONES[zone].camera;
    const vx = Math.max(b.minX, Math.min(b.maxX, position.x));
    const vz = Math.max(b.minZ, Math.min(b.maxZ, position.z));
    visee.set(vx, 0.8, vz - 0.5);
    sortie.set(vx, 0.8 + 15 * recul, vz - 0.5 + 12.5 * recul);
  }

  return {
    // Le point regardé (la pluie et les flocons tombent autour de lui).
    visee: viseeLissee,

    // Place la caméra directement (on ne la voit pas bouger : l'écran est voilé).
    replacer(zone, position) {
      calculer(zone, position, camera.position);
      viseeLissee.copy(visee);
      camera.lookAt(viseeLissee);
    },

    // À chaque image : la caméra glisse vers sa place idéale.
    suivre(zone, position, dt) {
      calculer(zone, position, placeVoulue);
      const douceur = 1 - Math.exp(-dt * 3.5);
      camera.position.lerp(placeVoulue, douceur);
      viseeLissee.lerp(visee, douceur);
      camera.lookAt(viseeLissee);
    },

    // Le mode photo (version 1.6) : la caméra tourne librement autour de Ferrus.
    // « reglage » : l'angle, la hauteur et la distance choisis (logique-photo.js).
    tournerAutour(reglage, position, dt) {
      const cible = { x: position.x, y: 1.0, z: position.z };
      const p = positionCameraPhoto(reglage, cible);
      camera.position.lerp(placeVoulue.set(p.x, p.y, p.z), 1 - Math.exp(-dt * 12));
      viseeLissee.lerp(visee.set(cible.x, cible.y, cible.z), 1 - Math.exp(-dt * 12));
      camera.lookAt(viseeLissee);
    },
  };
}
