// =============================================================================
// logique-quetes.js — LE MOTEUR DE QUÊTES (étape 3), sans aucune 3D
// -----------------------------------------------------------------------------
// Une quête est décrite par des DONNÉES : qui la donne, ce qu'il faut avoir
// fini avant (« prerequis »), puis une liste d'ÉTAPES à faire dans l'ordre.
//
// Les types d'étapes possibles :
//   - 'ramasser'  : des objets apparaissent dans un lieu ; on marche dessus ;
//   - 'fabriquer' : fabriquer un objet à l'établi (l'étape est finie dès que
//                   l'objet est dans le stock) ;
//   - 'livrer'    : parler à un personnage en ayant l'objet dans le stock ;
//   - 'utiliser'  : utiliser un objet du décor (l'établi, un mécanisme…), en
//                   ayant l'objet demandé dans le stock s'il y en a un ;
//   - 'parler'    : simplement parler à un personnage.
//
// Les quêtes s'enchaînent : chacune a pour prérequis la précédente. La toute
// première (la lampe d'Odile) n'a pas de prérequis : elle est disponible dès
// le début de la partie, et la terminer ouvre l'atelier.
//
// Pour ajouter une quête plus tard : ajouter une entrée dans QUETES, avec ses
// textes. Le reste (objectifs, marqueurs, dialogues) suit automatiquement.
// =============================================================================

import { RECETTES, ouvrirAtelier } from './logique-atelier.js';

// Distance (en mètres) pour ramasser un objet de quête en marchant dessus.
export const DISTANCE_RAMASSAGE_QUETE = 1.0;

