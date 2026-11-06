// =============================================================================
// decor-mine.js — la mine de cuivre en 3D (version 1.3)
// -----------------------------------------------------------------------------
// Au bout de la voie ferrée, dans les collines : un petit quai en bois où
// attend le train, la cabane des mineurs, et à l'est, l'entrée de la mine
// creusée dans les rochers, avec ses petits rails et son wagonnet.
//
// Même principe que les autres lieux : formes arrondies, couleurs douces, et
// positions lues dans les données du lieu (logique-zones.js).
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, matiere, COULEURS, panneauTexte, construireHaies, construireArbres, construireBatiment, ajouterLampadaires } from './decor.js';
import { construireTrain } from './decor-gare.js';
import { boite, cylindre, boule } from './formes.js';
import { creerFumee, creerLucioles, creerHalo, MATIERE_LUEUR } from './vie.js';

const ROCHE = '#9c9286';
const ROCHE_FONCEE = '#8a8076';
const FONTE = '#3f4a46';

export function construireMine(scene, zone) {
  construireSol(scene, zone.voie);
  construireHaies(scene, zone);
  construireArbres(scene, zone);
  ajouterLampadaires(scene, zone.lampadaires);

  // La cabane des mineurs, avec son enseigne et un poêle qui fume.
  const b = zone.batiments[0];
  const { groupe, avant, hauteurMurs } = construireBatiment(scene, b, {
    murs: b.murs,
    toit: b.toit,
    hauteurToit: 2.0,
    porteX: 0.8,
    fenetres: [-1.5],
  });
  const enseigne = panneauTexte(b.enseigne, 1.6, 0.42);
  enseigne.position.set(0.8, 2.85, avant + 0.08);
  groupe.add(enseigne);
  groupe.add(objet(boite(0.5, 1.4, 0.5), COULEURS.brique, -1.8, 0.4 + hauteurMurs + 0.8, -0.3, { ombre: true }));
  const fumeeCabane = creerFumee({ taille: 0.22, opacite: 0.45, periode: 8, nombre: 4 });
  fumeeCabane.position.set(-1.8, 0.4 + hauteurMurs + 1.55, -0.3);
  groupe.add(fumeeCabane);

  // Le train qui attend pour redescendre à Cuivrebourg (il fume doucement).
  const train = construireTrain(scene, zone.locomotive);
  train.sifflet.visible = true;
  train.fumee.userData.force = 0.5;

  construireColline(scene, zone);
  const wagonnet = construireWagonnet(scene, zone.wagonnet);

  // Les lucioles, la nuit, au bord des arbres du sud.
  const lucioles = creerLucioles({ x: 0, z: 5.8, largeur: 22, profondeur: 3, nombre: 9, graine: 4 });
  scene.add(lucioles);

  return { wagonnet, eau: [], vie: [fumeeCabane, train.fumee, lucioles] };
}

// --- Le sol : l'herbe, la terre battue, le quai en bois, la voie ferrée -------------
function construireSol(scene, voie) {
  const plat = (largeur, profondeur, couleur, x, y, z) => {
    const p = objet(new THREE.PlaneGeometry(largeur, profondeur), couleur, x, y, z, { recoit: true });
    p.rotation.x = -Math.PI / 2;
    scene.add(p);
  };
  plat(160, 160, COULEURS.herbe, 0, 0, 0);
  plat(14, 5.6, '#bfa98a', 2.5, 0.02, -0.9);        // la terre battue devant la mine
  plat(4, 2.2, '#bfa98a', -5.5, 0.022, 0.4);         // le chemin vers la cabane
  plat(13, 2.1, '#a88866', 0.5, 0.03, -4.65);         // le quai en planches
  for (let x = -5.6; x <= 6.6; x += 0.8) {            // les joints des planches
    scene.add(objet(new THREE.PlaneGeometry(0.04, 2.1), '#93765a', x, 0.032, -4.65).rotateX(-Math.PI / 2));
  }
  scene.add(objet(boite(13, 0.2, 0.3, 0.06), COULEURS.boisFonce, 0.5, 0.1, -5.75, { recoit: true }));

  // La voie ferrée (comme à la gare).
  const longueur = 90;
  const ballast = objet(new THREE.PlaneGeometry(longueur, 2.4), '#a89a86', 0, 0.025, voie.z, { recoit: true });
  ballast.rotation.x = -Math.PI / 2;
  scene.add(ballast);
  const nombre = Math.floor(longueur / 0.9);
  const traverses = new THREE.InstancedMesh(boite(0.32, 0.08, 2.0, 0.03), matiere('#6b5543'), nombre);
  const m = new THREE.Matrix4();
  for (let i = 0; i < nombre; i++) {
    m.makeTranslation(-longueur / 2 + i * 0.9 + 0.45, 0.06, voie.z);
    traverses.setMatrixAt(i, m);
  }
  scene.add(traverses);
  for (const cote of [-1, 1]) scene.add(objet(boite(longueur, 0.1, 0.09, 0.03), '#8a857c', 0, 0.15, voie.z + cote * 0.6));
}

