// =============================================================================
// Tests de la version 1.4 : la galerie souterraine de la mine, les saisons,
// le carnet de commandes et les décorations de l'atelier.
// Lancement : npm test   (ou : node --test)
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MONDE, creerEtatJeu, deplacerJoueur, calculerPas, toucheUnObstacle, objectifActuel, marqueursActifs } from '../js/logique.js';
import {
  RECETTES,
  DECORATIONS,
  ouvrirAtelier,
  acheterDecoration,
  possedeDecoration,
  servirClient,
} from '../js/logique-atelier.js';
import { QUETES, majDisponibilites } from '../js/logique-quetes.js';
import {
  ZONES,
  obstaclesZone,
  libelleZone,
  messageObjet,
  cibleProcheZone,
  sortieAtteinte,
} from '../js/logique-zones.js';
import {
  FILONS,
  DUREE_REPOUSSE,
  galerieOuverte,
  recolterFilon,
  avancerGalerie,
  filonPret,
  progressionFilon,
} from '../js/logique-galerie.js';
import {
  SAISONS,
  DUREE_SAISON,
  saisonDuMoment,
  ambianceSaison,
  texteCalendrier,
  messageSaison,
} from '../js/logique-saisons.js';
import {
  REGLAGES_CARNET,
  CLIENTS_CARNET,
  carnetOuvert,
  majCarnet,
  livrerCommande,
  commandeLivrable,
  objectifCarnet,
  deClient,
} from '../js/logique-commandes.js';
import { avancerJournee, DUREE_JOURNEE, versRvb } from '../js/logique-temps.js';
import { serialiserPartie, chargerPartie } from '../js/logique-sauvegarde.js';
import { lireReglages, creerReglages } from '../js/logique-reglages.js';
import { AMBIANCES } from '../js/logique-musique.js';

// Les couleurs du décor avant la version 1.4 (COULEURS, dans decor.js, qu'on ne
// peut pas importer ici car il utilise la 3D).
const COULEURS_DECOR_ETE = { herbe: '#a7b47c', feuillage: '#83a25e', feuillageClair: '#98b46d', haie: '#7d995e', buisson: '#88a567' };

// Une partie où les quêtes sont finies jusqu'à « jusqua » (compris).
function partieFinieJusqua(jusqua) {
  const etat = creerEtatJeu();
  ouvrirAtelier(etat);
  for (const id of Object.keys(QUETES)) {
    etat.quetes[id].statut = 'terminee';
    etat.quetes[id].etape = QUETES[id].etapes.length;
    if (id === jusqua) break;
  }
  majDisponibilites(etat);
  etat.argent = 500;
  return etat;
}

// Fait passer des jours entiers (par petits pas, comme le jeu).
function passerLeTemps(etat, secondes) {
  const messages = [];
  for (let t = 0; t < secondes; t += 1) {
    avancerJournee(etat, 1);
    messages.push(...majCarnet(etat));
  }
  return messages;
}

// -----------------------------------------------------------------------------
// Les jours et les saisons
// -----------------------------------------------------------------------------
test('les jours se comptent : un nouveau jour à chaque minuit', () => {
  const etat = creerEtatJeu();
  assert.equal(etat.jour, 1);
  avancerJournee(etat, DUREE_JOURNEE * 0.6); // de 8 h à 22 h : même jour
  assert.equal(etat.jour, 1);
  avancerJournee(etat, DUREE_JOURNEE * 0.2); // on passe minuit
  assert.equal(etat.jour, 2);
  avancerJournee(etat, DUREE_JOURNEE * 3); // trois jours d'un coup
  assert.equal(etat.jour, 5);
});

test('une nouvelle partie commence au printemps ; puis été, automne, hiver, printemps', () => {
  const vus = [];
  for (let jour = 1; jour <= 9; jour++) vus.push(saisonDuMoment(jour, 0.5).id);
  assert.deepEqual(vus, ['printemps', 'printemps', 'ete', 'ete', 'automne', 'automne', 'hiver', 'hiver', 'printemps']);
  assert.equal(DUREE_SAISON, 2);
});

