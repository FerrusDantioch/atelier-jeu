// =============================================================================
// lieux.js — prépare tous les LIEUX du jeu en 3D (sorti de main.js en 1.7)
// -----------------------------------------------------------------------------
// Chaque lieu a sa propre « scène », avec son ciel, sa brume, son décor, ses
// personnages, ses objets de quête à ramasser et ses marqueurs flottants :
//   la place, le marché, le moulin, la gare, la mine, sa galerie, l'intérieur
//   de l'atelier, le lac, la forêt, la ville nouvelle… et la petite carte du
//   village vue du ciel, pour les voyages en dirigeable.
//
// main.js n'a plus qu'à appeler « creerLieux » une fois, puis à faire vivre
// le lieu où se trouve Ferrus.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';
import { MONDE } from './logique.js';
import { QUETES } from './logique-quetes.js';
import { ZONES } from './logique-zones.js';
import { construireDecor, creerEngrenageQuete, creerMarqueur } from './decor.js';
import { construireMarche, construireMoulin, creerPaleQuete } from './decor-zones.js';
import { construireGare } from './decor-gare.js';
import { construireMine, creerPepiteQuete } from './decor-mine.js';
import { construireGalerie } from './decor-galerie.js';
import { construireInterieur } from './decor-interieur.js';
import { construireLac } from './decor-lac.js';
import { construireForet } from './decor-foret.js';
import { construireVille } from './decor-ville.js';
import { construireVol } from './vol.js';
import { fusionnerDecor } from './fusion.js';
import { creerOdile, animerOdile, creerPersonnage, TENUES_PNJ, animerMarche } from './personnages.js';

