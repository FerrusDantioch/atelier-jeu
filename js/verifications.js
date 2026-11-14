// =============================================================================
// verifications.js — une petite porte d'entrée pour les vérifications
// automatiques et la curiosité (sortie de main.js en version 1.7.1)
// -----------------------------------------------------------------------------
// Dans la console du navigateur, on peut taper « atelier.etat » pour consulter
// la partie, « atelier.allerA('lac') » pour changer de lieu, etc.
// Rien ici ne sert au jeu lui-même.
// =============================================================================

import { ZONES } from './logique-zones.js';
import { ambianceSaison } from './logique-saisons.js';
import { meteoDuMoment } from './logique-meteo.js';
import { FORCES } from './rendu.js';

// « jeu » : la partie en cours (voir main.js) ; « o » : ce qu'on veut pouvoir observer.
export function installerVerifications(jeu, o) {
  const { monde, moteur, audio, album, fenetres, voyages, majEtat, saisonDuJeu } = o;
  const { etat, reglages } = jeu;
  const { lieux, clients, visiteurs } = monde;
  const train = lieux.gare.decor.train;

  window.atelier = {
    etat,
    reglages,
    position: () => ({ ...jeu.position }),
    zone: () => jeu.zone,
    scene: () => lieux[jeu.zone].scene,
    moteur: () => moteur.renderer,
    forces: FORCES,
    dessin: () => ({ ...moteur.renderer.info.render }),
    // Les triangles de chaque partie du lieu affiché (pour surveiller les performances).
    triangles: () => {
      const parties = {};
      lieux[jeu.zone].scene.traverse((objet) => {
        if (!objet.isMesh || !objet.visible) return;
        const g = objet.geometry;
        const n = ((g.index ? g.index.count : g.attributes.position.count) / 3) * (objet.isInstancedMesh ? objet.count : 1);
        const nom = g.type + (objet.isInstancedMesh ? ` (x${objet.count})` : '');
        parties[nom] = (parties[nom] || 0) + n;
      });
      return parties;
    },
    clients3d: () => clients.nombre(),
    positionsClients: () => clients.positions().map((p) => ({ x: p.x, z: p.z })),
    soudures: () => Object.fromEntries(Object.entries(lieux).map(([nom, l]) => [nom, l.soudure])),
    audio: () => audio.etat(),
    imagesParSeconde: () => moteur.imagesParSeconde(),
    ombres: () => moteur.ombres(),
    // Version 1.2 : le temps du jeu (en secondes) et la position du train.
    temps: () => jeu.temps,
    train: () => ({ x: train.groupe.position.x, visible: train.groupe.visible, debut: jeu.debutTrain }),
    // Pour les vérifications : avance l'horaire du train de quelques secondes.
    avancerTrain: (secondes) => { if (jeu.debutTrain !== null) jeu.debutTrain -= secondes; },
    // Version 1.4 : la saison du moment.
    saison: () => ambianceSaison(etat.jour, etat.journee, reglages.saisons),
    // Version 1.5 : la météo et la pêche en cours.
    meteo: () => meteoDuMoment(etat.jour, etat.journee, saisonDuJeu(), reglages.meteo),
    peche: () => jeu.peche,
    album: () => album.estOuvert(),
    // Version 1.6 : les nouvelles fenêtres, le mode photo et le voyage.
    fenetre: () => (fenetres.find((f) => f.estOuvert()) || { element: { id: null } }).element.id,
    photo: () => Boolean(jeu.photo),
    reglerPhoto: (c) => { if (jeu.photo) Object.assign(jeu.photo.cam, c); },
    photos: () => o.photos.lister().length,
    voyage: () => (jeu.voyage ? { ...jeu.voyage, destination: jeu.voyage.destination.zone } : null),
    visiteurs: () => visiteurs.nombre(),
    // Pour les vérifications : aller directement dans un lieu.
    allerA: (zoneId) => { const a = Object.values(ZONES[zoneId].arrivees)[0]; voyages.placerDansLieu(zoneId, a.x, a.z, a.orientation); majEtat(); },
    placer: (zoneId, x, z) => { voyages.placerDansLieu(zoneId, x, z, 0); majEtat(); },
    majEtat: () => majEtat(),
  };
}
