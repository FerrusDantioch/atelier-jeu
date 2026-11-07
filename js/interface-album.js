// =============================================================================
// interface-album.js — l'album de souvenirs (version 1.5)
// -----------------------------------------------------------------------------
// On l'ouvre avec le bouton « livre » en haut de l'écran (ou la touche L).
// Le jeu est en pause pendant qu'il est ouvert. Trois onglets :
//   - Habitants : le portrait des habitants rencontrés (et des compagnons) ;
//   - Souvenirs : les quêtes terminées, les fêtes, et quelques chiffres ;
//   - Pêche : les espèces du lac déjà attrapées ;
//   - (version 1.6) Étoiles : les constellations vues au télescope d'Anatole ;
//   - (version 1.6) Photos : les photos prises en mode photo.
// Ce que l'on montre est décidé par logique-album.js ; les portraits sont
// dessinés par main.js (qui a la 3D) et donnés par « obtenirPortrait ». Les
// fiches des habitants montrent aussi leurs cœurs d'amitié et leur anniversaire.
// =============================================================================

import { habitantsAlbum, souvenirsAlbum, chiffresAlbum, pecheAlbum } from './logique-album.js';
import { ESPECES } from './logique-peche.js';
import { etoilesAlbum, CONSTELLATIONS } from './logique-foret.js';
import { texteCoeurs, MAX_COEURS } from './logique-amitie.js';
import { dateLisible, MAX_PHOTOS } from './logique-photo.js';
import { dessinerConstellation } from './interface-v16.js';

