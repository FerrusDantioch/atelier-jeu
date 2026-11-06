// =============================================================================
// logique-atelier.js — LES RÈGLES DE LA GESTION DE L'ATELIER (étape 2)
// -----------------------------------------------------------------------------
// Comme logique.js, ce fichier ne contient AUCUNE 3D : seulement des règles et
// des calculs. Il est testé par tests/atelier.test.js.
//
// L'atelier ouvre ses portes quand la quête d'Odile est terminée. Ensuite :
//   - on ACHÈTE des matériaux (cuivre, bois, ressorts) ;
//   - on FABRIQUE des objets à l'établi (cela prend quelques secondes) ;
//   - des CLIENTS arrivent au comptoir et commandent un objet : on les sert
//     pour être payé ;
//   - avec l'argent gagné, on achète des AMÉLIORATIONS pour l'atelier ;
//   - (version 1.4) et des DÉCORATIONS, juste pour le plaisir des yeux.
//
// Le temps qui passe est donné par main.js (« dt », en secondes) à la fonction
// avancerTemps. Les tests peuvent donc « faire passer le temps » instantanément.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. LES DONNÉES : matériaux, recettes, améliorations, habitants
// -----------------------------------------------------------------------------

// Les matériaux qu'on achète. « prix » = prix d'une unité, en pièces.
export const MATERIAUX = Object.freeze({
  cuivre: { nom: 'Plaque de cuivre', pluriel: 'plaques de cuivre', court: 'cuivre', prix: 8 },
  bois: { nom: 'Planche de bois', pluriel: 'planches de bois', court: 'bois', prix: 4 },
  ressort: { nom: 'Ressort', pluriel: 'ressorts', court: 'ressort', prix: 6 },
});

// Ce qu'on sait fabriquer.
// - ingredients : les matériaux consommés ;
// - duree : le temps de fabrication, en secondes ;
// - prixVente : ce que paie le client ;
// - plans : l'amélioration nécessaire pour débloquer la recette (sinon rien).
export const RECETTES = Object.freeze({
  lanterne: {
    nom: 'Lanterne',
    article: 'une lanterne',
    pluriel: 'lanternes',
    ingredients: { cuivre: 1, ressort: 1 },
    duree: 6,
    prixVente: 32,
  },
  bouilloire: {
    nom: 'Bouilloire à vapeur',
    article: 'une bouilloire à vapeur',
    pluriel: 'bouilloires à vapeur',
    ingredients: { cuivre: 2, bois: 1 },
    duree: 9,
    prixVente: 45,
  },
  horloge: {
    nom: 'Horloge mécanique',
    article: 'une horloge mécanique',
    pluriel: 'horloges mécaniques',
    ingredients: { cuivre: 1, bois: 1, ressort: 2 },
    duree: 14,
    prixVente: 75,
    plans: 'plans-horloge',
  },
  // Version 1.3 : deux nouveaux objets pour les clients.
  'boite-musique': {
    nom: 'Boîte à musique',
    article: 'une boîte à musique',
    pluriel: 'boîtes à musique',
    ingredients: { cuivre: 1, bois: 2, ressort: 1 },
    duree: 12,
    prixVente: 70,
    plans: 'plans-boite-musique',
  },
  automate: {
    nom: 'Automate de cuivre',
    article: 'un automate de cuivre',
    pluriel: 'automates de cuivre',
    ingredients: { cuivre: 3, ressort: 2 },
    duree: 18,
    prixVente: 120,
    plans: 'plans-automate',
  },
  // Objets de quête (étape 3) : on ne peut les fabriquer que pendant la quête
  // qui les demande (« quete »), et les clients ne les commandent jamais.
  balance: {
    nom: 'Balance de précision',
    article: 'une balance de précision',
    ingredients: { cuivre: 2, ressort: 1 },
    duree: 8,
    prixVente: 0,
    quete: 'balance-capucine',
  },
  axe: {
    nom: 'Axe en laiton',
    article: 'un axe en laiton',
    ingredients: { cuivre: 1, bois: 2 },
    duree: 10,
    prixVente: 0,
    quete: 'roue-moulin',
  },
  // Objets de quête de la gare (version 1.2).
  regulateur: {
    nom: "Régulateur d'horloge",
    article: "un régulateur d'horloge",
    ingredients: { cuivre: 1, ressort: 2 },
    duree: 10,
    prixVente: 0,
    quete: 'horloge-gare',
  },
  sifflet: {
    nom: 'Sifflet à vapeur',
    article: 'un sifflet à vapeur',
    ingredients: { cuivre: 2, bois: 1 },
    duree: 8,
    prixVente: 0,
    quete: 'train-cuivrebourg',
  },
  'roue-wagonnet': {
    nom: 'Roue de wagonnet',
    article: 'une roue de wagonnet',
    ingredients: { cuivre: 1, bois: 1, ressort: 1 },
    duree: 9,
    prixVente: 0,
    quete: 'wagonnet-mine',
  },
});

