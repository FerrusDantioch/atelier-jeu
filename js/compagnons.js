// =============================================================================
// compagnons.js — Rouille le chat et Cliquet l'oiseau mécanique, en 3D
// (version 1.5)
// -----------------------------------------------------------------------------
// Les règles (adopter, la trace des pas de Ferrus) sont dans
// logique-compagnons.js. Ici, on dessine les deux compagnons et on les anime :
//   - ROUILLE marche dans les pas de Ferrus, un peu en arrière ; quand Ferrus
//     s'arrête, il s'assoit et le regarde, en balançant doucement la queue ;
//   - CLIQUET vole derrière Ferrus en battant des ailes ; quand Ferrus
//     s'arrête, il se pose sur son épaule.
// Tout est lent et doux. Si le système demande moins d'animations, ils se
// déplacent quand même (pour suivre Ferrus), mais sans battre des ailes ni
// remuer la queue.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS } from './decor.js';
import { boule, gelule, boite, cylindre } from './formes.js';
import { MATIERE_LUEUR } from './vie.js';
import { pointDerriere } from './logique-compagnons.js';

const ROUX = '#c9773d';
const ROUX_FONCE = '#a85e2c';
const CREME = '#ecd2ac';

// -----------------------------------------------------------------------------
// Le chat
// -----------------------------------------------------------------------------
export function creerChat() {
  const chat = new THREE.Group();
  const corps = new THREE.Group(); // ce qui se redresse quand il s'assoit
  corps.position.set(0, 0.16, -0.12); // le pivot est à l'arrière (les hanches)
  chat.add(corps);
  const tronc = objet(gelule(0.105, 0.24, 12), ROUX, 0, 0.04, 0.14, { ombre: true });
  tronc.rotation.x = Math.PI / 2;
  corps.add(tronc);
  const ventre = objet(gelule(0.08, 0.18, 10), CREME, 0, 0.0, 0.15);
  ventre.rotation.x = Math.PI / 2;
  corps.add(ventre);
  // La tête, les oreilles, le museau, les yeux.
  const tete = new THREE.Group();
  tete.position.set(0, 0.13, 0.33);
  corps.add(tete);
  tete.add(objet(boule(0.1, 2), ROUX, 0, 0, 0, { ombre: true }));
  tete.add(objet(boule(0.05, 1), CREME, 0, -0.035, 0.07));
  for (const cote of [-1, 1]) {
    const oreille = objet(new THREE.ConeGeometry(0.04, 0.08, 8), ROUX_FONCE, cote * 0.055, 0.09, -0.01);
    oreille.rotation.z = -cote * 0.25;
    tete.add(oreille);
    tete.add(objet(boule(0.016, 1), '#2a2420', cote * 0.04, 0.015, 0.085));
  }
  tete.add(objet(boule(0.013, 1), '#b5655a', 0, -0.015, 0.115)); // le petit nez
  // Les pattes (les deux de devant suivent le corps, celles de derrière restent au sol).
  const pattes = [];
  for (const [x, z, devant] of [[-0.06, 0.24, true], [0.06, 0.24, true], [-0.065, -0.02, false], [0.065, -0.02, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, devant ? 0.16 : 0.13, z - 0.12);
    pivot.add(objet(gelule(0.03, 0.1, 8), ROUX, 0, -0.07, 0));
    (devant ? corps : chat).add(pivot);
    if (devant) pivot.position.set(x, -0.0, z);
    pivot.userData.devant = devant;
    pattes.push(pivot);
  }
  // La queue : trois morceaux qui ondulent.
  const queue = new THREE.Group();
  queue.position.set(0, 0.06, -0.06);
  corps.add(queue);
  let parent = queue;
  const morceaux = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Group();
    m.position.y = i === 0 ? 0 : 0.09;
    m.add(objet(gelule(0.025, 0.07, 8), i === 2 ? ROUX_FONCE : ROUX, 0, 0.045, 0));
    parent.add(m);
    morceaux.push(m);
    parent = m;
  }
  queue.rotation.x = -0.9;
  chat.userData = { corps, tete, pattes, morceaux, phase: 0, assis: 0, repos: 0 };
  return chat;
}

