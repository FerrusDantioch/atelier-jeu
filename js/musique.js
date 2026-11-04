// =============================================================================
// musique.js — faire sonner la musique et les petits sons (étape 4)
// -----------------------------------------------------------------------------
// On utilise « Web Audio », le synthétiseur intégré aux navigateurs : chaque
// note est fabriquée par un petit « oscillateur » (une onde douce), dont le
// volume monte et descend lentement (pas de note qui claque).
// Les notes à jouer sont choisies par logique-musique.js.
//
// Confort :
//   - tout est COUPÉ au départ (c'est le joueur qui active, dans les options) ;
//   - la musique arrive en fondu lent (4 secondes) et part en fondu ;
//   - un filtre adoucit les aigus, un « limiteur » empêche tout son trop fort ;
//   - quand on quitte le jeu (autre application, écran éteint), tout se tait.
//
// Les navigateurs n'autorisent le son qu'après un geste du joueur (toucher,
// clic, touche du clavier) : on attend donc ce premier geste pour démarrer.
// =============================================================================

import {
  AMBIANCES,
  SONS,
  composerMesure,
  creerEtatMelodie,
  creerHasard,
  dureeMesure,
  frequence,
} from './logique-musique.js';
import { volumeReel } from './logique-reglages.js';

// Le volume de chaque voix (avant le réglage du joueur). Volontairement bas.
const VOLUME_VOIX = { nappe: 0.045, basse: 0.1, melodie: 0.075 };
const VOLUME_SONS = 0.16;
const FONDU_ENTREE = 4;   // secondes
const FONDU_SORTIE = 1.2; // secondes

