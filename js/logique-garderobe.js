// =============================================================================
// logique-garderobe.js — LA GARDE-ROBE DE FERRUS (version 1.6), sans aucune 3D
// -----------------------------------------------------------------------------
// Dans l'atelier, une grande armoire permet d'habiller Ferrus : un chapeau,
// des lunettes, un tablier, une écharpe et la couleur de sa chemise.
//   - certaines tenues s'achètent dans l'armoire ;
//   - d'autres sont des CADEAUX : les habitants les offrent quand ils sont
//     devenus de très bons amis (5 cœurs d'amitié), et le premier vol du
//     dirigeable donne une casquette d'aviateur.
// Ce n'est que pour le plaisir des yeux : les tenues ne changent aucune règle.
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

// Les cinq sortes d'habits, dans l'ordre des onglets de l'armoire.
export const CATEGORIES_TENUE = Object.freeze([
  { id: 'chapeau', nom: 'Chapeaux' },
  { id: 'lunettes', nom: 'Lunettes' },
  { id: 'tablier', nom: 'Tabliers' },
  { id: 'echarpe', nom: 'Écharpes' },
  { id: 'chemise', nom: 'Chemises' },
]);

// D'où viennent les cadeaux (pour l'expliquer dans l'armoire).
export const ORIGINES_TENUE = Object.freeze({
  odile: "un cadeau d'Odile, quand vous serez très bons amis (5 cœurs)",
  capucine: 'un cadeau de Capucine, quand vous serez très bons amis (5 cœurs)',
  leon: 'un cadeau de Léon, quand vous serez très bons amis (5 cœurs)',
  barnabe: 'un cadeau de Barnabé, quand vous serez très bons amis (5 cœurs)',
  sidonie: 'un cadeau de Sidonie, quand vous serez très bons amis (5 cœurs)',
  gaston: 'un cadeau de Gaston, quand vous serez très bons amis (5 cœurs)',
  lucie: 'un cadeau de Lucie, quand vous serez très bons amis (5 cœurs)',
  anatole: "un cadeau d'Anatole, quand vous serez très bons amis (5 cœurs)",
  dirigeable: 'la récompense du premier vol du dirigeable',
});

// Toutes les tenues. « defaut » : Ferrus l'a dès le début ; « prix » : elle
// s'achète ; « origine » : c'est un cadeau. « couleur » sert au dessin en 3D.
export const TENUES = Object.freeze({
  // --- Les chapeaux ---
  'sans-chapeau': { categorie: 'chapeau', nom: 'Tête nue', description: 'Les cheveux au vent, comme au premier jour.', defaut: true },
  'chapeau-melon': { categorie: 'chapeau', nom: 'Chapeau melon', description: 'Un chapeau rond et sérieux, pour les grandes occasions.', prix: 45, couleur: '#5e4330' },
  'haut-de-forme': { categorie: 'chapeau', nom: 'Haut-de-forme', description: 'Très élégant derrière le comptoir.', prix: 60, couleur: '#4a4240' },
  'casquette-facteur': { categorie: 'chapeau', nom: 'Casquette de facteur', description: 'Bleue, avec sa visière bien droite.', origine: 'leon', couleur: '#4f6585' },
  'beret-farine': { categorie: 'chapeau', nom: 'Béret de meunier', description: 'Tout blanc, et il sent bon la farine.', origine: 'barnabe', couleur: '#f3eee4' },
  'casque-mineur': { categorie: 'chapeau', nom: 'Casque de mineur', description: 'En laiton, avec une petite lampe qui s\'allume le soir.', origine: 'sidonie', couleur: '#c9a35a' },
  'bonnet-marin': { categorie: 'chapeau', nom: 'Bonnet de marin', description: 'Chaud et douillet, pour les matins brumeux au lac.', origine: 'gaston', couleur: '#5b6a78' },
  'haut-de-forme-inventeur': { categorie: 'chapeau', nom: "Haut-de-forme d'inventeur", description: 'Orné d\'engrenages et de lunettes de laiton.', origine: 'anatole', couleur: '#6b4a33' },
  'casquette-aviateur': { categorie: 'chapeau', nom: "Casquette d'aviateur", description: 'En cuir, avec ses lunettes de vol.', origine: 'dirigeable', couleur: '#7a5a3e' },
  // --- Les lunettes ---
  'lunettes-artisan': { categorie: 'lunettes', nom: "Lunettes d'artisan", description: 'Les fidèles lunettes de travail de Ferrus.', defaut: true },
  'sans-lunettes': { categorie: 'lunettes', nom: 'Sans lunettes', description: 'Pour se reposer les yeux.', defaut: true },
  monocle: { categorie: 'lunettes', nom: 'Monocle de cuivre', description: 'Un seul verre, et beaucoup de distinction.', prix: 35 },
  'lunettes-rondes': { categorie: 'lunettes', nom: 'Lunettes rondes', description: 'Toutes rondes, comme celles d\'Odile.', origine: 'lucie' },
  // --- Les tabliers ---
  'tablier-cuir': { categorie: 'tablier', nom: 'Tablier de cuir', description: 'Le tablier de toujours, un peu usé.', defaut: true, couleur: '#8a5a3a' },
  'tablier-toile': { categorie: 'tablier', nom: 'Tablier de toile bleue', description: 'Léger et frais, pour les jours d\'été.', prix: 30, couleur: '#5f7f9a' },
  'tablier-sapin': { categorie: 'tablier', nom: 'Tablier vert sapin', description: 'De la couleur des grands arbres de la forêt.', prix: 40, couleur: '#5f7a5a' },
  'sans-tablier': { categorie: 'tablier', nom: 'Sans tablier', description: 'Pour le dimanche.', defaut: true },
  // --- Les écharpes ---
  'sans-echarpe': { categorie: 'echarpe', nom: 'Sans écharpe', description: 'Le cou bien dégagé.', defaut: true },
  'echarpe-tricot': { categorie: 'echarpe', nom: 'Écharpe tricotée', description: 'Tricotée main par Odile, bien chaude.', origine: 'odile', couleur: '#c98b7a' },
  'foulard-dore': { categorie: 'echarpe', nom: 'Foulard doré', description: 'Le plus beau tissu de l\'étal de Capucine.', origine: 'capucine', couleur: '#d9a04a' },
  // --- Les chemises ---
  'chemise-creme': { categorie: 'chemise', nom: 'Chemise crème', description: 'La chemise de travail de Ferrus.', defaut: true, couleur: '#e4d5b7' },
  'chemise-ciel': { categorie: 'chemise', nom: 'Chemise bleu ciel', description: 'Douce comme un ciel d\'été.', prix: 20, couleur: '#b8c8d8' },
  'chemise-sauge': { categorie: 'chemise', nom: 'Chemise vert sauge', description: 'Un vert tendre, très reposant.', prix: 20, couleur: '#b9c6a2' },
  'chemise-lavande': { categorie: 'chemise', nom: 'Chemise lavande', description: 'Comme la robe d\'Odile.', prix: 20, couleur: '#c6b9d6' },
  'chemise-the': { categorie: 'chemise', nom: 'Chemise rose thé', description: 'Un rose très pâle, tout en douceur.', prix: 20, couleur: '#e3bfae' },
});

