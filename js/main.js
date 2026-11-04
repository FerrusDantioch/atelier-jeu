// =============================================================================
// main.js — le point de départ du jeu : il assemble tout et fait tourner le jeu
// -----------------------------------------------------------------------------
// 1. Vérifie que la 3D est disponible (sinon, message d'erreur clair).
// 2. Prépare la scène 3D : lumière, caméra, décor, personnages.
// 3. Branche les commandes (clavier, tactile) et l'interface (textes).
// 4. Lance la « boucle de jeu » : environ 60 fois par seconde, on déplace
//    Ferrus, on vérifie ce qu'il touche, on bouge la caméra et on redessine.
//
// Les RÈGLES (quête, argent, collisions) sont dans logique.js : ce fichier-ci
// ne fait que les appliquer et les montrer.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import {
  MONDE,
  ETAPES,
  obstaclesDuMonde,
  calculerPas,
  deplacerJoueur,
  creerEtatJeu,
  engrenagesVisibles,
  objectifActuel,
  marqueursActifs,
  ramasserEngrenagesProches,
  cibleProche,
  libelleInteraction,
  dialogueOdile,
  appliquerAction,
  utiliserEtabli,
} from './logique.js';
import { construireDecor, creerEngrenageQuete, creerMarqueur, allumerLampe } from './decor.js';
import { creerFerrus, animerFerrus, creerOdile, animerOdile } from './personnages.js';
import { creerCommandes } from './commandes.js';
import { creerInterface } from './interface.js';

// -----------------------------------------------------------------------------
// 1. La 3D est-elle disponible ?
// -----------------------------------------------------------------------------
// Three.js a besoin de « WebGL 2 », la technologie 3D des navigateurs.
function webgl2Disponible() {
  try {
    const essai = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && essai.getContext('webgl2'));
  } catch {
    return false;
  }
}

const MESSAGE_3D = "Votre navigateur ne peut pas afficher la 3D (WebGL 2 n'est pas disponible).";
const CONSEIL_3D = "Essayez avec Chrome ou Firefox à jour. Sur ordinateur, vérifiez que « l'accélération matérielle » est activée dans les réglages du navigateur.";

if (!webgl2Disponible()) {
  window.afficherErreur(MESSAGE_3D, CONSEIL_3D);
} else {
  try {
    demarrer();
  } catch (erreur) {
    console.error(erreur);
    window.afficherErreur("La 3D n'a pas pu démarrer sur cet appareil.", `${CONSEIL_3D} (Détail : ${erreur.message})`);
  }
}

