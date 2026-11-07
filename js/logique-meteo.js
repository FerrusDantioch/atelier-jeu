// =============================================================================
// logique-meteo.js — LA MÉTÉO DOUCE (version 1.5), sans aucune 3D
// -----------------------------------------------------------------------------
// Certains jours, une petite pluie tranquille tombe l'après-midi, puis laisse
// des flaques qui sèchent peu à peu. Certains matins, une brume légère
// s'étend sur le village et se lève doucement.
//
// Confort : jamais d'orage, ni d'éclair, ni de vent violent. La pluie arrive
// et repart en douceur. Pas de pluie en hiver (il neige déjà, voir les saisons).
//
// La météo de chaque jour est toujours la même pour un même numéro de jour
// (elle est « tirée au sort » à partir du numéro du jour) : il n'y a rien à
// sauvegarder, et les tests sont toujours identiques.
// Ce fichier ne contient aucune 3D : il est testé avec « node --test ».
// =============================================================================

// Un nombre « au hasard » entre 0 et 1, toujours le même pour une même graine.
function hasardDuJour(jour, sel) {
  const x = Math.sin(jour * 12.9898 + sel * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Les réglages : un jour sur trois environ est pluvieux ; un matin sur trois brumeux.
export const REGLAGES_METEO = Object.freeze({
  chancePluie: 0.34,
  chanceBrume: 0.34,
  fondu: 0.05,       // la pluie arrive et repart en 0,05 jour (environ 24 secondes)
  sechage: 0.12,     // les flaques sèchent en 0,12 jour (environ 1 minute)
});

// La météo prévue pour un jour : { pluie: { debut, fin } | null, brume: bool }.
// « saisonId » : en hiver, pas de pluie.
export function meteoDuJour(jour, saisonId = 'ete') {
  const j = Number.isFinite(jour) && jour >= 1 ? Math.floor(jour) : 1;
  let pluie = null;
  if (saisonId !== 'hiver' && hasardDuJour(j, 1) < REGLAGES_METEO.chancePluie) {
    const debut = 0.48 + hasardDuJour(j, 2) * 0.18;   // entre 11 h 30 et 16 h
    const duree = 0.14 + hasardDuJour(j, 3) * 0.1;    // 3 h 20 à 5 h 45 (1 à 2 minutes)
    pluie = { debut, fin: debut + duree };
  }
  return { pluie, brume: hasardDuJour(j, 4) < REGLAGES_METEO.chanceBrume };
}

const lisse = (t) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

// La météo du moment : { pluie, brume, flaques }, chacun de 0 à 1.
// « actif » = false (option « Toujours beau ») : tout reste à 0.
export function meteoDuMoment(jour, journee, saisonId = 'ete', actif = true) {
  if (!actif) return { pluie: 0, brume: 0, flaques: 0 };
  const f = Number.isFinite(journee) ? journee - Math.floor(journee) : 0.5;
  const m = meteoDuJour(jour, saisonId);
  const { fondu, sechage } = REGLAGES_METEO;
  let pluie = 0;
  let flaques = 0;
  if (m.pluie) {
    const { debut, fin } = m.pluie;
    pluie = Math.min(lisse((f - debut) / fondu), lisse((fin - f) / fondu));
    if (f >= debut && f <= fin) flaques = lisse((f - debut) / (fondu * 3));
    else if (f > fin) flaques = 1 - lisse((f - fin) / sechage);
  }
  // La brume : de 4 h 30 à 10 h, la plus épaisse vers 6 h 30.
  let brume = 0;
  if (m.brume) brume = Math.min(lisse((f - 0.19) / 0.06), lisse((0.42 - f) / 0.1));
  return { pluie, brume, flaques };
}

// Un petit message quand la pluie commence ou s'arrête (ou null).
export function messageMeteo(pluieAvant, pluieApres) {
  if (pluieAvant < 0.5 && pluieApres >= 0.5) return 'Une petite pluie douce tombe sur Cuivrebourg.';
  if (pluieAvant >= 0.5 && pluieApres < 0.5) return 'La pluie s\'arrête. Ça sent bon la terre mouillée.';
  return null;
}