test("l'été garde exactement les couleurs d'avant (rien ne change pour qui coupe les saisons)", () => {
  const ete = SAISONS.find((s) => s.id === 'ete');
  assert.deepEqual(ete.couleurs, COULEURS_DECOR_ETE);
  const coupe = ambianceSaison(7, 0.5, false); // en hiver, mais saisons coupées
  assert.equal(coupe.id, 'ete');
  assert.deepEqual(coupe.couleurs.herbe, versRvb(COULEURS_DECOR_ETE.herbe));
  assert.equal(coupe.flocons, 0);
});

test('les saisons changent tout doucement : jamais de saut de couleur', () => {
  // On parcourt une année entière par petits pas d'une seconde de jeu.
  let avant = ambianceSaison(1, 0);
  const pas = 1 / DUREE_JOURNEE;
  for (let t = pas; t < 8; t += pas) {
    const jour = 1 + Math.floor(t);
    const a = ambianceSaison(jour, t - Math.floor(t));
    for (const cle of Object.keys(a.couleurs)) {
      for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.couleurs[cle][i] - avant.couleurs[cle][i]) < 0.01, `${cle} saute au temps ${t}`);
    }
    for (const cle of ['fleurs', 'petales', 'feuilles', 'flocons']) assert.ok(Math.abs(a[cle] - avant[cle]) < 0.02, `${cle} saute au temps ${t}`);
    avant = a;
  }
});

test('chaque saison a son ambiance : fleurs, feuilles mortes, neige', () => {
  assert.equal(ambianceSaison(1, 0.5).fleurs, 1);
  assert.equal(ambianceSaison(1, 0.5).petales, 1);
  assert.equal(ambianceSaison(5, 0.5).feuilles, 1);
  assert.equal(ambianceSaison(7, 0.5).flocons, 1);
  assert.equal(ambianceSaison(3, 0.5).flocons + ambianceSaison(3, 0.5).feuilles + ambianceSaison(3, 0.5).petales, 0);
});

test('le calendrier, et le message quand la saison change', () => {
  const etat = creerEtatJeu();
  assert.equal(texteCalendrier(etat), 'Printemps · jour 1');
  etat.jour = 5;
  assert.equal(texteCalendrier(etat), 'Automne · jour 5');
  assert.equal(texteCalendrier(etat, false), 'Jour 5');
  assert.match(messageSaison('ete', 'automne'), /automne/i);
  assert.equal(messageSaison('ete', 'ete'), null);
  assert.equal(messageSaison(null, 'ete'), null);
});

test("l'option « Saisons » est activée au départ, et se relit", () => {
  assert.equal(creerReglages().saisons, true);
  assert.equal(lireReglages(JSON.stringify({ saisons: false })).saisons, false);
  assert.equal(lireReglages(JSON.stringify({ saisons: 'non' })).saisons, true);
});

// -----------------------------------------------------------------------------
// Le carnet de commandes
// -----------------------------------------------------------------------------
test("le carnet s'ouvre après le premier client servi", () => {
  const etat = partieFinieJusqua('lampe-odile');
  assert.equal(carnetOuvert(etat), false);
  assert.deepEqual(majCarnet(etat), []);
  etat.atelier.clients.push({ id: 1, nom: 'Berthe', salut: 'Bonjour', commande: 'lanterne' });
  etat.atelier.stock.lanterne = 1;
  servirClient(etat);
  assert.equal(carnetOuvert(etat), true);
  const messages = majCarnet(etat);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /^Léon apporte une commande : Odile voudrait/);
  assert.equal(etat.carnet.commandes[0].client, 'odile');
});

