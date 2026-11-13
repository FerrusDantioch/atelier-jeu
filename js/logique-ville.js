// =============================================================================
// logique-ville.js — LA VILLE NOUVELLE (version 1.7), sans aucune 3D
// -----------------------------------------------------------------------------
// Au bout de la ligne de tramway qui part de la gare, il y a un quartier tout
// neuf : des immeubles de verre, un café, des voitures, un petit parc. On y
// vit comme aujourd'hui… mais on y aime toujours les beaux objets faits main.
//
// Deux habitants y ont chacun un SERVICE à demander à Ferrus :
//   - Inès, la conductrice du tramway, voudrait une horloge mécanique pour
//     son arrêt (l'écran des horaires est en panne) ;
//   - Malik, le patron du café, voudrait une bouilloire à vapeur (sa machine
//     à café fait des caprices).
// Ce ne sont pas des quêtes : on peut les rendre quand on veut, dans l'ordre
// qu'on veut, dès que le tramway roule. Ils paient bien mieux qu'un client du
// comptoir, et quand les deux sont rendus, la ville offre une prime.
// =============================================================================

import { RECETTES } from './logique-atelier.js';
import { queteTerminee } from './logique-quetes.js';

export const SERVICES_VILLE = Object.freeze({
  ines: {
    nom: 'Inès',
    objet: 'horloge',
    prix: 160,
    demande: [
      'Bonjour ! Vous venez du vieux village, par le tramway ? Moi, c\'est Inès : c\'est moi qui le conduis.',
      "L'écran des horaires de mon arrêt est encore en panne. Les voyageurs ne savent plus quand je passe !",
      'On dit qu\'à Cuivrebourg, vos horloges ne tombent jamais en panne. Vous m\'en fabriqueriez une ? Je vous la paie 160 pièces.',
    ],
    rappel: ['Une horloge mécanique pour mon arrêt, et plus personne ne ratera le tramway. 160 pièces pour vous !'],
    merci: [
      'Elle est magnifique ! Et elle fait « tic-tac » : ça change des écrans.',
      'Voici vos 160 pièces. Je l\'accroche tout de suite à l\'arrêt.',
    ],
    apres: ["Regardez l'arrêt : tout le monde lève les yeux vers votre horloge. Elle est toujours à l'heure, elle !"],
    fait: "L'horloge est accrochée à l'arrêt du tramway.",
  },
  malik: {
    nom: 'Malik',
    objet: 'bouilloire',
    prix: 110,
    demande: [
      'Bienvenue au café ! Moi, c\'est Malik. Vous avez les mains d\'un artisan, vous.',
      'Ma machine à café dernier cri ne veut plus chauffer l\'eau. Trois réparateurs, trois échecs !',
      'Une bonne bouilloire à vapeur, ça ne tombe jamais en panne. Vous m\'en apporteriez une ? 110 pièces, et le café est pour moi.',
    ],
    rappel: ['Une bouilloire à vapeur pour le café : 110 pièces, et un bon café en prime !'],
    merci: [
      'Écoutez-la siffler ! Mes clients vont adorer.',
      'Voici vos 110 pièces… et votre café. Il est meilleur qu\'avant, vous ne trouvez pas ?',
    ],
    apres: ['Votre bouilloire trône sur le comptoir. On vient de tout le quartier pour la voir siffler !'],
    fait: 'La bouilloire siffle sur le comptoir du café.',
  },
});

// La prime de la ville, quand les deux services sont rendus.
export const PRIME_VILLE = 100;

export function creerEtatVille() {
  return { services: { ines: false, malik: false }, rencontres: [], prime: false };
}

// Le tramway roule dès que le train de Cuivrebourg est reparti.
export function tramOuvert(etat) {
  return queteTerminee(etat, 'train-cuivrebourg');
}

// Le service d'un habitant de la ville est-il rendu ?
export function serviceRendu(etat, pnj) {
  return Boolean(etat.ville && etat.ville.services[pnj]);
}

// Est-ce un habitant de la ville nouvelle ?
export function estHabitantVille(pnj) {
  return Boolean(SERVICES_VILLE[pnj]);
}

// Ce que dit un habitant de la ville (null si ce n'en est pas un).
export function dialogueVille(etat, pnj) {
  const s = SERVICES_VILLE[pnj];
  if (!s) return null;
  if (serviceRendu(etat, pnj)) {
    return { orateur: s.nom, repliques: s.apres, choix: [{ texte: 'Au revoir', action: 'fermer' }] };
  }
  const recette = RECETTES[s.objet];
  // La première fois, il explique ; ensuite, il rappelle en une phrase.
  const repliques = etat.ville.rencontres.includes(pnj) ? s.rappel : s.demande;
  if (etat.atelier.stock[s.objet] > 0) {
    return {
      orateur: s.nom,
      repliques,
      choix: [
        { texte: `Donner ${recette.article}`, action: `ville:donner:${pnj}` },
        { texte: 'Plus tard', action: `ville:vu:${pnj}` },
      ],
    };
  }
  return { orateur: s.nom, repliques, choix: [{ texte: "Je m'en occupe", action: `ville:vu:${pnj}` }] };
}

// Le remerciement d'un habitant, juste après avoir reçu son objet.
export function dialogueMerciVille(pnj) {
  const s = SERVICES_VILLE[pnj];
  return s ? { orateur: s.nom, repliques: s.merci, choix: [{ texte: 'Avec plaisir !', action: 'fermer' }] } : null;
}

// Applique un choix de dialogue de la ville. Renvoie les messages à afficher.
export function appliquerActionVille(etat, action) {
  const [prefixe, type, pnj] = String(action).split(':');
  const s = SERVICES_VILLE[pnj];
  if (prefixe !== 'ville' || !s) return [];
  const v = etat.ville;
  if (!v.rencontres.includes(pnj)) v.rencontres.push(pnj);
  if (type !== 'donner' || v.services[pnj] || !(etat.atelier.stock[s.objet] > 0)) return [];
  etat.atelier.stock[s.objet] -= 1;
  etat.argent += s.prix;
  v.services[pnj] = true;
  const messages = [`+${s.prix} pièces`, s.fait];
  if (!v.prime && Object.keys(SERVICES_VILLE).every((id) => v.services[id])) {
    v.prime = true;
    etat.argent += PRIME_VILLE;
    messages.push(`La ville nouvelle vous remercie : +${PRIME_VILLE} pièces de prime !`);
  }
  return messages;
}

// L'objectif secondaire : ce qu'il reste à faire en ville (ou null).
export function objectifVille(etat) {
  if (!tramOuvert(etat) || !etat.ville) return null;
  const reste = Object.entries(SERVICES_VILLE).filter(([id]) => !etat.ville.services[id]);
  if (reste.length === 0) return null;
  const connus = reste.filter(([id]) => etat.ville.rencontres.includes(id));
  if (connus.length === 0) return null;
  return `Ville nouvelle : ${connus.map(([, s]) => `${s.nom} attend ${RECETTES[s.objet].article}`).join(' ; ')}.`;
}
