// =============================================================================
// mise-a-jour.js — met le décor d'accord avec la partie (sorti de main.js en 1.7.1)
// -----------------------------------------------------------------------------
// L'état du jeu (les quêtes finies, les améliorations achetées, les objets
// offerts…) est rangé dans « etat ». Ici, on MONTRE cet état dans les lieux :
// le portail s'ouvre, la roue du moulin retrouve ses pales, le sifflet
// apparaît sur la locomotive, les losanges flottent au-dessus de ceux à qui il
// faut parler…
//
// main.js appelle « mettreAJourLieux » après chaque action du joueur.
// =============================================================================

import { ETAPES, etapeLampe, marqueursActifs } from './logique.js';
import { possedeDecoration, possedeAmelioration } from './logique-atelier.js';
import { chatAAdopter } from './logique-compagnons.js';
import { marqueursQuetes } from './logique-quetes.js';
import { ZONES, conditionRemplie, objetsQueteZone, roueReparee, locomotiveEnMarche, wagonnetRepare } from './logique-zones.js';
import { tenuePortee } from './logique-garderobe.js';
import { telescopeRepare } from './logique-foret.js';
import { etapesDirigeable } from './logique-dirigeable.js';
import { dialogueVille, serviceRendu } from './logique-ville.js';
import { allumerLampe } from './decor.js';
import { habillerFerrus } from './personnages.js';

// « etat » : la partie ; « monde » : les lieux et leurs habitants (voir lieux.js).
export function mettreAJourLieux(etat, monde) {
  const { lieux } = monde;

  // La place : engrenages, lampe, lanterne, améliorations, portail.
  const place = lieux.place;
  const etape = etapeLampe(etat);
  allumerLampe(place.decor.lampeEtabli, etape === ETAPES.LAMPE_REPAREE);
  place.decor.lampeEtabli.visible = etape !== ETAPES.TERMINEE;
  place.decor.lanterneOdile.visible = etape === ETAPES.TERMINEE;
  for (const [id, objet3d] of Object.entries(place.decor.ameliorations)) {
    objet3d.visible = etat.atelier.ameliorations.includes(id);
  }
  place.decor.portail.visible = !conditionRemplie(etat, 'portail');
  // Les décorations achetées (version 1.4), dehors et dedans (version 1.5).
  for (const [id, objet3d] of Object.entries(place.decor.decorations)) {
    objet3d.visible = possedeDecoration(etat, id);
  }
  for (const [id, objet3d] of Object.entries(lieux.interieur.decor.decorations)) {
    objet3d.visible = possedeDecoration(etat, id);
  }
  // Version 1.5 : Lucie est là une fois engagée ; le chat attend d'être adopté.
  for (const p of lieux.interieur.pnj) p.objet.visible = possedeAmelioration(etat, 'apprentie');
  monde.chatErrant.visible = chatAAdopter(etat);
  // Version 1.6 : la tenue de Ferrus, la vitrine, le chemin de la forêt, le
  // télescope et le dirigeable.
  habillerFerrus(monde.ferrus, tenuePortee(etat));
  monde.vitrine3d.regler(etat.vitrine.objets);
  monde.barriereForet.visible = !conditionRemplie(etat, 'portail');
  lieux.foret.decor.telescope.regler(telescopeRepare(etat));
  lieux.foret.decor.chantier.regler(etapesDirigeable(etat));

  // Le marché : l'arbre tombé disparaît quand le chemin est dégagé.
  lieux.marche.decor.barriere.visible = !conditionRemplie(etat, 'chemin-moulin');

  // Le moulin : les pales manquantes reviennent quand l'axe est installé, et la
  // barrière de la route de la gare se lève à la fin de la quête.
  const roueOk = roueReparee(etat);
  for (const pale of lieux.moulin.decor.roue.palesManquantes) pale.visible = roueOk;
  lieux.moulin.decor.barriereGare.visible = !conditionRemplie(etat, 'chemin-gare');
  // La gare : le sifflet neuf apparaît sur la locomotive une fois installé.
  lieux.gare.decor.train.sifflet.visible = locomotiveEnMarche(etat);
  // La ville nouvelle (version 1.7) : l'horloge de l'arrêt et la bouilloire du
  // café apparaissent une fois offertes ; un losange flotte au-dessus de
  // l'habitant à qui l'on peut donner ce qu'il attend.
  {
    const ville = lieux.ville;
    ville.decor.horlogeArret.visible = serviceRendu(etat, 'ines');
    ville.decor.bouilloire.visible = serviceRendu(etat, 'malik');
    ville.decor.vapeur.userData.force = serviceRendu(etat, 'malik') ? 1 : 0;
    for (const p of ZONES.ville.pnj) {
      const d = dialogueVille(etat, p.id);
      ville.marqueurs.get(p.id).objet.visible = d.choix.some((c) => c.action.startsWith('ville:donner'));
    }
  }
  // La mine : le wagonnet est remis sur ses rails une fois la roue posée.
  lieux.mine.decor.wagonnet.userData.reparer(wagonnetRepare(etat));
  // Les objets de quête à ramasser (engrenages, pales, rouages, pépites).
  for (const nom of ['place', 'moulin', 'gare', 'mine', 'foret']) {
    const aRamasser = new Set(objetsQueteZone(etat, nom).map((o) => o.id));
    for (const [id, objet3d] of lieux[nom].objetsQuete) objet3d.visible = aRamasser.has(id);
  }

  // Les marqueurs de tous les lieux.
  const marqueursPlace = marqueursActifs(etat);
  const marqueursQ = marqueursQuetes(etat);
  for (const [id, m] of lieux.place.marqueurs) m.objet.visible = Boolean(marqueursPlace[id]);
  for (const nom of ['marche', 'moulin', 'gare', 'mine', 'lac', 'interieur', 'foret']) {
    for (const [id, m] of lieux[nom].marqueurs) m.objet.visible = marqueursQ.has(id);
  }
}
