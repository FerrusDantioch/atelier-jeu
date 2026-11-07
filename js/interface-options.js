// =============================================================================
// interface-options.js — le panneau « Options » (étape 4)
// -----------------------------------------------------------------------------
// On l'ouvre avec le bouton ⚙ en haut de l'écran (ou « Options » sur l'écran
// d'accueil, ou la touche Échap sur ordinateur). Le jeu est en pause pendant
// qu'il est ouvert.
//
// On y règle :
//   - la musique douce (coupée au départ) et son volume ;
//   - les petits sons (coupés au départ) et leur volume ;
//   - la qualité de l'image (« Économie » pour les téléphones qui chauffent) ;
//   - le cycle du jour et de la nuit (version 1.2) ;
//   - les saisons (version 1.4) ;
//   - la météo douce (version 1.5) ;
//   - la taille du texte, le petit jeu d'assemblage, et la partie dans un
//     fichier (version 1.6) ;
//   - le plein écran (sur les navigateurs qui le permettent) ;
//   - l'installation du jeu comme une application (quand Chrome le propose).
//
// Ce fichier ne décide de rien : à chaque changement, il prévient main.js
// (« surChangement »), qui enregistre les réglages et les applique.
// =============================================================================

import { NIVEAUX_VOLUME, QUALITES, VERSION_JEU, changerVolume, TAILLES_TEXTE } from './logique-reglages.js';

const $ = (id) => document.getElementById(id);

