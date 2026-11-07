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
  // Version 1.6 : le train miniature (les plans sont un cadeau d'amitié d'Augustin).
  'train-miniature': {
    nom: 'Train miniature',
    article: 'un train miniature',
    pluriel: 'trains miniatures',
    ingredients: { cuivre: 2, bois: 2, ressort: 1 },
    duree: 16,
    prixVente: 95,
    plans: 'plans-train',
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
  // Version 1.5 : les objets des fêtes. On ne peut les fabriquer que le jour de
  // leur fête (« fete »), pour Odile ; les clients ne les commandent jamais.
  'lanterne-papier': {
    nom: 'Lanterne de papier',
    article: 'une lanterne de papier',
    pluriel: 'lanternes de papier',
    ingredients: { bois: 1, ressort: 1 },
    duree: 6,
    prixVente: 0,
    fete: 'fete-lanternes',
  },
  carillon: {
    nom: 'Carillon à vent',
    article: 'un carillon à vent',
    pluriel: 'carillons à vent',
    ingredients: { cuivre: 1, ressort: 1 },
    duree: 7,
    prixVente: 0,
    fete: 'bal-ete',
  },
  'presse-pommes': {
    nom: 'Presse à pommes',
    article: 'une presse à pommes',
    pluriel: 'presses à pommes',
    ingredients: { cuivre: 1, bois: 2 },
    duree: 9,
    prixVente: 0,
    fete: 'foire-pommes',
  },
  'etoile-cuivre': {
    nom: 'Étoile de cuivre',
    article: 'une étoile de cuivre',
    pluriel: 'étoiles de cuivre',
    ingredients: { cuivre: 2 },
    duree: 7,
    prixVente: 0,
    fete: 'fete-lumieres',
  },
  // Version 1.5 : le compagnon qu'on fabrique soi-même. Il ne va pas dans le
  // stock : une fois fini, il s'envole et suit Ferrus partout.
  'oiseau-mecanique': {
    nom: 'Oiseau mécanique',
    article: 'un oiseau mécanique',
    ingredients: { cuivre: 2, ressort: 1 },
    duree: 15,
    prixVente: 0,
    compagnon: 'oiseau',
  },
  // Version 1.5 : les bouquets ne se fabriquent pas, ils poussent au potager.
  // Ils se vendent au comptoir.
  bouquet: {
    nom: 'Bouquet de fleurs',
    article: 'un bouquet de fleurs',
    pluriel: 'bouquets de fleurs',
    ingredients: {},
    duree: 0,
    prixVente: 30,
    potager: true,
  },
  // Version 1.6 : ce qu'on cueille dans la forêt (selon la saison). Comme les
  // bouquets, ça ne se fabrique pas : ça se vend au comptoir, ou s'offre.
  baies: {
    nom: 'Panier de baies',
    article: 'un panier de baies',
    pluriel: 'paniers de baies',
    ingredients: {},
    duree: 0,
    prixVente: 22,
    foret: true,
  },
  champignons: {
    nom: 'Panier de champignons',
    article: 'un panier de champignons',
    pluriel: 'paniers de champignons',
    ingredients: {},
    duree: 0,
    prixVente: 28,
    foret: true,
  },
  'pommes-pin': {
    nom: 'Pommes de pin',
    article: 'un sac de pommes de pin',
    pluriel: 'sacs de pommes de pin',
    ingredients: {},
    duree: 0,
    prixVente: 14,
    foret: true,
  },
  // Version 1.6 : les objets de quête de la forêt (le télescope d'Anatole) et
  // du grand projet (le dirigeable).
  'monture-lentille': {
    nom: 'Monture de lentille',
    article: 'une monture de lentille',
    ingredients: { cuivre: 2, ressort: 1 },
    duree: 9,
    prixVente: 0,
    quete: 'telescope-anatole',
  },
  nacelle: {
    nom: 'Armature de nacelle',
    article: 'une armature de nacelle',
    ingredients: { cuivre: 1, bois: 3 },
    duree: 12,
    prixVente: 0,
    quete: 'dirigeable-nacelle',
  },
  anneaux: {
    nom: "Anneaux d'amarrage",
    article: "des anneaux d'amarrage",
    ingredients: { cuivre: 1, ressort: 2 },
    duree: 10,
    prixVente: 0,
    quete: 'dirigeable-enveloppe',
  },
  chaudiere: {
    nom: 'Petite chaudière',
    article: 'une petite chaudière',
    ingredients: { cuivre: 3, bois: 1 },
    duree: 14,
    prixVente: 0,
    quete: 'dirigeable-chaudiere',
  },
  helice: {
    nom: 'Hélice de cuivre',
    article: 'une hélice de cuivre',
    ingredients: { cuivre: 2, bois: 1, ressort: 1 },
    duree: 12,
    prixVente: 0,
    quete: 'dirigeable-helice',
  },
  'tableau-bord': {
    nom: 'Tableau de bord',
    article: 'un tableau de bord',
    ingredients: { cuivre: 1, bois: 1, ressort: 2 },
    duree: 12,
    prixVente: 0,
    quete: 'dirigeable-envol',
  },
});

