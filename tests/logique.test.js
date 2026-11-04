// =============================================================================
// Tests automatiques des règles du jeu (js/logique.js).
// Pour les lancer : « npm test » (ou « node --test ») dans le dossier du jeu.
// Chaque « test(...) » vérifie une règle précise.
// Si une règle est cassée par une modification, le test le signale en rouge.
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MONDE,
  ETAPES,
  ARGENT_DEPART,
  RECOMPENSE_LAMPE,
  obstaclesDuMonde,
  calculerPas,
  deplacerJoueur,
  toucheUnObstacle,
  creerEtatJeu,
  engrenagesVisibles,
  objectifActuel,
  marqueursActifs,
  ramasserEngrenagesProches,
  cibleProche,
  libelleInteraction,
  dialogueOdile,
  appliquerAction,
  utiliserEtabli,
  livrerLampe,
} from '../js/logique.js';

const obstacles = obstaclesDuMonde();
const RAYON = MONDE.joueur.rayon;

// Petit outil : fait marcher Ferrus longtemps dans une direction.
function marcher(depart, dirX, dirZ, secondes, pasDeTemps = 1 / 60) {
  let position = { ...depart };
  for (let t = 0; t < secondes; t += pasDeTemps) {
    const { dx, dz } = calculerPas(dirX, dirZ, MONDE.joueur.vitesse, pasDeTemps);
    position = deplacerJoueur(position, dx, dz, obstacles);
  }
  return position;
}

// --- Partie qui commence ------------------------------------------------------

test('une nouvelle partie commence avec l\'argent de départ et la quête pas commencée', () => {
  const etat = creerEtatJeu();
  assert.equal(etat.argent, ARGENT_DEPART);
  assert.equal(etat.quete.etape, ETAPES.PAS_COMMENCEE);
  assert.deepEqual(etat.quete.engrenagesRamasses, []);
});

test('les engrenages sont invisibles tant que la quête n\'est pas acceptée', () => {
  const etat = creerEtatJeu();
  assert.equal(engrenagesVisibles(etat).length, 0);
  // Même en marchant dessus, on ne peut pas les ramasser.
  const e = MONDE.engrenages[0];
  assert.deepEqual(ramasserEngrenagesProches(etat, e.x, e.z), []);
  assert.equal(etat.quete.engrenagesRamasses.length, 0);
});

test('le marqueur est au-dessus d\'Odile au début, pas au-dessus de l\'établi', () => {
  assert.deepEqual(marqueursActifs(creerEtatJeu()), { odile: true, etabli: false });
});

// --- Dialogue et acceptation ---------------------------------------------------

test('Odile propose la quête avec un choix « accepter »', () => {
  const dialogue = dialogueOdile(creerEtatJeu());
  assert.equal(dialogue.orateur, 'Odile');
  assert.ok(dialogue.repliques.length >= 1);
  assert.ok(dialogue.choix.some((c) => c.action === 'accepter'));
});

test('dire « Plus tard » ne change rien', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'fermer');
  assert.equal(etat.quete.etape, ETAPES.PAS_COMMENCEE);
});

test('accepter la quête fait apparaître les 3 engrenages', () => {
  const etat = creerEtatJeu();
  const messages = appliquerAction(etat, 'accepter');
  assert.equal(etat.quete.etape, ETAPES.ACCEPTEE);
  assert.equal(engrenagesVisibles(etat).length, 3);
  assert.ok(messages.length > 0);
  assert.deepEqual(marqueursActifs(etat), { odile: false, etabli: false });
});

test('accepter deux fois ne recommence pas la quête', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  ramasserEngrenagesProches(etat, MONDE.engrenages[0].x, MONDE.engrenages[0].z);
  appliquerAction(etat, 'accepter');
  assert.equal(etat.quete.engrenagesRamasses.length, 1);
});

// --- Ramassage des engrenages --------------------------------------------------

test('on ramasse un engrenage en passant dessus, avec le message 1/3', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  const e = MONDE.engrenages[0];
  const messages = ramasserEngrenagesProches(etat, e.x + 0.5, e.z);
  assert.deepEqual(messages, ['Engrenage ramassé 1/3']);
  assert.equal(engrenagesVisibles(etat).length, 2);
  assert.match(objectifActuel(etat), /1\/3/);
});

test('on ne ramasse pas un engrenage trop loin', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  const e = MONDE.engrenages[0];
  assert.deepEqual(ramasserEngrenagesProches(etat, e.x + 3, e.z), []);
});