function demarrer() {
  // Économie d'énergie pour les téléphones.
  const tactile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  // Si le système demande moins d'animations, les objets ne flottent plus.
  const moinsDeMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // 2. La scène 3D
  // ---------------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // Le « pixel ratio » : sur les écrans très fins, on ne dessine pas plus de 1,5
  // pixel par point. L'image reste nette et le téléphone ne chauffe pas.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.getElementById('scene').appendChild(renderer.domElement);

  // Si le téléphone « perd » la 3D (manque de mémoire…), on prévient clairement.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    window.afficherErreur("La 3D s'est arrêtée (l'appareil manquait peut-être de mémoire).", 'Rechargez la page pour reprendre.');
  });

  const scene = new THREE.Scene();
  // Un ciel couleur sable doux et une brume légère qui cache l'horizon.
  const couleurCiel = new THREE.Color('#e9dcc3');
  scene.background = couleurCiel;
  scene.fog = new THREE.Fog(couleurCiel, 34, 70);

  // La lumière : douce et chaude, sans contraste violent.
  // - une lumière « ciel / sol » qui éclaire tout doucement ;
  scene.add(new THREE.HemisphereLight('#fff1d8', '#8a7558', 1.75));
  // - un « soleil » de fin d'après-midi qui fait les ombres. Il reste fixe et
  //   couvre toute la place : les ombres ne bougent pas et ne scintillent pas.
  const soleil = new THREE.DirectionalLight('#ffe0b8', 1.5);
  soleil.position.set(-10, 22, 12);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(tactile ? 1024 : 2048, tactile ? 1024 : 2048);
  Object.assign(soleil.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 1, far: 60 });
  soleil.shadow.bias = -0.0005;
  soleil.shadow.normalBias = 0.03;
  scene.add(soleil, soleil.target);

  // La caméra : vue de dessus, inclinée.
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 120);

  // Le décor (place, bâtiments, arbres, haies…).
  const decor = construireDecor(scene, MONDE);

  // Les personnages.
  const ferrus = creerFerrus();
  ferrus.position.set(MONDE.joueur.x, 0, MONDE.joueur.z);
  scene.add(ferrus);

  const odile = creerOdile();
  odile.position.set(MONDE.odile.x, 0, MONDE.odile.z);
  scene.add(odile);

  // Les engrenages de la quête (cachés au départ).
  const engrenages = new Map();
  for (const e of MONDE.engrenages) {
    const objet3d = creerEngrenageQuete();
    objet3d.position.set(e.x, 0, e.z);
    objet3d.visible = false;
    objet3d.userData.decalage = engrenages.size * 2.1; // pour qu'ils ne tournent pas tous pareil
    scene.add(objet3d);
    engrenages.set(e.id, objet3d);
  }

  // Les marqueurs flottants au-dessus d'Odile et de l'établi.
  const marqueurOdile = creerMarqueur();
  marqueurOdile.position.set(MONDE.odile.x, 2.35, MONDE.odile.z);
  const marqueurEtabli = creerMarqueur();
  marqueurEtabli.position.set(MONDE.etabli.x + 0.6, 2.05, MONDE.etabli.z);
  scene.add(marqueurOdile, marqueurEtabli);

  // ---------------------------------------------------------------------------
  // 3. L'état du jeu, l'interface et les commandes
  // ---------------------------------------------------------------------------
  const etat = creerEtatJeu();
  const obstacles = obstaclesDuMonde(MONDE);
  let position = { x: MONDE.joueur.x, z: MONDE.joueur.z };
  let jeuActif = false;      // devient vrai après « Commencer »
  let orientationVoulue = 0; // la direction vers laquelle Ferrus doit se tourner

  const ui = creerInterface();
  const commandes = creerCommandes({
    estActif: () => jeuActif,
    surInteraction: interagir,
    surNavigation: (sens) => {
      if (ui.dialogueOuvert()) ui.changerChoix(sens);
    },
  });

  // Met à jour tout ce qui dépend de l'avancée de la quête.
  function majEtat() {
    ui.majArgent(etat.argent);
    ui.majObjectif(objectifActuel(etat));
    const visibles = new Set(engrenagesVisibles(etat).map((e) => e.id));
    for (const [id, objet3d] of engrenages) objet3d.visible = visibles.has(id);
    const marqueurs = marqueursActifs(etat);
    marqueurOdile.visible = marqueurs.odile;
    marqueurEtabli.visible = marqueurs.etabli;
    // La lampe : éteinte sur l'établi, allumée une fois réparée, puis chez Odile.
    const etape = etat.quete.etape;
    allumerLampe(decor.lampeEtabli, etape === ETAPES.LAMPE_REPAREE);
    decor.lampeEtabli.visible = etape !== ETAPES.TERMINEE;
    decor.lanterneOdile.visible = etape === ETAPES.TERMINEE;
  }

  function afficherMessages(messages) {
    for (const texte of messages) ui.afficherMessage(texte);
  }

  // Le joueur a appuyé sur E / Espace / « Interagir ».
  async function interagir() {
    if (!jeuActif) return;
    if (ui.dialogueOuvert()) {
      ui.avancerDialogue();
      return;
    }
    const cible = cibleProche(position.x, position.z);
    if (cible === 'odile') {
      commandes.relacherTout();
      orientationVoulue = Math.atan2(MONDE.odile.x - position.x, MONDE.odile.z - position.z);
      const action = await ui.ouvrirDialogue(dialogueOdile(etat));
      afficherMessages(appliquerAction(etat, action));
      majEtat();
    } else if (cible === 'etabli') {
      orientationVoulue = Math.atan2(MONDE.etabli.x - position.x, MONDE.etabli.z - position.z);
      afficherMessages(utiliserEtabli(etat));
      majEtat();
    }
  }

  // ---------------------------------------------------------------------------
  // La caméra qui suit Ferrus en douceur
  // ---------------------------------------------------------------------------
  // On vise un point un peu au-dessus de Ferrus. La caméra est placée derrière
  // et au-dessus de ce point. Sur un écran en hauteur (téléphone tenu droit),
  // on recule un peu pour voir assez de la place.
  const viseeCamera = new THREE.Vector3();
  const positionCameraVoulue = new THREE.Vector3();
  function calculerCamera(sortie) {
    const enHauteur = camera.aspect < 1;
    const recul = enHauteur ? 1.8 : 1;
    // La visée reste un peu à l'intérieur de la place, pour ne pas montrer le vide.
    const vx = Math.max(-11, Math.min(11, position.x));
    const vz = Math.max(-8, Math.min(8, position.z));
    viseeCamera.set(vx, 0.8, vz - 0.5);
    sortie.set(vx, 0.8 + 15 * recul, vz - 0.5 + 12.5 * recul);
  }
  redimensionner();
  calculerCamera(camera.position);
  camera.lookAt(viseeCamera);
  const viseeLissee = viseeCamera.clone();

  function redimensionner() {
    camera.aspect = window.innerWidth / window.innerHeight;
    // Écran en hauteur : champ de vision un peu plus large pour voir la place.
    camera.fov = camera.aspect < 1 ? 50 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', redimensionner);

  // ---------------------------------------------------------------------------
  // 4. La boucle de jeu
  // ---------------------------------------------------------------------------
  let tempsPrecedent = performance.now();
  let tempsTotal = 0;

  function boucle(maintenant) {
    // dt = le temps écoulé depuis l'image précédente (limité, pour éviter les
    // grands sauts quand on revient sur l'onglet après une pause).
    const dt = Math.min(0.05, Math.max(0, (maintenant - tempsPrecedent) / 1000));
    tempsPrecedent = maintenant;
    tempsTotal += dt;

    // --- Déplacement de Ferrus ---
    let vitesse = 0;
    if (jeuActif && !ui.dialogueOuvert()) {
      const direction = commandes.direction();
      const { dx, dz } = calculerPas(direction.x, direction.z, MONDE.joueur.vitesse, dt);
      const avant = position;
      position = deplacerJoueur(position, dx, dz, obstacles);
      const parcouruX = position.x - avant.x;
      const parcouruZ = position.z - avant.z;
      vitesse = dt > 0 ? Math.hypot(parcouruX, parcouruZ) / dt : 0;
      if (Math.hypot(dx, dz) > 0.0001) orientationVoulue = Math.atan2(dx, dz);

      // Ramasser les engrenages en passant dessus.
      const messages = ramasserEngrenagesProches(etat, position.x, position.z);
      if (messages.length > 0) {
        afficherMessages(messages);
        majEtat();
      }

      // Afficher l'aide si on est près d'Odile ou de l'établi.
      const cible = cibleProche(position.x, position.z);
      ui.majIndice(cible ? libelleInteraction(etat, cible) : null);
    } else if (!jeuActif) {
      ui.majIndice(null);
    }

    ferrus.position.set(position.x, 0, position.z);
    // Ferrus se tourne en douceur (on prend le chemin le plus court pour tourner).
    let ecart = orientationVoulue - ferrus.rotation.y;
    ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
    ferrus.rotation.y += ecart * Math.min(1, dt * 12);
    animerFerrus(ferrus, vitesse, dt);

    // Odile se tourne doucement vers Ferrus quand il est proche.
    animerOdile(odile, dt);
    const distanceOdile = Math.hypot(position.x - MONDE.odile.x, position.z - MONDE.odile.z);
    const regardOdile = distanceOdile < 5 ? Math.atan2(position.x - MONDE.odile.x, position.z - MONDE.odile.z) : 0;
    let ecartOdile = regardOdile - odile.rotation.y;
    ecartOdile = Math.atan2(Math.sin(ecartOdile), Math.cos(ecartOdile));
    odile.rotation.y += ecartOdile * Math.min(1, dt * 3);

    // Les engrenages tournent lentement et flottent à peine ; les marqueurs aussi.
    if (!moinsDeMouvement) {
      for (const objet3d of engrenages.values()) {
        if (!objet3d.visible) continue;
        const { roue, support, decalage } = objet3d.userData;
        roue.rotation.z = tempsTotal * 0.9 + decalage;
        support.position.y = 0.65 + Math.sin(tempsTotal * 1.4 + decalage) * 0.06;
      }
      for (const [marqueur, hauteur] of [[marqueurOdile, 2.35], [marqueurEtabli, 2.05]]) {
        marqueur.rotation.y = tempsTotal * 0.8;
        marqueur.position.y = hauteur + Math.sin(tempsTotal * 1.6) * 0.06;
      }
    }

    // --- La caméra suit Ferrus en douceur (sans secousse) ---
    // À chaque image, elle parcourt une petite partie du chemin qui la sépare
    // de sa place idéale : elle « glisse » vers Ferrus.
    calculerCamera(positionCameraVoulue);
    const douceur = 1 - Math.exp(-dt * 3.5);
    camera.position.lerp(positionCameraVoulue, douceur);
    viseeLissee.lerp(viseeCamera, douceur);
    camera.lookAt(viseeLissee);

    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  }

  // ---------------------------------------------------------------------------
  // Écran d'accueil : le jeu est prêt, on active le bouton « Commencer ».
  // ---------------------------------------------------------------------------
  majEtat();
  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
  window.jeuDemarre = true;

  const boutonCommencer = document.getElementById('bouton-commencer');
  boutonCommencer.disabled = false;
  boutonCommencer.textContent = 'Commencer';
  boutonCommencer.focus();
  boutonCommencer.addEventListener('click', () => {
    document.getElementById('accueil').hidden = true;
    document.getElementById('interface').hidden = false;
    boutonCommencer.blur();
    jeuActif = true;
  });

  // Pour les vérifications automatiques (et la curiosité) : on peut consulter
  // l'état du jeu dans la console du navigateur en tapant « atelier.etat ».
  window.atelier = { etat, position: () => ({ ...position }), dessin: () => ({ ...renderer.info.render }) };
}
