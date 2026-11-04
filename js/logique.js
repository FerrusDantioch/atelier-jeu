// =============================================================================
// logique.js — LES RÈGLES DU JEU (aucune 3D ici)
// -----------------------------------------------------------------------------
// Ce fichier décrit :
//   1. le plan de la place (où sont les bâtiments, les arbres, les haies…) ;
//   2. les collisions (Ferrus ne doit pas traverser les obstacles) ;
//   3. la quête « La lampe d'Odile » (ses étapes, l'argent gagné…) ;
//   4. les textes : objectifs, dialogues, petits messages.
//
// Il n'utilise PAS Three.js : il ne fait que des calculs. C'est pour ça qu'on
// peut le tester tout seul avec « node --test » (voir le dossier tests/).
// L'affichage 3D (main.js) lit ces informations et dessine la scène.
//
// Les positions sont en « mètres » sur le sol :
//   - x : de la gauche (négatif) vers la droite (positif) ;
//   - z : du haut de l'écran / le nord (négatif) vers le bas / le sud (positif).
// =============================================================================

// -----------------------------------------------------------------------------
// 1. LE PLAN DE LA PLACE
// -----------------------------------------------------------------------------

// Les étapes possibles de la quête, dans l'ordre.
export const ETAPES = Object.freeze({
  PAS_COMMENCEE: 'pas_commencee',         // On n'a pas encore parlé à Odile.
  ACCEPTEE: 'acceptee',                   // Quête acceptée : on cherche les engrenages.
  ENGRENAGES_REUNIS: 'engrenages_reunis', // Les 3 engrenages sont ramassés.
  LAMPE_REPAREE: 'lampe_reparee',         // La lampe est réparée à l'établi.
  TERMINEE: 'terminee',                   // La lampe est livrée, Odile a payé.
});

// La récompense de la quête, en pièces.
export const RECOMPENSE_LAMPE = 120;

// L'argent de départ de Ferrus (l'atelier est en difficulté…).
export const ARGENT_DEPART = 20;

// Distance (en mètres) à laquelle Ferrus ramasse un engrenage en passant dessus.
export const DISTANCE_RAMASSAGE = 1.0;

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

  // Les 3 engrenages perdus par Odile (invisibles tant que la quête n'est pas acceptée).
  engrenages: [
    { id: 'engrenage-1', x: -13, z: 1.5 },
    { id: 'engrenage-2', x: 4, z: 7.5 },
    { id: 'engrenage-3', x: 13.5, z: -6 },
  ],
});

