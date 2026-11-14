// =============================================================================
// mode-photo.js — le mode photo (version 1.6 ; sorti de main.js en 1.7.1)
// -----------------------------------------------------------------------------
// On fige le temps, on tourne la caméra autour de Ferrus, et on prend une
// photo, rangée dans l'album.
//   - les règles (limites de la caméra, nombre de photos) : logique-photo.js ;
//   - les boutons à l'écran : interface-photo.js ;
//   - ici : on relie les deux au jeu.
// =============================================================================

import { ZONES } from './logique-zones.js';
import { creerCameraPhoto, bougerCameraPhoto, ajouterPhoto, nomFichierPhoto } from './logique-photo.js';
import { creerModePhoto } from './interface-photo.js';
import { lirePhotosNavigateur, ecrirePhotosNavigateur, telechargerFichier } from './stockage.js';

// « jeu » : la partie en cours (voir main.js) ; « o » : les outils dont on a besoin.
export function creerPhotos(jeu, o) {
  const { moteur, cameraSuiveuse, audio, ui, commandes, dessinerLieu, libre } = o;
  let photos = lirePhotosNavigateur();

  const boutons = creerModePhoto({
    surTourner: (dAngle, dHauteur) => { if (jeu.photo) bougerCameraPhoto(jeu.photo.cam, dAngle, dHauteur, 0); },
    surZoom: (d) => { if (jeu.photo) bougerCameraPhoto(jeu.photo.cam, 0, 0, d); },
    surPhoto: () => prendre(),
    surQuitter: () => sortir(),
    surTelecharger: () => telecharger(0),
  });

  function entrer() {
    if (!libre()) return;
    commandes.relacherTout();
    ui.majIndice(null);
    jeu.photo = { cam: creerCameraPhoto() };
    boutons.activer();
  }
  function sortir() {
    if (!jeu.photo) return;
    jeu.photo = null;
    boutons.desactiver();
    cameraSuiveuse.replacer(jeu.zone, jeu.position);
    jeu.tempsPrecedent = performance.now();
  }
  function prendre() {
    if (!jeu.photo) return;
    try {
      dessinerLieu();
      const source = moteur.renderer.domElement;
      const largeur = Math.min(720, source.width);
      const hauteur = Math.round(largeur * (source.height / source.width));
      const toile = document.createElement('canvas');
      toile.width = largeur;
      toile.height = hauteur;
      toile.getContext('2d').drawImage(source, 0, 0, largeur, hauteur);
      const image = toile.toDataURL('image/jpeg', 0.82);
      photos = ajouterPhoto(photos, { image, date: new Date().toISOString(), lieu: ZONES[jeu.zone].nom });
      const gardee = ecrirePhotosNavigateur(photos);
      audio.jouerSon('ramasser');
      boutons.montrerVignette(image);
      if (!gardee) ui.afficherMessage("Le navigateur n'a pas de place pour garder la photo : téléchargez-la tout de suite !");
    } catch {
      ui.afficherMessage("La photo n'a pas pu être prise sur cet appareil.");
    }
  }
  function telecharger(i) {
    if (photos[i]) telechargerFichier(photos[i].image, nomFichierPhoto(photos[i].date));
  }

  return {
    entrer,
    sortir,
    // À chaque image, pendant le mode photo : la caméra tourne (clavier) autour de Ferrus.
    cadrer(dt) {
      const m = boutons.mouvementClavier();
      bougerCameraPhoto(jeu.photo.cam, m.angle * dt, m.hauteur * dt, m.distance * dt);
      cameraSuiveuse.tournerAutour(jeu.photo.cam, jeu.position, dt);
    },
    // Pour l'album : la liste des photos, en télécharger une, en supprimer une.
    lister: () => photos,
    telecharger,
    supprimer(i) {
      photos.splice(i, 1);
      ecrirePhotosNavigateur(photos);
    },
  };
}