test('une commande par matin au plus, deux en même temps au plus, jamais deux fois le même habitant', () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  etat.atelier.clientsServis = 3;
  etat.atelier.ameliorations.push('plans-horloge', 'plans-boite-musique', 'plans-automate');
  majCarnet(etat);
  assert.equal(etat.carnet.commandes.length, 1);
  majCarnet(etat); // le même jour : rien de plus
  assert.equal(etat.carnet.commandes.length, 1);
  // La nuit, rien n'arrive ; le lendemain matin, une deuxième commande.
  etat.journee = 0.9;
  avancerJournee(etat, DUREE_JOURNEE * 0.2); // 4 h 48 du jour 2
  majCarnet(etat);
  assert.equal(etat.carnet.commandes.length, 1);
  avancerJournee(etat, DUREE_JOURNEE * 0.2); // vers 9 h 36
  majCarnet(etat);
  assert.equal(etat.carnet.commandes.length, 2);
  const [a, b] = etat.carnet.commandes;
  assert.notEqual(a.client, b.client);
  // Arrivées le jour 1 puis le jour 2 : on a 2 jours de plus pour chacune.
  assert.deepEqual([a.limite, b.limite], [1 + REGLAGES_CARNET.delai, 2 + REGLAGES_CARNET.delai]);
  // Les commandes ne demandent que des objets qu'on sait fabriquer et vendre.
  for (const c of etat.carnet.commandes) {
    assert.ok(RECETTES[c.objet] && !RECETTES[c.objet].quete);
    assert.ok(c.quantite >= 2 && c.quantite <= 3);
    assert.ok(c.recompense > RECETTES[c.objet].prixVente * c.quantite, 'une commande rapporte plus que le comptoir');
  }
});

test("seuls les habitants qu'on a aidés passent commande", () => {
  const etat = partieFinieJusqua('balance-capucine');
  etat.atelier.clientsServis = 1;
  const clients = new Set();
  for (let jour = 1; jour <= 40; jour++) {
    etat.jour = jour;
    etat.journee = 0.5;
    majCarnet(etat);
    for (const c of etat.carnet.commandes) clients.add(c.client);
    etat.carnet.commandes = [];
  }
  assert.deepEqual([...clients].sort(), ['capucine', 'odile']);
  // Les objets verrouillés (horloge, boîte à musique, automate) ne sont jamais commandés.
  assert.equal(CLIENTS_CARNET.length, 6); // version 1.6 : Anatole aussi
});

test('livrer une commande : il faut tout le stock ; on est payé, le stock baisse', () => {
  const etat = partieFinieJusqua('balance-capucine');
  etat.carnet.commandes = [{ id: 7, client: 'capucine', objet: 'lanterne', quantite: 3, limite: 3, recompense: 145 }];
  etat.atelier.stock.lanterne = 2;
  assert.equal(commandeLivrable(etat, etat.carnet.commandes[0]), false);
  assert.deepEqual(livrerCommande(etat, 7), ['Il manque encore une lanterne.']);
  etat.atelier.stock.lanterne = 4;
  const argent = etat.argent;
  const messages = livrerCommande(etat, 7);
  assert.equal(messages[0], '+145 pièces');
  assert.equal(etat.argent, argent + 145);
  assert.equal(etat.atelier.stock.lanterne, 1);
  assert.equal(etat.carnet.commandes.length, 0);
  assert.equal(etat.carnet.livrees, 1);
});

test("une commande en retard est annulée gentiment, sans rien coûter", () => {
  const etat = partieFinieJusqua('balance-capucine');
  etat.atelier.clientsServis = 1;
  etat.carnet.commandes = [{ id: 1, client: 'odile', objet: 'bouilloire', quantite: 2, limite: 1, recompense: 135 }];
  etat.carnet.dernierJour = 1;
  etat.carnet.compteur = 1;
  const argent = etat.argent;
  const messages = passerLeTemps(etat, DUREE_JOURNEE); // une journée passe
  assert.equal(etat.jour, 2);
  assert.ok(messages.some((m) => m.startsWith("Odile n'a pas pu attendre sa commande. Ce n'est pas grave")), messages.join(' / '));
  assert.equal(etat.argent, argent);
  assert.ok(etat.carnet.commandes.every((c) => c.id !== 1));
});

