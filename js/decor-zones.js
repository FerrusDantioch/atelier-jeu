// =============================================================================
// decor-zones.js — les nouveaux lieux en 3D (étape 3) : le marché et le moulin
// -----------------------------------------------------------------------------
// Même principe que decor.js : des formes simples aux bords arrondis, des
// couleurs douces, et les positions lues dans les données des lieux (logique-zones.js),
// pour que ce qu'on voit corresponde aux obstacles.
// Seuls les bâtiments projettent une ombre (les personnages aussi, ailleurs).
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import {
  objet,
  matiere,
  COULEURS,
  panneauTexte,
  construireHaies,
  construireArbres,
  construireBatiment,
} from './decor.js';
import { boite, cylindre, boule, tour } from './formes.js';
import { EAU_CALME, EAU_COURANTE, creerRonds, creerFeuilles } from './eau.js';
import { creerFumee } from './vie.js';
import { ajouterLampadaires } from './decor.js';

// Une cheminée de briques sur un toit, avec sa fumée. Renvoie la fumée.
function cheminee(groupe, x, z, opacite = 0.45) {
  groupe.add(objet(boite(0.55, 1.6, 0.55), COULEURS.brique, x, 0.4 + 3 + 1.1, z, { ombre: true }));
  const fumee = creerFumee({ taille: 0.24, opacite, periode: 8, nombre: 4 });
  fumee.position.set(x, 0.4 + 3 + 1.95, z);
  groupe.add(fumee);
  return fumee;
}

// Un sac (de farine, de grain) : un profil de sac « tourné », posé au sol.
const formeSac = tour([[0, 0], [0.19, 0], [0.24, 0.06], [0.26, 0.2], [0.23, 0.34], [0.14, 0.42], [0.07, 0.46], [0, 0.47]], 14);

// Une surface d'eau ronde, posée à plat.
function disqueEau(rayon, y) {
  const eau = new THREE.Mesh(new THREE.CircleGeometry(rayon, 40), EAU_CALME);
  eau.rotation.x = -Math.PI / 2;
  eau.position.y = y;
  return eau;
}

// -----------------------------------------------------------------------------
// Outils communs aux deux lieux
// -----------------------------------------------------------------------------

// Un sol d'herbe, avec une zone plus claire (pavés ou terre battue) par-dessus.
function construireSol(scene, couleurDessus, x, z, largeur, profondeur) {
  const herbe = objet(new THREE.PlaneGeometry(160, 160), COULEURS.herbe, 0, 0, 0, { recoit: true });
  herbe.rotation.x = -Math.PI / 2;
  scene.add(herbe);
  if (couleurDessus) {
    const dessus = objet(new THREE.PlaneGeometry(largeur, profondeur), couleurDessus, x, 0.03, z, { recoit: true });
    dessus.rotation.x = -Math.PI / 2;
    scene.add(dessus);
  }
}

// Un bâtiment avec une enseigne au-dessus de la porte.
function batimentAvecEnseigne(scene, b, hauteurToit, fenetres) {
  const { groupe, avant } = construireBatiment(scene, b, {
    murs: b.murs,
    toit: b.toit,
    hauteurToit,
    porteX: 0,
    fenetres,
  });
  if (b.enseigne) {
    const enseigne = panneauTexte(b.enseigne, 2.2, 0.55);
    enseigne.position.set(0, 2.95, avant + 0.08);
    groupe.add(enseigne);
  }
  return groupe;
}

// Un poteau avec un panneau indicateur (« MOULIN », « PLACE »…), pour s'orienter.
export function poteauIndicateur(scene, texte, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(objet(boite(0.14, 2.0, 0.14), COULEURS.boisFonce, 0, 1.0, 0));
  const panneau = panneauTexte(texte, 1.5, 0.38);
  panneau.position.set(0, 1.75, 0.08);
  g.add(panneau);
  scene.add(g);
}

// Deux poteaux de portail (le passage est ouvert).
export function poteauxPassage(scene, x, z, ecart, surX = true) {
  const poteau = boite(0.3, 1.8, 0.3);
  for (const s of [-1, 1]) {
    scene.add(objet(poteau, COULEURS.boisFonce, surX ? x + s * ecart : x, 0.9, surX ? z : z + s * ecart));
  }
}

