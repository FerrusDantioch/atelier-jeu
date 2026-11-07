// =============================================================================
// logique-sauvegarde.js — ENREGISTRER ET RELIRE LA PARTIE (étape 3)
// -----------------------------------------------------------------------------
// La partie est enregistrée dans le navigateur (le « localStorage »), sous
// forme de texte (du JSON). Ce fichier transforme la partie en texte, et
// relit ce texte en VÉRIFIANT tout : une sauvegarde abîmée, trafiquée ou
// faite par une ancienne version du jeu ne doit jamais casser le jeu.
//   - ce qui manque est complété avec les valeurs d'une nouvelle partie ;
//   - ce qui a un type inattendu est ignoré ;
//   - si rien n'est lisible, on renvoie null (le jeu démarre alors une
//     nouvelle partie).
//
// Ce fichier ne touche pas lui-même au navigateur : main.js s'en charge.
// Il peut donc être testé avec « node --test ».
// =============================================================================

import { creerEtatJeu } from './logique.js';
import { RECETTES, DECORATIONS, vendableAuComptoir, estRecolte } from './logique-atelier.js';
import { AMIS, POINTS_MAX } from './logique-amitie.js';
import { TENUES, TENUE_DEPART, CATEGORIES_TENUE } from './logique-garderobe.js';
import { PLACES_VITRINE, INTERVALLE_VISITEURS, decrireObjetVitrine } from './logique-vitrine.js';
import { CURIOSITES, CONSTELLATIONS, DUREE_REPOUSSE_FORET } from './logique-foret.js';
import { CLIENTS_CARNET } from './logique-commandes.js';
import { DUREE_REPOUSSE } from './logique-galerie.js';
import { TACHES_APPRENTIE } from './logique-atelier.js';
import { FETES } from './logique-fetes.js';
import { HABITANTS_ALBUM } from './logique-album.js';
import { ZONES } from './logique-zones.js';
import { QUETES, majDisponibilites } from './logique-quetes.js';
import { bouclerJournee } from './logique-temps.js';

export const CLE_SAUVEGARDE = 'atelier-cuivrebourg-sauvegarde';
// Version 2 : la quête de la lampe d'Odile est rangée avec les autres quêtes.
// Les sauvegardes de la version 1 sont converties en les relisant.
export const VERSION_SAUVEGARDE = 2;

// Transforme la partie en texte.
export function serialiserPartie({ etat, zone, position, orientation = 0 }) {
  return JSON.stringify({
    version: VERSION_SAUVEGARDE,
    date: new Date().toISOString(),
    etat,
    zone,
    position: { x: position.x, z: position.z },
    orientation,
  });
}

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const estNombre = (v) => typeof v === 'number' && Number.isFinite(v);

// Recopie dans « modele » (une partie neuve) les valeurs lues, seulement si
// elles ont le même type. Les clés inconnues sont ignorées.
function fusionner(modele, lu) {
  if (!estObjet(lu)) return modele;
  for (const cle of Object.keys(modele)) {
    const attendu = modele[cle];
    const valeur = lu[cle];
    if (valeur === undefined) continue;
    if (estObjet(attendu)) fusionner(attendu, valeur);
    else if (Array.isArray(attendu)) { if (Array.isArray(valeur)) modele[cle] = valeur; }
    else if (typeof attendu === 'number') { if (estNombre(valeur)) modele[cle] = valeur; }
    else if (typeof attendu === typeof valeur) modele[cle] = valeur;
  }
  return modele;
}