// Ce qui pousse au potager ou se cueille en forêt (ne se fabrique pas).
export function estRecolte(id) {
  const r = RECETTES[id];
  return Boolean(r && (r.potager || r.foret));
}

// Un objet qu'un client peut acheter au comptoir ? (pas les objets de quête,
// de fête, ni l'oiseau mécanique)
export function vendableAuComptoir(id) {
  const r = RECETTES[id];
  return Boolean(r) && !r.quete && !r.fete && !r.compagnon;
}

// Les améliorations de l'atelier (chacune ne s'achète qu'une fois).
export const AMELIORATIONS = Object.freeze({
  etageres: { nom: 'Étagères', description: 'Plus de place : 10 de chaque au lieu de 5.', prix: 60 },
  soufflet: { nom: 'Soufflet de forge', description: 'La fabrication va deux fois plus vite.', prix: 90 },
  enseigne: { nom: 'Enseigne en cuivre', description: 'Les clients viennent plus souvent.', prix: 110 },
  'plans-horloge': { nom: "Plans d'horloger", description: 'Débloque la fabrication des horloges.', prix: 140 },
  // Version 1.3.
  'plans-boite-musique': { nom: 'Plans de boîte à musique', description: 'Débloque la fabrication des boîtes à musique.', prix: 120 },
  // Celle-ci ne s'achète pas : c'est le cadeau de Sidonie, à la fin de sa quête à la mine.
  'plans-automate': { nom: "Plans d'automate", description: 'Débloque la fabrication des automates de cuivre.', prix: 0, cadeau: 'wagonnet-mine', origine: 'un cadeau de Sidonie, à la mine de cuivre' },
  // Version 1.5 : une apprentie, qui travaille à son propre établi, dans l'atelier.
  // Version 1.6 : un cadeau d'Augustin, quand on est devenus très bons amis.
  'plans-train': { nom: 'Plans du train miniature', description: 'Débloque la fabrication des trains miniatures.', prix: 0, cadeau: 'amitie', origine: "un cadeau d'Augustin, quand vous serez très bons amis (5 cœurs)" },
  apprentie: { nom: 'Une apprentie', description: "Lucie, la nièce d'Odile, fabrique toute seule des lanternes ou des bouilloires, à son établi dans l'atelier. Parlez-lui pour choisir.", prix: 150 },
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
  // Version 1.5 : les décorations de l'intérieur de l'atelier.
  'tapis-salon': { nom: 'Grand tapis', description: 'Un grand tapis moelleux, dans le coin salon.', prix: 30, lieu: 'interieur' },
  'plante-verte': { nom: 'Plante verte', description: 'Une belle plante dans un pot de cuivre, près de la porte.', prix: 35, lieu: 'interieur' },
  tableau: { nom: 'Tableau de Cuivrebourg', description: 'Une peinture de la place du village, au mur.', prix: 40, lieu: 'interieur' },
  fauteuil: { nom: 'Fauteuil et guéridon', description: 'Un fauteuil confortable et sa petite table, pour se reposer.', prix: 60, lieu: 'interieur' },
  gramophone: { nom: 'Gramophone', description: 'Un gramophone à pavillon de cuivre, dont le disque tourne doucement.', prix: 80, lieu: 'interieur' },
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
    recettesFete: [],        // l'objet de la fête du jour, s'il y en a une (version 1.5)
    // L'apprentie (version 1.5) : ce qu'elle fabrique, et son travail en cours.
    apprentie: { tache: 'lanterne', fabrication: null },
    assemblages: 0,          // les assemblages d'engrenages réussis (version 1.6)
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
  if (r.fete) return etat.atelier.recettesFete.includes(id);
  if (r.potager || r.foret) return false; // les bouquets poussent au potager, les baies dans la forêt
  if (r.compagnon) return Boolean(etat.compagnons) && !etat.compagnons[r.compagnon];
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
    if (r.quete) return { possible: false, raison: 'Cet objet sert à une quête.' };
    if (r.fete) return { possible: false, raison: "Cet objet ne se fabrique que le jour de sa fête." };
    if (r.potager) return { possible: false, raison: 'Les bouquets poussent au potager.' };
    if (r.foret) return { possible: false, raison: 'Cela se cueille dans la forêt.' };
    if (r.compagnon) return { possible: false, raison: 'Votre oiseau mécanique vole déjà à vos côtés.' };
    return { possible: false, raison: `Il faut d'abord les ${AMELIORATIONS[r.plans].nom.toLowerCase()}.` };
  }
  if (a.fabrication) return { possible: false, raison: "L'établi est déjà occupé." };
  if (!r.compagnon && a.stock[id] >= capaciteStock(etat)) return { possible: false, raison: 'Plus de place pour ranger cet objet.' };
  const manque = materiauxManquants(etat, id);
  if (Object.keys(manque).length > 0) return { possible: false, raison: `Il manque : ${decrireMateriaux(manque)}.` };
  return { possible: true, raison: '' };
}