// -----------------------------------------------------------------------------
// LE MARCHÉ
// -----------------------------------------------------------------------------
export function construireMarche(scene, zone) {
  // Le sol : tout le marché est pavé.
  construireSol(scene, COULEURS.pavage, 0, 0, 28, 18);
  construireHaies(scene, zone);
  construireArbres(scene, zone);

  // Les deux boutiques du nord (le marchand d'épices a allumé son poêle).
  const boutiques = zone.batiments.map((b) => batimentAvecEnseigne(scene, b, 2.0, [-2.2, 2.2]));
  const fumeeEpices = cheminee(boutiques[1], 1.8, -0.6);
  ajouterLampadaires(scene, zone.lampadaires);

  // L'entrée vers la place (au nord) et le chemin du moulin (à l'est).
  poteauxPassage(scene, 0, -9.5, 1.5);
  poteauIndicateur(scene, 'PLACE', -2.4, -9.5);
  poteauIndicateur(scene, 'MOULIN', 14.5, -2.3);

  // Les étals.
  for (const e of zone.etals) construireEtal(scene, e);

  // La fontaine.
  const f = zone.fontaine;
  const fontaine = new THREE.Group();
  fontaine.position.set(f.x, 0, f.z);
  fontaine.add(objet(cylindre(f.rayon, f.rayon + 0.1, 0.6), COULEURS.pierre, 0, 0.3, 0));
  const rebord = objet(new THREE.TorusGeometry(f.rayon - 0.08, 0.11, 10, 48), COULEURS.pierre, 0, 0.6, 0);
  rebord.rotation.x = Math.PI / 2;
  fontaine.add(rebord);
  fontaine.add(disqueEau(f.rayon - 0.1, 0.605));
  fontaine.add(objet(cylindre(0.18, 0.24, 1.3), COULEURS.pierre, 0, 0.95, 0));
  fontaine.add(objet(cylindre(0.5, 0.3, 0.2), COULEURS.pierre, 0, 1.6, 0));
  const rebordHaut = objet(new THREE.TorusGeometry(0.45, 0.06, 8, 32), COULEURS.pierre, 0, 1.7, 0);
  rebordHaut.rotation.x = Math.PI / 2;
  fontaine.add(rebordHaut);
  fontaine.add(disqueEau(0.43, 1.705));
  // L'eau qui bouillonne doucement au centre de la vasque, et les ronds qu'elle fait.
  const source = objet(boule(0.09, 2), '#bfd3cf', 0, 1.72, 0);
  fontaine.add(source);
  const rondsHaut = creerRonds({ rayonDepart: 0.1, rayonFin: 0.38, nombre: 2, duree: 2.6, opacite: 0.45 });
  rondsHaut.position.y = 1.71;
  const rondsBas = creerRonds({ rayonDepart: 0.32, rayonFin: f.rayon - 0.3, nombre: 3, duree: 6, opacite: 0.32, decalage: 1.3 });
  rondsBas.position.y = 0.61;
  fontaine.add(rondsHaut, rondsBas);
  scene.add(fontaine);
  const eauFontaine = new THREE.Group();
  eauFontaine.userData.animer = (t) => {
    rondsHaut.userData.animer(t);
    rondsBas.userData.animer(t);
    const bouillon = Math.sin(t * 2.2) * 0.5 + 0.5;
    source.scale.set(1 + bouillon * 0.15, 0.6 + bouillon * 0.5, 1 + bouillon * 0.15);
  };

  // L'arbre tombé qui bloque le chemin du moulin (caché une fois dégagé).
  const b = zone.barriere;
  const barriere = new THREE.Group();
  barriere.position.set(b.x, 0, b.z);
  const tronc = objet(cylindre(0.32, 0.4, b.profondeur + 0.6), COULEURS.tronc, 0, 0.38, 0);
  tronc.rotation.x = Math.PI / 2;
  barriere.add(tronc);
  barriere.add(objet(boule(1.0, 2), COULEURS.feuillage, 0.2, 0.8, 2.1));
  barriere.add(objet(boule(0.7, 2), COULEURS.feuillageClair, -0.3, 0.6, 2.7));
  scene.add(barriere);

  return { barriere, eau: [eauFontaine], vie: [fumeeEpices] };
}

