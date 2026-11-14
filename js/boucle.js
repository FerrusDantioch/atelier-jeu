// =============================================================================
// boucle.js — la « boucle de jeu » (sortie de main.js en version 1.7.1)
// -----------------------------------------------------------------------------
// Environ 60 fois par seconde, le navigateur nous demande une nouvelle image.
// À chaque fois, dans l'ordre :
//   1. le MONDE avance (« vivre ») : la fabrication, les clients, l'heure, les
//      saisons, la météo, le potager, la pêche… même quand Ferrus est ailleurs ;
//   2. FERRUS se déplace (« deplacerFerrus ») : on vérifie ce qu'il touche,
//      ce qu'il ramasse, s'il sort du lieu ;
//   3. le LIEU s'anime (« animerLieu ») : les habitants, l'eau, le vent, la
//      fumée, le train, la lumière du moment, la pluie, les compagnons ;
//   4. la CAMÉRA suit, et on DESSINE.
//
// Les règles sont dans les fichiers logique-*.js : ici, on les applique au fil
// du temps et on montre le résultat.
// =============================================================================

import { MONDE, calculerPas, deplacerJoueur, obstaclesClients, clientPeutAvancer } from './logique.js';
import { avancerTemps, progressionFabrication } from './logique-atelier.js';
import { majFetes, feteDuJour } from './logique-fetes.js';
import { meteoDuMoment, messageMeteo } from './logique-meteo.js';
import { suivreTrace } from './logique-compagnons.js';
import { avancerPotager } from './logique-potager.js';
import { pecher } from './logique-peche.js';
import { majCarnet } from './logique-commandes.js';
import { LUMIERE_GALERIE, avancerGalerie, progressionFilon } from './logique-galerie.js';
import { ambianceSaison, texteCalendrier, messageSaison } from './logique-saisons.js';
import { queteTerminee, verifierQuetes, ramasserObjetsQuete } from './logique-quetes.js';
import { ZONES, sortieAtteinte, cibleProcheZone, libelleZone, roueReparee, horlogeReparee, locomotiveEnMarche, voyageTrain, LUMIERE_INTERIEUR } from './logique-zones.js';
import { lumiereDuMoment, avancerJournee, anglesAiguilles, etatTrain } from './logique-temps.js';
import { anniversairesDuJour } from './logique-amitie.js';
import { avancerVitrine } from './logique-vitrine.js';
import { avancerForet, progressionCueillette, CUEILLETTES } from './logique-foret.js';
import { majJournal } from './logique-journal.js';
import { appliquerSaison } from './saisons.js';
import { mouillerFlaques, appliquerMeteo } from './meteo.js';
import { animerCompagnons, animerChat } from './compagnons.js';
import { animerEau } from './eau.js';
import { animerVent } from './vie.js';
import { animerFerrus } from './personnages.js';
import { ombrePersonnage } from './logique-ombres.js';

// Tourne un personnage en douceur vers un angle (par le chemin le plus court).
function tournerVers(objet, angle, dt, rapidite) {
  let ecart = angle - objet.rotation.y;
  ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
  objet.rotation.y += ecart * Math.min(1, dt * rapidite);
}

const AUCUN_PASSANT = [];
const RIEN_NE_TOMBE = { petales: 0, feuilles: 0, flocons: 0 };

