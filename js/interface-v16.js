// =============================================================================
// interface-v16.js — les fenêtres de la version 1.6
// -----------------------------------------------------------------------------
//   - le JOURNAL de Cuivrebourg (touche J) ;
//   - la GARDE-ROBE (l'armoire de l'atelier) ;
//   - la VITRINE (sur la place) ;
//   - le petit jeu d'ASSEMBLAGE (pour les objets rares) ;
//   - le TÉLESCOPE (le dessin de la constellation qu'on regarde).
// Ces fenêtres ne décident de rien : elles montrent l'état du jeu, et
// préviennent main.js quand on appuie sur un bouton.
// =============================================================================

import { creerFenetre, el, boutonAction } from './interface-fenetre.js';
import { RECETTES } from './logique-atelier.js';
import { CATEGORIES_TENUE, ORIGINES_TENUE, tenuesDeCategorie } from './logique-garderobe.js';
import { PLACES_VITRINE, decrireObjetVitrine, objetsExposables, attraitVitrine, pourboire } from './logique-vitrine.js';
import { creerAssemblage, contenuCase, basculer, estAssemble, engrenagesEntraines, engrenagesRestants, COLONNES, LIGNES } from './logique-assemblage.js';

const SVG = 'http://www.w3.org/2000/svg';
function svg(balise, attributs = {}) {
  const e = document.createElementNS(SVG, balise);
  for (const [k, v] of Object.entries(attributs)) e.setAttribute(k, String(v));
  return e;
}

// -----------------------------------------------------------------------------
// 1. LE JOURNAL
// -----------------------------------------------------------------------------
export function creerJournal({ obtenirEdition, ...options }) {
  return creerFenetre({
    id: 'panneau-journal',
    titre: 'Le Journal de Cuivrebourg',
    largeur: 620,
    touche: 'j',
    ...options,
    dessiner(contenu) {
      const e = obtenirEdition();
      const journal = el('div', 'journal');
      journal.append(el('div', 'journal-date', e.date));
      for (const a of e.articles) {
        const article = el('article', 'journal-article');
        article.append(el('h3', null, a.titre), el('p', null, a.texte));
        journal.append(article);
      }
      journal.append(el('p', 'petit', 'Un nouveau journal arrive chaque matin, avec Léon.'));
      contenu.append(journal);
    },
  });
}

// -----------------------------------------------------------------------------
// 2. LA GARDE-ROBE
// -----------------------------------------------------------------------------
export function creerGarderobe({ etat, surAction, obtenirApercu, ...options }) {
  return creerFenetre({
    id: 'panneau-garderobe',
    titre: 'La garde-robe',
    largeur: 640,
    onglets: CATEGORIES_TENUE.map((c) => ({ id: c.id, nom: c.nom })),
    ...options,
    dessiner(contenu, categorie) {
      // En haut : Ferrus avec sa tenue du moment, et l'argent.
      const haut = el('div', 'garderobe-haut');
      const image = obtenirApercu();
      if (image) {
        const img = document.createElement('img');
        img.src = image;
        img.alt = 'Ferrus avec sa tenue';
        haut.append(img);
      }
      const texte = el('div');
      texte.append(el('div', 'carte-intro', 'Pour le plaisir des yeux : choisissez la tenue de Ferrus. Certaines s\'achètent, d\'autres sont des cadeaux de vos amis.'));
      texte.append(el('div', 'atelier-argent', `${etat.argent} pièces`));
      haut.append(texte);
      contenu.append(haut);
      for (const t of tenuesDeCategorie(etat, categorie)) {
        const carte = el('div', 'carte-atelier');
        carte.append(el('div', 'carte-titre', t.nom));
        carte.append(el('div', 'carte-detail', t.description));
        if (t.porte) {
          carte.classList.add('installee');
          carte.append(el('div', 'etiquette-installee', 'Vous le portez ✓'));
        } else if (t.possede) {
          carte.append(boutonAction('Porter', true, () => surAction('porter', t.id)));
        } else if (t.origine) {
          carte.classList.add('verrouillee');
          carte.append(el('div', 'carte-raison', `Ne s'achète pas : c'est ${ORIGINES_TENUE[t.origine]}.`));
        } else {
          carte.append(boutonAction(`Acheter (${t.prix} pièces)`, etat.argent >= t.prix, () => surAction('acheter', t.id)));
          if (etat.argent < t.prix) carte.append(el('div', 'carte-raison', `Encore ${t.prix - etat.argent} pièces à gagner.`));
        }
        contenu.append(carte);
      }
    },
  });
}

