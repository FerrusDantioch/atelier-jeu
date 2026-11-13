// =============================================================================
// portraits.js — le petit « studio photo » des portraits (album, garde-robe)
// -----------------------------------------------------------------------------
// Pour dessiner le portrait d'un personnage, on le place seul devant une
// petite caméra, et c'est le moteur 3D du jeu lui-même qui prend la photo,
// dans un coin de l'image (avant la version 1.7, un deuxième moteur 3D était
// créé rien que pour ça). Le coin est recopié aussitôt, puis le jeu redessine
// le lieu par-dessus : le joueur ne voit rien.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { creerFerrus, creerOdile, creerPersonnage, habillerFerrus, TENUES_PNJ } from './personnages.js';
import { creerChat, creerOiseau, animerChat } from './compagnons.js';

// « renderer » : le moteur 3D du jeu ; « redessiner » : redessine le lieu.
// Renvoie la fonction photographier(modele, hauteur, distance, surplomb), qui
// renvoie l'image (une adresse « data: ») d'un portrait de 128 × 128 pixels.
function creerStudio(renderer, redessiner) {
  const TAILLE_PORTRAIT = 128;
  let studio = null;
  return function photographier(modele, hauteur, distance, surplomb = 0.1) {
    if (!studio) {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#e6d3b0');
      scene.add(new THREE.HemisphereLight('#fff1d8', '#8a7558', 2.2));
      const lampe = new THREE.DirectionalLight('#ffe0b8', 1.3);
      lampe.position.set(-2, 3, 4);
      scene.add(lampe);
      const toile = document.createElement('canvas');
      toile.width = TAILLE_PORTRAIT;
      toile.height = TAILLE_PORTRAIT;
      studio = { scene, appareil: new THREE.PerspectiveCamera(30, 1, 0.05, 20), toile };
    }
    const { scene, appareil, toile } = studio;
    appareil.position.set(0, hauteur + surplomb, distance);
    appareil.lookAt(0, hauteur, 0);
    scene.add(modele);
    const source = renderer.domElement;
    const cote = TAILLE_PORTRAIT / renderer.getPixelRatio(); // 128 vrais pixels
    try {
      renderer.setViewport(0, 0, cote, cote);
      renderer.setScissor(0, 0, cote, cote);
      renderer.setScissorTest(true);
      renderer.render(scene, appareil);
      // Le coin en bas à gauche de l'image du jeu → notre petite toile.
      toile.getContext('2d').drawImage(source, 0, source.height - TAILLE_PORTRAIT, TAILLE_PORTRAIT, TAILLE_PORTRAIT, 0, 0, TAILLE_PORTRAIT, TAILLE_PORTRAIT);
      return toile.toDataURL('image/png');
    } finally {
      scene.remove(modele);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      redessiner(); // on redessine tout de suite le lieu par-dessus
    }
  };
}

// -----------------------------------------------------------------------------
// Les portraits de l'album (version 1.5) et l'aperçu de la garde-robe (1.6)
// -----------------------------------------------------------------------------
// Chaque portrait est dessiné une seule fois, la première fois qu'on ouvre
// l'album : on place le personnage devant la petite caméra du studio, on prend
// la photo, et on la garde.
// Renvoie { portrait(id), apercuFerrus(tenue) } ; chacune renvoie une image,
// ou null si elle n'a pas pu être faite (l'album affiche alors un « ? »).
export function creerPortraits(renderer, redessiner) {
  const photographier = creerStudio(renderer, redessiner);
  const portraits = new Map();
  let mannequin = null; // un deuxième Ferrus, pour l'aperçu de la garde-robe

  function portrait(id) {
    if (portraits.has(id)) return portraits.get(id);
    let image = null;
    try {
      let modele;
      let hauteur = 1.5;
      let distance = 1.7;
      if (id === 'odile') modele = creerOdile();
      else if (id === 'chat') { modele = creerChat(); modele.userData.repos = 10; animerChat(modele, 0, 1, 0, true); hauteur = 0.32; distance = 1.5; }
      else if (id === 'oiseau') { modele = creerOiseau(); hauteur = 0.03; distance = 0.55; }
      else modele = creerPersonnage(TENUES_PNJ[id]);
      modele.rotation.y = 0.35;
      image = photographier(modele, hauteur, distance);
    } catch {
      image = null;
    }
    portraits.set(id, image);
    return image;
  }

  function apercuFerrus(tenue) {
    try {
      if (!mannequin) mannequin = creerFerrus();
      habillerFerrus(mannequin, tenue);
      mannequin.rotation.y = 0.35;
      return photographier(mannequin, 1.05, 2.75, 0.25);
    } catch {
      return null;
    }
  }

  return { portrait, apercuFerrus };
}
