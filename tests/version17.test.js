// =============================================================================
// Tests de la version 1.7 — à lancer avec : npm test
// =============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../lib/three/three.module.js';
import { fusionnerDecor } from '../js/fusion.js';

// Un petit lieu d'essai : trois caisses fixes de même matière, une roue qui
// tourne (connue du jeu), un volet qui bouge par une animation, et un objet caché.
function lieuDEssai() {
  const scene = new THREE.Scene();
  const bois = new THREE.MeshLambertMaterial({ color: '#9a7652' });
  const caisses = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bois);
    c.position.set(i * 2, 0.5, 0);
    scene.add(c);
    caisses.push(c);
  }
  const roue = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), bois);
  scene.add(roue);
  const volet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.1), bois);
  scene.add(volet);
  const cache = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bois);
  cache.visible = false;
  scene.add(cache);
  return { scene, bois, caisses, roue, volet, cache };
}

test('fusion : les formes fixes de même matière sont soudées en une seule', () => {
  const { scene, bois, caisses, roue, volet, cache } = lieuDEssai();
  const bilan = fusionnerDecor(scene, { roue }, [() => { volet.rotation.y = 1; }]);
  assert.deepEqual(bilan, { avant: 3, apres: 1 });
  for (const c of caisses) assert.equal(c.parent, null);
  const soude = scene.children.find((o) => o.userData.soude === 3);
  assert.ok(soude);
  assert.equal(soude.material, bois);
  // 3 boîtes de 24 points et 12 triangles, placées là où elles étaient.
  assert.equal(soude.geometry.attributes.position.count, 72);
  assert.equal(soude.geometry.index.count, 108);
  soude.geometry.computeBoundingBox();
  assert.ok(Math.abs(soude.geometry.boundingBox.max.x - 4.5) < 1e-6);
  assert.ok(Math.abs(soude.geometry.boundingBox.min.y) < 1e-6);
  // Ce qui vit reste libre : la roue (tenue par le jeu), le volet (qui bouge), l'objet caché.
  assert.equal(roue.parent, scene);
  assert.equal(volet.parent, scene);
  assert.equal(cache.parent, scene);
});

test('fusion : le transparent, le vent et les objets marqués « vivants » ne sont pas soudés', () => {
  const scene = new THREE.Scene();
  const verre = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.5 });
  const feuille = new THREE.MeshLambertMaterial();
  feuille.userData.vent = true;
  const pierre = new THREE.MeshLambertMaterial();
  for (const m of [verre, verre, feuille, feuille]) scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m));
  const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pierre);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pierre);
  b.userData.vivant = true;
  scene.add(a, b);
  assert.deepEqual(fusionnerDecor(scene), { avant: 0, apres: 0 });
  assert.equal(scene.children.length, 6);
});

test('fusion : les ombres sont respectées, et une forme retournée garde ses faces à l\'endroit', () => {
  const scene = new THREE.Scene();
  const m = new THREE.MeshLambertMaterial();
  const faire = (ombre, x) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m);
    o.castShadow = ombre;
    o.position.x = x;
    scene.add(o);
    return o;
  };
  faire(true, 0);
  faire(true, 2).scale.x = -1; // un miroir
  faire(false, 4);
  faire(false, 6);
  assert.deepEqual(fusionnerDecor(scene), { avant: 4, apres: 2 });
  const avecOmbre = scene.children.find((o) => o.castShadow);
  assert.equal(avecOmbre.userData.soude, 2);
  // Chaque triangle regarde vers l'extérieur : sa normale calculée va dans le
  // même sens que la normale enregistrée.
  const g = avecOmbre.geometry;
  const [pa, pb, pc, n] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < g.index.count; i += 3) {
    pa.fromBufferAttribute(g.attributes.position, g.index.getX(i));
    pb.fromBufferAttribute(g.attributes.position, g.index.getX(i + 1));
    pc.fromBufferAttribute(g.attributes.position, g.index.getX(i + 2));
    const calculee = pb.sub(pa).cross(pc.sub(pa));
    n.fromBufferAttribute(g.attributes.normal, g.index.getX(i));
    assert.ok(calculee.dot(n) > 0);
  }
});

// -----------------------------------------------------------------------------
// La ville nouvelle, le tramway, le soleil, la qualité « Élevée »
// -----------------------------------------------------------------------------
import { creerEtatJeu, toucheUnObstacle, appliquerAction, objectifSecondaire, MONDE, calculerPas, deplacerJoueur } from '../js/logique.js';
import { ZONES, obstaclesZone, cibleProcheZone, libelleZone, messageObjet, voyageTram, nomPnj } from '../js/logique-zones.js';
import { SERVICES_VILLE, PRIME_VILLE, dialogueVille, dialogueMerciVille, serviceRendu, tramOuvert, estHabitantVille } from '../js/logique-ville.js';
import { serialiserPartie, chargerPartie } from '../js/logique-sauvegarde.js';
import { destinationsPossibles, ATTERRISSAGES, CARTE_VOL } from '../js/logique-dirigeable.js';
import { directionSoleil } from '../js/logique-temps.js';
import { parametresQualite, lireReglages, QUALITES, VERSION_JEU } from '../js/logique-reglages.js';
import { AMBIANCES } from '../js/logique-musique.js';

