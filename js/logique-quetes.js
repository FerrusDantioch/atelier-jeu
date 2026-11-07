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
//   - 'parler'    : simplement parler à un personnage (version 1.6 : l'étape
//                   peut avoir ses propres répliques, quand un AUTRE habitant
//                   que le donneur apporte son aide au grand projet).
//
// Les quêtes s'enchaînent : chacune a pour prérequis la précédente
// (la lampe → la balance → la roue → l'horloge de la gare → le premier train
// → le wagonnet de la mine → le télescope d'Anatole → les cinq étapes du
// dirigeable, version 1.6). La toute
// première (la lampe d'Odile) n'a pas de prérequis : elle est disponible dès
// le début de la partie, et la terminer ouvre l'atelier.
//
// Pour ajouter une quête plus tard : ajouter une entrée dans QUETES, avec ses
// textes. Le reste (objectifs, marqueurs, dialogues) suit automatiquement.
// =============================================================================

import { RECETTES, AMELIORATIONS, ouvrirAtelier } from './logique-atelier.js';
import { recevoirTenue } from './logique-garderobe.js';

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
        "Et j'ai ouvert la barrière de la route de la gare, à l'est. Augustin, le chef de gare, cherche quelqu'un d'habile.",
      ],
      apres: ["La roue tourne comme une horloge. Mais celle de la gare, elle, ne tourne plus… Allez voir Augustin, à l'est !"],
    },
  },

  // --- Version 1.2 : la gare à vapeur ---------------------------------------------
  'horloge-gare': {
    titre: "L'horloge de la gare",
    donneur: 'augustin',
    lieuDonneur: "à la gare, par la route à l'est du moulin",
    prerequis: 'roue-moulin',
    recettes: ['regulateur'],
    etapes: [
      {
        type: 'ramasser',
        // Les rouages de l'horloge, que des enfants ont semés en jouant.
        objets: [
          { id: 'rouage-1', lieu: 'gare', x: -8.5, z: 4.2 },
          { id: 'rouage-2', lieu: 'gare', x: 2.5, z: 5 },
          { id: 'rouage-3', lieu: 'gare', x: 11, z: -0.8 },
        ],
        ramasse: 'Rouage ramassé',
        messageFin: "Tous les rouages ! Il manque encore un régulateur neuf.",
        objectif: "Retrouve les rouages de l'horloge, autour de la gare",
      },
      {
        type: 'fabriquer',
        objet: 'regulateur',
        objectif: "Fabrique un régulateur d'horloge à l'établi de l'atelier (1 cuivre, 2 ressorts).",
      },
      {
        type: 'utiliser',
        cible: 'horloge',
        objet: 'regulateur',
        messageFait: "L'horloge de la gare repart !",
        objectif: "Installe le régulateur et les rouages dans la grande horloge, sur le quai de la gare.",
      },
      {
        type: 'parler',
        pnj: 'augustin',
        objectif: "L'horloge tourne ! Retourne voir Augustin, sur le quai.",
      },
    ],
    recompense: 170,
    textes: {
      proposition: [
        "Bonjour ! Augustin, chef de gare. Barnabé m'a dit que vous étiez l'artisan qui répare tout.",
        "Notre grande horloge s'est arrêtée. Sans l'heure, impossible de faire partir un train !",
        'Ses trois rouages sont tombés, et des enfants les ont emportés pour jouer : ils sont quelque part autour de la gare.',
        'Il lui faudra aussi un régulateur neuf. Je vous paierai 170 pièces.',
      ],
      enCours: ['Trois rouages, un régulateur neuf, et notre horloge repartira. Je compte sur vous !'],
      fin: [
        "Tic, tac… Elle repart ! Et elle donne l'heure juste.",
        "Voici vos 170 pièces. Maintenant, il ne manque plus qu'une chose pour que le train reparte…",
      ],
      apres: ['Notre horloge est la plus précise de la région. Merci, Ferrus !'],
    },
  },

  'train-cuivrebourg': {
    titre: 'Le premier train',
    donneur: 'augustin',
    lieuDonneur: 'à la gare, sur le quai',
    prerequis: 'horloge-gare',
    recettes: ['sifflet'],
    etapes: [
      {
        type: 'fabriquer',
        objet: 'sifflet',
        objectif: "Fabrique un sifflet à vapeur à l'établi de l'atelier (2 cuivres, 1 bois).",
      },
      {
        type: 'utiliser',
        cible: 'locomotive',
        objet: 'sifflet',
        messageFait: 'Le sifflet est installé : la locomotive chauffe !',
        objectif: 'Installe le sifflet à vapeur sur la locomotive, à la gare.',
      },
      {
        type: 'parler',
        pnj: 'augustin',
        choix: 'En voiture !',
        objectif: 'La locomotive est prête ! Va prévenir Augustin, sur le quai.',
      },
    ],
    recompense: 200,
    textes: {
      proposition: [
        'La locomotive est en bon état, mais son sifflet a rouillé.',
        "Sans sifflet, pas de départ : c'est le règlement ! Pourriez-vous en fabriquer un neuf ?",
        'Si le train repart, Cuivrebourg sera de nouveau reliée au monde. Je vous offrirai 200 pièces.',
      ],
      enCours: ["Un sifflet à vapeur, bien sonore mais pas trop. Je l'attends avec impatience !"],
      fin: [
        'Écoutez… Tchou-tchou ! Le premier train de Cuivrebourg depuis des années !',
        "Voici vos 200 pièces. Le train passera maintenant régulièrement, à l'heure de notre horloge.",
        "Et vous pouvez monter dedans ! Il va jusqu'à la mine de cuivre, dans les collines. Sidonie, la mineuse, y a bien des soucis…",
      ],
      apres: ["Le train passe à l'heure, grâce à votre horloge et à votre sifflet. Montez quand il est à quai : il va jusqu'à la mine !"],
    },
  },

  // --- Version 1.3 : la mine de cuivre (on y va en train) -----------------------------
  'wagonnet-mine': {
    titre: 'Le wagonnet de la mine',
    donneur: 'sidonie',
    lieuDonneur: 'à la mine de cuivre, en prenant le train à la gare',
    prerequis: 'train-cuivrebourg',
    recettes: ['roue-wagonnet'],
    // En cadeau, à la fin : les plans de l'automate de cuivre.
    donneAmelioration: 'plans-automate',
    etapes: [
      {
        type: 'ramasser',
        // Les pépites tombées du wagonnet quand il a déraillé.
        objets: [
          { id: 'pepite-1', lieu: 'mine', x: -7, z: 3.5 },
          { id: 'pepite-2', lieu: 'mine', x: 2, z: 5.2 },
          { id: 'pepite-3', lieu: 'mine', x: 11, z: 4.4 },
        ],
        ramasse: 'Pépite ramassée',
        messageFin: 'Toutes les pépites ! Il faut maintenant une roue neuve pour le wagonnet.',
        objectif: 'Ramasse les pépites de cuivre tombées du wagonnet',
      },
      {
        type: 'fabriquer',
        objet: 'roue-wagonnet',
        objectif: "Fabrique une roue de wagonnet à l'établi de l'atelier (1 cuivre, 1 bois, 1 ressort).",
      },
      {
        type: 'utiliser',
        cible: 'wagonnet',
        objet: 'roue-wagonnet',
        messageFait: 'La roue est posée : le wagonnet est remis sur ses rails !',
        objectif: "Pose la roue neuve sur le wagonnet, devant l'entrée de la mine.",
      },
      {
        type: 'parler',
        pnj: 'sidonie',
        objectif: 'Le wagonnet roule ! Retourne voir Sidonie.',
      },
    ],
    recompense: 180,
    textes: {
      proposition: [
        "Un visiteur ! Bonjour, je suis Sidonie, la mineuse. C'est ici qu'on trouve le cuivre de Cuivrebourg.",
        "Hier, mon wagonnet a déraillé : il a perdu une roue, et ses pépites ont roulé partout.",
        "Pourriez-vous ramasser les pépites et fabriquer une roue neuve ? Je vous donnerai 180 pièces… et une petite surprise.",
      ],
      enCours: ['Les pépites, une roue neuve, et mon wagonnet repartira. Merci !'],
      fin: [
        'Il roule comme au premier jour ! Le cuivre va de nouveau descendre jusqu\'à Cuivrebourg.',
        "Voici vos 180 pièces. Et la surprise : les plans d'un automate de cuivre, dessinés par mon grand-père.",
        "Avec eux, votre atelier pourra fabriquer de vrais petits automates. Les gens vont adorer !",
      ],
      apres: [
        'Le cuivre descend en ville tous les jours, grâce à vous. Revenez quand vous voulez !',
        "Et maintenant que le wagonnet roule, la galerie est rouverte : descendez par l'entrée de la mine. Les filons de cuivre sont à vous, servez-vous !",
      ],
    },
  },

  // --- Version 1.6 : la forêt de l'inventeur ------------------------------------------
  'telescope-anatole': {
    titre: "Le télescope d'Anatole",
    donneur: 'anatole',
    lieuDonneur: "dans la forêt, à l'est de la place",
    prerequis: 'wagonnet-mine',
    recettes: ['monture-lentille'],
    etapes: [
      {
        type: 'ramasser',
        // Les vis dorées du télescope, que l'écureuil de la forêt a emportées.
        objets: [
          { id: 'vis-1', lieu: 'foret', x: -9.6, z: 5.6 },
          { id: 'vis-2', lieu: 'foret', x: 0.4, z: 6.4 },
          { id: 'vis-3', lieu: 'foret', x: 10.4, z: 1.2 },
        ],
        ramasse: 'Vis dorée ramassée',
        messageFin: 'Toutes les vis ! Il faut encore une monture neuve pour la lentille.',
        objectif: 'Retrouve les vis dorées du télescope, dans la forêt',
      },
      {
        type: 'fabriquer',
        objet: 'monture-lentille',
        objectif: "Fabrique une monture de lentille à l'établi de l'atelier (2 cuivres, 1 ressort).",
      },
      {
        type: 'utiliser',
        cible: 'telescope',
        objet: 'monture-lentille',
        messageFait: 'La lentille est en place : le télescope est réparé !',
        objectif: "Installe la monture et les vis sur le télescope, à côté de la cabane d'Anatole.",
      },
      {
        type: 'parler',
        pnj: 'anatole',
        objectif: 'Le télescope est réparé ! Retourne voir Anatole.',
      },
    ],
    recompense: 200,
    textes: {
      proposition: [
        'Oh ! Un visiteur ! Bonjour, je suis Anatole, inventeur de mon état.',
        "Mon grand télescope ne marche plus : l'écureuil de la forêt a emporté ses trois vis dorées, et la lentille s'est décrochée.",
        "Retrouvez les vis dans la forêt et fabriquez-moi une monture neuve : je vous paierai 200 pièces. Et je vous montrerai les étoiles !",
      ],
      enCours: ['Trois vis dorées, une monture de lentille, et mon télescope verra de nouveau les étoiles !'],
      fin: [
        'Regardez ! On voit les cratères de la lune comme si on y était !',
        'Voici vos 200 pièces. Revenez la nuit : avec ce télescope, on découvre une constellation chaque soir.',
        "Et j'ai un vieux rêve, un très grand projet… Revenez me voir, je vous en parlerai !",
      ],
      apres: ["Revenez la nuit observer le ciel avec le télescope. Chaque saison a ses constellations !"],
    },
  },

  // --- Version 1.6 : le grand projet, le dirigeable (cinq étapes) -------------------
  // À chaque étape, un habitant aidé apporte sa pièce ; Ferrus fabrique le
  // reste à l'établi, puis l'apporte à Anatole.
  'dirigeable-nacelle': {
    titre: 'Le dirigeable (1/5) : la nacelle',
    donneur: 'anatole',
    lieuDonneur: "dans la forêt, à l'est de la place",
    prerequis: 'telescope-anatole',
    recettes: ['nacelle'],
    etapes: [
      {
        type: 'parler',
        pnj: 'barnabe',
        repliques: [
          'Anatole veut construire un dirigeable ? Quelle aventure !',
          "Tenez : de l'osier du bord du canal, bien souple. Il n'y a rien de mieux pour tresser une nacelle.",
        ],
        choix: 'Merci, Barnabé !',
        messageFait: "Barnabé vous donne de l'osier tressé.",
        objectif: "Va voir Barnabé, au moulin : il a de l'osier pour la nacelle.",
      },
      {
        type: 'fabriquer',
        objet: 'nacelle',
        objectif: "Fabrique l'armature de la nacelle à l'établi (1 cuivre, 3 bois).",
      },
      {
        type: 'livrer',
        pnj: 'anatole',
        objet: 'nacelle',
        objectif: "Apporte l'armature de la nacelle à Anatole, dans la forêt.",
      },
    ],
    recompense: 100,
    textes: {
      proposition: [
        'Mon grand rêve, Ferrus, c\'est de voler au-dessus de Cuivrebourg… dans un dirigeable !',
        "J'en ai tous les plans. Mais il faudra l'aide de tout le village : chacun a quelque chose à nous apporter.",
        "Commençons par la nacelle, la cabine où l'on monte. Barnabé, au moulin, a de l'osier. Je vous paierai à chaque étape !",
      ],
      enCours: ["L'osier de Barnabé et une bonne armature : voilà une nacelle !"],
      livraison: ['Magnifique ! La nacelle est solide et légère à la fois.', 'Voici 100 pièces. Prochaine étape : l\'enveloppe, le grand ballon. Revenez me voir !'],
      apres: ['La nacelle est prête. Le dirigeable prend forme !'],
    },
  },

  'dirigeable-enveloppe': {
    titre: "Le dirigeable (2/5) : l'enveloppe",
    donneur: 'anatole',
    lieuDonneur: "dans la forêt, à l'est de la place",
    prerequis: 'dirigeable-nacelle',
    recettes: ['anneaux'],
    etapes: [
      {
        type: 'parler',
        pnj: 'capucine',
        repliques: [
          "Un dirigeable ! Il faudra une toile immense… J'ai justement un grand rouleau de toile cirée.",
          "Prenez-le : c'est mon cadeau pour le village !",
        ],
        choix: 'Merci, Capucine !',
        messageFait: 'Capucine vous donne un grand rouleau de toile.',
        objectif: "Va voir Capucine, au marché : elle a de la toile pour l'enveloppe.",
      },
      {
        type: 'parler',
        pnj: 'gaston',
        repliques: [
          "Des cordages pour un ballon ? J'ai les meilleurs nœuds de marin de toute la région.",
          'Voilà de la bonne corde. Elle ne cassera jamais, foi de pêcheur !',
        ],
        choix: 'Merci, Gaston !',
        messageFait: 'Gaston vous donne de solides cordages de marin.',
        objectif: "Va voir Gaston, au lac : il a des cordages pour l'enveloppe.",
      },
      {
        type: 'fabriquer',
        objet: 'anneaux',
        objectif: "Fabrique des anneaux d'amarrage à l'établi (1 cuivre, 2 ressorts).",
      },
      {
        type: 'livrer',
        pnj: 'anatole',
        objet: 'anneaux',
        objectif: "Apporte les anneaux d'amarrage à Anatole, dans la forêt.",
      },
    ],
    recompense: 100,
    textes: {
      proposition: [
        "La nacelle est prête ! Maintenant, l'enveloppe : le grand ballon qui flotte dans le ciel.",
        'Il faut de la toile, et des cordages pour l\'attacher. Capucine et Gaston pourront nous aider.',
        'Et des anneaux de cuivre pour que tout tienne ensemble. 100 pièces, comme promis !',
      ],
      enCours: ['De la toile, des cordages et des anneaux de cuivre !'],
      livraison: ["L'enveloppe est cousue et gonflée ! Regardez-la flotter…", 'Voici 100 pièces. Il faut maintenant de quoi avancer : une chaudière !'],
      apres: ["L'enveloppe flotte au-dessus de la forêt. Quel spectacle !"],
    },
  },

  'dirigeable-chaudiere': {
    titre: 'Le dirigeable (3/5) : la chaudière',
    donneur: 'anatole',
    lieuDonneur: "dans la forêt, à l'est de la place",
    prerequis: 'dirigeable-enveloppe',
    recettes: ['chaudiere'],
    etapes: [
      {
        type: 'parler',
        pnj: 'sidonie',
        repliques: [
          'Une chaudière pour un dirigeable ? Il faudra du cuivre très fin, pour qu\'elle soit légère.',
          "J'en ai trouvé un filon spécial, tout au fond de la galerie. Le voici !",
        ],
        choix: 'Merci, Sidonie !',
        messageFait: 'Sidonie vous donne des feuilles de cuivre très fin.',
        objectif: 'Va voir Sidonie, à la mine : elle a du cuivre fin pour la chaudière.',
      },
      {
        type: 'fabriquer',
        objet: 'chaudiere',
        objectif: "Fabrique une petite chaudière à l'établi (3 cuivres, 1 bois).",
      },
      {
        type: 'livrer',
        pnj: 'anatole',
        objet: 'chaudiere',
        objectif: 'Apporte la petite chaudière à Anatole, dans la forêt.',
      },
    ],
    recompense: 120,
    textes: {
      proposition: [
        "Une enveloppe, c'est bien. Mais pour avancer, il faut de la vapeur !",
        'Une petite chaudière, légère comme une plume. Sidonie, à la mine, a sûrement le cuivre qu\'il faut.',
        'Cette étape-là vaut bien 120 pièces.',
      ],
      enCours: ['Du cuivre très fin, et une chaudière légère comme une plume !'],
      livraison: ['Elle chauffe à merveille, et elle ne pèse presque rien !', "Voici 120 pièces. Il manque encore l'hélice…"],
      apres: ['La chaudière ronronne doucement. Le dirigeable est presque prêt !'],
    },
  },

  'dirigeable-helice': {
    titre: "Le dirigeable (4/5) : l'hélice",
    donneur: 'anatole',
    lieuDonneur: "dans la forêt, à l'est de la place",
    prerequis: 'dirigeable-chaudiere',
    recettes: ['helice'],
    etapes: [
      {
        type: 'parler',
        pnj: 'augustin',
        repliques: [
          "Une hélice ? Les locomotives n'en ont pas, mais je connais bien les engrenages qui font tourner les roues.",
          "Tenez, j'ai dessiné le meilleur réglage possible. Avec ça, elle tournera rond !",
        ],
        choix: 'Merci, Augustin !',
        messageFait: "Augustin vous donne ses dessins d'hélice.",
        objectif: "Va voir Augustin, à la gare : il a des dessins pour l'hélice.",
      },
      {
        type: 'fabriquer',
        objet: 'helice',
        objectif: "Fabrique une hélice de cuivre à l'établi (2 cuivres, 1 bois, 1 ressort).",
      },
      {
        type: 'livrer',
        pnj: 'anatole',
        objet: 'helice',
        objectif: "Apporte l'hélice de cuivre à Anatole, dans la forêt.",
      },
    ],
    recompense: 120,
    textes: {
      proposition: [
        'La chaudière est installée. Maintenant, il faut une hélice pour pousser le dirigeable !',
        "Augustin, le chef de gare, s'y connaît en mécanique. Demandez-lui conseil.",
        '120 pièces pour cette étape !',
      ],
      enCours: ["Les dessins d'Augustin, et une belle hélice de cuivre !"],
      livraison: ['Elle tourne ! Le dirigeable avance tout seul sous la brise.', 'Voici 120 pièces. Il ne manque plus que les instruments de bord… et un drapeau !'],
      apres: ["L'hélice tourne. Encore une étape, et nous volerons !"],
    },
  },

  'dirigeable-envol': {
    titre: 'Le dirigeable (5/5) : le grand envol',
    donneur: 'anatole',
    lieuDonneur: "dans la forêt, à l'est de la place",
    prerequis: 'dirigeable-helice',
    recettes: ['tableau-bord'],
    // En cadeau, à la fin : la casquette d'aviateur (pour la garde-robe).
    donneTenue: 'casquette-aviateur',
    etapes: [
      {
        type: 'parler',
        pnj: 'leon',
        repliques: [
          "Une boussole pour le dirigeable ? Prenez la mienne : elle m'a guidé sur toutes les routes de la région.",
          'Comme ça, vous ne vous perdrez jamais !',
        ],
        choix: 'Merci, Léon !',
        messageFait: 'Léon vous donne sa vieille boussole de facteur.',
        objectif: 'Va voir Léon, au marché : il a une boussole pour le dirigeable.',
      },
      {
        type: 'parler',
        pnj: 'odile',
        repliques: [
          'Le dirigeable est presque prêt ? Alors il lui faut un drapeau !',
          "Je l'ai cousu moi-même : un engrenage de cuivre sur fond crème. Les couleurs de Cuivrebourg !",
        ],
        choix: 'Merci, Odile !',
        messageFait: 'Odile vous donne le drapeau de Cuivrebourg.',
        objectif: 'Va voir Odile, sur la place : elle a cousu un drapeau pour le dirigeable.',
      },
      {
        type: 'fabriquer',
        objet: 'tableau-bord',
        objectif: "Fabrique le tableau de bord à l'établi (1 cuivre, 1 bois, 2 ressorts).",
      },
      {
        type: 'livrer',
        pnj: 'anatole',
        objet: 'tableau-bord',
        objectif: 'Apporte le tableau de bord à Anatole : le dirigeable va s\'envoler !',
      },
    ],
    recompense: 250,
    textes: {
      proposition: [
        'Dernière étape, mon ami ! Les instruments de bord : une boussole et un tableau de bord.',
        'Et un drapeau, pour que tout le monde nous reconnaisse dans le ciel.',
        'Léon et Odile vont nous aider. Pour le grand envol : 250 pièces… et une surprise !',
      ],
      enCours: ['La boussole de Léon, le drapeau d\'Odile, et un beau tableau de bord !'],
      livraison: [
        'Le tableau de bord est en place, la boussole indique le nord, et le drapeau flotte au vent…',
        'Le dirigeable est prêt ! Il s\'appellera « Le Cuivrebourg ».',
        "Voici 250 pièces, et ma casquette d'aviateur. Maintenant, il vous emmène où vous voulez : touchez le bouton du dirigeable, en haut de l'écran (ou la touche V) !",
      ],
      apres: ["Le dirigeable vous attend ! Touchez son bouton en haut de l'écran (ou la touche V) pour voyager au-dessus du village."],
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
  // Une quête peut offrir une amélioration (les plans d'automate de Sidonie).
  if (q.donneAmelioration && !etat.atelier.ameliorations.includes(q.donneAmelioration)) {
    etat.atelier.ameliorations.push(q.donneAmelioration);
    messages.push(`Cadeau : ${AMELIORATIONS[q.donneAmelioration].nom}`);
  }
  // Version 1.6 : une quête peut offrir une tenue (la casquette d'aviateur).
  if (q.donneTenue) messages.push(...recevoirTenue(etat, q.donneTenue));
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
          repliques: etape.repliques || quete.textes.livraison,
          choix: [{ texte: `Donner ${RECETTES[etape.objet].article}`, action: `quete:livrer:${id}` }],
        };
      }
    }
    if (etape.type === 'parler' && etape.pnj === pnj) {
      return { orateur: nomPnj, repliques: etape.repliques || quete.textes.fin, choix: [{ texte: etape.choix || 'Avec plaisir !', action: `quete:parler:${id}` }] };
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

// Version 1.6 : seulement quand une étape en cours concerne ce personnage
// (lui livrer un objet, ou lui parler). Pour les habitants qui ont leurs
// propres dialogues (Odile, Léon, Gaston…) mais qui aident au grand projet.
export function dialogueEtapeQuete(etat, pnj, nomPnj) {
  const enCours = queteEnCours(etat);
  if (!enCours || enCours.etape.pnj !== pnj) return null;
  const { type, objet } = enCours.etape;
  if (type === 'parler' || (type === 'livrer' && etat.atelier.stock[objet] > 0)) return dialoguePnjQuete(etat, pnj, nomPnj);
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
  if (type === 'parler' && enCours.etape.type === 'parler') {
    const fait = enCours.etape.messageFait;
    return [...(fait ? [fait] : []), ...etapeSuivante(etat, id)];
  }
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

const NOMS = { odile: 'Odile', capucine: 'Capucine', barnabe: 'Barnabé', augustin: 'Augustin', sidonie: 'Sidonie', anatole: 'Anatole', leon: 'Léon', gaston: 'Gaston' };
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
