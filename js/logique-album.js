// =============================================================================
// logique-album.js — L'ALBUM DE SOUVENIRS (version 1.5), sans aucune 3D
// -----------------------------------------------------------------------------
// Un petit livre que Ferrus remplit au fil de la partie :
//   - les HABITANTS rencontrés, avec leur portrait (dessiné par main.js) ;
//   - les SOUVENIRS : les quêtes terminées, les fêtes, et quelques chiffres ;
//   - la PÊCHE : les espèces du lac déjà attrapées.
//
// Ce fichier décide seulement de ce qu'on montre. Il est testé avec « node --test ».
// =============================================================================

import { QUETES, queteTerminee } from './logique-quetes.js';
import { FETES, anneeDuJour } from './logique-fetes.js';
import { ESPECES } from './logique-peche.js';

// Les habitants (et les compagnons) de l'album, dans l'ordre des rencontres.
export const HABITANTS_ALBUM = Object.freeze([
  { id: 'odile', nom: 'Odile', role: "La voisine de l'atelier", mot: 'Elle connaît tout le quartier, et son cœur est aussi grand que sa maison.' },
  { id: 'capucine', nom: 'Capucine', role: 'La marchande', mot: 'Son étal est le plus joyeux du marché. Sa balance est la plus juste de la région.' },
  { id: 'leon', nom: 'Léon', role: 'Le facteur', mot: 'Il connaît toutes les nouvelles, et livre les commandes spéciales.' },
  { id: 'barnabe', nom: 'Barnabé', role: 'Le meunier', mot: 'Toujours blanc de farine. Sa roue tourne de nouveau grâce à vous.' },
  { id: 'augustin', nom: 'Augustin', role: 'Le chef de gare', mot: 'Il vérifie l\'heure dix fois par jour. Son horloge ne se trompe jamais.' },
  { id: 'sidonie', nom: 'Sidonie', role: 'La mineuse', mot: 'Elle a dessiné ses premiers automates avec son grand-père.' },
  { id: 'gaston', nom: 'Gaston', role: 'Le vieux pêcheur', mot: 'Il pêche sur le lac depuis cinquante ans, sans jamais se presser.' },
  { id: 'lucie', nom: 'Lucie', role: "L'apprentie", mot: "La nièce d'Odile. Elle rêve d'ouvrir un jour son propre atelier." },
  { id: 'chat', nom: 'Rouille', role: 'Le chat de l\'atelier', mot: 'Un petit chat roux qui vous suit partout, et ronronne près de la forge.', compagnon: true },
  { id: 'oiseau', nom: 'Cliquet', role: "L'oiseau mécanique", mot: 'Fabriqué de vos mains. Il fait « cliquet-cliquet » en battant des ailes.', compagnon: true },
]);

// Un souvenir pour chaque quête terminée.
export const SOUVENIRS_QUETES = Object.freeze({
  'lampe-odile': "La lampe d'Odile brille de nouveau, et l'atelier a rouvert ses portes.",
  'balance-capucine': 'Une balance de précision pour Capucine : le marché a retrouvé le sourire.',
  'roue-moulin': 'La grande roue du moulin tourne de nouveau au fil du canal.',
  'horloge-gare': "L'horloge de la gare donne l'heure juste, grâce à un régulateur tout neuf.",
  'train-cuivrebourg': 'Un sifflet neuf, et le premier train depuis des années est parti de la gare.',
  'wagonnet-mine': 'Le wagonnet de Sidonie roule, et le cuivre descend de nouveau en ville.',
});

export function creerEtatAlbum() {
  return { rencontres: [] };
}

// Note qu'on a rencontré quelqu'un (on lui a parlé). Renvoie vrai si c'est nouveau.
// (Les compagnons entrent dans l'album quand on les adopte ou les fabrique.)
export function noterRencontre(etat, id) {
  const h = HABITANTS_ALBUM.find((x) => x.id === id);
  if (!h || h.compagnon || etat.album.rencontres.includes(id)) return false;
  etat.album.rencontres.push(id);
  return true;
}

// Les habitants à montrer : { ...habitant, connu } (les inconnus sont grisés).
export function habitantsAlbum(etat) {
  return HABITANTS_ALBUM.map((h) => {
    const connu = h.compagnon ? Boolean(etat.compagnons[h.id]) : etat.album.rencontres.includes(h.id);
    return { ...h, connu };
  });
}

// Les souvenirs : les quêtes terminées, puis les fêtes (de la plus ancienne à la plus récente).
export function souvenirsAlbum(etat) {
  const souvenirs = [];
  for (const [id, q] of Object.entries(QUETES)) {
    if (queteTerminee(etat, id)) souvenirs.push({ titre: q.titre, texte: SOUVENIRS_QUETES[id] || '' });
  }
  for (const cle of etat.fetes.faites) {
    const fete = FETES.find((f) => cle.startsWith(`${f.id}-`));
    if (!fete) continue;
    const annee = Number(cle.slice(fete.id.length + 1));
    souvenirs.push({ titre: `${fete.nom} (année ${annee})`, texte: 'Vous avez aidé Odile à préparer la fête. Toute la place était en joie.' });
  }
  return souvenirs;
}

// Quelques chiffres de la partie.
export function chiffresAlbum(etat) {
  const a = etat.atelier;
  return [
    ['Jours passés à Cuivrebourg', Math.max(1, Math.floor(etat.jour || 1))],
    ['Année', anneeDuJour(Math.max(1, Math.floor(etat.jour || 1)))],
    ['Clients servis au comptoir', a.clientsServis],
    ['Commandes spéciales livrées', etat.carnet.livrees],
    ['Plaques de cuivre récoltées dans la galerie', etat.galerie.recoltes],
    ['Récoltes de fleurs au potager', etat.potager.recoltes],
    ['Poissons pêchés (et remis à l\'eau)', etat.peche.prises],
  ];
}

// La page de la pêche : chaque espèce, connue ou non.
export function pecheAlbum(etat) {
  const NOMS_SAISONS = { printemps: 'printemps', ete: 'été', automne: 'automne', hiver: 'hiver' };
  return ESPECES.map((e) => {
    const n = etat.peche.especes[e.id] || 0;
    const saisons = e.saisons.length === 4 ? 'toute l\'année' : e.saisons.map((s) => NOMS_SAISONS[s]).join(', ');
    return { id: e.id, nom: n > 0 ? e.nom : '???', nombre: n, saisons, couleur: e.couleur };
  });
}