// « partie » (version 1.6) : { exporter(), lire(texte), confirmer() } — voir main.js.
export function creerPanneauOptions({ reglages, surChangement, surFermeture, estDisponible, afficherMessage, partie }) {
  const panneau = $('panneau-options');
  const boutonMusique = $('option-musique');
  const boutonSons = $('option-sons');
  const boutonJourNuit = $('option-jour-nuit');
  const boutonSaisons = $('option-saisons');
  const boutonMeteo = $('option-meteo');
  const boutonAssemblage = $('option-assemblage');
  const boutonsTexte = [...panneau.querySelectorAll('[data-texte]')];
  const boutonsQualite = [...panneau.querySelectorAll('[data-qualite]')];
  const sectionEcran = $('option-section-ecran');
  const boutonEcran = $('option-plein-ecran');
  const sectionInstaller = $('option-section-installer');
  const boutonInstaller = $('option-installer');
  const boutonInstallerAccueil = $('bouton-installer');
  let ouvert = false;

  $('options-version').textContent = `Version ${VERSION_JEU}`;

  // --- Ouvrir / fermer -----------------------------------------------------------
  function ouvrir() {
    if (ouvert) return;
    ouvert = true;
    panneau.hidden = false;
    document.body.classList.add('options-ouvert');
    majAffichage();
    boutonMusique.focus({ preventScroll: true });
  }
  function fermer() {
    if (!ouvert) return;
    ouvert = false;
    panneau.hidden = true;
    document.body.classList.remove('options-ouvert');
    if (document.activeElement) document.activeElement.blur();
    surFermeture();
  }
  $('options-fermer').addEventListener('click', fermer);
  for (const b of [$('bouton-options'), $('bouton-options-accueil')]) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      ouvrir();
    });
  }
  // Échap : ouvre ou ferme les options (sauf si Échap vient de fermer autre chose).
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (ouvert) {
      e.preventDefault();
      fermer();
    } else if (estDisponible()) {
      e.preventDefault();
      ouvrir();
    }
  });

  // --- Musique et sons --------------------------------------------------------------
  boutonMusique.addEventListener('click', () => {
    reglages.musique = !reglages.musique;
    majAffichage();
    surChangement('musique');
  });
  boutonSons.addEventListener('click', () => {
    reglages.sons = !reglages.sons;
    majAffichage();
    surChangement('sons');
  });
  boutonJourNuit.addEventListener('click', () => {
    reglages.jourNuit = !reglages.jourNuit;
    majAffichage();
    surChangement('jourNuit');
  });
  boutonMeteo.addEventListener('click', () => {
    reglages.meteo = !reglages.meteo;
    majAffichage();
    surChangement('meteo');
  });
  boutonSaisons.addEventListener('click', () => {
    reglages.saisons = !reglages.saisons;
    majAffichage();
    surChangement('saisons');
  });
  boutonAssemblage.addEventListener('click', () => {
    reglages.assemblage = !reglages.assemblage;
    majAffichage();
    surChangement('assemblage');
  });
  for (const b of boutonsTexte) {
    b.addEventListener('click', () => {
      if (reglages.texte === b.dataset.texte || !TAILLES_TEXTE[b.dataset.texte]) return;
      reglages.texte = b.dataset.texte;
      majAffichage();
      surChangement('texte');
    });
  }

  // --- La partie dans un fichier (version 1.6) ------------------------------------------
  const etatPartie = $('option-partie-etat');
  const boutonConfirmer = $('option-confirmer-import');
  const champFichier = $('option-fichier');
  $('option-exporter').addEventListener('click', () => {
    boutonConfirmer.hidden = true;
    etatPartie.textContent = partie.exporter();
  });
  $('option-importer').addEventListener('click', () => {
    boutonConfirmer.hidden = true;
    etatPartie.textContent = '';
    champFichier.value = '';
    champFichier.click();
  });
  champFichier.addEventListener('change', () => {
    const fichier = champFichier.files && champFichier.files[0];
    if (!fichier) return;
    if (fichier.size > partie.tailleMax) {
      etatPartie.textContent = "Ce fichier est bien trop gros pour être une partie de Cuivrebourg.";
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const reponse = partie.lire(String(lecteur.result));
      etatPartie.textContent = reponse.message;
      boutonConfirmer.hidden = !reponse.ok;
      if (reponse.ok) boutonConfirmer.focus({ preventScroll: true });
    };
    lecteur.onerror = () => { etatPartie.textContent = "Le fichier n'a pas pu être lu."; };
    lecteur.readAsText(fichier);
  });
  boutonConfirmer.addEventListener('click', () => {
    boutonConfirmer.hidden = true;
    etatPartie.textContent = partie.confirmer();
  });

  for (const volume of panneau.querySelectorAll('[data-volume]')) {
    const cle = volume.dataset.volume;
    // Les petits crans du volume (dessinés une seule fois).
    const crans = volume.querySelector('.crans');
    for (let i = 1; i <= NIVEAUX_VOLUME; i++) crans.appendChild(document.createElement('span'));
    for (const b of volume.querySelectorAll('[data-sens]')) {
      b.addEventListener('click', () => {
        changerVolume(reglages, cle, Number(b.dataset.sens));
        majAffichage();
        surChangement(cle);
      });
    }
  }

  // --- Qualité de l'image -------------------------------------------------------------
  for (const b of boutonsQualite) {
    b.addEventListener('click', () => {
      if (reglages.qualite === b.dataset.qualite) return;
      reglages.qualite = b.dataset.qualite;
      majAffichage();
      surChangement('qualite');
    });
  }

  // --- Plein écran ----------------------------------------------------------------------
  // Proposé seulement si le navigateur le permet, et si le jeu n'est pas déjà
  // lancé comme une application installée (il est alors déjà en plein écran).
  const dejaApplication = window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  const pleinEcranPossible = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  sectionEcran.hidden = !pleinEcranPossible || dejaApplication;
  boutonEcran.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      afficherMessage("Le plein écran n'est pas possible ici.");
    }
  });
  document.addEventListener('fullscreenchange', majAffichage);

  // --- Installer le jeu comme une application --------------------------------------------
  // Chrome prévient quand le jeu peut être installé : on garde cette proposition
  // de côté, et on affiche un bouton « Installer ».
  let propositionInstallation = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    propositionInstallation = e;
    sectionInstaller.hidden = false;
    boutonInstallerAccueil.hidden = false;
  });
  async function installer() {
    if (!propositionInstallation) return;
    const proposition = propositionInstallation;
    propositionInstallation = null;
    sectionInstaller.hidden = true;
    boutonInstallerAccueil.hidden = true;
    try {
      await proposition.prompt();
    } catch {
      // Le navigateur a refusé : sans gravité.
    }
  }
  boutonInstaller.addEventListener('click', installer);
  boutonInstallerAccueil.addEventListener('click', installer);
  window.addEventListener('appinstalled', () => {
    sectionInstaller.hidden = true;
    boutonInstallerAccueil.hidden = true;
    afficherMessage('Le jeu est installé : son icône est sur votre écran d\'accueil.');
  });

  // --- Mettre l'affichage à jour ------------------------------------------------------------
  function majAffichage() {
    majInterrupteur(boutonMusique, reglages.musique, 'Activée', 'Coupée');
    majInterrupteur(boutonSons, reglages.sons, 'Activés', 'Coupés');
    majInterrupteur(boutonJourNuit, reglages.jourNuit, 'Activé', 'Toujours le jour');
    majInterrupteur(boutonSaisons, reglages.saisons, 'Activées', "Toujours l'été");
    majInterrupteur(boutonMeteo, reglages.meteo, 'Activée', 'Toujours beau');
    majInterrupteur(boutonAssemblage, reglages.assemblage, 'Proposé', 'Jamais');
    for (const b of boutonsTexte) {
      const actif = b.dataset.texte === reglages.texte;
      b.classList.toggle('actif', actif);
      b.setAttribute('aria-pressed', String(actif));
    }
    for (const volume of panneau.querySelectorAll('[data-volume]')) {
      const niveau = reglages[volume.dataset.volume];
      [...volume.querySelectorAll('.crans span')].forEach((c, i) => c.classList.toggle('plein', i < niveau));
      volume.querySelector('[data-sens="-1"]').disabled = niveau <= 1;
      volume.querySelector('[data-sens="1"]').disabled = niveau >= NIVEAUX_VOLUME;
      volume.setAttribute('aria-label', `Volume ${niveau} sur ${NIVEAUX_VOLUME}`);
    }
    for (const b of boutonsQualite) {
      const actif = b.dataset.qualite === reglages.qualite;
      b.classList.toggle('actif', actif);
      b.setAttribute('aria-pressed', String(actif));
    }
    $('option-qualite-detail').textContent = QUALITES[reglages.qualite].detail;
    boutonEcran.textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Passer en plein écran';
  }
  function majInterrupteur(bouton, actif, texteOui, texteNon) {
    bouton.textContent = actif ? texteOui : texteNon;
    bouton.classList.toggle('actif', actif);
    bouton.setAttribute('aria-pressed', String(actif));
  }
  majAffichage();

  return {
    ouvrir,
    fermer,
    estOuvert: () => ouvert,
  };
}
