// =============================================================================
// decor-interieur.js — l'intérieur de l'atelier en 3D (version 1.5)
// -----------------------------------------------------------------------------
// Un plancher en bois, des murs crème avec un lambris, deux fenêtres, et :
//   - la FORGE, dont les braises rougeoient (plus fort pendant une fabrication) ;
//   - la grande MACHINE à engrenages de l'ancien propriétaire, qui tourne
//     tranquillement (plus vite quand on travaille) ;
//   - l'ÉTABLI (le même panneau que celui de dehors) et des outils au mur ;
//   - l'établi de LUCIE, l'apprentie, contre le mur de droite ;
//   - des étagères pleines de caisses et de bocaux, et le panier de Rouille ;
//   - le COIN SALON, à décorer : grand tapis, fauteuil, gramophone, tableau,
//     plante verte (visibles une fois achetés).
// Rien ne clignote : les braises « respirent » très lentement.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, matiere, COULEURS, formeEngrenage, creerHasard } from './decor.js';
import { boite, cylindre, boule, gelule } from './formes.js';
import { MATIERE_FENETRE, MATIERE_LUEUR, creerHalo } from './vie.js';

const PLATRE = '#e2cfae';
const LAMBRIS = '#8a6444';
const PLANCHER = '#a8805a';
const PIERRE = '#8a7f74';

export function construireInterieur(scene, zone) {
  construireSolEtMurs(scene, zone);
  const forge = construireForge(scene);
  const machine = construireMachine(scene);
  const rouage = construireEtabli(scene);
  construireEtageres(scene);
  construireEtabliLucie(scene);
  construireLampes(scene);
  const decorations = construireDecorationsInterieur(scene);
  // Ce qui bouge : main.js règle l'activité (0 = calme, 1 = on travaille).
  let activite = 0;
  const vie = {
    userData: {
      animer: (t) => {
        // Les braises respirent très lentement ; plus vives pendant le travail.
        forge.braises.emissiveIntensity = 0.55 + activite * 0.6 + Math.sin(t * 0.8) * 0.08;
        for (const [i, roue] of machine.entries()) roue.rotation.z = (i % 2 ? -1 : 1) * t * (0.25 + activite * 0.9) / (1 + i * 0.4);
        rouage.rotation.z = t * activite * 2.5;
        decorations.gramophone.userData.disque.rotation.y = t * 1.2;
      },
    },
  };
  return {
    decorations,
    eau: [],
    vie: [vie],
    regler: (a) => { activite += (a - activite) * 0.05; },
  };
}

// --- Le sol et les murs ---------------------------------------------------------------
function construireSolEtMurs(scene, zone) {
  const plat = (largeur, profondeur, couleur, x, y, z) => {
    const p = objet(new THREE.PlaneGeometry(largeur, profondeur), couleur, x, y, z, { recoit: true });
    p.rotation.x = -Math.PI / 2;
    scene.add(p);
  };
  plat(90, 90, '#2b2119', 0, -0.02, 0);   // dehors : l'ombre
  plat(14.2, 9.6, PLANCHER, 0, 0, -0.3);   // le plancher
  // Les lattes du plancher.
  for (let x = -6.6; x <= 6.6; x += 0.55) {
    scene.add(objet(new THREE.PlaneGeometry(0.03, 9.6), '#8f6a48', x, 0.003, -0.3).rotateX(-Math.PI / 2));
  }
  // Le seuil de la porte, au sud.
  scene.add(objet(boite(2.0, 0.04, 0.9, 0.02), '#7a5a3e', 0, 0.02, 3.95, { recoit: true }));
  for (const p of zone.parois) {
    const nord = p.id === 'mur-nord';
    const sud = p.id.startsWith('mur-sud');
    const hauteur = nord ? 3.4 : sud ? 0.9 : 2.6;
    scene.add(objet(boite(p.largeur, hauteur, p.profondeur, 0.08), PLATRE, p.x, hauteur / 2, p.z, { recoit: true }));
    // Le lambris en bois, en bas des murs (côté intérieur).
    const surX = p.largeur > p.profondeur;
    const versInterieur = surX ? -Math.sign(p.z) : -Math.sign(p.x);
    const h = Math.min(1.0, hauteur);
    const lambris = objet(boite(surX ? p.largeur : 0.06, h, surX ? 0.06 : p.profondeur, 0.02), LAMBRIS,
      surX ? p.x : p.x + versInterieur * (p.largeur / 2 + 0.02), h / 2, surX ? p.z + versInterieur * (p.profondeur / 2 + 0.02) : p.z, { recoit: true });
    scene.add(lambris);
  }
  // Deux fenêtres, sur les murs de gauche et de droite.
  for (const [x, rot] of [[-6.47, Math.PI / 2], [6.47, -Math.PI / 2]]) {
    const f = new THREE.Group();
    f.position.set(x, 1.75, -2.4);
    f.rotation.y = rot;
    f.add(objet(boite(1.3, 1.1, 0.08), COULEURS.boisFonce, 0, 0, 0));
    f.add(objet(boite(1.1, 0.9, 0.08), MATIERE_FENETRE, 0, 0, 0.03));
    f.add(objet(boite(0.06, 0.9, 0.1), COULEURS.boisFonce, 0, 0, 0.05));
    f.add(objet(boite(1.1, 0.06, 0.1), COULEURS.boisFonce, 0, 0, 0.05));
    scene.add(f);
  }
}

