// =============================================================================
// logique-amitie.js — L'AMITIÉ AVEC LES HABITANTS (version 1.6), sans 3D
// -----------------------------------------------------------------------------
// Chaque habitant a 5 petits cœurs d'amitié, qui se remplissent peu à peu :
//   - quand on lui parle (une fois par jour) ;
//   - quand on lui offre un objet (une fois par jour). Chacun a ses goûts :
//     un objet qu'il ADORE compte beaucoup, un objet qu'il AIME compte bien ;
//   - quand on l'aide : ses quêtes terminées, les fêtes pour Odile, les
//     poissons trouvés pour Gaston, le carnet de commandes, les services
//     rendus à Inès et à Malik, en ville (version 1.7.1)…
// Le jour de son ANNIVERSAIRE (noté dans le calendrier), un cadeau compte double.
// À 3 cœurs, l'habitant offre un petit cadeau ; à 5 cœurs, un grand cadeau
// (une tenue pour la garde-robe, ou des plans pour l'atelier).
//
// Rien ne se perd : l'amitié ne baisse jamais, même si on ne passe pas voir
// quelqu'un pendant longtemps.
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

import { RECETTES, MATERIAUX, AMELIORATIONS, capaciteStock, possedeAmelioration } from './logique-atelier.js';
import { QUETES, queteTerminee } from './logique-quetes.js';
import { TENUES, recevoirTenue } from './logique-garderobe.js';

export const POINTS_PAR_COEUR = 50;
export const MAX_COEURS = 5;
export const POINTS_MAX = POINTS_PAR_COEUR * MAX_COEURS;

// Ce que rapporte chaque geste.
export const GAINS_AMITIE = Object.freeze({
  parler: 10,       // une fois par jour
  cadeau: 15,       // un objet qui lui fait simplement plaisir
  aime: 30,         // un objet qu'il aime
  adore: 50,        // son objet préféré
  commande: 20,     // une commande du carnet livrée
  quete: 30,        // chaque quête terminée pour lui (100 au plus)
});

// Les noms des saisons (pour écrire les anniversaires).
const NOMS_SAISONS = ['du printemps', "de l'été", "de l'automne", "de l'hiver"];

