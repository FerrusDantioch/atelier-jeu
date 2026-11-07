// =============================================================================
// decor-foret.js — la forêt de l'inventeur en 3D (version 1.6)
// -----------------------------------------------------------------------------
// Une clairière entourée de grands arbres et de sapins, un sentier de terre,
// la cabane d'Anatole (avec sa petite éolienne sur le toit), son grand
// télescope de laiton sur une estrade, le chantier du dirigeable autour d'un
// grand mât, des buissons à cueillir (baies, champignons ou pommes de pin selon
// la saison), des fougères, des rochers moussus, et des lucioles la nuit.
// Aussi : le petit chemin qui mène de la place à la forêt (sa barrière et son
// panneau), construit sur la place.
// Rien ne clignote : l'éolienne et l'hélice tournent lentement.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS, panneauTexte, construireHaies, construireArbres, construireBatiment, ajouterLampadaires, creerHasard, formeEngrenage } from './decor.js';
import { boite, cylindre, boule } from './formes.js';
import { creerFumee, creerLucioles, matiereFeuillage } from './vie.js';
import { poteauIndicateur } from './decor-zones.js';
import { creerDirigeable } from './dirigeable3d.js';

export function construireForet(scene, zone) {
  construireSol(scene);
  construireHaies(scene, zone);
  construireArbres(scene, zone);
  construireBois(scene);
  ajouterLampadaires(scene, zone.lampadaires);
  const { fumee, eolienne } = construireCabane(scene, zone.batiments[0]);
  const telescope = construireTelescope(scene, zone.telescope);
  const chantier = construireChantier(scene, zone.chantier);
  const buissons = construireBuissons(scene, zone.cueillettes);
  construireDetails(scene);
  poteauIndicateur(scene, 'PLACE', -12.7, -2.3);
  const lucioles = creerLucioles({ x: 0, z: 1.5, largeur: 24, profondeur: 9, nombre: 14, graine: 11 });
  scene.add(lucioles);
  const vie = { userData: { animer: (t) => { eolienne.rotation.z = t * 0.6; chantier.animer(t); } } };
  return { eau: [], vie: [fumee, lucioles, vie], telescope, chantier, buissons };
}

// --- Le sol : l'herbe, le tapis de mousse de la clairière, et le sentier ------------------
function construireSol(scene) {
  const plat = (forme, couleur, x, y, z) => {
    const p = objet(forme, couleur, x, y, z, { recoit: true });
    p.rotation.x = -Math.PI / 2;
    scene.add(p);
    return p;
  };
  plat(new THREE.PlaneGeometry(160, 160), COULEURS.herbe, 0, 0, 0);
  // Une grande tache de mousse, un peu plus sombre, dans la clairière.
  plat(new THREE.CircleGeometry(9, 40), '#97a873', 0, 0.01, 0.5).scale.set(1.3, 0.85, 1);
  // Le sentier : de l'entrée à l'ouest jusqu'à la cabane, et vers le chantier.
  const terre = '#b9a07a';
  plat(new THREE.PlaneGeometry(14, 1.8), terre, -7, 0.02, 0);
  plat(new THREE.PlaneGeometry(1.8, 4.4), terre, 6.5, 0.021, -2.8);
  plat(new THREE.PlaneGeometry(8.4, 1.8), terre, 2.6, 0.022, -0.9).rotation.z = -0.22;
  plat(new THREE.PlaneGeometry(1.6, 1.4), terre, -6.5, 0.023, -1.5);
  plat(new THREE.CircleGeometry(1.6, 20), terre, 11.3, 0.024, -3.8);
}