// --- La forge -------------------------------------------------------------------------------
function construireForge(scene) {
  const g = new THREE.Group();
  g.position.set(-4.6, 0, -3.6);
  g.add(objet(boite(2.3, 0.95, 1.5, 0.12), PIERRE, 0, 0.475, 0, { ombre: true, recoit: true }));
  g.add(objet(boite(1.5, 0.06, 0.9, 0.03), '#3a302a', 0, 0.97, 0));
  // Les braises : une lueur orangée qui « respire » lentement.
  const braises = new THREE.MeshLambertMaterial({ color: '#d8642a', emissive: '#c0501c', emissiveIntensity: 0.6, flatShading: true });
  const hasard = creerHasard(9);
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + hasard() * 0.06, 0), braises);
    b.position.set(-0.55 + (i % 5) * 0.27, 1.02, -0.25 + Math.floor(i / 5) * 0.4 + hasard() * 0.1);
    g.add(b);
  }
  const halo = creerHalo(1.6);
  halo.position.set(0, 1.25, 0.2);
  g.add(halo);
  // La hotte et le tuyau de cheminée en cuivre.
  const hotte = objet(new THREE.CylinderGeometry(0.35, 1.0, 0.7, 4, 1), COULEURS.cuivre, 0, 2.25, -0.1, { ombre: true });
  hotte.rotation.y = Math.PI / 4;
  hotte.scale.set(1.2, 1, 0.85);
  g.add(hotte);
  g.add(objet(cylindre(0.22, 0.22, 1.6), COULEURS.cuivre, 0, 3.4, -0.2));
  // L'enclume, sur un billot, au bord de la forge.
  g.add(objet(cylindre(0.2, 0.22, 0.55), COULEURS.boisFonce, 0.95, 0.27, 0.45));
  g.add(objet(boite(0.45, 0.16, 0.2, 0.04), '#4a4a4a', 0.95, 0.63, 0.45));
  // Le panier de Rouille, au chaud près de la forge.
  const panier = objet(cylindre(0.32, 0.26, 0.16, 18, 0.04), '#b08a50', 1.55, 0.08, 1.05);
  g.add(panier);
  g.add(objet(cylindre(0.27, 0.27, 0.04, 16), '#c98b7a', 1.55, 0.15, 1.05));
  scene.add(g);
  return { braises };
}

