// =============================================================================
// decor-gare.js — la gare à vapeur en 3D (version 1.2)
// -----------------------------------------------------------------------------
// La voie ferrée traverse le lieu au nord ; devant elle, le quai, avec la
// grande horloge, un banc et des lanternes. Le bâtiment de la gare est à
// l'ouest, le château d'eau à l'est. Sur la voie attend une locomotive verte
// et son wagon.
//
// Même principe que les autres lieux : des formes arrondies (formes.js), des
// couleurs douces, et les positions lues dans les données du lieu
// (logique-zones.js), pour que ce qu'on voit corresponde aux obstacles.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS, panneauTexte, construireHaies, construireArbres, construireBatiment, ajouterLampadaires } from './decor.js';
import { poteauIndicateur } from './decor-zones.js';
import { boite, cylindre, boule, tour } from './formes.js';
import { creerFumee, MATIERE_FENETRE } from './vie.js';

const FONTE = '#3f4a46';      // la fonte (métal sombre et doux)
const VERT_LOCO = '#5f8070';  // le vert de la locomotive
const ROUGE_ROUES = '#9a5a4c'; // les roues, d'un rouge doux

// -----------------------------------------------------------------------------
// Construction de toute la gare
// -----------------------------------------------------------------------------
// Renvoie ce que main.js anime : les aiguilles de l'horloge, le train, la fumée.
export function construireGare(scene, zone) {
  construireSol(scene);
  construireHaies(scene, zone);
  construireArbres(scene, zone);
  construireVoie(scene, zone.voie);
  ajouterLampadaires(scene, zone.lampadaires);
  poteauIndicateur(scene, 'MOULIN', -13.2, 2.4);

  // Le bâtiment de la gare, avec son enseigne et sa cheminée.
  const b = zone.batiments[0];
  const { groupe, avant, hauteurMurs } = construireBatiment(scene, b, {
    murs: b.murs,
    toit: b.toit,
    hauteurToit: 2.2,
    porteX: 0,
    fenetres: [-2.3, 2.3],
  });
  const enseigne = panneauTexte(b.enseigne, 2.0, 0.5);
  enseigne.position.set(0, 2.95, avant + 0.08);
  groupe.add(enseigne);
  groupe.add(objet(boite(0.55, 1.6, 0.55), COULEURS.brique, 2.2, 0.4 + hauteurMurs + 0.9, -0.4, { ombre: true }));
  const fumeeGare = creerFumee({ taille: 0.24, opacite: 0.45, periode: 8, nombre: 4 });
  fumeeGare.position.set(2.2, 0.4 + hauteurMurs + 1.75, -0.4);
  groupe.add(fumeeGare);

  for (const banc of zone.bancs) construireBanc(scene, banc);
  construireChateauEau(scene, zone.chateauEau);
  const horloge = construireHorloge(scene, zone.horloge);
  const train = construireTrain(scene, zone.locomotive);

  return { horloge, train, eau: [], vie: [fumeeGare, train.fumee] };
}

// --- Le sol : l'herbe, le chemin depuis le moulin, le quai -----------------------
function construireSol(scene) {
  const plat = (largeur, profondeur, couleur, x, y, z) => {
    const p = objet(new THREE.PlaneGeometry(largeur, profondeur), couleur, x, y, z, { recoit: true });
    p.rotation.x = -Math.PI / 2;
    scene.add(p);
  };
  plat(160, 160, COULEURS.herbe, 0, 0, 0);
  plat(10, 2.4, COULEURS.chemin, -9.5, 0.02, 0);   // le chemin qui vient du moulin
  plat(3, 4.6, COULEURS.chemin, -3.5, 0.025, -2.2); // jusqu'au quai
  plat(20.5, 2.1, '#cbbda3', 3.75, 0.03, -4.65);    // le quai, en pierre claire
  // La bordure du quai, le long de la voie.
  scene.add(objet(boite(20.5, 0.2, 0.3, 0.06), COULEURS.pierre, 3.75, 0.1, -5.75, { recoit: true }));
}