// -----------------------------------------------------------------------------
// 1. LES QUÊTES
// -----------------------------------------------------------------------------
export const QUETES = Object.freeze({
  'lampe-odile': {
    titre: "La lampe d'Odile",
    donneur: 'odile',
    lieuDonneur: 'devant sa maison, à droite de la place',
    // L'objectif tant que la quête n'est pas acceptée (c'est le tout début du jeu).
    objectifDepart: 'Va parler à Odile, devant sa maison à droite de la place.',
    prerequis: null,
    recettes: [],
    ouvreAtelier: true, // la terminer ouvre l'atelier (étape 2 du jeu)
    etapes: [
      {
        type: 'ramasser',
        // Les 3 engrenages perdus par Odile, éparpillés sur la place.
        objets: [
          { id: 'engrenage-1', lieu: 'place', x: -13, z: 1.5 },
          { id: 'engrenage-2', lieu: 'place', x: 4, z: 7.5 },
          { id: 'engrenage-3', lieu: 'place', x: 13.5, z: -6 },
        ],
        ramasse: 'Engrenage ramassé',
        messageFin: "Tous les engrenages ! Direction l'établi.",
        objectif: "Retrouve les engrenages d'Odile sur la place",
        repliquesDonneur: ['Merci de chercher ! Engrenages retrouvés : {n} sur {total}. Ils ont roulé un peu partout sur la place.'],
      },
      {
        type: 'utiliser',
        cible: 'etabli',
        messageFait: 'Lampe à vapeur réparée !',
        objectif: "Rapporte les engrenages à ton établi, devant l'atelier.",
        repliquesDonneur: ["Vous les avez tous ! Il ne reste qu'à réparer la lampe sur votre établi."],
      },
      {
        type: 'parler',
        pnj: 'odile',
        choix: 'Donner la lampe',
        objectif: 'Apporte la lampe réparée à Odile.',
      },
    ],
    recompense: 120,
    textes: {
      proposition: [
        "Bonjour ! Vous êtes le nouvel artisan ? Ferrus Dantioch, c'est bien ça ?",
        'Ma lampe à vapeur est tombée la semaine dernière. Depuis, mes soirées sont bien sombres…',
        'Trois engrenages ont sauté dans la chute. Ils ont roulé quelque part sur la place.',
        'Pourriez-vous les retrouver et réparer ma lampe ? Je vous paierai 120 pièces.',
      ],
      enCours: ['Merci de chercher !'],
      fin: [
        'Ma lampe ! Elle brille comme au premier jour…',
        "Voici vos 120 pièces, bien méritées. Cuivrebourg a besoin d'artisans comme vous.",
      ],
      apres: ['Merci encore, Ferrus. Je parlerai de votre atelier à tout le quartier !'],
    },
  },

  'balance-capucine': {
    titre: 'La balance de Capucine',
    donneur: 'capucine',
    lieuDonneur: 'au marché, par le portail du sud de la place',
    prerequis: 'lampe-odile',
    recettes: ['balance'],
    etapes: [
      {
        type: 'fabriquer',
        objet: 'balance',
        objectif: "Fabrique une balance de précision à l'établi (2 cuivres, 1 ressort).",
      },
      {
        type: 'livrer',
        pnj: 'capucine',
        objet: 'balance',
        objectif: 'Apporte la balance de précision à Capucine, au marché.',
      },
    ],
    recompense: 120,
    textes: {
      proposition: [
        "Oh, vous êtes l'artisan dont Odile parle à tout le monde ? Bonjour, je suis Capucine.",
        'Ma vieille balance est cassée. Sans elle, impossible de peser quoi que ce soit : mes clients repartent bredouilles.',
        'Pourriez-vous me fabriquer une balance de précision ? Je vous paierai 120 pièces.',
      ],
      enCours: ["Une balance de précision, avec deux plateaux de cuivre et un bon ressort. Je compte sur vous !"],
      livraison: [
        'Magnifique ! Elle est juste au gramme près.',
        "Voici vos 120 pièces. Et une bonne nouvelle : on a dégagé l'arbre tombé sur le chemin du moulin, à l'est du marché.",
        'Barnabé, le meunier, aurait bien besoin de vous. Sa roue ne tourne plus depuis des semaines…',
      ],
      apres: ["Grâce à vous, le marché revit ! Allez voir Barnabé, au moulin, à l'est."],
    },
  },

  'roue-moulin': {
    titre: 'La roue du moulin',
    donneur: 'barnabe',
    lieuDonneur: "au moulin, par le chemin à l'est du marché",
    prerequis: 'balance-capucine',
    recettes: ['axe'],
    etapes: [
      {
        type: 'ramasser',
        // Les pales arrachées par la dernière crue, le long du canal.
        objets: [
          { id: 'pale-1', lieu: 'moulin', x: -10, z: 4.5 },
          { id: 'pale-2', lieu: 'moulin', x: -2, z: 6.5 },
          { id: 'pale-3', lieu: 'moulin', x: 6, z: 3 },
        ],
        ramasse: 'Pale ramassée',
        objectif: 'Retrouve les pales de la roue, dans l\'herbe près du moulin',
      },
      {
        type: 'fabriquer',
        objet: 'axe',
        objectif: "Fabrique un axe en laiton à l'établi de l'atelier (1 cuivre, 2 bois).",
      },
      {
        type: 'utiliser',
        cible: 'mecanisme',
        objet: 'axe',
        objectif: "Installe l'axe et les pales sur le mécanisme de la roue, au bord du canal.",
      },
      {
        type: 'parler',
        pnj: 'barnabe',
        objectif: 'La roue tourne ! Retourne voir Barnabé, devant le moulin.',
      },
    ],
    recompense: 150,
    textes: {
      proposition: [
        "Bonjour ! Capucine m'a dit que vous répariez tout. Moi, c'est Barnabé.",
        "La crue a arraché trois pales de ma roue et tordu son axe. Sans roue, pas de farine, et sans farine, pas de pain à Cuivrebourg !",
        "Retrouvez les pales dans l'herbe, fabriquez un axe neuf et remontez le tout. Je vous donnerai 150 pièces.",
      ],
      enCours: ['Les pales, un axe en laiton, et le mécanisme près du canal. Vous allez y arriver !'],
      fin: [
        "Écoutez-moi ce bruit… la roue tourne ! Le moulin revit !",
        "Voici vos 150 pièces. Demain, tout Cuivrebourg aura du pain frais, grâce à vous.",
      ],
      apres: ["La roue tourne comme une horloge. Merci encore, Ferrus !"],
    },
  },
});