// --- Les bois tout autour (au-delà des haies) : de grands arbres et des sapins -------------
function construireBois(scene) {
  const hasard = creerHasard(83);
  const arbres = [];
  const sapins = [];
  // Une large bande de forêt tout autour de la clairière (sauf au sud : c'est
  // de là que regarde la caméra, les arbres cacheraient tout).
  for (let i = 0; i < 66; i++) {
    const cote = i % 3;
    let x;
    let z;
    if (cote === 0) { x = -26 + hasard() * 52; z = -11 - hasard() * 9; }
    else if (cote === 1) { x = 15.6 + hasard() * 10; z = -14 + hasard() * 26; }
    else { x = -15.6 - hasard() * 10; z = -14 + hasard() * 22; if (Math.abs(z) < 2.5) z += 5; }
    (hasard() < 0.45 ? sapins : arbres).push({ x, z });
  }
  construireArbres(scene, { arbres });
  // Les sapins : un tronc et trois étages de branches (toujours verts, même en hiver).
  const n = sapins.length;
  const tronc = new THREE.InstancedMesh(cylindre(0.14, 0.2, 1.2), new THREE.MeshLambertMaterial({ color: COULEURS.tronc }), n);
  const etages = [0, 1, 2].map((k) => new THREE.InstancedMesh(new THREE.ConeGeometry(1.25 - k * 0.32, 1.5, 9), matiereFeuillage('#6f8f5c', 0.6), n));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  sapins.forEach((s, i) => {
    const t = 0.9 + hasard() * 0.6;
    q.setFromEuler(new THREE.Euler(0, hasard() * 3, 0));
    m.compose(new THREE.Vector3(s.x, 0.6 * t, s.z), q, new THREE.Vector3(t, t, t));
    tronc.setMatrixAt(i, m);
    etages.forEach((e, k) => {
      m.compose(new THREE.Vector3(s.x, (1.6 + k * 0.85) * t, s.z), q, new THREE.Vector3(t, t, t));
      e.setMatrixAt(i, m);
    });
  });
  scene.add(tronc, ...etages);
}

// --- La cabane d'Anatole ----------------------------------------------------------------
function construireCabane(scene, b) {
  const { groupe, avant, hauteurMurs } = construireBatiment(scene, b, { murs: b.murs, toit: b.toit, hauteurToit: 2.0, porteX: 0, fenetres: [-1.9, 1.9] });
  const enseigne = panneauTexte(b.enseigne, 2.2, 0.5);
  enseigne.position.set(0, 2.95, avant + 0.08);
  groupe.add(enseigne);
  // Deux engrenages de laiton de part et d'autre de l'enseigne.
  const deco = formeEngrenage(0.24, 8, 0.05);
  groupe.add(objet(deco, COULEURS.laiton, -1.45, 2.95, avant + 0.06));
  groupe.add(objet(deco, COULEURS.cuivre, 1.45, 2.95, avant + 0.06));
  // La cheminée (et sa fumée).
  groupe.add(objet(boite(0.5, 1.4, 0.5), COULEURS.pierre, -2.0, 0.4 + hauteurMurs + 1.0, -0.6, { ombre: true }));
  const fumee = creerFumee({ taille: 0.22, opacite: 0.4, periode: 8, nombre: 4 });
  fumee.position.set(-2.0, 0.4 + hauteurMurs + 1.75, -0.6);
  groupe.add(fumee);
  // La petite éolienne sur le toit (elle tourne doucement).
  groupe.add(objet(cylindre(0.04, 0.05, 1.4), COULEURS.metal, 1.9, 0.4 + hauteurMurs + 1.9, -0.3));
  const eolienne = new THREE.Group();
  eolienne.position.set(1.9, 0.4 + hauteurMurs + 2.6, -0.2);
  for (let i = 0; i < 4; i++) {
    const bras = new THREE.Group();
    bras.rotation.z = (i / 4) * Math.PI * 2;
    bras.add(objet(boite(0.14, 0.6, 0.02), '#efe2c4', 0, 0.32, 0));
    eolienne.add(bras);
  }
  eolienne.add(objet(boule(0.06, 1), COULEURS.laiton, 0, 0, 0.02));
  groupe.add(eolienne);
  // Des caisses et un tonneau près de la porte, et une table à dessin.
  groupe.add(objet(boite(0.6, 0.5, 0.5, 0.05), '#8a6a4a', -2.4, 0.65, avant + 0.45));
  groupe.add(objet(cylindre(0.28, 0.28, 0.7, 14, 0.04), COULEURS.boisClair, 2.5, 0.75, avant + 0.4));
  return { fumee, eolienne };
}

