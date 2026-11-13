// =============================================================================
// dirigeable3d.js — le dirigeable « Le Cuivrebourg » en 3D (version 1.6)
// -----------------------------------------------------------------------------
// Un grand ballon crème cerclé de cuivre (l'enveloppe), une nacelle en osier
// suspendue par des cordages, une petite chaudière qui fume doucement, une
// hélice à l'arrière et le drapeau de Cuivrebourg à l'avant.
// Le même modèle sert dans la forêt (où on le construit pièce par pièce) et
// pendant le voyage au-dessus du village.
// Par défaut, il regarde vers +z (l'avant est du côté des z positifs).
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS, formeEngrenage } from './decor.js';
import { boite, cylindre } from './formes.js';
import { creerFumee } from './vie.js';

const CREME = '#e8dcc0';
const OSIER = '#a07a4e';

export function creerDirigeable() {
  const g = new THREE.Group();

  // --- L'enveloppe : un ballon allongé, avec trois cerclages de cuivre et ses ailerons.
  const enveloppe = new THREE.Group();
  enveloppe.position.y = 2.2;
  const ballon = objet(new THREE.SphereGeometry(1, 28, 18), CREME, 0, 0, 0, { ombre: true });
  ballon.scale.set(1.25, 1.25, 3.4);
  enveloppe.add(ballon);
  for (const z of [-1.7, 0, 1.7]) {
    const r = 1.25 * Math.sqrt(1 - (z / 3.4) ** 2) + 0.01;
    enveloppe.add(objet(new THREE.TorusGeometry(r, 0.05, 6, 32), COULEURS.cuivre, 0, 0, z));
  }
  // Une bande dorée tout du long (en haut), et les ailerons à l'arrière.
  const aileron = boite(0.06, 0.9, 1.0, 0.03);
  for (const [x, y, rz] of [[0, 1.05, 0], [0.95, -0.4, Math.PI * 0.62], [-0.95, -0.4, -Math.PI * 0.62]]) {
    const a = objet(aileron, COULEURS.cuivre, x, y, -2.95);
    a.rotation.z = rz;
    enveloppe.add(a);
  }
  g.add(enveloppe);

  // --- Les cordages entre le ballon et la nacelle.
  const cordes = new THREE.Group();
  const points = [];
  for (const [x, z] of [[-0.42, -0.75], [0.42, -0.75], [-0.42, 0.75], [0.42, 0.75]]) {
    points.push(new THREE.Vector3(x, 0.55, z), new THREE.Vector3(x * 1.6, 1.25, z * 1.7));
  }
  cordes.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#5e4330' })));
  g.add(cordes);

  // --- La nacelle en osier, avec son garde-corps et le tableau de bord.
  const nacelle = new THREE.Group();
  nacelle.add(objet(boite(1.0, 0.5, 1.8, 0.12), OSIER, 0, 0.25, 0, { ombre: true }));
  nacelle.add(objet(boite(1.04, 0.06, 1.84, 0.03), COULEURS.boisFonce, 0, 0.52, 0));
  // Des petites lignes pour l'osier tressé.
  for (const y of [0.12, 0.25, 0.38]) nacelle.add(objet(boite(1.02, 0.025, 1.82, 0.01), '#8a6440', 0, y, 0));
  g.add(nacelle);
  const instruments = new THREE.Group();
  instruments.add(objet(boite(0.5, 0.22, 0.08, 0.02), COULEURS.boisFonce, 0, 0.62, 0.78));
  const boussole = objet(cylindre(0.07, 0.07, 0.03, 16), COULEURS.laiton, -0.12, 0.66, 0.83);
  boussole.rotation.x = Math.PI / 2;
  instruments.add(boussole);
  const cadran = objet(cylindre(0.06, 0.06, 0.03, 16), '#efe2c4', 0.13, 0.66, 0.83);
  cadran.rotation.x = Math.PI / 2;
  instruments.add(cadran);
  // Le drapeau de Cuivrebourg (un engrenage de cuivre sur fond crème), à l'avant.
  const drapeau = new THREE.Group();
  drapeau.position.set(0.42, 0.5, 0.82);
  drapeau.add(objet(cylindre(0.015, 0.015, 0.9), COULEURS.boisFonce, 0, 0.45, 0));
  const toile = new THREE.Group();
  toile.position.set(0, 0.78, 0);
  const tissu = objet(boite(0.02, 0.28, 0.42), '#efe2c4', 0, 0, 0.22);
  toile.add(tissu);
  const embleme = objet(formeEngrenage(0.08, 6, 0.012), COULEURS.cuivre, 0.016, 0, 0.22);
  embleme.rotation.y = Math.PI / 2;
  toile.add(embleme);
  drapeau.add(toile);
  instruments.add(drapeau);
  g.add(instruments);

  // --- La petite chaudière (à l'arrière de la nacelle) et sa fumée légère.
  const chaudiere = new THREE.Group();
  chaudiere.add(objet(cylindre(0.22, 0.24, 0.5, 16, 0.05), COULEURS.cuivre, 0, 0.75, -0.6));
  chaudiere.add(objet(cylindre(0.05, 0.05, 0.45), COULEURS.metal, 0.12, 1.15, -0.7));
  const fumee = creerFumee({ taille: 0.12, opacite: 0.35, periode: 6, nombre: 3, hauteur: 1.0, vent: [0, -0.6] });
  fumee.position.set(0.12, 1.38, -0.7);
  chaudiere.add(fumee);
  g.add(chaudiere);

  // --- L'hélice, tout à l'arrière.
  const helice = new THREE.Group();
  helice.position.set(0, 0.45, -1.05);
  helice.add(objet(cylindre(0.05, 0.05, 0.12, 10).rotateX(Math.PI / 2), COULEURS.laiton, 0, 0, 0));
  const pales = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const p = objet(boite(0.1, 0.55, 0.03, 0.02), COULEURS.boisClair, 0, 0.27, 0);
    const bras = new THREE.Group();
    bras.rotation.z = (i / 3) * Math.PI * 2;
    bras.add(p);
    pales.add(bras);
  }
  helice.add(pales);
  g.add(helice);

  // Ce qui bouge : l'hélice tourne, le drapeau ondule, la fumée monte.
  g.userData = {
    enveloppe, cordes, nacelle, instruments, chaudiere, helice,
    animer(t, vitesseHelice = 1) {
      pales.rotation.z = t * 3 * vitesseHelice;
      toile.rotation.y = Math.sin(t * 1.6) * 0.18;
      fumee.userData.animer(t);
    },
    // Montre seulement les pièces déjà construites (0 à 5 étapes).
    regler(etapes) {
      nacelle.visible = etapes >= 1;
      enveloppe.visible = etapes >= 2;
      cordes.visible = etapes >= 2;
      chaudiere.visible = etapes >= 3;
      helice.visible = etapes >= 4;
      instruments.visible = etapes >= 5;
    },
  };
  return g;
}