test("l'objectif rappelle le carnet quand rien de plus pressé n'attend ; l'établi a un marqueur quand c'est prêt", () => {
  // (Toutes les quêtes finies, jusqu'au dirigeable de la version 1.6.)
  const etat = partieFinieJusqua('dirigeable-envol');
  etat.carnet.commandes = [{ id: 1, client: 'odile', objet: 'lanterne', quantite: 2, limite: 3, recompense: 95 }];
  assert.equal(objectifActuel(etat), "Commande d'Odile : 2 lanternes, à fabriquer (carnet, à l'établi).");
  assert.equal(marqueursActifs(etat).etabli, false);
  etat.atelier.stock.lanterne = 2;
  assert.equal(objectifActuel(etat), objectifCarnet(etat));
  assert.match(objectifActuel(etat), /^Commande prête pour Odile/);
  assert.equal(marqueursActifs(etat).etabli, true);
  // Un client au comptoir passe avant le carnet.
  etat.atelier.clients.push({ id: 1, nom: 'Berthe', salut: 'Bonjour', commande: 'lanterne' });
  assert.match(objectifActuel(etat), /^Berthe attend au comptoir/);
  assert.equal(deClient('capucine'), 'de Capucine');
  assert.equal(deClient('augustin'), "d'Augustin");
});

test('le carnet garde le même rythme : la commande arrive le matin, au jour près', () => {
  assert.equal(REGLAGES_CARNET.maximum, 2);
  const etat = partieFinieJusqua('roue-moulin');
  etat.atelier.clientsServis = 2;
  etat.journee = 0.1; // 2 h 24 du matin : trop tôt
  assert.deepEqual(majCarnet(etat), []);
  etat.journee = 0.3;
  assert.equal(majCarnet(etat).length, 1);
  assert.equal(etat.carnet.commandes[0].limite, etat.jour + REGLAGES_CARNET.delai);
});

// -----------------------------------------------------------------------------
// La galerie de la mine
// -----------------------------------------------------------------------------
test("la galerie ouvre après la quête du wagonnet", () => {
  const avant = partieFinieJusqua('train-cuivrebourg');
  assert.equal(galerieOuverte(avant), false);
  assert.equal(libelleZone(avant, 'entree-mine'), "L'entrée de la mine");
  assert.match(messageObjet(avant, 'entree-mine')[0], /Sidonie/);
  const apres = partieFinieJusqua('wagonnet-mine');
  assert.equal(galerieOuverte(apres), true);
  assert.equal(libelleZone(apres, 'entree-mine'), 'Descendre dans la mine');
  // Devant l'entrée, c'est bien elle qu'on vise (et pas le wagonnet tout proche).
  const a = ZONES.mine.arrivees.galerie;
  assert.equal(cibleProcheZone('mine', a.x, a.z, apres), 'entree-mine');
});

test('un filon donne une plaque de cuivre, puis se reforme en 90 secondes', () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  etat.atelier.stock.cuivre = 0;
  assert.equal(recolterFilon(etat, 'filon-1')[0], '+1 plaque de cuivre (cuivre : 1/5)');
  assert.equal(etat.atelier.stock.cuivre, 1);
  assert.equal(filonPret(etat, 'filon-1'), false);
  assert.match(recolterFilon(etat, 'filon-1')[0], /vide/);
  assert.equal(etat.atelier.stock.cuivre, 1);
  avancerGalerie(etat, DUREE_REPOUSSE / 2);
  assert.ok(Math.abs(progressionFilon(etat, 'filon-1') - 0.5) < 1e-9);
  avancerGalerie(etat, DUREE_REPOUSSE / 2);
  assert.equal(filonPret(etat, 'filon-1'), true);
  assert.equal(libelleZone(etat, 'filon-1'), 'Détacher du cuivre');
  // Les autres filons n'ont pas bougé.
  assert.equal(etat.galerie.recoltes, 1);
});