// -----------------------------------------------------------------------------
// 3. LA VITRINE
// -----------------------------------------------------------------------------
export function creerPanneauVitrine({ etat, surAction, ...options }) {
  let placeChoisie = null; // la place pour laquelle on choisit un objet
  const fenetre = creerFenetre({
    id: 'panneau-vitrine',
    titre: "La vitrine de l'atelier",
    largeur: 640,
    ...options,
    surOuverture: () => { placeChoisie = null; if (options.surOuverture) options.surOuverture(); },
    dessiner(contenu) {
      const attrait = attraitVitrine(etat);
      contenu.append(el('p', 'carte-intro', "Six places pour vos plus belles pièces : vos créations, le portrait d'un poisson, vos curiosités… De temps en temps, un visiteur vient admirer la vitrine et laisse quelques pièces. Plus elle est belle, plus il est généreux !"));
      contenu.append(el('p', 'vitrine-chiffres', attrait > 0
        ? `Beauté de la vitrine : ${attrait} · Un visiteur laisse ${pourboire(etat)} pièces · Visiteurs venus : ${etat.vitrine.visiteurs}`
        : 'La vitrine est vide : aucun visiteur ne viendra tant qu\'elle n\'aura rien à montrer.'));
      if (placeChoisie !== null) {
        dessinerChoix(contenu);
        return;
      }
      const grille = el('div', 'vitrine-grille');
      for (let i = 0; i < PLACES_VITRINE; i++) {
        const code = etat.vitrine.objets[i];
        const d = code ? decrireObjetVitrine(code) : null;
        const carte = el('div', d ? 'carte-atelier' : 'carte-atelier verrouillee');
        carte.append(el('div', 'carte-titre', `${i < 3 ? 'En bas' : 'En haut'}, place ${(i % 3) + 1}`));
        carte.append(el('div', 'carte-detail', d ? d.nom : 'Place libre'));
        if (d) carte.append(boutonAction('Retirer', true, () => surAction('retirer', i)));
        else carte.append(boutonAction('Exposer…', true, () => { placeChoisie = i; fenetre.rafraichir(); }));
        grille.append(carte);
      }
      contenu.append(grille);
    },
  });
  function dessinerChoix(contenu) {
    contenu.append(el('h3', 'album-section', `Que mettre ${placeChoisie < 3 ? 'en bas' : 'en haut'}, à la place ${(placeChoisie % 3) + 1} ?`));
    const liste = objetsExposables(etat);
    if (liste.length === 0) contenu.append(el('p', 'carte-intro', "Rien à exposer pour l'instant : fabriquez des objets à l'établi, pêchez au lac, cueillez dans la forêt… et revenez !"));
    let categorie = null;
    for (const o of liste) {
      if (o.categorie !== categorie) {
        categorie = o.categorie;
        contenu.append(el('h3', 'album-section', categorie));
      }
      const carte = el('div', 'carte-atelier');
      carte.append(el('div', 'carte-titre', o.nom));
      carte.append(el('div', 'carte-detail', `${o.detail} · Beauté : ${o.attrait}`));
      carte.append(boutonAction('Exposer ici', true, () => {
        const place = placeChoisie;
        placeChoisie = null;
        surAction('exposer', place, o.code);
      }));
      contenu.append(carte);
    }
    contenu.append(boutonAction('Annuler', true, () => { placeChoisie = null; fenetre.rafraichir(); }));
  }
  return fenetre;
}

