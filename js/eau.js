// =============================================================================
// eau.js — l'eau qui bouge doucement (version 1.1)
// -----------------------------------------------------------------------------
// Trois petites animations, toutes lentes et peu contrastées (pas de
// scintillement) :
//   1. des REFLETS qui ondulent à la surface de l'eau (puits, fontaine, canal) ;
//      dans le canal, ils glissent dans le sens du courant ;
//   2. des RONDS dans l'eau qui s'élargissent puis s'effacent (puits, fontaine) ;
//   3. des FEUILLES qui flottent au fil du canal du moulin.
//
// Les reflets sont calculés par la carte graphique : on ajoute quelques lignes
// au petit programme qui colorie chaque pixel (le « shader »). Un seul nombre,
// le temps, est mis à jour à chaque image : c'est très léger.
//
// Si le système demande moins d'animations, main.js n'appelle pas animerEau :
// l'eau reste alors immobile.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';

// Le temps, partagé par toutes les surfaces d'eau.
const temps = { value: 0 };

// La matière de l'eau. « courant » = la vitesse à laquelle les reflets
// glissent (0 = eau calme d'un puits, plus = eau qui coule).
export function matiereEau(couleur = '#5d7d7c', courant = 0) {
  const m = new THREE.MeshLambertMaterial({ color: couleur });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTemps = temps;
    shader.uniforms.uCourant = { value: courant };
    // 1. On retient la position de chaque point dans le monde.
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosEau;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPosEau = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    // 2. On éclaircit et on assombrit un peu la couleur selon des vagues lentes
    //    qui se croisent ; là où elles se rejoignent, un reflet clair et doux.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTemps;\nuniform float uCourant;\nvarying vec3 vPosEau;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 pe = vPosEau.xz;
        pe.x -= uTemps * uCourant;
        float o1 = sin(pe.x * 1.6 + sin(pe.y * 1.1 + uTemps * 0.5) * 1.4 + uTemps * 0.7);
        float o2 = sin(pe.y * 2.1 - uTemps * 0.6 + sin(pe.x * 0.8 - uTemps * 0.35) * 1.6);
        float o3 = sin((pe.x + pe.y) * 2.7 + uTemps * 0.9);
        float onde = (o1 + o2 + 0.6 * o3) / 2.6;
        float reflet = smoothstep(0.6, 1.0, onde);
        diffuseColor.rgb *= 0.93 + 0.07 * onde;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.92, 0.87), reflet * 0.26);`);
  };
  return m;
}

// Les matières partagées : l'eau calme et l'eau du canal.
export const EAU_CALME = matiereEau('#5d7d7c', 0);
// Dans le canal, l'eau coule vers l'ouest (vers la gauche de l'écran) : c'est
// elle qui pousse les pales du bas de la roue.
export const EAU_COURANTE = matiereEau('#5d7d7c', -0.45);

// À appeler à chaque image, avec le temps écoulé depuis le début (en secondes).
export function animerEau(tempsTotal) {
  temps.value = tempsTotal;
}

// -----------------------------------------------------------------------------
// Des ronds dans l'eau : quelques anneaux qui naissent au centre (ou au bord
// d'un pilier), s'élargissent lentement et s'effacent.
//   rayonDepart, rayonFin : la taille de l'anneau au début et à la fin ;
//   nombre : combien d'anneaux à la fois ; duree : la vie d'un anneau (s).
// Renvoie un groupe, avec « userData.animer(temps) ».
// -----------------------------------------------------------------------------
const formeAnneau = new THREE.RingGeometry(0.92, 1, 40);
export function creerRonds({ rayonDepart, rayonFin, nombre = 3, duree = 4, opacite = 0.4, decalage = 0 }) {
  const groupe = new THREE.Group();
  const anneaux = [];
  for (let i = 0; i < nombre; i++) {
    const anneau = new THREE.Mesh(
      formeAnneau,
      new THREE.MeshBasicMaterial({ color: '#e9efe4', transparent: true, opacity: 0, depthWrite: false })
    );
    anneau.rotation.x = -Math.PI / 2;
    groupe.add(anneau);
    anneaux.push(anneau);
  }
  groupe.userData.animer = (t) => {
    anneaux.forEach((anneau, i) => {
      // « avance » va de 0 (naissance) à 1 (disparition), puis recommence.
      const avance = (((t + decalage) / duree + i / nombre) % 1 + 1) % 1;
      const r = rayonDepart + (rayonFin - rayonDepart) * avance;
      anneau.scale.set(r, r, 1);
      // Il apparaît en douceur, puis s'efface en s'élargissant.
      anneau.material.opacity = opacite * Math.min(1, avance * 5) * (1 - avance);
    });
  };
  groupe.userData.animer(0);
  return groupe;
}

// -----------------------------------------------------------------------------
// Des feuilles qui flottent au fil de l'eau, de « debut » vers « fin » (en x),
// puis reviennent au début (loin de la caméra, on ne voit pas le saut).
// -----------------------------------------------------------------------------
const formeFeuille = new THREE.CircleGeometry(0.16, 10);
export function creerFeuilles({ debut, fin, z, largeur, y, nombre = 4, vitesse = 0.45 }) {
  const groupe = new THREE.Group();
  const couleurs = ['#a7a35a', '#c9a35a', '#8f9f55', '#b98a4e'];
  const feuilles = [];
  for (let i = 0; i < nombre; i++) {
    const feuille = new THREE.Mesh(formeFeuille, new THREE.MeshLambertMaterial({ color: couleurs[i % couleurs.length] }));
    feuille.rotation.x = -Math.PI / 2;
    feuille.scale.set(1, 0.55, 1); // une feuille allongée
    feuille.position.y = y;
    feuille.userData = {
      depart: i / nombre,                                   // où elle commence
      z: z + ((i * 0.37) % 1 - 0.5) * largeur * 0.6,        // sa « file » sur la largeur
      tour: i * 1.7,                                        // elle tourne un peu sur elle-même
    };
    groupe.add(feuille);
    feuilles.push(feuille);
  }
  const longueur = fin - debut;
  groupe.userData.animer = (t) => {
    for (const f of feuilles) {
      const d = f.userData;
      const avance = ((d.depart + (t * vitesse) / Math.abs(longueur)) % 1 + 1) % 1;
      f.position.x = debut + avance * longueur;
      f.position.z = d.z + Math.sin(t * 0.4 + d.tour) * 0.12;
      f.rotation.z = d.tour + Math.sin(t * 0.3 + d.tour) * 0.6;
    }
  };
  groupe.userData.animer(0);
  return groupe;
}
