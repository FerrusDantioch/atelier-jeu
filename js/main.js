// =============================================================================
// main.js — le point de départ du jeu : il assemble tout et fait tourner le jeu
// -----------------------------------------------------------------------------
// 1. Vérifie que la 3D est disponible (sinon, message d'erreur clair).
// 2. Prépare les trois lieux en 3D (la place, le marché, le moulin), chacun
//    dans sa propre « scène » avec sa lumière, son décor et ses personnages.
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
  calculerPas,
  deplacerJoueur,
  creerEtatJeu,
  engrenagesVisibles,
  objectifActuel,
  objectifSecondaire,
  marqueursActifs,
  ramasserEngrenagesProches,
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
} from './logique-atelier.js';
import {
  QUETES,
  queteEnCours,
  queteTerminee,
  verifierQuetes,
  dialoguePnjQuete,
  appliquerActionQuete,
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
} from './logique-zones.js';
import { CLE_SAUVEGARDE, serialiserPartie, chargerPartie } from './logique-sauvegarde.js';
import { construireDecor, creerEngrenageQuete, creerMarqueur, allumerLampe } from './decor.js';
import { construireMarche, construireMoulin, creerPaleQuete } from './decor-zones.js';
import {
  creerFerrus,
  animerFerrus,
  creerOdile,
  animerOdile,
  creerHabitant,
  creerPersonnage,
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
  document.getElementById('scene').appendChild(renderer.domElement);

  // Si le téléphone « perd » la 3D (manque de mémoire…), on prévient clairement.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    window.afficherErreur("La 3D s'est arrêtée (l'appareil manquait peut-être de mémoire).", 'Rechargez la page pour reprendre (la partie est sauvegardée).');
  });

  // La caméra : vue de dessus, inclinée.
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 120);

  // Une scène vide avec le ciel, la brume et la lumière (la même pour chaque lieu).
  const soleils = []; // le « soleil » de chaque lieu (pour couper les ombres en mode Économie)
  function creerSceneDeBase() {
    const scene = new THREE.Scene();
    // Un ciel couleur sable doux et une brume légère qui cache l'horizon.
    const couleurCiel = new THREE.Color('#e9dcc3');
    scene.background = couleurCiel;
    scene.fog = new THREE.Fog(couleurCiel, 34, 70);
    // La lumière : douce et chaude, sans contraste violent.
    // - une lumière « ciel / sol » qui éclaire tout doucement ;
    scene.add(new THREE.HemisphereLight('#fff1d8', '#8a7558', 1.75));
    // - un « soleil » de fin d'après-midi qui fait les ombres. Il reste fixe et
    //   couvre tout le lieu : les ombres ne bougent pas et ne scintillent pas.
    const soleil = new THREE.DirectionalLight('#ffe0b8', 1.5);
    soleil.position.set(-10, 22, 12);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(tactile ? 1024 : 2048, tactile ? 1024 : 2048);
    Object.assign(soleil.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 1, far: 60 });
    soleil.shadow.bias = -0.0005;
    soleil.shadow.normalBias = 0.03;
    scene.add(soleil, soleil.target);
    soleils.push(soleil);
    return scene;
  }

  // Ajoute un marqueur flottant (losange ambre) au-dessus d'un point d'un lieu.
  function ajouterMarqueur(lieu, id, x, z, hauteur) {
    const marqueur = creerMarqueur();
    marqueur.position.set(x, hauteur, z);
    lieu.scene.add(marqueur);
    lieu.marqueurs.set(id, { objet: marqueur, hauteur });
  }

  // Ajoute un personnage avec un nom (Capucine, Léon, Barnabé) dans un lieu.
  function ajouterPnj(lieu, p) {
    const objet = creerPersonnage(TENUES_PNJ[p.id], p.x * 3);
    objet.position.set(p.x, 0, p.z);
    lieu.scene.add(objet);
    lieu.pnj.push({ id: p.id, objet, x: p.x, z: p.z, animer: (dt) => animerMarche(objet, 0, dt) });
    ajouterMarqueur(lieu, p.id, p.x, p.z, 2.45);
  }

  // Les trois lieux. Chacun : { scene, marqueurs, pnj, objetsQuete, … }
  const lieux = {};

  // --- La place (étapes 1 et 2) ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireDecor(scene, MONDE);
    // Odile, et ses engrenages perdus (cachés au départ).
    const odile = creerOdile();
    odile.position.set(MONDE.odile.x, 0, MONDE.odile.z);
    scene.add(odile);
    lieu.pnj.push({ id: 'odile', objet: odile, x: MONDE.odile.x, z: MONDE.odile.z, animer: (dt) => animerOdile(odile, dt) });
    lieu.engrenages = new Map();
    for (const e of MONDE.engrenages) {
      const objet3d = creerEngrenageQuete();
      objet3d.position.set(e.x, 0, e.z);
      objet3d.visible = false;
      objet3d.userData.decalage = lieu.engrenages.size * 2.1; // pour qu'ils ne tournent pas tous pareil
      scene.add(objet3d);
      lieu.engrenages.set(e.id, objet3d);
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
    for (const p of ZONES.marche.pnj) ajouterPnj(lieu, p);
    lieux.marche = lieu;
  }

  // --- Le moulin ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireMoulin(scene, ZONES.moulin);
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

  // Ferrus, qui passe d'une scène à l'autre selon le lieu.
  const ferrus = creerFerrus();
  ferrus.position.set(MONDE.joueur.x, 0, MONDE.joueur.z);
  lieux.place.scene.add(ferrus);

  // La qualité de l'image (option « Normale » ou « Économie »).
  let imagesParSeconde = 60;
  function appliquerQualite() {
    const q = parametresQualite(reglages.qualite, window.devicePixelRatio || 1);
    renderer.setPixelRatio(q.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    for (const soleil of soleils) soleil.castShadow = q.ombres;
    imagesParSeconde = q.imagesParSeconde;
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

  const ui = creerInterface();
  // Le panneau de l'établi : quand on appuie sur un de ses boutons, on applique
  // la règle correspondante, puis on met tout à jour.
  const panneau = creerPanneauAtelier({
    etat,
    surAction: (type, id, quantite) => {
      let messages = [];
      if (type === 'fabriquer') messages = lancerFabrication(etat, id);
      else if (type === 'acheter') messages = acheterMateriau(etat, id, quantite);
      else if (type === 'ameliorer') messages = acheterAmelioration(etat, id);
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
      // Un petit son d'essai quand on active les sons ou qu'on change leur volume.
      if ((cle === 'sons' || cle === 'volumeSons') && reglages.sons) setTimeout(() => audio.jouerSon('ramasser'), 150);
    },
    surFermeture: () => {
      commandes.relacherTout();
      tempsPrecedent = performance.now();
    },
    estDisponible: () => !ui.dialogueOuvert() && !panneau.estOuvert() && !enTransition,
    afficherMessage: (texte) => ui.afficherMessage(texte),
  });
  const enPause = () => options.estOuvert();

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
    if (!jeuActif) return; // jamais sur l'écran d'accueil (on écraserait la partie)
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
    const visibles = new Set(engrenagesVisibles(etat).map((e) => e.id));
    for (const [id, objet3d] of place.engrenages) objet3d.visible = visibles.has(id);
    const etape = etat.quete.etape;
    allumerLampe(place.decor.lampeEtabli, etape === ETAPES.LAMPE_REPAREE);
    place.decor.lampeEtabli.visible = etape !== ETAPES.TERMINEE;
    place.decor.lanterneOdile.visible = etape === ETAPES.TERMINEE;
    for (const [id, objet3d] of Object.entries(place.decor.ameliorations)) {
      objet3d.visible = etat.atelier.ameliorations.includes(id);
    }
    place.decor.portail.visible = !conditionRemplie(etat, 'portail');

    // Le marché : l'arbre tombé disparaît quand le chemin est dégagé.
    lieux.marche.decor.barriere.visible = !conditionRemplie(etat, 'chemin-moulin');

    // Le moulin : les pales manquantes reviennent quand l'axe est installé.
    const roueReparee = roueEstReparee();
    for (const pale of lieux.moulin.decor.roue.palesManquantes) pale.visible = roueReparee;
    const aRamasser = new Set(objetsQueteZone(etat, 'moulin').map((o) => o.id));
    for (const [id, objet3d] of lieux.moulin.objetsQuete) objet3d.visible = aRamasser.has(id);

    // Les marqueurs de tous les lieux.
    const marqueursPlace = marqueursActifs(etat);
    const marqueursQ = marqueursQuetes(etat);
    for (const [id, m] of lieux.place.marqueurs) m.objet.visible = Boolean(marqueursPlace[id]);
    for (const nom of ['marche', 'moulin']) {
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
    if (cible === 'odile') {
      commandes.relacherTout();
      const action = await ui.ouvrirDialogue(dialogueOdile(etat));
      const atelierAvant = etat.atelier.ouvert;
      afficherMessages(appliquerAction(etat, action));
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
        messages = appliquerAction(etat, await ui.ouvrirDialogue(dialogue));
      }
    } else if (cible === 'leon') {
      commandes.relacherTout();
      await ui.ouvrirDialogue(dialogueLeon(etat));
    } else if (cible === 'capucine' || cible === 'barnabe') {
      commandes.relacherTout();
      const dialogue = dialoguePnjQuete(etat, cible, nomPnj(cible)) || dialogueParDefaut(cible);
      const action = await ui.ouvrirDialogue(dialogue);
      messages = appliquerActionQuete(etat, action);
    } else if (cible === 'mecanisme') {
      messages = utiliserObjetQuete(etat, 'mecanisme') || messageObjet(etat, 'mecanisme');
    } else {
      messages = messageObjet(etat, cible);
    }
    afficherMessages([...messages, ...verifierQuetes(etat)]);
    majEtat();
  }

  // L'onglet le plus utile à ouvrir à l'établi.
  function ongletUtile() {
    const besoins = [];
    const client = clientAuComptoir(etat);
    if (client && etat.atelier.stock[client.commande] === 0) besoins.push(client.commande);
    const enCours = queteEnCours(etat);
    if (enCours && enCours.etape.type === 'fabriquer') besoins.unshift(enCours.etape.objet);
    const manque = besoins.length > 0 && Object.keys(materiauxManquants(etat, besoins[0])).length > 0;
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
    obstacles = obstaclesZone(zone, etat);
    // Sécurité : si le point d'arrivée touche un obstacle, on le pousse dehors.
    position = deplacerJoueur({ x, z }, 0, 0, obstacles, ZONES[zone]);
    orientationVoulue = orientation;
    ferrus.rotation.y = orientation;
    ferrus.position.set(position.x, 0, position.z);
    // La caméra est replacée directement (on ne la voit pas bouger : l'écran est voilé).
    calculerCamera(camera.position);
    viseeLissee.copy(viseeCamera);
    camera.lookAt(viseeLissee);
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

  function animerClients(dt) {
    for (const [id, c] of clients3d) {
      let vitesse = 0;
      const but = c.chemin[0];
      if (but) {
        const dx = but.x - c.objet.position.x;
        const dz = but.z - c.objet.position.z;
        const distance = Math.hypot(dx, dz);
        const pas = VITESSE_CLIENT * dt;
        if (distance <= pas) {
          c.objet.position.x = but.x;
          c.objet.position.z = but.z;
          c.chemin.shift();
        } else {
          c.objet.position.x += (dx / distance) * pas;
          c.objet.position.z += (dz / distance) * pas;
          vitesse = VITESSE_CLIENT;
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
  let dernierDessin = 0;

  function boucle(maintenant) {
    // Mode « Économie » : on ne dessine qu'une image sur deux (30 par seconde).
    if (imagesParSeconde < 60 && maintenant - dernierDessin < 1000 / imagesParSeconde - 4) {
      requestAnimationFrame(boucle);
      return;
    }
    dernierDessin = maintenant;
    // dt = le temps écoulé depuis l'image précédente (limité, pour éviter les
    // grands sauts quand on revient sur l'onglet après une pause).
    const dt = Math.min(0.05, Math.max(0, (maintenant - tempsPrecedent) / 1000));
    tempsPrecedent = maintenant;
    tempsTotal += dt;
    const lieu = lieux[zone];

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
      // Sauvegarde de sécurité toutes les 5 secondes.
      if (maintenant - derniereSauvegarde > 5000) sauvegarder();
    }
    if (!enPause()) animerClients(dt);

    // --- Déplacement de Ferrus ---
    let vitesse = 0;
    if (jeuActif && !enTransition && !ui.dialogueOuvert() && !panneau.estOuvert() && !enPause()) {
      const direction = commandes.direction();
      const { dx, dz } = calculerPas(direction.x, direction.z, MONDE.joueur.vitesse, dt);
      const avant = position;
      position = deplacerJoueur(position, dx, dz, obstacles, ZONES[zone]);
      vitesse = dt > 0 ? Math.hypot(position.x - avant.x, position.z - avant.z) / dt : 0;
      if (Math.hypot(dx, dz) > 0.0001) orientationVoulue = Math.atan2(dx, dz);

      // Ramasser en passant dessus : engrenages (place) et objets de quête.
      const messages = [
        ...(zone === 'place' ? ramasserEngrenagesProches(etat, position.x, position.z) : []),
        ...ramasserObjetsQuete(etat, zone, position.x, position.z),
      ];
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
        ui.majIndice(cible ? libelleZone(etat, cible) : null);
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
      const aAnimer = zone === 'place' ? lieu.engrenages.values() : lieu.objetsQuete.values();
      for (const objet3d of aAnimer) {
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
    }

    // --- La caméra suit Ferrus en douceur (sans secousse) ---
    // À chaque image, elle parcourt une petite partie du chemin qui la sépare
    // de sa place idéale : elle « glisse » vers Ferrus.
    calculerCamera(positionCameraVoulue);
    const douceur = 1 - Math.exp(-dt * 3.5);
    camera.position.lerp(positionCameraVoulue, douceur);
    viseeLissee.lerp(viseeCamera, douceur);
    camera.lookAt(viseeLissee);

    renderer.render(lieu.scene, camera);
    requestAnimationFrame(boucle);
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
    dessin: () => ({ ...renderer.info.render }),
    clients3d: () => clients3d.size,
    reglages,
    audio: () => audio.etat(),
    imagesParSeconde: () => imagesParSeconde,
    ombres: () => soleils.every((s) => s.castShadow),
  };
}