// Les habitants, leurs goûts, leur anniversaire (saison 0 à 3, jour 1 ou 2 de
// la saison) et leurs cadeaux d'amitié.
export const AMIS = Object.freeze([
  {
    id: 'odile', nom: 'Odile', saison: 0, jour: 2,
    adore: 'bouquet', aime: ['lanterne', 'baies', 'boite-musique'],
    merciAdore: 'Des fleurs ! Elles vont égayer toute ma maison. Vous êtes un amour.',
    cadeau3: { argent: 40, texte: "Tenez, quelques pièces que je mettais de côté pour vous. Si, si, j'insiste !" },
    cadeau5: { tenue: 'echarpe-tricot', texte: "Je vous ai tricoté une écharpe, avec ma plus belle laine. Pour les soirs d'hiver !" },
  },
  {
    id: 'capucine', nom: 'Capucine', saison: 1, jour: 1,
    adore: 'boite-musique', aime: ['bouquet', 'baies', 'horloge'],
    merciAdore: 'Une boîte à musique ! Je vais la poser sur mon étal : mes clients vont danser.',
    cadeau3: { materiau: 'ressort', nombre: 3, texte: "Un marchand de passage m'a laissé des ressorts. Ils seront mieux chez vous !" },
    cadeau5: { tenue: 'foulard-dore', texte: 'Le plus beau tissu de mon étal, cousu en foulard. Il est pour vous, mon ami.' },
  },
  {
    id: 'leon', nom: 'Léon', saison: 1, jour: 2,
    adore: 'baies', aime: ['lanterne', 'champignons', 'bouilloire'],
    merciAdore: 'Des baies ! Ma femme va en faire une tarte. Je vous en garderai une part !',
    cadeau3: { argent: 30, texte: 'Un client très content de ses commandes vous a laissé un pourboire. Le voici !' },
    cadeau5: { tenue: 'casquette-facteur', texte: "Ma casquette de rechange ! Avec elle, vous êtes un vrai facteur d'honneur de Cuivrebourg." },
  },
  {
    id: 'barnabe', nom: 'Barnabé', saison: 2, jour: 1,
    adore: 'champignons', aime: ['bouilloire', 'baies', 'pommes-pin'],
    merciAdore: 'Des champignons des bois ! Ce soir, omelette pour toute la famille.',
    cadeau3: { materiau: 'bois', nombre: 3, texte: "Il me restait de belles planches de la réparation de la roue. Prenez-les !" },
    cadeau5: { tenue: 'beret-farine', texte: 'Un béret de meunier, tout blanc ! Vous faites partie de la famille du moulin, maintenant.' },
  },
  {
    id: 'augustin', nom: 'Augustin', saison: 3, jour: 2,
    adore: 'horloge', aime: ['train-miniature', 'lanterne', 'champignons'],
    merciAdore: 'Une horloge ! Et elle est juste à la seconde près. Vous me connaissez bien.',
    cadeau3: { materiau: 'ressort', nombre: 3, texte: "Des ressorts de rechange de la locomotive. Elle n'en a plus besoin, grâce à vous." },
    cadeau5: { amelioration: 'plans-train', texte: "Les plans d'un petit train miniature, dessinés quand j'étais jeune. Fabriquez-en : les enfants vont adorer !" },
  },
  {
    id: 'sidonie', nom: 'Sidonie', saison: 3, jour: 1,
    adore: 'automate', aime: ['lanterne', 'pommes-pin', 'horloge'],
    merciAdore: "Un automate ! Comme ceux de mon grand-père… Merci, du fond du cœur.",
    cadeau3: { materiau: 'cuivre', nombre: 3, texte: 'Du beau cuivre, tout juste sorti de la galerie. Pour votre atelier !' },
    cadeau5: { tenue: 'casque-mineur', texte: 'Mon casque de mineur de rechange, avec sa petite lampe. Vous êtes des nôtres !' },
  },
  {
    id: 'gaston', nom: 'Gaston', saison: 2, jour: 2,
    adore: 'bouilloire', aime: ['champignons', 'pommes-pin', 'lanterne'],
    merciAdore: "Une bouilloire ! Un bon thé chaud au bord du lac, il n'y a rien de mieux.",
    cadeau3: { argent: 30, texte: "J'ai vendu quelques poissons au marché. Voici votre part, l'ami." },
    cadeau5: { tenue: 'bonnet-marin', texte: "Mon bonnet de marin, de quand je naviguais. Il vous tiendra chaud au bout du ponton." },
  },
  {
    id: 'lucie', nom: 'Lucie', saison: 0, jour: 1,
    adore: 'train-miniature', aime: ['automate', 'boite-musique', 'bouquet'],
    merciAdore: 'Un train miniature ! Un jour, je prendrai le vrai pour voir le monde.',
    cadeau3: { materiau: 'cuivre', nombre: 2, texte: "J'ai économisé des chutes de cuivre en travaillant. Elles sont à vous, maître !" },
    cadeau5: { tenue: 'lunettes-rondes', texte: "Des lunettes rondes, comme celles de tante Odile. Je les ai réglées moi-même !" },
  },
  {
    id: 'anatole', nom: 'Anatole', saison: 3, jour: 2,
    adore: 'pommes-pin', aime: ['horloge', 'automate', 'champignons'],
    merciAdore: 'Des pommes de pin ! Regardez ces spirales : la nature est la plus grande des inventrices.',
    cadeau3: { argent: 40, texte: "Une petite bourse, pour vos prochaines inventions. La science n'attend pas !" },
    cadeau5: { tenue: 'haut-de-forme-inventeur', texte: "Mon haut-de-forme d'inventeur, avec ses engrenages. Vous êtes un vrai inventeur, maintenant !" },
  },
  // Version 1.7.1 : les deux habitants de la ville nouvelle.
  {
    id: 'ines', nom: 'Inès', saison: 1, jour: 1,
    adore: 'lanterne', aime: ['train-miniature', 'horloge', 'bouquet'],
    merciAdore: "Une lanterne ! Je l'accroche à l'avant du tramway : les soirs de brume, on me verra de loin.",
    cadeau3: { materiau: 'ressort', nombre: 3, texte: 'Des ressorts de rechange du tramway. Au dépôt, on en a des caisses entières !' },
    cadeau5: { tenue: 'casquette-tram', texte: 'Ma casquette de conductrice ! Avec elle, vous voyagez gratuitement… enfin, comme tout le monde.' },
  },
  {
    id: 'malik', nom: 'Malik', saison: 2, jour: 1,
    adore: 'bouquet', aime: ['baies', 'bouilloire', 'boite-musique'],
    merciAdore: 'Un bouquet ! Une fleur sur chaque table de la terrasse : mes clients vont se croire à la campagne.',
    cadeau3: { argent: 40, texte: "Les clients ont laissé des pourboires « pour l'artisan de la bouilloire ». C'est vous !" },
    cadeau5: { tenue: 'tablier-barista', texte: 'Un tablier du café, noir et bien coupé. Vous êtes ici chez vous, Ferrus.' },
  },
]);

