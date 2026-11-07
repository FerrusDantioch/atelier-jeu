// =============================================================================
// logique-compagnons.js — LES COMPAGNONS DE FERRUS (version 1.5), sans 3D
// -----------------------------------------------------------------------------
// Deux compagnons peuvent suivre Ferrus partout :
//   - ROUILLE, un petit chat roux sans maison, qui attend près de chez Odile
//     une fois l'atelier ouvert. On l'adopte en lui parlant ;
//   - CLIQUET, un oiseau mécanique qu'on fabrique à l'établi (2 cuivres,
//     1 ressort). Une fois fini, il s'éveille et vole près de Ferrus.
//
// Pour qu'ils suivent Ferrus sans jamais traverser un mur, ils marchent dans
// ses pas : on retient le chemin de Ferrus (une « trace » de petits points),
// et chaque compagnon se place un peu en arrière sur cette trace.
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

export const NOMS_COMPAGNONS = Object.freeze({ chat: 'Rouille', oiseau: 'Cliquet' });

// Où attend le chat, sur la place, avant d'être adopté (près de chez Odile).
export const CHAT_ERRANT = Object.freeze({ x: 12.7, z: -6.7 });

export function creerEtatCompagnons() {
  return { chat: false, oiseau: false };
}

// Le chat attend-il d'être adopté ? (après l'ouverture de l'atelier)
export function chatAAdopter(etat) {
  return etat.atelier.ouvert && !etat.compagnons.chat;
}

export function dialogueChat(etat) {
  if (!chatAAdopter(etat)) return null;
  return {
    orateur: 'Un petit chat',
    repliques: [
      'Miaou ?',
      "Un petit chat roux, couleur de rouille, vous regarde avec de grands yeux. Il n'a pas l'air d'avoir de maison.",
    ],
    choix: [
      { texte: "L'adopter (il vous suivra partout)", action: 'compagnon:adopter-chat' },
      { texte: 'Plus tard', action: 'fermer' },
    ],
  };
}

export function adopterChat(etat) {
  if (!chatAAdopter(etat)) return [];
  etat.compagnons.chat = true;
  return ['Vous adoptez le petit chat. Vous l\'appelez Rouille !', 'Rouille vous suivra partout.'];
}

// -----------------------------------------------------------------------------
// La trace : le chemin de Ferrus, pour que les compagnons marchent dans ses pas.
// -----------------------------------------------------------------------------
const PAS_TRACE = 0.15;  // un point tous les 15 cm
const LONGUEUR_MAX = 40; // on garde les 6 derniers mètres environ

// Une trace neuve, qui part de la position de Ferrus. « orientation » : vers
// où il regarde ; la trace s'étend un peu derrière lui (pour qu'en arrivant
// dans un lieu, les compagnons soient tout de suite à leur place).
export function creerTrace(x, z, orientation = 0) {
  const points = [];
  for (let i = 8; i >= 0; i--) {
    points.push({ x: x - Math.sin(orientation) * i * 0.2, z: z - Math.cos(orientation) * i * 0.2 });
  }
  return { points };
}

// Ferrus a bougé : on ajoute un point s'il s'est assez éloigné du dernier.
export function suivreTrace(trace, x, z) {
  const dernier = trace.points[trace.points.length - 1];
  if (Math.hypot(x - dernier.x, z - dernier.z) < PAS_TRACE) return;
  trace.points.push({ x, z });
  if (trace.points.length > LONGUEUR_MAX) trace.points.shift();
}

// Le point de la trace situé à « distance » derrière Ferrus (en suivant le
// chemin), et la direction dans laquelle on y marche. { x, z, angle }.
export function pointDerriere(trace, ferrus, distance) {
  let reste = distance;
  let avant = ferrus;
  for (let i = trace.points.length - 1; i >= 0; i--) {
    const p = trace.points[i];
    const d = Math.hypot(avant.x - p.x, avant.z - p.z);
    if (d >= reste && d > 1e-6) {
      const t = reste / d;
      return { x: avant.x + (p.x - avant.x) * t, z: avant.z + (p.z - avant.z) * t, angle: Math.atan2(avant.x - p.x, avant.z - p.z) };
    }
    reste -= d;
    avant = p;
  }
  // La trace est trop courte : on reste au plus vieux point.
  const premier = trace.points[0];
  return { x: premier.x, z: premier.z, angle: Math.atan2(ferrus.x - premier.x, ferrus.z - premier.z) };
}
