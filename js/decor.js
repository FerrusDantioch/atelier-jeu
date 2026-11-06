// =============================================================================
// decor.js — construit la place du village en 3D, avec des formes simples
// -----------------------------------------------------------------------------
// Tout est fait avec des formes de base (boîtes, cylindres, boules…) aux bords
// ARRONDIS (voir formes.js) : un style doux, comme des jouets en bois.
// Aucune image ni fichier 3D externe n'est nécessaire.
//
// Les positions viennent de MONDE (dans logique.js) : ainsi, ce qu'on voit
// correspond exactement aux obstacles utilisés pour les collisions.
//
// Pour que le jeu reste fluide sur téléphone :
//   - les objets répétés (arbres, buissons, pavés) sont des « InstancedMesh » :
//     des centaines de copies dessinées en une seule fois ;
//   - les matières (couleurs) sont partagées et réutilisées ;
//   - seuls les bâtiments projettent une ombre (et les personnages, ailleurs).
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { boite, cylindre, boule } from './formes.js';
import { EAU_CALME, creerRonds } from './eau.js';
import { MATIERE_FENETRE, MATIERE_LUEUR, matiereFeuillage, creerFumee, creerLampadaire, creerLucioles } from './vie.js';
import { gelule } from './formes.js';

// ----------------------------------------------------------------------------
// Petits outils communs
// ----------------------------------------------------------------------------

// Une « matière » = la couleur et l'aspect d'une surface. On les garde en
// mémoire pour ne jamais créer deux fois la même (économie de mémoire).
const matieres = new Map();
export function matiere(couleur, options = {}) {
  const cle = couleur + JSON.stringify(options);
  if (!matieres.has(cle)) {
    // « Lambert » = un éclairage simple et doux, rapide à calculer.
    // L'ombrage est « lisse » : la lumière glisse en douceur sur les arrondis
    // (au lieu de petites facettes bien nettes).
    matieres.set(cle, new THREE.MeshLambertMaterial({ color: couleur, ...options }));
  }
  return matieres.get(cle);
}

// Crée un objet 3D (une forme + une matière) et le place.
export function objet(forme, couleur, x = 0, y = 0, z = 0, options = {}) {
  const maillage = new THREE.Mesh(forme, typeof couleur === 'string' ? matiere(couleur) : couleur);
  maillage.position.set(x, y, z);
  if (options.ombre) maillage.castShadow = true;
  if (options.recoit) maillage.receiveShadow = true;
  return maillage;
}

// Un toit à deux pans, avec le faîte (la ligne du haut) orienté vers la caméra.
// - le « pignon » : le triangle de mur sous le toit (même couleur que les murs) ;
// - les deux « pans » : deux planches inclinées qui dépassent un peu des murs.
// Le soleil venant de la gauche, le pan gauche est plus clair que le droit :
// on comprend tout de suite la forme du toit.
export function ajouterToit(parent, largeur, profondeur, hauteur, y, couleurToit, couleurPignon, ombre = false) {
  const triangle = new THREE.Shape();
  triangle.moveTo(-largeur / 2, 0);
  triangle.lineTo(largeur / 2, 0);
  triangle.lineTo(0, hauteur);
  triangle.closePath();
  const formePignon = new THREE.ExtrudeGeometry(triangle, { depth: profondeur, bevelEnabled: false });
  formePignon.translate(0, 0, -profondeur / 2);
  parent.add(objet(formePignon, couleurPignon, 0, y, 0, { ombre, recoit: true }));

  const debord = 0.4;
  const angle = Math.atan2(hauteur, largeur / 2);
  const demi = largeur / 2 + debord;               // largeur horizontale d'un pan
  const longueur = demi / Math.cos(angle);          // longueur réelle de la planche
  const formePan = boite(longueur, 0.16, profondeur + debord * 2, 0.07);
  for (const cote of [-1, 1]) {
    const pan = objet(formePan, couleurToit, cote * demi / 2, y + hauteur - (demi / 2) * Math.tan(angle) + 0.08, 0, { ombre, recoit: true });
    pan.rotation.z = -cote * angle;
    parent.add(pan);
  }
}

