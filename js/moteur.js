// =============================================================================
// moteur.js — le moteur 3D du jeu : l'image, le soleil, la caméra
// (sorti de main.js en version 1.7.1)
// -----------------------------------------------------------------------------
// Tout ce qui sert à DESSINER, quel que soit le lieu :
//   - le « renderer » de Three.js, qui dessine l'image dans la page ;
//   - la caméra ;
//   - le soleil (un seul pour tout le jeu : il suit Ferrus de lieu en lieu) ;
//   - le dôme du ciel ;
//   - la qualité de l'image (Économie, Normale, Élevée) ;
//   - la lumière du moment (le jour, la nuit, les lanternes sous terre).
//
// Ce fichier ne connaît ni les quêtes ni les lieux : on lui dit quelle scène
// dessiner, et sous quelle lumière.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { directionSoleil } from './logique-temps.js';
import { parametresQualite } from './logique-reglages.js';
import { reglerMoteur, creerReflets, definirReflets, eclairerMetaux, creerCiel, FORCES } from './rendu.js';
import { creerEffets } from './effets.js';
import { eclairerNuit } from './vie.js';
import { eclairerEau } from './eau.js';
import { eclairerFetes } from './fetes.js';

// « reglages » : les options du joueur ; « tactile » : vrai sur un téléphone.
export function creerMoteur({ reglages, tactile }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // Le « pixel ratio » : sur les écrans très fins, on ne dessine pas plus de 1,5
  // pixel par point (1 seul en mode « Économie »). L'image reste nette et le
  // téléphone ne chauffe pas. Voir appliquerQualite() plus bas.
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Version 1.7 : une image plus riche (correction tonale), et les reflets du
  // ciel sur le cuivre et le laiton (voir rendu.js).
  reglerMoteur(renderer);
  definirReflets(creerReflets(renderer));
  document.getElementById('scene').appendChild(renderer.domElement);

  // Si le téléphone « perd » la 3D (manque de mémoire…), on prévient clairement.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    window.afficherErreur("La 3D s'est arrêtée (l'appareil manquait peut-être de mémoire).", 'Rechargez la page pour reprendre (la partie est sauvegardée).');
  });

  // La caméra : vue de dessus, inclinée (voir camera.js pour ses mouvements).
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 120);

  // Le « soleil » qui fait les ombres. Version 1.7 : il n'y en a plus qu'UN,
  // qui suit Ferrus d'un lieu à l'autre (voir voyages.js). Avant, chaque
  // lieu avait le sien, et chacun gardait en mémoire sa grande image d'ombres.
  const soleil = new THREE.DirectionalLight('#ffe0b8', 1.5);
  soleil.position.set(-10, 22, 12);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(tactile ? 1024 : 2048, tactile ? 1024 : 2048);
  Object.assign(soleil.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 1, far: 60 });
  soleil.shadow.bias = -0.0005;
  soleil.shadow.normalBias = 0.03;
  soleil.shadow.radius = 2.6; // des ombres aux bords doux
  // Sous terre et dans l'atelier, la lumière vient toujours du même côté.
  const SOLEIL_FIXE = { x: -10 / 27, y: 22 / 27, z: 12 / 27 };
  // Le dôme du ciel (version 1.7) suit aussi Ferrus de lieu en lieu.
  const ciel = creerCiel();
  const directionAstre = new THREE.Vector3();

  // Le jour et la nuit (version 1.2) : on change doucement les couleurs du ciel,
  // de la brume et des lumières. Les fenêtres et les lanternes s'allument avec
  // la nuit.
  //   l        : la lumière du moment (lumiereDuMoment), ou celle d'un lieu
  //              abrité (la galerie, l'atelier), qui ne change jamais ;
  //   moment   : le moment de la journée, de 0 à 1 (pour placer le soleil) ;
  //   sousToit : vrai sous terre et dans l'atelier.
  function appliquerLumiere(scene, l, moment, sousToit = false) {
    const lumieres = scene.userData.lumieres;
    scene.background.setRGB(...l.ciel, THREE.SRGBColorSpace);
    scene.fog.color.setRGB(...l.ciel, THREE.SRGBColorSpace);
    lumieres.ciel.color.setRGB(...l.hautCiel, THREE.SRGBColorSpace);
    lumieres.ciel.groundColor.setRGB(...l.basSol, THREE.SRGBColorSpace);
    lumieres.ciel.intensity = l.forceCiel * FORCES.ciel;
    soleil.color.setRGB(...l.soleil, THREE.SRGBColorSpace);
    soleil.intensity = l.forceSoleil * FORCES.soleil;
    // Version 1.7 : le soleil se déplace au fil de la journée (dehors seulement).
    const d = sousToit ? SOLEIL_FIXE : directionSoleil(moment);
    soleil.position.set(d.x * 27, d.y * 27, d.z * 27);
    eclairerMetaux(sousToit ? 0.4 : l.nuit);
    eclairerNuit(l.nuit);
    eclairerEau(sousToit ? 0 : l.nuit); // les étoiles se reflètent dans l'eau (pas sous terre !)
    eclairerFetes(l.nuit); // les lanternes des fêtes s'allument le soir (version 1.5)
  }

  // La qualité de l'image (option « Économie », « Normale » ou « Élevée »).
  let imagesParSeconde = 60;
  let effets = null;            // les effets de la qualité « Élevée » (version 1.7)
  let effetsVoulus = false;
  let effetsEnPreparation = false;
  function appliquerQualite() {
    const q = parametresQualite(reglages.qualite, window.devicePixelRatio || 1);
    renderer.setPixelRatio(q.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    soleil.castShadow = q.ombres;
    imagesParSeconde = q.imagesParSeconde;
    // Version 1.7, qualité « Élevée » : une image d'ombres deux fois plus
    // précise, et le halo des lumières (chargé seulement à ce moment-là).
    const cote = (tactile ? 1024 : 2048) * (q.ombresFines ? 2 : 1);
    if (soleil.shadow.mapSize.x !== cote) {
      soleil.shadow.mapSize.set(cote, cote);
      if (soleil.shadow.map) soleil.shadow.map.dispose();
      soleil.shadow.map = null;
    }
    effetsVoulus = Boolean(q.effets);
    if (effetsVoulus && !effets && !effetsEnPreparation) {
      effetsEnPreparation = true;
      creerEffets(renderer)
        .then((e) => { effets = e; })
        .catch(() => { effetsVoulus = false; }) // tant pis : l'image reste celle de la qualité « Normale »
        .finally(() => { effetsEnPreparation = false; });
    }
    if (effets) effets.redimensionner();
  }
  appliquerQualite();

  // La fenêtre change de taille (ou le téléphone tourne).
  function redimensionner() {
    camera.aspect = window.innerWidth / window.innerHeight;
    // Écran en hauteur : champ de vision un peu plus large pour voir le lieu.
    camera.fov = camera.aspect < 1 ? 50 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (effets) effets.redimensionner();
  }
  redimensionner();
  window.addEventListener('resize', redimensionner);

  // Dessine une scène.
  //   abrite : vrai sous terre et dans l'atelier (il n'y a pas de ciel) ;
  //   nuit   : de 0 (plein jour) à 1 (pleine nuit) ;
  //   temps  : le temps du jeu, pour faire dériver les nuages ;
  //   pluie  : de 0 à 1 (le ciel se couvre).
  function dessiner(scene, { abrite, nuit, temps, pluie }) {
    // Le ciel entoure la caméra.
    ciel.visible = !abrite;
    if (!abrite) {
      ciel.position.copy(camera.position);
      ciel.userData.regler({ horizon: scene.fog.color, nuit, soleil: directionAstre.copy(soleil.position).normalize(), temps, pluie });
    }
    if (effets && effetsVoulus) {
      // « nuit » pour le halo : la vraie nuit dehors, et les lieux sombres (galerie, atelier).
      effets.dessiner(scene, camera, abrite ? 0.85 : nuit);
    } else {
      renderer.render(scene, camera);
    }
  }

  return {
    renderer,
    camera,
    soleil,
    ciel,
    appliquerLumiere,
    appliquerQualite,
    dessiner,
    imagesParSeconde: () => imagesParSeconde,
    ombres: () => soleil.castShadow,
  };
}
