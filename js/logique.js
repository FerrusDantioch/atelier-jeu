// =============================================================================
// logique.js — LES RÈGLES DU JEU (aucune 3D ici)
// -----------------------------------------------------------------------------
// Ce fichier décrit :
//   1. le plan de la place (où sont les bâtiments, les arbres, les haies…) ;
//   2. les collisions (Ferrus ne doit pas traverser les obstacles) ;
//   3. l'état d'une partie, et ce que l'interface affiche (objectif, marqueurs,
//      dialogue d'Odile…).
// La quête « La lampe d'Odile » elle-même est décrite avec les autres quêtes,
// dans logique-quetes.js (un seul système de quêtes pour tout le jeu).
//
// Il n'utilise PAS Three.js : il ne fait que des calculs. C'est pour ça qu'on
// peut le tester tout seul avec « node --test » (voir le dossier tests/).
// L'affichage 3D (main.js) lit ces informations et dessine la scène.
//
// Les positions sont en « mètres » sur le sol :
//   - x : de la gauche (négatif) vers la droite (positif) ;
//   - z : du haut de l'écran / le nord (négatif) vers le bas / le sud (positif).
// =============================================================================

import {
  creerEtatAtelier,
  objectifAtelier,
  marqueursAtelier,
  clientAuComptoir,
  servirClient,
} from './logique-atelier.js';
import {
  QUETES,
  creerEtatQuetes,
  objectifQuetes,
  marqueursQuetes,
  queteTerminee,
  queteEnCours,
  dialoguePnjQuete,
  appliquerActionQuete,
  utiliserObjetQuete,
} from './logique-quetes.js';

// -----------------------------------------------------------------------------
// 1. LE PLAN DE LA PLACE
// -----------------------------------------------------------------------------

// Les grands moments de la quête « La lampe d'Odile », dans l'ordre. Ils sont
// calculés à partir du moteur de quêtes (voir etapeLampe plus bas) : ils
// servent à l'affichage (la lampe sur l'établi, la lanterne d'Odile…).
export const ETAPES = Object.freeze({
  PAS_COMMENCEE: 'pas_commencee',         // On n'a pas encore parlé à Odile.
  ACCEPTEE: 'acceptee',                   // Quête acceptée : on cherche les engrenages.
  ENGRENAGES_REUNIS: 'engrenages_reunis', // Les 3 engrenages sont ramassés.
  LAMPE_REPAREE: 'lampe_reparee',         // La lampe est réparée à l'établi.
  TERMINEE: 'terminee',                   // La lampe est livrée, Odile a payé.
});

// La récompense de la quête, en pièces.
export const RECOMPENSE_LAMPE = QUETES['lampe-odile'].recompense;

// L'argent de départ de Ferrus (l'atelier est en difficulté…).
export const ARGENT_DEPART = 20;

