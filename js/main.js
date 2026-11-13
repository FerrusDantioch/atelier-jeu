// =============================================================================
// main.js — le point de départ du jeu : il assemble tout et fait tourner le jeu
// -----------------------------------------------------------------------------
// 1. Vérifie que la 3D est disponible (sinon, message d'erreur clair).
// 2. Prépare les neuf lieux en 3D (la place, le marché, le moulin, la gare, la
//    mine où l'on va en train, sa galerie souterraine, l'intérieur de
//    l'atelier, le lac et la forêt de l'inventeur), chacun dans sa propre
//    « scène » avec sa lumière, son décor et ses personnages. La lumière suit
//    le jour et la nuit ; les couleurs suivent les saisons (version 1.4) ; la
//    météo (version 1.5). Version 1.6 : aussi la petite carte du village vue
//    du ciel, pour les voyages en dirigeable.
// 3. Branche les commandes (clavier, tactile), l'interface (textes) et la
//    sauvegarde automatique.
//    Étape 4 : les options (musique douce, petits sons, qualité de l'image),
//    et l'installation du jeu comme une application (service worker).
// 4. Lance la « boucle de jeu » : environ 60 fois par seconde, on déplace
//    Ferrus, on vérifie ce qu'il touche, on bouge la caméra et on redessine
//    le lieu où il se trouve.
//
// Les RÈGLES (quêtes, argent, collisions, lieux, sauvegarde) sont dans les
// fichiers logique*.js : ce fichier-ci ne fait que les appliquer et les montrer.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import {
  MONDE,
  ETAPES,
  etapeLampe,
  calculerPas,
  deplacerJoueur,
  obstaclesClients,
  clientPeutAvancer,
  creerEtatJeu,
  objectifActuel,
  objectifSecondaire,
  marqueursActifs,
  dialogueOdile,
  appliquerAction,
  utiliserEtabli,
} from './logique.js';
import {
  DIALOGUE_OUVERTURE,
  avancerTemps,
  lancerFabrication,
  acheterMateriau,
  acheterAmelioration,
  dialogueClient,
  messageComptoirVide,
  clientAuComptoir,
  materiauxManquants,
  progressionFabrication,
  acheterDecoration,
  possedeDecoration,
  possedeAmelioration,
  dialogueApprentie,
  peutFabriquer,
} from './logique-atelier.js';
import { majFetes, feteDuJour } from './logique-fetes.js';
import { meteoDuMoment, messageMeteo } from './logique-meteo.js';
import { creerTrace, suivreTrace, dialogueChat, chatAAdopter, CHAT_ERRANT } from './logique-compagnons.js';
import { avancerPotager, utiliserPotager } from './logique-potager.js';
import { dialogueGaston, pecher, attenteTouche } from './logique-peche.js';
import { noterRencontre, HABITANTS_ALBUM } from './logique-album.js';
import { majCarnet, livrerCommande, commandePrete } from './logique-commandes.js';
import { LUMIERE_GALERIE, galerieOuverte, estFilon, recolterFilon, avancerGalerie, progressionFilon } from './logique-galerie.js';
import { ambianceSaison, saisonDuMoment, texteCalendrier, messageSaison } from './logique-saisons.js';
import {
  QUETES,
  queteEnCours,
  queteTerminee,
  verifierQuetes,
  dialoguePnjQuete,
  appliquerActionQuete,
  dialogueEtapeQuete,
  ramasserObjetsQuete,
  utiliserObjetQuete,
  marqueursQuetes,
} from './logique-quetes.js';
import {
  ZONES,
  conditionRemplie,
  obstaclesZone,
  sortieAtteinte,
  cibleProcheZone,
  libelleZone,
  nomPnj,
  objetsQueteZone,
  dialogueLeon,
  dialogueParDefaut,
  messageObjet,
  horlogeReparee,
  locomotiveEnMarche,
  voyageTrain,
  wagonnetRepare,
  LUMIERE_INTERIEUR,
} from './logique-zones.js';
import { MOMENT_JOUR_FIXE, directionSoleil, lumiereDuMoment, avancerJournee, anglesAiguilles, etatTrain } from './logique-temps.js';
import { CLE_SAUVEGARDE, serialiserPartie, chargerPartie, nomFichierSauvegarde, resumePartie, TAILLE_MAX_FICHIER } from './logique-sauvegarde.js';
import { construireDecor, creerEngrenageQuete, creerMarqueur, allumerLampe } from './decor.js';
import { construireMarche, construireMoulin, creerPaleQuete } from './decor-zones.js';
import { construireGare } from './decor-gare.js';
import { construireMine, creerPepiteQuete } from './decor-mine.js';
import { construireGalerie } from './decor-galerie.js';
import { appliquerSaison, creerFleurs, creerChutes } from './saisons.js';
import { construireInterieur } from './decor-interieur.js';
import { construireLac } from './decor-lac.js';
import { construirePotager } from './decor-potager.js';
import { construireFetes, eclairerFetes } from './fetes.js';
import { creerPluie, creerFlaques, mouillerFlaques, appliquerMeteo, FLAQUES } from './meteo.js';
import { creerCompagnons, placerCompagnons, animerCompagnons, creerChat, creerOiseau, animerChat } from './compagnons.js';
import { creerPanneauAlbum } from './interface-album.js';
// Version 1.6.
import { parlerAmi, ajouterChoixAmitie, dialogueCadeau, offrirCadeau, dialogueRecompense, ami, anniversairesDuJour } from './logique-amitie.js';
import { tenuePortee, porterTenue, acheterTenue } from './logique-garderobe.js';
import { exposer, retirer, avancerVitrine } from './logique-vitrine.js';
import { avancerForet, cueillir, estCueillette, observerCiel, dialogueAnatole, progressionCueillette, CUEILLETTES, telescopeRepare } from './logique-foret.js';
import { majJournal, journalNonLu, lireJournal, editionDuJour } from './logique-journal.js';
import { OBJETS_ASSEMBLAGE } from './logique-assemblage.js';
import { dirigeablePret, etapesDirigeable, dialogueVoyage, destinationDuChoix, dureeVol } from './logique-dirigeable.js';
import { creerCameraPhoto, bougerCameraPhoto, positionCameraPhoto, CLE_PHOTOS, lirePhotos, ajouterPhoto, nomFichierPhoto } from './logique-photo.js';
import { construireForet, construireCheminForet } from './decor-foret.js';
import { construireVitrine, creerVisiteurs } from './vitrine.js';
import { construireVol } from './vol.js';
import { creerJournal, creerGarderobe, creerPanneauVitrine, creerPanneauAssemblage, creerPanneauCiel } from './interface-v16.js';
import { creerModePhoto } from './interface-photo.js';
import { animerEau, eclairerEau } from './eau.js';
import { fusionnerDecor } from './fusion.js';
import { creerEffets } from './effets.js';
import { reglerMoteur, creerReflets, definirReflets, eclairerMetaux, creerCiel, FORCES } from './rendu.js';
import { animerVent, eclairerNuit } from './vie.js';
import {
  creerFerrus,
  animerFerrus,
  creerOdile,
  animerOdile,
  creerHabitant,
  creerPersonnage,
  habillerFerrus,
  TENUES_PNJ,
  animerMarche,
  supprimerPersonnage,
} from './personnages.js';
import { creerCommandes } from './commandes.js';
import { creerInterface } from './interface.js';
import { creerPanneauAtelier } from './interface-atelier.js';
import { creerPanneauOptions } from './interface-options.js';
import { CLE_REGLAGES, VERSION_JEU, lireReglages, ecrireReglages, parametresQualite } from './logique-reglages.js';
import { creerAudio } from './musique.js';

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

// -----------------------------------------------------------------------------
// La sauvegarde dans le navigateur (le « localStorage »).
// Tout est protégé par try/catch : en navigation privée, par exemple, le
// navigateur peut refuser. Le jeu marche alors quand même, sans sauvegarde.
// -----------------------------------------------------------------------------
function lireSauvegarde() {
  try {
    const texte = window.localStorage.getItem(CLE_SAUVEGARDE);
    return texte ? chargerPartie(texte) : null;
  } catch {
    return null;
  }
}
function ecrireSauvegarde(texte) {
  try {
    window.localStorage.setItem(CLE_SAUVEGARDE, texte);
  } catch {
    // Pas de place ou stockage interdit : tant pis, on continue sans sauvegarder.
  }
}
function effacerSauvegarde() {
  try {
    window.localStorage.removeItem(CLE_SAUVEGARDE);
  } catch {
    // Rien à faire.
  }
}

// Les réglages (musique, sons, qualité) sont rangés à part de la partie.
function lireReglagesNavigateur() {
  try {
    return lireReglages(window.localStorage.getItem(CLE_REGLAGES));
  } catch {
    return lireReglages(null);
  }
}
function ecrireReglagesNavigateur(reglages) {
  try {
    window.localStorage.setItem(CLE_REGLAGES, ecrireReglages(reglages));
  } catch {
    // Tant pis : les réglages resteront valables jusqu'à la fermeture de la page.
  }
}

// Le « service worker » (sw.js) permet de jouer sans connexion et d'installer
// le jeu. Il ne marche que sur un site sécurisé (https) ou sur son ordinateur.
function enregistrerServiceWorker() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!('serviceWorker' in navigator) || (location.protocol !== 'https:' && !local)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Sans service worker, le jeu marche quand même (mais pas hors ligne).
    });
  });
}
enregistrerServiceWorker();