// --- La machine à engrenages ----------------------------------------------------------------
function construireMachine(scene) {
  const g = new THREE.Group();
  g.position.set(4.5, 0, -3.7);
  g.add(objet(boite(2.3, 0.5, 1.3, 0.08), '#5e5650', 0, 0.25, 0, { ombre: true }));
  for (const x of [-0.95, 0.95]) g.add(objet(boite(0.16, 2.4, 0.16, 0.04), COULEURS.boisFonce, x, 1.45, -0.35, { ombre: true }));
  g.add(objet(boite(2.1, 0.18, 0.2, 0.04), COULEURS.boisFonce, 0, 2.7, -0.35));
  const roues = [];
  for (const [x, y, r, couleur] of [[-0.45, 1.25, 0.5, COULEURS.laiton], [0.38, 1.6, 0.36, COULEURS.cuivre], [0.5, 0.95, 0.26, COULEURS.laiton], [-0.2, 2.15, 0.3, COULEURS.cuivre]]) {
    const roue = objet(formeEngrenage(r, Math.round(r * 22), 0.08), couleur, x, y, -0.2);
    g.add(roue);
    roues.push(roue);
  }
  // Un manomètre et des tuyaux.
  g.add(objet(cylindre(0.14, 0.14, 0.06, 20), '#f1e3c4', 0.85, 1.9, -0.2).rotateX(Math.PI / 2));
  g.add(objet(new THREE.TorusGeometry(0.14, 0.025, 6, 20), COULEURS.laiton, 0.85, 1.9, -0.16));
  g.add(objet(cylindre(0.06, 0.06, 2.0), COULEURS.cuivre, 1.05, 1.0, 0.25));
  const coude = objet(cylindre(0.06, 0.06, 0.8), COULEURS.cuivre, 0.7, 2.0, 0.25);
  coude.rotation.z = Math.PI / 2;
  g.add(coude);
  scene.add(g);
  return roues;
}

// --- L'établi, et les outils au mur -----------------------------------------------------------
function construireEtabli(scene) {
  const g = new THREE.Group();
  g.position.set(0, 0, -3.9);
  g.add(objet(boite(2.6, 0.12, 0.9, 0.04), COULEURS.boisClair, 0, 0.92, 0, { recoit: true }));
  for (const px of [-1, 1]) for (const pz of [-1, 1]) g.add(objet(boite(0.12, 0.88, 0.12), COULEURS.boisFonce, px * 1.15, 0.44, pz * 0.33));
  g.add(objet(boite(2.3, 0.06, 0.6), COULEURS.boisFonce, 0, 0.3, 0));
  g.add(objet(boite(0.3, 0.22, 0.26), COULEURS.metal, -0.85, 1.09, 0.1)); // l'étau
  g.add(objet(cylindre(0.05, 0.05, 0.4), COULEURS.cuivre, 0.3, 1.0, 0.15).rotateZ(Math.PI / 2));
  const rouage = objet(formeEngrenage(0.2, 8, 0.06), COULEURS.laiton, 0.55, 1.22, -0.25);
  g.add(rouage);
  // Le panneau d'outils, au mur, au-dessus de l'établi.
  g.add(objet(boite(2.2, 1.0, 0.05), '#b9946a', 0, 2.05, -0.42));
  const outil = (x, longueur, couleur) => {
    g.add(objet(boite(0.05, longueur, 0.04), couleur, x, 2.05, -0.38));
    g.add(objet(boite(0.16, 0.08, 0.05), '#6b6660', x, 2.05 + longueur / 2, -0.37));
  };
  [[-0.8, 0.6, COULEURS.boisFonce], [-0.45, 0.5, COULEURS.boisClair], [-0.1, 0.65, COULEURS.boisFonce], [0.3, 0.45, COULEURS.boisClair]].forEach(([x, l, c]) => outil(x, l, c));
  g.add(objet(formeEngrenage(0.18, 8, 0.05), COULEURS.cuivre, 0.75, 2.1, -0.37));
  scene.add(g);
  return rouage;
}

// --- Les étagères, contre le mur de gauche --------------------------------------------------
function construireEtageres(scene) {
  const g = new THREE.Group();
  g.position.set(-6.0, 0, 0.2);
  for (const z of [-1.25, 1.25]) g.add(objet(boite(0.7, 2.2, 0.08), COULEURS.boisClair, 0, 1.1, z));
  const hasard = creerHasard(14);
  for (const y of [0.35, 0.95, 1.55, 2.1]) {
    g.add(objet(boite(0.7, 0.05, 2.5), COULEURS.boisClair, 0, y, 0));
    for (let z = -1.0; z <= 1.0; z += 0.42) {
      const sorte = hasard();
      if (sorte < 0.4) g.add(objet(boite(0.38, 0.3, 0.32, 0.03), COULEURS.boisFonce, 0, y + 0.17, z));
      else if (sorte < 0.75) g.add(objet(cylindre(0.1, 0.1, 0.24), sorte < 0.6 ? COULEURS.cuivre : COULEURS.laiton, 0, y + 0.14, z));
      else g.add(objet(boule(0.1, 1), '#a7b47c', 0, y + 0.12, z));
    }
  }
  scene.add(g);
}

