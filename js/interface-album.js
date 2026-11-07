// =============================================================================
// interface-album.js — l'album de souvenirs (version 1.5)
// -----------------------------------------------------------------------------
// On l'ouvre avec le bouton « livre » en haut de l'écran (ou la touche L).
// Le jeu est en pause pendant qu'il est ouvert. Trois onglets :
//   - Habitants : le portrait des habitants rencontrés (et des compagnons) ;
//   - Souvenirs : les quêtes terminées, les fêtes, et quelques chiffres ;
//   - Pêche : les espèces du lac déjà attrapées.
// Ce que l'on montre est décidé par logique-album.js ; les portraits sont
// dessinés par main.js (qui a la 3D) et donnés par « obtenirPortrait ».
// =============================================================================

import { habitantsAlbum, souvenirsAlbum, chiffresAlbum, pecheAlbum } from './logique-album.js';
import { ESPECES } from './logique-peche.js';

const $ = (id) => document.getElementById(id);
function el(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

export function creerPanneauAlbum({ etat, obtenirPortrait, surOuverture, surFermeture, estDisponible }) {
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

  return { ouvrir, fermer, estOuvert: () => ouvert };
}