// --- Le grand télescope de laiton -----------------------------------------------------------
// « regler(repare) » : en panne, il pique du nez ; réparé, il vise le ciel.
function construireTelescope(scene, t) {
  const g = new THREE.Group();
  g.position.set(t.x, 0, t.z);
  const instrument = new THREE.Group(); // le télescope lui-même (un peu plus grand que nature)
  instrument.scale.setScalar(1.35);
  // L'estrade ronde en bois, et sa petite marche.
  g.add(objet(cylindre(t.rayon, t.rayon + 0.05, 0.3, 24, 0.05), COULEURS.boisClair, 0, 0.15, 0, { recoit: true }));
  g.add(objet(boite(0.9, 0.12, 0.4, 0.03), COULEURS.boisFonce, 0, 0.06, t.rayon + 0.1));
  // Le trépied.
  instrument.position.y = 0.3;
  g.add(instrument);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const pied = objet(cylindre(0.04, 0.05, 1.4), COULEURS.boisFonce, Math.cos(a) * 0.3, 0.6, Math.sin(a) * 0.3);
    pied.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
    instrument.add(pied);
  }
  // Le tube (il pivote sur sa monture).
  const monture = new THREE.Group();
  monture.position.set(0, 1.3, 0);
  monture.rotation.y = -0.6;
  const tube = new THREE.Group();
  tube.add(objet(cylindre(0.16, 0.12, 1.9, 18, 0.03).rotateX(Math.PI / 2), COULEURS.laiton, 0, 0, 0.3, { ombre: true }));
  for (const z of [-0.4, 0.5, 1.15]) tube.add(objet(new THREE.TorusGeometry(0.165, 0.025, 6, 20), COULEURS.cuivre, 0, 0, z));
  // La lentille (au bout du tube), et l'oculaire.
  const lentille = objet(new THREE.CircleGeometry(0.13, 20), new THREE.MeshLambertMaterial({ color: '#9fc3c6', emissive: '#2a4a50', emissiveIntensity: 0.4 }), 0, 0, 1.26);
  tube.add(lentille);
  tube.add(objet(cylindre(0.05, 0.05, 0.25, 10).rotateX(Math.PI / 2), COULEURS.metal, 0, 0, -0.75));
  monture.add(tube);
  instrument.add(monture);
  // La lentille tombée sur l'estrade (tant que le télescope est en panne).
  const lentilleTombee = objet(new THREE.CircleGeometry(0.13, 20), '#9fc3c6', 0.45, 0.31, 0.35);
  lentilleTombee.rotation.x = -Math.PI / 2;
  g.add(lentilleTombee);
  scene.add(g);
  return {
    regler(repare) {
      tube.rotation.x = repare ? -0.75 : 0.25;
      lentille.visible = repare;
      lentilleTombee.visible = !repare;
    },
  };
}

// --- Le chantier du dirigeable ---------------------------------------------------------------
const HAUT_MAT = 4.75; // la hauteur de l'anneau d'amarrage
// Le grand mât d'amarrage, une table de plans, des caisses… et le dirigeable,
// qui apparaît pièce par pièce (« regler(etapes) », de 0 à 5).
function construireChantier(scene, c) {
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  // Le mât, son anneau d'amarrage tout en haut, et ses haubans.
  g.add(objet(cylindre(0.16, 0.24, 4.8, 12), COULEURS.boisFonce, 0, 2.4, 0, { ombre: true }));
  g.add(objet(cylindre(0.5, 0.6, 0.3, 16), COULEURS.pierre, 0, 0.15, 0));
  const anneau = objet(new THREE.TorusGeometry(0.3, 0.06, 8, 20), COULEURS.laiton, 0, HAUT_MAT, 0);
  anneau.rotation.x = Math.PI / 2;
  g.add(anneau);
  const haubans = [];
  for (const [x, z] of [[1.3, 0.6], [-1.2, 0.8], [0.2, -1.3]]) haubans.push(new THREE.Vector3(0, 4.3, 0), new THREE.Vector3(x, 0.05, z));
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(haubans), new THREE.LineBasicMaterial({ color: '#6b5240' })));
  // La table des plans (avec un grand rouleau de papier) et des caisses.
  g.add(objet(boite(1.0, 0.08, 0.6, 0.02), COULEURS.boisClair, 1.0, 0.85, 0.75));
  for (const x of [0.6, 1.4]) g.add(objet(boite(0.06, 0.82, 0.5), COULEURS.boisFonce, x, 0.41, 0.75));
  g.add(objet(boite(0.8, 0.02, 0.45), '#efe2c4', 1.0, 0.9, 0.75));
  g.add(objet(boite(0.5, 0.45, 0.5, 0.04), '#8a6a4a', -0.95, 0.23, 0.7));
  g.add(objet(boite(0.4, 0.35, 0.4, 0.04), '#9a7652', -1.05, 0.62, 0.65));
  scene.add(g);

  // Le dirigeable. Au début, la nacelle est posée au sol, près du mât ; dès que
  // l'enveloppe est cousue, il flotte, amarré en haut du mât.
  const dirigeable = creerDirigeable();
  scene.add(dirigeable);
  let etapesActuelles = 0;
  const amarre = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#6b5240' }));
  scene.add(amarre);
  const placer = (t) => {
    if (etapesActuelles >= 2) {
      // Il flotte au-dessus de la clairière, amarré par le nez en haut du mât
      // (l'avant tourné vers le mât, à l'ouest), et se balance très doucement.
      dirigeable.rotation.set(0, -Math.PI / 2, Math.sin(t * 0.4) * 0.02);
      dirigeable.position.set(c.x + 3.75, HAUT_MAT - 2.2 + Math.sin(t * 0.5) * 0.08, c.z - 0.5);
      amarre.geometry.setFromPoints([new THREE.Vector3(c.x, HAUT_MAT, c.z), new THREE.Vector3(c.x + 0.35, dirigeable.position.y + 2.2, c.z - 0.5)]);
      amarre.visible = true;
    } else {
      // La nacelle seule est posée au sol, à côté du mât.
      dirigeable.rotation.set(0, 0, 0);
      dirigeable.position.set(c.x + 0.75, 0, c.z - 0.2);
      amarre.visible = false;
    }
  };
  return {
    regler(etapes) {
      if (etapes === etapesActuelles && dirigeable.userData.regle) return;
      etapesActuelles = etapes;
      dirigeable.userData.regle = true;
      dirigeable.userData.regler(etapes);
      dirigeable.visible = etapes >= 1;
      placer(0);
    },
    animer(t) {
      if (!dirigeable.visible) return;
      placer(t);
      dirigeable.userData.animer(t, etapesActuelles >= 5 ? 0.6 : 0.15);
    },
  };
}