// Les objets qu'on peut offrir (ceux de l'atelier, et ce qui pousse ou se cueille).
export const CADEAUX_POSSIBLES = Object.freeze(
  ['bouquet', 'baies', 'champignons', 'pommes-pin', 'lanterne', 'bouilloire', 'horloge', 'boite-musique', 'automate', 'train-miniature']
    .filter((id) => RECETTES[id]),
);

export const ami = (id) => AMIS.find((a) => a.id === id) || null;
const jourActuel = (etat) => (Number.isFinite(etat.jour) && etat.jour >= 1 ? Math.floor(etat.jour) : 1);

export function creerEtatAmitie() {
  const amis = {};
  for (const a of AMIS) amis[a.id] = { points: 0, parle: 0, cadeau: 0 };
  return { amis, recompenses: [] };
}

// -----------------------------------------------------------------------------
// 1. LES CŒURS
// -----------------------------------------------------------------------------

// Ce que l'aide apportée rapporte en plus (calculé d'après la partie : les
// anciennes sauvegardes en profitent aussi).
export function bonusAmitie(etat, id) {
  let bonus = 0;
  const quetes = Object.entries(QUETES).filter(([q, d]) => d.donneur === id && queteTerminee(etat, q)).length;
  bonus += Math.min(100, quetes * GAINS_AMITIE.quete);
  if (id === 'odile') bonus += (etat.fetes ? etat.fetes.faites.length : 0) * 15;
  if (id === 'gaston' && etat.peche) bonus += Math.min(40, Object.values(etat.peche.especes).filter((n) => n > 0).length * 5);
  if (id === 'lucie' && possedeAmelioration(etat, 'apprentie')) bonus += 30;
  // Version 1.7.1 : le service rendu à un habitant de la ville nouvelle.
  if ((id === 'ines' || id === 'malik') && etat.ville && etat.ville.services[id]) bonus += 40;
  return bonus;
}

export function pointsAmitie(etat, id) {
  const suivi = etat.amitie.amis[id];
  if (!suivi) return 0;
  return Math.min(POINTS_MAX, suivi.points + bonusAmitie(etat, id));
}

export function coeurs(etat, id) {
  return Math.floor(pointsAmitie(etat, id) / POINTS_PAR_COEUR);
}

// Ajoute des points d'amitié. Renvoie un message si un cœur de plus est gagné.
export function ajouterPoints(etat, id, n) {
  const suivi = etat.amitie.amis[id];
  if (!suivi || !(n > 0)) return [];
  const avant = coeurs(etat, id);
  suivi.points = Math.min(POINTS_MAX, suivi.points + n);
  const apres = coeurs(etat, id);
  if (apres <= avant) return [];
  return [`♥ ${ami(id).nom} vous apprécie un peu plus (${apres}/${MAX_COEURS})`];
}

// Le petit texte des cœurs : « ♥♥♥♡♡ ».
export function texteCoeurs(n) {
  const c = Math.max(0, Math.min(MAX_COEURS, n));
  return '♥'.repeat(c) + '♡'.repeat(MAX_COEURS - c);
}

// -----------------------------------------------------------------------------
// 2. LES ANNIVERSAIRES
// -----------------------------------------------------------------------------
// Le calendrier : une saison dure 2 jours (logique-saisons.js), une année 8 jours.
export function saisonEtJour(jour) {
  const j = Math.max(1, Math.floor(jour)) - 1;
  return { saison: Math.floor(j / 2) % 4, jour: (j % 2) + 1 };
}