// « soleil » : la lumière qui fait les ombres. Il n'y en a qu'une pour tout le
// jeu ; main.js la déplace d'un lieu à l'autre avec Ferrus.
// Renvoie { lieux, sceneVol, vol }.
export function creerLieux(soleil) {
  // Une scène vide avec le ciel, la brume et la lumière (la même pour chaque lieu).
  function creerSceneDeBase() {
    const scene = new THREE.Scene();
    // Un ciel couleur sable doux et une brume légère qui cache l'horizon.
    const couleurCiel = new THREE.Color('#e9dcc3');
    scene.background = couleurCiel;
    scene.fog = new THREE.Fog(couleurCiel, 34, 70);
    // La lumière : douce et chaude, sans contraste violent.
    // - une lumière « ciel / sol » qui éclaire tout doucement ;
    const ciel = new THREE.HemisphereLight('#fff1d8', '#8a7558', 1.75);
    scene.add(ciel);
    // - le « soleil » de fin d'après-midi, qui fait les ombres, est partagé
    //   par tous les lieux : il est ajouté à la scène quand Ferrus y entre.
    // Les lumières que le jour et la nuit font changer (voir appliquerLumiere).
    scene.userData.lumieres = { ciel, soleil };
    return scene;
  }

  // Ajoute un marqueur flottant (losange ambre) au-dessus d'un point d'un lieu.
  function ajouterMarqueur(lieu, id, x, z, hauteur) {
    const marqueur = creerMarqueur();
    marqueur.position.set(x, hauteur, z);
    lieu.scene.add(marqueur);
    lieu.marqueurs.set(id, { objet: marqueur, hauteur });
  }

  // Ajoute un personnage avec un nom (Capucine, Léon, Barnabé, Augustin) dans un lieu.
  function ajouterPnj(lieu, p) {
    const objet = creerPersonnage(TENUES_PNJ[p.id], p.x * 3);
    objet.position.set(p.x, 0, p.z);
    lieu.scene.add(objet);
    lieu.pnj.push({ id: p.id, objet, x: p.x, z: p.z, animer: (dt) => animerMarche(objet, 0, dt) });
    ajouterMarqueur(lieu, p.id, p.x, p.z, 2.45);
  }

  // Les six lieux. Chacun : { scene, marqueurs, pnj, objetsQuete, … }
  const lieux = {};
  // Version 1.7 : une fois un lieu construit, on soude son décor fixe pour le
  // dessiner en beaucoup moins de fois (voir fusion.js). Les « sondes » font
  // vivre le lieu un instant, pour repérer ce qui bouge et ne pas le souder.
  function souderDecor(lieu, sondes = []) {
    const animes = [...(lieu.decor.vie || []), ...(lieu.decor.eau || [])];
    const animer = (t) => () => { for (const a of animes) a.userData.animer(t); };
    lieu.soudure = fusionnerDecor(lieu.scene, lieu.decor, [animer(1.3), animer(7.7), ...sondes, animer(0)]);
  }

  // --- La place (étapes 1 et 2) ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireDecor(scene, MONDE);
    souderDecor(lieu);
    // Odile, et ses engrenages perdus (cachés au départ).
    const odile = creerOdile();
    odile.position.set(MONDE.odile.x, 0, MONDE.odile.z);
    scene.add(odile);
    lieu.pnj.push({ id: 'odile', objet: odile, x: MONDE.odile.x, z: MONDE.odile.z, animer: (dt) => animerOdile(odile, dt) });
    for (const e of MONDE.engrenages) {
      const objet3d = creerEngrenageQuete();
      objet3d.position.set(e.x, 0, e.z);
      objet3d.visible = false;
      objet3d.userData.decalage = lieu.objetsQuete.size * 2.1; // pour qu'ils ne tournent pas tous pareil
      scene.add(objet3d);
      lieu.objetsQuete.set(e.id, objet3d);
    }
    ajouterMarqueur(lieu, 'odile', MONDE.odile.x, MONDE.odile.z, 2.35);
    ajouterMarqueur(lieu, 'etabli', MONDE.etabli.x + 0.6, MONDE.etabli.z, 2.05);
    ajouterMarqueur(lieu, 'comptoir', MONDE.comptoir.x, MONDE.comptoir.z, 1.95);
    lieux.place = lieu;
  }

  // --- Le marché ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireMarche(scene, ZONES.marche);
    souderDecor(lieu);
    for (const p of ZONES.marche.pnj) ajouterPnj(lieu, p);
    lieux.marche = lieu;
  }

  // --- Le moulin ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireMoulin(scene, ZONES.moulin);
    souderDecor(lieu);
    for (const p of ZONES.moulin.pnj) ajouterPnj(lieu, p);
    const m = ZONES.moulin.mecanisme;
    ajouterMarqueur(lieu, 'mecanisme', m.x, m.z, 1.9);
    // Les pales à ramasser (cachées tant que la quête ne les demande pas).
    QUETES['roue-moulin'].etapes[0].objets.forEach((o, i) => {
      const pale = creerPaleQuete();
      pale.position.set(o.x, 0, o.z);
      pale.visible = false;
      pale.userData.decalage = i * 2.1;
      scene.add(pale);
      lieu.objetsQuete.set(o.id, pale);
    });
    lieux.moulin = lieu;
  }

  // --- La gare (version 1.2) ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireGare(scene, ZONES.gare);
    souderDecor(lieu);
    for (const p of ZONES.gare.pnj) ajouterPnj(lieu, p);
    const h = ZONES.gare.horloge;
    ajouterMarqueur(lieu, 'horloge', h.x, h.z, 4.45);
    const loco = ZONES.gare.locomotive;
    ajouterMarqueur(lieu, 'locomotive', loco.x - 1.4, loco.z, 3.25);
    // Les rouages de l'horloge à ramasser (cachés tant que la quête ne les demande pas).
    QUETES['horloge-gare'].etapes[0].objets.forEach((o, i) => {
      const rouage = creerEngrenageQuete();
      rouage.position.set(o.x, 0, o.z);
      rouage.visible = false;
      rouage.userData.decalage = i * 2.1;
      scene.add(rouage);
      lieu.objetsQuete.set(o.id, rouage);
    });
    lieux.gare = lieu;
  }

  // --- La mine de cuivre (version 1.3) : on y va en train ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireMine(scene, ZONES.mine);
    souderDecor(lieu);
    for (const p of ZONES.mine.pnj) ajouterPnj(lieu, p);
    const w = ZONES.mine.wagonnet;
    ajouterMarqueur(lieu, 'wagonnet', w.x, w.z, 1.95);
    // Les pépites de cuivre à ramasser (cachées tant que la quête ne les demande pas).
    QUETES['wagonnet-mine'].etapes[0].objets.forEach((o, i) => {
      const pepite = creerPepiteQuete();
      pepite.position.set(o.x, 0, o.z);
      pepite.visible = false;
      pepite.userData.decalage = i * 2.1;
      scene.add(pepite);
      lieu.objetsQuete.set(o.id, pepite);
    });
    lieux.mine = lieu;
  }

  // --- La galerie souterraine (version 1.4) : sous la mine ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireGalerie(scene, ZONES.galerie);
    souderDecor(lieu);
    lieux.galerie = lieu;
  }

  // --- L'intérieur de l'atelier (version 1.5) : on entre par la porte ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireInterieur(scene, ZONES.interieur);
    souderDecor(lieu, [
      () => { for (let i = 0; i < 80; i++) lieu.decor.regler(1); lieu.decor.vie[0].userData.animer(2.2); },
      () => { for (let i = 0; i < 400; i++) lieu.decor.regler(0); },
    ]);
    for (const p of ZONES.interieur.pnj) ajouterPnj(lieu, p); // Lucie, l'apprentie
    lieux.interieur = lieu;
  }

  // --- Le lac (version 1.5) : à l'ouest du marché ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireLac(scene, ZONES.lac);
    souderDecor(lieu);
    for (const p of ZONES.lac.pnj) ajouterPnj(lieu, p); // Gaston, le pêcheur
    lieux.lac = lieu;
  }

  // --- La forêt de l'inventeur (version 1.6) : à l'est de la place ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireForet(scene, ZONES.foret);
    {
      const { telescope, chantier } = lieu.decor;
      souderDecor(lieu, [
        () => telescope.regler(true),
        () => telescope.regler(false),
        () => chantier.regler(5),
        () => chantier.animer(3.1),
        () => chantier.regler(0),
      ]);
    }
    for (const p of ZONES.foret.pnj) ajouterPnj(lieu, p); // Anatole, l'inventeur
    const t = ZONES.foret.telescope;
    ajouterMarqueur(lieu, 'telescope', t.x, t.z, 3.4);
    // Les vis dorées du télescope (cachées tant que la quête ne les demande pas).
    QUETES['telescope-anatole'].etapes[0].objets.forEach((o, i) => {
      const vis = creerEngrenageQuete();
      vis.position.set(o.x, 0, o.z);
      vis.visible = false;
      vis.userData.decalage = i * 2.1;
      scene.add(vis);
      lieu.objetsQuete.set(o.id, vis);
    });
    lieux.foret = lieu;
  }

  // --- La ville nouvelle (version 1.7) : on y va en tramway, depuis la gare ---
  {
    const scene = creerSceneDeBase();
    const lieu = { scene, marqueurs: new Map(), pnj: [], objetsQuete: new Map() };
    lieu.decor = construireVille(scene, ZONES.ville);
    souderDecor(lieu);
    for (const p of ZONES.ville.pnj) ajouterPnj(lieu, p); // Inès et Malik
    lieux.ville = lieu;
  }

  // --- Le ciel (version 1.6) : la carte du village, pour les voyages en dirigeable ---
  const sceneVol = creerSceneDeBase();
  sceneVol.fog.near = 40;
  sceneVol.fog.far = 95;
  const vol = construireVol(sceneVol);

  return { lieux, sceneVol, vol };
}
