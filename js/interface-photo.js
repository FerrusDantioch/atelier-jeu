// =============================================================================
// interface-photo.js — les commandes du mode photo (version 1.6)
// -----------------------------------------------------------------------------
// En mode photo, l'interface du jeu disparaît ; il ne reste qu'une petite
// barre en bas : « − », « + » (s'approcher, s'éloigner), « Prendre la photo »
// et « Quitter ».
//   - à la souris ou au doigt : on fait glisser pour tourner autour de Ferrus ;
//   - la molette de la souris rapproche ou éloigne ;
//   - au clavier : les flèches (ou Z Q S D) tournent, + et − rapprochent,
//     Entrée ou Espace prend la photo, Échap (ou P) quitte.
// Ce fichier ne fait que lire les gestes : main.js bouge la caméra (avec les
// calculs de logique-photo.js) et prend la photo.
// =============================================================================

import { el } from './interface-fenetre.js';

const TOUCHES = {
  arrowleft: [-1, 0, 0], q: [-1, 0, 0], a: [-1, 0, 0],
  arrowright: [1, 0, 0], d: [1, 0, 0],
  arrowup: [0, 1, 0], z: [0, 1, 0], w: [0, 1, 0],
  arrowdown: [0, -1, 0], s: [0, -1, 0],
  '+': [0, 0, -1], '=': [0, 0, -1],
  '-': [0, 0, 1], _: [0, 0, 1],
};

export function creerModePhoto({ surTourner, surZoom, surPhoto, surQuitter, surTelecharger }) {
  const barre = el('div', 'panneau barre-photo');
  barre.hidden = true;
  barre.setAttribute('role', 'toolbar');
  barre.setAttribute('aria-label', 'Mode photo');
  const aide = el('div', 'photo-aide', 'Faites glisser pour tourner autour de Ferrus');
  const boutons = el('div', 'photo-boutons');
  const bouton = (texte, titre, action, classe = '') => {
    const b = el('button', `photo-bouton ${classe}`, texte);
    b.type = 'button';
    b.title = titre;
    b.setAttribute('aria-label', titre);
    b.addEventListener('click', (e) => { e.stopPropagation(); action(); });
    boutons.append(b);
    return b;
  };
  bouton('−', 'Reculer', () => surZoom(2.5));
  bouton('+', "S'approcher", () => surZoom(-2.5));
  const declencheur = bouton('Prendre la photo', 'Prendre la photo (Entrée)', () => surPhoto(), 'principal');
  bouton('Quitter', 'Quitter le mode photo (Échap)', () => surQuitter());
  barre.append(aide, boutons);
  // La petite vignette qui apparaît après une photo.
  const vignette = el('div', 'panneau photo-vignette');
  vignette.hidden = true;
  document.body.append(barre, vignette);

  let actif = false;
  const enfoncees = new Set();
  let glisse = null; // { id, x, y }
  const zone = document.getElementById('scene');

  zone.addEventListener('pointerdown', (e) => {
    if (!actif) return;
    glisse = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try { zone.setPointerCapture(e.pointerId); } catch { /* sans gravité */ }
  });
  zone.addEventListener('pointermove', (e) => {
    if (!actif || !glisse || e.pointerId !== glisse.id) return;
    surTourner(-(e.clientX - glisse.x) * 0.008, (e.clientY - glisse.y) * 0.006);
    glisse.x = e.clientX;
    glisse.y = e.clientY;
  });
  const fin = (e) => { if (glisse && e.pointerId === glisse.id) glisse = null; };
  zone.addEventListener('pointerup', fin);
  zone.addEventListener('pointercancel', fin);
  zone.addEventListener('wheel', (e) => {
    if (!actif) return;
    e.preventDefault();
    surZoom(Math.sign(e.deltaY) * 1.2);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (!actif) return;
    const t = e.key.toLowerCase();
    if (t === 'escape' || t === 'p') {
      e.preventDefault();
      surQuitter();
    } else if ((t === 'enter' || t === ' ') && !e.repeat) {
      e.preventDefault();
      surPhoto();
    } else if (TOUCHES[t]) {
      e.preventDefault();
      enfoncees.add(t);
    }
  }, true);
  window.addEventListener('keyup', (e) => enfoncees.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => enfoncees.clear());

  return {
    activer() {
      actif = true;
      barre.hidden = false;
      document.body.classList.add('mode-photo');
      declencheur.focus({ preventScroll: true });
    },
    desactiver() {
      actif = false;
      glisse = null;
      enfoncees.clear();
      barre.hidden = true;
      vignette.hidden = true;
      document.body.classList.remove('mode-photo');
      if (document.activeElement) document.activeElement.blur();
    },
    estActif: () => actif,
    // Le mouvement demandé au clavier : { angle, hauteur, distance } (par seconde).
    mouvementClavier() {
      let angle = 0;
      let hauteur = 0;
      let distance = 0;
      for (const t of enfoncees) {
        const [a, h, d] = TOUCHES[t];
        angle += a;
        hauteur += h;
        distance += d;
      }
      return { angle: angle * 1.2, hauteur: hauteur * 0.6, distance: distance * 8 };
    },
    // Montre la photo qu'on vient de prendre, avec un bouton « Télécharger ».
    montrerVignette(image) {
      vignette.innerHTML = '';
      const img = document.createElement('img');
      img.src = image;
      img.alt = 'La photo que vous venez de prendre';
      const texte = el('div', 'photo-vignette-texte', "Photo rangée dans l'album !");
      const telecharger = el('button', 'bouton-action', 'Télécharger');
      telecharger.type = 'button';
      telecharger.addEventListener('click', (e) => { e.stopPropagation(); surTelecharger(); });
      vignette.append(img, texte, telecharger);
      vignette.hidden = false;
      clearTimeout(vignette.minuteur);
      vignette.minuteur = setTimeout(() => { vignette.hidden = true; }, 6000);
    },
  };
}
