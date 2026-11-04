// =============================================================================
// logique-sauvegarde.js — ENREGISTRER ET RELIRE LA PARTIE (étape 3)
// -----------------------------------------------------------------------------
// La partie est enregistrée dans le navigateur (le « localStorage »), sous
// forme de texte (du JSON). Ce fichier transforme la partie en texte, et
// relit ce texte en VÉRIFIANT tout : une sauvegarde abîmée, trafiquée ou
// faite par une ancienne version du jeu ne doit jamais casser le jeu.
//   - ce qui manque est complété avec les valeurs d'une nouvelle partie ;
//   - ce qui a un type inattendu est ignoré ;
//   - si rien n'est lisible, on renvoie null (le jeu démarre alors une
//     nouvelle partie).
//
// Ce fichier ne touche pas lui-même au navigateur : main.js s'en charge.
// Il peut donc être testé avec « node --test ».
// =============================================================================

import { creerEtatJeu, ETAPES } from './logique.js';
import { RECETTES } from './logique-atelier.js';
import { ZONES } from './logique-zones.js';
import { QUETES } from './logique-quetes.js';

export const CLE_SAUVEGARDE = 'atelier-cuivrebourg-sauvegarde';
export const VERSION_SAUVEGARDE = 1;

// Transforme la partie en texte.
export function serialiserPartie({ etat, zone, position, orientation = 0 }) {
  return JSON.stringify({
    version: VERSION_SAUVEGARDE,
    date: new Date().toISOString(),
    etat,
    zone,
    position: { x: position.x, z: position.z },
    orientation,
  });
}

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const estNombre = (v) => typeof v === 'number' && Number.isFinite(v);

// Recopie dans « modele » (une partie neuve) les valeurs lues, seulement si
// elles ont le même type. Les clés inconnues sont ignorées.
function fusionner(modele, lu) {
  if (!estObjet(lu)) return modele;
  for (const cle of Object.keys(modele)) {
    const attendu = modele[cle];
    const valeur = lu[cle];
    if (valeur === undefined) continue;
    if (estObjet(attendu)) fusionner(attendu, valeur);
    else if (Array.isArray(attendu)) { if (Array.isArray(valeur)) modele[cle] = valeur; }
    else if (typeof attendu === 'number') { if (estNombre(valeur)) modele[cle] = valeur; }
    else if (typeof attendu === typeof valeur) modele[cle] = valeur;
  }
  return modele;
}

// Relit une sauvegarde. Renvoie { etat, zone, position, orientation } ou null.
export function chargerPartie(texte) {
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch {
    return null;
  }
  if (!estObjet(donnees) || donnees.version !== VERSION_SAUVEGARDE || !estObjet(donnees.etat)) return null;

  const lu = donnees.etat;
  const etat = fusionner(creerEtatJeu(), lu);

  // Vérifications plus précises.
  if (etat.argent < 0) etat.argent = 0;
  if (!Object.values(ETAPES).includes(etat.quete.etape)) etat.quete.etape = ETAPES.PAS_COMMENCEE;
  etat.quete.engrenagesRamasses = etat.quete.engrenagesRamasses.filter((id) => typeof id === 'string');
  for (const [id, n] of Object.entries(etat.atelier.stock)) {
    etat.atelier.stock[id] = Math.max(0, Math.floor(n));
  }
  etat.atelier.ameliorations = etat.atelier.ameliorations.filter((id) => typeof id === 'string');
  etat.atelier.recettesQuete = etat.atelier.recettesQuete.filter((id) => RECETTES[id]);
  // La fabrication en cours (null dans une partie neuve, donc vérifiée à part).
  const f = estObjet(lu.atelier) ? lu.atelier.fabrication : null;
  etat.atelier.fabrication = estObjet(f) && RECETTES[f.recette] && estNombre(f.restant) && estNombre(f.total) && f.total > 0
    ? { recette: f.recette, restant: f.restant, total: f.total }
    : null;
  // Les clients qui attendaient.
  etat.atelier.clients = etat.atelier.clients
    .filter((c) => estObjet(c) && estNombre(c.id) && typeof c.nom === 'string' && RECETTES[c.commande])
    .slice(0, 3)
    .map((c) => ({ id: c.id, nom: c.nom, salut: typeof c.salut === 'string' ? c.salut : 'Bonjour !', commande: c.commande }));
  // Les quêtes.
  const statuts = ['verrouillee', 'disponible', 'en_cours', 'terminee'];
  for (const [id, s] of Object.entries(etat.quetes)) {
    if (!statuts.includes(s.statut)) s.statut = 'verrouillee';
    // Le numéro d'étape doit exister dans la quête (une quête terminée est
    // « après » sa dernière étape).
    const max = s.statut === 'terminee' ? QUETES[id].etapes.length : QUETES[id].etapes.length - 1;
    s.etape = Math.min(max, Math.max(0, Math.floor(s.etape)));
    s.ramasses = s.ramasses.filter((id) => typeof id === 'string');
  }

  // Le lieu et la position (sinon : la place, au point de départ).
  const zone = typeof donnees.zone === 'string' && ZONES[donnees.zone] ? donnees.zone : 'place';
  const p = donnees.position;
  const position = estObjet(p) && estNombre(p.x) && estNombre(p.z) ? { x: p.x, z: p.z } : null;
  const orientation = estNombre(donnees.orientation) ? donnees.orientation : 0;
  // Une seule quête peut être en cours : s'il y en a plusieurs, on garde la première.
  let dejaUne = false;
  for (const s of Object.values(etat.quetes)) {
    if (s.statut === 'en_cours') {
      if (dejaUne) s.statut = 'disponible';
      dejaUne = true;
    }
  }
  return { etat, zone: position ? zone : 'place', position, orientation };
}