// « le 2e jour du printemps ».
export function texteAnniversaire(id) {
  const a = ami(id);
  if (!a) return '';
  return `le ${a.jour === 1 ? '1er' : '2e'} jour ${NOMS_SAISONS[a.saison]}`;
}

// Les habitants dont c'est l'anniversaire ce jour-là.
export function anniversairesDuJour(jour) {
  const c = saisonEtJour(jour);
  return AMIS.filter((a) => a.saison === c.saison && a.jour === c.jour);
}

export function estAnniversaire(etat, id) {
  return anniversairesDuJour(jourActuel(etat)).some((a) => a.id === id);
}

// Le prochain anniversaire (aujourd'hui compris) : { ami, dans } (dans = jours).
export function prochainAnniversaire(etat) {
  const jour = jourActuel(etat);
  for (let d = 0; d < 8; d++) {
    const liste = anniversairesDuJour(jour + d);
    if (liste.length > 0) return { amis: liste, dans: d };
  }
  return null;
}

// -----------------------------------------------------------------------------
// 3. PARLER ET OFFRIR
// -----------------------------------------------------------------------------

// On vient de parler à un habitant (une fois par jour, ça compte).
export function parlerAmi(etat, id) {
  const suivi = etat.amitie.amis[id];
  if (!suivi) return [];
  const jour = jourActuel(etat);
  if (suivi.parle >= jour) return [];
  suivi.parle = jour;
  return ajouterPoints(etat, id, GAINS_AMITIE.parler);
}

// Les objets du stock qu'on pourrait offrir.
export function objetsOffrables(etat) {
  return CADEAUX_POSSIBLES.filter((id) => etat.atelier.stock[id] > 0);
}

// Peut-on offrir quelque chose à cet habitant aujourd'hui ?
export function peutOffrir(etat, id) {
  const suivi = etat.amitie.amis[id];
  return Boolean(suivi) && suivi.cadeau < jourActuel(etat) && objetsOffrables(etat).length > 0;
}

// Ajoute le choix « Offrir un cadeau… » à un dialogue ordinaire (seulement si
// ce dialogue n'attend rien d'important : tous ses choix ferment simplement ;
// « toujours » : même s'il a d'autres choix, comme celui de Lucie).
// Le jour de son anniversaire, l'habitant le dit.
export function ajouterChoixAmitie(etat, id, dialogue, toujours = false) {
  if (!dialogue || !ami(id)) return dialogue;
  if (!toujours && !dialogue.choix.every((c) => c.action === 'fermer')) return dialogue;
  const d = { ...dialogue, repliques: [...dialogue.repliques], choix: [...dialogue.choix] };
  if (estAnniversaire(etat, id)) d.repliques.push("Au fait… c'est mon anniversaire, aujourd'hui !");
  if (peutOffrir(etat, id)) {
    const choix = { texte: 'Offrir un cadeau…', action: `amitie:cadeau:${id}` };
    if (toujours) d.choix.push(choix);
    else d.choix.unshift(choix);
  }
  return d;
}

// La liste des cadeaux possibles, sous forme de dialogue.
export function dialogueCadeau(etat, id) {
  const a = ami(id);
  const choix = objetsOffrables(etat).map((o) => ({ texte: `${RECETTES[o].nom} (${etat.atelier.stock[o]})`, action: `amitie:offrir:${id}:${o}` }));
  choix.push({ texte: 'Rien, finalement', action: 'fermer' });
  return { orateur: 'Ferrus', repliques: [`Que voulez-vous offrir à ${a.nom} ?`], choix };
}