// Tout ce qui se trouve sur la place.
// Les obstacles « rectangle » ont un centre (x, z), une largeur (sur x) et une
// profondeur (sur z). Les obstacles « cercle » ont un centre et un rayon.
export const MONDE = Object.freeze({
  // Le terrain jouable (à l'intérieur des haies).
  limites: { minX: -18, maxX: 18, minZ: -13, maxZ: 12 },

  // Ferrus : point de départ (devant la porte de l'atelier), taille, vitesse.
  joueur: { x: -7, z: -4.5, rayon: 0.45, vitesse: 4.5 },

  // Les deux bâtiments, collés contre la haie du nord.
  atelier: { id: 'atelier', x: -7, z: -10, largeur: 8, profondeur: 6 },
  maisonOdile: { id: 'maison-odile', x: 8, z: -10.25, largeur: 6.5, profondeur: 5.5 },

  // L'établi, contre la façade de l'atelier, à droite de la porte.
  etabli: { id: 'etabli', x: -4.6, z: -6.5, largeur: 2.4, profondeur: 1, distanceInteraction: 2.3 },

  // Le comptoir où les clients passent commande (étape 2), à gauche de la porte.
  comptoir: { id: 'comptoir', x: -9.6, z: -6.3, largeur: 2, profondeur: 0.8, distanceInteraction: 2.4 },

  // Le trajet des clients : ils entrent par le portail du sud, passent par ces
  // points, puis font la queue devant le comptoir (le premier est servi).
  clients: {
    entree: { x: 0, z: 11.2 },
    chemin: [{ x: -3, z: 7 }, { x: -8.2, z: -1.2 }],
    file: [{ x: -9.6, z: -4.95 }, { x: -10.3, z: -3.6 }, { x: -11, z: -2.25 }],
  },

  // Odile attend devant sa maison, un peu à gauche de sa porte.
  odile: { id: 'odile', x: 6.2, z: -5.8, rayon: 0.5, distanceInteraction: 2.2 },

  // Le puits au centre de la place.
  puits: { id: 'puits', x: 0, z: 0.5, rayon: 1.3 },

  // Les arbres (le tronc et le feuillage comptent comme un cercle).
  arbres: [
    { x: -15, z: -4 },
    { x: -14.5, z: 4 },
    { x: -11, z: 9 },
    { x: -6, z: 10 },
    { x: 5, z: 10 },
    { x: 11, z: 8.5 },
    { x: 15, z: 5 },
    { x: 15.5, z: -3 },
    { x: 0.8, z: -11 },
    { x: -15, z: -10.5 },
    { x: 14.8, z: -11 },
  ],
  rayonArbre: 0.65,

  // Les haies qui ferment la place (une bande de 1 m d'épaisseur tout autour).
  // Au sud, un portail en bois fermé : il mènera vers d'autres lieux plus tard.
  haies: [
    { id: 'haie-nord', x: 0, z: -13.5, largeur: 38, profondeur: 1 },
    { id: 'haie-sud-gauche', x: -10.25, z: 12.5, largeur: 17.5, profondeur: 1 },
    { id: 'haie-sud-droite', x: 10.25, z: 12.5, largeur: 17.5, profondeur: 1 },
    { id: 'haie-ouest', x: -18.5, z: -0.5, largeur: 1, profondeur: 27 },
    { id: 'haie-est', x: 18.5, z: -0.5, largeur: 1, profondeur: 27 },
  ],
  portail: { id: 'portail', x: 0, z: 12.5, largeur: 3, profondeur: 0.6 },

  // Les 3 engrenages perdus par Odile (invisibles tant que la quête n'est pas
  // acceptée). Ils sont décrits dans la quête elle-même (logique-quetes.js).
  engrenages: QUETES['lampe-odile'].etapes[0].objets,
});

// Rassemble tous les obstacles dans une seule liste, pour les collisions.
export function obstaclesDuMonde(monde = MONDE) {
  const rect = (o) => ({ type: 'rectangle', id: o.id, x: o.x, z: o.z, largeur: o.largeur, profondeur: o.profondeur });
  const liste = [
    rect(monde.atelier),
    rect(monde.maisonOdile),
    rect(monde.etabli),
    rect(monde.comptoir),
    rect(monde.portail),
    ...monde.haies.map(rect),
    { type: 'cercle', id: monde.puits.id, x: monde.puits.x, z: monde.puits.z, rayon: monde.puits.rayon },
    { type: 'cercle', id: monde.odile.id, x: monde.odile.x, z: monde.odile.z, rayon: monde.odile.rayon },
    ...monde.arbres.map((a, i) => ({ type: 'cercle', id: `arbre-${i + 1}`, x: a.x, z: a.z, rayon: monde.rayonArbre })),
  ];
  return liste;
}

// -----------------------------------------------------------------------------
// 2. LES DÉPLACEMENTS ET LES COLLISIONS
// -----------------------------------------------------------------------------

// Garde une valeur entre un minimum et un maximum.
function borner(valeur, min, max) {
  return Math.max(min, Math.min(max, valeur));
}