// Une partie où le train de Cuivrebourg roule de nouveau.
function partieAvecTrain() {
  const etat = creerEtatJeu();
  etat.atelier.ouvert = true;
  for (const id of ['lampe-odile', 'balance-capucine', 'roue-moulin', 'horloge-gare', 'train-cuivrebourg']) etat.quetes[id].statut = 'terminee';
  return etat;
}

test('le tramway : fermé tant que le train ne roule pas, puis un aller-retour gare ↔ ville', () => {
  const debut = creerEtatJeu();
  assert.equal(tramOuvert(debut), false);
  assert.equal(voyageTram(debut, 'gare'), null);
  assert.equal(libelleZone(debut, 'arret-tram'), "L'arrêt du tramway");
  assert.match(messageObjet(debut, 'arret-tram')[0], /Ville nouvelle/);

  const etat = partieAvecTrain();
  assert.equal(libelleZone(etat, 'arret-tram'), 'Prendre le tramway (vers la ville nouvelle)');
  const aller = voyageTram(etat, 'gare');
  assert.equal(aller.zone, 'ville');
  const retour = voyageTram(etat, 'ville');
  assert.equal(retour.zone, 'gare');
  assert.equal(voyageTram(etat, 'place'), null);
  // On descend du tramway à un endroit libre, juste devant l'arrêt (pour repartir).
  const rayon = MONDE.joueur.rayon;
  assert.equal(toucheUnObstacle(aller.x, aller.z, rayon, obstaclesZone('ville', etat)), false);
  assert.equal(cibleProcheZone('ville', aller.x, aller.z, etat), 'arret-ville');
  assert.equal(toucheUnObstacle(retour.x, retour.z, rayon, obstaclesZone('gare', etat)), false);
  assert.equal(cibleProcheZone('gare', retour.x, retour.z, etat), 'arret-tram');
});

test('la ville nouvelle : un lieu complet (habitants, musique, dirigeable, objets à regarder)', () => {
  const etat = partieAvecTrain();
  const ville = ZONES.ville;
  assert.equal(ville.nom, 'La ville nouvelle');
  assert.ok(AMBIANCES.ville);
  assert.ok(CARTE_VOL.ville);
  assert.equal(nomPnj('ines'), 'Inès');
  assert.equal(libelleZone(etat, 'malik'), 'Parler à Malik');
  assert.match(messageObjet(etat, 'sculpture')[0], /Cuivrebourg/);
  assert.equal(messageObjet(etat, 'velos').length, 1);
  // Chaque chose avec laquelle on peut interagir est accessible : il existe un
  // endroit libre d'où on l'atteint.
  const obstacles = obstaclesZone('ville', etat);
  for (const i of ville.interactifs) {
    let atteint = false;
    for (let x = ville.limites.minX; x <= ville.limites.maxX && !atteint; x += 0.25) {
      for (let z = ville.limites.minZ; z <= ville.limites.maxZ && !atteint; z += 0.25) {
        atteint = !toucheUnObstacle(x, z, MONDE.joueur.rayon, obstacles) && cibleProcheZone('ville', x, z, etat) === i.id;
      }
    }
    assert.ok(atteint, i.id);
  }
  // Le dirigeable peut s'y poser dès que le tramway roule, pas avant.
  assert.ok(destinationsPossibles(etat, 'place').some((d) => d.zone === 'ville'));
  assert.ok(!destinationsPossibles(creerEtatJeu(), 'place').some((d) => d.zone === 'ville'));
  assert.equal(toucheUnObstacle(ATTERRISSAGES.ville.x, ATTERRISSAGES.ville.z, MONDE.joueur.rayon, obstacles), false);
});

