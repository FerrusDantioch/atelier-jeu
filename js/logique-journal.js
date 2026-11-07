// =============================================================================
// logique-journal.js — LE JOURNAL DE CUIVREBOURG (version 1.6), sans 3D
// -----------------------------------------------------------------------------
// Chaque matin, Léon, le facteur, glisse une petite feuille de nouvelles sous
// la porte de l'atelier. On la lit avec le bouton « Journal » (ou la touche J).
// On y trouve :
//   - la météo du jour (la pluie de l'après-midi, la brume du matin…) ;
//   - la fête du jour, ou la prochaine ;
//   - les anniversaires (et ce que l'habitant aime recevoir…) ;
//   - les commandes spéciales en attente ;
//   - une petite rumeur, et une petite annonce qui donne une idée de quoi faire.
// Le journal est écrit à partir de la partie : il dit toujours vrai.
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { RECETTES } from './logique-atelier.js';
import { meteoDuJour } from './logique-meteo.js';
import { fetePrevue, anneeDuJour } from './logique-fetes.js';
import { SAISONS } from './logique-saisons.js';
import { anniversairesDuJour, saisonEtJour } from './logique-amitie.js';
import { queteTerminee, queteEnCours } from './logique-quetes.js';
import { heureAffichee } from './logique-temps.js';

// Léon passe à partir de 6 h 30 du matin.
export const HEURE_JOURNAL = 0.27;

export function creerEtatJournal() {
  return { dernierJour: 0, lu: 0 };
}

const jourActuel = (etat) => (Number.isFinite(etat.jour) && etat.jour >= 1 ? Math.floor(etat.jour) : 1);

// Le journal arrive le matin (une fois l'atelier ouvert). Renvoie les messages.
export function majJournal(etat) {
  const j = etat.journal;
  const jour = jourActuel(etat);
  if (!etat.atelier.ouvert || j.dernierJour >= jour || etat.journee < HEURE_JOURNAL) return [];
  j.dernierJour = jour;
  return ['Léon a glissé le Journal de Cuivrebourg sous la porte. (bouton Journal, ou touche J)'];
}

// Y a-t-il un journal que l'on n'a pas encore lu ?
export function journalNonLu(etat) {
  return etat.journal.dernierJour > etat.journal.lu;
}

export function lireJournal(etat) {
  etat.journal.lu = etat.journal.dernierJour;
}

// Les rumeurs du village (une par jour, à tour de rôle).
export const RUMEURS = Object.freeze([
  "On dit qu'un poisson-lune doré vit tout au fond du lac. Gaston prétend l'avoir vu trois fois.",
  'Rouille, le chat de l\'atelier, aurait encore été surpris endormi près de la forge.',
  "Un vieil inventeur vivrait au fond de la forêt, à l'est de la place. Il parlerait aux étoiles !",
  'Capucine aurait reçu des tissus de toutes les couleurs. Ses clientes font la queue.',
  "Barnabé jure que la farine de ce mois-ci est la meilleure depuis vingt ans.",
  "Augustin a réglé l'horloge de la gare à la seconde près. Encore.",
  'Les écureuils de la forêt auraient un faible pour tout ce qui brille.',
  "Sidonie aurait trouvé un filon de cuivre en forme de cœur au fond de la galerie.",
  'Les passants adorent s\'arrêter devant les vitrines bien garnies.',
  "Lucie, la nièce d'Odile, rêverait d'ouvrir un jour son propre atelier.",
  "Les jours de pluie, les fleurs du potager poussent bien plus vite. Merci, la pluie !",
  'On raconte que la constellation du Chat endormi ressemble beaucoup à un certain chat roux…',
  "Odile prépare déjà la prochaine fête. Elle a besoin de tout le monde !",
  "Léon a fait le tour du village quatre fois aujourd'hui. Ses chaussures demandent grâce.",
]);

// La météo du jour, en une phrase.
function articleMeteo(etat, saisonId, meteoActive, saisonsActives) {
  const jour = jourActuel(etat);
  if (!meteoActive) return 'Grand beau temps sur Cuivrebourg, comme toujours.';
  const m = meteoDuJour(jour, saisonId);
  const morceaux = [];
  if (m.brume) morceaux.push('Un peu de brume au lever du jour, qui se dissipera dans la matinée.');
  if (m.pluie) {
    const debut = heureAffichee(m.pluie.debut);
    morceaux.push(`Une petite pluie douce est attendue cet après-midi, vers ${debut}. Les fleurs du potager vont adorer !`);
  } else if (saisonsActives && saisonId === 'hiver') {
    morceaux.push("Quelques flocons tomberont tout doucement. Couvrez-vous bien !");
  } else {
    morceaux.push('Pas une goutte de pluie à l\'horizon : une belle journée pour flâner.');
  }
  return morceaux.join(' ');
}