// --- L'établi de Lucie, contre le mur de droite -----------------------------------------------
function construireEtabliLucie(scene) {
  const g = new THREE.Group();
  g.position.set(5.95, 0, 0.4);
  g.add(objet(boite(0.95, 0.1, 2.1, 0.04), COULEURS.boisClair, 0, 0.82, 0, { recoit: true }));
  for (const pz of [-0.95, 0.95]) for (const px of [-0.38, 0.38]) g.add(objet(boite(0.1, 0.78, 0.1), COULEURS.boisFonce, px, 0.39, pz));
  // Une lanterne à moitié montée, des outils, une petite lampe.
  g.add(objet(cylindre(0.1, 0.12, 0.08), COULEURS.laiton, 0, 0.91, -0.5));
  g.add(objet(boule(0.09, 2), '#efe0bc', 0, 1.02, -0.5));
  g.add(objet(boite(0.3, 0.04, 0.06), COULEURS.metal, -0.1, 0.89, 0.2));
  g.add(objet(cylindre(0.035, 0.035, 0.32), COULEURS.cuivre, 0.1, 0.9, 0.5).rotateX(Math.PI / 2));
  g.add(objet(cylindre(0.012, 0.012, 0.45), '#3f4a46', 0.25, 1.1, 0.8));
  g.add(objet(cylindre(0.08, 0.06, 0.12, 12, 0.02), MATIERE_LUEUR, 0.25, 1.36, 0.8));
  scene.add(g);
}

// --- Les lampes : deux lanternes accrochées au mur du fond -----------------------------------
function construireLampes(scene) {
  for (const x of [-1.6, 1.6]) {
    const g = new THREE.Group();
    g.position.set(x, 2.35, -4.42);
    g.add(objet(boite(0.06, 0.06, 0.3, 0.02), '#3f4a46', 0, 0.2, 0.12));
    g.add(objet(cylindre(0.1, 0.08, 0.26, 12, 0.02), MATIERE_LUEUR, 0, 0, 0.26));
    g.add(objet(new THREE.ConeGeometry(0.14, 0.12, 12), '#3f4a46', 0, 0.18, 0.26));
    const halo = creerHalo(1.5);
    halo.position.set(0, 0, 0.32);
    g.add(halo);
    scene.add(g);
  }
}

