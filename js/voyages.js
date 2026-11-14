// =============================================================================
// voyages.js — passer d'un lieu à l'autre (sorti de main.js en version 1.7.1)
// -----------------------------------------------------------------------------
// Ferrus change de lieu de quatre façons :
//   - à pied, par une sortie au bord du lieu (un fondu doux, sans flash) ;
//   - en train, entre la gare et la mine (version 1.3) ;
//   - en tramway, entre la gare et la ville nouvelle (version 1.7) ;
//   - en dirigeable, au-dessus de la carte du village (version 1.6).
//
// À chaque fois, l'écran se voile, on déplace Ferrus (et tout ce qui le suit :
// le soleil, le ciel, la pluie, ses compagnons) dans la scène du nouveau lieu,
// puis l'écran se dévoile.
// =============================================================================

import { deplacerJoueur } from './logique.js';
import { ZONES, obstaclesZone } from './logique-zones.js';
import { creerTrace } from './logique-compagnons.js';
import { dirigeablePret, dialogueVoyage, destinationDuChoix, dureeVol } from './logique-dirigeable.js';
import { placerCompagnons } from './compagnons.js';

const DUREE_FONDU = 350;   // millisecondes
const DUREE_VOYAGE = 1400; // le temps d'un trajet en train ou en tramway

// « jeu » : la partie en cours (voir main.js) ; « o » : les outils dont on a besoin.
export function creerVoyages(jeu, o) {
  const { monde, moteur, cameraSuiveuse, audio, ui, commandes, afficherMessages, majEtat, libre } = o;
  const fondu = document.getElementById('fondu');

  // Installe Ferrus dans un lieu, à un endroit précis.
  function placerDansLieu(nouveauLieu, x, z, orientation) {
    jeu.zone = nouveauLieu;
    audio.changerAmbiance(jeu.zone); // chaque lieu a sa musique
    const scene = monde.lieux[jeu.zone].scene;
    scene.add(monde.ferrus); // Ferrus quitte l'ancienne scène et entre dans la nouvelle
    scene.add(moteur.soleil, moteur.soleil.target, moteur.ciel); // le soleil (et ses ombres) et le ciel aussi
    scene.add(monde.chutes); // les flocons (ou les pétales) le suivent
    scene.add(monde.pluie, monde.compagnons.chat, monde.compagnons.oiseau); // la pluie et les compagnons aussi
    scene.add(monde.ombresPersonnages); // et les ombres au pied des personnages
    jeu.obstacles = obstaclesZone(jeu.zone, jeu.etat);
    // Sécurité : si le point d'arrivée touche un obstacle, on le pousse dehors.
    jeu.position = deplacerJoueur({ x, z }, 0, 0, jeu.obstacles, ZONES[jeu.zone]);
    // Les compagnons arrivent juste derrière Ferrus.
    jeu.trace = creerTrace(jeu.position.x, jeu.position.z, orientation);
    placerCompagnons(monde.compagnons, jeu.trace, jeu.position);
    jeu.orientation = orientation;
    monde.ferrus.rotation.y = orientation;
    monde.ferrus.position.set(jeu.position.x, 0, jeu.position.z);
    // La caméra est replacée directement (on ne la voit pas bouger : l'écran est voilé).
    cameraSuiveuse.replacer(jeu.zone, jeu.position);
  }

  // Le déroulement commun : on voile l'écran, on attend, on arrive, on dévoile.
  //   duree   : le temps passé derrière le voile (millisecondes) ;
  //   arrivee : ce qu'on affiche en arrivant (par défaut, le nom du lieu).
  function partir(sortie, duree, arrivee = null) {
    jeu.enTransition = true;
    commandes.relacherTout();
    ui.majIndice(null);
    fondu.classList.add('visible');
    setTimeout(() => {
      placerDansLieu(sortie.zone, sortie.x, sortie.z, sortie.orientation);
      // De retour à la gare en train : il vient d'arriver à quai avec Ferrus.
      if (sortie.enTrain && sortie.zone === 'gare') jeu.debutTrain = jeu.temps;
      majEtat();
      afficherMessages([arrivee || ZONES[jeu.zone].nom]);
      fondu.classList.remove('visible');
      setTimeout(() => { jeu.enTransition = false; }, DUREE_FONDU / 2);
    }, duree);
  }

  // À pied, par une sortie du lieu.
  function changerLieu(sortie) {
    partir(sortie, DUREE_FONDU);
  }

  // Le voyage en train (version 1.3) : un petit « tchou », un fondu plus long
  // (le temps du trajet), et Ferrus descend sur le quai de l'autre gare.
  function voyagerEnTrain(sortie) {
    audio.jouerSon('sifflet');
    afficherMessages([sortie.zone === 'mine' ? 'Tchou ! Le train file vers la mine de cuivre…' : 'Tchou ! Le train redescend vers Cuivrebourg…']);
    partir({ ...sortie, enTrain: true }, DUREE_VOYAGE);
  }

  // Le voyage en tramway (version 1.7) : une petite sonnette, un fondu, et
  // Ferrus descend à l'autre bout de la ligne.
  function voyagerEnTram(sortie) {
    audio.jouerSon('client'); // « ding ding ! »
    afficherMessages([sortie.zone === 'ville' ? 'Ding ding ! Le tramway glisse vers la ville nouvelle…' : 'Ding ding ! Le tramway repart vers la gare de Cuivrebourg…']);
    partir(sortie, DUREE_VOYAGE);
  }

  // Le voyage en dirigeable (version 1.6) : on choisit où aller, un fondu doux,
  // puis le vol au-dessus de la carte du village, et un autre fondu à l'arrivée.
  async function ouvrirVoyage() {
    if (!libre() || !dirigeablePret(jeu.etat)) return;
    commandes.relacherTout();
    const action = await ui.ouvrirDialogue(dialogueVoyage(jeu.etat, jeu.zone));
    const destination = destinationDuChoix(jeu.etat, jeu.zone, action);
    if (destination) voyagerEnDirigeable(destination);
  }
  function voyagerEnDirigeable(destination) {
    jeu.enTransition = true;
    commandes.relacherTout();
    ui.majIndice(null);
    afficherMessages(['Le dirigeable « Le Cuivrebourg » prend son envol…']);
    fondu.classList.add('visible');
    setTimeout(() => {
      monde.sceneVol.add(moteur.soleil, moteur.soleil.target, moteur.ciel); // le soleil éclaire maintenant la carte du ciel
      jeu.voyage = { depuis: jeu.zone, vers: destination.zone, temps: 0, duree: dureeVol(jeu.zone, destination.zone), destination, fini: false };
      document.body.classList.add('mode-photo'); // pendant le vol, l'interface se fait discrète
      fondu.classList.remove('visible');
    }, DUREE_FONDU);
  }
  // La boucle de jeu appelle « finirVoyage » quand le dirigeable est arrivé.
  function finirVoyage() {
    jeu.voyage.fini = true;
    fondu.classList.add('visible');
    setTimeout(() => {
      const d = jeu.voyage.destination;
      jeu.voyage = null;
      document.body.classList.remove('mode-photo');
      placerDansLieu(d.zone, d.x, d.z, d.orientation);
      majEtat();
      afficherMessages([`${ZONES[jeu.zone].nom} : Ferrus descend par l'échelle de corde.`]);
      fondu.classList.remove('visible');
      setTimeout(() => { jeu.enTransition = false; }, DUREE_FONDU / 2);
    }, DUREE_FONDU);
  }

  return { placerDansLieu, changerLieu, voyagerEnTrain, voyagerEnTram, ouvrirVoyage, finirVoyage };
}