// --- La colline, ses rochers et l'entrée de la mine ---------------------------------
function construireColline(scene, zone) {
  // La grande butte où est creusée la mine.
  const butte = objet(boule(1.6, 2), ROCHE, 10.2, 0.6, -4.2);
  butte.scale.set(1.6, 1.35, 0.9);
  scene.add(butte);
  // Les gros rochers autour (ce sont aussi des obstacles, voir logique-zones.js).
  zone.rochers.forEach((r, i) => {
    const rocher = objet(boule(r.rayon, 2), i % 2 ? ROCHE_FONCEE : ROCHE, r.x, r.rayon * 0.55, r.z);
    rocher.scale.set(1, 0.8, 1);
    scene.add(rocher);
  });

  // L'entrée : une ouverture sombre en arc, dans un cadre de poutres.
  const e = zone.entree;
  const g = new THREE.Group();
  g.position.set(e.x, 0, e.z + e.profondeur / 2 + 0.02);
  const sombre = new THREE.MeshBasicMaterial({ color: '#2a2420' });
  const bas = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.95), sombre);
  bas.position.y = 0.475;
  const haut = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20, 0, Math.PI), sombre);
  haut.position.y = 0.95;
  g.add(bas, haut);
  for (const cote of [-1, 1]) g.add(objet(boite(0.24, 2.0, 0.24), COULEURS.boisFonce, cote * 1.05, 1.0, 0.05, { ombre: true }));
  g.add(objet(boite(2.6, 0.26, 0.3), COULEURS.boisFonce, 0, 2.05, 0.05, { ombre: true }));
  const panneau = panneauTexte('MINE DE CUIVRE', 2.0, 0.42);
  panneau.position.set(0, 2.45, 0.12);
  g.add(panneau);
  // Une lanterne accrochée sous la poutre.
  g.add(objet(cylindre(0.012, 0.012, 0.25), FONTE, 0, 1.8, 0.2));
  g.add(objet(cylindre(0.09, 0.07, 0.22, 12, 0.02), MATIERE_LUEUR, 0, 1.58, 0.2));
  const halo = creerHalo(1.4);
  halo.position.set(0, 1.58, 0.25);
  g.add(halo);
  scene.add(g);

  // Un tas de minerai de cuivre, près de l'entrée.
  [[7.1, -2.6, 0.28], [7.5, -2.5, 0.22], [7.3, -2.2, 0.2], [6.9, -2.25, 0.18]].forEach(([x, z, r]) => {
    scene.add(objet(new THREE.IcosahedronGeometry(r, 0), matiere(COULEURS.cuivre, { flatShading: true }), x, r * 0.7, z));
  });
}

// --- Le wagonnet, sur ses petits rails qui sortent de la mine -------------------------
// Renvoie le wagonnet, avec « userData.reparer(oui) » : renversé et sans une
// roue avant la quête, remis sur ses rails et plein de cuivre après.
function construireWagonnet(scene, w) {
  // Les petits rails, du fond de la mine jusqu'au sud.
  const debut = -2.4;
  const fin = 3.2;
  for (const cote of [-1, 1]) {
    scene.add(objet(boite(0.06, 0.06, fin - debut, 0.02), '#8a857c', w.x + cote * 0.38, 0.08, (debut + fin) / 2));
  }
  for (let z = debut + 0.3; z < fin; z += 0.7) scene.add(objet(boite(1.0, 0.05, 0.16, 0.02), '#6b5543', w.x, 0.04, z));

  const g = new THREE.Group();
  g.position.set(w.x, 0, w.z);
  const caisse = new THREE.Group(); // ce qui penche quand il a déraillé
  g.add(caisse);
  caisse.add(objet(boite(0.85, 0.55, 1.25, 0.07), '#6b6660', 0, 0.6, 0, { ombre: true }));
  // Un cadre de laiton autour du bord.
  for (const cote of [-1, 1]) {
    caisse.add(objet(boite(0.06, 0.07, 1.33, 0.02), COULEURS.laiton, cote * 0.45, 0.89, 0));
    caisse.add(objet(boite(0.96, 0.07, 0.06, 0.02), COULEURS.laiton, 0, 0.89, cote * 0.64));
  }
  const roues = [];
  for (const x of [-0.45, 0.45]) {
    for (const z of [-0.42, 0.42]) {
      const roue = objet(cylindre(0.17, 0.17, 0.08, 16, 0.02), FONTE, x, 0.18, z);
      roue.rotation.z = Math.PI / 2;
      caisse.add(roue);
      roues.push(roue);
    }
  }
  // Le cuivre qui remplit le wagonnet (une fois réparé).
  const minerai = new THREE.Group();
  [[-0.2, -0.3], [0.15, -0.25], [0, 0.05], [-0.2, 0.3], [0.2, 0.3]].forEach(([x, z], i) => {
    minerai.add(objet(new THREE.IcosahedronGeometry(0.17 + (i % 2) * 0.04, 0), matiere(COULEURS.cuivre, { flatShading: true }), x, 0.92, z));
  });
  caisse.add(minerai);
  g.userData.reparer = (repare) => {
    caisse.rotation.z = repare ? 0 : 0.28; // il penche sur le côté
    caisse.position.y = repare ? 0 : 0.05;
    roues[3].visible = repare;               // il lui manque une roue
    minerai.visible = repare;
  };
  g.userData.reparer(false);
  scene.add(g);
  return g;
}

// -----------------------------------------------------------------------------
// Une pépite de cuivre à ramasser (comme les engrenages et les rouages).
// -----------------------------------------------------------------------------
const formePepite = new THREE.IcosahedronGeometry(0.22, 0);
const matierePepite = new THREE.MeshLambertMaterial({ color: '#d08a46', emissive: '#4a2a10', flatShading: true });
export function creerPepiteQuete() {
  const g = new THREE.Group();
  const support = new THREE.Group();
  support.position.y = 0.55;
  g.add(support);
  const pepite = new THREE.Mesh(formePepite, matierePepite);
  pepite.scale.set(1, 0.8, 1.1);
  support.add(pepite);
  const cercle = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 24),
    new THREE.MeshBasicMaterial({ color: '#f3dfb2', transparent: true, opacity: 0.75, depthWrite: false })
  );
  cercle.rotation.x = -Math.PI / 2;
  cercle.position.y = 0.07;
  g.add(cercle);
  g.userData = { support, roue: pepite };
  return g;
}