// --- La voie ferrée : le ballast, les traverses en bois, deux rails ----------------
function construireVoie(scene, voie) {
  const longueur = 90;
  const ballast = objet(new THREE.PlaneGeometry(longueur, 2.4), '#a89a86', 0, 0.025, voie.z, { recoit: true });
  ballast.rotation.x = -Math.PI / 2;
  scene.add(ballast);
  // Les traverses : une centaine de copies dessinées d'un coup (InstancedMesh).
  const nombre = Math.floor(longueur / 0.9);
  const traverses = new THREE.InstancedMesh(boite(0.32, 0.08, 2.0, 0.03), new THREE.MeshLambertMaterial({ color: '#6b5543' }), nombre);
  const m = new THREE.Matrix4();
  for (let i = 0; i < nombre; i++) {
    m.makeTranslation(-longueur / 2 + i * 0.9 + 0.45, 0.06, voie.z);
    traverses.setMatrixAt(i, m);
  }
  traverses.receiveShadow = true;
  scene.add(traverses);
  for (const cote of [-1, 1]) {
    scene.add(objet(boite(longueur, 0.1, 0.09, 0.03), '#8a857c', 0, 0.15, voie.z + cote * 0.6));
  }
}

// --- Un banc en bois ------------------------------------------------------------------
function construireBanc(scene, b) {
  const g = new THREE.Group();
  g.position.set(b.x, 0, b.z);
  g.add(objet(boite(b.largeur, 0.08, 0.42, 0.03), COULEURS.boisClair, 0, 0.45, 0));
  g.add(objet(boite(b.largeur, 0.34, 0.06, 0.025), COULEURS.boisClair, 0, 0.75, -0.2));
  for (const cote of [-1, 1]) g.add(objet(boite(0.08, 0.45, 0.4, 0.03), FONTE, cote * (b.largeur / 2 - 0.12), 0.22, 0));
  scene.add(g);
}

// --- Le château d'eau : un grand réservoir de bois cerclé de laiton -------------------
function construireChateauEau(scene, c) {
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pied = objet(cylindre(0.07, 0.09, 2.4), FONTE, px * 0.55, 1.2, pz * 0.55, { ombre: true });
    g.add(pied);
  }
  g.add(objet(cylindre(0.95, 0.95, 1.5), '#8a6a50', 0, 3.05, 0, { ombre: true }));
  for (const y of [2.55, 3.55]) {
    const cercle = objet(new THREE.TorusGeometry(0.96, 0.04, 6, 32), COULEURS.laiton, 0, y, 0);
    cercle.rotation.x = Math.PI / 2;
    g.add(cercle);
  }
  g.add(objet(new THREE.ConeGeometry(1.1, 0.7, 20), COULEURS.vertDeGris, 0, 4.15, 0));
  // Le bec verseur, tourné vers la voie.
  const bec = objet(cylindre(0.1, 0.1, 1.3), FONTE, 0, 2.6, -1.1);
  bec.rotation.x = 0.9;
  g.add(bec);
  scene.add(g);
}