// -----------------------------------------------------------------------------
// 4. LES ACTIONS DU JOUEUR (chacune renvoie la liste des messages à afficher)
// -----------------------------------------------------------------------------

// Lancer une fabrication : les matériaux sont utilisés tout de suite.
// Version 1.6 : « assemble » = Ferrus a lui-même assemblé les engrenages
// (le petit jeu d'assemblage) : la fabrication va deux fois plus vite.
export function lancerFabrication(etat, id, { assemble = false } = {}) {
  const verdict = peutFabriquer(etat, id);
  if (!verdict.possible) return [verdict.raison];
  const a = etat.atelier;
  for (const [materiau, quantite] of Object.entries(RECETTES[id].ingredients)) a.stock[materiau] -= quantite;
  const duree = dureeFabrication(etat, id) * (assemble ? 0.5 : 1);
  a.fabrication = { recette: id, restant: duree, total: duree };
  if (assemble) {
    a.assemblages += 1;
    return [`Bel assemblage ! Fabrication lancée : ${RECETTES[id].nom} (deux fois plus vite)`];
  }
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
  if (amelioration.cadeau) return [`Ces plans ne s'achètent pas : c'est ${amelioration.origine}.`];
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
  if (!a.ouvert || a.fabrication || a.apprentie.fabrication) return false;
  // Seuls les objets qu'un client peut acheter comptent (pas les objets de quête).
  const vendables = Object.keys(RECETTES).filter(vendableAuComptoir);
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
      a.fabrication = null;
      if (RECETTES[id].compagnon && etat.compagnons) {
        // L'oiseau mécanique ne va pas dans le stock : il s'éveille et suit Ferrus.
        etat.compagnons[RECETTES[id].compagnon] = true;
        messages.push("Cliquet, l'oiseau mécanique, s'éveille et vole jusqu'à vous !");
      } else {
        a.stock[id] += 1;
        messages.push(`Fabrication terminée : ${RECETTES[id].nom}`);
      }
    }
  }

  // L'apprentie travaille à son établi (version 1.5).
  if (possedeAmelioration(etat, 'apprentie')) messages.push(...avancerApprentie(etat, dt));

  // Un nouveau client arrive de temps en temps (s'il reste de la place dans la file).
  if (a.clients.length < REGLAGES.fileMax) {
    a.prochainClient -= dt;
    if (a.prochainClient <= 0) {
      const habitant = HABITANTS[a.compteurClients % HABITANTS.length];
      // Les clients ne commandent que des objets « normaux » (pas d'objets de quête).
      // Ils prennent aussi des bouquets du potager et des paniers de la forêt
      // (version 1.6), s'il y en a en stock.
      const disponibles = recettesDisponibles(etat).filter(vendableAuComptoir);
      for (const id of Object.keys(RECETTES)) if (estRecolte(id) && a.stock[id] > 0) disponibles.push(id);
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
// 5 bis. L'APPRENTIE (version 1.5)
// -----------------------------------------------------------------------------
// Lucie fabrique toute seule, à son établi, l'objet qu'on lui a demandé
// (lanternes ou bouilloires), avec les matériaux du stock. Elle va un peu
// moins vite que Ferrus, et s'arrête quand il y en a 3 en réserve (pour ne pas
// vider tout le stock de matériaux).
export const TACHES_APPRENTIE = Object.freeze(['lanterne', 'bouilloire', 'repos']);
export const RESERVE_APPRENTIE = 3;
export const LENTEUR_APPRENTIE = 1.5;

export function avancerApprentie(etat, dt) {
  const a = etat.atelier;
  const ap = a.apprentie;
  const messages = [];
  if (ap.fabrication) {
    ap.fabrication.restant -= dt;
    if (ap.fabrication.restant > 0) return messages;
    const id = ap.fabrication.recette;
    ap.fabrication = null;
    a.stock[id] = Math.min(capaciteStock(etat), a.stock[id] + 1);
    messages.push(`Lucie a fabriqué ${RECETTES[id].article}.`);
  }
  const id = ap.tache;
  if (id === 'repos' || !RECETTES[id]) return messages;
  if (a.stock[id] >= Math.min(RESERVE_APPRENTIE, capaciteStock(etat))) return messages;
  if (Object.keys(materiauxManquants(etat, id)).length > 0) return messages;
  for (const [materiau, quantite] of Object.entries(RECETTES[id].ingredients)) a.stock[materiau] -= quantite;
  const duree = dureeFabrication(etat, id) * LENTEUR_APPRENTIE;
  ap.fabrication = { recette: id, restant: duree, total: duree };
  return messages;
}

// Ce que dit Lucie, et les choix pour lui donner du travail.
export function dialogueApprentie(etat) {
  const ap = etat.atelier.apprentie;
  let repliques;
  if (ap.tache === 'repos') {
    repliques = ['Je me repose un peu. Dites-moi quand il faut reprendre !'];
  } else {
    const r = RECETTES[ap.tache];
    const manque = materiauxManquants(etat, ap.tache);
    if (ap.fabrication) {
      repliques = [`Je fabrique des ${r.pluriel}. Il y en a une en cours, sur mon établi.`];
    } else if (etat.atelier.stock[ap.tache] >= Math.min(RESERVE_APPRENTIE, capaciteStock(etat))) {
      repliques = [`Il y a déjà ${RESERVE_APPRENTIE} ${r.pluriel} en réserve. J'attends qu'on en vende pour en refaire.`];
    } else if (Object.keys(manque).length > 0) {
      repliques = [`Je voudrais fabriquer des ${r.pluriel}, mais il manque : ${decrireMateriaux(manque)}. Pouvez-vous en acheter à l'établi ?`];
    } else {
      repliques = [`Je m'occupe des ${r.pluriel} !`];
    }
  }
  return {
    orateur: 'Lucie',
    repliques: ["Bonjour, maître Ferrus !", ...repliques],
    choix: [
      { texte: 'Fais des lanternes', action: 'apprentie:lanterne' },
      { texte: 'Fais des bouilloires', action: 'apprentie:bouilloire' },
      { texte: 'Repose-toi', action: 'apprentie:repos' },
    ],
  };
}

// Donner une tâche à l'apprentie (un travail commencé est terminé quand même).
export function choisirTacheApprentie(etat, tache) {
  if (!TACHES_APPRENTIE.includes(tache) || !possedeAmelioration(etat, 'apprentie')) return [];
  etat.atelier.apprentie.tache = tache;
  if (tache === 'repos') return ['Lucie pose ses outils et se repose.'];
  return [`Lucie va fabriquer des ${RECETTES[tache].pluriel}.`];
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