// Les améliorations de l'atelier (chacune ne s'achète qu'une fois).
export const AMELIORATIONS = Object.freeze({
  etageres: { nom: 'Étagères', description: 'Plus de place : 10 de chaque au lieu de 5.', prix: 60 },
  soufflet: { nom: 'Soufflet de forge', description: 'La fabrication va deux fois plus vite.', prix: 90 },
  enseigne: { nom: 'Enseigne en cuivre', description: 'Les clients viennent plus souvent.', prix: 110 },
  'plans-horloge': { nom: "Plans d'horloger", description: 'Débloque la fabrication des horloges.', prix: 140 },
  // Version 1.3.
  'plans-boite-musique': { nom: 'Plans de boîte à musique', description: 'Débloque la fabrication des boîtes à musique.', prix: 120 },
  // Celle-ci ne s'achète pas : c'est le cadeau de Sidonie, à la fin de sa quête à la mine.
  'plans-automate': { nom: "Plans d'automate", description: 'Débloque la fabrication des automates de cuivre.', prix: 0, cadeau: 'wagonnet-mine' },
});

// Les décorations de l'atelier (version 1.4). Elles ne changent rien aux
// règles : c'est seulement pour le plaisir des yeux. Chacune s'achète une fois,
// et apparaît aussitôt sur la façade de l'atelier, sur la place.
export const DECORATIONS = Object.freeze({
  tapis: { nom: "Tapis d'accueil", description: 'Un tapis rayé devant la porte, pour bien accueillir les clients.', prix: 25 },
  'lanterne-porte': { nom: 'Lanterne de porte', description: "Une petite lanterne près de l'entrée, qui s'allume le soir.", prix: 30 },
  fanions: { nom: 'Guirlande de fanions', description: 'Des fanions colorés tout le long du toit.', prix: 35 },
  'pots-fleurs': { nom: 'Plantes en pots', description: "Deux grands pots fleuris, aux coins de l'atelier.", prix: 40 },
  jardinieres: { nom: 'Jardinières fleuries', description: 'Des fleurs sous les deux fenêtres.', prix: 45 },
  girouette: { nom: 'Girouette en cuivre', description: 'Un petit coq de cuivre sur le toit, qui tourne au gré du vent.', prix: 55 },
  'horloge-murale': { nom: 'Horloge murale', description: "Une horloge sur la façade, qui donne l'heure de Cuivrebourg.", prix: 70 },
});

// Les habitants qui viennent acheter (ils arrivent chacun leur tour).
export const HABITANTS = Object.freeze([
  { nom: 'Berthe', salut: "Bonjour, monsieur l'artisan !" },
  { nom: 'Gaspard', salut: 'Bien le bonjour !' },
  { nom: 'Margot', salut: "Ah, l'atelier est enfin rouvert !" },
  { nom: 'Célestin', salut: 'Bonjour ! Odile m\'a parlé de vous.' },
  { nom: 'Lison', salut: 'Coucou ! Vous avez une minute ?' },
  { nom: 'Armand', salut: 'Bonjour, Ferrus.' },
  { nom: 'Rosalie', salut: 'Quelle belle enseigne ! Bonjour !' },
  { nom: 'Firmin', salut: 'Salut l\'artisan !' },
]);