export function creerAudio() {
  let ctx = null;
  let busMusique = null;
  let busSons = null;
  let reverbe = null;

  let musiqueActive = false;
  let sonsActifs = false;
  let niveauMusique = 3;
  let niveauSons = 3;

  let ambiance = 'place';
  let numeroMesure = 0;
  let prochaineMesure = 0;
  const hasard = creerHasard(Date.now() % 100000);
  const etatMelodie = creerEtatMelodie();
  let minuteur = null;
  let arretPrevu = null;

  // --- Préparer le synthétiseur (au premier geste du joueur) -------------------
  function preparer() {
    if (ctx) {
      if (ctx.state === 'suspended' && (musiqueActive || sonsActifs) && document.visibilityState === 'visible') {
        ctx.resume().catch(() => {});
      }
      return true;
    }
    if (!musiqueActive && !sonsActifs) return false; // rien à jouer : on ne crée rien
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!Contexte) return false;
    try {
      ctx = new Contexte();
    } catch {
      ctx = null;
      return false;
    }
    // Le chemin du son : voix → (écho léger) → filtre doux → limiteur → haut-parleur.
    const limiteur = ctx.createDynamicsCompressor();
    limiteur.threshold.value = -20;
    limiteur.knee.value = 12;
    limiteur.ratio.value = 6;
    limiteur.attack.value = 0.01;
    limiteur.release.value = 0.3;
    limiteur.connect(ctx.destination);

    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 2600;
    filtre.Q.value = 0.4;
    filtre.connect(limiteur);

    // Un petit écho de salle (« réverbération »), fabriqué avec un bruit qui s'éteint.
    reverbe = ctx.createConvolver();
    reverbe.buffer = creerEcho(ctx, 2.4);
    const retourEcho = ctx.createGain();
    retourEcho.gain.value = 0.28;
    reverbe.connect(retourEcho).connect(filtre);

    busMusique = ctx.createGain();
    busMusique.gain.value = 0;
    busMusique.connect(filtre);
    busMusique.connect(reverbe);

    busSons = ctx.createGain();
    busSons.gain.value = volumeReel(niveauSons);
    busSons.connect(filtre);
    busSons.connect(reverbe);

    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (musiqueActive) demarrerMusique();
    return true;
  }

  // Les gestes du joueur qui débloquent le son.
  const surGeste = () => preparer();
  window.addEventListener('pointerdown', surGeste, true);
  window.addEventListener('keydown', surGeste, true);

  // Quand le jeu passe en arrière-plan, tout se tait (et la batterie se repose).
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') {
      ctx.suspend().catch(() => {});
    } else if (musiqueActive || sonsActifs) {
      ctx.resume().catch(() => {});
    }
  });

  // --- La musique -----------------------------------------------------------------
  function demarrerMusique() {
    if (!ctx) return;
    if (arretPrevu) {
      clearTimeout(arretPrevu);
      arretPrevu = null;
    }
    const maintenant = ctx.currentTime;
    rampe(busMusique.gain, volumeReel(niveauMusique), FONDU_ENTREE);
    if (!minuteur) {
      prochaineMesure = maintenant + 0.15;
      minuteur = setInterval(planifier, 150);
    }
  }

  function arreterMusique() {
    if (!ctx || !minuteur) return;
    rampe(busMusique.gain, 0, FONDU_SORTIE);
    // Une fois le fondu fini, on arrête de composer.
    arretPrevu = setTimeout(() => {
      clearInterval(minuteur);
      minuteur = null;
      arretPrevu = null;
      if (!sonsActifs && ctx) ctx.suspend().catch(() => {});
    }, FONDU_SORTIE * 1000 + 200);
  }

  // Toutes les 150 ms, on prépare les mesures qui vont commencer bientôt.
  function planifier() {
    if (!ctx || ctx.state !== 'running') return;
    // Au retour d'une pause, on ne rattrape pas le retard (pas de rafale de notes).
    if (prochaineMesure < ctx.currentTime - 0.05) prochaineMesure = ctx.currentTime + 0.1;
    while (prochaineMesure < ctx.currentTime + 0.8) {
      const a = AMBIANCES[ambiance];
      const dureeTemps = 60 / a.tempo;
      for (const note of composerMesure(a, numeroMesure, hasard, etatMelodie)) {
        jouerNote(note, prochaineMesure + note.temps * dureeTemps, note.duree * dureeTemps);
      }
      prochaineMesure += dureeMesure(a);
      numeroMesure += 1;
    }
  }

  // Fait sonner une note de musique.
  function jouerNote(note, debut, duree) {
    const volume = VOLUME_VOIX[note.voix] * note.force;
    const f = frequence(note.midi);
    if (note.voix === 'nappe') {
      // Deux ondes très légèrement désaccordées : un son chaud, comme un harmonium.
      const enveloppe = ctx.createGain();
      enveloppe.gain.setValueAtTime(0, debut);
      enveloppe.gain.linearRampToValueAtTime(volume, debut + 1.2);
      enveloppe.gain.setValueAtTime(volume, debut + duree);
      enveloppe.gain.linearRampToValueAtTime(0, debut + duree + 1.2);
      enveloppe.connect(busMusique);
      for (const desaccord of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = desaccord;
        o.connect(enveloppe);
        o.start(debut);
        o.stop(debut + duree + 1.3);
      }
    } else if (note.voix === 'basse') {
      const enveloppe = ctx.createGain();
      enveloppe.gain.setValueAtTime(0, debut);
      enveloppe.gain.linearRampToValueAtTime(volume, debut + 0.12);
      enveloppe.gain.setTargetAtTime(0, debut + 0.3, duree / 2.5);
      enveloppe.connect(busMusique);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(enveloppe);
      o.start(debut);
      o.stop(debut + duree + 1.5);
    } else {
      // La mélodie : une petite boîte à musique (une onde pure + son octave, plus faible).
      clochette(busMusique, f, debut, volume, Math.max(0.9, duree * 1.4));
    }
  }

  // --- Les petits sons --------------------------------------------------------------
  function jouerSon(nom) {
    if (!sonsActifs || !ctx || ctx.state !== 'running' || !SONS[nom]) return;
    const debut = ctx.currentTime + 0.02;
    for (const n of SONS[nom]) {
      clochette(busSons, frequence(n.midi), debut + n.temps, VOLUME_SONS * n.force, n.duree);
    }
  }

  // Une note de clochette douce : elle monte vite (sans claquer) puis s'éteint lentement.
  function clochette(sortie, f, debut, volume, duree) {
    const enveloppe = ctx.createGain();
    enveloppe.gain.setValueAtTime(0, debut);
    enveloppe.gain.linearRampToValueAtTime(volume, debut + 0.025);
    enveloppe.gain.setTargetAtTime(0, debut + 0.05, duree / 3);
    enveloppe.connect(sortie);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(enveloppe);
    const harmonique = ctx.createOscillator();
    harmonique.type = 'sine';
    harmonique.frequency.value = f * 2;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    harmonique.connect(g).connect(enveloppe);
    for (const osc of [o, harmonique]) {
      osc.start(debut);
      osc.stop(debut + duree + 1.5);
    }
  }

  // Fait glisser un volume vers une valeur, en douceur.
  function rampe(parametre, cible, duree) {
    const maintenant = ctx.currentTime;
    parametre.cancelScheduledValues(maintenant);
    parametre.setValueAtTime(parametre.value, maintenant);
    parametre.linearRampToValueAtTime(cible, maintenant + duree);
  }

  // --- Ce que le jeu peut demander ----------------------------------------------------
  return {
    // Applique les réglages (musique, sons, volumes).
    regler(reglages) {
      niveauMusique = reglages.volumeMusique;
      niveauSons = reglages.volumeSons;
      const musiqueAvant = musiqueActive;
      musiqueActive = reglages.musique;
      sonsActifs = reglages.sons;
      if (!ctx) {
        // Pas encore de synthétiseur : il sera créé au prochain geste du joueur.
        return;
      }
      if (musiqueActive || sonsActifs) preparer();
      rampe(busSons.gain, volumeReel(niveauSons), 0.3);
      if (musiqueActive && !musiqueAvant) demarrerMusique();
      else if (!musiqueActive && musiqueAvant) arreterMusique();
      else if (musiqueActive) rampe(busMusique.gain, volumeReel(niveauMusique), 0.6);
      if (!musiqueActive && !sonsActifs && !minuteur) ctx.suspend().catch(() => {});
    },
    // À appeler pendant un geste du joueur (un clic sur un bouton, par exemple).
    preparer,
    // Change l'ambiance (à la mesure suivante).
    changerAmbiance(zone) {
      if (AMBIANCES[zone]) ambiance = zone;
    },
    jouerSon,
    // Pour les vérifications : l'état du synthétiseur.
    etat: () => (ctx ? ctx.state : 'absent'),
  };
}

// Fabrique l'« écho de salle » : un bruit doux qui s'éteint en quelques secondes.
function creerEcho(ctx, duree) {
  const taille = Math.floor(ctx.sampleRate * duree);
  const tampon = ctx.createBuffer(2, taille, ctx.sampleRate);
  const hasard = creerHasard(7);
  for (let canal = 0; canal < 2; canal++) {
    const donnees = tampon.getChannelData(canal);
    for (let i = 0; i < taille; i++) {
      donnees[i] = (hasard() * 2 - 1) * (1 - i / taille) ** 3;
    }
  }
  return tampon;
}