test("les services de la ville : il faut l'objet, on est payé une seule fois, puis la prime", () => {
  const etat = partieAvecTrain();
  assert.ok(estHabitantVille('ines') && estHabitantVille('malik') && !estHabitantVille('odile'));
  assert.equal(dialogueVille(etat, 'odile'), null);
  // Sans horloge : Inès explique, on ne peut rien donner.
  let d = dialogueVille(etat, 'ines');
  assert.equal(d.orateur, 'Inès');
  assert.equal(d.repliques.length, 3);
  assert.ok(!d.choix.some((c) => c.action.startsWith('ville:donner')));
  assert.equal(objectifSecondaire(etat), null); // on ne l'a pas encore rencontrée
  assert.deepEqual(appliquerAction(etat, d.choix[0].action), []);
  assert.match(objectifSecondaire(etat), /Inès attend une horloge mécanique/);
  // On ne peut pas tricher : « donner » sans l'objet ne fait rien.
  const argent = etat.argent;
  assert.deepEqual(appliquerAction(etat, 'ville:donner:ines'), []);
  assert.equal(etat.argent, argent);
  // Avec une horloge : la deuxième fois, elle rappelle en une phrase, et on peut donner.
  etat.atelier.stock.horloge = 2;
  d = dialogueVille(etat, 'ines');
  assert.equal(d.repliques.length, 1);
  assert.equal(d.choix[0].texte, 'Donner une horloge mécanique');
  const messages = appliquerAction(etat, d.choix[0].action);
  assert.equal(etat.argent, argent + SERVICES_VILLE.ines.prix);
  assert.equal(etat.atelier.stock.horloge, 1);
  assert.ok(serviceRendu(etat, 'ines'));
  assert.ok(messages.includes('+160 pièces'));
  assert.equal(dialogueMerciVille('ines').repliques.length, 2);
  // Une seule fois : ensuite, elle remercie, et « donner » ne paie plus.
  assert.deepEqual(appliquerAction(etat, 'ville:donner:ines'), []);
  assert.equal(etat.atelier.stock.horloge, 1);
  assert.equal(dialogueVille(etat, 'ines').choix[0].action, 'fermer');
  // Malik reçoit sa bouilloire : les deux services sont rendus, la ville offre une prime.
  etat.atelier.stock.bouilloire = 1;
  const fin = appliquerAction(etat, 'ville:donner:malik');
  assert.equal(etat.argent, argent + SERVICES_VILLE.ines.prix + SERVICES_VILLE.malik.prix + PRIME_VILLE);
  assert.ok(fin.some((m) => /prime/.test(m)));
  assert.equal(etat.ville.prime, true);
  assert.equal(objectifSecondaire(etat), null);
});

test('la sauvegarde garde la ville, et une partie de la version 1.6 se relit sans elle', () => {
  const etat = partieAvecTrain();
  etat.atelier.stock.horloge = 1;
  appliquerAction(etat, 'ville:donner:ines');
  const relue = chargerPartie(serialiserPartie({ etat, zone: 'ville', position: { x: 4, z: 2.4 }, orientation: 0 }));
  assert.equal(relue.zone, 'ville');
  assert.deepEqual(relue.etat.ville, { services: { ines: true, malik: false }, rencontres: ['ines'], prime: false });
  // Une ancienne partie (sans « ville ») : tout repart de zéro, sans erreur.
  const ancienne = JSON.parse(serialiserPartie({ etat: creerEtatJeu(), zone: 'place', position: { x: 0, z: 5 }, orientation: 0 }));
  delete ancienne.etat.ville;
  assert.deepEqual(chargerPartie(JSON.stringify(ancienne)).etat.ville, { services: { ines: false, malik: false }, rencontres: [], prime: false });
  // Une partie abîmée : on ne garde que ce qui est possible.
  ancienne.etat.ville = { services: { ines: 'oui', malik: true }, rencontres: ['ines', 'inconnu', 'ines'], prime: 3 };
  assert.deepEqual(chargerPartie(JSON.stringify(ancienne)).etat.ville, { services: { ines: false, malik: true }, rencontres: ['ines'], prime: false });
});

test('le soleil se déplace : à l\'est le matin, haut à midi, à l\'ouest le soir, sans jamais sauter', () => {
  const matin = directionSoleil(0.25);
  const midi = directionSoleil(0.5);
  const soir = directionSoleil(0.75);
  assert.ok(matin.x > 0.3 && soir.x < -0.3);
  assert.ok(Math.abs(midi.x) < 1e-9 && midi.y > matin.y);
  let avant = directionSoleil(0);
  for (let i = 1; i <= 1000; i++) {
    const d = directionSoleil(i / 1000);
    assert.ok(Math.abs(Math.hypot(d.x, d.y, d.z) - 1) < 1e-9);
    assert.ok(d.y > 0.6, 'le soleil reste haut : les ombres restent courtes');
    assert.ok(d.z > 0, 'la lumière vient toujours du côté de la caméra');
    assert.ok(Math.hypot(d.x - avant.x, d.y - avant.y, d.z - avant.z) < 0.01);
    avant = d;
  }
  // Minuit et minuit : c'est le même point (la journée se referme sans saut).
  assert.ok(Math.abs(directionSoleil(0).x - directionSoleil(1).x) < 1e-9);
});