// Rassemble tous les obstacles dans une seule liste, pour les collisions.
export function obstaclesDuMonde(monde = MONDE) {
  const rect = (o) => ({ type: 'rectangle', id: o.id, x: o.x, z: o.z, largeur: o.largeur, profondeur: o.profondeur });
  const liste = [
    rect(monde.atelier),
    rect(monde.maisonOdile),
    rect(monde.etabli),
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
  // On répète quelques fois : sortir d'un obstacle peut en faire toucher un autre.
  for (let passe = 0; passe < 4; passe++) {
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

// -----------------------------------------------------------------------------
// 3. L'ÉTAT DU JEU ET LA QUÊTE « LA LAMPE D'ODILE »
// -----------------------------------------------------------------------------

// Crée une nouvelle partie.
export function creerEtatJeu() {
  return {
    argent: ARGENT_DEPART,
    quete: {
      etape: ETAPES.PAS_COMMENCEE,
      engrenagesRamasses: [], // les identifiants des engrenages déjà ramassés
    },
  };
}

// Nombre d'engrenages à trouver au total.
export function nombreEngrenagesTotal(monde = MONDE) {
  return monde.engrenages.length;
}

// Les engrenages à afficher sur la place en ce moment.
// Ils n'apparaissent qu'après avoir accepté la quête, et disparaissent une
// fois ramassés.
export function engrenagesVisibles(etat, monde = MONDE) {
  if (etat.quete.etape !== ETAPES.ACCEPTEE) return [];
  return monde.engrenages.filter((e) => !etat.quete.engrenagesRamasses.includes(e.id));
}

// Le texte du cadre « Objectif » : il dit toujours quoi faire.
export function objectifActuel(etat, monde = MONDE) {
  const total = nombreEngrenagesTotal(monde);
  switch (etat.quete.etape) {
    case ETAPES.PAS_COMMENCEE:
      return "Va parler à Odile, devant sa maison à droite de la place.";
    case ETAPES.ACCEPTEE:
      return `Retrouve les engrenages d'Odile sur la place : ${etat.quete.engrenagesRamasses.length}/${total}.`;
    case ETAPES.ENGRENAGES_REUNIS:
      return "Rapporte les engrenages à ton établi, devant l'atelier.";
    case ETAPES.LAMPE_REPAREE:
      return "Apporte la lampe réparée à Odile.";
    case ETAPES.TERMINEE:
      return "Quête terminée ! L'atelier attend ses prochains clients.";
    default:
      return '';
  }
}

// Les marqueurs flottants : faut-il en afficher un au-dessus d'Odile ? de l'établi ?
export function marqueursActifs(etat) {
  const etape = etat.quete.etape;
  return {
    odile: etape === ETAPES.PAS_COMMENCEE || etape === ETAPES.LAMPE_REPAREE,
    etabli: etape === ETAPES.ENGRENAGES_REUNIS,
  };
}

// Ramasse les engrenages tout proches de Ferrus (on les ramasse en marchant dessus).
// Renvoie la liste des messages à afficher (vide si rien n'a été ramassé).
export function ramasserEngrenagesProches(etat, x, z, monde = MONDE) {
  const messages = [];
  const total = nombreEngrenagesTotal(monde);
  for (const engrenage of engrenagesVisibles(etat, monde)) {
    if (Math.hypot(x - engrenage.x, z - engrenage.z) <= DISTANCE_RAMASSAGE) {
      etat.quete.engrenagesRamasses.push(engrenage.id);
      const nombre = etat.quete.engrenagesRamasses.length;
      messages.push(`Engrenage ramassé ${nombre}/${total}`);
      if (nombre >= total) {
        etat.quete.etape = ETAPES.ENGRENAGES_REUNIS;
        messages.push("Tous les engrenages ! Direction l'établi.");
      }
    }
  }
  return messages;
}

// Ce avec quoi Ferrus peut interagir là où il se trouve ('odile', 'etabli' ou null).
// S'il est près des deux, on prend le plus proche.
export function cibleProche(x, z, monde = MONDE) {
  const candidats = [];
  const dOdile = Math.hypot(x - monde.odile.x, z - monde.odile.z);
  if (dOdile <= monde.odile.distanceInteraction) candidats.push({ cible: 'odile', distance: dOdile });
  const dEtabli = Math.hypot(x - monde.etabli.x, z - monde.etabli.z);
  if (dEtabli <= monde.etabli.distanceInteraction) candidats.push({ cible: 'etabli', distance: dEtabli });
  if (candidats.length === 0) return null;
  candidats.sort((a, b) => a.distance - b.distance);
  return candidats[0].cible;
}

// Le petit texte d'aide qui s'affiche quand on est près de quelque chose.
export function libelleInteraction(etat, cible) {
  if (cible === 'odile') return 'Parler à Odile';
  if (cible === 'etabli') {
    return etat.quete.etape === ETAPES.ENGRENAGES_REUNIS ? 'Réparer la lampe' : "Regarder l'établi";
  }
  return '';
}

// Le dialogue d'Odile, qui change selon l'avancée de la quête.
// Un dialogue = qui parle, une liste de répliques (affichées une par une), et
// des choix à la fin. Chaque choix a une « action » que le jeu applique ensuite.
export function dialogueOdile(etat, monde = MONDE) {
  const total = nombreEngrenagesTotal(monde);
  switch (etat.quete.etape) {
    case ETAPES.PAS_COMMENCEE:
      return {
        orateur: 'Odile',
        repliques: [
          "Bonjour ! Vous êtes le nouvel artisan ? Ferrus Dantioch, c'est bien ça ?",
          "Ma lampe à vapeur est tombée la semaine dernière. Depuis, mes soirées sont bien sombres…",
          "Trois engrenages ont sauté dans la chute. Ils ont roulé quelque part sur la place.",
          `Pourriez-vous les retrouver et réparer ma lampe ? Je vous paierai ${RECOMPENSE_LAMPE} pièces.`,
        ],
        choix: [
          { texte: "J'accepte !", action: 'accepter' },
          { texte: 'Plus tard', action: 'fermer' },
        ],
      };
    case ETAPES.ACCEPTEE: {
      const reste = total - etat.quete.engrenagesRamasses.length;
      return {
        orateur: 'Odile',
        repliques: [
          reste > 1
            ? `Merci de chercher ! Il reste ${reste} engrenages à trouver sur la place.`
            : "Plus qu'un engrenage à trouver ! Je crois qu'ils ont roulé loin…",
        ],
        choix: [{ texte: "J'y retourne", action: 'fermer' }],
      };
    }
    case ETAPES.ENGRENAGES_REUNIS:
      return {
        orateur: 'Odile',
        repliques: ["Vous les avez tous ! Il ne reste qu'à réparer la lampe sur votre établi."],
        choix: [{ texte: "J'y vais", action: 'fermer' }],
      };
    case ETAPES.LAMPE_REPAREE:
      return {
        orateur: 'Odile',
        repliques: [
          "Ma lampe ! Elle brille comme au premier jour…",
          `Voici vos ${RECOMPENSE_LAMPE} pièces, bien méritées. Cuivrebourg a besoin d'artisans comme vous.`,
        ],
        choix: [{ texte: 'Donner la lampe', action: 'livrer' }],
      };
    case ETAPES.TERMINEE:
    default:
      return {
        orateur: 'Odile',
        repliques: ["Merci encore, Ferrus. Je parlerai de votre atelier à tout le quartier !"],
        choix: [{ texte: 'Au revoir', action: 'fermer' }],
      };
  }
}

// Applique le choix fait à la fin d'un dialogue. Renvoie les messages à afficher.
export function appliquerAction(etat, action) {
  if (action === 'accepter') return accepterQuete(etat);
  if (action === 'livrer') return livrerLampe(etat);
  return [];
}

// Accepter la quête : les engrenages apparaissent sur la place.
export function accepterQuete(etat) {
  if (etat.quete.etape !== ETAPES.PAS_COMMENCEE) return [];
  etat.quete.etape = ETAPES.ACCEPTEE;
  return ['Quête acceptée : La lampe d\'Odile'];
}

// Utiliser l'établi : répare la lampe si on a les 3 engrenages.
export function utiliserEtabli(etat, monde = MONDE) {
  const total = nombreEngrenagesTotal(monde);
  switch (etat.quete.etape) {
    case ETAPES.ENGRENAGES_REUNIS:
      etat.quete.etape = ETAPES.LAMPE_REPAREE;
      return ['Lampe à vapeur réparée !'];
    case ETAPES.ACCEPTEE:
      return [`Il manque des engrenages : ${etat.quete.engrenagesRamasses.length}/${total}.`];
    case ETAPES.LAMPE_REPAREE:
      return ['La lampe est prête. Apporte-la à Odile.'];
    case ETAPES.TERMINEE:
      return ["L'établi est rangé. Rien à réparer pour l'instant."];
    case ETAPES.PAS_COMMENCEE:
    default:
      return ["Ton établi. Rien à réparer pour l'instant."];
  }
}

// Livrer la lampe à Odile : elle paie la récompense (une seule fois).
export function livrerLampe(etat) {
  if (etat.quete.etape !== ETAPES.LAMPE_REPAREE) return [];
  etat.quete.etape = ETAPES.TERMINEE;
  etat.argent += RECOMPENSE_LAMPE;
  return [`+${RECOMPENSE_LAMPE} pièces`, "Quête terminée : La lampe d'Odile"];
}
