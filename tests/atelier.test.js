// =============================================================================
// Tests automatiques de la gestion de l'atelier (js/logique-atelier.js).
// Lancement : « npm test » (ou « node --test ») dans le dossier du jeu.
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MONDE,
  ETAPES,
  creerEtatJeu,
  appliquerAction,
  ramasserEngrenagesProches,
  utiliserEtabli,
  objectifActuel,
  marqueursActifs,
  cibleProche,
  libelleInteraction,
  obstaclesDuMonde,
  toucheUnObstacle,
} from '../js/logique.js';
import {
  REGLAGES,
  RECETTES,
  MATERIAUX,
  AMELIORATIONS,
  ouvrirAtelier,
  peutFabriquer,
  lancerFabrication,
  acheterMateriau,
  acheterAmelioration,
  avancerTemps,
  servirClient,
  dialogueClient,
  capaciteStock,
  dureeFabrication,
  recettesDisponibles,
  clientAuComptoir,
  progressionFabrication,
  atelierCoince,
} from '../js/logique-atelier.js';

// Une partie où l'atelier vient d'ouvrir (sans refaire toute la quête).
function partieAtelierOuvert(argent = 140) {
  const etat = creerEtatJeu();
  etat.quete.etape = ETAPES.TERMINEE;
  ouvrirAtelier(etat);
  etat.argent = argent;
  return etat;
}

// Fait passer le temps par petits pas (comme le vrai jeu), renvoie les messages.
function attendre(etat, secondes, pas = 0.1) {
  const messages = [];
  for (let t = 0; t < secondes - 1e-9; t += pas) messages.push(...avancerTemps(etat, pas));
  return messages;
}

// --- Ouverture ------------------------------------------------------------------

test('l\'atelier est fermé au début, et rien ne s\'y passe', () => {
  const etat = creerEtatJeu();
  assert.equal(etat.atelier.ouvert, false);
  assert.deepEqual(attendre(etat, 60), []);
  assert.equal(etat.atelier.clients.length, 0);
  assert.deepEqual(acheterMateriau(etat, 'cuivre'), ["L'atelier n'est pas encore ouvert."]);
  assert.equal(peutFabriquer(etat, 'lanterne').possible, false);
});

test('livrer la lampe à Odile ouvre l\'atelier, avec un petit stock de départ', () => {
  const etat = creerEtatJeu();
  appliquerAction(etat, 'accepter');
  for (const e of MONDE.engrenages) ramasserEngrenagesProches(etat, e.x, e.z);
  utiliserEtabli(etat);
  const messages = appliquerAction(etat, 'livrer');
  assert.ok(messages.includes("L'atelier ouvre ses portes !"));
  assert.equal(etat.atelier.ouvert, true);
  assert.equal(etat.atelier.stock.cuivre, REGLAGES.stockDepart.cuivre);
  // Le stock de départ permet de fabriquer tout de suite une lanterne.
  assert.equal(peutFabriquer(etat, 'lanterne').possible, true);
});

test('ouvrir deux fois ne redonne pas le stock de départ', () => {
  const etat = partieAtelierOuvert();
  ouvrirAtelier(etat);
  assert.equal(etat.atelier.stock.cuivre, REGLAGES.stockDepart.cuivre);
});

// --- Achats -------------------------------------------------------------------------

test('acheter un matériau coûte son prix et remplit le stock', () => {
  const etat = partieAtelierOuvert(100);
  acheterMateriau(etat, 'bois', 3);
  assert.equal(etat.argent, 100 - 3 * MATERIAUX.bois.prix);
  assert.equal(etat.atelier.stock.bois, REGLAGES.stockDepart.bois + 3);
});