// Transforme la direction demandée (clavier ou joystick) en un petit pas.
// - entreeX, entreeZ : direction, chacune entre -1 et 1 ;
// - vitesse : en mètres par seconde ;
// - dt : temps écoulé depuis l'image précédente, en secondes.
// En diagonale, on ne va pas plus vite qu'en ligne droite (on « normalise »).
export function calculerPas(entreeX, entreeZ, vitesse, dt) {
  let longueur = Math.hypot(entreeX, entreeZ);
  if (longueur < 0.0001) return { dx: 0, dz: 0 };
  // Avec le joystick, on peut aller doucement (longueur < 1). Jamais plus que 1.
  const facteur = longueur > 1 ? 1 / longueur : 1;
  return { dx: entreeX * facteur * vitesse * dt, dz: entreeZ * facteur * vitesse * dt };
}

// Repousse un cercle (Ferrus) hors de tous les obstacles qu'il touche.
// Résultat : la position corrigée. Cette méthode permet de « glisser » le long
// d'un mur au lieu de rester bloqué net.
export function resoudreCollisions(x, z, rayon, obstacles) {
  // On répète plusieurs fois : sortir d'un obstacle peut en faire toucher un
  // autre (dans un coin étroit, par exemple entre un mur et un personnage).
  for (let passe = 0; passe < 12; passe++) {
    let corrige = false;

    for (const o of obstacles) {
      if (o.type === 'cercle') {
        const ecartX = x - o.x;
        const ecartZ = z - o.z;
        const distance = Math.hypot(ecartX, ecartZ);
        const distanceMin = rayon + o.rayon;
        if (distance < distanceMin) {
          // Cas très rare : pile au centre. On choisit une direction au hasard fixe.
          const dirX = distance > 1e-6 ? ecartX / distance : 1;
          const dirZ = distance > 1e-6 ? ecartZ / distance : 0;
          x = o.x + dirX * distanceMin;
          z = o.z + dirZ * distanceMin;
          corrige = true;
        }
      } else {
        // Rectangle : on cherche le point du rectangle le plus proche de Ferrus.
        const demiL = o.largeur / 2;
        const demiP = o.profondeur / 2;
        const procheX = borner(x, o.x - demiL, o.x + demiL);
        const procheZ = borner(z, o.z - demiP, o.z + demiP);
        const ecartX = x - procheX;
        const ecartZ = z - procheZ;
        const distance = Math.hypot(ecartX, ecartZ);

        if (distance > 1e-6 && distance < rayon) {
          // Ferrus touche le bord : on le pousse juste assez pour qu'il ne touche plus.
          x = procheX + (ecartX / distance) * rayon;
          z = procheZ + (ecartZ / distance) * rayon;
          corrige = true;
        } else if (distance <= 1e-6) {
          // Le centre de Ferrus est DANS le rectangle : on le fait sortir par le
          // côté le plus proche.
          const versGauche = x - (o.x - demiL);
          const versDroite = (o.x + demiL) - x;
          const versHaut = z - (o.z - demiP);
          const versBas = (o.z + demiP) - z;
          const plusPetit = Math.min(versGauche, versDroite, versHaut, versBas);
          if (plusPetit === versGauche) x = o.x - demiL - rayon;
          else if (plusPetit === versDroite) x = o.x + demiL + rayon;
          else if (plusPetit === versHaut) z = o.z - demiP - rayon;
          else z = o.z + demiP + rayon;
          corrige = true;
        }
      }
    }

    if (!corrige) break;
  }
  return { x, z };
}

// Déplace Ferrus d'un pas, en tenant compte des obstacles et des limites.
export function deplacerJoueur(position, dx, dz, obstacles, monde = MONDE) {
  const rayon = monde.joueur.rayon;
  // Le pas est découpé en petits morceaux pour ne jamais « sauter » par-dessus
  // un obstacle fin, même si l'image a mis longtemps à s'afficher.
  const longueur = Math.hypot(dx, dz);
  const morceaux = Math.max(1, Math.ceil(longueur / (rayon * 0.5)));
  let x = position.x;
  let z = position.z;
  for (let i = 0; i < morceaux; i++) {
    x += dx / morceaux;
    z += dz / morceaux;
    ({ x, z } = resoudreCollisions(x, z, rayon, obstacles));
  }
  // Sécurité : on ne sort jamais du terrain, quoi qu'il arrive.
  const l = monde.limites;
  x = borner(x, l.minX + rayon, l.maxX - rayon);
  z = borner(z, l.minZ + rayon, l.maxZ - rayon);
  return { x, z };
}

