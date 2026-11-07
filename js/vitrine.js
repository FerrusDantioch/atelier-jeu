// =============================================================================
// vitrine.js — la vitrine de l'atelier en 3D, et ses visiteurs (version 1.6)
// -----------------------------------------------------------------------------
// Une belle vitrine en bois et en verre, contre la haie, à droite de l'atelier.
// Six places sur deux étagères : chaque objet exposé y apparaît en petit
// (une lanterne, un automate, le portrait d'un poisson, une vieille botte…).
// Le soir, une petite lampe éclaire l'intérieur.
// Les VISITEURS entrent par le portail du sud, viennent admirer la vitrine
// quelques secondes, puis repartent (ils s'arrêtent poliment si Ferrus est
// sur leur chemin, comme les clients).
// Les règles (ce qu'on expose, les pourboires) sont dans logique-vitrine.js.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { objet, COULEURS, panneauTexte, formeEngrenage } from './decor.js';
import { boite, cylindre, boule, gelule } from './formes.js';
import { MATIERE_LUEUR } from './vie.js';
import { decrireObjetVitrine, PLACES_VITRINE } from './logique-vitrine.js';
import { creerHabitant, animerMarche, supprimerPersonnage } from './personnages.js';

const VERRE = new THREE.MeshLambertMaterial({ color: '#dfe9e6', transparent: true, opacity: 0.18, depthWrite: false });

export function construireVitrine(scene, v) {
  const g = new THREE.Group();
  g.position.set(v.x, 0, v.z);
  const l = v.largeur;
  const p = v.profondeur;
  // Le socle en bois et le dessus.
  g.add(objet(boite(l, 0.6, p, 0.06), COULEURS.boisFonce, 0, 0.3, 0, { ombre: true, recoit: true }));
  g.add(objet(boite(l + 0.1, 0.12, p + 0.1, 0.04), COULEURS.boisClair, 0, 2.06, 0, { ombre: true }));
  // Les montants, les étagères et le fond.
  for (const x of [-l / 2 + 0.05, l / 2 - 0.05]) for (const z of [-p / 2 + 0.05, p / 2 - 0.05]) g.add(objet(boite(0.08, 1.45, 0.08), COULEURS.boisClair, x, 1.32, z));
  g.add(objet(boite(l - 0.1, 1.42, 0.04), '#7a5a3e', 0, 1.32, -p / 2 + 0.04));
  g.add(objet(boite(l - 0.12, 0.04, p - 0.12), '#c8d6d2', 0, 1.33, 0));
  // Les vitres (devant et sur les côtés).
  g.add(objet(boite(l - 0.12, 1.4, 0.02), VERRE, 0, 1.32, p / 2 - 0.05));
  for (const x of [-l / 2 + 0.05, l / 2 - 0.05]) g.add(objet(boite(0.02, 1.4, p - 0.12), VERRE, x, 1.32, 0));
  // La petite lampe du haut, qui s'allume le soir.
  g.add(objet(boite(l - 0.4, 0.05, 0.08), MATIERE_LUEUR, 0, 1.98, 0.1));
  // L'enseigne et deux petits engrenages.
  const enseigne = panneauTexte('VITRINE', 1.3, 0.32);
  enseigne.position.set(0, 2.32, p / 2 - 0.1);
  g.add(enseigne);
  for (const s of [-1, 1]) g.add(objet(formeEngrenage(0.13, 8, 0.03), COULEURS.laiton, s * 0.85, 2.32, p / 2 - 0.12));
  scene.add(g);

  // Les six places : trois sur l'étagère du bas, trois sur celle du milieu.
  const places = [];
  for (let i = 0; i < PLACES_VITRINE; i++) {
    const place = new THREE.Group();
    place.position.set((i % 3 - 1) * 0.72, i < 3 ? 0.62 : 1.35, 0.05);
    g.add(place);
    places.push({ groupe: place, code: '' });
  }
  return {
    // « objets » : les codes exposés (logique-vitrine.js). On ne refait que
    // ce qui a changé.
    regler(objets) {
      places.forEach((place, i) => {
        const code = objets[i] || '';
        if (code === place.code) return;
        place.code = code;
        for (const enfant of [...place.groupe.children]) place.groupe.remove(enfant);
        if (code) place.groupe.add(modeleVitrine(code));
      });
    },
  };
}