test('on ne peut pas acheter sans assez d\'argent', () => {
  const etat = partieAtelierOuvert(5);
  const messages = acheterMateriau(etat, 'cuivre');
  assert.match(messages[0], /Pas assez d'argent/);
  assert.equal(etat.argent, 5);
});

test('le stock est limité, et les étagères l\'agrandissent', () => {
  const etat = partieAtelierOuvert(1000);
  assert.equal(capaciteStock(etat), 5);
  acheterMateriau(etat, 'ressort', 5 - etat.atelier.stock.ressort);
  assert.match(acheterMateriau(etat, 'ressort')[0], /Plus de place/);
  acheterAmelioration(etat, 'etageres');
  assert.equal(capaciteStock(etat), 10);
  acheterMateriau(etat, 'ressort', 5);
  assert.equal(etat.atelier.stock.ressort, 10);
});

// --- Fabrication ----------------------------------------------------------------------

test('fabriquer une lanterne utilise les matériaux et prend du temps', () => {
  const etat = partieAtelierOuvert();
  const cuivreAvant = etat.atelier.stock.cuivre;
  lancerFabrication(etat, 'lanterne');
  assert.equal(etat.atelier.stock.cuivre, cuivreAvant - 1);
  assert.equal(etat.atelier.stock.lanterne, 0);
  assert.ok(progressionFabrication(etat).progression < 0.01);

  attendre(etat, RECETTES.lanterne.duree / 2);
  assert.ok(Math.abs(progressionFabrication(etat).progression - 0.5) < 0.05);
  assert.equal(etat.atelier.stock.lanterne, 0);

  const messages = attendre(etat, RECETTES.lanterne.duree / 2 + 0.2);
  assert.ok(messages.includes('Fabrication terminée : Lanterne'));
  assert.equal(etat.atelier.stock.lanterne, 1);
  assert.equal(progressionFabrication(etat), null);
});

test('une seule fabrication à la fois', () => {
  const etat = partieAtelierOuvert(500);
  acheterMateriau(etat, 'ressort', 2);
  lancerFabrication(etat, 'lanterne');
  const verdict = peutFabriquer(etat, 'lanterne');
  assert.equal(verdict.possible, false);
  assert.match(verdict.raison, /occupé/);
});

test('sans les matériaux, la fabrication est refusée et dit ce qui manque', () => {
  const etat = partieAtelierOuvert();
  const verdict = peutFabriquer(etat, 'bouilloire');
  // Stock de départ : 2 cuivres, 1 bois → la bouilloire est possible…
  assert.equal(verdict.possible, true);
  lancerFabrication(etat, 'bouilloire');
  attendre(etat, 10);
  // … mais pas une deuxième.
  const refus = peutFabriquer(etat, 'bouilloire');
  assert.equal(refus.possible, false);
  assert.match(refus.raison, /2 cuivres, 1 bois/);
});

test('l\'horloge est verrouillée sans les plans d\'horloger', () => {
  const etat = partieAtelierOuvert(1000);
  assert.deepEqual(recettesDisponibles(etat), ['lanterne', 'bouilloire']);
  acheterMateriau(etat, 'ressort', 2);
  assert.equal(peutFabriquer(etat, 'horloge').possible, false);
  acheterAmelioration(etat, 'plans-horloge');
  assert.deepEqual(recettesDisponibles(etat), ['lanterne', 'bouilloire', 'horloge']);
  assert.equal(peutFabriquer(etat, 'horloge').possible, true);
});

test('le soufflet divise le temps de fabrication par deux', () => {
  const etat = partieAtelierOuvert(1000);
  assert.equal(dureeFabrication(etat, 'bouilloire'), RECETTES.bouilloire.duree);
  acheterAmelioration(etat, 'soufflet');
  assert.equal(dureeFabrication(etat, 'bouilloire'), RECETTES.bouilloire.duree / 2);
});

test('on ne fabrique pas un objet qu\'on n\'a plus la place de ranger', () => {
  const etat = partieAtelierOuvert(1000);
  etat.atelier.stock.lanterne = capaciteStock(etat);
  assert.match(peutFabriquer(etat, 'lanterne').raison, /Plus de place/);
});

// --- Améliorations --------------------------------------------------------------------

test('une amélioration coûte son prix et ne s\'achète qu\'une fois', () => {
  const etat = partieAtelierOuvert(200);
  acheterAmelioration(etat, 'soufflet');
  assert.equal(etat.argent, 200 - AMELIORATIONS.soufflet.prix);
  assert.deepEqual(acheterAmelioration(etat, 'soufflet'), ['Déjà installé.']);
  assert.equal(etat.argent, 200 - AMELIORATIONS.soufflet.prix);
});

test('pas d\'amélioration sans assez d\'argent', () => {
  const etat = partieAtelierOuvert(10);
  assert.match(acheterAmelioration(etat, 'enseigne')[0], /Pas assez d'argent/);
  assert.equal(etat.atelier.ameliorations.length, 0);
});

// --- Clients -------------------------------------------------------------------------

test('le premier client arrive après quelques secondes', () => {
  const etat = partieAtelierOuvert();
  attendre(etat, REGLAGES.premierClient - 0.5);
  assert.equal(clientAuComptoir(etat), null);
  const messages = attendre(etat, 1);
  assert.equal(etat.atelier.clients.length, 1);
  assert.ok(messages.some((m) => m.startsWith('Un client arrive')));
  // Il commande un objet que l'on sait fabriquer.
  assert.ok(recettesDisponibles(etat).includes(clientAuComptoir(etat).commande));
});

test('la file d\'attente ne dépasse jamais 3 clients', () => {
  const etat = partieAtelierOuvert();
  attendre(etat, 600, 0.5);
  assert.equal(etat.atelier.clients.length, REGLAGES.fileMax);
});

test('l\'enseigne fait venir les clients plus souvent', () => {
  const sans = partieAtelierOuvert(1000);
  const avec = partieAtelierOuvert(1000);
  acheterAmelioration(avec, 'enseigne');
  attendre(sans, 40);
  attendre(avec, 40);
  assert.ok(avec.atelier.clients.length > sans.atelier.clients.length);
});

test('servir un client : il paie, l\'objet quitte le stock, le suivant avance', () => {
  const etat = partieAtelierOuvert();
  etat.atelier.clients = [
    { id: 1, nom: 'Berthe', salut: 'Bonjour !', commande: 'lanterne' },
    { id: 2, nom: 'Gaspard', salut: 'Salut !', commande: 'bouilloire' },
  ];
  etat.atelier.stock.lanterne = 1;
  const argentAvant = etat.argent;
  const dialogue = dialogueClient(etat);
  assert.equal(dialogue.orateur, 'Berthe');
  assert.ok(dialogue.choix.some((c) => c.action === 'servir'));

  const messages = appliquerAction(etat, 'servir');
  assert.equal(etat.argent, argentAvant + RECETTES.lanterne.prixVente);
  assert.equal(etat.atelier.stock.lanterne, 0);
  assert.equal(clientAuComptoir(etat).nom, 'Gaspard');
  assert.equal(etat.atelier.clientsServis, 1);
  assert.ok(messages.includes(`+${RECETTES.lanterne.prixVente} pièces`));
});

test('sans l\'objet en stock, on ne peut pas servir (et le client reste)', () => {
  const etat = partieAtelierOuvert();
  etat.atelier.clients = [{ id: 1, nom: 'Berthe', salut: 'Bonjour !', commande: 'bouilloire' }];
  const dialogue = dialogueClient(etat);
  assert.ok(!dialogue.choix.some((c) => c.action === 'servir'));
  const argentAvant = etat.argent;
  servirClient(etat);
  assert.equal(etat.argent, argentAvant);
  assert.equal(etat.atelier.clients.length, 1);
});

// --- Objectifs, marqueurs, interactions -------------------------------------------------

test('l\'objectif guide pas à pas : acheter, fabriquer, servir', () => {
  const etat = partieAtelierOuvert(100);
  etat.atelier.stock = { cuivre: 0, bois: 0, ressort: 0, lanterne: 0, bouilloire: 0, horloge: 0 };
  etat.atelier.clients = [{ id: 1, nom: 'Berthe', salut: 'Bonjour !', commande: 'lanterne' }];
  assert.match(objectifActuel(etat), /achète les matériaux/);
  assert.deepEqual(marqueursActifs(etat), { odile: false, etabli: true, comptoir: false });

  acheterMateriau(etat, 'cuivre');
  acheterMateriau(etat, 'ressort');
  assert.match(objectifActuel(etat), /lance la fabrication/);

  lancerFabrication(etat, 'lanterne');
  assert.match(objectifActuel(etat), /Fabrication en cours/);
  assert.deepEqual(marqueursActifs(etat), { odile: false, etabli: false, comptoir: false });

  // On attend la fin de la fabrication (sans que d'autres clients ne changent l'ordre).
  etat.atelier.fabrication.restant = 0.01;
  avancerTemps(etat, 0.1);
  assert.match(objectifActuel(etat), /attend au comptoir/);
  assert.deepEqual(marqueursActifs(etat), { odile: false, etabli: false, comptoir: true });
});

test('le comptoir est accessible, et son aide nomme le client', () => {
  const etat = partieAtelierOuvert();
  const c = MONDE.comptoir;
  const obstacles = obstaclesDuMonde();
  const devant = { x: c.x, z: c.z + c.profondeur / 2 + 0.6 };
  assert.equal(toucheUnObstacle(devant.x, devant.z, MONDE.joueur.rayon, obstacles), false);
  assert.equal(cibleProche(devant.x, devant.z), 'comptoir');
  assert.equal(libelleInteraction(etat, 'comptoir'), 'Le comptoir');
  etat.atelier.clients = [{ id: 1, nom: 'Lison', salut: 'Coucou !', commande: 'lanterne' }];
  assert.equal(libelleInteraction(etat, 'comptoir'), 'Servir Lison');
  assert.equal(libelleInteraction(etat, 'etabli'), "Travailler à l'établi");
});

test('les places des clients dans la file ne sont pas dans un obstacle', () => {
  const obstacles = obstaclesDuMonde();
  const { entree, chemin, file } = MONDE.clients;
  for (const point of [entree, ...chemin, ...file]) {
    assert.equal(toucheUnObstacle(point.x, point.z, 0.4, obstacles), false, `point (${point.x}, ${point.z}) bloqué`);
  }
});

// --- Sécurité : on ne reste jamais coincé ----------------------------------------------------

test('si l\'atelier est coincé (ni argent, ni stock), Odile dépanne Ferrus', () => {
  const etat = partieAtelierOuvert(0);
  etat.atelier.stock = { cuivre: 0, bois: 3, ressort: 0, lanterne: 0, bouilloire: 0, horloge: 0 };
  assert.equal(atelierCoince(etat), true);
  const messages = avancerTemps(etat, 0.1);
  assert.equal(etat.argent, REGLAGES.aideOdile);
  assert.ok(messages.some((m) => m.startsWith('Odile vous prête')));
  assert.equal(atelierCoince(etat), false);
});

test('pas d\'aide quand on peut encore s\'en sortir', () => {
  const etat = partieAtelierOuvert(0);
  // On a de quoi faire une lanterne : pas coincé.
  assert.equal(atelierCoince(etat), false);
  avancerTemps(etat, 0.1);
  assert.equal(etat.argent, 0);
});

test('une longue partie simulée : on gagne de l\'argent sans jamais tricher', () => {
  // Un « joueur automatique » simple : il achète ce qu'il faut, fabrique ce que
  // le client demande, et le sert. On vérifie que les règles tiennent debout.
  const etat = partieAtelierOuvert(140);
  for (let t = 0; t < 900; t += 0.5) {
    avancerTemps(etat, 0.5);
    const client = clientAuComptoir(etat);
    if (!client) continue;
    if (etat.atelier.stock[client.commande] > 0) {
      servirClient(etat);
    } else if (!etat.atelier.fabrication) {
      for (const [m, n] of Object.entries(RECETTES[client.commande].ingredients)) {
        const manque = n - etat.atelier.stock[m];
        if (manque > 0) acheterMateriau(etat, m, manque);
      }
      lancerFabrication(etat, client.commande);
    }
    // Les règles de base ne sont jamais violées.
    assert.ok(etat.argent >= 0, 'argent négatif');
    for (const n of Object.values(etat.atelier.stock)) {
      assert.ok(n >= 0 && n <= capaciteStock(etat), 'stock impossible');
    }
  }
  assert.ok(etat.atelier.clientsServis >= 20, `seulement ${etat.atelier.clientsServis} clients servis`);
  assert.ok(etat.argent > 140, 'l\'atelier devrait être rentable');
});