// -----------------------------------------------------------------------------
// 4. LE PETIT JEU D'ASSEMBLAGE
// -----------------------------------------------------------------------------
// Un engrenage dessiné (8 dents), centré en 0.
function dessinEngrenage(rayon, couleur) {
  const g = svg('g');
  const dents = 8;
  let d = '';
  for (let i = 0; i < dents * 2; i++) {
    const a = (i / (dents * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rayon : rayon * 0.78;
    const a1 = a - Math.PI / (dents * 2) * 0.8;
    const a2 = a + Math.PI / (dents * 2) * 0.8;
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(a1) * r).toFixed(2)},${(Math.sin(a1) * r).toFixed(2)} L${(Math.cos(a2) * r).toFixed(2)},${(Math.sin(a2) * r).toFixed(2)} `;
  }
  g.append(svg('path', { d: `${d}Z`, fill: couleur, stroke: '#6b4a2a', 'stroke-width': 1.2 }));
  g.append(svg('circle', { r: rayon * 0.28, fill: '#f3e6cc', stroke: '#6b4a2a', 'stroke-width': 1 }));
  return g;
}

export function creerPanneauAssemblage({ surTerminer, ...options }) {
  let partie = null;
  let termine = false;
  const fenetre = creerFenetre({
    id: 'panneau-assemblage',
    titre: 'Assemblage',
    largeur: 620,
    ...options,
    surFermeture: () => {
      // Fermer sans rien choisir : on ne lance rien (rien n'est perdu).
      if (!termine && partie) surTerminer(partie.objet, null);
      if (options.surFermeture) options.surFermeture();
    },
    dessiner(contenu) {
      if (!partie) return;
      const reussi = estAssemble(partie);
      contenu.append(el('p', 'carte-intro', "Touchez les trous pour y poser des engrenages, et reliez le MOTEUR (à gauche) à l'AIGUILLE (à droite). Deux engrenages côte à côte s'entraînent. Prenez votre temps : il n'y a pas de chronomètre, et on peut retirer un engrenage en le touchant."));
      const sens = engrenagesEntraines(partie);
      const grille = el('div', 'assemblage-grille');
      grille.style.gridTemplateColumns = `repeat(${COLONNES}, 1fr)`;
      for (let y = 0; y < LIGNES; y++) {
        for (let x = 0; x < COLONNES; x++) {
          const contenuCase_ = contenuCase(partie, x, y);
          const b = el('button', `case-assemblage ${contenuCase_}`);
          b.type = 'button';
          b.dataset.cle = `case-${x}-${y}`;
          const dessin = svg('svg', { viewBox: '-30 -30 60 60', 'aria-hidden': 'true' });
          if (contenuCase_ === 'vide') dessin.append(svg('circle', { r: 6, fill: '#c9b48e', stroke: '#9a7652', 'stroke-width': 2 }));
          if (contenuCase_ === 'bloque') dessin.append(svg('circle', { r: 11, fill: '#8a7f74', stroke: '#5e5650', 'stroke-width': 3 }));
          if (contenuCase_ === 'moteur' || contenuCase_ === 'aiguille' || contenuCase_ === 'engrenage') {
            const couleur = contenuCase_ === 'moteur' ? '#b87333' : contenuCase_ === 'aiguille' ? '#86a597' : '#c99a4a';
            const roue = dessinEngrenage(24, couleur);
            const k = `${x},${y}`;
            // Ce qui est entraîné tourne doucement (le moteur aussi, et l'aiguille quand c'est réussi).
            // Deux engrenages qui se touchent tournent en sens contraire : le
            // moteur tourne dans un sens (+1), ses voisins dans l'autre (-1)…
            let sensRoue = null;
            if (contenuCase_ === 'moteur') sensRoue = 1;
            else if (sens.has(k)) sensRoue = sens.get(k);
            else if (contenuCase_ === 'aiguille' && reussi) {
              const voisin = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => sens.get(`${x + dx},${y + dy}`)).find((s) => s !== undefined);
              sensRoue = -(voisin || 1);
            }
            if (sensRoue !== null) {
              roue.classList.add('tourne');
              if (sensRoue < 0) roue.classList.add('inverse');
            }
            dessin.append(roue);
          }
          b.append(dessin);
          const noms = { moteur: 'Le moteur', aiguille: "L'aiguille", bloque: 'Un rivet', engrenage: 'Un engrenage (toucher pour le retirer)', vide: 'Un trou libre' };
          b.setAttribute('aria-label', `${noms[contenuCase_]}, colonne ${x + 1}, ligne ${y + 1}`);
          b.disabled = contenuCase_ === 'moteur' || contenuCase_ === 'aiguille' || contenuCase_ === 'bloque';
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            if (basculer(partie, x, y)) {
              fenetre.rafraichir();
              const meme = document.querySelector(`[data-cle="case-${x}-${y}"]`);
              if (meme) meme.focus({ preventScroll: true });
            }
          });
          grille.append(b);
        }
      }
      contenu.append(grille);
      contenu.append(el('p', 'assemblage-etat', reussi
        ? 'Tout tourne ! Bel ouvrage : la fabrication ira deux fois plus vite.'
        : `Engrenages en main : ${engrenagesRestants(partie)}`));
      const ligne = el('div', 'ligne-boutons');
      if (reussi) ligne.append(boutonAction('Lancer la fabrication (deux fois plus vite)', true, () => terminer(true)));
      ligne.append(boutonAction('Laisser la machine assembler (vitesse normale)', true, () => terminer(false), 'bouton-action secondaire'));
      contenu.append(ligne);
    },
  });
  function terminer(assemble) {
    termine = true;
    const objet = partie.objet;
    fenetre.fermer();
    surTerminer(objet, assemble);
  }
  return {
    ...fenetre,
    // Ouvre le petit jeu pour un objet. « numero » change la planche.
    ouvrirPour(objet, numero) {
      partie = creerAssemblage(objet, numero);
      termine = false;
      fenetre.changerTitre(`Assembler : ${RECETTES[objet].nom.toLowerCase()}`);
      fenetre.ouvrir();
    },
  };
}

// -----------------------------------------------------------------------------
// 5. LES ÉTOILES (le télescope, et la page de l'album)
// -----------------------------------------------------------------------------
// Le dessin d'une constellation : un petit ciel bleu nuit, les étoiles et leurs traits.
export function dessinerConstellation(c, connue = true) {
  const dessin = svg('svg', { viewBox: '0 0 100 70', class: 'constellation', role: 'img', 'aria-label': connue ? `La constellation : ${c.nom}` : 'Une constellation inconnue' });
  const defs = svg('defs');
  const degrade = svg('radialGradient', { id: `ciel-${c.id}`, cx: '50%', cy: '40%', r: '75%' });
  degrade.append(svg('stop', { offset: '0%', 'stop-color': '#3d4a6a' }), svg('stop', { offset: '100%', 'stop-color': '#232b42' }));
  defs.append(degrade);
  dessin.append(defs);
  dessin.append(svg('rect', { x: 0, y: 0, width: 100, height: 70, rx: 4, fill: `url(#ciel-${c.id})` }));
  // Quelques petites étoiles lointaines, toujours les mêmes.
  let g = c.id.length * 977;
  for (let i = 0; i < 18; i++) {
    g = (g * 16807) % 2147483647;
    const x = (g % 1000) / 10;
    g = (g * 16807) % 2147483647;
    const y = (g % 700) / 10;
    dessin.append(svg('circle', { cx: x, cy: y, r: 0.45, fill: '#c8cfe6', opacity: 0.6 }));
  }
  if (connue) {
    for (const [i, j] of c.traits) {
      const [x1, y1] = c.etoiles[i];
      const [x2, y2] = c.etoiles[j];
      dessin.append(svg('line', { x1, y1, x2, y2, stroke: '#e8d7a8', 'stroke-width': 0.6, opacity: 0.7 }));
    }
  }
  for (const [x, y] of c.etoiles) {
    dessin.append(svg('circle', { cx: x, cy: y, r: 3.2, fill: '#ffe9b0', opacity: connue ? 0.18 : 0.08 }));
    dessin.append(svg('circle', { cx: x, cy: y, r: 1.4, fill: connue ? '#fff4d6' : '#9aa3c0' }));
  }
  return dessin;
}

export function creerPanneauCiel(options) {
  let vue = null; // { constellation, nouvelle }
  const fenetre = creerFenetre({
    id: 'panneau-ciel',
    titre: 'Le télescope',
    largeur: 560,
    ...options,
    dessiner(contenu) {
      if (!vue) return;
      const c = vue.constellation;
      contenu.append(dessinerConstellation(c, true));
      contenu.append(el('h3', 'album-section', c.nom));
      contenu.append(el('p', 'carte-detail', c.texte));
      if (vue.nouvelle) contenu.append(el('p', 'carte-intro', 'Nouvelle constellation ! Elle est notée dans votre album (page « Étoiles »).'));
    },
  });
  return { ...fenetre, montrer(constellation, nouvelle) { vue = { constellation, nouvelle }; fenetre.ouvrir(); } };
}
