// =============================================================================
// logique-fetes.js — LES FÊTES DES SAISONS (version 1.5), sans aucune 3D
// -----------------------------------------------------------------------------
// Chaque saison a sa fête, sur la place, le 2e jour de la saison :
//
//   printemps : la Fête des lanternes   (jours 2, 10, 18…)
//   été       : le Bal d'été            (jours 4, 12, 20…)
//   automne   : la Foire aux pommes     (jours 6, 14, 22…)
//   hiver     : la Fête des lumières    (jours 8, 16, 24…)
//
// Ce jour-là, la place se décore, et Odile, qui organise la fête, demande à
// Ferrus de fabriquer deux objets spéciaux (qu'on ne peut fabriquer que ce
// jour-là). Les lui apporter rapporte des pièces et un souvenir dans l'album.
// Chaque fête ne se fait qu'une fois par an (une année = 8 jours).
//
// Les fêtes suivent toujours le vrai calendrier du jeu, même si l'option
// « Saisons » est coupée. Ce fichier ne contient aucune 3D : il est testé.
// =============================================================================

import { RECETTES, decrireMateriaux } from './logique-atelier.js';
import { queteTerminee } from './logique-quetes.js';

export const FETES = Object.freeze([
  {
    id: 'fete-lanternes',
    saison: 0,
    nom: 'Fête des lanternes',
    objet: 'lanterne-papier',
    quantite: 2,
    recompense: 120,
    annonce: "Aujourd'hui, c'est la Fête des lanternes sur la place ! Odile a besoin de vous.",
    demande: [
      "C'est la Fête des lanternes ! Toute la place va briller ce soir.",
      'Il me manque encore deux lanternes de papier pour la fontaine… pardon, pour le puits ! Vous pourriez m\'en fabriquer ?',
    ],
    merci: ['Elles sont magnifiques ! Je les accroche tout de suite.', 'Voici 120 pièces, avec tous mes remerciements. Bonne fête, Ferrus !'],
    apres: ['Quelle belle Fête des lanternes ! Revenez ce soir voir la place briller.'],
  },
  {
    id: 'bal-ete',
    saison: 1,
    nom: "Bal d'été",
    objet: 'carillon',
    quantite: 2,
    recompense: 120,
    annonce: "Aujourd'hui, c'est le Bal d'été sur la place ! Odile a besoin de vous.",
    demande: [
      "C'est le Bal d'été ! On va danser sous les fanions jusqu'à la nuit.",
      'Il nous faudrait deux carillons à vent pour accompagner la musique. Vous pourriez les fabriquer ?',
    ],
    merci: ['Écoutez-les tinter dans la brise… Parfait !', 'Voici 120 pièces. Vous m\'accorderez une danse, tout à l\'heure ?'],
    apres: ['Quel beau bal ! Mes vieilles jambes s\'en souviendront longtemps.'],
  },
  {
    id: 'foire-pommes',
    saison: 2,
    nom: 'Foire aux pommes',
    objet: 'presse-pommes',
    quantite: 2,
    recompense: 120,
    annonce: "Aujourd'hui, c'est la Foire aux pommes sur la place ! Odile a besoin de vous.",
    demande: [
      "C'est la Foire aux pommes ! Les vergers ont donné plus que jamais.",
      'Pour faire du jus pour tout le monde, il nous faut deux presses à pommes. Vous sauriez les fabriquer ?',
    ],
    merci: ['Deux belles presses ! Le jus va couler à flots.', 'Voici 120 pièces. Et goûtez donc ce jus : c\'est le premier de la saison !'],
    apres: ['Tout le village a goûté le jus de pommes. Un vrai succès !'],
  },
  {
    id: 'fete-lumieres',
    saison: 3,
    nom: 'Fête des lumières',
    objet: 'etoile-cuivre',
    quantite: 2,
    recompense: 120,
    annonce: "Aujourd'hui, c'est la Fête des lumières sur la place ! Odile a besoin de vous.",
    demande: [
      "C'est la Fête des lumières ! On accroche des lumières partout pour réchauffer l'hiver.",
      'Il manque deux étoiles de cuivre pour le haut du puits et pour la porte de l\'atelier. Vous pourriez les fabriquer ?',
    ],
    merci: ['Elles brillent comme de vraies étoiles !', 'Voici 120 pièces. Bonne Fête des lumières, Ferrus !'],
    apres: ['Avec toutes ces lumières, on n\'a presque plus froid. Merci encore !'],
  },
]);