// -----------------------------------------------------------------------------
// 2. L'ÉTAT DES QUÊTES
// -----------------------------------------------------------------------------
// Pour chaque quête : son statut ('verrouillee', 'disponible', 'en_cours',
// 'terminee'), l'étape en cours, et les objets déjà ramassés.
export function creerEtatQuetes() {
  const etat = {};
  for (const [id, q] of Object.entries(QUETES)) {
    // Une quête sans prérequis (la première) est disponible tout de suite.
    etat[id] = { statut: q.prerequis ? 'verrouillee' : 'disponible', etape: 0, ramasses: [] };
  }
  return etat;
}

// Une quête est-elle terminée ?
export function queteTerminee(etat, id) {
  return etat.quetes[id] ? etat.quetes[id].statut === 'terminee' : false;
}

// Une quête verrouillée devient « disponible » quand son prérequis est fini.
// Renvoie les messages à afficher (« Nouvelle quête disponible »).
export function majDisponibilites(etat) {
  const messages = [];
  for (const [id, q] of Object.entries(QUETES)) {
    const s = etat.quetes[id];
    if (s.statut === 'verrouillee' && (!q.prerequis || queteTerminee(etat, q.prerequis))) {
      s.statut = 'disponible';
      messages.push(`Nouvelle quête : ${q.titre}`);
    }
  }
  return messages;
}

// La quête en cours (il n'y en a qu'une à la fois), ou null.
export function queteEnCours(etat) {
  const id = Object.keys(QUETES).find((q) => etat.quetes[q].statut === 'en_cours');
  return id ? { id, quete: QUETES[id], suivi: etat.quetes[id], etape: QUETES[id].etapes[etat.quetes[id].etape] } : null;
}

// La prochaine quête qu'on peut accepter, ou null.
export function queteDisponible(etat) {
  const id = Object.keys(QUETES).find((q) => etat.quetes[q].statut === 'disponible');
  return id ? { id, quete: QUETES[id] } : null;
}

// -----------------------------------------------------------------------------
// 3. FAIRE AVANCER LES QUÊTES
// -----------------------------------------------------------------------------

// Accepter une quête : elle passe « en cours » et ses recettes sont débloquées.
export function accepterQueteMoteur(etat, id) {
  const q = QUETES[id];
  const s = etat.quetes[id];
  if (!q || s.statut !== 'disponible' || queteEnCours(etat)) return [];
  s.statut = 'en_cours';
  s.etape = 0;
  for (const recette of q.recettes || []) {
    if (!etat.atelier.recettesQuete.includes(recette)) etat.atelier.recettesQuete.push(recette);
  }
  return [`Quête acceptée : ${q.titre}`, ...verifierQuetes(etat)];
}

// Passe à l'étape suivante (ou termine la quête).
function etapeSuivante(etat, id) {
  const q = QUETES[id];
  const s = etat.quetes[id];
  s.etape += 1;
  if (s.etape < q.etapes.length) return verifierQuetes(etat);
  // Quête terminée : récompense, et les recettes de quête redeviennent inaccessibles.
  s.statut = 'terminee';
  etat.argent += q.recompense;
  etat.atelier.recettesQuete = etat.atelier.recettesQuete.filter((r) => !(q.recettes || []).includes(r));
  const messages = [`+${q.recompense} pièces`, `Quête terminée : ${q.titre}`];
  // La lampe d'Odile : Odile va parler de l'atelier à tout le quartier, il ouvre ses portes.
  if (q.ouvreAtelier) messages.push(...ouvrirAtelier(etat));
  return [...messages, ...majDisponibilites(etat)];
}