// --- Les buissons à cueillir ------------------------------------------------------------------
// Chaque buisson porte, selon la saison, des fraises (printemps), des myrtilles
// (été), des champignons à son pied (automne) ou des pommes de pin (hiver).
// Pour dessiner vite, toutes les baies (ou tous les champignons…) de tous les
// buissons sont dessinés d'un seul coup.
function construireBuissons(scene, liste) {
  const hasard = creerHasard(29);
  const n = liste.length;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const buissons = new THREE.InstancedMesh(boule(1, 2), matiereFeuillage('#7a9c5a', 0.6), n);
  liste.forEach((b, i) => {
    m.compose(new THREE.Vector3(b.x, 0.46, b.z), q, new THREE.Vector3(0.66, 0.55, 0.66));
    buissons.setMatrixAt(i, m);
  });
  scene.add(buissons);

  // Les « fruits » : pour chaque sorte, leurs positions autour de chaque buisson.
  const sortes = {
    fraises: { forme: boule(0.085, 1), couleur: '#d0504a', nombre: 8, place: (b, k) => autour(b, k, 8, 0.6, 0.38 + hasard() * 0.36) },
    myrtilles: { forme: boule(0.075, 1), couleur: '#4f5fb0', nombre: 10, place: (b, k) => autour(b, k, 10, 0.6, 0.34 + hasard() * 0.42) },
    piedsChampignons: { forme: cylindre(0.05, 0.06, 0.2, 8), couleur: '#efe6d2', nombre: 4, place: (b, k) => autour(b, k, 4, 0.82, 0.1) },
    chapeaux: { forme: new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), couleur: '#b0603a', nombre: 4, place: (b, k) => autour(b, k, 4, 0.82, 0.19) },
    pommesPin: { forme: new THREE.ConeGeometry(0.085, 0.22, 8), couleur: '#7a5638', nombre: 5, place: (b, k) => autour(b, k, 5, 0.8, 0.11) },
  };
  function autour(b, k, total, r, y) {
    const a = (k / total) * Math.PI * 2 + (b.x + b.z);
    return new THREE.Vector3(b.x + Math.cos(a) * r, y, b.z + Math.sin(a) * r);
  }
  const maillages = {};
  for (const [nom, s] of Object.entries(sortes)) {
    const im = new THREE.InstancedMesh(s.forme, new THREE.MeshLambertMaterial({ color: s.couleur }), n * s.nombre);
    im.userData.positions = [];
    liste.forEach((b) => { for (let k = 0; k < s.nombre; k++) im.userData.positions.push(s.place(b, k)); });
    im.userData.parBuisson = s.nombre;
    scene.add(im);
    maillages[nom] = im;
  }
  const visibles = { printemps: ['fraises'], ete: ['myrtilles'], automne: ['piedsChampignons', 'chapeaux'], hiver: ['pommesPin'] };
  let dernier = '';
  // « etats » : pour chaque buisson, sa repousse (1 = prêt à cueillir).
  return {
    regler(etats, saisonId) {
      const cle = saisonId + etats.map((p) => (p >= 1 ? 1 : 0)).join('');
      if (cle === dernier) return;
      dernier = cle;
      const zero = new THREE.Vector3(0, 0, 0);
      for (const [nom, im] of Object.entries(maillages)) {
        const montrer = (visibles[saisonId] || []).includes(nom);
        im.visible = montrer;
        if (!montrer) continue;
        im.userData.positions.forEach((p, j) => {
          const pret = etats[Math.floor(j / im.userData.parBuisson)] >= 1;
          m.compose(p, q, pret ? new THREE.Vector3(1, 1, 1) : zero);
          im.setMatrixAt(j, m);
        });
        im.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

// --- Les petits détails : fougères, rochers moussus, un tronc couché ------------------------------
function construireDetails(scene) {
  const hasard = creerHasard(47);
  // Des fougères au pied des haies et des arbres (de petits cônes aplatis).
  const fougeres = [];
  for (let i = 0; i < 40; i++) {
    const bord = i % 3;
    const x = bord === 2 ? (hasard() < 0.5 ? -13.3 : 13.3) + (hasard() - 0.5) * 0.6 : -13 + hasard() * 26;
    const z = bord === 0 ? -8.5 + hasard() * 0.5 : bord === 1 ? 8.3 + hasard() * 0.5 : -8 + hasard() * 16;
    if (Math.abs(z) < 2 && x < 0) continue; // pas sur l'entrée du sentier
    fougeres.push([x, z]);
  }
  const fougere = new THREE.InstancedMesh(new THREE.ConeGeometry(0.4, 0.5, 6), matiereFeuillage('#7f9e5f', 0.4), fougeres.length);
  const m = new THREE.Matrix4();
  fougeres.forEach(([x, z], i) => {
    const s = 0.7 + hasard() * 0.6;
    m.compose(new THREE.Vector3(x, 0.2 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hasard() * 3, 0)), new THREE.Vector3(s, s * 0.8, s));
    fougere.setMatrixAt(i, m);
  });
  scene.add(fougere);
  // Des rochers moussus, contre les haies (là où l'on ne marche pas).
  for (const [x, z, r] of [[-13.2, 6.8, 0.5], [13.2, -6.2, 0.6], [-4.2, -8.6, 0.45], [9.6, 8.6, 0.5]]) {
    const roc = objet(boule(r, 1), '#9a9284', x, r * 0.5, z, { recoit: true });
    roc.scale.set(1.2, 0.8, 1);
    scene.add(roc);
    // Un coussin de mousse sur le dessus.
    const mousse = objet(boule(r * 0.8, 1), '#8aa064', x - 0.1, r * 0.75, z - 0.05);
    mousse.scale.set(1.1, 0.35, 0.9);
    scene.add(mousse);
  }
  // Un vieux tronc couché, au nord (derrière les arbres).
  const tronc = objet(cylindre(0.32, 0.36, 3.2, 12), COULEURS.tronc, -0.8, 0.3, -8.7);
  tronc.rotation.z = Math.PI / 2;
  scene.add(tronc);
}

// -----------------------------------------------------------------------------
// Sur la place : le chemin de la forêt, sa petite barrière et son panneau.
// Renvoie la barrière (main.js la cache quand le chemin est ouvert).
// -----------------------------------------------------------------------------
export function construireCheminForet(scene, monde) {
  const p = monde.passageEst;
  // Le chemin de terre, de la place jusqu'à l'ouverture de la haie.
  const chemin = objet(new THREE.PlaneGeometry(5.5, 2.2), COULEURS.chemin, 16.2, 0.02, p.z, { recoit: true });
  chemin.rotation.x = -Math.PI / 2;
  scene.add(chemin);
  poteauIndicateur(scene, 'FORÊT', 16.9, 3.25);
  // La barrière : deux planches entre deux poteaux.
  const barriere = new THREE.Group();
  barriere.position.set(p.x, 0, p.z);
  for (const s of [-1, 1]) barriere.add(objet(boite(0.2, 1.3, 0.2), COULEURS.boisFonce, 0, 0.65, s * 1.3));
  for (const y of [0.45, 0.95]) barriere.add(objet(boite(0.1, 0.16, 2.6, 0.03), COULEURS.boisClair, 0, y, 0));
  scene.add(barriere);
  return barriere;
}