// Les réglages de l'atelier.
export const REGLAGES = Object.freeze({
  stockMax: 5,               // place pour chaque matériau ou objet, sans étagères
  stockMaxEtageres: 10,      // avec les étagères
  fileMax: 3,                // nombre maximum de clients qui attendent en même temps
  premierClient: 5,          // secondes avant le tout premier client
  intervalleClients: 25,     // secondes entre deux clients
  intervalleEnseigne: 15,    // … avec l'enseigne en cuivre
  aideOdile: 30,             // pièces données par Odile si l'atelier est coincé
  // L'ancien propriétaire a laissé quelques fournitures : de quoi faire une lanterne.
  stockDepart: { cuivre: 2, bois: 1, ressort: 1 },
});

// Tous les identifiants de ce qu'on peut avoir en stock (matériaux puis objets).
export const OBJETS_STOCK = Object.freeze([...Object.keys(MATERIAUX), ...Object.keys(RECETTES)]);

// -----------------------------------------------------------------------------
// 2. L'ÉTAT DE L'ATELIER
// -----------------------------------------------------------------------------

export function creerEtatAtelier() {
  const stock = {};
  for (const id of OBJETS_STOCK) stock[id] = 0;
  return {
    ouvert: false,
    stock,
    ameliorations: [],       // les identifiants des améliorations achetées
    fabrication: null,       // { recette, restant, total } pendant une fabrication
    clients: [],             // la file d'attente : le premier est au comptoir
    prochainClient: REGLAGES.premierClient,
    compteurClients: 0,      // pour donner un numéro unique à chaque client
    clientsServis: 0,
    graine: 20261104,        // pour le « hasard » des commandes (toujours le même)
    recettesQuete: [],       // les objets de quête qu'on a le droit de fabriquer en ce moment
    decorations: [],         // les décorations achetées (version 1.4)
  };
}

// Un petit « hasard » qui donne toujours la même suite de nombres à partir de la
// graine : les tests obtiennent donc toujours les mêmes commandes.
function hasard(atelier) {
  atelier.graine = (atelier.graine * 16807) % 2147483647;
  return (atelier.graine - 1) / 2147483646;
}

// Ouvre l'atelier (appelé quand la quête d'Odile est terminée).
export function ouvrirAtelier(etat) {
  const a = etat.atelier;
  if (a.ouvert) return [];
  a.ouvert = true;
  for (const [id, n] of Object.entries(REGLAGES.stockDepart)) a.stock[id] += n;
  a.prochainClient = REGLAGES.premierClient;
  return ["L'atelier ouvre ses portes !"];
}

// -----------------------------------------------------------------------------
// 3. PETITES QUESTIONS SUR L'ÉTAT
// -----------------------------------------------------------------------------

export function possedeAmelioration(etat, id) {
  return etat.atelier.ameliorations.includes(id);
}

// Combien de chaque chose on peut ranger.
export function capaciteStock(etat) {
  return possedeAmelioration(etat, 'etageres') ? REGLAGES.stockMaxEtageres : REGLAGES.stockMax;
}

// Les recettes qu'on a le droit de fabriquer (les plans débloquent l'horloge).
export function recetteDebloquee(etat, id) {
  const r = RECETTES[id];
  if (!r) return false;
  if (r.quete) return etat.atelier.recettesQuete.includes(id);
  return !r.plans || possedeAmelioration(etat, r.plans);
}
export function recettesDisponibles(etat) {
  return Object.keys(RECETTES).filter((id) => recetteDebloquee(etat, id));
}

// Le temps de fabrication réel (le soufflet le divise par deux).
export function dureeFabrication(etat, id) {
  const duree = RECETTES[id].duree;
  return possedeAmelioration(etat, 'soufflet') ? duree / 2 : duree;
}

export function intervalleClients(etat) {
  return possedeAmelioration(etat, 'enseigne') ? REGLAGES.intervalleEnseigne : REGLAGES.intervalleClients;
}

// Le client qui est au comptoir (le premier de la file), ou null.
export function clientAuComptoir(etat) {
  return etat.atelier.clients[0] || null;
}