test('on ne peut pas ramasser deux fois le même engrenage', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  const e = MONDE.engrenages[1];
  ramasserEngrenagesProches(etat, e.x, e.z);
  assert.deepEqual(ramasserEngrenagesProches(etat, e.x, e.z), []);
  assert.equal(etat.quete.engrenagesRamasses.length, 1);
});

test('l\'établi refuse de réparer tant qu\'il manque des engrenages', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  const messages = utiliserEtabli(etat);
  assert.equal(etat.quete.etape, ETAPES.ACCEPTEE);
  assert.match(messages[0], /0\/3/);
});

test('avec les 3 engrenages, le marqueur passe sur l\'établi', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  for (const e of MONDE.engrenages) ramasserEngrenagesProches(etat, e.x, e.z);
  assert.equal(etat.quete.etape, ETAPES.ENGRENAGES_REUNIS);
  assert.equal(engrenagesVisibles(etat).length, 0);
  assert.deepEqual(marqueursActifs(etat), { odile: false, etabli: true });
  assert.equal(libelleInteraction(etat, 'etabli'), 'Réparer la lampe');
});

// --- Réparation et livraison ----------------------------------------------------

test('on ne peut pas livrer la lampe avant de l\'avoir réparée', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  assert.deepEqual(livrerLampe(etat), []);
  assert.equal(etat.argent, ARGENT_DEPART);
});

test('scénario complet : accepter, ramasser, réparer, livrer = +120 pièces', () => {
  const etat = creerEtatJeu();

  appliquerAction(etat, 'accepter');
  for (const e of MONDE.engrenages) ramasserEngrenagesProches(etat, e.x, e.z);

  const reparation = utiliserEtabli(etat);
  assert.equal(etat.quete.etape, ETAPES.LAMPE_REPAREE);
  assert.deepEqual(reparation, ['Lampe à vapeur réparée !']);
  assert.deepEqual(marqueursActifs(etat), { odile: true, etabli: false });

  const dialogue = dialogueOdile(etat);
  assert.ok(dialogue.choix.some((c) => c.action === 'livrer'));
  appliquerAction(etat, 'livrer');

  assert.equal(etat.quete.etape, ETAPES.TERMINEE);
  assert.equal(etat.argent, ARGENT_DEPART + RECOMPENSE_LAMPE);
  assert.deepEqual(marqueursActifs(etat), { odile: false, etabli: false });
});

test('la récompense n\'est versée qu\'une seule fois', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  for (const e of MONDE.engrenages) ramasserEngrenagesProches(etat, e.x, e.z);
  utiliserEtabli(etat);
  appliquerAction(etat, 'livrer');
  appliquerAction(etat, 'livrer');
  assert.equal(etat.argent, ARGENT_DEPART + RECOMPENSE_LAMPE);
});

test('il y a toujours un objectif écrit, à chaque étape', () => {
  for (const etape of Object.values(ETAPES)) {
    const etat = creerEtatJeu();
    etat.quete.etape = etape;
    assert.ok(objectifActuel(etat).length > 10, `objectif vide pour l'étape ${etape}`);
    assert.ok(dialogueOdile(etat).repliques.length > 0);
  }
});

// --- Déplacements ----------------------------------------------------------------

test('en diagonale, Ferrus ne va pas plus vite qu\'en ligne droite', () => {
  const droit = calculerPas(1, 0, 4, 1);
  const diagonale = calculerPas(1, 1, 4, 1);
  assert.ok(Math.abs(Math.hypot(diagonale.dx, diagonale.dz) - Math.hypot(droit.dx, droit.dz)) < 1e-9);
});

test('sans direction, Ferrus ne bouge pas', () => {
  assert.deepEqual(calculerPas(0, 0, 4, 1), { dx: 0, dz: 0 });
});

test('le point de départ de Ferrus est libre', () => {
  assert.equal(toucheUnObstacle(MONDE.joueur.x, MONDE.joueur.z, RAYON, obstacles), false);
});

test('Ferrus ne traverse pas l\'atelier', () => {
  // Il part devant l'atelier et marche vers le nord (vers le bâtiment) 5 secondes.
  const arrivee = marcher({ x: -9, z: -4.5 }, 0, -1, 5);
  const facade = MONDE.atelier.z + MONDE.atelier.profondeur / 2;
  assert.ok(arrivee.z >= facade + RAYON - 1e-6, `Ferrus est entré dans l'atelier (z = ${arrivee.z})`);
});

