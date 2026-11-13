// =============================================================================
// decor-ville.js — LA VILLE NOUVELLE en 3D (version 1.7)
// -----------------------------------------------------------------------------
// Un quartier d'aujourd'hui : au nord, la médiathèque (verre et béton clair),
// le café et sa terrasse, une résidence à balcons ; devant, le trottoir ; puis
// la rue (le goudron, le passage piéton, les rails du tramway, deux voitures
// garées) ; au sud, l'arrêt du tramway et un petit parc, avec sa sculpture.
//
// Comme partout dans le jeu : des formes simples aux bords arrondis, aucune
// image ni fichier 3D externe. Les positions viennent de ZONES.ville
// (logique-zones.js) : ce qu'on voit correspond aux obstacles.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, matiere, ajouterGrain, COULEURS, formeEngrenage, construireArbres, creerHasard } from './decor.js';
import { boite, cylindre, boule } from './formes.js';
import { creerFumee, creerHalo, MATIERE_FENETRE, MATIERE_LUEUR, matiereFeuillage } from './vie.js';
import { matiereMetal } from './rendu.js';

// Les couleurs de la ville : claires, nettes, avec quelques touches vives.
const BETON = '#e4e1da';
const BETON_FONCE = '#b9b5ac';
const GOUDRON = '#5d626a';
const ANTHRACITE = '#3c4248'; // l'acier peint des abris, des lampadaires, des cadres de fenêtres
const BLANC = '#f3f1ec';
const CANARD = '#2f8f96';     // le bleu canard du tramway et des panneaux
const CORAIL = '#d9705a';

// Le verre des immeubles : il reflète le ciel. Et un verre clair, transparent,
// pour les abris et les garde-corps.
let verre = null;
let verreSombre = null;
let verreClair = null;
function matieresVerre() {
  if (!verre) {
    verre = matiereMetal('#86aec4', { metalness: 0.55, roughness: 0.12 });
    verreSombre = matiereMetal('#34454f', { metalness: 0.6, roughness: 0.15 });
    verreClair = new THREE.MeshLambertMaterial({ color: '#cfe6ee', transparent: true, opacity: 0.38, depthWrite: false });
  }
  return { verre, verreSombre, verreClair };
}