// « jeu » : la partie en cours (voir main.js) ; « o » : les outils dont on a besoin.
// Renvoie la fonction à donner à « requestAnimationFrame » pour lancer la boucle.
export function creerBoucle(jeu, o) {
  const { monde, moteur, cameraSuiveuse, audio, ui, panneau, commandes, voyages, photos, afficherMessages, majEtat, sauvegarder, enPause, saisonDuJeu, momentDuJour, dessinerLieu, moinsDeMouvement } = o;
  const { etat, reglages } = jeu;
  const { lieux, ferrus, clients, visiteurs } = monde;
  const camera = moteur.camera;

  let dernierDessin = 0;
  let trainRoulait = false;  // pour le petit « tchou » au départ
  let pluiePrecedente = 0;   // pour annoncer la pluie (version 1.5)

  function boucle(maintenant) {
    // Mode « Économie » : on ne dessine qu'une image sur deux (30 par seconde).
    const imagesParSeconde = moteur.imagesParSeconde();
    if (imagesParSeconde < 60 && maintenant - dernierDessin < 1000 / imagesParSeconde - 4) {
      requestAnimationFrame(boucle);
      return;
    }
    dernierDessin = maintenant;
    // dt = le temps écoulé depuis l'image précédente (limité, pour éviter les
    // grands sauts quand on revient sur l'onglet après une pause).
    const dtReel = Math.min(0.05, Math.max(0, (maintenant - jeu.tempsPrecedent) / 1000));
    jeu.tempsPrecedent = maintenant;
    // Version 1.6 : en mode photo, le temps est figé (plus rien ne bouge).
    const dt = jeu.photo ? 0 : dtReel;
    jeu.temps += dt;
    // La saison et la météo du moment : calculées une seule fois par image.
    const saison = saisonDuJeu();
    const meteo = meteoDuMoment(etat.jour, etat.journee, saison, reglages.meteo);
    jeu.pluie = meteo.pluie;

    // (Pendant les options, l'album, une fenêtre ou le mode photo, le jeu est
    // en pause : l'atelier attend aussi.)
    if (jeu.actif && !enPause()) vivre(dt, maintenant, saison, meteo);
    if (!enPause()) {
      clients.animer(dt, jeu.zone === 'place' ? jeu.position : null, tournerVers);
      // Les visiteurs de la vitrine s'arrêtent poliment si Ferrus est sur leur chemin.
      visiteurs.animer(dt, (depart, arrivee) => jeu.zone !== 'place' || clientPeutAvancer(depart, arrivee, jeu.position), tournerVers);
    }

    const vitesse = deplacerFerrus(dt, saison);
    animerLieu(lieux[jeu.zone], dt, vitesse, saison, meteo);

    // Version 1.6 : le voyage en dirigeable. On dessine la carte du village vue
    // du ciel, au lieu du lieu où l'on est.
    if (jeu.voyage) {
      const voyage = jeu.voyage;
      voyage.temps += dtReel;
      const t = voyage.temps / voyage.duree;
      monde.vol.placer(voyage.depuis, voyage.vers, Math.min(1, t), jeu.temps, camera);
      moteur.appliquerLumiere(monde.sceneVol, lumiereDuMoment(momentDuJour()), momentDuJour());
      dessinerLieu();
      if (t >= 1 && !voyage.fini) voyages.finirVoyage();
      requestAnimationFrame(boucle);
      return;
    }

    // La caméra : libre en mode photo, sinon elle suit Ferrus en douceur.
    if (jeu.photo) photos.cadrer(dtReel);
    else cameraSuiveuse.suivre(jeu.zone, jeu.position, dt);

    dessinerLieu();
    requestAnimationFrame(boucle);
  }

  // ---------------------------------------------------------------------------
  // 1. Le monde avance, même quand Ferrus est ailleurs
  // ---------------------------------------------------------------------------
  function vivre(dt, maintenant, saison, meteo) {
    // --- L'atelier : la fabrication et les clients ---
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
    clients.synchroniser(etat.atelier.clients);
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
    const annonce = messageSaison(jeu.saisonPrecedente, saison);
    if (annonce) afficherMessages([annonce]);
    jeu.saisonPrecedente = saison;
    // Version 1.5 : la fête du jour, la météo, le potager, la pêche.
    const fete = majFetes(etat);
    if (fete.length > 0) {
      afficherMessages(fete);
      majEtat();
    }
    const annonceMeteo = messageMeteo(pluiePrecedente, meteo.pluie);
    if (annonceMeteo) afficherMessages([annonceMeteo]);
    pluiePrecedente = meteo.pluie;
    avancerPotager(etat, dt, saison, meteo.pluie);
    // Version 1.6 : les buissons de la forêt repoussent, les visiteurs de la
    // vitrine passent, et Léon apporte le journal le matin.
    avancerForet(etat, dt);
    const visite = avancerVitrine(etat, dt);
    if (visite.messages.length > 0) {
      afficherMessages(visite.messages);
      majEtat();
    }
    if (visite.visite) visiteurs.lancer(etat.vitrine.visiteurs);
    const journal = majJournal(etat);
    if (journal.length > 0) {
      // Le jour d'un anniversaire, le journal le rappelle.
      const fetes = anniversairesDuJour(etat.jour).map((a) => a.nom);
      afficherMessages([...journal, ...(fetes.length > 0 ? [`C'est l'anniversaire de ${fetes.join(' et de ')} aujourd'hui !`] : [])]);
      majEtat();
    }
    if (jeu.peche && jeu.temps >= jeu.peche.fin) {
      jeu.peche = null;
      const resultat = pecher(etat, saison);
      audio.jouerSon('ramasser');
      afficherMessages(['Ça mord !', ...resultat.messages]);
      majEtat();
    }
    // Sauvegarde de sécurité toutes les 5 secondes.
    if (maintenant - jeu.derniereSauvegarde > 5000) sauvegarder();
  }

  // ---------------------------------------------------------------------------
  // 2. Ferrus se déplace. Renvoie sa vitesse (pour l'animer).
  // ---------------------------------------------------------------------------
  // Où sont les clients et les visiteurs de la vitrine ? (Rien à calculer quand
  // la place est vide, ce qui est le cas le plus courant.)
  function positionsPassants() {
    if (clients.nombre() === 0 && visiteurs.nombre() === 0) return AUCUN_PASSANT;
    return visiteurs.positions().concat(clients.positions());
  }

  function deplacerFerrus(dt, saison) {
    if (!jeu.actif) {
      ui.majIndice(null);
      return 0;
    }
    if (jeu.enTransition || ui.dialogueOuvert() || panneau.estOuvert() || enPause()) return 0;

    const direction = commandes.direction();
    // Pendant la pêche, Ferrus reste immobile ; s'il veut bouger, il range sa canne.
    if (jeu.peche && Math.hypot(direction.x, direction.z) > 0.3) {
      jeu.peche = null;
      afficherMessages(['Vous rangez la canne.']);
    }
    const { dx, dz } = jeu.peche ? { dx: 0, dz: 0 } : calculerPas(direction.x, direction.z, MONDE.joueur.vitesse, dt);
    const avant = jeu.position;
    // Sur la place, les clients sont des obstacles eux aussi.
    const passants = jeu.zone === 'place' ? positionsPassants() : AUCUN_PASSANT;
    const autour = passants.length > 0 ? jeu.obstacles.concat(obstaclesClients(passants, jeu.position)) : jeu.obstacles;
    jeu.position = deplacerJoueur(jeu.position, dx, dz, autour, ZONES[jeu.zone]);
    const vitesse = dt > 0 ? Math.hypot(jeu.position.x - avant.x, jeu.position.z - avant.z) / dt : 0;
    if (Math.hypot(dx, dz) > 0.0001) jeu.orientation = Math.atan2(dx, dz);

    // Ramasser en passant dessus les objets de quête (engrenages, pales).
    const messages = ramasserObjetsQuete(etat, jeu.zone, jeu.position.x, jeu.position.z);
    if (messages.length > 0) {
      audio.jouerSon('ramasser');
      afficherMessages(messages);
      majEtat();
    }

    // Une sortie ? On change de lieu.
    const sortie = sortieAtteinte(jeu.zone, jeu.position.x, jeu.position.z, etat);
    if (sortie) {
      voyages.changerLieu(sortie);
    } else {
      // Afficher l'aide si on est près de quelqu'un ou de quelque chose.
      const cible = cibleProcheZone(jeu.zone, jeu.position.x, jeu.position.z, etat);
      // Le train n'est pas à quai : on le dit, plutôt que « Monter dans le train ».
      const trainParti = cible === 'locomotive' && voyageTrain(etat, jeu.zone) && !jeu.trainAQuai;
      let indice = cible ? (trainParti ? 'Le train revient bientôt' : libelleZone(etat, cible, saison)) : null;
      if (jeu.peche) indice = 'Patience… (bougez pour ranger la canne)';
      ui.majIndice(indice);
    }
    return vitesse;
  }

  // ---------------------------------------------------------------------------
  // 3. Le lieu s'anime
  // ---------------------------------------------------------------------------
  function animerLieu(lieu, dt, vitesse, saison, meteo) {
    const { position, zone } = jeu;
    const t = jeu.temps;

    ferrus.position.set(position.x, 0, position.z);
    // Ferrus se tourne en douceur (on prend le chemin le plus court pour tourner).
    tournerVers(ferrus, jeu.orientation, dt, 12);
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
        roue.rotation.z = t * 0.9 + decalage;
        support.position.y = objet3d.userData.base + Math.sin(t * 1.4 + decalage) * 0.06;
      }
      for (const m of lieu.marqueurs.values()) {
        m.objet.rotation.y = t * 0.8;
        m.objet.position.y = m.hauteur + Math.sin(t * 1.6) * 0.06;
      }
      // Le rouage de l'établi tourne pendant une fabrication ; l'enseigne et la
      // roue du moulin (une fois réparée) tournent lentement.
      const decor = lieux.place.decor;
      if (etat.atelier.fabrication) decor.rouageEtabli.rotation.z += dt * 2.5;
      if (decor.ameliorations.enseigne.visible) decor.ameliorations.enseigne.rotation.z += dt * 0.3;
      if (roueReparee(etat)) lieux.moulin.decor.roue.tourne.rotation.z -= dt * 0.5;
      // L'eau ondule, fait des ronds, et emporte quelques feuilles (version 1.1).
      animerEau(t);
      for (const e of lieu.decor.eau || []) e.userData.animer(t);
      // Le vent dans les feuillages (version 1.2).
      animerVent(t);
    }

    // --- Version 1.2 : la fumée, l'horloge et le train de la gare ---
    // La forge fume davantage pendant une fabrication.
    lieux.place.decor.fumeeAtelier.userData.force = etat.atelier.fabrication ? 1 : 0.55;
    animerGare(dt);
    // La fumée monte (immobile si le système demande moins d'animations).
    for (const v of lieu.decor.vie || []) v.userData.animer(moinsDeMouvement ? 0 : t);

    // La lumière du moment (toujours le jour si le cycle est coupé dans les
    // options) ; sous terre, toujours la même lumière de lanternes.
    // Dans l'atelier (version 1.5), la lumière douce des lampes.
    const sousTerre = Boolean(ZONES[zone].souterrain);
    const abrite = sousTerre || Boolean(ZONES[zone].lumiereFixe);
    let lumiere = lumiereDuMoment(momentDuJour());
    if (sousTerre) lumiere = LUMIERE_GALERIE;
    else if (ZONES[zone].lumiereFixe) lumiere = LUMIERE_INTERIEUR;
    moteur.appliquerLumiere(lieu.scene, lumiere, momentDuJour(), abrite);
    // La météo (version 1.5) : un ciel plus gris sous la pluie, la brume du matin.
    const visee = cameraSuiveuse.visee;
    if (!abrite) appliquerMeteo(lieu.scene, meteo, camera.position.distanceTo(visee));
    mouillerFlaques(meteo.flaques);
    monde.pluie.userData.animer(t, visee.x, visee.z - 2, abrite || moinsDeMouvement ? 0 : meteo.pluie);

    // --- Version 1.4 : la saison, le calendrier, la galerie, l'horloge murale ---
    const ambiance = ambianceSaison(etat.jour, etat.journee, reglages.saisons);
    appliquerSaison(ambiance);
    // Rien ne tombe sous terre ni dans l'atelier (ni si le système demande moins d'animations).
    monde.chutes.userData.animer(t, visee.x, visee.z - 2, abrite || moinsDeMouvement ? RIEN_NE_TOMBE : ambiance);
    const feteDuMoment = feteDuJour(etat);
    ui.majCalendrier(texteCalendrier(etat, reglages.saisons) + (feteDuMoment ? ` · ${feteDuMoment.nom}` : ''));

    // --- Version 1.5 : les fêtes, le potager, l'intérieur, les compagnons, la pêche ---
    for (const [id, g] of Object.entries(monde.fetes3d)) {
      g.visible = Boolean(feteDuMoment && feteDuMoment.id === id);
      if (g.visible && zone === 'place' && g.userData.animer && !moinsDeMouvement) g.userData.animer(t);
    }
    monde.potager3d.userData.regler(etat.potager.pousse);
    lieux.interieur.decor.regler(etat.atelier.fabrication || etat.atelier.apprentie.fabrication ? 1 : 0);
    if (zone === 'place' && monde.chatErrant.visible) animerChat(monde.chatErrant, 0, dt, t, moinsDeMouvement);
    suivreTrace(jeu.trace, position.x, position.z);
    animerCompagnons(monde.compagnons, {
      trace: jeu.trace,
      ferrus: { x: position.x, z: position.z, orientation: ferrus.rotation.y },
      marche: vitesse > 0.2,
      dt,
      t,
      calme: moinsDeMouvement,
      chat: etat.compagnons.chat,
      oiseau: etat.compagnons.oiseau,
    });
    // Version 1.7.1 : une petite ombre de contact au pied de chaque personnage.
    const ombres = [ombrePersonnage(position.x, position.z)];
    for (const p of lieu.pnj) if (p.objet.visible) ombres.push(ombrePersonnage(p.x, p.z));
    const chat = monde.compagnons.chat;
    if (chat.visible) ombres.push(ombrePersonnage(chat.position.x, chat.position.z, 0.2));
    if (zone === 'place') {
      if (monde.chatErrant.visible) ombres.push(ombrePersonnage(monde.chatErrant.position.x, monde.chatErrant.position.z, 0.2));
      for (const passant of positionsPassants()) ombres.push(ombrePersonnage(passant.x, passant.z));
    }
    monde.ombresPersonnages.userData.placer(ombres);
    const materiel = lieux.lac.decor.peche;
    materiel.visible = Boolean(jeu.peche) && zone === 'lac';
    if (materiel.visible) {
      materiel.position.set(position.x, 0, position.z);
      materiel.rotation.y = ferrus.rotation.y;
      materiel.userData.animer(t, (t - jeu.peche.debut) / (jeu.peche.fin - jeu.peche.debut), -0.12);
    }
    if (zone === 'galerie') {
      for (const [id, filon] of lieu.decor.filons) filon.userData.regler(progressionFilon(etat, id));
    }
    // Version 1.6 : les buissons de la forêt (mûrs ou en train de repousser).
    if (zone === 'foret') lieu.decor.buissons.regler(CUEILLETTES.map((c) => progressionCueillette(etat, c.id)), saison);
    const horlogeMurale = lieux.place.decor.decorations['horloge-murale'];
    if (zone === 'place' && horlogeMurale.visible) horlogeMurale.userData.regler(anglesAiguilles(etat.journee));
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
      if (jeu.debutTrain === null) jeu.debutTrain = jeu.temps;
      e = etatTrain(jeu.temps - jeu.debutTrain);
    }
    train.groupe.position.x = train.depart + e.decalage;
    train.groupe.visible = e.visible;
    jeu.trainAQuai = e.visible && e.decalage === 0;
    for (const r of train.roues) r.rotation.z -= (e.vitesse * dt) / r.userData.rayon;
    const enMarche = locomotiveEnMarche(etat);
    train.fumee.userData.force = !enMarche ? 0 : e.vitesse > 0.1 ? 1 : 0.5;
    train.fumee.userData.vent = [0.9 - e.vitesse * 1.1, -0.25];
    // Un petit « tchou » quand le train démarre (si on est à la gare, et si les sons sont activés).
    const roule = e.vitesse > 0.05 && e.decalage > 0;
    if (roule && !trainRoulait && jeu.zone === 'gare') audio.jouerSon('sifflet');
    trainRoulait = roule;
  }

  return boucle;
}