test('la qualité « Élevée » : image plus fine, ombres plus précises, effets de lumière', () => {
  assert.ok(QUALITES.elevee);
  assert.deepEqual(parametresQualite('elevee', 3), { pixelRatio: 2, ombres: true, imagesParSeconde: 60, ombresFines: true, effets: true });
  assert.equal(parametresQualite('elevee', 1).pixelRatio, 1);
  assert.equal(parametresQualite('normale', 3).effets, undefined);
  assert.equal(lireReglages(JSON.stringify({ qualite: 'elevee' })).qualite, 'elevee');
  assert.equal(VERSION_JEU, '1.7.0');
});

// Toutes les cases (de 25 cm) où Ferrus peut aller en partant d'un point (on
// « inonde » le lieu, comme de l'eau qui se répand).
function casesAccessibles(zoneId, etat, depart) {
  const zone = ZONES[zoneId];
  const obstacles = obstaclesZone(zoneId, etat);
  const r = MONDE.joueur.rayon;
  const pas = 0.25;
  const l = zone.limites;
  const libre = (x, z) => x >= l.minX + r && x <= l.maxX - r && z >= l.minZ + r && z <= l.maxZ - r && !toucheUnObstacle(x, z, r, obstacles);
  const cle = (x, z) => `${Math.round(x / pas)}|${Math.round(z / pas)}`;
  const arrondi = (v) => Math.round(v / pas) * pas;
  const vues = new Set();
  const file = [{ x: arrondi(depart.x), z: arrondi(depart.z) }];
  // (Le point de départ peut tomber entre deux cases : on prend la case libre la plus proche.)
  if (!libre(file[0].x, file[0].z)) file[0] = { x: arrondi(depart.x), z: arrondi(depart.z) - pas };
  vues.add(cle(file[0].x, file[0].z));
  while (file.length > 0) {
    const c = file.pop();
    for (const [dx, dz] of [[pas, 0], [-pas, 0], [0, pas], [0, -pas]]) {
      const x = c.x + dx;
      const z = c.z + dz;
      if (vues.has(cle(x, z)) || !libre(x, z)) continue;
      vues.add(cle(x, z));
      file.push({ x, z });
    }
  }
  return { a: (x, z) => vues.has(cle(arrondi(x), arrondi(z))), nombre: vues.size };
}

test('la ville nouvelle : en descendant du tramway, on peut aller partout (aucun recoin fermé)', () => {
  const etat = partieAvecTrain();
  const ville = ZONES.ville;
  const acces = casesAccessibles('ville', etat, ville.arrivees.gare);
  // Chaque habitant, chaque chose à regarder et le point d'atterrissage du
  // dirigeable ont une case accessible tout près.
  const pres = (cx, cz, distance) => {
    for (let x = cx - distance; x <= cx + distance; x += 0.25) {
      for (let z = cz - distance; z <= cz + distance; z += 0.25) {
        if (Math.hypot(x - cx, z - cz) <= distance && acces.a(x, z)) return true;
      }
    }
    return false;
  };
  for (const i of ville.interactifs) assert.ok(pres(i.x, i.z, i.distanceInteraction - 0.3), i.id);
  assert.ok(pres(ATTERRISSAGES.ville.x, ATTERRISSAGES.ville.z, 0.5));
  // On peut traverser la rue des deux côtés du tramway (devant et derrière).
  assert.ok(acces.a(-11.5, 3.4) && acces.a(0, 3.4));
  // Et l'on atteint aussi bien le parc, au sud, que le trottoir du café, au nord.
  assert.ok(acces.a(-8, 8) && acces.a(6, -2.5));
});

test('promenades au hasard dans la ville et à la gare (avec son arrêt) : Ferrus ne se coince jamais', () => {
  const etat = partieAvecTrain();
  for (const [zoneId, depart] of [['ville', ZONES.ville.arrivees.gare], ['gare', ZONES.gare.arrivees.ville]]) {
    const zone = ZONES[zoneId];
    const obstacles = obstaclesZone(zoneId, etat);
    for (let graine = 1; graine <= 10; graine++) {
      let g = graine * 131;
      const hasard = () => ((g = (g * 16807) % 2147483647) / 2147483647) * 2 - 1;
      let p = deplacerJoueur({ x: depart.x, z: depart.z }, 0, 0, obstacles, zone);
      for (let i = 0; i < 100; i++) {
        const dx = hasard();
        const dz = hasard();
        for (let j = 0; j < 30; j++) {
          const pas = calculerPas(dx, dz, MONDE.joueur.vitesse, 1 / 30);
          p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, zone);
          assert.equal(toucheUnObstacle(p.x, p.z, MONDE.joueur.rayon, obstacles), false, `${zoneId} : coincé en (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
        }
      }
    }
  }
});