function demarrer() {
  // Économie d'énergie pour les téléphones.
  const tactile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  // Si le système demande moins d'animations, les objets ne flottent plus.
  const moinsDeMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Les options du joueur (étape 4) et le synthétiseur de musique.
  const reglages = lireReglagesNavigateur();
  const audio = creerAudio();
  audio.regler(reglages);

  // ---------------------------------------------------------------------------
  // 2. Le moteur 3D et les lieux
  // ---------------------------------------------------------------------------
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

  // La caméra : vue de dessus, inclinée.
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 120);

  // Une scène vide avec le ciel, la brume et la lumière (la même pour chaque lieu).
  // Le « soleil » qui fait les ombres. Version 1.7 : il n'y en a plus qu'UN,
  // qui suit Ferrus d'un lieu à l'autre (voir placerDansLieu). Avant, chaque
  // lieu avait le sien, et chacun gardait en mémoire sa grande image d'ombres.
  const soleil = new THREE.DirectionalLight('#ffe0b8', 1.5);
  soleil.position.set(-10, 22, 12);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(tactile ? 1024 : 2048, tactile ? 1024 : 2048);
  Object.assign(soleil.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 1, far: 60 });
  soleil.shadow.bias = -0.0005;
  soleil.shadow.normalBias = 0.03;
  soleil.shadow.radius = 2.6; // des ombres aux bords doux
  const soleils = [soleil]; // (pour couper les ombres en mode Économie)
  // Sous terre et dans l'atelier, la lumière vient toujours du même côté.
  const SOLEIL_FIXE = { x: -10 / 27, y: 22 / 27, z: 12 / 27 };
  // Le dôme du ciel (version 1.7) suit aussi Ferrus de lieu en lieu.
  const domeCiel = creerCiel();
  const directionAstre = new THREE.Vector3();
  function creerSceneDeBase() {
    const scene = new THREE.Scene();
    // Un ciel couleur sable doux et une brume légère qui cache l'horizon.
    const couleurCiel = new THREE.Color('#e9dcc3');
    scene.background = couleurCiel;
    scene.fog = new THREE.Fog(couleurCiel, 34, 70);
    // La lumière : douce et chaude, sans contraste violent.
    // - une lumière « ciel / sol » qui éclaire tout doucement ;
    const ciel = new THREE.HemisphereLight('#fff1d8', '#8a7558', 1.75);
    scene.add(ciel);
    // - le « soleil » de fin d'après-midi, qui fait les ombres, est partagé
    //   par tous les lieux : il est ajouté à la scène quand Ferrus y entre.
    // Les lumières que le jour et la nuit font changer (voir appliquerLumiere).
    scene.userData.lumieres = { ciel, soleil };
    return scene;
  }

  // Le jour et la nuit (version 1.2) : on change doucement les couleurs du ciel,
  // de la brume et des lumières. Le soleil ne bouge pas : les ombres restent
  // immobiles. Les fenêtres et les lanternes s'allument avec la nuit.
  // « l » : la lumière du moment (lumiereDuMoment), ou celle de la galerie
  // souterraine, qui ne change jamais (version 1.4).
  function appliquerLumiere(scene, l, sousTerre = false) {
    const { ciel, soleil } = scene.userData.lumieres;
    scene.background.setRGB(...l.ciel, THREE.SRGBColorSpace);
    scene.fog.color.setRGB(...l.ciel, THREE.SRGBColorSpace);
    ciel.color.setRGB(...l.hautCiel, THREE.SRGBColorSpace);
    ciel.groundColor.setRGB(...l.basSol, THREE.SRGBColorSpace);
    ciel.intensity = l.forceCiel * FORCES.ciel;
    soleil.color.setRGB(...l.soleil, THREE.SRGBColorSpace);
    soleil.intensity = l.forceSoleil * FORCES.soleil;
    // Version 1.7 : le soleil se déplace au fil de la journée (dehors seulement).
    const d = sousTerre ? SOLEIL_FIXE : directionSoleil(reglages.jourNuit ? etat.journee : MOMENT_JOUR_FIXE);
    soleil.position.set(d.x * 27, d.y * 27, d.z * 27);
    eclairerMetaux(sousTerre ? 0.4 : l.nuit);
    eclairerNuit(l.nuit);
    eclairerEau(sousTerre ? 0 : l.nuit); // les étoiles se reflètent dans l'eau (pas sous terre !)
    eclairerFetes(l.nuit); // les lanternes des fêtes s'allument le soir (version 1.5)
  }

  // Ajoute un marqueur flottant (losange ambre) au-dessus d'un point d'un lieu.
  function ajouterMarqueur(lieu, id, x, z, hauteur) {
    const marqueur = creerMarqueur();
    marqueur.position.set(x, hauteur, z);
    lieu.scene.add(marqueur);
    lieu.marqueurs.set(id, { objet: marqueur, hauteur });
  }

  // Ajoute un personnage avec un nom (Capucine, Léon, Barnabé, Augustin) dans un lieu.
  function ajouterPnj(lieu, p) {
    const objet = creerPersonnage(TENUES_PNJ[p.id], p.x * 3);
    objet.position.set(p.x, 0, p.z);
    lieu.scene.add(objet);
    lieu.pnj.push({ id: p.id, objet, x: p.x, z: p.z, animer: (dt) => animerMarche(objet, 0, dt) });
    ajouterMarqueur(lieu, p.id, p.x, p.z, 2.45);
  }

  // Les six lieux. Chacun : { scene, marqueurs, pnj, objetsQuete, … }
  const lieux = {};
  // Version 1.7 : une fois un lieu construit, on soude son décor fixe pour le
  // dessiner en beaucoup moins de fois (voir fusion.js). Les « sondes » font
  // vivre le lieu un instant, pour repérer ce qui bouge et ne pas le souder.
  function souderDecor(lieu, sondes = []) {
    const animes = [...(lieu.decor.vie || []), ...(lieu.decor.eau || [])];
    const animer = (t) => () => { for (const a of animes) a.userData.animer(t); };
    lieu.soudure = fusionnerDecor(lieu.scene, lieu.decor, [animer(1.3), animer(7.7), ...sondes, animer(0)]);
  }

  // --- La place (étapes 1 et 2) ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireDecor(scene, MONDE);
    souderDecor(lieu);
    // Odile, et ses engrenages perdus (cachés au départ).
    const odile = creerOdile();
    odile.position.set(MONDE.odile.x, 0, MONDE.odile.z);
    scene.add(odile);
    lieu.pnj.push({ id: 'odile', objet: odile, x: MONDE.odile.x, z: MONDE.odile.z, animer: (dt) => animerOdile(odile, dt) });
    for (const e of MONDE.engrenages) {
      const objet3d = creerEngrenageQuete();
      objet3d.position.set(e.x, 0, e.z);
      objet3d.visible = false;
      objet3d.userData.decalage = lieu.objetsQuete.size * 2.1; // pour qu'ils ne tournent pas tous pareil
      scene.add(objet3d);
      lieu.objetsQuete.set(e.id, objet3d);
    }
    ajouterMarqueur(lieu, 'odile', MONDE.odile.x, MONDE.odile.z, 2.35);
    ajouterMarqueur(lieu, 'etabli', MONDE.etabli.x + 0.6, MONDE.etabli.z, 2.05);
    ajouterMarqueur(lieu, 'comptoir', MONDE.comptoir.x, MONDE.comptoir.z, 1.95);
    lieux.place = lieu;
  }

  // --- Le marché ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireMarche(scene, ZONES.marche);
    souderDecor(lieu);
    for (const p of ZONES.marche.pnj) ajouterPnj(lieu, p);
    lieux.marche = lieu;
  }

  // --- Le moulin ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireMoulin(scene, ZONES.moulin);
    souderDecor(lieu);
    for (const p of ZONES.moulin.pnj) ajouterPnj(lieu, p);
    const m = ZONES.moulin.mecanisme;
    ajouterMarqueur(lieu, 'mecanisme', m.x, m.z, 1.9);
    // Les pales à ramasser (cachées tant que la quête ne les demande pas).
    QUETES['roue-moulin'].etapes[0].objets.forEach((o, i) => {
      const pale = creerPaleQuete();
      pale.position.set(o.x, 0, o.z);
      pale.visible = false;
      pale.userData.decalage = i * 2.1;
      scene.add(pale);
      lieu.objetsQuete.set(o.id, pale);
    });
    lieux.moulin = lieu;
  }

  // --- La gare (version 1.2) ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireGare(scene, ZONES.gare);
    souderDecor(lieu);
    for (const p of ZONES.gare.pnj) ajouterPnj(lieu, p);
    const h = ZONES.gare.horloge;
    ajouterMarqueur(lieu, 'horloge', h.x, h.z, 4.45);
    const loco = ZONES.gare.locomotive;
    ajouterMarqueur(lieu, 'locomotive', loco.x - 1.4, loco.z, 3.25);
    // Les rouages de l'horloge à ramasser (cachés tant que la quête ne les demande pas).
    QUETES['horloge-gare'].etapes[0].objets.forEach((o, i) => {
      const rouage = creerEngrenageQuete();
      rouage.position.set(o.x, 0, o.z);
      rouage.visible = false;
      rouage.userData.decalage = i * 2.1;
      scene.add(rouage);
      lieu.objetsQuete.set(o.id, rouage);
    });
    lieux.gare = lieu;
  }

  // --- La mine de cuivre (version 1.3) : on y va en train ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireMine(scene, ZONES.mine);
    souderDecor(lieu);
    for (const p of ZONES.mine.pnj) ajouterPnj(lieu, p);
    const w = ZONES.mine.wagonnet;
    ajouterMarqueur(lieu, 'wagonnet', w.x, w.z, 1.95);
    // Les pépites de cuivre à ramasser (cachées tant que la quête ne les demande pas).
    QUETES['wagonnet-mine'].etapes[0].objets.forEach((o, i) => {
      const pepite = creerPepiteQuete();
      pepite.position.set(o.x, 0, o.z);
      pepite.visible = false;
      pepite.userData.decalage = i * 2.1;
      scene.add(pepite);
      lieu.objetsQuete.set(o.id, pepite);
    });
    lieux.mine = lieu;
  }

  // --- La galerie souterraine (version 1.4) : sous la mine ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireGalerie(scene, ZONES.galerie);
    souderDecor(lieu);
    lieux.galerie = lieu;
  }

  // --- L'intérieur de l'atelier (version 1.5) : on entre par la porte ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireInterieur(scene, ZONES.interieur);
    souderDecor(lieu, [
      () => { for (let i = 0; i < 80; i++) lieu.decor.regler(1); lieu.decor.vie[0].userData.animer(2.2); },
      () => { for (let i = 0; i < 400; i++) lieu.decor.regler(0); },
    ]);
    for (const p of ZONES.interieur.pnj) ajouterPnj(lieu, p); // Lucie, l'apprentie
    lieux.interieur = lieu;
  }

  // --- Le lac (version 1.5) : à l'ouest du marché ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireLac(scene, ZONES.lac);
    souderDecor(lieu);
    for (const p of ZONES.lac.pnj) ajouterPnj(lieu, p); // Gaston, le pêcheur
    lieux.lac = lieu;
  }

  // --- La forêt de l'inventeur (version 1.6) : à l'est de la place ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireForet(scene, ZONES.foret);
    {
      const { telescope, chantier } = lieu.decor;
      souderDecor(lieu, [
        () => telescope.regler(true),
        () => telescope.regler(false),
        () => chantier.regler(5),
        () => chantier.animer(3.1),
        () => chantier.regler(0),
      ]);
    }
    for (const p of ZONES.foret.pnj) ajouterPnj(lieu, p); // Anatole, l'inventeur
    const t = ZONES.foret.telescope;
    ajouterMarqueur(lieu, 'telescope', t.x, t.z, 3.4);
    // Les vis dorées du télescope (cachées tant que la quête ne les demande pas).
    QUETES['telescope-anatole'].etapes[0].objets.forEach((o, i) => {
      const vis = creerEngrenageQuete();
      vis.position.set(o.x, 0, o.z);
      vis.visible = false;
      vis.userData.decalage = i * 2.1;
      scene.add(vis);
      lieu.objetsQuete.set(o.id, vis);
    });
    lieux.foret = lieu;
  }

  // --- Le ciel (version 1.6) : la carte du village, pour les voyages en dirigeable ---
  const sceneVol = creerSceneDeBase();
  sceneVol.fog.near = 40;
  sceneVol.fog.far = 95;
  const vol = construireVol(sceneVol);

  // --- Sur la place (version 1.6) : la vitrine et ses visiteurs, et le chemin de la forêt ---
  const vitrine3d = construireVitrine(lieux.place.scene, MONDE.vitrine);
  const visiteurs = creerVisiteurs(lieux.place.scene);
  const barriereForet = construireCheminForet(lieux.place.scene, MONDE);

  // --- Sur la place (version 1.5) : le potager, les décors des fêtes, et le
  // petit chat qui attend d'être adopté ---
  const potager3d = construirePotager(lieux.place.scene, MONDE.potager);
  const fetes3d = construireFetes(lieux.place.scene, MONDE);
  const chatErrant = creerChat();
  chatErrant.position.set(CHAT_ERRANT.x, 0, CHAT_ERRANT.z);
  chatErrant.rotation.y = -0.6;
  chatErrant.userData.repos = 10; // il est assis
  lieux.place.scene.add(chatErrant);
  // Version 1.7 : on soude aussi le décor fixe qu'on vient d'ajouter à la place
  // (la vitrine, les barrières du potager…), en laissant libre tout ce qui vit.
  lieux.place.soudure = fusionnerDecor(
    lieux.place.scene,
    { decor: lieux.place.decor, marqueurs: lieux.place.marqueurs, pnj: lieux.place.pnj, objetsQuete: lieux.place.objetsQuete, fetes3d, barriereForet, chatErrant },
    [() => potager3d.userData.regler(1), () => potager3d.userData.regler(-1)],
  );

  // Les flaques des jours de pluie (version 1.5), sur les chemins et les pavés.
  for (const [nom, liste] of Object.entries(FLAQUES)) creerFlaques(lieux[nom].scene, liste);

  // Les fleurs du printemps (version 1.4), dans les lieux où il y a de l'herbe
  // (le marché est pavé, et la galerie est sous terre).
  {
    const partieNeuve = creerEtatJeu();
    creerFleurs(lieux.place.scene, 'place', MONDE, obstaclesZone('place', partieNeuve), 1);
    for (const [nom, graine] of [['moulin', 2], ['gare', 3], ['mine', 4], ['lac', 6], ['foret', 7]]) {
      creerFleurs(lieux[nom].scene, nom, ZONES[nom], obstaclesZone(nom, partieNeuve), graine);
    }
  }
  // Ce qui tombe du ciel (pétales, feuilles, flocons) : il suit Ferrus d'un lieu à l'autre.
  const chutes = creerChutes();
  lieux.place.scene.add(chutes);
  // La pluie (version 1.5) le suit aussi.
  const pluie = creerPluie();
  lieux.place.scene.add(pluie);
  // Les compagnons (version 1.5) : Rouille le chat et Cliquet l'oiseau. Ils
  // marchent dans les pas de Ferrus (sa « trace »).
  const compagnons = creerCompagnons();
  lieux.place.scene.add(compagnons.chat, compagnons.oiseau);
  let trace = creerTrace(MONDE.joueur.x, MONDE.joueur.z, 0);
  placerCompagnons(compagnons, trace, MONDE.joueur);

  // Ferrus, qui passe d'une scène à l'autre selon le lieu.
  const ferrus = creerFerrus();
  ferrus.position.set(MONDE.joueur.x, 0, MONDE.joueur.z);
  lieux.place.scene.add(ferrus);
  lieux.place.scene.add(soleil, soleil.target, domeCiel);

  // La qualité de l'image (option « Normale » ou « Économie »).
  let imagesParSeconde = 60;
  let effets = null;            // les effets de la qualité « Élevée » (version 1.7)
  let effetsVoulus = false;
  let effetsEnPreparation = false;
  function appliquerQualite() {
    const q = parametresQualite(reglages.qualite, window.devicePixelRatio || 1);
    renderer.setPixelRatio(q.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    for (const soleil of soleils) soleil.castShadow = q.ombres;
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

  // ---------------------------------------------------------------------------
  // 3. L'état du jeu, l'interface et les commandes
  // ---------------------------------------------------------------------------
  const etat = creerEtatJeu();
  let zone = 'place';
  let obstacles = obstaclesZone(zone, etat);
  let position = { x: MONDE.joueur.x, z: MONDE.joueur.z };
  let jeuActif = false;      // devient vrai après « Commencer » ou « Continuer »
  let enTransition = false;  // pendant le fondu entre deux lieux
  let orientationVoulue = 0; // la direction vers laquelle Ferrus doit se tourner

  let photo = null;          // le mode photo (version 1.6) : { cam } pendant qu'il est actif
  let voyage = null;         // le voyage en dirigeable en cours (version 1.6)
  let importEnCours = false; // une partie ouverte depuis un fichier va remplacer celle-ci
  let importEnAttente = null;

  const ui = creerInterface();
  // Le panneau de l'établi : quand on appuie sur un de ses boutons, on applique
  // la règle correspondante, puis on met tout à jour.
  const panneau = creerPanneauAtelier({
    etat,
    surAction: (type, id, quantite) => {
      let messages = [];
      // Version 1.6 : pour un objet rare, le petit jeu d'assemblage (s'il est proposé).
      if (type === 'fabriquer' && reglages.assemblage && OBJETS_ASSEMBLAGE.includes(id) && peutFabriquer(etat, id).possible) {
        panneau.fermer();
        assemblage.ouvrirPour(id, etat.atelier.assemblages);
        return;
      }
      if (type === 'fabriquer') messages = lancerFabrication(etat, id);
      else if (type === 'acheter') messages = acheterMateriau(etat, id, quantite);
      else if (type === 'ameliorer') messages = acheterAmelioration(etat, id);
      else if (type === 'decorer') messages = acheterDecoration(etat, id);
      else if (type === 'livrer') messages = livrerCommande(etat, id);
      afficherMessages([...messages, ...verifierQuetes(etat)]);
      majEtat();
    },
    surFermeture: () => commandes.relacherTout(),
  });
  // Le panneau des options (étape 4). À chaque changement : on enregistre les
  // réglages, puis on les applique (son, image).
  const options = creerPanneauOptions({
    reglages,
    surChangement: (cle) => {
      ecrireReglagesNavigateur(reglages);
      audio.regler(reglages);
      audio.preparer(); // on est dans un geste du joueur : le son a le droit de démarrer
      if (cle === 'qualite') appliquerQualite();
      if (cle === 'texte') appliquerTexte();
      // Un petit son d'essai quand on active les sons ou qu'on change leur volume.
      if ((cle === 'sons' || cle === 'volumeSons') && reglages.sons) setTimeout(() => audio.jouerSon('ramasser'), 150);
    },
    surFermeture: () => {
      commandes.relacherTout();
      tempsPrecedent = performance.now();
    },
    estDisponible: () => !ui.dialogueOuvert() && !panneau.estOuvert() && !enTransition && !album.estOuvert() && !fenetreOuverte() && !photo,
    afficherMessage: (texte) => ui.afficherMessage(texte),
    // Version 1.6 : enregistrer la partie dans un fichier, ou en ouvrir une.
    partie: {
      tailleMax: TAILLE_MAX_FICHIER,
      exporter() {
        let texte = null;
        if (jeuActif) texte = serialiserPartie({ etat, zone, position, orientation: orientationVoulue });
        else {
          try { texte = window.localStorage.getItem(CLE_SAUVEGARDE); } catch { texte = null; }
        }
        if (!texte) return "Il n'y a pas encore de partie à enregistrer : commencez d'abord à jouer !";
        telechargerFichier(URL.createObjectURL(new Blob([texte], { type: 'application/json' })), nomFichierSauvegarde(new Date()), true);
        return 'Fichier enregistré : regardez dans vos téléchargements.';
      },
      lire(texte) {
        const partie = chargerPartie(texte);
        if (!partie) return { ok: false, message: "Ce fichier n'est pas une partie de Cuivrebourg (ou il est abîmé)." };
        // On garde une version « propre » (vérifiée) de la partie.
        importEnAttente = serialiserPartie({ etat: partie.etat, zone: partie.zone, position: partie.position || { x: MONDE.joueur.x, z: MONDE.joueur.z }, orientation: partie.orientation });
        return { ok: true, message: `Partie trouvée : ${resumePartie(partie)}. Elle remplacera la partie de cet appareil.` };
      },
      confirmer() {
        if (!importEnAttente) return '';
        importEnCours = true; // plus de sauvegarde automatique : on n'écrase pas la partie ouverte
        try {
          window.localStorage.setItem(CLE_SAUVEGARDE, importEnAttente);
        } catch {
          importEnCours = false;
          return "Le navigateur refuse d'enregistrer la partie (en navigation privée, par exemple).";
        }
        setTimeout(() => window.location.reload(), 700);
        return 'Partie ouverte ! Le jeu redémarre…';
      },
    },
  });
  // L'album de souvenirs (version 1.5) : le jeu est en pause pendant qu'il est ouvert.
  const album = creerPanneauAlbum({
    etat,
    obtenirPortrait: (id) => obtenirPortrait(id),
    surOuverture: () => commandes.relacherTout(),
    surFermeture: () => {
      commandes.relacherTout();
      tempsPrecedent = performance.now();
    },
    estDisponible: () => jeuActif && !ui.dialogueOuvert() && !panneau.estOuvert() && !enTransition && !options.estOuvert() && !fenetreOuverte() && !photo,
    // Version 1.6 : les photos de l'album.
    photos: {
      lister: () => photos,
      telecharger: (i) => { if (photos[i]) telechargerFichier(photos[i].image, nomFichierPhoto(photos[i].date)); },
      supprimer: (i) => { photos.splice(i, 1); ecrirePhotos(); },
    },
  });

  // --- Version 1.6 : les nouvelles fenêtres ------------------------------------------------
  // Ce qu'elles ont en commun : le jeu est en pause tant qu'elles sont ouvertes.
  const enFenetre = {
    surOuverture: () => commandes.relacherTout(),
    surFermeture: () => {
      commandes.relacherTout();
      tempsPrecedent = performance.now();
    },
  };
  const libre = () => jeuActif && !ui.dialogueOuvert() && !panneau.estOuvert() && !enTransition && !options.estOuvert() && !album.estOuvert() && !fenetreOuverte() && !photo;
  const journal = creerJournal({
    ...enFenetre,
    estDisponible: () => libre() && etat.journal.dernierJour > 0,
    obtenirEdition: () => editionDuJour(etat, { saisonId: saisonDuJeu(), meteo: reglages.meteo, saisons: reglages.saisons }),
    surOuverture: () => {
      commandes.relacherTout();
      lireJournal(etat);
      majEtat();
    },
  });
  const garderobe = creerGarderobe({
    ...enFenetre,
    etat,
    obtenirApercu: () => obtenirApercuFerrus(),
    surAction: (type, id) => {
      afficherMessages(type === 'acheter' ? acheterTenue(etat, id) : porterTenue(etat, id));
      majEtat();
      garderobe.rafraichir();
    },
  });
  const panneauVitrine = creerPanneauVitrine({
    ...enFenetre,
    etat,
    surAction: (type, place, code) => {
      afficherMessages(type === 'exposer' ? exposer(etat, place, code) : retirer(etat, place));
      majEtat();
      panneauVitrine.rafraichir();
    },
  });
  const assemblage = creerPanneauAssemblage({
    ...enFenetre,
    // « assemble » : vrai (réussi), faux (on laisse faire la machine), ou null (annulé).
    surTerminer: (objet, assemble) => {
      if (assemble === null) afficherMessages(["Assemblage annulé : rien n'est perdu."]);
      else afficherMessages([...lancerFabrication(etat, objet, { assemble }), ...verifierQuetes(etat)]);
      majEtat();
      if (jeuActif) panneau.ouvrir('fabriquer');
    },
  });
  const ciel = creerPanneauCiel(enFenetre);
  const fenetres = [journal, garderobe, panneauVitrine, assemblage, ciel];
  function fenetreOuverte() {
    return fenetres.some((f) => f.estOuvert());
  }
  const enPause = () => options.estOuvert() || album.estOuvert() || fenetreOuverte() || Boolean(photo);

  const commandes = creerCommandes({
    // Les commandes du jeu sont en pause pendant que le panneau ou les options sont ouverts.
    estActif: () => jeuActif && !panneau.estOuvert() && !enPause(),
    surInteraction: interagir,
    surNavigation: (sens) => {
      if (ui.dialogueOuvert()) ui.changerChoix(sens);
    },
  });

  // --- La sauvegarde automatique ---
  let derniereSauvegarde = 0;
  function sauvegarder() {
    if (!jeuActif || importEnCours) return; // jamais sur l'écran d'accueil (on écraserait la partie)
    ecrireSauvegarde(serialiserPartie({ etat, zone, position, orientation: orientationVoulue }));
    derniereSauvegarde = performance.now();
  }
  // Quand on quitte la page ou qu'on change d'application, on sauvegarde.
  window.addEventListener('pagehide', sauvegarder);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sauvegarder();
  });

  // Met à jour tout ce qui dépend de l'état du jeu (et sauvegarde).
  let argentPrecedent = etat.argent;
  function majEtat() {
    // Des pièces gagnées : une petite clochette (si les sons sont activés).
    if (jeuActif && etat.argent > argentPrecedent) audio.jouerSon('pieces');
    argentPrecedent = etat.argent;
    ui.majArgent(etat.argent);
    ui.majObjectif(objectifActuel(etat), objectifSecondaire(etat));
    obstacles = obstaclesZone(zone, etat);

    // La place : engrenages, lampe, lanterne, améliorations, portail.
    const place = lieux.place;
    const etape = etapeLampe(etat);
    allumerLampe(place.decor.lampeEtabli, etape === ETAPES.LAMPE_REPAREE);
    place.decor.lampeEtabli.visible = etape !== ETAPES.TERMINEE;
    place.decor.lanterneOdile.visible = etape === ETAPES.TERMINEE;
    for (const [id, objet3d] of Object.entries(place.decor.ameliorations)) {
      objet3d.visible = etat.atelier.ameliorations.includes(id);
    }
    place.decor.portail.visible = !conditionRemplie(etat, 'portail');
    // Les décorations achetées (version 1.4), dehors et dedans (version 1.5).
    for (const [id, objet3d] of Object.entries(place.decor.decorations)) {
      objet3d.visible = possedeDecoration(etat, id);
    }
    for (const [id, objet3d] of Object.entries(lieux.interieur.decor.decorations)) {
      objet3d.visible = possedeDecoration(etat, id);
    }
    // Version 1.5 : Lucie est là une fois engagée ; le chat attend d'être adopté.
    for (const p of lieux.interieur.pnj) p.objet.visible = possedeAmelioration(etat, 'apprentie');
    chatErrant.visible = chatAAdopter(etat);
    // Version 1.6 : la tenue de Ferrus, la vitrine, le chemin de la forêt, le
    // télescope et le dirigeable, et les boutons de droite.
    habillerFerrus(ferrus, tenuePortee(etat));
    vitrine3d.regler(etat.vitrine.objets);
    barriereForet.visible = !conditionRemplie(etat, 'portail');
    lieux.foret.decor.telescope.regler(telescopeRepare(etat));
    lieux.foret.decor.chantier.regler(etapesDirigeable(etat));
    majBoutons();

    // Le marché : l'arbre tombé disparaît quand le chemin est dégagé.
    lieux.marche.decor.barriere.visible = !conditionRemplie(etat, 'chemin-moulin');

    // Le moulin : les pales manquantes reviennent quand l'axe est installé, et la
    // barrière de la route de la gare se lève à la fin de la quête.
    const roueReparee = roueEstReparee();
    for (const pale of lieux.moulin.decor.roue.palesManquantes) pale.visible = roueReparee;
    lieux.moulin.decor.barriereGare.visible = !conditionRemplie(etat, 'chemin-gare');
    // La gare : le sifflet neuf apparaît sur la locomotive une fois installé.
    lieux.gare.decor.train.sifflet.visible = locomotiveEnMarche(etat);
    // La mine : le wagonnet est remis sur ses rails une fois la roue posée.
    lieux.mine.decor.wagonnet.userData.reparer(wagonnetRepare(etat));
    // Les objets de quête à ramasser (engrenages, pales, rouages, pépites).
    for (const nom of ['place', 'moulin', 'gare', 'mine', 'foret']) {
      const aRamasser = new Set(objetsQueteZone(etat, nom).map((o) => o.id));
      for (const [id, objet3d] of lieux[nom].objetsQuete) objet3d.visible = aRamasser.has(id);
    }

    // Les marqueurs de tous les lieux.
    const marqueursPlace = marqueursActifs(etat);
    const marqueursQ = marqueursQuetes(etat);
    for (const [id, m] of lieux.place.marqueurs) m.objet.visible = Boolean(marqueursPlace[id]);
    for (const nom of ['marche', 'moulin', 'gare', 'mine', 'lac', 'interieur', 'foret']) {
      for (const [id, m] of lieux[nom].marqueurs) m.objet.visible = marqueursQ.has(id);
    }

    panneau.rafraichir();
    sauvegarder();
  }

  // La roue du moulin est réparée dès que l'axe a été installé.
  function roueEstReparee() {
    if (queteTerminee(etat, 'roue-moulin')) return true;
    const enCours = queteEnCours(etat);
    return Boolean(enCours && enCours.id === 'roue-moulin' && enCours.etape.type === 'parler');
  }

  function afficherMessages(messages) {
    for (const texte of messages) ui.afficherMessage(texte);
  }

  // Le joueur a appuyé sur E / Espace / « Interagir ».
  async function interagir() {
    if (!jeuActif || enTransition) return;
    if (ui.dialogueOuvert()) {
      ui.avancerDialogue();
      return;
    }
    if (panneau.estOuvert()) return;
    const cible = cibleProcheZone(zone, position.x, position.z, etat);
    if (!cible) return;
    const point = ZONES[zone].interactifs.find((i) => i.id === cible);
    orientationVoulue = Math.atan2(point.x - position.x, point.z - position.z);

    let messages = [];
    // Version 1.5 : pendant la pêche, on attend que ça morde.
    if (peche) return;
    // Un habitant à qui l'on parle pour la première fois entre dans l'album.
    const nouveauVenu = noterRencontre(etat, cible) ? HABITANTS_ALBUM.find((h) => h.id === cible) : null;
    if (cible === 'odile') {
      commandes.relacherTout();
      const atelierAvant = etat.atelier.ouvert;
      afficherMessages(await parlerAvec(cible, dialogueOdile(etat)));
      majEtat();
      // L'atelier vient d'ouvrir : Ferrus explique en quelques mots comment il marche.
      if (!atelierAvant && etat.atelier.ouvert) await ui.ouvrirDialogue(DIALOGUE_OUVERTURE);
    } else if (cible === 'etabli') {
      if (etat.atelier.ouvert) {
        // On ouvre directement le bon onglet : « Acheter » s'il manque des
        // matériaux pour ce qu'on doit faire (client ou quête), sinon « Fabriquer ».
        commandes.relacherTout();
        panneau.ouvrir(ongletUtile());
        return;
      }
      messages = utiliserEtabli(etat);
    } else if (cible === 'comptoir') {
      const dialogue = dialogueClient(etat);
      if (!dialogue) {
        messages = messageComptoirVide(etat);
      } else {
        commandes.relacherTout();
        const commande = clientAuComptoir(etat) && clientAuComptoir(etat).commande;
        const argentAvant = etat.argent;
        messages = appliquerAction(etat, await ui.ouvrirDialogue(dialogue));
        // Une boîte à musique vendue : le client la remonte, elle joue sa ritournelle.
        if (commande === 'boite-musique' && etat.argent > argentAvant) setTimeout(() => audio.jouerSon('boiteMusique'), 450);
      }
    } else if (cible === 'leon') {
      commandes.relacherTout();
      messages = await parlerAvec(cible, dialogueEtapeQuete(etat, 'leon', 'Léon') || dialogueLeon(etat));
    } else if ((cible === 'locomotive' || cible === 'train-retour') && voyageTrain(etat, zone)) {
      // Version 1.3 : on monte dans le train (à la gare, seulement s'il est à quai).
      if (zone === 'gare' && !trainAQuai) {
        messages = ['Le train est parti. Il revient à quai dans un instant.'];
      } else {
        voyagerEnTrain(voyageTrain(etat, zone));
        return;
      }
    } else if (cible === 'entree-mine' && galerieOuverte(etat)) {
      // Version 1.4 : on descend dans la galerie souterraine.
      changerLieu({ zone: 'galerie', ...ZONES.galerie.arrivees.mine });
      return;
    } else if (estFilon(cible)) {
      // Version 1.4 : on détache du cuivre d'un filon.
      const cuivreAvant = etat.atelier.stock.cuivre;
      messages = recolterFilon(etat, cible);
      if (etat.atelier.stock.cuivre > cuivreAvant) audio.jouerSon('ramasser');
    } else if (cible === 'porte-atelier') {
      // Version 1.5 : on entre dans l'atelier.
      changerLieu({ zone: 'interieur', ...ZONES.interieur.arrivees.place });
      return;
    } else if (cible === 'chat') {
      commandes.relacherTout();
      const dialogue = dialogueChat(etat);
      if (dialogue) messages = appliquerAction(etat, await ui.ouvrirDialogue(dialogue));
    } else if (cible === 'lucie') {
      commandes.relacherTout();
      messages = await parlerAvec(cible, dialogueApprentie(etat), true);
    } else if (cible === 'gaston') {
      commandes.relacherTout();
      messages = await parlerAvec(cible, dialogueEtapeQuete(etat, 'gaston', 'Gaston') || dialogueGaston(etat));
    } else if (cible === 'anatole') {
      // Version 1.6 : Anatole, l'inventeur de la forêt.
      commandes.relacherTout();
      messages = await parlerAvec(cible, dialogueAnatole(etat));
    } else if (cible === 'vitrine') {
      commandes.relacherTout();
      panneauVitrine.ouvrir();
      return;
    } else if (cible === 'armoire') {
      commandes.relacherTout();
      garderobe.ouvrir();
      return;
    } else if (cible === 'telescope' && telescopeRepare(etat)) {
      // La nuit, on découvre une constellation (une par nuit).
      const r = observerCiel(etat, saisonDuJeu(), { nuit: estNuit() });
      messages = r.messages;
      if (r.constellation) {
        if (r.nouvelle) audio.jouerSon('ramasser');
        ciel.montrer(r.constellation, r.nouvelle);
      }
    } else if (cible === 'chantier' && dirigeablePret(etat)) {
      ouvrirVoyage();
      return;
    } else if (estCueillette(cible)) {
      const avant = etat.foret.recoltes;
      messages = cueillir(etat, cible, saisonDuJeu());
      if (etat.foret.recoltes > avant) audio.jouerSon('ramasser');
    } else if (cible === 'potager') {
      const bouquetsAvant = etat.atelier.stock.bouquet;
      messages = utiliserPotager(etat, saisonDuJeu());
      if (etat.atelier.stock.bouquet > bouquetsAvant) audio.jouerSon('ramasser');
    } else if (cible === 'ponton' && etat.peche.canne) {
      // On lance la ligne ; ça mordra dans quelques secondes (voir la boucle de jeu).
      orientationVoulue = Math.PI;
      peche = { debut: tempsTotal, fin: tempsTotal + attenteTouche(etat) };
      messages = ['Vous lancez la ligne… Patience.'];
    } else if (cible === 'capucine' || cible === 'barnabe' || cible === 'augustin' || cible === 'sidonie') {
      commandes.relacherTout();
      const dialogue = dialoguePnjQuete(etat, cible, nomPnj(cible)) || dialogueParDefaut(cible);
      messages = await parlerAvec(cible, dialogue);
    } else {
      // Un objet du décor (mécanisme, horloge, locomotive, barrière…) : la quête
      // en cours le demande-t-elle ? Sinon, un petit message sur cet objet.
      messages = utiliserObjetQuete(etat, cible) || messageObjet(etat, cible);
    }
    if (nouveauVenu) messages.push(`${nouveauVenu.nom} entre dans votre album de souvenirs.`);
    afficherMessages([...messages, ...verifierQuetes(etat)]);
    majEtat();
  }

  // Version 1.6 : parler à un habitant. On ajoute le choix « Offrir un
  // cadeau… » (si c'est possible), on compte l'amitié du jour, et si un cadeau
  // d'amitié attend, l'habitant le donne à la fin. Renvoie les messages.
  async function parlerAvec(cible, dialogue, toujours = false) {
    const messages = [];
    let action = await ui.ouvrirDialogue(ami(cible) ? ajouterChoixAmitie(etat, cible, dialogue, toujours) : dialogue);
    if (String(action).startsWith('amitie:cadeau:')) {
      action = await ui.ouvrirDialogue(dialogueCadeau(etat, cible));
      if (String(action).startsWith('amitie:offrir:')) {
        const r = offrirCadeau(etat, cible, String(action).split(':')[3]);
        if (r.reaction) await ui.ouvrirDialogue({ orateur: ami(cible).nom, repliques: [r.reaction], choix: [{ texte: 'Avec plaisir !', action: 'fermer' }] });
        messages.push(...r.messages);
        action = 'fermer';
      }
    }
    messages.push(...appliquerAction(etat, action));
    if (ami(cible)) {
      messages.push(...parlerAmi(etat, cible));
      const cadeau = dialogueRecompense(etat, cible);
      if (cadeau) messages.push(...appliquerAction(etat, await ui.ouvrirDialogue(cadeau)));
    }
    return messages;
  }

  // Fait-il assez nuit pour voir les étoiles ? (Toujours, si le cycle du jour est coupé.)
  function estNuit() {
    return !reglages.jourNuit || lumiereDuMoment(etat.journee).nuit >= 0.5;
  }

  // La saison qui compte pour les règles (le potager, la pêche) : toujours
  // l'été si l'option « Saisons » est coupée.
  function saisonDuJeu() {
    return saisonDuMoment(etat.jour, etat.journee, reglages.saisons).id;
  }

  // L'onglet le plus utile à ouvrir à l'établi.
  function ongletUtile() {
    const besoins = [];
    const client = clientAuComptoir(etat);
    if (client && etat.atelier.stock[client.commande] === 0) besoins.push(client.commande);
    const enCours = queteEnCours(etat);
    if (enCours && enCours.etape.type === 'fabriquer') besoins.unshift(enCours.etape.objet);
    const manque = besoins.length > 0 && Object.keys(materiauxManquants(etat, besoins[0])).length > 0;
    // Rien de pressé, et une commande du carnet est prête : on ouvre le carnet.
    if (besoins.length === 0 && commandePrete(etat)) return 'carnet';
    return manque ? 'acheter' : 'fabriquer';
  }

  // ---------------------------------------------------------------------------
  // Changer de lieu (avec un fondu doux, sans flash)
  // ---------------------------------------------------------------------------
  const fondu = document.getElementById('fondu');
  const DUREE_FONDU = 350; // millisecondes

  function placerDansLieu(nouveauLieu, x, z, orientation) {
    zone = nouveauLieu;
    audio.changerAmbiance(zone); // chaque lieu a sa musique
    lieux[zone].scene.add(ferrus); // Ferrus quitte l'ancienne scène et entre dans la nouvelle
    lieux[zone].scene.add(soleil, soleil.target, domeCiel); // le soleil (et ses ombres) et le ciel aussi
    lieux[zone].scene.add(chutes); // les flocons (ou les pétales) le suivent
    lieux[zone].scene.add(pluie, compagnons.chat, compagnons.oiseau); // la pluie et les compagnons aussi
    obstacles = obstaclesZone(zone, etat);
    // Sécurité : si le point d'arrivée touche un obstacle, on le pousse dehors.
    position = deplacerJoueur({ x, z }, 0, 0, obstacles, ZONES[zone]);
    // Les compagnons arrivent juste derrière Ferrus.
    trace = creerTrace(position.x, position.z, orientation);
    placerCompagnons(compagnons, trace, position);
    orientationVoulue = orientation;
    ferrus.rotation.y = orientation;
    ferrus.position.set(position.x, 0, position.z);
    // La caméra est replacée directement (on ne la voit pas bouger : l'écran est voilé).
    calculerCamera(camera.position);
    viseeLissee.copy(viseeCamera);
    camera.lookAt(viseeLissee);
  }

  // Le voyage en train (version 1.3) : un petit « tchou », un fondu plus long
  // (le temps du trajet), et Ferrus descend sur le quai de l'autre gare.
  const DUREE_VOYAGE = 1400; // millisecondes
  function voyagerEnTrain(sortie) {
    enTransition = true;
    commandes.relacherTout();
    ui.majIndice(null);
    audio.jouerSon('sifflet');
    afficherMessages([sortie.zone === 'mine' ? 'Tchou ! Le train file vers la mine de cuivre…' : 'Tchou ! Le train redescend vers Cuivrebourg…']);
    fondu.classList.add('visible');
    setTimeout(() => {
      placerDansLieu(sortie.zone, sortie.x, sortie.z, sortie.orientation);
      // De retour à la gare, le train vient d'arriver à quai avec Ferrus.
      if (sortie.zone === 'gare') debutTrain = tempsTotal;
      majEtat();
      afficherMessages([ZONES[zone].nom]);
      fondu.classList.remove('visible');
      setTimeout(() => { enTransition = false; }, DUREE_FONDU / 2);
    }, DUREE_VOYAGE);
  }

  // Le voyage en dirigeable (version 1.6) : on choisit où aller, un fondu doux,
  // puis le vol au-dessus de la carte du village, et un autre fondu à l'arrivée.
  async function ouvrirVoyage() {
    if (!jeuActif || enTransition || ui.dialogueOuvert() || panneau.estOuvert() || enPause() || !dirigeablePret(etat)) return;
    commandes.relacherTout();
    const action = await ui.ouvrirDialogue(dialogueVoyage(etat, zone));
    const destination = destinationDuChoix(etat, zone, action);
    if (destination) voyagerEnDirigeable(destination);
  }
  function voyagerEnDirigeable(destination) {
    enTransition = true;
    commandes.relacherTout();
    ui.majIndice(null);
    afficherMessages(['Le dirigeable « Le Cuivrebourg » prend son envol…']);
    fondu.classList.add('visible');
    setTimeout(() => {
      sceneVol.add(soleil, soleil.target, domeCiel); // le soleil éclaire maintenant la carte du ciel
      voyage = { depuis: zone, vers: destination.zone, temps: 0, duree: dureeVol(zone, destination.zone), destination, fini: false };
      document.body.classList.add('mode-photo'); // pendant le vol, l'interface se fait discrète
      fondu.classList.remove('visible');
    }, DUREE_FONDU);
  }
  function finirVoyage() {
    voyage.fini = true;
    fondu.classList.add('visible');
    setTimeout(() => {
      const d = voyage.destination;
      voyage = null;
      document.body.classList.remove('mode-photo');
      placerDansLieu(d.zone, d.x, d.z, d.orientation);
      majEtat();
      afficherMessages([`${ZONES[zone].nom} : Ferrus descend par l'échelle de corde.`]);
      fondu.classList.remove('visible');
      setTimeout(() => { enTransition = false; }, DUREE_FONDU / 2);
    }, DUREE_FONDU);
  }

  function changerLieu(sortie) {
    enTransition = true;
    commandes.relacherTout();
    ui.majIndice(null);
    fondu.classList.add('visible');
    setTimeout(() => {
      placerDansLieu(sortie.zone, sortie.x, sortie.z, sortie.orientation);
      majEtat();
      afficherMessages([ZONES[zone].nom]);
      fondu.classList.remove('visible');
      setTimeout(() => { enTransition = false; }, DUREE_FONDU / 2);
    }, DUREE_FONDU);
  }

  // ---------------------------------------------------------------------------
  // Le mode photo (version 1.6) : on fige le temps, on tourne la caméra autour
  // de Ferrus, et on prend une photo (rangée dans l'album).
  // ---------------------------------------------------------------------------
  let photos = lirePhotosNavigateur();
  function lirePhotosNavigateur() {
    try { return lirePhotos(window.localStorage.getItem(CLE_PHOTOS)); } catch { return []; }
  }
  function ecrirePhotos() {
    // Si le navigateur manque de place, on retire les plus anciennes photos.
    while (photos.length > 0) {
      try {
        window.localStorage.setItem(CLE_PHOTOS, JSON.stringify(photos));
        return true;
      } catch {
        photos.pop();
      }
    }
    try { window.localStorage.removeItem(CLE_PHOTOS); } catch { /* rien à faire */ }
    return false;
  }
  // Télécharge un fichier (une photo, ou la partie). « liberer » : l'adresse a
  // été créée pour l'occasion, on la libère ensuite.
  function telechargerFichier(adresse, nom, liberer = false) {
    const lien = document.createElement('a');
    lien.href = adresse;
    lien.download = nom;
    document.body.append(lien);
    lien.click();
    lien.remove();
    if (liberer) setTimeout(() => URL.revokeObjectURL(adresse), 3000);
  }
  const photoUI = creerModePhoto({
    surTourner: (dAngle, dHauteur) => { if (photo) bougerCameraPhoto(photo.cam, dAngle, dHauteur, 0); },
    surZoom: (d) => { if (photo) bougerCameraPhoto(photo.cam, 0, 0, d); },
    surPhoto: () => prendrePhoto(),
    surQuitter: () => sortirPhoto(),
    surTelecharger: () => { if (photos[0]) telechargerFichier(photos[0].image, nomFichierPhoto(photos[0].date)); },
  });
  function entrerPhoto() {
    if (!libre()) return;
    commandes.relacherTout();
    ui.majIndice(null);
    photo = { cam: creerCameraPhoto() };
    photoUI.activer();
  }
  function sortirPhoto() {
    if (!photo) return;
    photo = null;
    photoUI.desactiver();
    calculerCamera(camera.position);
    viseeLissee.copy(viseeCamera);
    camera.lookAt(viseeLissee);
    tempsPrecedent = performance.now();
  }
  function prendrePhoto() {
    if (!photo) return;
    try {
      dessinerLieu();
      const source = renderer.domElement;
      const largeur = Math.min(720, source.width);
      const hauteur = Math.round(largeur * (source.height / source.width));
      const toile = document.createElement('canvas');
      toile.width = largeur;
      toile.height = hauteur;
      toile.getContext('2d').drawImage(source, 0, 0, largeur, hauteur);
      const image = toile.toDataURL('image/jpeg', 0.82);
      photos = ajouterPhoto(photos, { image, date: new Date().toISOString(), lieu: ZONES[zone].nom });
      const gardee = ecrirePhotos();
      audio.jouerSon('ramasser');
      photoUI.montrerVignette(image);
      if (!gardee) ui.afficherMessage("Le navigateur n'a pas de place pour garder la photo : téléchargez-la tout de suite !");
    } catch {
      ui.afficherMessage("La photo n'a pas pu être prise sur cet appareil.");
    }
  }

  // Les boutons de droite (journal, photo, dirigeable) et leurs touches.
  const boutonJournal = document.getElementById('bouton-journal');
  const boutonPhoto = document.getElementById('bouton-photo');
  const boutonDirigeable = document.getElementById('bouton-dirigeable');
  function majBoutons() {
    boutonJournal.hidden = etat.journal.dernierJour === 0;
    boutonJournal.classList.toggle('non-lu', journalNonLu(etat));
    boutonJournal.setAttribute('aria-label', journalNonLu(etat) ? 'Le journal du matin (pas encore lu)' : 'Le journal du matin');
    boutonDirigeable.hidden = !dirigeablePret(etat);
  }
  boutonJournal.addEventListener('click', (e) => {
    e.stopPropagation();
    if (libre()) journal.ouvrir();
  });
  boutonPhoto.addEventListener('click', (e) => {
    e.stopPropagation();
    entrerPhoto();
  });
  boutonDirigeable.addEventListener('click', (e) => {
    e.stopPropagation();
    ouvrirVoyage();
  });
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.repeat) return;
    const t = e.key.toLowerCase();
    if (t === 'p' && !photo) entrerPhoto();
    else if (t === 'v') ouvrirVoyage();
  });

  // La taille du texte (version 1.6) : une classe sur toute la page.
  function appliquerTexte() {
    const racine = document.documentElement;
    racine.classList.toggle('texte-grand', reglages.texte === 'grand');
    racine.classList.toggle('texte-tres-grand', reglages.texte === 'tres-grand');
  }
  appliquerTexte();

  // ---------------------------------------------------------------------------
  // Les clients en 3D (étape 2) — ils vivent sur la place
  // ---------------------------------------------------------------------------
  // La liste des clients est dans l'état du jeu (logique-atelier.js). Ici, on
  // fait seulement correspondre un personnage 3D à chaque client :
  //   - un nouveau client entre par le portail et va prendre sa place dans la file ;
  //   - quand la file avance, il avance aussi ;
  //   - une fois servi, il repart vers le portail et disparaît.
  const clients3d = new Map(); // numéro du client → { objet, chemin, place, partant }
  const VITESSE_CLIENT = 2.2;

  function synchroniserClients() {
    const file = MONDE.clients.file;
    const presents = new Set();
    etat.atelier.clients.forEach((client, place) => {
      presents.add(client.id);
      let c = clients3d.get(client.id);
      if (!c) {
        // Nouveau client : il apparaît devant le portail.
        const objet = creerHabitant(client.id);
        objet.position.set(MONDE.clients.entree.x, 0, MONDE.clients.entree.z);
        objet.rotation.y = Math.PI;
        lieux.place.scene.add(objet);
        c = { objet, chemin: [...MONDE.clients.chemin, file[place]], place, partant: false };
        clients3d.set(client.id, c);
      } else if (c.place !== place) {
        // La file a avancé : sa destination finale change.
        if (c.chemin.length === 0) c.chemin.push(file[place]);
        else c.chemin[c.chemin.length - 1] = file[place];
        c.place = place;
      }
    });
    // Les clients servis repartent par où ils sont venus.
    for (const [id, c] of clients3d) {
      if (!c.partant && !presents.has(id)) {
        c.partant = true;
        c.chemin = [...MONDE.clients.chemin].reverse().concat([MONDE.clients.entree]);
      }
    }
  }

  // Où sont les clients et les visiteurs de la vitrine ? (Rien à calculer quand
  // la place est vide, ce qui est le cas le plus courant.)
  const AUCUN_PASSANT = [];
  function positionsPassants() {
    if (clients3d.size === 0 && visiteurs.nombre() === 0) return AUCUN_PASSANT;
    const liste = visiteurs.positions();
    for (const c of clients3d.values()) liste.push(c.objet.position);
    return liste;
  }

  function animerClients(dt) {
    for (const [id, c] of clients3d) {
      let vitesse = 0;
      const but = c.chemin[0];
      if (but) {
        const dx = but.x - c.objet.position.x;
        const dz = but.z - c.objet.position.z;
        const distance = Math.hypot(dx, dz);
        const pas = VITESSE_CLIENT * dt;
        // Ferrus est sur son chemin ? Le client s'arrête poliment et attend.
        const prochain = distance <= pas
          ? { x: but.x, z: but.z }
          : { x: c.objet.position.x + (dx / distance) * pas, z: c.objet.position.z + (dz / distance) * pas };
        const attend = zone === 'place' && !clientPeutAvancer(c.objet.position, prochain, position);
        if (!attend) {
          if (distance <= pas) c.chemin.shift(); // étape du trajet atteinte
          else vitesse = VITESSE_CLIENT;
          c.objet.position.x = prochain.x;
          c.objet.position.z = prochain.z;
        }
        if (distance > 0.01) tournerVers(c.objet, Math.atan2(dx, dz), dt, 8);
      } else if (c.partant) {
        // Arrivé au portail : il quitte la place.
        supprimerPersonnage(c.objet);
        clients3d.delete(id);
        continue;
      } else {
        // En attente dans la file : il regarde vers le comptoir (vers le nord).
        tournerVers(c.objet, Math.PI, dt, 4);
      }
      animerMarche(c.objet, vitesse, dt);
    }
  }

  // Tourne un personnage en douceur vers un angle (par le chemin le plus court).
  function tournerVers(objet, angle, dt, rapidite) {
    let ecart = angle - objet.rotation.y;
    ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
    objet.rotation.y += ecart * Math.min(1, dt * rapidite);
  }

  // ---------------------------------------------------------------------------
  // La caméra qui suit Ferrus en douceur
  // ---------------------------------------------------------------------------
  // On vise un point un peu au-dessus de Ferrus. La caméra est placée derrière
  // et au-dessus de ce point. Sur un écran en hauteur (téléphone tenu droit),
  // on recule un peu pour voir assez du lieu.
  const viseeCamera = new THREE.Vector3();
  const positionCameraVoulue = new THREE.Vector3();
  function calculerCamera(sortie) {
    const enHauteur = camera.aspect < 1;
    const recul = enHauteur ? 1.8 : 1;
    // La visée reste un peu à l'intérieur du lieu, pour ne pas montrer le vide.
    const b = ZONES[zone].camera;
    const vx = Math.max(b.minX, Math.min(b.maxX, position.x));
    const vz = Math.max(b.minZ, Math.min(b.maxZ, position.z));
    viseeCamera.set(vx, 0.8, vz - 0.5);
    sortie.set(vx, 0.8 + 15 * recul, vz - 0.5 + 12.5 * recul);
  }
  function redimensionner() {
    camera.aspect = window.innerWidth / window.innerHeight;
    // Écran en hauteur : champ de vision un peu plus large pour voir le lieu.
    camera.fov = camera.aspect < 1 ? 50 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (effets) effets.redimensionner();
  }
  redimensionner();
  calculerCamera(camera.position);
  camera.lookAt(viseeCamera);
  const viseeLissee = viseeCamera.clone();
  window.addEventListener('resize', redimensionner);

  // ---------------------------------------------------------------------------
  // 4. La boucle de jeu
  // ---------------------------------------------------------------------------
  let tempsPrecedent = performance.now();
  let tempsTotal = 0;
  let pluieDuCiel = 0;         // la pluie du moment, pour couvrir le ciel (version 1.7)
  let dernierDessin = 0;
  let debutTrain = null;     // le moment où le train a commencé à rouler
  let trainRoulait = false;  // pour le petit « tchou » au départ
  let trainAQuai = true;     // le train de la gare est-il à quai ? (pour monter dedans)
  let saisonPrecedente = null; // pour annoncer le changement de saison (version 1.4)
  let pluiePrecedente = 0;     // pour annoncer la pluie (version 1.5)
  let peche = null;            // la pêche en cours : { debut, fin } (version 1.5)

  function boucle(maintenant) {
    // Mode « Économie » : on ne dessine qu'une image sur deux (30 par seconde).
    if (imagesParSeconde < 60 && maintenant - dernierDessin < 1000 / imagesParSeconde - 4) {
      requestAnimationFrame(boucle);
      return;
    }
    dernierDessin = maintenant;
    // dt = le temps écoulé depuis l'image précédente (limité, pour éviter les
    // grands sauts quand on revient sur l'onglet après une pause).
    const dtReel = Math.min(0.05, Math.max(0, (maintenant - tempsPrecedent) / 1000));
    tempsPrecedent = maintenant;
    // Version 1.6 : en mode photo, le temps est figé (plus rien ne bouge).
    const dt = photo ? 0 : dtReel;
    tempsTotal += dt;
    const lieu = lieux[zone];
    // La saison et la météo du moment : calculées une seule fois par image.
    const saisonImage = saisonDuJeu();
    const meteo = meteoDuMoment(etat.jour, etat.journee, saisonImage, reglages.meteo);
    pluieDuCiel = meteo.pluie;

    // --- L'atelier vit, même quand Ferrus est ailleurs (fabrication, clients) ---
    // (Pendant les options, le jeu est en pause : l'atelier attend aussi.)
    if (jeuActif && !enPause()) {
      const fabricationAvant = etat.atelier.fabrication;
      const clientsAvant = etat.atelier.clients.length;
      const evenements = avancerTemps(etat, dt);
      if (fabricationAvant && !etat.atelier.fabrication) audio.jouerSon('fabrication');
      else if (etat.atelier.clients.length > clientsAvant) audio.jouerSon('client');
      if (evenements.length > 0) {
        // Une fabrication finie peut faire avancer une quête.
        afficherMessages([...evenements, ...verifierQuetes(etat)]);
        majEtat();
      }
      ui.majFabrication(progressionFabrication(etat));
      panneau.majProgression();
      synchroniserClients();
      // Le temps passe : le soleil se couche, la nuit tombe, le jour revient.
      afficherMessages(avancerJournee(etat, dt, reglages.jourNuit));
      // Version 1.4 : les filons de la galerie se reforment ; Léon apporte
      // parfois une commande le matin ; et les saisons passent.
      avancerGalerie(etat, dt);
      const nouvelles = majCarnet(etat);
      if (nouvelles.length > 0) {
        audio.jouerSon('client');
        afficherMessages(nouvelles);
        majEtat();
      }
      const saison = saisonImage;
      const annonce = messageSaison(saisonPrecedente, saison);
      if (annonce) afficherMessages([annonce]);
      saisonPrecedente = saison;
      // Version 1.5 : la fête du jour, la météo, le potager, la pêche.
      const fete = majFetes(etat);
      if (fete.length > 0) {
        afficherMessages(fete);
        majEtat();
      }
      const temps = meteo;
      const annonceMeteo = messageMeteo(pluiePrecedente, temps.pluie);
      if (annonceMeteo) afficherMessages([annonceMeteo]);
      pluiePrecedente = temps.pluie;
      avancerPotager(etat, dt, saison, temps.pluie);
      // Version 1.6 : les buissons de la forêt repoussent, les visiteurs de la
      // vitrine passent, et Léon apporte le journal le matin.
      avancerForet(etat, dt);
      const visite = avancerVitrine(etat, dt);
      if (visite.messages.length > 0) {
        afficherMessages(visite.messages);
        majEtat();
      }
      if (visite.visite) visiteurs.lancer(etat.vitrine.visiteurs);
      const nouvelles16 = majJournal(etat);
      if (nouvelles16.length > 0) {
        // Le jour d'un anniversaire, le journal le rappelle.
        const fetes = anniversairesDuJour(etat.jour).map((a) => a.nom);
        afficherMessages([...nouvelles16, ...(fetes.length > 0 ? [`C'est l'anniversaire de ${fetes.join(' et de ')} aujourd'hui !`] : [])]);
        majEtat();
      }
      if (peche && tempsTotal >= peche.fin) {
        peche = null;
        const resultat = pecher(etat, saison);
        audio.jouerSon('ramasser');
        afficherMessages(['Ça mord !', ...resultat.messages]);
        majEtat();
      }
      // Sauvegarde de sécurité toutes les 5 secondes.
      if (maintenant - derniereSauvegarde > 5000) sauvegarder();
    }
    if (!enPause()) {
      animerClients(dt);
      // Les visiteurs de la vitrine s'arrêtent poliment si Ferrus est sur leur chemin.
      visiteurs.animer(dt, (depart, arrivee) => zone !== 'place' || clientPeutAvancer(depart, arrivee, position), tournerVers);
    }

    // --- Déplacement de Ferrus ---
    let vitesse = 0;
    if (jeuActif && !enTransition && !ui.dialogueOuvert() && !panneau.estOuvert() && !enPause()) {
      const direction = commandes.direction();
      // Pendant la pêche, Ferrus reste immobile ; s'il veut bouger, il range sa canne.
      if (peche && Math.hypot(direction.x, direction.z) > 0.3) {
        peche = null;
        afficherMessages(['Vous rangez la canne.']);
      }
      const { dx, dz } = peche ? { dx: 0, dz: 0 } : calculerPas(direction.x, direction.z, MONDE.joueur.vitesse, dt);
      const avant = position;
      // Sur la place, les clients sont des obstacles eux aussi.
      const passants = zone === 'place' ? positionsPassants() : AUCUN_PASSANT;
      const autour = passants.length > 0 ? obstacles.concat(obstaclesClients(passants, position)) : obstacles;
      position = deplacerJoueur(position, dx, dz, autour, ZONES[zone]);
      vitesse = dt > 0 ? Math.hypot(position.x - avant.x, position.z - avant.z) / dt : 0;
      if (Math.hypot(dx, dz) > 0.0001) orientationVoulue = Math.atan2(dx, dz);

      // Ramasser en passant dessus les objets de quête (engrenages, pales).
      const messages = ramasserObjetsQuete(etat, zone, position.x, position.z);
      if (messages.length > 0) {
        audio.jouerSon('ramasser');
        afficherMessages(messages);
        majEtat();
      }

      // Une sortie ? On change de lieu.
      const sortie = sortieAtteinte(zone, position.x, position.z, etat);
      if (sortie) {
        changerLieu(sortie);
      } else {
        // Afficher l'aide si on est près de quelqu'un ou de quelque chose.
        const cible = cibleProcheZone(zone, position.x, position.z, etat);
        // Le train n'est pas à quai : on le dit, plutôt que « Monter dans le train ».
        const trainParti = cible === 'locomotive' && voyageTrain(etat, zone) && !trainAQuai;
        let indice = cible ? (trainParti ? 'Le train revient bientôt' : libelleZone(etat, cible, saisonImage)) : null;
        if (peche) indice = 'Patience… (bougez pour ranger la canne)';
        ui.majIndice(indice);
      }
    } else if (!jeuActif) {
      ui.majIndice(null);
    }

    ferrus.position.set(position.x, 0, position.z);
    // Ferrus se tourne en douceur (on prend le chemin le plus court pour tourner).
    tournerVers(ferrus, orientationVoulue, dt, 12);
    animerFerrus(ferrus, vitesse, dt);

    // Les personnages du lieu se tournent doucement vers Ferrus quand il est proche.
    for (const p of lieu.pnj) {
      p.animer(dt);
      const distance = Math.hypot(position.x - p.x, position.z - p.z);
      const regard = distance < 5 ? Math.atan2(position.x - p.x, position.z - p.z) : 0;
      tournerVers(p.objet, regard, dt, 3);
    }

    // Les objets à ramasser tournent lentement et flottent à peine ; les marqueurs aussi.
    if (!moinsDeMouvement) {
      for (const objet3d of lieu.objetsQuete.values()) {
        if (!objet3d.visible) continue;
        const { roue, support, decalage } = objet3d.userData;
        // On retient la hauteur de départ de chaque objet, puis il flotte autour.
        if (objet3d.userData.base === undefined) objet3d.userData.base = support.position.y;
        roue.rotation.z = tempsTotal * 0.9 + decalage;
        support.position.y = objet3d.userData.base + Math.sin(tempsTotal * 1.4 + decalage) * 0.06;
      }
      for (const m of lieu.marqueurs.values()) {
        m.objet.rotation.y = tempsTotal * 0.8;
        m.objet.position.y = m.hauteur + Math.sin(tempsTotal * 1.6) * 0.06;
      }
      // Le rouage de l'établi tourne pendant une fabrication ; l'enseigne et la
      // roue du moulin (une fois réparée) tournent lentement.
      const decor = lieux.place.decor;
      if (etat.atelier.fabrication) decor.rouageEtabli.rotation.z += dt * 2.5;
      if (decor.ameliorations.enseigne.visible) decor.ameliorations.enseigne.rotation.z += dt * 0.3;
      if (roueEstReparee()) lieux.moulin.decor.roue.tourne.rotation.z -= dt * 0.5;
      // L'eau ondule, fait des ronds, et emporte quelques feuilles (version 1.1).
      animerEau(tempsTotal);
      for (const e of lieu.decor.eau || []) e.userData.animer(tempsTotal);
      // Le vent dans les feuillages (version 1.2).
      animerVent(tempsTotal);
    }

    // --- Version 1.2 : la fumée, l'horloge et le train de la gare ---
    // La forge fume davantage pendant une fabrication.
    lieux.place.decor.fumeeAtelier.userData.force = etat.atelier.fabrication ? 1 : 0.55;
    animerGare(dt);
    // La fumée monte (immobile si le système demande moins d'animations).
    for (const v of lieu.decor.vie || []) v.userData.animer(moinsDeMouvement ? 0 : tempsTotal);
    // La lumière du moment (toujours le jour si le cycle est coupé dans les
    // options) ; sous terre, toujours la même lumière de lanternes.
    // Dans l'atelier (version 1.5), la lumière douce des lampes.
    const sousTerre = Boolean(ZONES[zone].souterrain);
    const abrite = sousTerre || Boolean(ZONES[zone].lumiereFixe);
    let lumiere = lumiereDuMoment(reglages.jourNuit ? etat.journee : MOMENT_JOUR_FIXE);
    if (sousTerre) lumiere = LUMIERE_GALERIE;
    else if (ZONES[zone].lumiereFixe) lumiere = LUMIERE_INTERIEUR;
    appliquerLumiere(lieu.scene, lumiere, abrite);
    // La météo (version 1.5) : un ciel plus gris sous la pluie, la brume du matin.
    if (!abrite) appliquerMeteo(lieu.scene, meteo, camera.position.distanceTo(viseeLissee));
    mouillerFlaques(meteo.flaques);
    pluie.userData.animer(tempsTotal, viseeLissee.x, viseeLissee.z - 2, abrite || moinsDeMouvement ? 0 : meteo.pluie);

    // --- Version 1.4 : la saison, le calendrier, la galerie, l'horloge murale ---
    const ambiance = ambianceSaison(etat.jour, etat.journee, reglages.saisons);
    appliquerSaison(ambiance);
    // Rien ne tombe sous terre ni dans l'atelier (ni si le système demande moins d'animations).
    const rienNeTombe = abrite || moinsDeMouvement;
    chutes.userData.animer(tempsTotal, viseeLissee.x, viseeLissee.z - 2, rienNeTombe ? { petales: 0, feuilles: 0, flocons: 0 } : ambiance);
    const feteDuMoment = feteDuJour(etat);
    ui.majCalendrier(texteCalendrier(etat, reglages.saisons) + (feteDuMoment ? ` · ${feteDuMoment.nom}` : ''));

    // --- Version 1.5 : les fêtes, le potager, l'intérieur, les compagnons, la pêche ---
    for (const [id, g] of Object.entries(fetes3d)) {
      g.visible = Boolean(feteDuMoment && feteDuMoment.id === id);
      if (g.visible && zone === 'place' && g.userData.animer && !moinsDeMouvement) g.userData.animer(tempsTotal);
    }
    potager3d.userData.regler(etat.potager.pousse);
    lieux.interieur.decor.regler(etat.atelier.fabrication || etat.atelier.apprentie.fabrication ? 1 : 0);
    if (zone === 'place' && chatErrant.visible) animerChat(chatErrant, 0, dt, tempsTotal, moinsDeMouvement);
    suivreTrace(trace, position.x, position.z);
    animerCompagnons(compagnons, {
      trace,
      ferrus: { x: position.x, z: position.z, orientation: ferrus.rotation.y },
      marche: vitesse > 0.2,
      dt,
      t: tempsTotal,
      calme: moinsDeMouvement,
      chat: etat.compagnons.chat,
      oiseau: etat.compagnons.oiseau,
    });
    const materiel = lieux.lac.decor.peche;
    materiel.visible = Boolean(peche) && zone === 'lac';
    if (materiel.visible) {
      materiel.position.set(position.x, 0, position.z);
      materiel.rotation.y = ferrus.rotation.y;
      materiel.userData.animer(tempsTotal, (tempsTotal - peche.debut) / (peche.fin - peche.debut), -0.12);
    }
    if (zone === 'galerie') {
      for (const [id, filon] of lieu.decor.filons) filon.userData.regler(progressionFilon(etat, id));
    }
    // Version 1.6 : les buissons de la forêt (mûrs ou en train de repousser).
    if (zone === 'foret') lieu.decor.buissons.regler(CUEILLETTES.map((c) => progressionCueillette(etat, c.id)), saisonImage);
    const horlogeMurale = lieux.place.decor.decorations['horloge-murale'];
    if (zone === 'place' && horlogeMurale.visible) horlogeMurale.userData.regler(anglesAiguilles(etat.journee));

    // --- La caméra suit Ferrus en douceur (sans secousse) ---
    // À chaque image, elle parcourt une petite partie du chemin qui la sépare
    // de sa place idéale : elle « glisse » vers Ferrus.
    // Version 1.6 : le voyage en dirigeable. On dessine la carte du village vue
    // du ciel, au lieu du lieu où l'on est.
    if (voyage) {
      voyage.temps += dtReel;
      const t = voyage.temps / voyage.duree;
      vol.placer(voyage.depuis, voyage.vers, Math.min(1, t), tempsTotal, camera);
      appliquerLumiere(sceneVol, lumiereDuMoment(reglages.jourNuit ? etat.journee : MOMENT_JOUR_FIXE));
      dessinerLieu();
      if (t >= 1 && !voyage.fini) finirVoyage();
      requestAnimationFrame(boucle);
      return;
    }

    if (photo) {
      // Le mode photo : la caméra tourne librement autour de Ferrus (en douceur).
      const m = photoUI.mouvementClavier();
      bougerCameraPhoto(photo.cam, m.angle * dtReel, m.hauteur * dtReel, m.distance * dtReel);
      const cible = { x: position.x, y: 1.0, z: position.z };
      const p = positionCameraPhoto(photo.cam, cible);
      camera.position.lerp(positionCameraVoulue.set(p.x, p.y, p.z), 1 - Math.exp(-dtReel * 12));
      viseeLissee.lerp(viseeCamera.set(cible.x, cible.y, cible.z), 1 - Math.exp(-dtReel * 12));
      camera.lookAt(viseeLissee);
    } else {
      calculerCamera(positionCameraVoulue);
      const douceur = 1 - Math.exp(-dt * 3.5);
      camera.position.lerp(positionCameraVoulue, douceur);
      viseeLissee.lerp(viseeCamera, douceur);
      camera.lookAt(viseeLissee);
    }

    dessinerLieu();
    requestAnimationFrame(boucle);
  }

  // Dessine ce que le joueur regarde : le lieu où il est, ou la carte du ciel
  // pendant un voyage en dirigeable.
  function dessinerLieu() {
    const scene = voyage ? sceneVol : lieux[zone].scene;
    // Le ciel entoure la caméra ; il n'y en a pas sous terre ni dans l'atelier.
    const abrite = !voyage && Boolean(ZONES[zone].souterrain || ZONES[zone].lumiereFixe);
    domeCiel.visible = !abrite;
    if (!abrite) {
      domeCiel.position.copy(camera.position);
      const l = lumiereDuMoment(reglages.jourNuit ? etat.journee : MOMENT_JOUR_FIXE);
      domeCiel.userData.regler({
        horizon: scene.fog.color,
        nuit: l.nuit,
        soleil: directionAstre.copy(soleil.position).normalize(),
        temps: tempsTotal,
        pluie: voyage ? 0 : pluieDuCiel,
      });
    }
    if (effets && effetsVoulus) {
      // « nuit » pour le halo : la vraie nuit dehors, et les lieux sombres (galerie, atelier).
      const sombre = abrite ? 0.85 : lumiereDuMoment(reglages.jourNuit ? etat.journee : MOMENT_JOUR_FIXE).nuit;
      effets.dessiner(scene, camera, sombre);
    } else {
      renderer.render(scene, camera);
    }
  }

  // L'horloge et le train de la gare (version 1.2).
  function animerGare(dt) {
    const { horloge, train } = lieux.gare.decor;
    // Une fois réparée, l'horloge donne l'heure du jeu.
    if (horlogeReparee(etat)) {
      const a = anglesAiguilles(etat.journee);
      horloge.heures.rotation.z = -a.heures;
      horloge.minutes.rotation.z = -a.minutes;
    }
    // Le train roule seulement une fois la dernière quête finie ; avant, il
    // attend à quai (froid, puis fumant doucement une fois le sifflet installé).
    let e = { decalage: 0, vitesse: 0, visible: true };
    if (queteTerminee(etat, 'train-cuivrebourg')) {
      if (debutTrain === null) debutTrain = tempsTotal;
      e = etatTrain(tempsTotal - debutTrain);
    }
    train.groupe.position.x = train.depart + e.decalage;
    train.groupe.visible = e.visible;
    trainAQuai = e.visible && e.decalage === 0;
    for (const r of train.roues) r.rotation.z -= (e.vitesse * dt) / r.userData.rayon;
    const enMarche = locomotiveEnMarche(etat);
    train.fumee.userData.force = !enMarche ? 0 : e.vitesse > 0.1 ? 1 : 0.5;
    train.fumee.userData.vent = [0.9 - e.vitesse * 1.1, -0.25];
    // Un petit « tchou » quand le train démarre (si on est à la gare, et si les sons sont activés).
    const roule = e.vitesse > 0.05 && e.decalage > 0;
    if (roule && !trainRoulait && zone === 'gare') audio.jouerSon('sifflet');
    trainRoulait = roule;
  }

  // ---------------------------------------------------------------------------
  // Écran d'accueil : « Commencer », ou « Continuer » s'il y a une sauvegarde.
  // ---------------------------------------------------------------------------
  const sauvegarde = lireSauvegarde();
  majEtat();
  renderer.render(lieux.place.scene, camera);
  requestAnimationFrame(boucle);
  window.jeuDemarre = true;

  const boutonCommencer = document.getElementById('bouton-commencer');
  const boutonNouvelle = document.getElementById('bouton-nouvelle');
  const infoSauvegarde = document.getElementById('info-sauvegarde');
  boutonCommencer.disabled = false;
  boutonCommencer.textContent = sauvegarde ? 'Continuer la partie' : 'Commencer';
  boutonNouvelle.hidden = !sauvegarde;
  infoSauvegarde.textContent = `${sauvegarde
    ? 'Une partie est sauvegardée sur cet appareil.'
    : 'La partie se sauvegarde toute seule sur cet appareil.'} Version ${VERSION_JEU}.`;
  boutonCommencer.focus();

  function lancerJeu() {
    document.getElementById('accueil').hidden = true;
    document.getElementById('interface').hidden = false;
    if (document.activeElement) document.activeElement.blur();
    argentPrecedent = etat.argent; // pas de clochette pour l'argent d'une partie reprise
    // Pas d'annonce de saison pour la saison où l'on reprend la partie.
    saisonPrecedente = saisonDuMoment(etat.jour, etat.journee, reglages.saisons).id;
    jeuActif = true;
    tempsPrecedent = performance.now();
    majEtat();
    afficherMessages(verifierQuetes(etat));
  }

  boutonCommencer.addEventListener('click', () => {
    if (sauvegarde) {
      // On reprend la partie : on recopie l'état sauvegardé dans l'état du jeu.
      for (const cle of Object.keys(etat)) etat[cle] = sauvegarde.etat[cle];
      // Sans position valide, Ferrus repart devant l'atelier.
      const depart = sauvegarde.position || { x: MONDE.joueur.x, z: MONDE.joueur.z };
      placerDansLieu(sauvegarde.zone, depart.x, depart.z, sauvegarde.orientation);
    }
    lancerJeu();
  });

  // « Nouvelle partie » efface la sauvegarde… après une confirmation.
  let confirmation = false;
  boutonNouvelle.addEventListener('click', () => {
    if (!confirmation) {
      confirmation = true;
      boutonNouvelle.textContent = 'Toucher encore pour effacer la partie';
      boutonNouvelle.classList.add('attention');
      return;
    }
    effacerSauvegarde();
    lancerJeu();
  });

  // Pour les vérifications automatiques (et la curiosité) : on peut consulter
  // l'état du jeu dans la console du navigateur en tapant « atelier.etat ».
  window.atelier = {
    etat,
    position: () => ({ ...position }),
    zone: () => zone,
    scene: () => lieux[zone].scene,
    moteur: () => renderer,
    forces: FORCES,
    dessin: () => ({ ...renderer.info.render }),
    // Les triangles de chaque partie du lieu affiché (pour surveiller les performances).
    triangles: () => {
      const parties = {};
      lieux[zone].scene.traverse((o) => {
        if (!o.isMesh || !o.visible) return;
        const g = o.geometry;
        const n = ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
        const nom = g.type + (o.isInstancedMesh ? " (x" + o.count + ")" : "");
        parties[nom] = (parties[nom] || 0) + n;
      });
      return parties;
    },
    clients3d: () => clients3d.size,
    positionsClients: () => [...clients3d.values()].map((c) => ({ x: c.objet.position.x, z: c.objet.position.z })),
    reglages,
    soudures: () => Object.fromEntries(Object.entries(lieux).map(([nom, l]) => [nom, l.soudure])),
    audio: () => audio.etat(),
    imagesParSeconde: () => imagesParSeconde,
    ombres: () => soleils.every((s) => s.castShadow),
    // Version 1.2 : le temps du jeu (en secondes) et la position du train.
    temps: () => tempsTotal,
    train: () => ({ x: lieux.gare.decor.train.groupe.position.x, visible: lieux.gare.decor.train.groupe.visible, debut: debutTrain }),
    // Pour les vérifications : avance l'horaire du train de quelques secondes.
    avancerTrain: (secondes) => { if (debutTrain !== null) debutTrain -= secondes; },
    // Version 1.4 : la saison du moment.
    saison: () => ambianceSaison(etat.jour, etat.journee, reglages.saisons),
    // Version 1.5 : la météo et la pêche en cours.
    meteo: () => meteoDuMoment(etat.jour, etat.journee, saisonDuJeu(), reglages.meteo),
    peche: () => peche,
    album: () => album.estOuvert(),
    // Version 1.6 : les nouvelles fenêtres, le mode photo et le voyage.
    fenetre: () => (fenetres.find((f) => f.estOuvert()) || { element: { id: null } }).element.id,
    photo: () => Boolean(photo),
    reglerPhoto: (c) => { if (photo) Object.assign(photo.cam, c); },
    photos: () => photos.length,
    voyage: () => (voyage ? { ...voyage, destination: voyage.destination.zone } : null),
    visiteurs: () => visiteurs.nombre(),
    // Pour les vérifications : aller directement dans un lieu.
    allerA: (zoneId) => { const a = Object.values(ZONES[zoneId].arrivees)[0]; placerDansLieu(zoneId, a.x, a.z, a.orientation); majEtat(); },
    majEtat: () => majEtat(),
  };

  // ---------------------------------------------------------------------------
  // Les portraits de l'album (version 1.5)
  // ---------------------------------------------------------------------------
  // Chaque portrait est dessiné une seule fois, la première fois qu'on ouvre
  // l'album : on place le personnage devant une petite caméra, on prend la
  // photo dans un petit cadre de 128 × 128 pixels, et on la garde.
  const portraits = new Map();
  let mannequin = null; // un deuxième Ferrus, pour l'aperçu de la garde-robe (version 1.6)
  // Version 1.7 : le petit « studio photo » est préparé une seule fois, et la
  // photo est prise par le moteur 3D du jeu lui-même, dans un coin de l'image
  // (avant, un deuxième moteur 3D était créé rien que pour ça). Le coin est
  // recopié aussitôt, puis le jeu redessine le lieu par-dessus : on ne voit rien.
  const TAILLE_PORTRAIT = 128;
  let studio = null;
  function photographier(modele, hauteur, distance, surplomb = 0.1) {
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
      dessinerLieu(); // on redessine tout de suite le lieu par-dessus
    }
  }
  function obtenirApercuFerrus() {
    try {
      if (!mannequin) mannequin = creerFerrus();
      habillerFerrus(mannequin, tenuePortee(etat));
      mannequin.rotation.y = 0.35;
      return photographier(mannequin, 1.05, 2.75, 0.25);
    } catch {
      return null;
    }
  }
  function obtenirPortrait(id) {
    if (portraits.has(id)) return portraits.get(id);
    let image = null; // pas de portrait : l'album affiche un « ? »
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
}