// Vérifie les étapes qui se terminent toutes seules (par exemple « fabriquer » :
// dès que l'objet est dans le stock). À appeler après chaque changement.
export function verifierQuetes(etat) {
  const messages = majDisponibilites(etat);
  const enCours = queteEnCours(etat);
  if (!enCours) return messages;
  const { id, etape } = enCours;
  if (etape.type === 'fabriquer' && etat.atelier.stock[etape.objet] > 0) {
    messages.push(`Objet de quête prêt : ${RECETTES[etape.objet].nom}`);
    messages.push(...etapeSuivante(etat, id));
  }
  return messages;
}

// Les objets de quête à afficher dans un lieu (pas encore ramassés).
export function objetsARamasser(etat, lieu) {
  const enCours = queteEnCours(etat);
  if (!enCours || enCours.etape.type !== 'ramasser') return [];
  return enCours.etape.objets.filter((o) => o.lieu === lieu && !enCours.suivi.ramasses.includes(o.id));
}

// Ramasse les objets de quête tout proches de Ferrus.
export function ramasserObjetsQuete(etat, lieu, x, z) {
  const messages = [];
  const enCours = queteEnCours(etat);
  if (!enCours || enCours.etape.type !== 'ramasser') return messages;
  const total = enCours.etape.objets.length;
  for (const o of objetsARamasser(etat, lieu)) {
    if (Math.hypot(x - o.x, z - o.z) <= DISTANCE_RAMASSAGE_QUETE) {
      enCours.suivi.ramasses.push(o.id);
      messages.push(`${enCours.etape.ramasse} ${enCours.suivi.ramasses.length}/${total}`);
    }
  }
  if (enCours.suivi.ramasses.length >= total && messages.length > 0) {
    if (enCours.etape.messageFin) messages.push(enCours.etape.messageFin);
    messages.push(...etapeSuivante(etat, enCours.id));
  }
  return messages;
}

// Utiliser un objet du décor (par exemple le mécanisme de la roue).
// Renvoie null si ce n'est pas le moment (le jeu affiche alors un autre message).
export function utiliserObjetQuete(etat, cible) {
  const enCours = queteEnCours(etat);
  if (!enCours || enCours.etape.type !== 'utiliser' || enCours.etape.cible !== cible) return null;
  const { objet, messageFait } = enCours.etape;
  // Sans objet demandé (réparer la lampe à l'établi), l'action se fait tout de suite.
  if (!objet) return [messageFait, ...etapeSuivante(etat, enCours.id)];
  if (etat.atelier.stock[objet] < 1) return [`Il te faut d'abord ${RECETTES[objet].article}.`];
  etat.atelier.stock[objet] -= 1;
  return [messageFait || `${RECETTES[objet].nom} installé !`, ...etapeSuivante(etat, enCours.id)];
}

// -----------------------------------------------------------------------------
// 4. LES DIALOGUES DES PERSONNAGES DE QUÊTE
// -----------------------------------------------------------------------------
// Les actions des choix sont des textes du genre 'quete:accepter:roue-moulin'.

// Le dialogue d'un personnage, selon l'avancée de ses quêtes (null s'il n'a
// rien à dire de spécial : le jeu utilise alors ses répliques ordinaires).
export function dialoguePnjQuete(etat, pnj, nomPnj) {
  // 1. Une étape en cours concerne ce personnage ?
  const enCours = queteEnCours(etat);
  if (enCours) {
    const { id, quete, etape } = enCours;
    if (etape.type === 'livrer' && etape.pnj === pnj) {
      if (etat.atelier.stock[etape.objet] > 0) {
        return {
          orateur: nomPnj,
          repliques: quete.textes.livraison,
          choix: [{ texte: `Donner ${RECETTES[etape.objet].article}`, action: `quete:livrer:${id}` }],
        };
      }
    }
    if (etape.type === 'parler' && etape.pnj === pnj) {
      return { orateur: nomPnj, repliques: quete.textes.fin, choix: [{ texte: etape.choix || 'Avec plaisir !', action: `quete:parler:${id}` }] };
    }
    if (quete.donneur === pnj) {
      // Certaines étapes ont leurs propres répliques ({n} et {total} : les objets ramassés).
      const repliques = (etape.repliquesDonneur || quete.textes.enCours).map((r) => r
        .replace('{n}', String(enCours.suivi.ramasses.length))
        .replace('{total}', String(etape.objets ? etape.objets.length : 0)));
      return { orateur: nomPnj, repliques, choix: [{ texte: "Je m'en occupe", action: 'fermer' }] };
    }
  }
  // 2. Ce personnage a une quête à proposer ?
  const dispo = queteDisponible(etat);
  if (dispo && dispo.quete.donneur === pnj && !enCours) {
    return {
      orateur: nomPnj,
      repliques: dispo.quete.textes.proposition,
      choix: [
        { texte: "J'accepte !", action: `quete:accepter:${dispo.id}` },
        { texte: 'Plus tard', action: 'fermer' },
      ],
    };
  }
  // 3. Sa quête est finie : un petit mot de remerciement.
  const finie = Object.entries(QUETES).reverse().find(([id, q]) => q.donneur === pnj && etat.quetes[id].statut === 'terminee');
  if (finie) return { orateur: nomPnj, repliques: finie[1].textes.apres, choix: [{ texte: 'Au revoir', action: 'fermer' }] };
  return null;
}

