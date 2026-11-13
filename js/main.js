// =============================================================================
// main.js — le point de départ du jeu : il ASSEMBLE tout
// -----------------------------------------------------------------------------
// 1. Vérifie que la 3D est disponible (sinon, message d'erreur clair).
// 2. Prépare le moteur 3D (moteur.js) et le « monde » : les dix lieux, leurs
//    décors et leurs habitants, Ferrus et ses compagnons (lieux.js).
// 3. Crée la partie en cours (« jeu »), l'interface (textes, panneaux,
//    fenêtres), les commandes (clavier, tactile) et la sauvegarde automatique.
// 4. Branche les grands morceaux du jeu, chacun dans son fichier :
//      interactions.js  ce qui se passe quand on appuie sur « Interagir » ;
//      voyages.js       passer d'un lieu à l'autre (à pied, train, tramway,
//                       dirigeable) ;
//      mode-photo.js    le mode photo ;
//      mise-a-jour.js   mettre le décor d'accord avec la partie ;
//      boucle.js        la « boucle de jeu » : 60 fois par seconde, on fait
//                       vivre le monde, on déplace Ferrus et on redessine.
// 5. Affiche l'écran d'accueil (« Commencer » ou « Continuer »).
//
// Les RÈGLES (quêtes, argent, collisions, lieux, sauvegarde) sont dans les
// fichiers logique*.js : ce fichier-ci ne fait que relier les morceaux.
// =============================================================================