// Anime le chat : « vitesse » en m/s ; il s'assoit quand il ne bouge plus.
export function animerChat(chat, vitesse, dt, t, calme = false) {
  const d = chat.userData;
  const marche = vitesse > 0.2;
  d.repos = marche ? 0 : d.repos + dt;
  const cibleAssis = d.repos > 0.6 ? 1 : 0;
  d.assis += (cibleAssis - d.assis) * Math.min(1, dt * 4);
  if (marche) d.phase += dt * vitesse * 9;
  const a = marche ? Math.min(1, vitesse / 3) : 0;
  for (const [i, p] of d.pattes.entries()) {
    p.rotation.x = Math.sin(d.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * a;
  }
  // Assis : le corps se redresse (pivot aux hanches), les pattes de devant restent droites.
  d.corps.rotation.x = -0.75 * d.assis;
  for (const p of d.pattes) if (p.userData.devant) p.rotation.x += 0.75 * d.assis;
  d.tete.rotation.x = 0.55 * d.assis;
  d.corps.position.y = 0.16 + Math.abs(Math.sin(d.phase)) * 0.015 * a;
  // La queue ondule lentement (immobile si le système demande moins d'animations).
  const onde = calme ? 0 : 1;
  d.morceaux.forEach((m, i) => { m.rotation.z = Math.sin(t * 1.3 - i * 0.7) * 0.25 * onde; m.rotation.x = 0.25 + 0.15 * d.assis; });
}

// -----------------------------------------------------------------------------
// L'oiseau mécanique
// -----------------------------------------------------------------------------
export function creerOiseau() {
  const oiseau = new THREE.Group();
  const corps = objet(boule(0.075, 2), COULEURS.cuivre, 0, 0, 0, { ombre: true });
  corps.scale.set(0.95, 0.85, 1.35);
  oiseau.add(corps);
  oiseau.add(objet(boule(0.05, 2), COULEURS.cuivre, 0, 0.055, 0.08));
  const bec = objet(new THREE.ConeGeometry(0.018, 0.05, 8), COULEURS.laiton, 0, 0.05, 0.14);
  bec.rotation.x = Math.PI / 2;
  oiseau.add(bec);
  for (const cote of [-1, 1]) oiseau.add(objet(boule(0.012, 1), MATIERE_LUEUR, cote * 0.03, 0.068, 0.115));
  // La queue en éventail, et la petite clé de remontage sur le dos.
  const queue = objet(boite(0.07, 0.012, 0.09, 0.005), COULEURS.laiton, 0, 0.01, -0.12);
  queue.rotation.x = 0.35;
  oiseau.add(queue);
  const cle = new THREE.Group();
  cle.position.set(0, 0.07, -0.02);
  cle.add(objet(cylindre(0.006, 0.006, 0.04), COULEURS.laiton, 0, 0.0, 0));
  cle.add(objet(boite(0.05, 0.03, 0.008, 0.004), COULEURS.laiton, 0, 0.03, 0));
  oiseau.add(cle);
  // Les ailes, articulées à l'épaule.
  const ailes = [];
  for (const cote of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(cote * 0.06, 0.02, 0.0);
    const aile = objet(boite(0.15, 0.012, 0.09, 0.005), COULEURS.laiton, cote * 0.075, 0, -0.01);
    pivot.add(aile);
    oiseau.add(pivot);
    ailes.push({ pivot, cote });
  }
  oiseau.userData = { ailes, cle, vol: 1, phase: 0 };
  return oiseau;
}

// « vol » : 1 en vol (les ailes battent), 0 posé (ailes repliées).
export function animerOiseau(oiseau, vol, dt, t, calme = false) {
  const d = oiseau.userData;
  d.vol += (vol - d.vol) * Math.min(1, dt * 5);
  d.phase += dt * 9;
  for (const { pivot, cote } of d.ailes) {
    const battement = calme ? 0.2 : 0.25 + Math.sin(d.phase) * 0.55;
    pivot.rotation.z = cote * (battement * d.vol + (1 - d.vol) * -0.15);
    pivot.rotation.y = cote * (1 - d.vol) * 0.9; // posé : ailes repliées le long du corps
  }
  if (!calme) d.cle.rotation.y = t * 1.5;
}

// -----------------------------------------------------------------------------
// Faire suivre Ferrus aux compagnons
// -----------------------------------------------------------------------------
// Crée les deux compagnons (main.js les change de scène avec Ferrus).
export function creerCompagnons() {
  const chat = creerChat();
  const oiseau = creerOiseau();
  chat.visible = false;
  oiseau.visible = false;
  return { chat, oiseau, immobile: 0 };
}

const epaule = new THREE.Vector3();
const axeY = new THREE.Vector3(0, 1, 0);

// Les place d'un coup (en arrivant dans un lieu).
export function placerCompagnons(c, trace, ferrus) {
  const p = pointDerriere(trace, ferrus, 1.1);
  c.chat.position.set(p.x, 0, p.z);
  c.chat.rotation.y = p.angle;
  const o = pointDerriere(trace, ferrus, 0.6);
  c.oiseau.position.set(o.x, 1.9, o.z);
}

// À chaque image. « ferrus » : { x, z, orientation } ; « marche » : Ferrus bouge-t-il ?
export function animerCompagnons(c, { trace, ferrus, marche, dt, t, calme, chat, oiseau }) {
  c.chat.visible = chat;
  c.oiseau.visible = oiseau;
  c.immobile = marche ? 0 : c.immobile + dt;
  const lisse = (k) => Math.min(1, dt * k);

  if (chat) {
    const p = pointDerriere(trace, ferrus, 1.1);
    const avant = c.chat.position.clone();
    c.chat.position.x += (p.x - c.chat.position.x) * lisse(10);
    c.chat.position.z += (p.z - c.chat.position.z) * lisse(10);
    const vitesse = dt > 0 ? c.chat.position.distanceTo(avant) / dt : 0;
    // En marchant : il regarde où il va. Assis : il regarde Ferrus.
    const angle = vitesse > 0.2 ? p.angle : Math.atan2(ferrus.x - c.chat.position.x, ferrus.z - c.chat.position.z);
    let ecart = angle - c.chat.rotation.y;
    ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
    c.chat.rotation.y += ecart * lisse(6);
    animerChat(c.chat, vitesse, dt, t, calme);
  }

  if (oiseau) {
    const pose = c.immobile > 0.8;
    let cible;
    if (pose) {
      // Sur l'épaule droite de Ferrus.
      epaule.set(-0.24, 1.45, -0.02).applyAxisAngle(axeY, ferrus.orientation);
      cible = { x: ferrus.x + epaule.x, y: epaule.y, z: ferrus.z + epaule.z };
    } else {
      const p = pointDerriere(trace, ferrus, 0.7);
      cible = { x: p.x, y: 1.95 + (calme ? 0 : Math.sin(t * 2.2) * 0.06), z: p.z };
    }
    const o = c.oiseau.position;
    const avant = { x: o.x, z: o.z };
    o.x += (cible.x - o.x) * lisse(6);
    o.y += (cible.y - o.y) * lisse(4);
    o.z += (cible.z - o.z) * lisse(6);
    const dx = o.x - avant.x;
    const dz = o.z - avant.z;
    const angle = Math.hypot(dx, dz) > 0.002 ? Math.atan2(dx, dz) : ferrus.orientation;
    let ecart = angle - c.oiseau.rotation.y;
    ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
    c.oiseau.rotation.y += ecart * lisse(6);
    const arrive = Math.hypot(cible.x - o.x, cible.y - o.y, cible.z - o.z) < 0.05;
    animerOiseau(c.oiseau, pose && arrive ? 0 : 1, dt, t, calme);
  }
}