// Vrai si un cercle (x, z, rayon) touche au moins un obstacle.
export function toucheUnObstacle(x, z, rayon, obstacles) {
  for (const o of obstacles) {
    if (o.type === 'cercle') {
      if (Math.hypot(x - o.x, z - o.z) < rayon + o.rayon - 1e-6) return true;
    } else {
      const procheX = borner(x, o.x - o.largeur / 2, o.x + o.largeur / 2);
      const procheZ = borner(z, o.z - o.profondeur / 2, o.z + o.profondeur / 2);
      if (Math.hypot(x - procheX, z - procheZ) < rayon - 1e-6) return true;
    }
  }
  return false;
}

// --- Les clients qui marchent sur la place -----------------------------------------
// Les clients sont « solides » : Ferrus ne passe pas à travers eux. Et pour
// qu'ils ne le bousculent jamais, ce sont eux qui s'arrêtent poliment quand
// Ferrus est sur leur chemin.

// La taille d'un client (un cercle, comme Ferrus mais un peu plus petit).
export const RAYON_CLIENT = 0.4;

// Les obstacles formés par les clients (des cercles). Un client qui chevauche
// déjà Ferrus (par exemple s'il est apparu juste sur lui au portail) est
// ignoré jusqu'à ce qu'ils se soient séparés : sinon Ferrus serait poussé
// d'un coup, ce qui ferait une secousse.
export function obstaclesClients(clients, joueur, rayonJoueur = MONDE.joueur.rayon) {
  return clients
    .filter((c) => Math.hypot(c.x - joueur.x, c.z - joueur.z) >= RAYON_CLIENT + rayonJoueur - 1e-6)
    .map((c, i) => ({ type: 'cercle', id: `client-${i + 1}`, x: c.x, z: c.z, rayon: RAYON_CLIENT }));
}

// Un client peut-il faire ce pas ? Non s'il se rapprocherait de Ferrus au
// point de le toucher : il attend alors que Ferrus s'écarte. (S'éloigner de
// Ferrus est toujours permis.)
export function clientPeutAvancer(depart, arrivee, joueur, rayonJoueur = MONDE.joueur.rayon) {
  const contact = RAYON_CLIENT + rayonJoueur + 0.3; // il garde une petite distance polie
  const avant = Math.hypot(depart.x - joueur.x, depart.z - joueur.z);
  const apres = Math.hypot(arrivee.x - joueur.x, arrivee.z - joueur.z);
  return apres >= contact || apres > avant;
}

// -----------------------------------------------------------------------------
// 3. L'ÉTAT DU JEU, ET CE QUE L'INTERFACE AFFICHE
// -----------------------------------------------------------------------------

// Crée une nouvelle partie.
export function creerEtatJeu() {
  return {
    argent: ARGENT_DEPART,
    atelier: creerEtatAtelier(), // la gestion de l'atelier (étape 2)
    quetes: creerEtatQuetes(),   // toutes les quêtes, la lampe d'Odile comprise
  };
}

// Où en est la quête de la lampe ? (une des valeurs de ETAPES)
export function etapeLampe(etat) {
  const suivi = etat.quetes['lampe-odile'];
  if (suivi.statut === 'terminee') return ETAPES.TERMINEE;
  if (suivi.statut !== 'en_cours') return ETAPES.PAS_COMMENCEE;
  return [ETAPES.ACCEPTEE, ETAPES.ENGRENAGES_REUNIS, ETAPES.LAMPE_REPAREE][suivi.etape] || ETAPES.ACCEPTEE;
}

// Le texte du cadre « Objectif » : il dit toujours quoi faire. D'abord la
// quête en cours (ou la prochaine à aller chercher) ; quand il n'y en a plus,
// la gestion de l'atelier.
export function objectifActuel(etat) {
  return objectifQuetes(etat) || objectifAtelier(etat);
}