// Une enseigne moderne : un texte net, sans fioritures, qui luit un peu.
export function enseigneModerne(texte, largeur, hauteur, fond = ANTHRACITE, couleur = '#ffffff') {
  const toile = document.createElement('canvas');
  toile.width = 512;
  toile.height = Math.max(32, Math.round(512 * (hauteur / largeur)));
  const ctx = toile.getContext('2d');
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.fillStyle = couleur;
  let taille = Math.round(toile.height * 0.62);
  ctx.font = `600 ${taille}px "Helvetica Neue", Arial, sans-serif`;
  while (taille > 12 && ctx.measureText(texte).width > toile.width * 0.88) {
    taille -= 2;
    ctx.font = `600 ${taille}px "Helvetica Neue", Arial, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texte, toile.width / 2, toile.height / 2 + taille * 0.04);
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshLambertMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.3 }),
  );
}

// -----------------------------------------------------------------------------
// Construction de toute la ville
// -----------------------------------------------------------------------------
// Renvoie ce que main.js fait vivre : l'horloge de l'arrêt (cachée tant qu'Inès
// ne l'a pas reçue), la bouilloire du café et sa vapeur (pareil pour Malik).
export function construireVille(scene, zone) {
  construireSol(scene, zone);
  construireHorizon(scene);
  construireArbres(scene, zone);
  construireJardinieres(scene, zone);
  const [mediatheque, cafe, residence] = zone.batiments;
  construireMediatheque(scene, mediatheque);
  const { bouilloire, vapeur } = construireCafe(scene, cafe, zone.ronds.filter((r) => r.id.startsWith('table')));
  construireResidence(scene, residence);
  construireTramway(scene, zone.caisses.find((c) => c.id === 'tramway'));
  construireLigne(scene, zone);
  const abri = creerAbriTram('GARE');
  const a = zone.caisses.find((c) => c.id === 'abri');
  abri.position.set(a.x, 0, a.z);
  scene.add(abri);
  construireVoiture(scene, zone.caisses.find((c) => c.id === 'voiture-1'), CORAIL, false);
  construireVoiture(scene, zone.caisses.find((c) => c.id === 'voiture-2'), BLANC, true);
  construireVelos(scene, zone.caisses.find((c) => c.id === 'velos'));
  for (const b of zone.bancs) construireBanc(scene, b);
  const sculpture = construireSculpture(scene, zone.ronds.find((r) => r.id === 'sculpture'));
  return { eau: [], vie: [sculpture, vapeur], horlogeArret: abri.userData.horloge, bouilloire, vapeur };
}

// --- Le sol : les trottoirs, la rue, le passage piéton, les rails, la pelouse ----
function construireSol(scene, zone) {
  const plat = (largeur, profondeur, couleur, x, y, z) => {
    const p = objet(new THREE.PlaneGeometry(largeur, profondeur), couleur, x, y, z, { recoit: true });
    p.rotation.x = -Math.PI / 2;
    scene.add(p);
    return p;
  };
  // Les trottoirs : de grandes dalles claires (avec un peu de grain).
  const dalles = ajouterGrain(new THREE.MeshLambertMaterial({ color: '#cfcac0' }), 0.05, 0.05);
  plat(160, 160, dalles, 0, 0, 0);
  // La rue, en goudron (avec son grain, plus marqué).
  const rue = zone.rue;
  const goudron = ajouterGrain(new THREE.MeshLambertMaterial({ color: GOUDRON }), 0.06, 0.1);
  plat(160, rue.profondeur, goudron, 0, 0.02, rue.z);
  const nord = rue.z - rue.profondeur / 2;
  const sud = rue.z + rue.profondeur / 2;
  // Les bordures de trottoir.
  for (const z of [nord, sud]) scene.add(objet(boite(160, 0.12, 0.24, 0.04), BETON_FONCE, 0, 0.06, z, { recoit: true }));
  // La plate-forme du tramway, un peu plus claire, et ses deux rails.
  plat(160, 1.9, '#727880', 0, 0.025, 3.4);
  for (const z of [2.95, 3.85]) scene.add(objet(boite(160, 0.04, 0.09), COULEURS.metal, 0, 0.035, z));
  // La ligne en pointillés, au milieu de la chaussée.
  const tirets = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.3, 0.13), matiere('#eeeae0'), 30);
  const m = new THREE.Matrix4();
  const aPlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 30; i++) {
    const x = -43.5 + i * 3;
    // (Pas de pointillés sur le passage piéton.)
    m.compose(new THREE.Vector3(x, 0.03, 1.25), aPlat, new THREE.Vector3(x > -0.6 && x < 3.6 ? 0 : 1, 1, 1));
    tirets.setMatrixAt(i, m);
  }
  scene.add(tirets);
  // Le passage piéton, en face du café.
  for (let i = 0; i < 5; i++) plat(0.42, rue.profondeur - 0.5, '#eeeae0', 0.3 + i * 0.72, 0.032, rue.z);
  // La pelouse du parc, au sud.
  plat(160, 80, COULEURS.herbe, 0, 0.015, 6.95 + 40);
  scene.add(objet(boite(160, 0.1, 0.18, 0.04), BETON_FONCE, 0, 0.05, 6.95, { recoit: true }));
}

// --- Au loin : la silhouette des tours de la ville, dans la brume --------------
function construireHorizon(scene) {
  const hasard = creerHasard(41);
  const tours = [];
  for (let x = -34; x <= 34; x += 5.5) {
    const hauteur = 7 + hasard() * 9;
    tours.push([x + hasard() * 2, hauteur, 3.6 + hasard() * 1.6, -15 - hasard() * 7]);
  }
  for (const [x, h, l, z] of tours) {
    scene.add(objet(boite(l, h, l, 0.1), hasard() < 0.5 ? '#aab4bd' : '#bfc3c4', x, h / 2, z));
    // Quelques fenêtres éclairées (elles brillent le soir).
    for (let k = 0; k < 3; k++) scene.add(objet(boite(0.5, 0.5, 0.04), MATIERE_FENETRE, x - 0.9 + k * 0.9, h * (0.35 + 0.2 * k), z + l / 2 + 0.02));
  }
}

// --- Les grands bacs des arbres du trottoir ------------------------------------
function construireJardinieres(scene, zone) {
  for (const a of zone.arbres.filter((arbre) => arbre.z < 0)) {
    scene.add(objet(boite(1.3, 0.42, 1.3, 0.08), BETON, a.x, 0.21, a.z, { ombre: true, recoit: true }));
    scene.add(objet(boite(1.1, 0.06, 1.1), '#6b5240', a.x, 0.43, a.z));
  }
}

// --- Un immeuble : le corps, le toit plat et son acrotère -----------------------
// Renvoie { g, hauteur, avant } pour y ajouter la façade.
function corpsImmeuble(scene, b, couleur, hauteurEtage = 2.6) {
  const g = new THREE.Group();
  g.position.set(b.x, 0, b.z);
  const hauteur = b.etages * hauteurEtage + 0.5;
  g.add(objet(boite(b.largeur, hauteur, b.profondeur, 0.08), couleur, 0, hauteur / 2, 0, { ombre: true, recoit: true }));
  // Le rebord du toit plat.
  g.add(objet(boite(b.largeur + 0.3, 0.22, b.profondeur + 0.3, 0.06), BETON_FONCE, 0, hauteur + 0.05, 0, { ombre: true }));
  scene.add(g);
  return { g, hauteur, avant: b.profondeur / 2 };
}

// --- La médiathèque : béton clair et grandes baies vitrées ----------------------
function construireMediatheque(scene, b) {
  const { verre: vitre } = matieresVerre();
  const { g, hauteur, avant } = corpsImmeuble(scene, b, BETON);
  const hasard = creerHasard(7);
  // Un grand mur de verre, étage par étage, tenu par de fins montants sombres.
  for (let e = 0; e < b.etages; e++) {
    const y = 0.5 + e * 2.6 + 1.25;
    for (let c = 0; c < 5; c++) {
      const x = -b.largeur / 2 + 0.85 + c * 1.325;
      // (La porte, au rez-de-chaussée, au milieu.)
      if (e === 0 && c === 2) continue;
      g.add(objet(boite(1.2, 2.0, 0.06), hasard() < 0.3 ? MATIERE_FENETRE : vitre, x, y, avant + 0.02));
    }
    g.add(objet(boite(b.largeur - 0.3, 0.16, 0.14, 0.03), ANTHRACITE, 0, 0.5 + e * 2.6 + 2.45, avant + 0.04));
  }
  for (let c = 0; c <= 5; c++) g.add(objet(boite(0.08, hauteur - 0.6, 0.12), ANTHRACITE, -b.largeur / 2 + 0.19 + c * 1.325, hauteur / 2 + 0.1, avant + 0.05));
  // La porte vitrée, sous un auvent de béton, et l'enseigne.
  g.add(objet(boite(1.15, 2.1, 0.06), matieresVerre().verreSombre, 0, 1.3, avant + 0.03));
  g.add(objet(boite(2.2, 0.12, 0.9, 0.04), BETON_FONCE, 0, 2.5, avant + 0.42, { ombre: true }));
  const enseigne = enseigneModerne(b.enseigne, 2.6, 0.4, CANARD);
  enseigne.position.set(0, 2.82, avant + 0.9);
  g.add(enseigne);
  // Sur le toit : trois panneaux solaires, inclinés vers le soleil.
  for (let i = 0; i < 3; i++) {
    const panneau = objet(boite(1.5, 0.06, 1.0, 0.02), matieresVerre().verreSombre, -2 + i * 2, hauteur + 0.5, 0.2, { ombre: true });
    panneau.rotation.x = 0.45;
    g.add(panneau);
    g.add(objet(boite(0.08, 0.5, 0.08), ANTHRACITE, -2 + i * 2, hauteur + 0.3, -0.15));
  }
}

// --- Le café : une grande vitrine, un store rayé, une terrasse ------------------
// Renvoie la bouilloire (cachée tant que Malik ne l'a pas reçue) et sa vapeur.
function construireCafe(scene, b, tables) {
  const { verreSombre: sombre } = matieresVerre();
  const { g, hauteur, avant } = corpsImmeuble(scene, b, '#efe9dc', 3.3);
  // La vitrine (deux grandes vitres) et la porte.
  for (const x of [-1.75, 1.75]) {
    g.add(objet(boite(2.0, 1.9, 0.06), MATIERE_FENETRE, x, 1.45, avant + 0.02));
    g.add(objet(boite(2.14, 0.1, 0.1), ANTHRACITE, x, 0.45, avant + 0.04));
    g.add(objet(boite(2.14, 0.1, 0.1), ANTHRACITE, x, 2.45, avant + 0.04));
  }
  g.add(objet(boite(1.0, 2.1, 0.06), sombre, 0, 1.3, avant + 0.03));
  g.add(objet(boite(0.05, 0.5, 0.05), matiereMetal('#c9c9c9', { metalness: 0.9, roughness: 0.25 }), 0.32, 1.3, avant + 0.09));
  // Le store : corail, à rayures blanches.
  const store = new THREE.Group();
  store.position.set(0, 2.85, avant + 0.75);
  store.rotation.x = 0.28;
  store.add(objet(boite(b.largeur - 0.2, 0.07, 1.6, 0.03), CORAIL, 0, 0, 0, { ombre: true }));
  for (let i = 0; i < 6; i++) store.add(objet(boite(0.42, 0.075, 1.61, 0.03), BLANC, -2.4 + i * 0.96, 0.002, 0));
  g.add(store);
  const enseigne = enseigneModerne(b.enseigne, 1.8, 0.5, '#2e2e33', '#ffe3b0');
  enseigne.position.set(0, 3.45, avant + 0.06);
  g.add(enseigne);
  // Sur le toit : un petit jardin (des bacs et des buissons).
  for (const x of [-2, 0, 2]) {
    g.add(objet(boite(1.4, 0.35, 0.7, 0.06), BETON, x, hauteur + 0.3, -0.6));
    const buisson = objet(boule(0.5, 2), matiereFeuillage(COULEURS.buisson, 0.5), x, hauteur + 0.75, -0.6);
    buisson.scale.set(1.2, 0.8, 0.7);
    g.add(buisson);
  }
  // L'ardoise du menu, posée sur le trottoir.
  const ardoise = objet(boite(0.5, 0.8, 0.05, 0.02), '#2e2e33', -0.95, 0.42, avant + 0.75);
  ardoise.rotation.x = -0.2;
  g.add(ardoise);
  // Le guichet « à emporter », à droite de la porte : c'est là que trône la
  // bouilloire de Ferrus une fois offerte, et qu'elle fume.
  g.add(objet(boite(0.9, 0.08, 0.35, 0.03), COULEURS.boisClair, 0.95, 1.05, avant + 0.2));
  const bouilloire = new THREE.Group();
  bouilloire.position.set(0.95, 1.09, avant + 0.2);
  bouilloire.add(objet(cylindre(0.14, 0.17, 0.26, 16, 0.05), COULEURS.cuivre, 0, 0.13, 0, { ombre: true }));
  bouilloire.add(objet(boule(0.05, 1), COULEURS.laiton, 0, 0.29, 0));
  const bec = objet(cylindre(0.025, 0.04, 0.2, 8), COULEURS.cuivre, 0.17, 0.18, 0);
  bec.rotation.z = -0.9;
  bouilloire.add(bec);
  const anse = objet(new THREE.TorusGeometry(0.1, 0.018, 6, 14, Math.PI), COULEURS.laiton, 0, 0.27, 0);
  bouilloire.add(anse);
  g.add(bouilloire);
  const vapeur = creerFumee({ nombre: 3, hauteur: 0.9, taille: 0.09, periode: 3.5, opacite: 0.5, vent: [0.3, 0.1], force: 0 });
  vapeur.position.set(b.x + 1.15, 1.32, b.z + avant + 0.2);
  scene.add(vapeur);

  // La terrasse : des tables rondes, deux chaises et un parasol pour chacune.
  const acier = matiereMetal('#c9c9c9', { metalness: 0.9, roughness: 0.25 });
  for (const [i, t] of tables.entries()) {
    const table = new THREE.Group();
    table.position.set(t.x, 0, t.z);
    table.add(objet(cylindre(0.46, 0.46, 0.05, 20, 0.02), BLANC, 0, 0.74, 0, { ombre: true }));
    table.add(objet(cylindre(0.035, 0.035, 0.72, 8), acier, 0, 0.36, 0));
    table.add(objet(cylindre(0.24, 0.26, 0.04, 14), ANTHRACITE, 0, 0.02, 0));
    // Le parasol.
    table.add(objet(cylindre(0.025, 0.025, 2.3, 8), acier, 0, 1.15, 0));
    table.add(objet(new THREE.ConeGeometry(1.0, 0.4, 8), i === 0 ? CORAIL : '#efe6d2', 0, 2.4, 0, { ombre: true }));
    // Une tasse sur la table.
    table.add(objet(cylindre(0.05, 0.04, 0.07, 10), '#ffffff', 0.15, 0.8, 0.1));
    scene.add(table);
    // Les chaises restent sous la table : elles ne gênent pas le passage.
    for (const cote of [-1, 1]) {
      const chaise = new THREE.Group();
      chaise.position.set(t.x + cote * 0.3, 0, t.z + 0.06);
      chaise.add(objet(boite(0.3, 0.04, 0.3, 0.015), ANTHRACITE, 0, 0.44, 0));
      chaise.add(objet(boite(0.04, 0.42, 0.3, 0.015), ANTHRACITE, cote * 0.14, 0.66, 0));
      for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) chaise.add(objet(boite(0.03, 0.44, 0.03), ANTHRACITE, dx, 0.22, dz));
      scene.add(chaise);
    }
  }
  return { bouilloire, vapeur };
}

// --- La résidence : quatre étages, des balcons, un toit végétalisé --------------
function construireResidence(scene, b) {
  const { verre: vitre, verreSombre: sombre, verreClair: clair } = matieresVerre();
  const { g, hauteur, avant } = corpsImmeuble(scene, b, '#dc9a7c');
  const hasard = creerHasard(23);
  for (let e = 0; e < b.etages; e++) {
    const y = 0.5 + e * 2.6 + 1.3;
    for (let c = 0; c < 4; c++) {
      const x = -b.largeur / 2 + 1.05 + c * 1.63;
      if (e === 0 && c === 1) {
        // La porte d'entrée, avec son auvent.
        g.add(objet(boite(1.1, 2.1, 0.06), sombre, x, 1.3, avant + 0.03));
        g.add(objet(boite(1.6, 0.1, 0.7, 0.03), BLANC, x, 2.45, avant + 0.32, { ombre: true }));
        continue;
      }
      g.add(objet(boite(1.05, 1.5, 0.06), hasard() < 0.35 ? MATIERE_FENETRE : vitre, x, y, avant + 0.02));
      g.add(objet(boite(1.17, 0.07, 0.1), BLANC, x, y - 0.78, avant + 0.04));
      // Un balcon sur deux, à partir du premier étage : une dalle blanche et
      // un garde-corps en verre.
      if (e > 0 && (c + e) % 2 === 0) {
        g.add(objet(boite(1.45, 0.1, 0.75, 0.03), BLANC, x, y - 0.85, avant + 0.38, { ombre: true }));
        g.add(objet(boite(1.4, 0.75, 0.04), clair, x, y - 0.42, avant + 0.73));
        // Une plante en pot, parfois.
        if (hasard() < 0.6) g.add(objet(boule(0.2, 1), matiereFeuillage(COULEURS.buisson, 0.5), x - 0.4, y - 0.55, avant + 0.5));
      }
    }
  }
  const enseigne = enseigneModerne(b.enseigne, 2.2, 0.32, BLANC, ANTHRACITE);
  enseigne.position.set(-b.largeur / 2 + 2.68, 2.78, avant + 0.69);
  g.add(enseigne);
  // Le toit végétalisé.
  for (const [x, z, r] of [[-2.4, 0.4, 0.6], [-0.8, -0.6, 0.75], [1.2, 0.3, 0.55], [2.6, -0.5, 0.65]]) {
    const massif = objet(boule(r, 2), matiereFeuillage(COULEURS.feuillage), x, hauteur + 0.25 + r * 0.5, z);
    massif.scale.y = 0.75;
    g.add(massif);
  }
}

// --- Le tramway, à l'arrêt ------------------------------------------------------
function construireTramway(scene, t) {
  const { verreSombre: sombre } = matieresVerre();
  const g = new THREE.Group();
  g.position.set(t.x, 0, t.z);
  const longueur = t.largeur - 0.2;
  const largeur = t.profondeur - 0.1;
  g.add(objet(boite(longueur - 0.5, 0.3, largeur - 0.2, 0.08), ANTHRACITE, 0, 0.22, 0));               // le bas de caisse
  g.add(objet(boite(longueur, 1.0, largeur, 0.3), BLANC, 0, 0.82, 0, { ombre: true, recoit: true })); // la caisse
  g.add(objet(boite(longueur + 0.02, 0.26, largeur + 0.02, 0.1), CANARD, 0, 0.5, 0));                 // la bande de couleur
  g.add(objet(boite(longueur - 0.25, 0.95, largeur + 0.01, 0.28), sombre, 0, 1.72, 0, { ombre: true })); // les vitres
  g.add(objet(boite(longueur - 0.15, 0.24, largeur - 0.1, 0.1), '#dcdad4', 0, 2.28, 0, { ombre: true })); // le toit
  // Les portes (côté trottoir, au sud) et leurs boutons lumineux.
  for (const x of [-1.9, 1.9]) {
    g.add(objet(boite(1.1, 1.75, 0.05, 0.02), CANARD, x, 1.2, largeur / 2 + 0.01));
    g.add(objet(boite(0.42, 0.85, 0.06), sombre, x - 0.26, 1.62, largeur / 2 + 0.02));
    g.add(objet(boite(0.42, 0.85, 0.06), sombre, x + 0.26, 1.62, largeur / 2 + 0.02));
    g.add(objet(boule(0.045, 1), MATIERE_LUEUR, x + 0.68, 1.2, largeur / 2 + 0.03));
  }
  // Les phares (à chaque bout) et le numéro de la ligne.
  for (const bout of [-1, 1]) {
    for (const z of [-0.55, 0.55]) g.add(objet(boite(0.06, 0.12, 0.3, 0.03), MATIERE_LUEUR, bout * (longueur / 2 + 0.01), 0.78, z));
  }
  const ligne = enseigneModerne('1 · GARE', 1.5, 0.26, '#20262b', '#ffcf7a');
  ligne.position.set(0, 2.05, largeur / 2 + 0.03);
  g.add(ligne);
  // Le pantographe, qui prend le courant sur le fil.
  const bras = (x, penche) => {
    const b = objet(boite(0.05, 1.5, 0.05), ANTHRACITE, x, 3.0, 0);
    b.rotation.z = penche;
    g.add(b);
  };
  bras(-0.35, -0.5);
  bras(0.35, 0.5);
  g.add(objet(boite(0.1, 0.05, 1.1), ANTHRACITE, 0, 3.66, 0));
  scene.add(g);
}

// --- La ligne : le fil du tramway, et les lampadaires qui le portent ------------
function construireLigne(scene, zone) {
  const fil = 3.72;
  scene.add(objet(boite(160, 0.025, 0.025), ANTHRACITE, 0, fil, 3.4));
  for (const l of zone.lampadaires) {
    // Au sud de la rue, le lampadaire porte aussi le fil (un long bras vers le nord).
    const porteur = l.z > 4;
    const lampe = creerLampadaireModerne(porteur ? fil + 0.35 : 3.3);
    lampe.position.set(l.x, 0, l.z);
    scene.add(lampe);
    if (porteur) {
      const longueur = l.z - 3.4;
      scene.add(objet(boite(0.06, 0.06, longueur), ANTHRACITE, l.x, fil + 0.25, l.z - longueur / 2));
      scene.add(objet(boite(0.03, 0.25, 0.03), ANTHRACITE, l.x, fil + 0.12, 3.4));
    } else if (l.x > 0) {
      // Près du passage piéton : un feu pour les piétons (toujours vert !).
      scene.add(objet(boite(0.22, 0.5, 0.18, 0.04), '#20262b', l.x, 2.2, l.z + 0.12));
      scene.add(objet(boule(0.07, 1), '#5a2a26', l.x, 2.32, l.z + 0.22));
      scene.add(objet(boule(0.07, 1), new THREE.MeshLambertMaterial({ color: '#6fd08c', emissive: '#2f9a55', emissiveIntensity: 0.9 }), l.x, 2.1, l.z + 0.22));
    }
  }
}

// Un lampadaire d'aujourd'hui : un mât fin, une tête plate, un ruban de lumière.
export function creerLampadaireModerne(hauteur = 3.3) {
  const g = new THREE.Group();
  const acier = matiereMetal(ANTHRACITE, { metalness: 0.6, roughness: 0.45 });
  g.add(objet(cylindre(0.11, 0.13, 0.2, 12), acier, 0, 0.1, 0));
  const mat = objet(cylindre(0.05, 0.07, hauteur, 10), acier, 0, hauteur / 2, 0);
  mat.castShadow = true;
  g.add(mat);
  // La tête, qui s'avance au-dessus du trottoir (à 3,2 m).
  g.add(objet(boite(0.26, 0.07, 0.95, 0.03), acier, 0, 3.25, 0.4));
  g.add(objet(boite(0.18, 0.03, 0.6, 0.01), MATIERE_LUEUR, 0, 3.2, 0.52));
  const halo = creerHalo(1.9);
  halo.position.set(0, 3.15, 0.52);
  g.add(halo);
  return g;
}

// --- L'arrêt de tramway (le même à la gare et dans la ville) --------------------
// Un abri de verre, un banc, le poteau de l'arrêt et le plan de la ligne.
// « destination » : ce qui est écrit sur le panneau. Le groupe renvoyé porte
// « userData.horloge » : l'horloge de Ferrus (cachée au départ).
export function creerAbriTram(destination) {
  const { verreClair: clair } = matieresVerre();
  const g = new THREE.Group();
  const acier = matiereMetal(ANTHRACITE, { metalness: 0.6, roughness: 0.45 });
  // Le fond en verre (au sud : on attend face à la rue), le toit, les poteaux.
  g.add(objet(boite(2.6, 1.9, 0.05), clair, 0, 1.2, 0.3));
  // (Le toit est en verre lui aussi : vu d'en haut, il ne cache pas Ferrus.)
  g.add(objet(boite(2.8, 0.05, 1.1), clair, 0, 2.28, -0.05));
  for (const z of [-0.6, 0.5]) g.add(objet(boite(2.9, 0.07, 0.07), acier, 0, 2.28, z, { ombre: true }));
  for (const x of [-1.42, 1.42]) g.add(objet(boite(0.07, 0.07, 1.17), acier, x, 2.28, -0.05));
  for (const x of [-1.32, 1.32]) g.add(objet(boite(0.07, 2.25, 0.07), acier, x, 1.125, 0.3, { ombre: true }));
  // Le banc.
  g.add(objet(boite(1.7, 0.07, 0.36, 0.025), COULEURS.boisClair, -0.3, 0.5, 0.05));
  for (const x of [-1.0, 0.4]) g.add(objet(boite(0.06, 0.48, 0.3), acier, x, 0.24, 0.05));
  // Le plan de la ligne, sur le côté.
  const plan = enseigneModerne(`LIGNE 1  →  ${destination}`, 1.0, 0.22, '#ffffff', ANTHRACITE);
  plan.position.set(0.7, 1.75, 0.26);
  plan.rotation.y = Math.PI;
  g.add(plan);
  // Le poteau de l'arrêt : un grand « T » rond, bleu canard.
  g.add(objet(cylindre(0.045, 0.055, 2.9, 10), acier, 1.7, 1.45, -0.25, { ombre: true }));
  const rond = objet(cylindre(0.3, 0.3, 0.06, 24, 0.02), CANARD, 1.7, 2.75, -0.25);
  rond.rotation.x = Math.PI / 2;
  g.add(rond);
  const lettre = enseigneModerne('T', 0.36, 0.36, CANARD);
  lettre.position.set(1.7, 2.75, -0.215);
  g.add(lettre);
  const dos = enseigneModerne('T', 0.36, 0.36, CANARD);
  dos.position.set(1.7, 2.75, -0.285);
  dos.rotation.y = Math.PI;
  g.add(dos);
  // L'horloge mécanique de Ferrus, accrochée sous le « T » (version 1.7).
  const horloge = new THREE.Group();
  horloge.position.set(1.7, 2.08, -0.25);
  const boitier = objet(cylindre(0.27, 0.27, 0.12, 24, 0.03), COULEURS.laiton, 0, 0, 0, { ombre: true });
  boitier.rotation.x = Math.PI / 2;
  horloge.add(boitier);
  for (const face of [-1, 1]) {
    const cadran = objet(new THREE.CircleGeometry(0.22, 24), '#f6efdc', 0, 0, face * 0.065);
    if (face < 0) cadran.rotation.y = Math.PI;
    horloge.add(cadran);
    const petite = objet(boite(0.025, 0.13, 0.01), '#2e2e33', 0.03, 0.045, face * 0.07);
    petite.rotation.z = -0.6 * face;
    const grande = objet(boite(0.02, 0.18, 0.01), '#2e2e33', -0.04, 0.06, face * 0.07);
    grande.rotation.z = 0.6 * face;
    horloge.add(petite, grande);
  }
  horloge.add(objet(formeEngrenage(0.09, 8, 0.03), COULEURS.cuivre, 0, 0.33, 0));
  horloge.visible = false;
  g.add(horloge);
  g.userData.horloge = horloge;
  return g;
}

// --- Une voiture garée ---------------------------------------------------------
// « electrique » : elle est branchée à sa borne de recharge.
function construireVoiture(scene, v, couleur, electrique) {
  const { verreSombre: sombre } = matieresVerre();
  const g = new THREE.Group();
  g.position.set(v.x, 0, v.z);
  const peinture = matiereMetal(couleur, { metalness: 0.35, roughness: 0.3 });
  g.add(objet(boite(2.3, 0.5, 1.1, 0.2), peinture, 0, 0.5, 0, { ombre: true }));
  g.add(objet(boite(1.3, 0.44, 0.98, 0.18), sombre, -0.08, 0.92, 0, { ombre: true }));
  g.add(objet(boite(1.1, 0.06, 0.9, 0.03), peinture, -0.08, 1.14, 0));
  const pneu = cylindre(0.24, 0.24, 0.18, 16, 0.05);
  for (const x of [-0.75, 0.75]) {
    for (const z of [-0.5, 0.5]) {
      const roue = objet(pneu, '#2a2c30', x, 0.24, z);
      roue.rotation.x = Math.PI / 2;
      g.add(roue);
      const jante = objet(cylindre(0.12, 0.12, 0.19, 12), '#c9c9c9', x, 0.24, z);
      jante.rotation.x = Math.PI / 2;
      g.add(jante);
    }
  }
  // Les phares (à l'est) et les feux arrière (à l'ouest).
  for (const z of [-0.36, 0.36]) {
    g.add(objet(boite(0.05, 0.1, 0.22, 0.02), MATIERE_LUEUR, 1.15, 0.56, z));
    g.add(objet(boite(0.05, 0.08, 0.2, 0.02), '#b23a32', -1.15, 0.58, z));
  }
  scene.add(g);
  if (electrique) {
    // La borne de recharge, sur le trottoir, et son câble.
    scene.add(objet(boite(0.26, 1.05, 0.2, 0.05), BLANC, v.x + 0.6, 0.525, v.z - 1.02, { ombre: true }));
    scene.add(objet(boite(0.16, 0.16, 0.02), new THREE.MeshLambertMaterial({ color: '#6fd08c', emissive: '#2f9a55', emissiveIntensity: 0.8 }), v.x + 0.6, 0.82, v.z - 0.91));
    const cable = objet(boite(0.035, 0.035, 0.55), '#2a2c30', v.x + 0.6, 0.62, v.z - 0.72);
    cable.rotation.x = -0.35;
    scene.add(cable);
  }
}

// --- Les vélos en libre-service -------------------------------------------------
function construireVelos(scene, v) {
  const acier = matiereMetal('#c9c9c9', { metalness: 0.9, roughness: 0.25 });
  const roue = new THREE.TorusGeometry(0.27, 0.025, 6, 20);
  for (let i = 0; i < 4; i++) {
    const x = v.x - 0.95 + i * 0.63;
    // La borne où le vélo est attaché.
    scene.add(objet(boite(0.12, 0.7, 0.12, 0.03), ANTHRACITE, x, 0.35, v.z - 0.3));
    if (i === 2) continue; // un vélo est en promenade
    const velo = new THREE.Group();
    velo.position.set(x, 0, v.z + 0.05);
    velo.rotation.y = Math.PI / 2; // le vélo est rangé perpendiculairement au mur
    for (const d of [-0.42, 0.42]) velo.add(objet(roue, '#2a2c30', d, 0.3, 0));
    const tube = (x1, y1, x2, y2) => {
      const longueur = Math.hypot(x2 - x1, y2 - y1);
      const t = objet(boite(longueur, 0.04, 0.04), CANARD, (x1 + x2) / 2, (y1 + y2) / 2, 0);
      t.rotation.z = Math.atan2(y2 - y1, x2 - x1);
      velo.add(t);
    };
    tube(-0.42, 0.3, -0.1, 0.72); // l'arrière
    tube(-0.1, 0.72, 0.3, 0.7);   // le haut du cadre
    tube(0.3, 0.7, 0.42, 0.3);    // la fourche
    tube(-0.1, 0.72, 0.05, 0.32); // le tube de selle
    tube(0.05, 0.32, 0.3, 0.7);   // le tube du bas
    velo.add(objet(boite(0.22, 0.05, 0.1, 0.02), '#2a2c30', -0.12, 0.8, 0)); // la selle
    velo.add(objet(boite(0.04, 0.04, 0.42), acier, 0.3, 0.86, 0));          // le guidon
    velo.add(objet(boite(0.04, 0.18, 0.04), acier, 0.3, 0.78, 0));
    scene.add(velo);
  }
}

// --- Un banc d'aujourd'hui : une planche sur deux blocs de béton ----------------
function construireBanc(scene, b) {
  scene.add(objet(boite(b.largeur, 0.08, b.profondeur - 0.08, 0.03), COULEURS.boisClair, b.x, 0.47, b.z, { ombre: true }));
  for (const cote of [-1, 1]) scene.add(objet(boite(0.22, 0.43, b.profondeur - 0.12, 0.04), BETON, b.x + cote * (b.largeur / 2 - 0.25), 0.215, b.z, { ombre: true }));
}

// --- « L'Engrenage », la sculpture du parc --------------------------------------
// Un grand rouage de cuivre et un plus petit, en laiton, qui tournent lentement
// ensemble : le salut de la ville nouvelle au vieux village.
function construireSculpture(scene, s) {
  const g = new THREE.Group();
  g.position.set(s.x, 0, s.z);
  g.add(objet(cylindre(s.rayon, s.rayon + 0.05, 0.4, 28, 0.05), BETON, 0, 0.2, 0, { ombre: true, recoit: true }));
  g.add(objet(boite(0.5, 0.02, 0.3), COULEURS.laiton, 0, 0.41, s.rayon - 0.3)); // la plaque
  g.add(objet(boite(0.14, 1.7, 0.14, 0.03), ANTHRACITE, -0.15, 1.25, -0.12, { ombre: true }));
  const grand = objet(formeEngrenage(0.95, 12, 0.22), COULEURS.cuivre, -0.15, 1.75, 0.05, { ombre: true });
  const petit = objet(formeEngrenage(0.5, 8, 0.18), COULEURS.laiton, 0.98, 0.85, 0.05, { ombre: true });
  g.add(grand, petit);
  scene.add(g);
  g.userData.animer = (t) => {
    grand.rotation.z = t * 0.12;
    petit.rotation.z = -t * 0.18 + 0.2; // 12 dents contre 8 : il tourne une fois et demie plus vite
  };
  return g;
}