test("pas de cuivre si le stock de l'atelier est plein", () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  etat.atelier.stock.cuivre = 5;
  assert.match(recolterFilon(etat, 'filon-2')[0], /Plus de place/);
  assert.equal(etat.atelier.stock.cuivre, 5);
  assert.equal(filonPret(etat, 'filon-2'), true);
});

test('dans la galerie, chaque filon est accessible, et le tunnel ramène à la mine', () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  const obstacles = obstaclesZone('galerie', etat);
  for (const f of FILONS) {
    // Ferrus peut se tenir là où il faut pour utiliser le filon.
    const p = deplacerJoueur({ x: f.x, z: f.z }, 0, 0, obstacles, ZONES.galerie);
    assert.equal(toucheUnObstacle(p.x, p.z, MONDE.joueur.rayon, obstacles), false);
    assert.equal(cibleProcheZone('galerie', p.x, p.z, etat), f.id, `${f.id} depuis (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
  }
  // L'arrivée depuis la mine est libre.
  const a = ZONES.galerie.arrivees.mine;
  assert.equal(toucheUnObstacle(a.x, a.z, MONDE.joueur.rayon, obstacles), false);
  // On ressort en marchant vers l'ouest.
  let p = { x: a.x, z: a.z };
  let sortie = null;
  for (let i = 0; i < 60 && !sortie; i++) {
    const pas = calculerPas(-1, 0, MONDE.joueur.vitesse, 1 / 30);
    p = deplacerJoueur(p, pas.dx, pas.dz, obstacles, ZONES.galerie);
    sortie = sortieAtteinte('galerie', p.x, p.z, etat);
  }
  assert.equal(sortie && sortie.zone, 'mine');
  assert.equal(toucheUnObstacle(sortie.x, sortie.z, MONDE.joueur.rayon, obstaclesZone('mine', etat)), false);
});

test('la galerie a sa musique, calme et lente', () => {
  assert.ok(AMBIANCES.galerie);
  assert.ok(AMBIANCES.galerie.tempo <= 60);
  assert.equal(ZONES.galerie.souterrain, true);
});

// -----------------------------------------------------------------------------
// Les décorations de l'atelier
// -----------------------------------------------------------------------------
test("les décorations s'achètent une fois, avec l'argent gagné", () => {
  const etat = creerEtatJeu();
  assert.deepEqual(acheterDecoration(etat, 'tapis'), ["L'atelier n'est pas encore ouvert."]);
  ouvrirAtelier(etat);
  etat.argent = 30;
  assert.deepEqual(acheterDecoration(etat, 'horloge-murale'), ["Pas assez d'argent (70 pièces)."]);
  assert.deepEqual(acheterDecoration(etat, 'tapis'), ["Nouvelle décoration : Tapis d'accueil"]);
  assert.equal(etat.argent, 5);
  assert.equal(possedeDecoration(etat, 'tapis'), true);
  assert.deepEqual(acheterDecoration(etat, 'tapis'), ['Déjà installée.']);
  assert.deepEqual(acheterDecoration(etat, 'inconnue'), []);
  assert.equal(Object.values(DECORATIONS).filter((d) => !d.lieu).length, 7); // celles de la façade
});

test("les pots de fleurs ne gênent pas l'accès à l'établi ni au comptoir, et Ferrus ne s'y coince jamais", () => {
  const etat = partieFinieJusqua('lampe-odile');
  etat.atelier.decorations = Object.keys(DECORATIONS);
  const obstacles = obstaclesZone('place', etat);
  assert.ok(obstacles.some((o) => o.id === 'pot-gauche'));
  assert.ok(obstacles.some((o) => o.id === 'pot-droite'));
  for (const cible of ['etabli', 'comptoir']) {
    const c = MONDE[cible];
    const p = deplacerJoueur({ x: c.x, z: c.z + 1.2 }, 0, 0, obstacles);
    assert.ok(Math.hypot(p.x - c.x, p.z - c.z) <= c.distanceInteraction, cible);
  }
  for (let graine = 1; graine <= 20; graine++) {
    let g = graine * 13;
    const hasard = () => ((g = (g * 16807) % 2147483647) / 2147483647) * 2 - 1;
    let p = { x: MONDE.joueur.x, z: MONDE.joueur.z };
    for (let i = 0; i < 120; i++) {
      const dx = hasard();
      const dz = hasard();
      for (let j = 0; j < 30; j++) {
        const pas = calculerPas(dx, dz, MONDE.joueur.vitesse, 1 / 30);
        p = deplacerJoueur(p, pas.dx, pas.dz, obstacles);
        assert.equal(toucheUnObstacle(p.x, p.z, MONDE.joueur.rayon, obstacles), false, `coincé en (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
      }
    }
  }
});