// Une deuxième ligne d'objectif, plus petite : quand une quête est en cours et
// qu'un client attend au comptoir, on le rappelle (null sinon).
export function objectifSecondaire(etat) {
  if (!etat.atelier.ouvert || !objectifQuetes(etat)) return null;
  return clientAuComptoir(etat) ? `Atelier : ${objectifAtelier(etat)}` : null;
}

// Les marqueurs flottants : faut-il en afficher un au-dessus d'Odile ? de
// l'établi ? du comptoir ?
export function marqueursActifs(etat) {
  const atelier = marqueursAtelier(etat);
  const quetes = marqueursQuetes(etat);
  return {
    odile: quetes.has('odile'),
    etabli: atelier.etabli || quetes.has('etabli'),
    comptoir: atelier.comptoir,
  };
}

// Ce avec quoi Ferrus peut interagir là où il se trouve ('odile', 'etabli',
// 'comptoir' ou null). S'il est près de plusieurs, on prend le plus proche.
export function cibleProche(x, z, monde = MONDE) {
  const candidats = [];
  for (const nom of ['odile', 'etabli', 'comptoir']) {
    const cible = monde[nom];
    const distance = Math.hypot(x - cible.x, z - cible.z);
    if (distance <= cible.distanceInteraction) candidats.push({ cible: nom, distance });
  }
  if (candidats.length === 0) return null;
  candidats.sort((a, b) => a.distance - b.distance);
  return candidats[0].cible;
}

// Le petit texte d'aide qui s'affiche quand on est près de quelque chose.
export function libelleInteraction(etat, cible) {
  if (cible === 'odile') return 'Parler à Odile';
  if (cible === 'etabli') {
    if (etat.atelier.ouvert) return "Travailler à l'établi";
    return etapeLampe(etat) === ETAPES.ENGRENAGES_REUNIS ? 'Réparer la lampe' : "Regarder l'établi";
  }
  if (cible === 'comptoir') {
    const client = clientAuComptoir(etat);
    return client ? `Servir ${client.nom}` : 'Le comptoir';
  }
  return '';
}

// Le dialogue d'Odile. Tant que sa quête n'est pas finie, c'est le moteur de
// quêtes qui le fournit ; ensuite, elle donne un indice vers la suite.
// Un dialogue = qui parle, une liste de répliques (affichées une par une), et
// des choix à la fin. Chaque choix a une « action » que le jeu applique ensuite.
export function dialogueOdile(etat) {
  if (!queteTerminee(etat, 'lampe-odile')) return dialoguePnjQuete(etat, 'odile', 'Odile');
  return {
    orateur: 'Odile',
    repliques: [
      ...QUETES['lampe-odile'].textes.apres,
      // Un indice vers la quête suivante, tant qu'elle n'est pas finie.
      queteTerminee(etat, 'balance-capucine')
        ? 'On dit que vous aidez tout Cuivrebourg, maintenant. Je suis si fière !'
        : 'Au fait : Capucine, la marchande, cherche un artisan habile. Le marché est derrière le portail du sud.',
    ],
    choix: [{ texte: 'Au revoir', action: 'fermer' }],
  };
}

// Applique le choix fait à la fin d'un dialogue. Renvoie les messages à afficher.
// Les actions de quête ressemblent à 'quete:accepter:lampe-odile'.
export function appliquerAction(etat, action) {
  if (action === 'servir') return servirClient(etat);
  return appliquerActionQuete(etat, action);
}

// Utiliser l'établi avant l'ouverture de l'atelier : réparer la lampe, si
// c'est le moment ; sinon, un petit message.
export function utiliserEtabli(etat) {
  const fait = utiliserObjetQuete(etat, 'etabli');
  if (fait) return fait;
  const enCours = queteEnCours(etat);
  switch (etapeLampe(etat)) {
    case ETAPES.ACCEPTEE:
      return [`Il manque des engrenages : ${enCours.suivi.ramasses.length}/${enCours.etape.objets.length}.`];
    case ETAPES.LAMPE_REPAREE:
      return ['La lampe est prête. Apporte-la à Odile.'];
    case ETAPES.TERMINEE:
      return ["L'établi est rangé. Rien à réparer pour l'instant."];
    default:
      return ["Ton établi. Rien à réparer pour l'instant."];
  }
}