// Applique une action de quête choisie dans un dialogue.
export function appliquerActionQuete(etat, action) {
  const [prefixe, type, id] = String(action).split(':');
  if (prefixe !== 'quete' || !QUETES[id]) return [];
  if (type === 'accepter') return accepterQueteMoteur(etat, id);
  const enCours = queteEnCours(etat);
  if (!enCours || enCours.id !== id) return [];
  if (type === 'livrer' && enCours.etape.type === 'livrer') {
    const objet = enCours.etape.objet;
    if (etat.atelier.stock[objet] < 1) return [];
    etat.atelier.stock[objet] -= 1;
    return etapeSuivante(etat, id);
  }
  if (type === 'parler' && enCours.etape.type === 'parler') return etapeSuivante(etat, id);
  return [];
}

// -----------------------------------------------------------------------------
// 5. CE QUE L'INTERFACE AFFICHE
// -----------------------------------------------------------------------------

// Le texte d'objectif de la quête en cours (ou de la quête à aller chercher).
// null s'il n'y a plus aucune quête à faire.
export function objectifQuetes(etat) {
  const enCours = queteEnCours(etat);
  if (enCours) {
    const { etape, suivi } = enCours;
    if (etape.type === 'ramasser') return `${etape.objectif} : ${suivi.ramasses.length}/${etape.objets.length}.`;
    if (etape.type === 'fabriquer' && etat.atelier.fabrication && etat.atelier.fabrication.recette === etape.objet) {
      return `Fabrication en cours : ${RECETTES[etape.objet].article}.`;
    }
    return etape.objectif;
  }
  const dispo = queteDisponible(etat);
  if (dispo) return dispo.quete.objectifDepart || `Nouvelle quête : va voir ${nomDonneur(dispo.quete.donneur)}, ${dispo.quete.lieuDonneur}.`;
  return null;
}

const NOMS = { odile: 'Odile', capucine: 'Capucine', barnabe: 'Barnabé' };
function nomDonneur(pnj) {
  return NOMS[pnj] || pnj;
}

// Les marqueurs des quêtes : la liste des personnages ou objets au-dessus
// desquels afficher un losange.
export function marqueursQuetes(etat) {
  const liste = new Set();
  const enCours = queteEnCours(etat);
  if (enCours) {
    const { etape } = enCours;
    if (etape.type === 'fabriquer' && !(etat.atelier.fabrication && etat.atelier.fabrication.recette === etape.objet)) liste.add('etabli');
    if (etape.type === 'livrer' && etat.atelier.stock[etape.objet] > 0) liste.add(etape.pnj);
    if (etape.type === 'utiliser' && (!etape.objet || etat.atelier.stock[etape.objet] > 0)) liste.add(etape.cible);
    if (etape.type === 'parler') liste.add(etape.pnj);
  } else {
    const dispo = queteDisponible(etat);
    if (dispo) liste.add(dispo.quete.donneur);
  }
  return liste;
}