// --- La grande horloge du quai -------------------------------------------------------
// Renvoie les aiguilles (main.js les fait tourner une fois l'horloge réparée).
function construireHorloge(scene, h) {
  const g = new THREE.Group();
  g.position.set(h.x, 0, h.z);
  g.add(objet(cylindre(0.22, 0.28, 0.25), FONTE, 0, 0.12, 0));
  g.add(objet(cylindre(0.08, 0.1, 2.9), FONTE, 0, 1.6, 0, { ombre: true }));
  // Le cadran, tourné vers la caméra (vers le sud).
  const tete = new THREE.Group();
  tete.position.y = 3.35;
  g.add(tete);
  const boitier = objet(cylindre(0.56, 0.56, 0.2, 28, 0.06), COULEURS.cuivre, 0, 0, 0, { ombre: true });
  boitier.rotation.x = Math.PI / 2;
  tete.add(boitier);
  const cadran = new THREE.Mesh(
    new THREE.CircleGeometry(0.47, 32),
    new THREE.MeshLambertMaterial({ color: '#f3ead6', emissive: '#3a3226' })
  );
  cadran.position.z = 0.105;
  tete.add(cadran);
  // Les douze repères des heures.
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const repere = objet(boite(0.035, i % 3 === 0 ? 0.09 : 0.055, 0.02, 0.008), FONTE, Math.sin(angle) * 0.39, Math.cos(angle) * 0.39, 0.115);
    repere.rotation.z = -angle;
    tete.add(repere);
  }
  // Les aiguilles : chacune tourne autour du centre du cadran.
  const aiguille = (longueur, largeur, z) => {
    const pivot = new THREE.Group();
    pivot.position.z = z;
    const a = objet(boite(largeur, longueur, 0.015, 0.006), FONTE, 0, longueur / 2 - 0.04, 0);
    pivot.add(a);
    tete.add(pivot);
    return pivot;
  };
  const heures = aiguille(0.26, 0.05, 0.125);
  const minutes = aiguille(0.38, 0.032, 0.135);
  tete.add(objet(boule(0.035, 1), COULEURS.laiton, 0, 0, 0.145));
  // Arrêtée à quatre heures dix (en attendant la réparation).
  heures.rotation.z = -((4 + 10 / 60) / 12) * Math.PI * 2;
  minutes.rotation.z = -(10 / 60) * Math.PI * 2;
  // Une petite couronne de laiton au sommet.
  tete.add(objet(boule(0.07, 1), COULEURS.laiton, 0, 0.62, 0));
  scene.add(g);
  return { heures, minutes };
}