// -----------------------------------------------------------------------------
// La sauvegarde
// -----------------------------------------------------------------------------
test('le jour, le carnet, les décorations et la galerie sont sauvegardés', () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  etat.jour = 6;
  etat.atelier.decorations = ['tapis', 'girouette'];
  etat.carnet.commandes = [{ id: 3, client: 'sidonie', objet: 'bouilloire', quantite: 2, limite: 7, recompense: 135 }];
  etat.carnet.dernierJour = 6;
  etat.carnet.compteur = 3;
  etat.galerie.filons['filon-3'] = 40;
  const relue = chargerPartie(serialiserPartie({ etat, zone: 'galerie', position: { x: 0, z: 0 } }));
  assert.equal(relue.zone, 'galerie');
  assert.deepEqual(relue.etat, etat);
});

test("une partie de la version 1.3 reprend au jour 1 (printemps), avec un carnet vide", () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  delete etat.jour;
  delete etat.carnet;
  delete etat.galerie;
  delete etat.atelier.decorations;
  const relue = chargerPartie(serialiserPartie({ etat, zone: 'mine', position: { x: 2, z: 1 } }));
  assert.equal(relue.etat.jour, 1);
  assert.deepEqual(relue.etat.carnet.commandes, []);
  assert.deepEqual(relue.etat.atelier.decorations, []);
  assert.equal(relue.etat.galerie.filons['filon-1'], 0);
});

test('un carnet ou des décorations trafiqués sont corrigés', () => {
  const etat = partieFinieJusqua('wagonnet-mine');
  const texte = serialiserPartie({ etat, zone: 'place', position: { x: 0, z: 0 } });
  const donnees = JSON.parse(texte);
  donnees.etat.jour = -4;
  donnees.etat.atelier.decorations = ['tapis', 'chateau', 'tapis', 7];
  donnees.etat.carnet.commandes = [
    { id: 1, client: 'odile', objet: 'lanterne', quantite: 2, limite: 3, recompense: 95 },
    { id: 2, client: 'inconnu', objet: 'lanterne', quantite: 2, limite: 3, recompense: 95 },
    { id: 3, client: 'odile', objet: 'axe', quantite: 2, limite: 3, recompense: 95 },
    { id: 4, client: 'odile', objet: 'lanterne', quantite: 999, limite: 3, recompense: 95 },
    'n\'importe quoi',
  ];
  donnees.etat.galerie.filons['filon-1'] = 99999;
  const relue = chargerPartie(JSON.stringify(donnees));
  assert.equal(relue.etat.jour, 1);
  assert.deepEqual(relue.etat.atelier.decorations, ['tapis']);
  assert.deepEqual(relue.etat.carnet.commandes.map((c) => c.id), [1]);
  assert.equal(relue.etat.galerie.filons['filon-1'], DUREE_REPOUSSE);
});
