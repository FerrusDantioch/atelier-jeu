// =============================================================================
// logique-commandes.js — LE CARNET DE COMMANDES (version 1.4), sans aucune 3D
// -----------------------------------------------------------------------------
// En plus des clients du comptoir, les habitants que Ferrus a aidés passent
// parfois une COMMANDE SPÉCIALE : plusieurs objets d'un coup, à livrer avant
// un certain jour. Léon, le facteur, apporte la commande et se charge de la
// livraison : on la livre depuis le carnet, à l'établi (onglet « Carnet »).
//
//   - une nouvelle commande arrive au plus une fois par jour, le matin ;
//   - deux commandes au maximum en même temps ;
//   - on a 2 jours de plus pour la livrer (jusqu'à la fin du jour indiqué) ;
//   - elle rapporte nettement plus que les mêmes objets vendus au comptoir.
//
// Confort : une commande qui n'a pas pu être livrée à temps est simplement
// annulée, gentiment, sans aucune pénalité. Une autre viendra.
//
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { RECETTES, recettesDisponibles } from './logique-atelier.js';
import { queteTerminee } from './logique-quetes.js';

// Les réglages du carnet.
export const REGLAGES_CARNET = Object.freeze({
  maximum: 2,          // commandes en même temps
  delai: 2,            // jours en plus pour livrer
  bonus: 1.5,          // la commande rapporte 1,5 fois le prix du comptoir
  heureArrivee: 0.25,  // les commandes arrivent à partir de 6 h du matin
});

// Les habitants qui peuvent passer commande : ceux que Ferrus a aidés (leur
// quête est terminée). Chacun a une petite raison de commander.
export const CLIENTS_CARNET = Object.freeze([
  { id: 'odile', nom: 'Odile', quete: 'lampe-odile', raison: 'pour ses voisines' },
  { id: 'capucine', nom: 'Capucine', quete: 'balance-capucine', raison: 'pour les vendre à son étal' },
  { id: 'barnabe', nom: 'Barnabé', quete: 'roue-moulin', raison: 'pour les familles du moulin' },
  { id: 'augustin', nom: 'Augustin', quete: 'horloge-gare', raison: 'pour les voyageurs de la gare' },
  { id: 'sidonie', nom: 'Sidonie', quete: 'wagonnet-mine', raison: 'pour les mineurs' },
]);

export function creerEtatCarnet() {
  return {
    commandes: [],   // { id, client, objet, quantite, limite, recompense }
    dernierJour: 0,  // le dernier jour où une commande est arrivée
    compteur: 0,     // pour donner un numéro unique à chaque commande
    livrees: 0,      // combien de commandes livrées depuis le début
    graine: 1404,    // pour le « hasard » des commandes (toujours le même)
  };
}

// Le même petit « hasard » reproductible que pour les clients du comptoir.
function hasard(carnet) {
  carnet.graine = (carnet.graine * 16807) % 2147483647;
  return (carnet.graine - 1) / 2147483646;
}

const jourActuel = (etat) => (Number.isFinite(etat.jour) && etat.jour >= 1 ? Math.floor(etat.jour) : 1);

// Le carnet s'ouvre une fois l'atelier ouvert et le premier client servi
// (on a d'abord appris à vendre au comptoir).
export function carnetOuvert(etat) {
  return etat.atelier.ouvert && etat.atelier.clientsServis >= 1;
}

// Le texte d'une quantité d'objets : « 3 lanternes », « 1 automate de cuivre ».
export function decrireObjets(objet, quantite) {
  const r = RECETTES[objet];
  return quantite > 1 ? `${quantite} ${r.pluriel}` : r.article;
}

// Combien de jours reste-t-il pour livrer ? (0 = c'est le dernier jour)
export function joursRestants(etat, commande) {
  return commande.limite - jourActuel(etat);
}

// Le stock permet-il de livrer cette commande ?
export function commandeLivrable(etat, commande) {
  return etat.atelier.stock[commande.objet] >= commande.quantite;
}

// Les habitants qui peuvent commander, et les objets qu'on peut leur proposer.
function clientsPossibles(etat) {
  const occupes = new Set(etat.carnet.commandes.map((c) => c.client));
  return CLIENTS_CARNET.filter((c) => queteTerminee(etat, c.quete) && !occupes.has(c.id));
}
function objetsPossibles(etat) {
  return recettesDisponibles(etat).filter((id) => !RECETTES[id].quete);
}

