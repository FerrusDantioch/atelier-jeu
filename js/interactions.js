// =============================================================================
// interactions.js — ce qui se passe quand le joueur appuie sur E / Espace /
// « Interagir » (sorti de main.js en version 1.7.1)
// -----------------------------------------------------------------------------
// On regarde ce que Ferrus a devant lui (sa « cible » : un habitant, l'établi,
// une porte, un arrêt de tramway…), puis on applique la règle qui convient.
// Les règles elles-mêmes sont dans les fichiers logique-*.js : ici, on choisit
// seulement laquelle appeler, et on montre le résultat (dialogue, messages).
// =============================================================================

import { appliquerAction, dialogueOdile, utiliserEtabli } from './logique.js';
import { DIALOGUE_OUVERTURE, dialogueClient, messageComptoirVide, clientAuComptoir, materiauxManquants, dialogueApprentie } from './logique-atelier.js';
import { queteEnCours, verifierQuetes, dialoguePnjQuete, dialogueEtapeQuete, utiliserObjetQuete } from './logique-quetes.js';
import { ZONES, cibleProcheZone, nomPnj, dialogueLeon, dialogueParDefaut, messageObjet, voyageTrain, voyageTram } from './logique-zones.js';
import { dialogueChat } from './logique-compagnons.js';
import { utiliserPotager } from './logique-potager.js';
import { dialogueGaston, attenteTouche } from './logique-peche.js';
import { noterRencontre, HABITANTS_ALBUM } from './logique-album.js';
import { commandePrete } from './logique-commandes.js';
import { galerieOuverte, estFilon, recolterFilon } from './logique-galerie.js';
import { parlerAmi, ajouterChoixAmitie, dialogueCadeau, offrirCadeau, dialogueRecompense, ami } from './logique-amitie.js';
import { cueillir, estCueillette, observerCiel, dialogueAnatole, telescopeRepare } from './logique-foret.js';
import { dirigeablePret } from './logique-dirigeable.js';
import { dialogueVille, dialogueMerciVille, estHabitantVille, serviceRendu } from './logique-ville.js';

// « jeu » : la partie en cours (voir main.js) ; « o » : les outils dont on a besoin.
export function creerInteractions(jeu, o) {
  const { ui, commandes, audio, panneau, panneauVitrine, garderobe, ciel, voyages, afficherMessages, majEtat, saisonDuJeu, estNuit } = o;
  const { etat } = jeu;

  // Les habitants à qui l'on parle « simplement » : leur quête s'ils en ont
  // une pour Ferrus, sinon quelques mots.
  const HABITANTS_SIMPLES = ['capucine', 'barnabe', 'augustin', 'sidonie'];

  // Le joueur a appuyé sur E / Espace / « Interagir ».
  async function interagir() {
    if (!jeu.actif || jeu.enTransition) return;
    if (ui.dialogueOuvert()) {
      ui.avancerDialogue();
      return;
    }
    if (panneau.estOuvert()) return;
    const cible = cibleProcheZone(jeu.zone, jeu.position.x, jeu.position.z, etat);
    if (!cible) return;
    const point = ZONES[jeu.zone].interactifs.find((i) => i.id === cible);
    jeu.orientation = Math.atan2(point.x - jeu.position.x, point.z - jeu.position.z);

    let messages = [];
    // Version 1.5 : pendant la pêche, on attend que ça morde.
    if (jeu.peche) return;
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
    } else if ((cible === 'locomotive' || cible === 'train-retour') && voyageTrain(etat, jeu.zone)) {
      // Version 1.3 : on monte dans le train (à la gare, seulement s'il est à quai).
      if (jeu.zone === 'gare' && !jeu.trainAQuai) {
        messages = ['Le train est parti. Il revient à quai dans un instant.'];
      } else {
        voyages.voyagerEnTrain(voyageTrain(etat, jeu.zone));
        return;
      }
    } else if ((cible === 'arret-tram' || cible === 'arret-ville') && voyageTram(etat, jeu.zone)) {
      // Version 1.7 : on prend le tramway, entre la gare et la ville nouvelle.
      voyages.voyagerEnTram(voyageTram(etat, jeu.zone));
      return;
    } else if (estHabitantVille(cible)) {
      commandes.relacherTout();
      const dejaRendu = serviceRendu(etat, cible);
      messages = await parlerAvec(cible, dialogueVille(etat, cible));
      // Il vient de recevoir son objet : il remercie Ferrus.
      if (!dejaRendu && serviceRendu(etat, cible)) {
        majEtat();
        await ui.ouvrirDialogue(dialogueMerciVille(cible));
      }
    } else if (cible === 'entree-mine' && galerieOuverte(etat)) {
      // Version 1.4 : on descend dans la galerie souterraine.
      voyages.changerLieu({ zone: 'galerie', ...ZONES.galerie.arrivees.mine });
      return;
    } else if (estFilon(cible)) {
      // Version 1.4 : on détache du cuivre d'un filon.
      const cuivreAvant = etat.atelier.stock.cuivre;
      messages = recolterFilon(etat, cible);
      if (etat.atelier.stock.cuivre > cuivreAvant) audio.jouerSon('ramasser');
    } else if (cible === 'porte-atelier') {
      // Version 1.5 : on entre dans l'atelier.
      voyages.changerLieu({ zone: 'interieur', ...ZONES.interieur.arrivees.place });
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
      voyages.ouvrirVoyage();
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
      jeu.orientation = Math.PI;
      jeu.peche = { debut: jeu.temps, fin: jeu.temps + attenteTouche(etat) };
      messages = ['Vous lancez la ligne… Patience.'];
    } else if (HABITANTS_SIMPLES.includes(cible)) {
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

  return { interagir };
}