// Les matériaux qui manquent pour une recette : { cuivre: 1, ... } (vide si rien).
export function materiauxManquants(etat, id) {
  const manque = {};
  for (const [materiau, quantite] of Object.entries(RECETTES[id].ingredients)) {
    const ecart = quantite - etat.atelier.stock[materiau];
    if (ecart > 0) manque[materiau] = ecart;
  }
  return manque;
}

// Combien coûterait l'achat des matériaux manquants pour une recette.
export function coutMateriauxManquants(etat, id) {
  return Object.entries(materiauxManquants(etat, id))
    .reduce((total, [materiau, n]) => total + MATERIAUX[materiau].prix * n, 0);
}

// Écrit une liste de matériaux en clair : « 1 cuivre, 2 ressorts ».
export function decrireMateriaux(liste) {
  return Object.entries(liste)
    .map(([id, n]) => `${n} ${n > 1 && id !== 'bois' ? `${MATERIAUX[id].court}s` : MATERIAUX[id].court}`)
    .join(', ');
}

// Peut-on lancer cette fabrication ? Réponse : { possible, raison }.
export function peutFabriquer(etat, id) {
  const a = etat.atelier;
  const r = RECETTES[id];
  if (!r) return { possible: false, raison: 'Recette inconnue.' };
  if (!a.ouvert) return { possible: false, raison: "L'atelier n'est pas encore ouvert." };
  if (!recetteDebloquee(etat, id)) {
    return { possible: false, raison: r.quete ? 'Cet objet sert à une quête.' : `Il faut d'abord les ${AMELIORATIONS[r.plans].nom.toLowerCase()}.` };
  }
  if (a.fabrication) return { possible: false, raison: "L'établi est déjà occupé." };
  if (a.stock[id] >= capaciteStock(etat)) return { possible: false, raison: 'Plus de place pour ranger cet objet.' };
  const manque = materiauxManquants(etat, id);
  if (Object.keys(manque).length > 0) return { possible: false, raison: `Il manque : ${decrireMateriaux(manque)}.` };
  return { possible: true, raison: '' };
}

// -----------------------------------------------------------------------------
// 4. LES ACTIONS DU JOUEUR (chacune renvoie la liste des messages à afficher)
// -----------------------------------------------------------------------------

// Lancer une fabrication : les matériaux sont utilisés tout de suite.
export function lancerFabrication(etat, id) {
  const verdict = peutFabriquer(etat, id);
  if (!verdict.possible) return [verdict.raison];
  const a = etat.atelier;
  for (const [materiau, quantite] of Object.entries(RECETTES[id].ingredients)) a.stock[materiau] -= quantite;
  const duree = dureeFabrication(etat, id);
  a.fabrication = { recette: id, restant: duree, total: duree };
  return [`Fabrication lancée : ${RECETTES[id].nom}`];
}

// Acheter des matériaux.
export function acheterMateriau(etat, id, quantite = 1) {
  const a = etat.atelier;
  const m = MATERIAUX[id];
  if (!m || quantite < 1) return [];
  if (!a.ouvert) return ["L'atelier n'est pas encore ouvert."];
  const place = capaciteStock(etat) - a.stock[id];
  if (place < quantite) {
    return [place === 0 ? `Plus de place pour les ${m.pluriel}.` : `Il ne reste de la place que pour ${place}.`];
  }
  const prix = m.prix * quantite;
  if (etat.argent < prix) return [`Pas assez d'argent (${prix} pièces).`];
  etat.argent -= prix;
  a.stock[id] += quantite;
  return [`Acheté : ${quantite} × ${m.nom.toLowerCase()} (−${prix} pièces)`];
}

// Acheter une amélioration.
export function acheterAmelioration(etat, id) {
  const a = etat.atelier;
  const amelioration = AMELIORATIONS[id];
  if (!amelioration) return [];
  if (!a.ouvert) return ["L'atelier n'est pas encore ouvert."];
  if (possedeAmelioration(etat, id)) return ['Déjà installé.'];
  if (amelioration.cadeau) return ["Ces plans ne s'achètent pas : Sidonie, à la mine de cuivre, pourrait vous les offrir."];
  if (etat.argent < amelioration.prix) return [`Pas assez d'argent (${amelioration.prix} pièces).`];
  etat.argent -= amelioration.prix;
  a.ameliorations.push(id);
  return [`Nouvelle amélioration : ${amelioration.nom}`];
}