// -----------------------------------------------------------------------------
// Le carnet vit au fil des jours (appelé à chaque image par main.js : c'est
// très léger). Renvoie les messages à afficher.
// -----------------------------------------------------------------------------
export function majCarnet(etat) {
  const carnet = etat.carnet;
  const jour = jourActuel(etat);
  const messages = [];

  // 1. Les commandes trop anciennes sont annulées, sans pénalité.
  const restent = [];
  for (const c of carnet.commandes) {
    if (jour > c.limite) messages.push(`${nomClient(c.client)} n'a pas pu attendre sa commande. Ce n'est pas grave : d'autres viendront !`);
    else restent.push(c);
  }
  carnet.commandes = restent;

  // 2. Une nouvelle commande le matin (au plus une par jour).
  if (!carnetOuvert(etat)) return messages;
  if (carnet.commandes.length >= REGLAGES_CARNET.maximum) return messages;
  if (carnet.dernierJour >= jour || etat.journee < REGLAGES_CARNET.heureArrivee) return messages;
  const clients = clientsPossibles(etat);
  const objets = objetsPossibles(etat);
  if (clients.length === 0 || objets.length === 0) return messages;

  const client = clients[Math.floor(hasard(carnet) * clients.length)];
  const objet = objets[Math.floor(hasard(carnet) * objets.length)];
  const prix = RECETTES[objet].prixVente;
  // Les objets chers par 2, les autres par 2 ou 3.
  const quantite = prix >= 70 ? 2 : 2 + Math.floor(hasard(carnet) * 2);
  const recompense = Math.round((prix * quantite * REGLAGES_CARNET.bonus) / 5) * 5;
  carnet.compteur += 1;
  carnet.dernierJour = jour;
  const commande = { id: carnet.compteur, client: client.id, objet, quantite, limite: jour + REGLAGES_CARNET.delai, recompense };
  carnet.commandes.push(commande);
  messages.push(`Léon apporte une commande : ${client.nom} voudrait ${decrireObjets(objet, quantite)} (carnet, à l'établi).`);
  return messages;
}

// Livrer une commande (Léon s'en charge). Renvoie les messages à afficher.
export function livrerCommande(etat, id) {
  const carnet = etat.carnet;
  const commande = carnet.commandes.find((c) => c.id === id);
  if (!commande) return [];
  if (!commandeLivrable(etat, commande)) {
    const manque = commande.quantite - etat.atelier.stock[commande.objet];
    return [`Il manque encore ${decrireObjets(commande.objet, manque)}.`];
  }
  etat.atelier.stock[commande.objet] -= commande.quantite;
  etat.argent += commande.recompense;
  carnet.commandes = carnet.commandes.filter((c) => c.id !== id);
  carnet.livrees += 1;
  return [`+${commande.recompense} pièces`, `Léon livre ${decrireObjets(commande.objet, commande.quantite)} à ${nomClient(commande.client)}. Merci !`];
}

// « de Capucine », mais « d'Odile » (devant une voyelle).
export function deClient(id) {
  const nom = nomClient(id);
  return /^[AEIOUÉÈ]/.test(nom) ? `d'${nom}` : `de ${nom}`;
}

export function nomClient(id) {
  const c = CLIENTS_CARNET.find((x) => x.id === id);
  return c ? c.nom : id;
}
export function raisonClient(id) {
  const c = CLIENTS_CARNET.find((x) => x.id === id);
  return c ? c.raison : '';
}

// Le délai, en clair : « avant la fin du jour 5 (encore 2 jours) ».
export function texteDelai(etat, commande) {
  const reste = joursRestants(etat, commande);
  const encore = reste <= 0 ? "c'est le dernier jour" : reste === 1 ? 'encore 1 jour' : `encore ${reste} jours`;
  return `Avant la fin du jour ${commande.limite} (${encore})`;
}

// Une phrase pour le cadre « Objectif », quand rien de plus pressé n'attend.
export function objectifCarnet(etat) {
  const commandes = etat.carnet.commandes;
  if (commandes.length === 0) return null;
  const prete = commandes.find((c) => commandeLivrable(etat, c));
  if (prete) return `Commande prête pour ${nomClient(prete.client)} : livre-la depuis le carnet, à l'établi.`;
  const c = commandes[0];
  return `Commande ${deClient(c.client)} : ${decrireObjets(c.objet, c.quantite)}, à fabriquer (carnet, à l'établi).`;
}

// Y a-t-il une commande prête à livrer ? (pour le marqueur de l'établi)
export function commandePrete(etat) {
  return etat.carnet.commandes.some((c) => commandeLivrable(etat, c));
}
