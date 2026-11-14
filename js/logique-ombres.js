// =============================================================================
// logique-ombres.js — où poser les « ombres de contact » (version 1.7.1)
// -----------------------------------------------------------------------------
// Une ombre de contact, c'est le petit halo sombre qu'on voit au pied des
// choses, là où elles touchent le sol : sous une table, le long d'un mur, au
// pied d'un arbre. Sans lui, les objets ont l'air de « flotter » un peu,
// surtout la nuit, sous la pluie, ou en qualité « Économie » (où le soleil ne
// fait plus d'ombres).
//
// Ici, on ne dessine rien : on fait seulement la LISTE des ombres d'un lieu, à
// partir de ce que le jeu sait déjà (les bâtiments, les arbres, les meubles…
// décrits dans logique.js et logique-zones.js). Le dessin est dans ombres.js.
//
// Ce fichier ne touche pas au navigateur : il peut être testé avec
// « node --test ».
// =============================================================================

import { MONDE } from './logique.js';
import { ZONES, RAYON_LAMPADAIRE } from './logique-zones.js';
import { RAYON_BUISSON } from './logique-foret.js';

// Chaque genre d'objet a son ombre :
//   marge : jusqu'où le halo déborde autour de l'objet (en mètres) ;
//   force : de 0 (invisible) à 1 (noir).
export const GENRES_OMBRE = Object.freeze({
  batiment: { marge: 0.9, force: 0.5 },   // une maison, un grand bâtiment
  paroi: { marge: 0.8, force: 0.45 },     // un mur de l'atelier, une paroi de la galerie
  haie: { marge: 0.45, force: 0.3 },
  meuble: { marge: 0.4, force: 0.42 },    // une caisse, un étal, un banc, une voiture…
  rond: { marge: 0.45, force: 0.4 },      // un puits, une fontaine, un rocher, une table
  arbre: { marge: 0.55, force: 0.36 },
  pied: { marge: 0.3, force: 0.42 },      // le pied d'une lanterne
});

// L'ombre d'un objet rectangulaire (vu de dessus).
function rectangle(genre, o) {
  return { id: o.id, genre, x: o.x, z: o.z, demiLargeur: o.largeur / 2, demiProfondeur: o.profondeur / 2, arrondi: 0, ...GENRES_OMBRE[genre] };
}
// L'ombre d'un objet rond.
function cercle(genre, id, x, z, rayon) {
  return { id, genre, x, z, demiLargeur: rayon, demiProfondeur: rayon, arrondi: rayon, ...GENRES_OMBRE[genre] };
}

// La liste des ombres de contact d'un lieu. On n'y met que ce qui est TOUJOURS
// là : pas les barrières qui s'ouvrent, ni les décorations qu'on achète, ni
// l'eau, ni les rails. (Les personnages ont leur propre ombre, qui les suit :
// voir ombres.js.)
export function ombresDeContact(zoneId) {
  const liste = [];
  if (zoneId === 'place') {
    const m = MONDE;
    liste.push(rectangle('batiment', m.atelier), rectangle('batiment', m.maisonOdile));
    liste.push(rectangle('meuble', m.etabli), rectangle('meuble', m.comptoir));
    if (m.vitrine) liste.push(rectangle('meuble', m.vitrine));
    for (const h of m.haies) liste.push(rectangle('haie', h));
    liste.push(cercle('rond', m.puits.id, m.puits.x, m.puits.z, m.puits.rayon));
    m.arbres.forEach((a, i) => liste.push(cercle('arbre', `arbre-${i + 1}`, a.x, a.z, m.rayonArbre)));
    (m.lampadaires || []).forEach((l, i) => liste.push(cercle('pied', `lampadaire-${i + 1}`, l.x, l.z, RAYON_LAMPADAIRE)));
    return liste;
  }
  const z = ZONES[zoneId];
  if (!z) return liste;
  for (const b of z.batiments || []) liste.push(rectangle('batiment', b));
  if (z.entree) liste.push(rectangle('batiment', z.entree));
  for (const p of z.parois || []) liste.push(rectangle('paroi', p));
  for (const h of z.haies || []) liste.push(rectangle('haie', h));
  for (const o of [...(z.caisses || []), ...(z.etals || []), ...(z.bancs || [])]) liste.push(rectangle('meuble', o));
  if (z.arretTram) liste.push(rectangle('meuble', z.arretTram));
  // Les meubles de l'atelier (pas les décorations : elles n'y sont pas toujours).
  for (const m of z.meubles || []) {
    if (m.decoration) continue;
    liste.push(m.rayon ? cercle('rond', m.id, m.x, m.z, m.rayon) : rectangle('meuble', m));
  }
  for (const r of z.ronds || []) liste.push(cercle('rond', r.id, r.x, r.z, r.rayon));
  (z.rochers || []).forEach((r, i) => liste.push(cercle('rond', `rocher-${i + 1}`, r.x, r.z, r.rayon)));
  for (const c of [z.fontaine, z.mecanisme, z.chateauEau, z.telescope].filter(Boolean)) liste.push(cercle('rond', c.id, c.x, c.z, c.rayon));
  if (z.horloge) liste.push(cercle('pied', z.horloge.id, z.horloge.x, z.horloge.z, z.horloge.rayon));
  for (const c of z.cueillettes || []) liste.push(cercle('rond', c.id, c.x, c.z, RAYON_BUISSON));
  (z.lampadaires || []).forEach((l, i) => liste.push(cercle('pied', `lampadaire-${i + 1}`, l.x, l.z, RAYON_LAMPADAIRE)));
  (z.arbres || []).forEach((a, i) => liste.push(cercle('arbre', `arbre-${i + 1}`, a.x, a.z, z.rayonArbre)));
  return liste;
}

// L'ombre qui suit un personnage (Ferrus, un habitant, un client, le chat).
export function ombrePersonnage(x, z, rayon = 0.34) {
  return { x, z, demiLargeur: rayon, demiProfondeur: rayon, arrondi: rayon, marge: 0.3, force: 0.4 };
}