// Un étal : une table, quatre poteaux et un auvent à rayures.
function construireEtal(scene, e) {
  const g = new THREE.Group();
  g.position.set(e.x, 0, e.z);
  const l = e.largeur;
  const p = e.profondeur;
  g.add(objet(boite(l, 0.9, p), COULEURS.boisClair, 0, 0.45, 0, { recoit: true }));
  const poteau = boite(0.1, 2.3, 0.1);
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(objet(poteau, COULEURS.boisFonce, px * (l / 2 - 0.05), 1.15, pz * (p / 2 - 0.05)));
  }
  // L'auvent : des bandes alternées, légèrement inclinées vers l'avant.
  const auvent = new THREE.Group();
  auvent.position.set(0, 2.3, 0);
  auvent.rotation.x = 0.18;
  const bandes = 6;
  const largeurBande = (l + 0.4) / bandes;
  for (let i = 0; i < bandes; i++) {
    auvent.add(objet(boite(largeurBande, 0.05, p + 0.7), i % 2 ? '#efe2c4' : e.couleur, -l / 2 - 0.2 + largeurBande * (i + 0.5), 0, 0));
  }
  g.add(auvent);

  // La marchandise posée sur la table.
  if (e.marchandise === 'fruits') {
    const couleurs = ['#e0a458', '#c9785f', '#a7b46a', '#e0a458', '#c9785f', '#d9c070'];
    couleurs.forEach((c, i) => g.add(objet(boule(0.14, 1), c, -1.1 + i * 0.44, 1.02, (i % 2) * 0.2 - 0.1)));
  } else if (e.marchandise === 'tissus') {
    ['#c98b7a', '#8f8fb0', '#a7b47c', '#e3c27e'].forEach((c, i) => {
      const rouleau = objet(cylindre(0.13, 0.13, 0.9), c, -0.9 + i * 0.6, 1.03, 0);
      rouleau.rotation.x = Math.PI / 2;
      g.add(rouleau);
    });
  } else if (e.marchandise === 'balance') {
    // La vieille balance cassée de Capucine (un plateau tombé), et des sacs.
    g.add(objet(cylindre(0.05, 0.08, 0.5), COULEURS.laiton, -0.6, 1.15, 0));
    const fleau = objet(boite(0.7, 0.04, 0.04), COULEURS.laiton, -0.6, 1.38, 0);
    fleau.rotation.z = 0.35;
    g.add(fleau);
    g.add(objet(cylindre(0.2, 0.16, 0.04), COULEURS.cuivre, -0.95, 1.0, 0.15));
    for (const [sx, c] of [[0.4, '#d8c9a6'], [0.9, '#cbb48c']]) g.add(objet(formeSac, c, sx, 0.9, 0));
  }
  scene.add(g);
}

// -----------------------------------------------------------------------------
// LE MOULIN
// -----------------------------------------------------------------------------
export function construireMoulin(scene, zone) {
  // Le sol : de l'herbe, et un chemin de terre battue de l'entrée au moulin.
  construireSol(scene, '#c5b391', -8, 0.5, 13, 2.4);
  construireHaies(scene, zone);
  construireArbres(scene, zone);
  poteauIndicateur(scene, 'MARCHÉ', -14.5, -2.3);

  // Le canal : de l'eau calme, bordée de pierres.
  const c = zone.canal;
  const eau = objet(new THREE.PlaneGeometry(c.largeur + 10, c.profondeur), EAU_COURANTE, c.x, 0.05, c.z);
  eau.rotation.x = -Math.PI / 2;
  scene.add(eau);
  // Quelques feuilles flottent au fil du courant (d'est en ouest).
  const demiLongueur = (c.largeur + 10) / 2 - 1;
  const feuilles = creerFeuilles({ debut: c.x + demiLongueur, fin: c.x - demiLongueur, z: c.z, largeur: c.profondeur, y: 0.07, nombre: 5 });
  scene.add(feuilles);
  for (const s of [-1, 1]) {
    scene.add(objet(boite(c.largeur + 10, 0.2, 0.3), COULEURS.pierre, c.x, 0.1, c.z + s * (c.profondeur / 2 + 0.05), { recoit: true }));
  }

  // Le moulin, avec son enseigne et sa cheminée.
  const batiment = batimentAvecEnseigne(scene, zone.batiments[0], 2.6, [-1.9]);
  const fumeeMoulin = cheminee(batiment, 1.6, -0.8, 0.4);
  ajouterLampadaires(scene, zone.lampadaires);

  // La route de la gare, à l'est (version 1.2) : deux poteaux, un panneau, et
  // une barrière rayée qui reste baissée jusqu'à la fin de la quête de Barnabé.
  const bg = zone.barriere;
  poteauxPassage(scene, bg.x, bg.z, 1.6, false);
  poteauIndicateur(scene, 'GARE', 13.2, -2.4);
  const barriereGare = new THREE.Group();
  barriereGare.position.set(bg.x, 0, bg.z);
  for (let i = 0; i < 6; i++) {
    barriereGare.add(objet(boite(0.16, 0.16, 0.52, 0.05), i % 2 ? '#efe2c4' : '#c98b7a', 0, 1.0, -1.3 + i * 0.52));
  }
  barriereGare.add(objet(boite(0.14, 0.8, 0.14), COULEURS.boisFonce, 0, 0.5, 0));
  scene.add(barriereGare);

  // Des sacs de farine contre le mur, à droite de la porte.
  const avant = zone.batiments[0].z + zone.batiments[0].profondeur / 2;
  for (const [sx, h] of [[-1.8, 0], [-1.35, 0], [-1.58, 0.38]]) {
    scene.add(objet(formeSac, '#efe8da', sx, h, avant + 0.22));
  }

  // La grande roue à aubes, dans le canal.
  const roue = construireRoue(zone.roue);
  scene.add(roue.groupe);

  // Le mécanisme : un pilier de pierre surmonté d'un engrenage et d'un levier.
  const m = zone.mecanisme;
  const meca = new THREE.Group();
  meca.position.set(m.x, 0, m.z);
  meca.add(objet(boite(0.7, 0.9, 0.7), COULEURS.pierre, 0, 0.45, 0, { recoit: true }));
  meca.add(objet(cylindre(0.28, 0.28, 0.1), COULEURS.laiton, 0, 0.95, 0));
  const levier = objet(boite(0.06, 0.5, 0.06), COULEURS.boisFonce, 0.22, 1.15, 0);
  levier.rotation.z = -0.4;
  meca.add(levier);
  scene.add(meca);

  return { roue, barriereGare, eau: [feuilles], vie: [fumeeMoulin] };
}