// Acheter une décoration (version 1.4).
export function possedeDecoration(etat, id) {
  return etat.atelier.decorations.includes(id);
}
export function acheterDecoration(etat, id) {
  const deco = DECORATIONS[id];
  if (!deco) return [];
  if (!etat.atelier.ouvert) return ["L'atelier n'est pas encore ouvert."];
  if (possedeDecoration(etat, id)) return ['Déjà installée.'];
  if (etat.argent < deco.prix) return [`Pas assez d'argent (${deco.prix} pièces).`];
  etat.argent -= deco.prix;
  etat.atelier.decorations.push(id);
  return [`Nouvelle décoration : ${deco.nom}`];
}

// Servir le client du comptoir (s'il y a l'objet en stock).
export function servirClient(etat) {
  const a = etat.atelier;
  const client = clientAuComptoir(etat);
  if (!client) return [];
  if (a.stock[client.commande] < 1) return [`Il te faut d'abord ${RECETTES[client.commande].article}.`];
  const prix = RECETTES[client.commande].prixVente;
  a.stock[client.commande] -= 1;
  etat.argent += prix;
  a.clients.shift(); // le client s'en va, les suivants avancent
  a.clientsServis += 1;
  return [`+${prix} pièces`, `${client.nom} vous remercie !`];
}

// Le dialogue avec le client du comptoir (même format que les dialogues d'Odile).
export function dialogueClient(etat) {
  const client = clientAuComptoir(etat);
  if (!client) return null;
  const r = RECETTES[client.commande];
  const enStock = etat.atelier.stock[client.commande] > 0;
  return {
    orateur: client.nom,
    repliques: [`${client.salut} Il me faudrait ${r.article}, s'il vous plaît.`],
    choix: enStock
      ? [
        { texte: `Donner ${r.article} (+${r.prixVente})`, action: 'servir' },
        { texte: 'Un instant…', action: 'fermer' },
      ]
      : [{ texte: "Je m'en occupe !", action: 'fermer' }],
  };
}

// Utiliser le comptoir quand personne n'y attend.
export function messageComptoirVide(etat) {
  return etat.atelier.ouvert
    ? ["Personne au comptoir pour l'instant."]
    : ["Le comptoir. Les clients viendront ici quand l'atelier sera ouvert."];
}

// -----------------------------------------------------------------------------
// 5. LE TEMPS QUI PASSE
// -----------------------------------------------------------------------------

// L'atelier est-il « coincé » ? (rien à vendre, rien à finir, et pas assez
// d'argent pour acheter de quoi fabriquer quoi que ce soit)
export function atelierCoince(etat) {
  const a = etat.atelier;
  if (!a.ouvert || a.fabrication) return false;
  // Seuls les objets qu'un client peut acheter comptent (pas les objets de quête).
  const vendables = Object.keys(RECETTES).filter((id) => !RECETTES[id].quete);
  if (vendables.some((id) => a.stock[id] > 0)) return false;
  return vendables
    .filter((id) => recetteDebloquee(etat, id))
    .every((id) => coutMateriauxManquants(etat, id) > etat.argent);
}