// La fête du jour, ou la prochaine.
function articleFete(etat) {
  const jour = jourActuel(etat);
  for (let d = 0; d < 8; d++) {
    const f = fetePrevue(jour + d);
    if (!f) continue;
    if (d === 0) return `C'est aujourd'hui : ${f.nom}, sur la place ! Odile compte sur l'aide de l'atelier.`;
    return `Prochaine fête : ${f.nom}, ${d === 1 ? 'demain' : `dans ${d} jours`}.`;
  }
  return '';
}

// Les anniversaires du jour (avec un petit indice sur leurs goûts), ou le prochain.
function articleAnniversaire(etat) {
  const jour = jourActuel(etat);
  const aujourdhui = anniversairesDuJour(jour);
  if (aujourdhui.length > 0) {
    // « qu'un bouquet de fleurs », « qu'une horloge mécanique ».
    return aujourdhui.map((a) => `Joyeux anniversaire à ${a.nom} ! On murmure qu'${RECETTES[a.adore].article} lui ferait très plaisir.`).join(' ');
  }
  const demain = anniversairesDuJour(jour + 1);
  if (demain.length > 0) return `Demain, c'est l'anniversaire de ${demain.map((a) => a.nom).join(' et de ')}. Pensez à un petit cadeau !`;
  return '';
}

// Une petite annonce : une idée de chose à faire (selon la partie).
function petiteAnnonce(etat, saisonId) {
  const idees = [];
  const ouvert = etat.atelier.ouvert;
  if (ouvert && etat.vitrine.objets.every((o) => !o)) idees.push("Les passants adorent les belles vitrines ! La vôtre, à droite de l'atelier, attend vos plus belles créations.");
  if (ouvert && !etat.compagnons.chat) idees.push('Un petit chat roux traîne près de chez Odile. Il cherche une maison…');
  if (ouvert && !etat.peche.canne) idees.push("Gaston, le pêcheur du lac (à l'ouest du marché), prête volontiers sa canne.");
  if (ouvert) {
    const quoi = { printemps: 'de fraises des bois', ete: 'de myrtilles', automne: 'de champignons', hiver: 'de pommes de pin' }[saisonId] || 'de baies';
    idees.push(`La forêt, à l'est de la place, est pleine ${quoi} en ce moment. Servez-vous !`);
  }
  const enCours = queteEnCours(etat);
  if (enCours && enCours.id.startsWith('dirigeable-')) {
    const faites = ['dirigeable-nacelle', 'dirigeable-enveloppe', 'dirigeable-chaudiere', 'dirigeable-helice', 'dirigeable-envol'].filter((q) => queteTerminee(etat, q)).length;
    idees.push(`Le grand projet avance : le dirigeable d'Anatole est construit à ${faites} étape${faites > 1 ? 's' : ''} sur 5.`);
  }
  if (queteTerminee(etat, 'dirigeable-envol')) idees.push('Le dirigeable « Le Cuivrebourg » survole le village. Bon voyage !');
  idees.push('Un petit mot chaque jour fait toujours plaisir à vos amis du village.');
  return idees[jourActuel(etat) % idees.length];
}

// L'édition du jour : { titre, date, articles: [{ titre, texte }] }.
// « options » : { saisonId, meteo (option activée ?), saisons (option activée ?) }.
export function editionDuJour(etat, { saisonId = 'ete', meteo = true, saisons = true } = {}) {
  const jour = jourActuel(etat);
  const c = saisonEtJour(jour);
  const saison = saisons ? SAISONS[c.saison].nom : 'Été';
  const date = `Jour ${jour} · ${saison}${saisons ? `, ${c.jour === 1 ? '1er' : '2e'} jour` : ''} · Année ${anneeDuJour(jour)}`;
  const articles = [{ titre: 'La météo', texte: articleMeteo(etat, saisonId, meteo, saisons) }];
  const fete = articleFete(etat);
  if (fete && queteTerminee(etat, 'lampe-odile')) articles.push({ titre: 'Les fêtes', texte: fete });
  const anniversaire = articleAnniversaire(etat);
  if (anniversaire) articles.push({ titre: 'Les anniversaires', texte: anniversaire });
  const n = etat.carnet.commandes.length;
  if (n > 0) articles.push({ titre: 'Le carnet de commandes', texte: `${n === 1 ? 'Une commande spéciale attend' : `${n} commandes spéciales attendent`} à l'atelier (carnet, à l'établi).` });
  articles.push({ titre: 'On dit que…', texte: RUMEURS[(jour * 5) % RUMEURS.length] });
  articles.push({ titre: 'Petite annonce', texte: petiteAnnonce(etat, saisonId) });
  return { titre: 'Le Journal de Cuivrebourg', date, articles };
}