// Un engrenage plat (avec des dents et un trou au milieu). Partagé entre les
// engrenages de la quête et la décoration.
export function formeEngrenage(rayon = 0.32, dents = 8, epaisseur = 0.09) {
  const contour = new THREE.Shape();
  const pas = (Math.PI * 2) / (dents * 4);
  for (let i = 0; i < dents * 4; i++) {
    // On alterne : bas de dent, haut de dent, haut de dent, bas de dent…
    const r = i % 4 === 1 || i % 4 === 2 ? rayon : rayon * 0.76;
    const angle = i * pas;
    if (i === 0) contour.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else contour.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  contour.closePath();
  const trou = new THREE.Path();
  trou.absarc(0, 0, rayon * 0.3, 0, Math.PI * 2, true);
  contour.holes.push(trou);
  // Un léger biseau arrondit les bords des dents.
  const forme = new THREE.ExtrudeGeometry(contour, {
    depth: epaisseur * 0.5,
    bevelEnabled: true,
    bevelThickness: epaisseur * 0.25,
    bevelSize: rayon * 0.04,
    bevelSegments: 2,
    curveSegments: 12,
  });
  forme.center();
  return forme;
}

// Un panneau avec du texte (« ATELIER ») : on dessine le texte sur une petite
// image (un « canvas »), puis on l'applique sur un rectangle.
export function panneauTexte(texte, largeur, hauteur) {
  const toile = document.createElement('canvas');
  toile.width = 256;
  toile.height = 64;
  const ctx = toile.getContext('2d');
  ctx.fillStyle = '#5e4330';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#c48a4a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 58);
  ctx.fillStyle = '#f1dcb2';
  // Un texte long (« MINE DE CUIVRE ») est écrit un peu plus petit pour tenir.
  let taille = 34;
  ctx.font = `bold ${taille}px Georgia, serif`;
  while (taille > 14 && ctx.measureText(texte).width > 228) {
    taille -= 2;
    ctx.font = `bold ${taille}px Georgia, serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texte, 128, 34);
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshLambertMaterial({ map: texture })
  );
}

// Un petit générateur de « hasard » qui donne toujours la même suite de nombres :
// les arbres et buissons ont donc toujours la même allure d'une partie à l'autre.
export function creerHasard(graine) {
  let valeur = graine;
  return () => {
    valeur = (valeur * 16807) % 2147483647;
    return (valeur - 1) / 2147483646;
  };
}

// ----------------------------------------------------------------------------
// Les couleurs du décor : douces, chaudes, peu saturées.
// ----------------------------------------------------------------------------
export const COULEURS = {
  herbe: '#a7b47c',
  pavage: '#cdbc9e',
  pave: '#bba98a',
  chemin: '#c5b391',
  pierre: '#a99d8d',
  boisClair: '#9a7652',
  boisFonce: '#5e4330',
  brique: '#b67a5c',
  cuivre: '#b87333',
  vertDeGris: '#86a597',
  creme: '#e7d6b4',
  tuile: '#ab6c52',
  haie: '#7d995e',
  buisson: '#88a567',
  feuillage: '#83a25e',
  feuillageClair: '#98b46d',
  tronc: '#7a5a3f',
  eau: '#5d7d7c',
  metal: '#6b6660',
  laiton: '#c99a4a',
  fenetre: '#f0cf8c',
};

// Les fenêtres ont une lueur chaude et douce (elles ne brillent pas fort le
// jour, un peu plus la nuit : voir vie.js).
const matiereFenetre = MATIERE_FENETRE;

// Une porte au sommet arrondi (en arc), aux bords adoucis.
function formePorte(largeur, hauteur, epaisseur) {
  const contour = new THREE.Shape();
  const r = largeur / 2;
  contour.moveTo(-r, 0);
  contour.lineTo(r, 0);
  contour.lineTo(r, hauteur - r);
  contour.absarc(0, hauteur - r, r, 0, Math.PI, false);
  contour.lineTo(-r, 0);
  const forme = new THREE.ExtrudeGeometry(contour, {
    depth: epaisseur * 0.5,
    bevelEnabled: true,
    bevelThickness: epaisseur * 0.25,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 16,
  });
  forme.translate(0, -hauteur / 2, -epaisseur * 0.25);
  return forme;
}

// ----------------------------------------------------------------------------
// Construction de toute la place
// ----------------------------------------------------------------------------
// Renvoie quelques objets que main.js doit pouvoir modifier pendant le jeu
// (la lampe de l'établi, la lanterne d'Odile, le rouage de l'établi, les
// améliorations de l'atelier).
export function construireDecor(scene, monde) {
  construireSol(scene, monde);
  const portail = construireHaies(scene, monde);
  construireArbres(scene, monde);
  const eau = [construirePuits(scene, monde.puits)];
  const fumeeAtelier = construireAtelier(scene, monde.atelier);
  const fumeeOdile = construireMaisonOdile(scene, monde.maisonOdile);
  ajouterLampadaires(scene, monde.lampadaires);
  const lampeEtabli = construireEtabli(scene, monde.etabli);
  const lanterneOdile = construireLanterneOdile(scene, monde.maisonOdile);
  construireComptoir(scene, monde.comptoir);
  const rouageEtabli = construireRouageEtabli(scene, monde.etabli);
  const ameliorations = construireAmeliorations(scene, monde);
  // Les lucioles, la nuit, près des arbres du sud de la place (version 1.3).
  const lucioles = creerLucioles({ x: 0, z: 8.6, largeur: 26, profondeur: 3, nombre: 8, graine: 2 });
  scene.add(lucioles);
  // « eau » et « vie » : ce qui s'anime dans ce lieu (main.js les fait vivre).
  const vie = [fumeeAtelier, fumeeOdile, lucioles, ameliorations['plans-automate']];
  return { lampeEtabli, lanterneOdile, rouageEtabli, ameliorations, portail, eau, vie, fumeeAtelier };
}

// Les lanternes sur leur poteau (elles s'allument le soir : voir vie.js).
export function ajouterLampadaires(scene, liste = []) {
  for (const l of liste) {
    const lampadaire = creerLampadaire();
    lampadaire.position.set(l.x, 0, l.z);
    scene.add(lampadaire);
  }
}

// --- Le sol : l'herbe, la place pavée et les chemins -------------------------
function construireSol(scene, monde) {
  // Une grande étendue d'herbe, qui se perd dans la brume au loin.
  const herbe = objet(new THREE.PlaneGeometry(160, 160), COULEURS.herbe, 0, 0, 0, { recoit: true });
  herbe.rotation.x = -Math.PI / 2;
  scene.add(herbe);

  // Les chemins (légèrement au-dessus de l'herbe pour ne pas « clignoter »).
  const chemins = [
    // [x, z, largeur, profondeur]
    [monde.atelier.x, -4.5, 2.4, 6],     // vers la porte de l'atelier
    [monde.maisonOdile.x, -4.5, 2.2, 6], // vers la porte d'Odile
    [0, 9.5, 2.6, 6],                    // vers le portail du sud
  ];
  for (const [x, z, l, p] of chemins) {
    const chemin = objet(new THREE.PlaneGeometry(l, p), COULEURS.chemin, x, 0.02, z, { recoit: true });
    chemin.rotation.x = -Math.PI / 2;
    scene.add(chemin);
  }

  // La place ronde, pavée, autour du puits.
  const place = objet(new THREE.CircleGeometry(7.5, 56), COULEURS.pavage, monde.puits.x, 0.04, monde.puits.z, { recoit: true });
  place.rotation.x = -Math.PI / 2;
  scene.add(place);

  // Quelques pavés plus foncés, ronds comme des galets, tous dessinés d'un coup (InstancedMesh).
  const hasard = creerHasard(7);
  const nombre = 46;
  const paves = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.34, 0.05, 12), matiere(COULEURS.pave), nombre);
  const m = new THREE.Matrix4();
  let i = 0;
  while (i < nombre) {
    const angle = hasard() * Math.PI * 2;
    const distance = 1.8 + hasard() * 5.3;
    const x = monde.puits.x + Math.cos(angle) * distance;
    const z = monde.puits.z + Math.sin(angle) * distance;
    const echelle = 0.7 + hasard() * 0.6;
    m.compose(new THREE.Vector3(x, 0.055, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hasard() * 3, 0)), new THREE.Vector3(echelle, 1, echelle));
    paves.setMatrixAt(i++, m);
  }
  paves.receiveShadow = true;
  scene.add(paves);
}

// --- Les haies et le portail ---------------------------------------------------
export function construireHaies(scene, monde) {
  const hauteur = 1.3;
  const hasard = creerHasard(21);
  const positionsBuissons = [];

  for (const h of monde.haies) {
    const haie = objet(boite(h.largeur, hauteur, h.profondeur, 0.45), COULEURS.haie, h.x, hauteur / 2, h.z, { recoit: true });
    scene.add(haie);
    // Des « boules » de feuillage le long du dessus, pour un aspect plus naturel.
    const longueur = Math.max(h.largeur, h.profondeur);
    const surX = h.largeur > h.profondeur;
    for (let d = -longueur / 2 + 0.6; d <= longueur / 2 - 0.4; d += 1.25) {
      positionsBuissons.push([surX ? h.x + d : h.x, hauteur - 0.05, surX ? h.z : h.z + d, 0.55 + hasard() * 0.2]);
    }
  }

  const buissons = new THREE.InstancedMesh(boule(1, 1), matiereFeuillage(COULEURS.buisson, 0.5), positionsBuissons.length);
  const m = new THREE.Matrix4();
  positionsBuissons.forEach(([x, y, z, r], i) => {
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hasard() * 3, 0)), new THREE.Vector3(r, r * 0.8, r));
    buissons.setMatrixAt(i, m);
  });
  scene.add(buissons);

  // Le portail en bois de la place (seulement s'il y en a un dans ce lieu).
  // Les planches sont dans un groupe « battants » : on les cache quand le
  // portail est ouvert (étape 3), il ne reste que les deux poteaux.
  const p = monde.portail;
  if (!p) return null;
  const portail = new THREE.Group();
  portail.position.set(p.x, 0, p.z);
  const poteau = boite(0.3, 1.7, 0.3);
  portail.add(objet(poteau, COULEURS.boisFonce, -p.largeur / 2, 0.85, 0));
  portail.add(objet(poteau, COULEURS.boisFonce, p.largeur / 2, 0.85, 0));
  const battants = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    // Les planches verticales.
    battants.add(objet(boite(0.36, 1.25, 0.08), COULEURS.boisClair, -1.12 + i * 0.45, 0.72, 0));
  }
  const traverse = boite(p.largeur - 0.3, 0.12, 0.12);
  battants.add(objet(traverse, COULEURS.boisFonce, 0, 0.4, 0.06));
  battants.add(objet(traverse, COULEURS.boisFonce, 0, 1.05, 0.06));
  portail.add(battants);
  scene.add(portail);
  return battants;
}

// --- Les arbres ----------------------------------------------------------------
export function construireArbres(scene, monde) {
  const n = monde.arbres.length;
  const troncs = new THREE.InstancedMesh(cylindre(0.17, 0.25, 1.5), matiere(COULEURS.tronc), n);
  const bas = new THREE.InstancedMesh(boule(1.35, 2), matiereFeuillage(COULEURS.feuillage), n);
  const haut = new THREE.InstancedMesh(boule(0.95, 2), matiereFeuillage(COULEURS.feuillageClair, 1.4), n);
  const hasard = creerHasard(3);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();

  monde.arbres.forEach((a, i) => {
    const taille = 0.85 + hasard() * 0.35;
    q.setFromEuler(new THREE.Euler(0, hasard() * Math.PI, 0));
    m.compose(new THREE.Vector3(a.x, 0.75 * taille, a.z), q, new THREE.Vector3(taille, taille, taille));
    troncs.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(a.x, 2.1 * taille, a.z), q, new THREE.Vector3(taille, taille, taille));
    bas.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(a.x + 0.15, 3.0 * taille, a.z - 0.1), q, new THREE.Vector3(taille, taille, taille));
    haut.setMatrixAt(i, m);
  });
  // Les arbres ne projettent pas d'ombre (pour garder le jeu fluide).
  scene.add(troncs, bas, haut);
}

// --- Le puits -------------------------------------------------------------------
// Renvoie les ronds dans l'eau du puits (que main.js anime).
function construirePuits(scene, puits) {
  const g = new THREE.Group();
  g.position.set(puits.x, 0, puits.z);
  g.add(objet(cylindre(1.15, 1.25, 0.9), COULEURS.pierre, 0, 0.45, 0));
  // La margelle : un gros anneau de pierre bien rond.
  const margelle = objet(new THREE.TorusGeometry(1.03, 0.14, 10, 40), COULEURS.pierre, 0, 0.9, 0);
  margelle.rotation.x = Math.PI / 2;
  g.add(margelle);
  // L'eau (qui ondule) et ses petits ronds.
  const eau = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), EAU_CALME);
  eau.rotation.x = -Math.PI / 2;
  eau.position.y = 0.91;
  g.add(eau);
  const ronds = creerRonds({ rayonDepart: 0.1, rayonFin: 0.85, nombre: 2, duree: 5, opacite: 0.35 });
  ronds.position.y = 0.915;
  g.add(ronds);
  const poteau = boite(0.18, 1.9, 0.18);
  g.add(objet(poteau, COULEURS.boisFonce, -1.0, 1.4, 0));
  g.add(objet(poteau, COULEURS.boisFonce, 1.0, 1.4, 0));
  ajouterToit(g, 2.2, 1.4, 0.75, 2.3, COULEURS.tuile, COULEURS.boisFonce);
  // La manivelle et le seau.
  const axe = objet(cylindre(0.07, 0.07, 2.0), COULEURS.boisClair, 0, 1.85, 0);
  axe.rotation.z = Math.PI / 2;
  g.add(axe);
  g.add(objet(cylindre(0.2, 0.16, 0.3), COULEURS.cuivre, 0.3, 1.35, 0));
  scene.add(g);
  return ronds;
}

// --- Un bâtiment générique (murs, socle, toit, porte, fenêtres) ----------------
export function construireBatiment(scene, b, couleurs) {
  const g = new THREE.Group();
  g.position.set(b.x, 0, b.z);
  const hauteurMurs = 3.0;
  const avant = b.profondeur / 2; // la façade (côté sud, face à la caméra)

  // Le socle en pierre et les murs.
  g.add(objet(boite(b.largeur + 0.2, 0.4, b.profondeur + 0.2, 0.12), COULEURS.pierre, 0, 0.2, 0, { ombre: true, recoit: true }));
  g.add(objet(boite(b.largeur, hauteurMurs, b.profondeur, 0.18), couleurs.murs, 0, 0.4 + hauteurMurs / 2, 0, { ombre: true, recoit: true }));

  // Le toit, qui dépasse un peu des murs.
  ajouterToit(g, b.largeur, b.profondeur, couleurs.hauteurToit, 0.4 + hauteurMurs, couleurs.toit, couleurs.murs, true);

  // La porte, en arc.
  g.add(objet(formePorte(1.3, 2.1, 0.12), COULEURS.boisFonce, couleurs.porteX, 1.45, avant + 0.05, { recoit: true }));
  g.add(objet(boule(0.06, 1), COULEURS.laiton, couleurs.porteX + 0.45, 1.4, avant + 0.14));

  // Les fenêtres (avec un encadrement en bois).
  for (const fx of couleurs.fenetres) {
    g.add(objet(boite(1.25, 1.05, 0.08), COULEURS.boisFonce, fx, 2.05, avant + 0.03));
    g.add(objet(boite(1.05, 0.85, 0.08), matiereFenetre, fx, 2.05, avant + 0.07));
    g.add(objet(boite(0.06, 0.85, 0.1), COULEURS.boisFonce, fx, 2.05, avant + 0.09));
  }

  scene.add(g);
  return { groupe: g, avant, hauteurMurs };
}

// --- L'atelier de Ferrus ----------------------------------------------------------
function construireAtelier(scene, atelier) {
  const porteX = 0;
  const { groupe, avant, hauteurMurs } = construireBatiment(scene, atelier, {
    murs: COULEURS.brique,
    toit: COULEURS.vertDeGris, // un toit en cuivre patiné (vert-de-gris)
    hauteurToit: 2.4,
    porteX,
    fenetres: [-2.6, 2.4],
  });

  // Le panneau « ATELIER » au-dessus de la porte.
  const panneau = panneauTexte('ATELIER', 2.4, 0.6);
  panneau.position.set(porteX, 2.95, avant + 0.08);
  groupe.add(panneau);

  // Deux engrenages décoratifs de part et d'autre du panneau.
  const deco = formeEngrenage(0.3, 8, 0.06);
  groupe.add(objet(deco, COULEURS.laiton, porteX - 1.5, 2.95, avant + 0.06));
  groupe.add(objet(deco, COULEURS.cuivre, porteX + 1.5, 2.95, avant + 0.06));

  // La cheminée en cuivre, et un tuyau le long du mur.
  groupe.add(objet(cylindre(0.32, 0.36, 2.4), COULEURS.cuivre, -2.6, 0.4 + hauteurMurs + 1.4, -1.2, { ombre: true }));
  groupe.add(objet(cylindre(0.42, 0.42, 0.18), '#8a5427', -2.6, 0.4 + hauteurMurs + 2.6, -1.2));
  groupe.add(objet(cylindre(0.09, 0.09, 3.0), COULEURS.cuivre, -atelier.largeur / 2 + 0.25, 1.9, avant + 0.12));
  // La fumée de la forge (plus épaisse pendant une fabrication : voir main.js).
  const fumee = creerFumee({ taille: 0.32, force: 0.6 });
  fumee.position.set(-2.6, 0.4 + hauteurMurs + 2.75, -1.2);
  groupe.add(fumee);
  return fumee;
}

// --- La maison d'Odile --------------------------------------------------------------
function construireMaisonOdile(scene, maison) {
  const { groupe, avant, hauteurMurs } = construireBatiment(scene, maison, {
    murs: COULEURS.creme,
    toit: COULEURS.tuile,
    hauteurToit: 2.2,
    porteX: 0,
    fenetres: [-1.9, 1.9],
  });
  // Des jardinières fleuries sous les fenêtres.
  for (const fx of [-1.9, 1.9]) {
    groupe.add(objet(boite(1.2, 0.22, 0.3), COULEURS.boisClair, fx, 1.42, avant + 0.15));
    for (let i = 0; i < 3; i++) {
      groupe.add(objet(boule(0.14, 1), i % 2 ? '#d9a08f' : '#e2c27e', fx - 0.35 + i * 0.35, 1.6, avant + 0.17));
    }
  }
  // Une petite cheminée en briques.
  groupe.add(objet(boite(0.6, 1.6, 0.6), COULEURS.brique, 1.8, 0.4 + hauteurMurs + 1.1, -0.9, { ombre: true }));
  // Un petit feu chez Odile : une fumée légère.
  const fumee = creerFumee({ taille: 0.24, opacite: 0.45, periode: 8, nombre: 4 });
  fumee.position.set(1.8, 0.4 + hauteurMurs + 1.95, -0.9);
  groupe.add(fumee);
  return fumee;
}

// --- La lampe à vapeur (sur l'établi, puis chez Odile) -----------------------------
// Une lampe = un socle, un globe de verre, un chapeau et une anse.
export function creerLampe() {
  const lampe = new THREE.Group();
  lampe.add(objet(cylindre(0.16, 0.2, 0.1), COULEURS.laiton, 0, 0.05, 0));
  // Le globe a sa propre matière : on change sa couleur quand la lampe s'allume.
  const verre = new THREE.Mesh(
    boule(0.19, 2),
    new THREE.MeshLambertMaterial({ color: '#b8ad94', emissive: '#000000' })
  );
  verre.position.y = 0.27;
  lampe.add(verre);
  lampe.add(objet(new THREE.ConeGeometry(0.17, 0.14, 16), COULEURS.cuivre, 0, 0.5, 0));
  const anse = objet(new THREE.TorusGeometry(0.08, 0.018, 8, 20), COULEURS.cuivre, 0, 0.62, 0);
  lampe.add(anse);
  lampe.userData.verre = verre;
  return lampe;
}

// Allume (lueur dorée douce) ou éteint (verre terne) une lampe.
export function allumerLampe(lampe, allumee) {
  const verre = lampe.userData.verre.material;
  verre.color.set(allumee ? '#ffe2a6' : '#b8ad94');
  verre.emissive.set(allumee ? '#b07a2c' : '#000000');
}

// --- L'établi devant l'atelier --------------------------------------------------------
function construireEtabli(scene, etabli) {
  const g = new THREE.Group();
  g.position.set(etabli.x, 0, etabli.z);
  const l = etabli.largeur;
  const p = etabli.profondeur;
  // Le plateau et les pieds.
  g.add(objet(boite(l, 0.12, p), COULEURS.boisClair, 0, 0.92, 0));
  const pied = boite(0.12, 0.88, 0.12);
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(objet(pied, COULEURS.boisFonce, px * (l / 2 - 0.12), 0.44, pz * (p / 2 - 0.12)));
  }
  g.add(objet(boite(l - 0.3, 0.08, p - 0.3), COULEURS.boisFonce, 0, 0.3, 0));
  // Un étau en métal, et quelques outils.
  g.add(objet(boite(0.3, 0.22, 0.26), COULEURS.metal, -0.85, 1.09, 0.15));
  g.add(objet(boite(0.5, 0.05, 0.08), COULEURS.metal, -0.2, 1.0, 0.25));
  g.add(objet(cylindre(0.05, 0.05, 0.4), COULEURS.cuivre, 0.05, 1.0, -0.2).rotateZ(Math.PI / 2));
  scene.add(g);

  // La lampe à réparer, posée sur l'établi.
  const lampe = creerLampe();
  lampe.position.set(etabli.x + 0.6, 0.98, etabli.z);
  scene.add(lampe);
  return lampe;
}

// --- La lanterne d'Odile (visible une fois la lampe livrée) ----------------------------
function construireLanterneOdile(scene, maison) {
  const g = new THREE.Group();
  const avant = maison.z + maison.profondeur / 2;
  // Une petite potence en bois fixée contre le mur, à droite de la porte.
  g.position.set(maison.x + 1.05, 0, avant + 0.08);
  g.add(objet(boite(0.12, 1.0, 0.1), COULEURS.boisFonce, 0, 2.3, 0));
  g.add(objet(boite(0.1, 0.1, 0.5), COULEURS.boisFonce, 0, 2.75, 0.25));
  const lampe = creerLampe();
  lampe.position.set(0, 2.05, 0.42);
  g.add(lampe);
  allumerLampe(lampe, true);
  g.visible = false;
  scene.add(g);
  return g;
}

// --- Le comptoir (étape 2) ---------------------------------------------------------------
// Un meuble en bois avec un plateau de laiton, une petite clochette (muette !)
// et un panneau « COMMANDES ».
function construireComptoir(scene, comptoir) {
  const g = new THREE.Group();
  g.position.set(comptoir.x, 0, comptoir.z);
  const l = comptoir.largeur;
  const p = comptoir.profondeur;
  g.add(objet(boite(l, 1.0, p), COULEURS.boisFonce, 0, 0.5, 0, { recoit: true }));
  g.add(objet(boite(l + 0.12, 0.08, p + 0.12), COULEURS.laiton, 0, 1.04, 0));
  const panneau = panneauTexte('COMMANDES', 1.5, 0.38);
  panneau.position.set(0, 0.62, p / 2 + 0.01);
  g.add(panneau);
  // La clochette : un petit dôme sur un socle.
  g.add(objet(cylindre(0.1, 0.12, 0.04), COULEURS.boisClair, 0.6, 1.1, 0.05));
  g.add(objet(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), COULEURS.laiton, 0.6, 1.12, 0.05));
  // Un registre ouvert pour noter les commandes.
  g.add(objet(boite(0.42, 0.03, 0.3), '#efe2c4', -0.45, 1.1, 0));
  scene.add(g);
}

// --- Le rouage de l'établi : il tourne doucement pendant une fabrication ---------------------
function construireRouageEtabli(scene, etabli) {
  const rouage = objet(formeEngrenage(0.2, 8, 0.06), COULEURS.laiton, etabli.x + 0.15, 1.2, etabli.z - 0.32);
  const axe = objet(boite(0.06, 0.26, 0.06), COULEURS.metal, etabli.x + 0.15, 1.05, etabli.z - 0.36);
  scene.add(rouage, axe);
  return rouage;
}

// --- Les améliorations de l'atelier (visibles une fois achetées) -----------------------------
function construireAmeliorations(scene, monde) {
  const atelier = monde.atelier;
  const avant = atelier.z + atelier.profondeur / 2; // la façade de l'atelier
  const etabli = monde.etabli;

  // Les étagères : un petit meuble entre le comptoir et la porte, garni de bocaux.
  const etageres = new THREE.Group();
  etageres.position.set(-8.12, 0, avant + 0.16);
  const montant = boite(0.06, 1.7, 0.3);
  etageres.add(objet(montant, COULEURS.boisClair, -0.38, 0.85, 0));
  etageres.add(objet(montant, COULEURS.boisClair, 0.38, 0.85, 0));
  for (const y of [0.35, 0.85, 1.35]) {
    etageres.add(objet(boite(0.82, 0.05, 0.3), COULEURS.boisClair, 0, y, 0));
    etageres.add(objet(cylindre(0.07, 0.07, 0.18), y > 1 ? COULEURS.cuivre : COULEURS.laiton, -0.18, y + 0.12, 0));
    etageres.add(objet(boite(0.2, 0.16, 0.18), COULEURS.boisFonce, 0.16, y + 0.11, 0));
  }

  // Le soufflet de forge : posé au bout de l'établi (là où était la lampe).
  const soufflet = new THREE.Group();
  soufflet.position.set(etabli.x + 0.75, 0.98, etabli.z + 0.05);
  const planche = boite(0.5, 0.04, 0.3);
  const dessous = objet(planche, COULEURS.boisClair, 0, 0.02, 0);
  const dessus = objet(planche, COULEURS.boisClair, 0, 0.16, 0);
  dessus.rotation.z = 0.25;
  soufflet.add(dessous, dessus);
  soufflet.add(objet(boite(0.4, 0.1, 0.26), '#8a5a3a', 0.02, 0.08, 0));
  const bec = objet(new THREE.ConeGeometry(0.05, 0.22, 12), COULEURS.cuivre, -0.32, 0.06, 0);
  bec.rotation.z = Math.PI / 2;
  soufflet.add(bec);

  // L'enseigne en cuivre : un grand engrenage sur le pignon de l'atelier.
  const enseigne = objet(formeEngrenage(0.6, 10, 0.08), COULEURS.cuivre, atelier.x, 4.2, avant + 0.06);

  // Les plans d'horloger : un rouleau de papier bleu sur l'établi.
  const plans = new THREE.Group();
  const rouleau = objet(cylindre(0.06, 0.06, 0.55), '#7f9bb5', etabli.x - 0.35, 1.04, etabli.z - 0.25);
  rouleau.rotation.z = Math.PI / 2;
  plans.add(rouleau);
  plans.add(objet(boite(0.36, 0.01, 0.26), '#9fb6c9', etabli.x + 0.27, 0.99, etabli.z + 0.18));

  // Version 1.3 : une boîte à musique et un petit automate, posés sur le comptoir.
  const comptoir = monde.comptoir;
  const dessusComptoir = 1.08;
  const boiteMusique = new THREE.Group();
  boiteMusique.position.set(comptoir.x + 0.15, dessusComptoir, comptoir.z + 0.05);
  boiteMusique.add(objet(boite(0.3, 0.16, 0.22, 0.03), COULEURS.boisFonce, 0, 0.08, 0));
  boiteMusique.add(objet(boite(0.32, 0.04, 0.24, 0.015), COULEURS.laiton, 0, 0.18, 0));
  const manivelle = objet(cylindre(0.012, 0.012, 0.1), COULEURS.laiton, 0.19, 0.1, 0);
  manivelle.rotation.z = Math.PI / 2;
  boiteMusique.add(manivelle);

  const automate = new THREE.Group();
  automate.position.set(comptoir.x - 0.8, dessusComptoir, comptoir.z + 0.05);
  automate.scale.setScalar(1.3);
  for (const cote of [-1, 1]) automate.add(objet(gelule(0.035, 0.1), COULEURS.cuivre, cote * 0.05, 0.08, 0));
  automate.add(objet(cylindre(0.09, 0.11, 0.2), COULEURS.cuivre, 0, 0.26, 0));
  for (const cote of [-1, 1]) {
    const bras = objet(gelule(0.025, 0.12), COULEURS.laiton, cote * 0.13, 0.27, 0);
    bras.rotation.z = cote * 0.3;
    automate.add(bras);
  }
  const tete = new THREE.Group();
  tete.position.y = 0.42;
  tete.add(objet(boule(0.075, 2), COULEURS.laiton, 0, 0, 0));
  for (const cote of [-1, 1]) tete.add(objet(boule(0.018, 1), MATIERE_LUEUR, cote * 0.03, 0.01, 0.065));
  automate.add(tete);
  const cle = objet(boite(0.1, 0.06, 0.015, 0.006), COULEURS.laiton, 0, 0.27, -0.13);
  automate.add(cle);
  // L'automate tourne doucement la tête, et sa clé de remontage tourne dans son dos.
  automate.userData.animer = (t) => {
    tete.rotation.y = Math.sin(t * 0.45) * 0.6;
    cle.rotation.z = t * 1.2;
  };

  const objets = { etageres, soufflet, enseigne, 'plans-horloge': plans, 'plans-boite-musique': boiteMusique, 'plans-automate': automate };
  for (const o of Object.values(objets)) {
    o.visible = false;
    scene.add(o);
  }
  return objets;
}

// --- Les engrenages de la quête et les marqueurs --------------------------------------
// Un engrenage à ramasser : il tourne doucement au-dessus d'un cercle clair posé
// au sol, pour qu'on le repère facilement (sans clignoter).
const formeEngrenageQuete = formeEngrenage(0.42, 8, 0.1);
const matiereEngrenage = new THREE.MeshLambertMaterial({ color: COULEURS.laiton, emissive: '#4a3210' });
export function creerEngrenageQuete() {
  const g = new THREE.Group();
  // Le « support » est incliné vers la caméra : on voit toujours l'engrenage de
  // face (et pas par la tranche), même pendant qu'il tourne sur lui-même.
  const support = new THREE.Group();
  support.position.y = 0.65;
  support.rotation.x = -0.87;
  g.add(support);
  const roue = new THREE.Mesh(formeEngrenageQuete, matiereEngrenage);
  roue.castShadow = false;
  support.add(roue);
  const cercle = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 24),
    new THREE.MeshBasicMaterial({ color: '#f3dfb2', transparent: true, opacity: 0.75, depthWrite: false })
  );
  cercle.rotation.x = -Math.PI / 2;
  cercle.position.y = 0.07;
  g.add(cercle);
  g.userData.roue = roue;
  g.userData.support = support;
  return g;
}

// Un marqueur flottant : un petit losange couleur ambre, discret.
const formeMarqueur = new THREE.OctahedronGeometry(0.2, 0);
const matiereMarqueur = new THREE.MeshLambertMaterial({ color: '#e3a95c', emissive: '#6a4216', flatShading: true });
export function creerMarqueur() {
  const marqueur = new THREE.Mesh(formeMarqueur, matiereMarqueur);
  marqueur.scale.set(1, 1.5, 1);
  marqueur.visible = false;
  return marqueur;
}