const $ = (id) => document.getElementById(id);
function el(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

export function creerPanneauAlbum({ etat, obtenirPortrait, surOuverture, surFermeture, estDisponible, photos }) {
  const panneau = $('panneau-album');
  const contenu = $('album-contenu');
  const onglets = [...panneau.querySelectorAll('[data-album]')];
  let ouvert = false;
  let ongletActif = 'habitants';

  function ouvrir() {
    if (ouvert) return;
    ouvert = true;
    panneau.hidden = false;
    document.body.classList.add('options-ouvert');
    surOuverture();
    dessiner();
    const actif = onglets.find((o) => o.dataset.album === ongletActif);
    if (actif) actif.focus({ preventScroll: true });
  }
  function fermer() {
    if (!ouvert) return;
    ouvert = false;
    panneau.hidden = true;
    document.body.classList.remove('options-ouvert');
    if (document.activeElement) document.activeElement.blur();
    surFermeture();
  }
  $('album-fermer').addEventListener('click', fermer);
  $('bouton-album').addEventListener('click', (e) => {
    e.stopPropagation();
    if (ouvert) fermer();
    else if (estDisponible()) ouvrir();
  });
  for (const o of onglets) {
    o.addEventListener('click', () => {
      ongletActif = o.dataset.album;
      dessiner();
      contenu.scrollTop = 0;
    });
  }
  // L : ouvrir ou fermer l'album ; Échap : le fermer.
  window.addEventListener('keydown', (e) => {
    const touche = e.key.toLowerCase();
    if (ouvert && (touche === 'escape' || touche === 'l')) {
      e.preventDefault();
      fermer();
    } else if (!ouvert && touche === 'l' && !e.repeat && estDisponible()) {
      e.preventDefault();
      ouvrir();
    }
  });

  function dessiner() {
    for (const o of onglets) {
      const actif = o.dataset.album === ongletActif;
      o.classList.toggle('actif', actif);
      o.setAttribute('aria-selected', String(actif));
    }
    contenu.innerHTML = '';
    if (ongletActif === 'habitants') dessinerHabitants();
    else if (ongletActif === 'souvenirs') dessinerSouvenirs();
    else if (ongletActif === 'etoiles') dessinerEtoiles();
    else if (ongletActif === 'photos') dessinerPhotos();
    else dessinerPeche();
  }

  function dessinerHabitants() {
    const grille = el('div', 'album-grille');
    for (const h of habitantsAlbum(etat)) {
      const fiche = el('div', h.connu ? 'fiche' : 'fiche inconnue');
      const portrait = h.connu ? obtenirPortrait(h.id) : null;
      if (portrait) {
        const img = document.createElement('img');
        img.src = portrait;
        img.alt = `Portrait de ${h.nom}`;
        fiche.append(img);
      } else {
        fiche.append(el('div', 'portrait-vide', '?'));
      }
      const texte = el('div');
      texte.append(el('div', 'fiche-nom', h.connu ? h.nom : '???'));
      texte.append(el('div', 'fiche-role', h.connu ? h.role : 'Pas encore rencontré'));
      if (h.connu) texte.append(el('div', 'fiche-mot', h.mot));
      // Version 1.6 : les cœurs d'amitié et l'anniversaire.
      if (h.connu && h.coeurs !== undefined) {
        const coeurs = el('div', 'fiche-coeurs', texteCoeurs(h.coeurs));
        coeurs.setAttribute('aria-label', `Amitié : ${h.coeurs} cœurs sur ${MAX_COEURS}`);
        texte.append(coeurs);
        texte.append(el('div', 'fiche-role', h.anniversaireAujourdhui ? "C'est son anniversaire aujourd'hui !" : `Anniversaire : ${h.anniversaire}`));
      }
      fiche.append(texte);
      grille.append(fiche);
    }
    contenu.append(grille);
  }

  function dessinerSouvenirs() {
    const souvenirs = souvenirsAlbum(etat);
    if (souvenirs.length === 0) contenu.append(el('p', 'carte-intro', "Aucun souvenir pour l'instant : aidez les habitants, et l'album se remplira."));
    for (const s of souvenirs) {
      const bloc = el('div', 'souvenir');
      bloc.append(el('div', 'souvenir-titre', s.titre));
      bloc.append(el('div', 'souvenir-texte', s.texte));
      contenu.append(bloc);
    }
    contenu.append(el('h3', 'album-section', 'Quelques chiffres'));
    const table = el('table', 'album-chiffres');
    for (const [libelle, valeur] of chiffresAlbum(etat)) {
      const ligne = el('tr');
      ligne.append(el('td', null, libelle), el('td', null, String(valeur)));
      table.append(ligne);
    }
    contenu.append(table);
  }

  function dessinerPeche() {
    const especes = pecheAlbum(etat);
    const trouvees = especes.filter((e) => e.nombre > 0).length;
    contenu.append(el('p', 'carte-intro', etat.peche.canne
      ? `Espèces trouvées : ${trouvees} sur ${ESPECES.length}. Chaque saison a ses poissons. Tous sont remis à l'eau.`
      : "Au lac, à l'ouest du marché, Gaston le pêcheur pourra vous prêter une canne."));
    const grille = el('div', 'album-grille');
    for (const e of especes) {
      const fiche = el('div', e.nombre > 0 ? 'poisson' : 'poisson inconnu');
      const forme = el('div', 'poisson-forme');
      forme.style.background = e.couleur;
      forme.style.color = e.couleur;
      fiche.append(forme);
      const texte = el('div');
      texte.append(el('div', 'poisson-nom', e.nom));
      texte.append(el('div', 'poisson-detail', e.nombre > 0 ? `Pêché ${e.nombre} fois · ${e.saisons}` : `Saison : ${e.saisons}`));
      fiche.append(texte);
      grille.append(fiche);
    }
    contenu.append(grille);
  }

  // Version 1.6 : les constellations.
  function dessinerEtoiles() {
    const liste = etoilesAlbum(etat);
    const trouvees = liste.filter((c) => c.connue).length;
    contenu.append(el('p', 'carte-intro', trouvees > 0
      ? `Constellations découvertes : ${trouvees} sur ${CONSTELLATIONS.length}. Chaque saison en cache deux : une par nuit, au télescope d'Anatole.`
      : "Dans la forêt, à l'est de la place, Anatole a un grand télescope. La nuit, on y découvre les constellations."));
    const grille = el('div', 'album-grille');
    for (const c of liste) {
      const fiche = el('div', c.connue ? 'fiche etoile' : 'fiche etoile inconnue');
      fiche.append(dessinerConstellation(c, c.connue));
      const texte = el('div');
      texte.append(el('div', 'fiche-nom', c.nom));
      texte.append(el('div', 'fiche-role', `Saison : ${c.saisonNom}`));
      if (c.connue) texte.append(el('div', 'fiche-mot', c.texte));
      fiche.append(texte);
      grille.append(fiche);
    }
    contenu.append(grille);
  }

  // Version 1.6 : les photos (gardées dans ce navigateur seulement).
  let aSupprimer = -1;
  function dessinerPhotos() {
    const liste = photos ? photos.lister() : [];
    contenu.append(el('p', 'carte-intro', liste.length > 0
      ? `Vos photos (${liste.length} sur ${MAX_PHOTOS} au plus : la plus ancienne laisse sa place). Elles restent dans ce navigateur : téléchargez celles que vous voulez garder.`
      : "Aucune photo pour l'instant. Touchez le bouton de l'appareil photo, à droite de l'écran (ou la touche P), pour en prendre une."));
    const grille = el('div', 'album-photos');
    liste.forEach((p, i) => {
      const fiche = el('div', 'photo');
      const img = document.createElement('img');
      img.src = p.image;
      img.alt = `Photo du ${dateLisible(p.date)}`;
      fiche.append(img);
      fiche.append(el('div', 'fiche-role', `${p.lieu ? `${p.lieu} · ` : ''}${dateLisible(p.date)}`));
      const ligne = el('div', 'ligne-boutons');
      const telecharger = el('button', 'bouton-action', 'Télécharger');
      telecharger.type = 'button';
      telecharger.addEventListener('click', () => photos.telecharger(i));
      const supprimer = el('button', `bouton-action secondaire${aSupprimer === i ? ' attention' : ''}`, aSupprimer === i ? 'Toucher encore pour supprimer' : 'Supprimer');
      supprimer.type = 'button';
      supprimer.addEventListener('click', () => {
        if (aSupprimer !== i) { aSupprimer = i; dessiner(); return; }
        aSupprimer = -1;
        photos.supprimer(i);
        dessiner();
      });
      ligne.append(telecharger, supprimer);
      fiche.append(ligne);
      grille.append(fiche);
    });
    contenu.append(grille);
  }

  return { ouvrir, fermer, estOuvert: () => ouvert, rafraichir: () => { if (ouvert) dessiner(); } };
}