test('Ferrus ne traverse pas un arbre', () => {
  const arbre = MONDE.arbres[0];
  const arrivee = marcher({ x: arbre.x + 4, z: arbre.z }, -1, 0, 3);
  assert.ok(Math.hypot(arrivee.x - arbre.x, arrivee.z - arbre.z) >= RAYON + MONDE.rayonArbre - 1e-6);
});

test('Ferrus ne traverse pas le puits', () => {
  const p = MONDE.puits;
  const arrivee = marcher({ x: p.x, z: p.z + 5 }, 0, -1, 4);
  assert.ok(Math.hypot(arrivee.x - p.x, arrivee.z - p.z) >= RAYON + p.rayon - 1e-6);
});

test('Ferrus ne traverse pas les haies, même en courant longtemps', () => {
  const l = MONDE.limites;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]];
  for (const [dx, dz] of directions) {
    const arrivee = marcher({ x: 0, z: 5 }, dx, dz, 20);
    assert.ok(arrivee.x > l.minX && arrivee.x < l.maxX, `sorti en x avec la direction ${dx},${dz}`);
    assert.ok(arrivee.z > l.minZ && arrivee.z < l.maxZ, `sorti en z avec la direction ${dx},${dz}`);
  }
});

test('même avec une image très lente (grand pas), Ferrus ne passe pas à travers une haie', () => {
  const position = deplacerJoueur({ x: 17, z: 0 }, 5, 0, obstacles);
  assert.ok(position.x <= MONDE.limites.maxX - RAYON + 1e-6);
});

test('Ferrus glisse le long d\'un mur au lieu de rester bloqué', () => {
  // Il pousse en diagonale contre la façade de l'atelier : il doit avancer en x.
  const depart = { x: -9, z: MONDE.atelier.z + MONDE.atelier.profondeur / 2 + RAYON + 0.01 };
  const arrivee = marcher(depart, -1, -1, 0.5);
  assert.ok(arrivee.x < depart.x - 0.5, 'Ferrus aurait dû glisser vers la gauche');
});

test('après n\'importe quel trajet, Ferrus n\'est jamais dans un obstacle', () => {
  // On simule une promenade au hasard (toujours le même « hasard » pour que le
  // test donne toujours le même résultat).
  let graine = 12345;
  const hasard = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  let position = { x: MONDE.joueur.x, z: MONDE.joueur.z };
  for (let i = 0; i < 300; i++) {
    const dirX = hasard();
    const dirZ = hasard();
    for (let j = 0; j < 30; j++) {
      const { dx, dz } = calculerPas(dirX, dirZ, MONDE.joueur.vitesse, 1 / 30);
      position = deplacerJoueur(position, dx, dz, obstacles);
      assert.equal(toucheUnObstacle(position.x, position.z, RAYON, obstacles), false,
        `Ferrus est dans un obstacle en (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
    }
  }
});

// --- La place est bien construite -----------------------------------------------

test('chaque engrenage est sur le terrain et accessible (pas dans un obstacle)', () => {
  const l = MONDE.limites;
  for (const e of MONDE.engrenages) {
    assert.ok(e.x > l.minX && e.x < l.maxX && e.z > l.minZ && e.z < l.maxZ, `${e.id} hors du terrain`);
    assert.equal(toucheUnObstacle(e.x, e.z, RAYON, obstacles), false, `${e.id} est dans un obstacle`);
  }
});

test('on peut s\'approcher assez d\'Odile et de l\'établi pour leur parler', () => {
  for (const [nom, cible] of [['odile', MONDE.odile], ['etabli', MONDE.etabli]]) {
    // On cherche au moins une position libre, à portée.
    let trouve = false;
    for (let angle = 0; angle < Math.PI * 2 && !trouve; angle += Math.PI / 16) {
      for (let d = 0.5; d <= cible.distanceInteraction && !trouve; d += 0.1) {
        const x = cible.x + Math.cos(angle) * d;
        const z = cible.z + Math.sin(angle) * d;
        if (!toucheUnObstacle(x, z, RAYON, obstacles) && cibleProche(x, z) === nom) trouve = true;
      }
    }
    assert.ok(trouve, `impossible de s'approcher de ${nom}`);
  }
});

test('loin de tout, il n\'y a rien avec quoi interagir', () => {
  assert.equal(cibleProche(0, 8), null);
});