// Le petit modèle d'un objet exposé (environ 40 cm de haut).
function modeleVitrine(code) {
  const d = decrireObjetVitrine(code);
  const g = new THREE.Group();
  if (!d) return g;
  const ajouter = (forme, couleur, x, y, z) => {
    const m = objet(forme, couleur, x, y, z);
    g.add(m);
    return m;
  };
  if (d.type === 'creation') {
    if (d.id === 'lanterne') {
      ajouter(cylindre(0.08, 0.1, 0.03), COULEURS.laiton, 0, 0.02, 0);
      ajouter(cylindre(0.07, 0.07, 0.18, 12), MATIERE_LUEUR, 0, 0.13, 0);
      ajouter(new THREE.ConeGeometry(0.1, 0.09, 12), COULEURS.cuivre, 0, 0.27, 0);
      ajouter(new THREE.TorusGeometry(0.035, 0.008, 6, 12), COULEURS.laiton, 0, 0.34, 0);
    } else if (d.id === 'bouilloire') {
      ajouter(boule(0.12, 2), COULEURS.cuivre, 0, 0.12, 0).scale.set(1, 0.85, 1);
      ajouter(cylindre(0.015, 0.025, 0.14), COULEURS.cuivre, 0.12, 0.15, 0).rotation.z = -0.9;
      ajouter(new THREE.TorusGeometry(0.07, 0.012, 6, 14, Math.PI), COULEURS.boisFonce, 0, 0.22, 0);
    } else if (d.id === 'horloge') {
      ajouter(boite(0.22, 0.32, 0.1, 0.03), COULEURS.boisClair, 0, 0.16, 0);
      ajouter(cylindre(0.08, 0.08, 0.02, 18).rotateX(Math.PI / 2), '#efe2c4', 0, 0.2, 0.055);
      ajouter(boite(0.008, 0.06, 0.005), '#3d2b1f', 0, 0.22, 0.067);
    } else if (d.id === 'boite-musique') {
      ajouter(boite(0.26, 0.13, 0.18, 0.02), '#8a5a3a', 0, 0.065, 0);
      ajouter(boite(0.27, 0.03, 0.19, 0.01), COULEURS.laiton, 0, 0.14, 0);
      ajouter(cylindre(0.01, 0.01, 0.08), COULEURS.laiton, 0.15, 0.08, 0).rotation.z = Math.PI / 2;
    } else if (d.id === 'train-miniature') {
      ajouter(boite(0.3, 0.1, 0.12, 0.02), '#5a6a5a', 0, 0.08, 0);
      ajouter(cylindre(0.05, 0.05, 0.18, 12).rotateZ(Math.PI / 2), COULEURS.cuivre, 0.05, 0.16, 0);
      ajouter(cylindre(0.02, 0.025, 0.08), COULEURS.metal, 0.11, 0.24, 0);
      for (const x of [-0.09, 0.09]) for (const z of [-0.065, 0.065]) ajouter(cylindre(0.035, 0.035, 0.02, 12).rotateX(Math.PI / 2), '#3d2b1f', x, 0.035, z);
    } else {
      // L'automate de cuivre.
      ajouter(cylindre(0.07, 0.09, 0.2, 14), COULEURS.cuivre, 0, 0.14, 0);
      ajouter(boule(0.07, 2), COULEURS.laiton, 0, 0.3, 0);
      for (const s of [-1, 1]) ajouter(gelule(0.02, 0.1), COULEURS.cuivre, s * 0.1, 0.15, 0);
      ajouter(cylindre(0.05, 0.05, 0.02, 12), COULEURS.boisFonce, 0, 0.01, 0);
    }
  } else if (d.type === 'poisson') {
    // Le portrait d'un poisson, dans un petit cadre doré posé sur un chevalet.
    const cadre = new THREE.Group();
    cadre.position.y = 0.17;
    cadre.rotation.x = -0.12;
    cadre.add(objet(boite(0.3, 0.22, 0.02, 0.01), COULEURS.laiton, 0, 0, 0));
    cadre.add(objet(boite(0.26, 0.18, 0.022), '#efe2c4', 0, 0, 0.002));
    const corps = objet(boule(0.06, 2), d.couleur, -0.01, 0, 0.02);
    corps.scale.set(1.5, 0.75, 0.25);
    cadre.add(corps);
    const queue = objet(new THREE.ConeGeometry(0.04, 0.06, 3), d.couleur, 0.09, 0, 0.02);
    queue.rotation.z = Math.PI / 2;
    cadre.add(queue);
    g.add(cadre);
    ajouter(boite(0.03, 0.18, 0.03), COULEURS.boisFonce, 0, 0.08, -0.05).rotation.x = 0.3;
  } else {
    // Les curiosités.
    if (d.id === 'vieille-botte') {
      ajouter(boite(0.1, 0.24, 0.12, 0.03), '#5a4a3e', 0, 0.12, 0);
      ajouter(boite(0.1, 0.07, 0.2, 0.03), '#5a4a3e', 0, 0.035, 0.06);
    } else if (d.id === 'plume-geai') {
      const plume = ajouter(boule(0.05, 2), '#6a8ac0', 0, 0.16, 0);
      plume.scale.set(0.5, 3, 0.2);
      plume.rotation.z = 0.5;
      ajouter(cylindre(0.03, 0.04, 0.03), COULEURS.boisFonce, 0, 0.015, 0);
    } else if (d.id === 'pomme-pin-doree') {
      ajouter(new THREE.ConeGeometry(0.07, 0.18, 9), new THREE.MeshLambertMaterial({ color: '#d9b45a', emissive: '#5a4214' }), 0, 0.1, 0).rotation.x = Math.PI;
    } else if (d.id === 'fossile') {
      ajouter(cylindre(0.12, 0.13, 0.05, 20), '#c8b8a0', 0, 0.025, 0);
      ajouter(new THREE.TorusGeometry(0.07, 0.018, 6, 20), '#a8987e', 0, 0.06, 0).rotation.x = Math.PI / 2;
      ajouter(new THREE.TorusGeometry(0.035, 0.014, 6, 16), '#a8987e', 0.02, 0.065, 0).rotation.x = Math.PI / 2;
    } else {
      // L'éclat de météorite, sombre, avec une très légère lueur violette.
      ajouter(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshLambertMaterial({ color: '#4a4652', emissive: '#3a2a5a', emissiveIntensity: 0.5, flatShading: true }), 0, 0.1, 0);
      ajouter(cylindre(0.06, 0.07, 0.03, 12), COULEURS.laiton, 0, 0.015, 0);
    }
  }
  return g;
}

