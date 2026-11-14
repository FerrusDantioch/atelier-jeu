// =============================================================================
// Tests de la version 1.7.1 — à lancer avec : npm test
// -----------------------------------------------------------------------------
// Les ombres de contact, Inès et Malik dans l'album (et leur amitié), et la
// roue du moulin.
// =============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { MONDE, creerEtatJeu, appliquerAction } from '../js/logique.js';
import { ZONES, obstaclesZone, roueReparee } from '../js/logique-zones.js';
import { QUETES } from '../js/logique-quetes.js';
import { GENRES_OMBRE, ombresDeContact, ombrePersonnage } from '../js/logique-ombres.js';
import { AMIS, POINTS_PAR_COEUR, ami, coeurs, pointsAmitie, parlerAmi, offrirCadeau, ajouterChoixAmitie, recompenseEnAttente, recevoirRecompense, anniversairesDuJour, GAINS_AMITIE } from '../js/logique-amitie.js';
import { HABITANTS_ALBUM, noterRencontre, habitantsAlbum } from '../js/logique-album.js';
import { TENUES, ORIGINES_TENUE, possedeTenue } from '../js/logique-garderobe.js';
import { dialogueVille, serviceRendu } from '../js/logique-ville.js';
import { serialiserPartie, chargerPartie } from '../js/logique-sauvegarde.js';
import { TENUES_PNJ } from '../js/personnages.js';

// Une partie où toutes les quêtes sont finies.
function partieFinie() {
  const etat = creerEtatJeu();
  etat.atelier.ouvert = true;
  for (const id of Object.keys(QUETES)) etat.quetes[id].statut = 'terminee';
  return etat;
}

// -----------------------------------------------------------------------------
// 1. Les ombres de contact
// -----------------------------------------------------------------------------
test('chaque lieu a ses ombres de contact, bien formées', () => {
  for (const zone of Object.keys(ZONES)) {
    const ombres = ombresDeContact(zone);
    assert.ok(ombres.length >= 10, `${zone} : ${ombres.length} ombres`);
    for (const o of ombres) {
      assert.ok(GENRES_OMBRE[o.genre], `${zone} ${o.id}`);
      assert.ok(Number.isFinite(o.x) && Number.isFinite(o.z), `${zone} ${o.id}`);
      assert.ok(o.demiLargeur > 0 && o.demiProfondeur > 0, `${zone} ${o.id}`);
      assert.ok(o.arrondi >= 0 && o.arrondi <= Math.min(o.demiLargeur, o.demiProfondeur) + 1e-9, `${zone} ${o.id}`);
      assert.ok(o.marge > 0 && o.marge <= 1, `${zone} ${o.id}`);
      assert.ok(o.force > 0 && o.force <= 0.6, `${zone} ${o.id}`);
    }
  }
  assert.deepEqual(ombresDeContact('nulle-part'), []);
});

test("les ombres de contact ne suivent que ce qui est toujours là", () => {
  // Chaque ombre est au pied d'un vrai obstacle du lieu (dans une partie
  // neuve comme dans une partie finie) : rien ne « flotte » sans objet.
  for (const zone of Object.keys(ZONES)) {
    const debut = new Set(obstaclesZone(zone, creerEtatJeu()).map((o) => o.id));
    const fin = new Set(obstaclesZone(zone, partieFinie()).map((o) => o.id));
    for (const o of ombresDeContact(zone)) {
      assert.ok(debut.has(o.id) && fin.has(o.id), `${zone} : ${o.id}`);
    }
  }
  // Pas d'ombre pour ce qui s'ouvre, s'achète, ou n'est pas posé sur le sol.
  const ids = (zone) => ombresDeContact(zone).map((o) => o.id);
  for (const absent of ['portail', 'passage-est', 'potager', 'odile']) assert.ok(!ids('place').includes(absent), absent);
  assert.ok(!ids('marche').includes(ZONES.marche.barriere.id));
  for (const m of ZONES.interieur.meubles.filter((x) => x.decoration)) assert.ok(!ids('interieur').includes(m.id), m.id);
  assert.ok(!ids('galerie').includes('bassin'));
  assert.ok(!ids('lac').some((id) => (ZONES.lac.lacs || []).some((l) => l.id === id)));
  // Les grands bâtiments ont l'ombre la plus marquée, les haies la plus légère.
  const place = ombresDeContact('place');
  const atelier = place.find((o) => o.id === MONDE.atelier.id);
  assert.equal(atelier.genre, 'batiment');
  assert.equal(atelier.demiLargeur, MONDE.atelier.largeur / 2);
  assert.ok(atelier.force > place.find((o) => o.genre === 'haie').force);
  // Un rond : aussi large que profond, et tout arrondi.
  const puits = place.find((o) => o.id === MONDE.puits.id);
  assert.deepEqual([puits.demiLargeur, puits.demiProfondeur, puits.arrondi], [MONDE.puits.rayon, MONDE.puits.rayon, MONDE.puits.rayon]);
});

test("l'ombre d'un personnage : un petit rond qui le suit", () => {
  const o = ombrePersonnage(3, -2);
  assert.deepEqual([o.x, o.z], [3, -2]);
  assert.equal(o.demiLargeur, o.arrondi);
  assert.ok(ombrePersonnage(0, 0, 0.2).demiLargeur < o.demiLargeur); // le chat
});