// Fait avancer le temps de « dt » secondes. Renvoie les messages à afficher.
export function avancerTemps(etat, dt) {
  const a = etat.atelier;
  const messages = [];
  if (!a.ouvert || dt <= 0) return messages;

  // La fabrication en cours avance.
  if (a.fabrication) {
    a.fabrication.restant -= dt;
    if (a.fabrication.restant <= 0) {
      const id = a.fabrication.recette;
      a.stock[id] += 1;
      a.fabrication = null;
      messages.push(`Fabrication terminée : ${RECETTES[id].nom}`);
    }
  }

  // Un nouveau client arrive de temps en temps (s'il reste de la place dans la file).
  if (a.clients.length < REGLAGES.fileMax) {
    a.prochainClient -= dt;
    if (a.prochainClient <= 0) {
      const habitant = HABITANTS[a.compteurClients % HABITANTS.length];
      // Les clients ne commandent que des objets « normaux » (pas d'objets de quête).
      const disponibles = recettesDisponibles(etat).filter((id) => !RECETTES[id].quete);
      const commande = disponibles[Math.floor(hasard(a) * disponibles.length)];
      a.compteurClients += 1;
      a.clients.push({ id: a.compteurClients, nom: habitant.nom, salut: habitant.salut, commande });
      a.prochainClient = intervalleClients(etat);
      messages.push(`Un client arrive : ${habitant.nom}`);
    }
  }

  // Filet de sécurité : si l'atelier est coincé, Odile dépanne Ferrus.
  if (atelierCoince(etat)) {
    etat.argent += REGLAGES.aideOdile;
    messages.push(`Odile vous prête ${REGLAGES.aideOdile} pièces pour repartir.`);
  }
  return messages;
}

// -----------------------------------------------------------------------------
// 6. CE QUE L'INTERFACE AFFICHE
// -----------------------------------------------------------------------------

// Le texte du cadre « Objectif » quand l'atelier est ouvert.
export function objectifAtelier(etat) {
  const a = etat.atelier;
  const client = clientAuComptoir(etat);
  if (client) {
    const r = RECETTES[client.commande];
    if (a.stock[client.commande] > 0) return `${client.nom} attend au comptoir : donne-lui ${r.article}.`;
    if (a.fabrication && a.fabrication.recette === client.commande) return `Fabrication en cours : ${r.article} pour ${client.nom}.`;
    if (a.fabrication) return `${client.nom} veut ${r.article}. Attends que l'établi soit libre.`;
    if (Object.keys(materiauxManquants(etat, client.commande)).length > 0) {
      return `${client.nom} veut ${r.article} : achète les matériaux à l'établi (onglet Acheter).`;
    }
    return `${client.nom} veut ${r.article} : lance la fabrication à l'établi.`;
  }
  if (a.fabrication) return `Fabrication en cours : ${RECETTES[a.fabrication.recette].nom}. Des clients vont arriver.`;
  const amelioration = Object.entries(AMELIORATIONS).find(([id, am]) => !am.cadeau && !possedeAmelioration(etat, id) && etat.argent >= am.prix);
  if (amelioration) return `En attendant les clients : améliore l'atelier à l'établi (${amelioration[1].nom}, ${amelioration[1].prix} pièces).`;
  return "En attendant les clients, prépare des objets à l'établi.";
}

// Les marqueurs flottants de l'atelier.
// - au-dessus du comptoir : un client attend et on a ce qu'il veut ;
// - au-dessus de l'établi : un client attend un objet qu'on n'a pas encore.
export function marqueursAtelier(etat) {
  const a = etat.atelier;
  const client = clientAuComptoir(etat);
  if (!a.ouvert || !client) return { etabli: false, comptoir: false };
  const enStock = a.stock[client.commande] > 0;
  const enCours = Boolean(a.fabrication && a.fabrication.recette === client.commande);
  return { comptoir: enStock, etabli: !enStock && !enCours };
}

// La progression de la fabrication en cours, entre 0 et 1 (null si rien).
export function progressionFabrication(etat) {
  const f = etat.atelier.fabrication;
  if (!f) return null;
  return { recette: f.recette, nom: RECETTES[f.recette].nom, progression: Math.min(1, Math.max(0, 1 - f.restant / f.total)), restant: Math.max(0, f.restant) };
}

// Le petit dialogue qui explique l'atelier, juste après son ouverture.
export const DIALOGUE_OUVERTURE = Object.freeze({
  orateur: 'Ferrus',
  repliques: [
    "Grâce à Odile, tout le quartier va parler de l'atelier. Il est temps de rouvrir !",
    "À l'établi, je peux acheter des matériaux, fabriquer des objets et améliorer l'atelier.",
    'Les clients passeront commande au comptoir, à gauche de la porte. Je les sers quand leur objet est prêt.',
  ],
  choix: [{ texte: 'Au travail !', action: 'fermer' }],
});