// Les sauvegardes de la version 1 rangeaient la quête de la lampe à part
// (« etat.quete », avec une étape écrite en toutes lettres). On la range dans
// « etat.quetes », comme les autres quêtes.
const ANCIENNES_ETAPES = {
  pas_commencee: { statut: 'disponible', etape: 0 },
  acceptee: { statut: 'en_cours', etape: 0 },
  engrenages_reunis: { statut: 'en_cours', etape: 1 },
  lampe_reparee: { statut: 'en_cours', etape: 2 },
  terminee: { statut: 'terminee', etape: 3 },
};
function convertirVersion1(lu) {
  const ancienne = estObjet(lu.quete) ? lu.quete : {};
  const correspondance = ANCIENNES_ETAPES[ancienne.etape] || ANCIENNES_ETAPES.pas_commencee;
  const ramasses = Array.isArray(ancienne.engrenagesRamasses) ? ancienne.engrenagesRamasses : [];
  if (!estObjet(lu.quetes)) lu.quetes = {};
  lu.quetes['lampe-odile'] = { ...correspondance, ramasses };
  delete lu.quete;
}

// Les vérifications des nouveautés de la version 1.6 (une partie plus ancienne
// les reçoit toutes neuves, grâce à « fusionner »).
const entier = (n, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.min(max, Math.max(min, Math.floor(n)));
function verifierVersion16(etat) {
  etat.atelier.assemblages = entier(etat.atelier.assemblages);
  // L'amitié.
  for (const a of AMIS) {
    const s = etat.amitie.amis[a.id];
    s.points = entier(s.points, 0, POINTS_MAX);
    s.parle = entier(s.parle);
    s.cadeau = entier(s.cadeau);
  }
  const cles = new Set(AMIS.flatMap((a) => [`${a.id}-3`, `${a.id}-5`]));
  etat.amitie.recompenses = [...new Set(etat.amitie.recompenses.filter((c) => cles.has(c)))];
  // La garde-robe : seulement des tenues connues (et pas celles du départ).
  const g = etat.garderobe;
  g.possedes = [...new Set(g.possedes.filter((id) => TENUES[id] && !TENUES[id].defaut))];
  for (const c of CATEGORIES_TENUE) {
    const id = g.porte[c.id];
    const ok = TENUES[id] && TENUES[id].categorie === c.id && (TENUES[id].defaut || g.possedes.includes(id));
    if (!ok) g.porte[c.id] = TENUE_DEPART[c.id];
  }
  // La vitrine : six places, chacune vide ou avec un objet connu (sans doublon).
  const v = etat.vitrine;
  const vus = new Set();
  v.objets = Array.from({ length: PLACES_VITRINE }, (_, i) => {
    const code = v.objets[i];
    if (typeof code !== 'string' || !decrireObjetVitrine(code) || vus.has(code)) return '';
    vus.add(code);
    return code;
  });
  v.prochain = Math.min(INTERVALLE_VISITEURS, Math.max(0, v.prochain));
  v.visiteurs = entier(v.visiteurs);
  v.pourboires = entier(v.pourboires);
  if (!(v.graine >= 1 && v.graine < 2147483647)) v.graine = 909;
  // La forêt et les curiosités.
  const f = etat.foret;
  for (const id of Object.keys(f.cueillettes)) f.cueillettes[id] = Math.min(DUREE_REPOUSSE_FORET, Math.max(0, f.cueillettes[id]));
  f.recoltes = entier(f.recoltes);
  f.constellations = [...new Set(f.constellations.filter((id) => CONSTELLATIONS.some((c) => c.id === id)))];
  f.derniereNuit = entier(f.derniereNuit);
  if (!(f.graine >= 1 && f.graine < 2147483647)) f.graine = 4242;
  etat.curiosites = [...new Set(etat.curiosites.filter((id) => CURIOSITES[id]))];
  // Le journal.
  etat.journal.dernierJour = entier(etat.journal.dernierJour);
  etat.journal.lu = entier(etat.journal.lu, 0, etat.journal.dernierJour);
}

// -----------------------------------------------------------------------------
// Version 1.6 : enregistrer la partie dans un FICHIER, et l'ouvrir ailleurs
// (pour passer de l'ordinateur au téléphone). Le fichier contient exactement
// le même texte que la sauvegarde du navigateur ; on le relit avec chargerPartie
// (qui vérifie tout).
// -----------------------------------------------------------------------------
export const TAILLE_MAX_FICHIER = 2000000; // 2 Mo : bien plus qu'une vraie partie

// « cuivrebourg-partie-2026-11-07.json »
export function nomFichierSauvegarde(date = new Date()) {
  const deux = (n) => String(n).padStart(2, '0');
  return `cuivrebourg-partie-${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}.json`;
}

// Un petit résumé d'une partie relue : « Jour 12 · 340 pièces · 4 quêtes sur 12 ».
export function resumePartie(partie) {
  if (!partie || !partie.etat) return '';
  const e = partie.etat;
  const quetes = Object.values(e.quetes);
  const finies = quetes.filter((q) => q.statut === 'terminee').length;
  return `Jour ${e.jour} · ${e.argent} pièces · ${finies} quête${finies > 1 ? 's' : ''} terminée${finies > 1 ? 's' : ''} sur ${quetes.length}`;
}

// Relit une sauvegarde. Renvoie { etat, zone, position, orientation } ou null.
export function chargerPartie(texte) {
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch {
    return null;
  }
  if (!estObjet(donnees) || ![1, VERSION_SAUVEGARDE].includes(donnees.version) || !estObjet(donnees.etat)) return null;

  const lu = donnees.etat;
  if (donnees.version === 1) convertirVersion1(lu);
  const etat = fusionner(creerEtatJeu(), lu);

  // Vérifications plus précises.
  if (etat.argent < 0) etat.argent = 0;
  for (const [id, n] of Object.entries(etat.atelier.stock)) {
    etat.atelier.stock[id] = Math.max(0, Math.floor(n));
  }
  etat.atelier.ameliorations = etat.atelier.ameliorations.filter((id) => typeof id === 'string');
  etat.atelier.recettesQuete = etat.atelier.recettesQuete.filter((id) => RECETTES[id]);
  // La fabrication en cours (null dans une partie neuve, donc vérifiée à part).
  const f = estObjet(lu.atelier) ? lu.atelier.fabrication : null;
  etat.atelier.fabrication = estObjet(f) && RECETTES[f.recette] && estNombre(f.restant) && estNombre(f.total) && f.total > 0
    ? { recette: f.recette, restant: f.restant, total: f.total }
    : null;
  // Les clients qui attendaient.
  etat.atelier.clients = etat.atelier.clients
    .filter((c) => estObjet(c) && estNombre(c.id) && typeof c.nom === 'string' && RECETTES[c.commande])
    .slice(0, 3)
    .map((c) => ({ id: c.id, nom: c.nom, salut: typeof c.salut === 'string' ? c.salut : 'Bonjour !', commande: c.commande }));
  // Le moment de la journée (version 1.2) : toujours entre 0 et 1.
  etat.journee = bouclerJournee(etat.journee);
  // Version 1.4 : le numéro du jour, les décorations, le carnet et la galerie.
  // (Une partie d'une version plus ancienne commence au jour 1, au printemps.)
  etat.jour = Math.max(1, Math.floor(etat.jour));
  etat.atelier.decorations = [...new Set(etat.atelier.decorations.filter((id) => DECORATIONS[id]))];
  const carnet = etat.carnet;
  carnet.dernierJour = Math.max(0, Math.floor(carnet.dernierJour));
  const clients = new Set(CLIENTS_CARNET.map((c) => c.id));
  carnet.commandes = carnet.commandes
    .filter((c) => estObjet(c) && estNombre(c.id) && clients.has(c.client) && RECETTES[c.objet] && vendableAuComptoir(c.objet) && !estRecolte(c.objet)
      && Number.isInteger(c.quantite) && c.quantite >= 1 && c.quantite <= 10 && estNombre(c.limite) && estNombre(c.recompense) && c.recompense >= 0)
    .slice(0, 2)
    .map((c) => ({ id: c.id, client: c.client, objet: c.objet, quantite: c.quantite, limite: Math.floor(c.limite), recompense: Math.floor(c.recompense) }));
  for (const id of Object.keys(etat.galerie.filons)) {
    etat.galerie.filons[id] = Math.min(DUREE_REPOUSSE, Math.max(0, etat.galerie.filons[id]));
  }
  // Version 1.5 : l'apprentie, les fêtes, le potager, la pêche et l'album.
  const ap = etat.atelier.apprentie;
  if (!TACHES_APPRENTIE.includes(ap.tache)) ap.tache = 'lanterne';
  const fa = estObjet(lu.atelier) && estObjet(lu.atelier.apprentie) ? lu.atelier.apprentie.fabrication : null;
  ap.fabrication = estObjet(fa) && ['lanterne', 'bouilloire'].includes(fa.recette) && estNombre(fa.restant) && estNombre(fa.total) && fa.total > 0
    ? { recette: fa.recette, restant: fa.restant, total: fa.total }
    : null;
  etat.atelier.recettesFete = etat.atelier.recettesFete.filter((id) => RECETTES[id] && RECETTES[id].fete);
  etat.fetes.faites = [...new Set(etat.fetes.faites.filter((c) => typeof c === 'string' && FETES.some((f) => c.startsWith(`${f.id}-`))))];
  etat.fetes.annonce = Math.max(0, Math.floor(etat.fetes.annonce));
  etat.potager.pousse = Math.min(1, Math.max(-1, etat.potager.pousse));
  etat.potager.recoltes = Math.max(0, Math.floor(etat.potager.recoltes));
  for (const id of Object.keys(etat.peche.especes)) etat.peche.especes[id] = Math.max(0, Math.floor(etat.peche.especes[id]));
  etat.peche.prises = Math.max(0, Math.floor(etat.peche.prises));
  if (!(etat.peche.graine >= 1 && etat.peche.graine < 2147483647)) etat.peche.graine = 777;
  etat.album.rencontres = [...new Set(etat.album.rencontres.filter((id) => HABITANTS_ALBUM.some((h) => h.id === id)))];
  // Version 1.6 : l'amitié, la garde-robe, la vitrine, la forêt, le journal.
  verifierVersion16(etat);
  // Les quêtes.
  const statuts = ['verrouillee', 'disponible', 'en_cours', 'terminee'];
  for (const [id, s] of Object.entries(etat.quetes)) {
    if (!statuts.includes(s.statut)) s.statut = 'verrouillee';
    // Le numéro d'étape doit exister dans la quête (une quête terminée est
    // « après » sa dernière étape).
    const max = s.statut === 'terminee' ? QUETES[id].etapes.length : QUETES[id].etapes.length - 1;
    s.etape = Math.min(max, Math.max(0, Math.floor(s.etape)));
    s.ramasses = s.ramasses.filter((id) => typeof id === 'string');
  }

  // Le lieu et la position (sinon : la place, au point de départ).
  const zone = typeof donnees.zone === 'string' && ZONES[donnees.zone] ? donnees.zone : 'place';
  const p = donnees.position;
  const position = estObjet(p) && estNombre(p.x) && estNombre(p.z) ? { x: p.x, z: p.z } : null;
  const orientation = estNombre(donnees.orientation) ? donnees.orientation : 0;
  // Une seule quête peut être en cours : s'il y en a plusieurs, on garde la première.
  let dejaUne = false;
  for (const s of Object.values(etat.quetes)) {
    if (s.statut === 'en_cours') {
      if (dejaUne) s.statut = 'disponible';
      dejaUne = true;
    }
  }
  // Une quête dont le prérequis est fini ne doit pas rester verrouillée
  // (la toute première, la lampe d'Odile, n'a pas de prérequis).
  majDisponibilites(etat);
  return { etat, zone: position ? zone : 'place', position, orientation };
}