// --- Le train : une locomotive à vapeur et un wagon de voyageurs ----------------------
// La locomotive regarde vers l'est (+x). Renvoie { groupe, roues, fumee, sifflet }.
export function construireTrain(scene, position) {
  const groupe = new THREE.Group();
  groupe.position.set(position.x, 0, position.z);
  const roues = [];

  // Une roue (avec un rayon visible, pour qu'on la voie tourner).
  function roue(parent, x, z, rayon, couleur = ROUGE_ROUES) {
    const pivot = new THREE.Group();
    pivot.position.set(x, rayon + 0.02, z);
    const disque = objet(cylindre(rayon, rayon, 0.12, 20, 0.03), couleur, 0, 0, 0);
    disque.rotation.x = Math.PI / 2;
    pivot.add(disque);
    pivot.add(objet(boite(rayon * 1.7, 0.07, 0.14, 0.02), FONTE, 0, 0, z > 0 ? 0.02 : -0.02));
    pivot.add(objet(boule(rayon * 0.25, 1), COULEURS.laiton, 0, 0, z > 0 ? 0.07 : -0.07));
    pivot.userData.rayon = rayon;
    parent.add(pivot);
    roues.push(pivot);
  }

  // --- La locomotive ---
  const loco = new THREE.Group();
  groupe.add(loco);
  loco.add(objet(boite(5.0, 0.32, 1.4, 0.08), FONTE, 0.2, 0.62, 0, { ombre: true }));      // le châssis
  const chaudiere = objet(cylindre(0.62, 0.62, 3.0, 20, 0.08), VERT_LOCO, 0.8, 1.42, 0, { ombre: true });
  chaudiere.rotation.z = Math.PI / 2;
  loco.add(chaudiere);
  for (const x of [-0.2, 0.8, 1.8]) {                                                     // les cercles de laiton
    const cercle = objet(new THREE.TorusGeometry(0.63, 0.035, 6, 28), COULEURS.laiton, x, 1.42, 0);
    cercle.rotation.y = Math.PI / 2;
    loco.add(cercle);
  }
  const avant = objet(cylindre(0.64, 0.64, 0.35, 20, 0.08), FONTE, 2.4, 1.42, 0);       // la boîte à fumée
  avant.rotation.z = Math.PI / 2;
  loco.add(avant);
  const phare = objet(boule(0.13, 2), MATIERE_FENETRE, 2.62, 1.75, 0);                    // le phare
  loco.add(phare);
  // La cheminée, évasée en haut, avec une couronne de cuivre.
  loco.add(objet(tour([[0.16, 0], [0.18, 0.3], [0.26, 0.62], [0.3, 0.72], [0.22, 0.75], [0, 0.75]], 16), FONTE, 2.0, 1.95, 0));
  loco.add(objet(new THREE.TorusGeometry(0.28, 0.04, 6, 20), COULEURS.cuivre, 2.0, 2.7, 0).rotateX(Math.PI / 2));
  loco.add(objet(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), COULEURS.laiton, 0.7, 1.98, 0)); // le dôme
  // La cabine du mécanicien.
  loco.add(objet(boite(1.5, 1.5, 1.5, 0.1), VERT_LOCO, -1.45, 1.55, 0, { ombre: true }));
  loco.add(objet(boite(1.8, 0.12, 1.75, 0.05), FONTE, -1.45, 2.36, 0));
  for (const z of [-0.76, 0.76]) loco.add(objet(boite(0.6, 0.5, 0.04, 0.02), MATIERE_FENETRE, -1.35, 1.8, z));
  // Le sifflet de laiton (on ne le voit qu'une fois installé).
  const sifflet = objet(cylindre(0.05, 0.07, 0.3), COULEURS.laiton, -0.4, 2.2, 0);
  loco.add(sifflet);
  sifflet.visible = false;
  // Le pare-chocs à l'avant.
  loco.add(objet(boite(0.16, 0.3, 1.5, 0.05), '#8f4f45', 2.75, 0.7, 0));
  for (const z of [-0.5, 0.5]) loco.add(objet(cylindre(0.1, 0.1, 0.18).rotateZ(Math.PI / 2), FONTE, 2.9, 0.75, z));
  // Les grandes roues.
  for (const x of [-1.2, 0.2, 1.6]) for (const z of [-0.75, 0.75]) roue(loco, x, z, 0.44);

  // --- Le wagon de voyageurs ---
  const wagon = new THREE.Group();
  wagon.position.x = -4.6;
  groupe.add(wagon);
  wagon.add(objet(boite(3.8, 0.25, 1.4, 0.06), FONTE, 0, 0.55, 0));
  wagon.add(objet(boite(3.7, 1.35, 1.5, 0.1), '#9a7a5e', 0, 1.35, 0, { ombre: true }));
  wagon.add(objet(boite(3.95, 0.22, 1.7, 0.1), '#6f5a48', 0, 2.1, 0));
  for (const x of [-1.2, 0, 1.2]) for (const z of [-0.76, 0.76]) wagon.add(objet(boite(0.7, 0.5, 0.04, 0.02), MATIERE_FENETRE, x, 1.5, z));
  for (const x of [-1.2, 1.2]) for (const z of [-0.72, 0.72]) roue(wagon, x, z, 0.32, FONTE);
  // L'attelage entre la locomotive et le wagon.
  groupe.add(objet(boite(0.8, 0.12, 0.2, 0.04), FONTE, -2.55, 0.6, 0));

  // La fumée de la locomotive (éteinte tant qu'elle n'est pas réparée).
  const fumee = creerFumee({ taille: 0.4, nombre: 7, periode: 4.5, hauteur: 3, opacite: 0.6, force: 0 });
  fumee.position.set(2.0, 2.75, 0);
  loco.add(fumee);

  scene.add(groupe);
  return { groupe, roues, fumee, sifflet, depart: position.x };
}