// -----------------------------------------------------------------------------
// 2. Inès et Malik : l'album et l'amitié
// -----------------------------------------------------------------------------
test("Inès et Malik entrent dans l'album quand on leur parle", () => {
  const etat = partieFinie();
  for (const id of ['ines', 'malik']) {
    const fiche = HABITANTS_ALBUM.find((h) => h.id === id);
    assert.ok(fiche && fiche.role && fiche.mot, id);
    assert.ok(TENUES_PNJ[id], `${id} a une tenue pour son portrait`);
    assert.equal(habitantsAlbum(etat).find((h) => h.id === id).connu, false);
    assert.equal(noterRencontre(etat, id), true);
    assert.equal(noterRencontre(etat, id), false); // une seule fois
    const connue = habitantsAlbum(etat).find((h) => h.id === id);
    assert.equal(connue.connu, true);
    assert.equal(connue.coeurs, 0);
    assert.match(connue.anniversaire, /jour/);
  }
  // Les compagnons restent à la fin de l'album.
  const ordre = HABITANTS_ALBUM.map((h) => h.id);
  assert.ok(ordre.indexOf('malik') < ordre.indexOf('chat'));
});

test("l'amitié d'Inès et de Malik : parler, offrir, et le service rendu qui compte", () => {
  const etat = partieFinie();
  etat.jour = 20;
  assert.ok(ami('ines') && ami('malik'));
  assert.equal(pointsAmitie(etat, 'ines'), 0);
  parlerAmi(etat, 'ines');
  assert.equal(pointsAmitie(etat, 'ines'), GAINS_AMITIE.parler);
  // Chacun adore un objet : Inès une lanterne, Malik un bouquet.
  etat.atelier.stock.lanterne = 1;
  const r = offrirCadeau(etat, 'ines', 'lanterne');
  assert.match(r.reaction, /tramway/);
  assert.equal(pointsAmitie(etat, 'ines'), GAINS_AMITIE.parler + GAINS_AMITIE.adore);
  etat.atelier.stock.bouquet = 1;
  assert.match(offrirCadeau(etat, 'malik', 'bouquet').reaction, /terrasse/);
  // Rendre le service demandé compte pour l'amitié.
  const avant = pointsAmitie(etat, 'malik');
  etat.atelier.stock.bouilloire = 1;
  appliquerAction(etat, 'ville:donner:malik');
  assert.ok(serviceRendu(etat, 'malik'));
  assert.equal(pointsAmitie(etat, 'malik') - avant, 40);
  // Une fois le service rendu, on peut offrir un cadeau en lui parlant.
  etat.jour = 21;
  etat.atelier.stock.lanterne = 1;
  const d = ajouterChoixAmitie(etat, 'malik', dialogueVille(etat, 'malik'));
  assert.equal(d.choix[0].action, 'amitie:cadeau:malik');
  // Tant qu'il attend son objet, le dialogue ne propose pas de cadeau.
  const attente = dialogueVille(etat, 'ines');
  assert.equal(ajouterChoixAmitie(etat, 'ines', attente), attente);
});

test("les cadeaux d'amitié de la ville : la casquette du tramway et le tablier du café", () => {
  const etat = partieFinie();
  for (const [id, tenue] of [['ines', 'casquette-tram'], ['malik', 'tablier-barista']]) {
    assert.equal(ami(id).cadeau5.tenue, tenue);
    assert.equal(TENUES[tenue].origine, id);
    assert.ok(ORIGINES_TENUE[id]);
    etat.amitie.amis[id].points = 5 * POINTS_PAR_COEUR;
    assert.equal(coeurs(etat, id), 5);
    assert.equal(recompenseEnAttente(etat, id), 3);
    assert.ok(recevoirRecompense(etat, id, 3).length > 0);
    assert.ok(recevoirRecompense(etat, id, 5).length > 0);
    assert.ok(possedeTenue(etat, tenue));
    assert.equal(recompenseEnAttente(etat, id), null);
  }
  assert.equal(TENUES['casquette-tram'].categorie, 'chapeau');
  assert.equal(TENUES['tablier-barista'].categorie, 'tablier');
  // Leurs anniversaires sont dans le calendrier.
  const fetes = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((j) => anniversairesDuJour(j).map((a) => a.id));
  assert.ok(fetes.includes('ines') && fetes.includes('malik'));
  assert.equal(fetes.length, AMIS.length);
});

test("une partie de la version 1.7 s'ouvre toujours : Inès et Malik y deviennent des amis", () => {
  const etat = partieFinie();
  etat.ville.services.ines = true;
  etat.amitie.amis.odile.points = 120;
  const donnees = JSON.parse(serialiserPartie({ etat, zone: 'ville', position: { x: 0, z: 2 }, orientation: 0 }));
  // Comme en 1.7.0 : pas encore d'amitié pour eux.
  delete donnees.etat.amitie.amis.ines;
  delete donnees.etat.amitie.amis.malik;
  const relue = chargerPartie(JSON.stringify(donnees));
  assert.ok(relue, 'la partie est lue');
  assert.deepEqual(relue.etat.amitie.amis.malik, { points: 0, parle: 0, cadeau: 0 });
  assert.equal(relue.etat.amitie.amis.odile.points, 120);
  // Le service déjà rendu à Inès compte tout de suite.
  assert.equal(pointsAmitie(relue.etat, 'ines'), 40);
  assert.equal(relue.zone, 'ville');
});

// -----------------------------------------------------------------------------
// 3. La roue du moulin
// -----------------------------------------------------------------------------
test("la roue du moulin tourne dès que l'axe est installé", () => {
  const etat = creerEtatJeu();
  assert.equal(roueReparee(etat), false);
  etat.quetes['roue-moulin'].statut = 'terminee';
  assert.equal(roueReparee(etat), true);
});