// -----------------------------------------------------------------------------
// Les visiteurs de la vitrine
// -----------------------------------------------------------------------------
// Le trajet : du portail du sud jusque devant la vitrine (en évitant le puits).
const CHEMIN_VISITEUR = [{ x: 2.4, z: 5 }, { x: 2.2, z: -3.5 }, { x: -0.4, z: -8.4 }, { x: -1.3, z: -9.55 }];
const ENTREE = { x: 0, z: 11.2 };
const VITESSE = 1.8;
const DUREE_ADMIRATION = 6; // secondes devant la vitrine

// « peutAvancer(depart, arrivee) » : vrai si le pas ne gêne pas Ferrus.
export function creerVisiteurs(scene) {
  const visiteurs = [];
  return {
    lancer(numero) {
      if (visiteurs.length >= 2) return; // pas plus de deux à la fois
      const objet3d = creerHabitant(numero + 2);
      objet3d.position.set(ENTREE.x, 0, ENTREE.z);
      objet3d.rotation.y = Math.PI;
      scene.add(objet3d);
      visiteurs.push({ objet: objet3d, chemin: [...CHEMIN_VISITEUR], attente: 0, partant: false });
    },
    animer(dt, peutAvancer, tournerVers) {
      for (const v of [...visiteurs]) {
        let vitesse = 0;
        const but = v.chemin[0];
        if (but) {
          const dx = but.x - v.objet.position.x;
          const dz = but.z - v.objet.position.z;
          const distance = Math.hypot(dx, dz);
          const pas = VITESSE * dt;
          const prochain = distance <= pas
            ? { x: but.x, z: but.z }
            : { x: v.objet.position.x + (dx / distance) * pas, z: v.objet.position.z + (dz / distance) * pas };
          if (peutAvancer(v.objet.position, prochain)) {
            if (distance <= pas) v.chemin.shift();
            else vitesse = VITESSE;
            v.objet.position.x = prochain.x;
            v.objet.position.z = prochain.z;
          }
          if (distance > 0.01) tournerVers(v.objet, Math.atan2(dx, dz), dt, 6);
        } else if (!v.partant) {
          // Devant la vitrine : il regarde vers le nord quelques secondes.
          tournerVers(v.objet, Math.PI, dt, 4);
          v.attente += dt;
          if (v.attente >= DUREE_ADMIRATION) {
            v.partant = true;
            v.chemin = [...CHEMIN_VISITEUR].reverse().concat([ENTREE]);
          }
        } else {
          // Revenu au portail : il s'en va.
          supprimerPersonnage(v.objet);
          visiteurs.splice(visiteurs.indexOf(v), 1);
          continue;
        }
        animerMarche(v.objet, vitesse, dt);
      }
    },
    positions: () => visiteurs.map((v) => v.objet.position),
    nombre: () => visiteurs.length,
  };
}