import { MONDE, creerEtatJeu, objectifActuel, objectifSecondaire } from './logique.js';
import { lancerFabrication, acheterMateriau, acheterAmelioration, acheterDecoration, peutFabriquer } from './logique-atelier.js';
import { creerTrace } from './logique-compagnons.js';
import { livrerCommande } from './logique-commandes.js';
import { saisonDuMoment } from './logique-saisons.js';
import { verifierQuetes } from './logique-quetes.js';
import { ZONES, obstaclesZone } from './logique-zones.js';
import { MOMENT_JOUR_FIXE, lumiereDuMoment } from './logique-temps.js';
import { serialiserPartie, chargerPartie, nomFichierSauvegarde, resumePartie, TAILLE_MAX_FICHIER } from './logique-sauvegarde.js';
import { tenuePortee, porterTenue, acheterTenue } from './logique-garderobe.js';
import { exposer, retirer } from './logique-vitrine.js';
import { journalNonLu, lireJournal, editionDuJour } from './logique-journal.js';
import { OBJETS_ASSEMBLAGE } from './logique-assemblage.js';
import { dirigeablePret } from './logique-dirigeable.js';
import { VERSION_JEU } from './logique-reglages.js';
import { creerMoteur } from './moteur.js';
import { creerCameraSuiveuse } from './camera.js';
import { creerLieux } from './lieux.js';
import { placerCompagnons } from './compagnons.js';
import { creerPortraits } from './portraits.js';
import { mettreAJourLieux } from './mise-a-jour.js';
import { creerInteractions } from './interactions.js';
import { creerVoyages } from './voyages.js';
import { creerPhotos } from './mode-photo.js';
import { creerBoucle } from './boucle.js';
import { installerVerifications } from './verifications.js';
import {
  lireSauvegarde,
  ecrireSauvegarde,
  effacerSauvegarde,
  lireTexteSauvegarde,
  lireReglagesNavigateur,
  ecrireReglagesNavigateur,
  telechargerFichier,
} from './stockage.js';
import { creerCommandes } from './commandes.js';
import { creerInterface } from './interface.js';
import { creerPanneauAtelier } from './interface-atelier.js';
import { creerPanneauOptions } from './interface-options.js';
import { creerPanneauAlbum } from './interface-album.js';
import { creerJournal, creerGarderobe, creerPanneauVitrine, creerPanneauAssemblage, creerPanneauCiel } from './interface-v16.js';
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
  // 2. Le moteur 3D et le monde
  // ---------------------------------------------------------------------------
  const moteur = creerMoteur({ reglages, tactile });
  // Les lieux du jeu, chacun dans sa scène, et tout ce qui y vit (voir lieux.js).
  const monde = creerLieux(moteur.soleil, moteur.ciel);
  const cameraSuiveuse = creerCameraSuiveuse(moteur.camera);

  // ---------------------------------------------------------------------------
  // 3. La partie en cours, l'interface et les commandes
  // ---------------------------------------------------------------------------
  // « etat » : ce que les RÈGLES connaissent (argent, quêtes, stock…), et qui
  // est sauvegardé. « jeu » : la partie telle qu'on la joue en ce moment (où
  // est Ferrus, ce qu'il est en train de faire). Tous les morceaux du jeu se
  // partagent ce même objet « jeu ».
  const etat = creerEtatJeu();
  const jeu = {
    etat,
    reglages,
    zone: 'place',                                        // le lieu où se trouve Ferrus
    position: { x: MONDE.joueur.x, z: MONDE.joueur.z },   // sa position dans ce lieu
    orientation: 0,                                       // la direction vers laquelle il doit se tourner
    obstacles: obstaclesZone('place', etat),              // ce qu'il ne peut pas traverser
    trace: creerTrace(MONDE.joueur.x, MONDE.joueur.z, 0), // ses pas, que suivent ses compagnons
    actif: false,          // devient vrai après « Commencer » ou « Continuer »
    enTransition: false,   // pendant le fondu entre deux lieux
    photo: null,           // le mode photo (version 1.6) : { cam } pendant qu'il est actif
    voyage: null,          // le voyage en dirigeable en cours (version 1.6)
    peche: null,           // la pêche en cours : { debut, fin } (version 1.5)
    temps: 0,              // le temps du jeu, en secondes (figé en mode photo)
    tempsPrecedent: performance.now(), // le moment de l'image précédente
    pluie: 0,              // la pluie du moment, pour couvrir le ciel (version 1.7)
    debutTrain: null,      // le moment où le train a commencé à rouler
    trainAQuai: true,      // le train de la gare est-il à quai ? (pour monter dedans)
    saisonPrecedente: null, // pour annoncer le changement de saison (version 1.4)
    derniereSauvegarde: 0,
  };
  placerCompagnons(monde.compagnons, jeu.trace, MONDE.joueur);
  cameraSuiveuse.replacer(jeu.zone, jeu.position);

  let importEnCours = false; // une partie ouverte depuis un fichier va remplacer celle-ci
  let importEnAttente = null;

  // --- Quelques questions que plusieurs morceaux du jeu se posent ---
  // Le moment de la journée (toujours le même si le cycle du jour est coupé).
  const momentDuJour = () => (reglages.jourNuit ? etat.journee : MOMENT_JOUR_FIXE);
  // Fait-il assez nuit pour voir les étoiles ? (Toujours, si le cycle du jour est coupé.)
  const estNuit = () => !reglages.jourNuit || lumiereDuMoment(etat.journee).nuit >= 0.5;
  // La saison qui compte pour les règles (le potager, la pêche) : toujours
  // l'été si l'option « Saisons » est coupée.
  const saisonDuJeu = () => saisonDuMoment(etat.jour, etat.journee, reglages.saisons).id;
  function afficherMessages(messages) {
    for (const texte of messages) ui.afficherMessage(texte);
  }
  // Après une pause, la boucle de jeu repart de « maintenant » (pas de grand saut).
  function reprendre() {
    commandes.relacherTout();
    jeu.tempsPrecedent = performance.now();
  }

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
      if (cle === 'qualite') moteur.appliquerQualite();
      if (cle === 'texte') appliquerTexte();
      // Un petit son d'essai quand on active les sons ou qu'on change leur volume.
      if ((cle === 'sons' || cle === 'volumeSons') && reglages.sons) setTimeout(() => audio.jouerSon('ramasser'), 150);
    },
    surFermeture: reprendre,
    estDisponible: () => !ui.dialogueOuvert() && !panneau.estOuvert() && !jeu.enTransition && !album.estOuvert() && !fenetreOuverte() && !jeu.photo,
    afficherMessage: (texte) => ui.afficherMessage(texte),
    // Version 1.6 : enregistrer la partie dans un fichier, ou en ouvrir une.
    partie: {
      tailleMax: TAILLE_MAX_FICHIER,
      exporter() {
        const texte = jeu.actif ? texteDeLaPartie() : lireTexteSauvegarde();
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
        if (!ecrireSauvegarde(importEnAttente)) {
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
    obtenirPortrait: (id) => portraits.portrait(id),
    surOuverture: () => commandes.relacherTout(),
    surFermeture: reprendre,
    estDisponible: () => jeu.actif && !ui.dialogueOuvert() && !panneau.estOuvert() && !jeu.enTransition && !options.estOuvert() && !fenetreOuverte() && !jeu.photo,
    // Version 1.6 : les photos de l'album.
    photos: {
      lister: () => photos.lister(),
      telecharger: (i) => photos.telecharger(i),
      supprimer: (i) => photos.supprimer(i),
    },
  });

  // --- Version 1.6 : les nouvelles fenêtres ------------------------------------------------
  // Ce qu'elles ont en commun : le jeu est en pause tant qu'elles sont ouvertes.
  const enFenetre = {
    surOuverture: () => commandes.relacherTout(),
    surFermeture: reprendre,
  };
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
    obtenirApercu: () => portraits.apercuFerrus(tenuePortee(etat)),
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
      if (jeu.actif) panneau.ouvrir('fabriquer');
    },
  });
  const ciel = creerPanneauCiel(enFenetre);
  const fenetres = [journal, garderobe, panneauVitrine, assemblage, ciel];
  function fenetreOuverte() {
    return fenetres.some((f) => f.estOuvert());
  }
  // Le jeu est-il en pause ? Et Ferrus est-il libre de ses mouvements ?
  const enPause = () => options.estOuvert() || album.estOuvert() || fenetreOuverte() || Boolean(jeu.photo);
  const libre = () => jeu.actif && !ui.dialogueOuvert() && !panneau.estOuvert() && !jeu.enTransition && !enPause();

  const commandes = creerCommandes({
    // Les commandes du jeu sont en pause pendant que le panneau ou les options sont ouverts.
    estActif: () => jeu.actif && !panneau.estOuvert() && !enPause(),
    surInteraction: () => interactions.interagir(),
    surNavigation: (sens) => {
      if (ui.dialogueOuvert()) ui.changerChoix(sens);
    },
  });

  // --- La sauvegarde automatique ---
  function texteDeLaPartie() {
    return serialiserPartie({ etat, zone: jeu.zone, position: jeu.position, orientation: jeu.orientation });
  }
  function sauvegarder() {
    if (!jeu.actif || importEnCours) return; // jamais sur l'écran d'accueil (on écraserait la partie)
    ecrireSauvegarde(texteDeLaPartie());
    jeu.derniereSauvegarde = performance.now();
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
    if (jeu.actif && etat.argent > argentPrecedent) audio.jouerSon('pieces');
    argentPrecedent = etat.argent;
    ui.majArgent(etat.argent);
    ui.majObjectif(objectifActuel(etat), objectifSecondaire(etat));
    jeu.obstacles = obstaclesZone(jeu.zone, etat);
    mettreAJourLieux(etat, monde); // le décor (voir mise-a-jour.js)
    majBoutons();
    panneau.rafraichir();
    sauvegarder();
  }

  // Dessine ce que le joueur regarde : le lieu où il est, ou la carte du ciel
  // pendant un voyage en dirigeable.
  function dessinerLieu() {
    const scene = jeu.voyage ? monde.sceneVol : monde.lieux[jeu.zone].scene;
    moteur.dessiner(scene, {
      // Il n'y a pas de ciel sous terre ni dans l'atelier.
      abrite: !jeu.voyage && Boolean(ZONES[jeu.zone].souterrain || ZONES[jeu.zone].lumiereFixe),
      nuit: lumiereDuMoment(momentDuJour()).nuit,
      temps: jeu.temps,
      pluie: jeu.voyage ? 0 : jeu.pluie,
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Les grands morceaux du jeu
  // ---------------------------------------------------------------------------
  const voyages = creerVoyages(jeu, { monde, moteur, cameraSuiveuse, audio, ui, commandes, afficherMessages, majEtat, libre });
  const photos = creerPhotos(jeu, { moteur, cameraSuiveuse, audio, ui, commandes, dessinerLieu, libre });
  const interactions = creerInteractions(jeu, { ui, commandes, audio, panneau, panneauVitrine, garderobe, ciel, voyages, afficherMessages, majEtat, saisonDuJeu, estNuit });
  const portraits = creerPortraits(moteur.renderer, dessinerLieu);
  const boucle = creerBoucle(jeu, { monde, moteur, cameraSuiveuse, audio, ui, panneau, commandes, voyages, photos, afficherMessages, majEtat, sauvegarder, enPause, saisonDuJeu, momentDuJour, dessinerLieu, moinsDeMouvement });

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
    photos.entrer();
  });
  boutonDirigeable.addEventListener('click', (e) => {
    e.stopPropagation();
    voyages.ouvrirVoyage();
  });
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.repeat) return;
    const t = e.key.toLowerCase();
    if (t === 'p' && !jeu.photo) photos.entrer();
    else if (t === 'v') voyages.ouvrirVoyage();
  });

  // La taille du texte (version 1.6) : une classe sur toute la page.
  function appliquerTexte() {
    const racine = document.documentElement;
    racine.classList.toggle('texte-grand', reglages.texte === 'grand');
    racine.classList.toggle('texte-tres-grand', reglages.texte === 'tres-grand');
  }
  appliquerTexte();

  // ---------------------------------------------------------------------------
  // 5. Écran d'accueil : « Commencer », ou « Continuer » s'il y a une sauvegarde.
  // ---------------------------------------------------------------------------
  const sauvegarde = lireSauvegarde();
  majEtat();
  moteur.renderer.render(monde.lieux.place.scene, moteur.camera);
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
    jeu.saisonPrecedente = saisonDuJeu();
    jeu.actif = true;
    jeu.tempsPrecedent = performance.now();
    majEtat();
    afficherMessages(verifierQuetes(etat));
  }

  boutonCommencer.addEventListener('click', () => {
    if (sauvegarde) {
      // On reprend la partie : on recopie l'état sauvegardé dans l'état du jeu.
      for (const cle of Object.keys(etat)) etat[cle] = sauvegarde.etat[cle];
      // Sans position valide, Ferrus repart devant l'atelier.
      const depart = sauvegarde.position || { x: MONDE.joueur.x, z: MONDE.joueur.z };
      voyages.placerDansLieu(sauvegarde.zone, depart.x, depart.z, sauvegarde.orientation);
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

  // Pour les vérifications automatiques (et la curiosité) : voir verifications.js.
  installerVerifications(jeu, { monde, moteur, audio, album, fenetres, voyages, photos, majEtat, saisonDuJeu });
}