// Les petits numéros du calendrier.
const jourActuel = (etat) => (Number.isFinite(etat.jour) && etat.jour >= 1 ? Math.floor(etat.jour) : 1);
export const anneeDuJour = (jour) => Math.floor((jour - 1) / 8) + 1;

// La fête prévue ce jour-là (ou null). Le 2e jour de chaque saison.
export function fetePrevue(jour) {
  if ((jour - 1) % 2 !== 1) return null;
  const saison = Math.floor((jour - 1) / 2) % 4;
  return FETES.find((f) => f.saison === saison) || null;
}

// La fête du jour, si elle a lieu (il faut que la lampe d'Odile soit réparée :
// c'est elle qui l'organise).
export function feteDuJour(etat) {
  if (!queteTerminee(etat, 'lampe-odile')) return null;
  return fetePrevue(jourActuel(etat));
}

const cle = (fete, jour) => `${fete.id}-${anneeDuJour(jour)}`;

// Ferrus a-t-il déjà aidé pour la fête de cette année ?
export function feteFaite(etat, fete) {
  return etat.fetes.faites.includes(cle(fete, jourActuel(etat)));
}

// La fête du jour, si Ferrus peut encore aider (sinon null).
export function feteAAider(etat) {
  const f = feteDuJour(etat);
  return f && !feteFaite(etat, f) ? f : null;
}

export function creerEtatFetes() {
  return { faites: [], annonce: 0 };
}

// À appeler souvent (très léger) : débloque l'objet de la fête à l'établi, et
// annonce la fête le matin. Renvoie les messages à afficher.
export function majFetes(etat) {
  const f = feteAAider(etat);
  etat.atelier.recettesFete = f ? [f.objet] : [];
  const jour = jourActuel(etat);
  if (f && etat.fetes.annonce < jour && etat.journee >= 0.25) {
    etat.fetes.annonce = jour;
    return [f.annonce];
  }
  return [];
}

// Le dialogue d'Odile pendant une fête (null s'il n'y a pas de fête).
export function dialogueFete(etat) {
  const f = feteDuJour(etat);
  if (!f) return null;
  if (feteFaite(etat, f)) return { orateur: 'Odile', repliques: f.apres, choix: [{ texte: 'Bonne fête, Odile !', action: 'fermer' }] };
  const r = RECETTES[f.objet];
  if (etat.atelier.stock[f.objet] >= f.quantite) {
    return {
      orateur: 'Odile',
      repliques: f.demande.slice(0, 1).concat([`Oh ! Vous avez déjà les ${r.pluriel} ?`]),
      choix: [
        { texte: `Donner ${f.quantite} ${r.pluriel} (+${f.recompense})`, action: `fete:livrer:${f.id}` },
        { texte: 'Un instant…', action: 'fermer' },
      ],
    };
  }
  return {
    orateur: 'Odile',
    repliques: [...f.demande, `(À fabriquer à l'établi, aujourd'hui seulement. Pour ${r.article.startsWith('une') ? 'chacune' : 'chacun'}, il faut : ${decrireMateriaux(r.ingredients)}.)`],
    choix: [{ texte: "Je m'en occupe !", action: 'fermer' }],
  };
}

// Apporter les objets de la fête à Odile. Renvoie les messages à afficher.
export function livrerFete(etat, id) {
  const f = feteAAider(etat);
  if (!f || f.id !== id) return [];
  if (etat.atelier.stock[f.objet] < f.quantite) return [`Il faut ${f.quantite} ${RECETTES[f.objet].pluriel}.`];
  etat.atelier.stock[f.objet] -= f.quantite;
  etat.argent += f.recompense;
  etat.fetes.faites.push(cle(f, jourActuel(etat)));
  etat.atelier.recettesFete = [];
  return [`+${f.recompense} pièces`, `${f.nom} : un souvenir de plus dans l'album !`];
}

// Le texte de l'objectif pendant une fête (null sinon).
export function objectifFete(etat) {
  const f = feteAAider(etat);
  if (!f) return null;
  const r = RECETTES[f.objet];
  if (etat.atelier.stock[f.objet] >= f.quantite) return `${f.nom} : apporte les ${r.pluriel} à Odile, devant sa maison.`;
  return `${f.nom} : fabrique ${f.quantite} ${r.pluriel} pour Odile (à l'établi, aujourd'hui seulement).`;
}