// --- Les décorations de l'intérieur (visibles une fois achetées) ----------------------------------
function construireDecorationsInterieur(scene) {
  // Le grand tapis du coin salon.
  const tapis = new THREE.Group();
  tapis.position.set(-3.9, 0.015, 1.6);
  tapis.add(objet(boite(3.0, 0.02, 1.8, 0.01), '#7f5a6a', 0, 0, 0, { recoit: true }));
  tapis.add(objet(boite(2.6, 0.025, 1.4, 0.01), '#c9a36a', 0, 0.002, 0, { recoit: true }));
  tapis.add(objet(boite(2.2, 0.03, 1.0, 0.01), '#9a6a5a', 0, 0.004, 0, { recoit: true }));

  // La plante verte, dans un pot de cuivre.
  const plante = new THREE.Group();
  plante.position.set(2.2, 0, 2.9);
  plante.add(objet(cylindre(0.3, 0.24, 0.45, 16, 0.04), COULEURS.cuivre, 0, 0.225, 0, { ombre: true }));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const feuille = objet(gelule(0.07, 0.4, 8), '#6f9a58', Math.cos(a) * 0.12, 0.75, Math.sin(a) * 0.12);
    feuille.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    plante.add(feuille);
  }
  plante.add(objet(boule(0.16, 1), '#7da866', 0, 0.75, 0));

  // Le tableau : une petite peinture de la place, dessinée sur une toile.
  const toile = document.createElement('canvas');
  toile.width = 128;
  toile.height = 96;
  const ctx = toile.getContext('2d');
  const ciel = ctx.createLinearGradient(0, 0, 0, 60);
  ciel.addColorStop(0, '#e9c9a0');
  ciel.addColorStop(1, '#f3e3c4');
  ctx.fillStyle = ciel;
  ctx.fillRect(0, 0, 128, 96);
  ctx.fillStyle = '#a7b47c';
  ctx.fillRect(0, 62, 128, 34);
  ctx.fillStyle = '#b67a5c'; ctx.fillRect(14, 38, 40, 28);       // l'atelier
  ctx.fillStyle = '#86a597'; ctx.beginPath(); ctx.moveTo(10, 40); ctx.lineTo(34, 22); ctx.lineTo(58, 40); ctx.fill();
  ctx.fillStyle = '#e7d6b4'; ctx.fillRect(72, 42, 36, 24);       // la maison d'Odile
  ctx.fillStyle = '#ab6c52'; ctx.beginPath(); ctx.moveTo(68, 44); ctx.lineTo(90, 28); ctx.lineTo(112, 44); ctx.fill();
  ctx.fillStyle = '#83a25e'; ctx.beginPath(); ctx.arc(118, 56, 10, 0, Math.PI * 2); ctx.fill();
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  const tableau = new THREE.Group();
  tableau.position.set(-2.3, 2.15, -4.47);
  tableau.add(objet(boite(1.2, 0.95, 0.06, 0.02), COULEURS.laiton, 0, 0, 0));
  const peinture = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.79), new THREE.MeshLambertMaterial({ map: texture }));
  peinture.position.z = 0.035;
  tableau.add(peinture);

  // Le fauteuil et son guéridon.
  const fauteuil = new THREE.Group();
  fauteuil.position.set(-4.9, 0, 2.6);
  const velours = '#8a5a5a';
  fauteuil.add(objet(boite(0.9, 0.35, 0.8, 0.12), velours, 0, 0.35, 0, { ombre: true }));
  fauteuil.add(objet(boite(0.9, 0.8, 0.2, 0.1), velours, 0, 0.75, 0.32, { ombre: true }));
  for (const cote of [-1, 1]) fauteuil.add(objet(boite(0.16, 0.3, 0.75, 0.07), velours, cote * 0.45, 0.6, 0.02));
  for (const x of [-0.35, 0.35]) for (const z of [-0.3, 0.3]) fauteuil.add(objet(cylindre(0.035, 0.03, 0.18), COULEURS.boisFonce, x, 0.09, z));
  fauteuil.rotation.y = Math.PI; // il regarde vers le nord (vers la forge)
  fauteuil.add(objet(cylindre(0.3, 0.3, 0.05, 20, 0.02), COULEURS.boisFonce, -1.2, 0.62, 0));
  fauteuil.add(objet(cylindre(0.04, 0.05, 0.6), COULEURS.boisFonce, -1.2, 0.3, 0));
  fauteuil.add(objet(cylindre(0.06, 0.05, 0.1), '#f1e3c4', -1.2, 0.69, 0.05)); // une tasse

  // Le gramophone, sur un petit meuble : son disque tourne doucement.
  const gramophone = new THREE.Group();
  gramophone.position.set(-1.9, 0, 2.7);
  gramophone.add(objet(boite(0.6, 0.55, 0.5, 0.05), COULEURS.boisFonce, 0, 0.275, 0, { ombre: true }));
  gramophone.add(objet(boite(0.45, 0.18, 0.4, 0.04), COULEURS.boisClair, 0, 0.64, 0));
  const disque = objet(cylindre(0.17, 0.17, 0.015, 24), '#2a2420', 0, 0.74, 0);
  gramophone.add(disque);
  gramophone.add(objet(cylindre(0.03, 0.03, 0.3), COULEURS.laiton, 0.15, 0.85, 0.1));
  const pavillon = objet(new THREE.ConeGeometry(0.28, 0.5, 20, 1, true), matiere(COULEURS.cuivre, { side: THREE.DoubleSide }), 0.12, 1.1, 0.05);
  pavillon.rotation.z = 0.9;
  gramophone.add(pavillon);
  gramophone.userData.disque = disque;

  const objets = { 'tapis-salon': tapis, 'plante-verte': plante, tableau, fauteuil, gramophone };
  for (const o of Object.values(objets)) {
    o.visible = false;
    scene.add(o);
  }
  return objets;
}
