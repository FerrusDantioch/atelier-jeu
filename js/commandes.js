// =============================================================================
// commandes.js — le clavier (PC) et les commandes tactiles (téléphone)
// -----------------------------------------------------------------------------
// Ce fichier « écoute » le joueur et donne au jeu :
//   - une direction de déplacement (x, z), chacune entre -1 et 1 ;
//   - un signal quand on veut interagir (E, Espace, ou le bouton « Interagir ») ;
//   - un signal pour changer de choix dans un dialogue (flèches, Z Q S D).
//
// Clavier : on utilise la LETTRE tapée (« e.key »). Ainsi Z Q S D marche sur un
// clavier français (AZERTY), et W A S D marche aussi sur un clavier anglais.
// =============================================================================

// Les touches de déplacement : pour chaque touche, la direction associée.
const TOUCHES_DIRECTION = {
  arrowup: [0, -1], z: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], q: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
};
const TOUCHES_INTERACTION = new Set(['e', ' ', 'enter']);

export function creerCommandes({ surInteraction, surNavigation, estActif }) {
  const touchesEnfoncees = new Set();
  const joystick = { x: 0, z: 0, doigt: null };

  // --- Clavier -----------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    const touche = e.key.toLowerCase();
    if (!estActif()) return;

    if (touche in TOUCHES_DIRECTION) {
      touchesEnfoncees.add(touche);
      e.preventDefault(); // empêche les flèches de faire défiler la page
      if (!e.repeat) {
        const [x, z] = TOUCHES_DIRECTION[touche];
        surNavigation(x + z); // -1 = précédent, +1 = suivant (pour les choix)
      }
    } else if (TOUCHES_INTERACTION.has(touche)) {
      e.preventDefault(); // empêche Espace de faire défiler la page
      if (!e.repeat) surInteraction(); // garder E appuyé ne répète pas l'action
    }
  });
  window.addEventListener('keyup', (e) => touchesEnfoncees.delete(e.key.toLowerCase()));
  // Si la fenêtre perd le focus, on « relâche » tout (sinon Ferrus continuerait seul).
  window.addEventListener('blur', () => touchesEnfoncees.clear());

  // --- Détection d'un écran tactile -------------------------------------------------
  const body = document.body;
  if (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) {
    body.classList.add('tactile');
  }
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') body.classList.add('tactile');
  });

  // --- Joystick tactile ---------------------------------------------------------------
  const zone = document.getElementById('joystick');
  const bouton = document.getElementById('joystick-bouton');

  function placerJoystick(e) {
    const r = zone.getBoundingClientRect();
    const rayonMax = r.width / 2 - 18;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > rayonMax) {
      dx = (dx / distance) * rayonMax;
      dy = (dy / distance) * rayonMax;
    }
    bouton.style.transform = `translate(${dx}px, ${dy}px)`;
    // Une petite « zone morte » au centre : un doigt posé sans bouger ne fait rien.
    const force = Math.min(1, distance / rayonMax);
    if (force < 0.15) {
      joystick.x = 0;
      joystick.z = 0;
    } else {
      joystick.x = dx / rayonMax;
      joystick.z = dy / rayonMax; // vers le bas de l'écran = vers le sud (+z)
    }
  }
  function relacherJoystick() {
    joystick.doigt = null;
    joystick.x = 0;
    joystick.z = 0;
    bouton.style.transform = '';
  }

  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joystick.doigt = e.pointerId;
    // On « capture » ce doigt : on le suit même s'il sort du cercle.
    try { zone.setPointerCapture(e.pointerId); } catch { /* sans gravité */ }
    placerJoystick(e);
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId === joystick.doigt) placerJoystick(e);
  });
  zone.addEventListener('pointerup', relacherJoystick);
  zone.addEventListener('pointercancel', relacherJoystick);
  zone.addEventListener('lostpointercapture', relacherJoystick);

  // --- Bouton « Interagir » -------------------------------------------------------------
  const boutonInteragir = document.getElementById('bouton-interagir');
  boutonInteragir.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    boutonInteragir.classList.add('appuye');
    if (estActif()) surInteraction();
  });
  const relacherBouton = () => boutonInteragir.classList.remove('appuye');
  boutonInteragir.addEventListener('pointerup', relacherBouton);
  boutonInteragir.addEventListener('pointercancel', relacherBouton);
  boutonInteragir.addEventListener('pointerleave', relacherBouton);

  // --- Empêcher le téléphone de zoomer ou de faire défiler la page ------------------------
  const dansUnEcran = (cible) => cible instanceof Element && cible.closest('.ecran');
  document.addEventListener('touchmove', (e) => {
    if (!dansUnEcran(e.target)) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault()); // pincer pour zoomer (iPhone)
  document.addEventListener('dblclick', (e) => e.preventDefault());     // double-toucher pour zoomer
  document.addEventListener('contextmenu', (e) => e.preventDefault());  // menu de l'appui long

  // --- Ce que le jeu demande à chaque image ----------------------------------------------
  return {
    // La direction voulue : on additionne clavier et joystick.
    direction() {
      let x = joystick.x;
      let z = joystick.z;
      for (const touche of touchesEnfoncees) {
        const [dx, dz] = TOUCHES_DIRECTION[touche];
        x += dx;
        z += dz;
      }
      return { x: Math.max(-1, Math.min(1, x)), z: Math.max(-1, Math.min(1, z)) };
    },
    // Remet tout à zéro (par exemple à l'ouverture d'un dialogue).
    relacherTout() {
      touchesEnfoncees.clear();
      relacherJoystick();
    },
  };
}