// Ce que Ferrus porte au début d'une partie.
export const TENUE_DEPART = Object.freeze({
  chapeau: 'sans-chapeau',
  lunettes: 'lunettes-artisan',
  tablier: 'tablier-cuir',
  echarpe: 'sans-echarpe',
  chemise: 'chemise-creme',
});

export function creerEtatGarderobe() {
  return { possedes: [], porte: { ...TENUE_DEPART } };
}

// Ferrus a-t-il cette tenue dans son armoire ?
export function possedeTenue(etat, id) {
  const t = TENUES[id];
  if (!t) return false;
  return Boolean(t.defaut) || etat.garderobe.possedes.includes(id);
}

// Ce que Ferrus porte vraiment (une tenue inconnue ou pas possédée est
// remplacée par celle du départ : le dessin ne se trompe jamais).
export function tenuePortee(etat) {
  const porte = {};
  for (const c of CATEGORIES_TENUE) {
    const id = etat.garderobe && etat.garderobe.porte ? etat.garderobe.porte[c.id] : null;
    porte[c.id] = TENUES[id] && TENUES[id].categorie === c.id && possedeTenue(etat, id) ? id : TENUE_DEPART[c.id];
  }
  return porte;
}

// Les tenues d'une catégorie, pour l'armoire : { id, ...tenue, possede, porte }.
export function tenuesDeCategorie(etat, categorie) {
  const porte = tenuePortee(etat);
  return Object.entries(TENUES)
    .filter(([, t]) => t.categorie === categorie)
    .map(([id, t]) => ({ id, ...t, possede: possedeTenue(etat, id), porte: porte[categorie] === id }));
}

// Mettre une tenue. Renvoie les messages à afficher.
export function porterTenue(etat, id) {
  const t = TENUES[id];
  if (!t || !possedeTenue(etat, id)) return [];
  etat.garderobe.porte[t.categorie] = id;
  return [`Vous portez : ${t.nom.charAt(0).toLowerCase()}${t.nom.slice(1)}.`];
}

// Acheter une tenue (elle est mise aussitôt).
export function acheterTenue(etat, id) {
  const t = TENUES[id];
  if (!t) return [];
  if (possedeTenue(etat, id)) return porterTenue(etat, id);
  if (t.origine || !t.prix) return [`Cette tenue ne s'achète pas : c'est ${ORIGINES_TENUE[t.origine] || 'un cadeau'}.`];
  if (etat.argent < t.prix) return [`Pas assez d'argent (${t.prix} pièces).`];
  etat.argent -= t.prix;
  etat.garderobe.possedes.push(id);
  etat.garderobe.porte[t.categorie] = id;
  return [`−${t.prix} pièces`, `Nouvelle tenue : ${t.nom}. Elle vous va très bien !`];
}

// Recevoir une tenue en cadeau (amitié, dirigeable). Renvoie les messages.
export function recevoirTenue(etat, id) {
  const t = TENUES[id];
  if (!t || possedeTenue(etat, id)) return [];
  etat.garderobe.possedes.push(id);
  return [`Nouveau dans votre garde-robe : ${t.nom} (armoire de l'atelier).`];
}