// La roue : deux cercles, des rayons et des pales. Trois pales manquent tant
// que la quête n'est pas finie.
function construireRoue(r) {
  const groupe = new THREE.Group();
  groupe.position.set(r.x, 1.35, r.z);
  const tourne = new THREE.Group(); // la partie qui tourne
  groupe.add(tourne);
  const anneau = new THREE.TorusGeometry(r.rayon, 0.08, 8, 40);
  for (const s of [-1, 1]) tourne.add(objet(anneau, COULEURS.boisFonce, 0, 0, s * 0.25));
  const nbPales = 8;
  const palesManquantes = [];
  for (let i = 0; i < nbPales; i++) {
    const angle = (i / nbPales) * Math.PI * 2;
    const rayon = objet(boite(0.08, r.rayon * 2, 0.08), COULEURS.boisFonce, 0, 0, 0);
    rayon.rotation.z = angle;
    if (i < nbPales / 2) tourne.add(rayon);
    const pale = objet(boite(0.5, 0.08, 0.6), COULEURS.boisClair, Math.cos(angle) * r.rayon, Math.sin(angle) * r.rayon, 0);
    pale.rotation.z = angle + Math.PI / 2;
    tourne.add(pale);
    if (i % 3 === 0 && palesManquantes.length < 3) palesManquantes.push(pale);
  }
  // Le moyeu et l'axe (qui part vers le pilier de la berge nord).
  tourne.add(objet(cylindre(0.25, 0.25, 0.7), COULEURS.metal, 0, 0, 0).rotateX(Math.PI / 2));
  groupe.add(objet(cylindre(0.1, 0.1, 2.2), COULEURS.metal, 0, 0, -1.0).rotateX(Math.PI / 2));
  groupe.add(objet(boite(0.6, 1.6, 0.6), COULEURS.pierre, 0, -0.55, -2.1));
  return { groupe, tourne, palesManquantes };
}

// Une pale de roue à ramasser : une planche posée dans l'herbe, inclinée vers
// la caméra, au-dessus d'un cercle clair (comme les engrenages de l'étape 1).
const formePale = boite(0.75, 0.07, 0.38);
export function creerPaleQuete() {
  const g = new THREE.Group();
  const support = new THREE.Group();
  support.position.y = 0.55;
  support.rotation.x = 0.7;
  g.add(support);
  const planche = new THREE.Mesh(formePale, matiere(COULEURS.boisClair));
  support.add(planche);
  const cercle = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 24),
    new THREE.MeshBasicMaterial({ color: '#f3dfb2', transparent: true, opacity: 0.75, depthWrite: false })
  );
  cercle.rotation.x = -Math.PI / 2;
  cercle.position.y = 0.07;
  g.add(cercle);
  g.userData = { support, roue: planche };
  return g;
}