// Offrir un objet. Renvoie { reaction, messages } : la réaction (ce que dit
// l'habitant) et les petits messages à afficher.
export function offrirCadeau(etat, id, objet) {
  const a = ami(id);
  const suivi = etat.amitie.amis[id];
  if (!a || !suivi || !CADEAUX_POSSIBLES.includes(objet)) return { reaction: null, messages: [] };
  if (suivi.cadeau >= jourActuel(etat)) return { reaction: null, messages: [`Vous avez déjà offert un cadeau à ${a.nom} aujourd'hui.`] };
  if (!(etat.atelier.stock[objet] > 0)) return { reaction: null, messages: [`Il vous faut d'abord ${RECETTES[objet].article}.`] };
  etat.atelier.stock[objet] -= 1;
  suivi.cadeau = jourActuel(etat);
  let points;
  let reaction;
  if (objet === a.adore) {
    points = GAINS_AMITIE.adore;
    reaction = a.merciAdore;
  } else if (a.aime.includes(objet)) {
    points = GAINS_AMITIE.aime;
    reaction = `Oh, ${RECETTES[objet].article} ! J'aime beaucoup ça. Merci, Ferrus !`;
  } else {
    points = GAINS_AMITIE.cadeau;
    reaction = `C'est gentil de penser à moi. Merci beaucoup !`;
  }
  if (estAnniversaire(etat, id)) {
    points *= 2;
    reaction += ' Et pour mon anniversaire, en plus… Quel beau cadeau !';
  }
  return { reaction, messages: ajouterPoints(etat, id, points) };
}

// -----------------------------------------------------------------------------
// 4. LES CADEAUX D'AMITIÉ (à 3 et à 5 cœurs)
// -----------------------------------------------------------------------------
const cleRecompense = (id, niveau) => `${id}-${niveau}`;

// Un cadeau attend-il ? Renvoie 3, 5 ou null.
export function recompenseEnAttente(etat, id) {
  if (!ami(id)) return null;
  const c = coeurs(etat, id);
  for (const niveau of [3, 5]) {
    if (c >= niveau && !etat.amitie.recompenses.includes(cleRecompense(id, niveau))) return niveau;
  }
  return null;
}

export function dialogueRecompense(etat, id) {
  const niveau = recompenseEnAttente(etat, id);
  if (!niveau) return null;
  const a = ami(id);
  const cadeau = niveau === 3 ? a.cadeau3 : a.cadeau5;
  return {
    orateur: a.nom,
    repliques: [niveau === 3 ? 'Vous savez, Ferrus, je suis bien content de vous connaître.' : 'Ferrus… vous êtes devenu un ami très cher.', cadeau.texte],
    choix: [{ texte: 'Merci, du fond du cœur !', action: `amitie:recompense:${id}:${niveau}` }],
  };
}

// Recevoir le cadeau d'amitié. Renvoie les messages à afficher.
export function recevoirRecompense(etat, id, niveau) {
  if (recompenseEnAttente(etat, id) !== niveau) return [];
  const a = ami(id);
  const cadeau = niveau === 3 ? a.cadeau3 : a.cadeau5;
  etat.amitie.recompenses.push(cleRecompense(id, niveau));
  if (cadeau.argent) {
    etat.argent += cadeau.argent;
    return [`+${cadeau.argent} pièces`, `Un cadeau de ${a.nom} !`];
  }
  if (cadeau.materiau) {
    const place = Math.max(0, capaciteStock(etat) - etat.atelier.stock[cadeau.materiau]);
    const n = Math.min(place, cadeau.nombre);
    etat.atelier.stock[cadeau.materiau] += n;
    const m = MATERIAUX[cadeau.materiau];
    if (n === 0) {
      // L'atelier est plein : l'habitant donne quelques pièces à la place.
      etat.argent += 20;
      return ['+20 pièces', `Un cadeau de ${a.nom} (l'atelier était plein : des pièces à la place).`];
    }
    return [`Un cadeau de ${a.nom} : ${n} ${n > 1 ? m.pluriel : m.nom.toLowerCase()} !`];
  }
  if (cadeau.tenue && TENUES[cadeau.tenue]) return recevoirTenue(etat, cadeau.tenue);
  if (cadeau.amelioration && AMELIORATIONS[cadeau.amelioration]) {
    if (!etat.atelier.ameliorations.includes(cadeau.amelioration)) etat.atelier.ameliorations.push(cadeau.amelioration);
    return [`Cadeau : ${AMELIORATIONS[cadeau.amelioration].nom} !`];
  }
  return [];
}

// Les actions des dialogues d'amitié (« amitie:recompense:odile:3 »).
export function appliquerActionAmitie(etat, action) {
  const [prefixe, type, id, reste] = String(action).split(':');
  if (prefixe !== 'amitie') return [];
  if (type === 'recompense') return recevoirRecompense(etat, id, Number(reste));
  if (type === 'offrir') return offrirCadeau(etat, id, reste).messages;
  return [];
}
