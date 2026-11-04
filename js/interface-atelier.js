// =============================================================================
// interface-atelier.js — le panneau de l'établi (étape 2)
// -----------------------------------------------------------------------------
// Un grand panneau avec trois onglets :
//   - Fabriquer : les recettes, ce qu'il faut, le bouton « Fabriquer » ;
//   - Acheter : les matériaux ;
//   - Améliorer : les améliorations de l'atelier.
// En haut, un résumé du stock reste toujours visible.
//
// Ce fichier ne décide de rien : quand on appuie sur un bouton, il prévient
// main.js (« surAction »), qui applique la règle de logique-atelier.js, puis
// demande au panneau de se redessiner.
// =============================================================================

import {
  MATERIAUX,
  RECETTES,
  AMELIORATIONS,
  capaciteStock,
  peutFabriquer,
  recetteDebloquee,
  dureeFabrication,
  possedeAmelioration,
  clientAuComptoir,
  progressionFabrication,
} from './logique-atelier.js';

const $ = (id) => document.getElementById(id);

// Petit outil : crée un élément HTML avec une classe et un texte.
function el(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

// Un bouton d'action. « cle » sert à retrouver le bouton après un rafraîchissement
// (pour que le clavier garde sa place).
function bouton(texte, cle, actif, surClic) {
  const b = el('button', 'bouton-action', texte);
  b.type = 'button';
  b.dataset.cle = cle;
  b.disabled = !actif;
  b.addEventListener('click', surClic);
  return b;
}

export function creerPanneauAtelier({ etat, surAction, surFermeture }) {
  const panneau = $('panneau-atelier');
  const contenu = $('atelier-contenu');
  const stock = $('atelier-stock');
  const argent = $('atelier-argent');
  const onglets = [...panneau.querySelectorAll('[data-onglet]')];
  let ongletActif = 'fabriquer';
  let barreProgression = null; // la barre de l'onglet Fabriquer (mise à jour à chaque image)
  let instantOuverture = 0;    // pour ignorer la touche E qui vient d'ouvrir le panneau

  // --- Ouvrir / fermer -----------------------------------------------------------
  function ouvrir(onglet) {
    if (onglet) ongletActif = onglet;
    instantOuverture = performance.now();
    panneau.hidden = false;
    document.body.classList.add('panneau-ouvert');
    rafraichir();
    // Le clavier se place sur l'onglet actif (pratique pour naviguer avec Tab).
    const actif = onglets.find((o) => o.dataset.onglet === ongletActif);
    if (actif) actif.focus({ preventScroll: true });
  }
  function fermer() {
    if (panneau.hidden) return;
    panneau.hidden = true;
    document.body.classList.remove('panneau-ouvert');
    if (document.activeElement) document.activeElement.blur();
    surFermeture();
  }
  $('atelier-fermer').addEventListener('click', fermer);
  for (const o of onglets) {
    o.addEventListener('click', () => {
      ongletActif = o.dataset.onglet;
      rafraichir();
      contenu.scrollTop = 0;
    });
  }
  // Échap ou E referment le panneau.
  window.addEventListener('keydown', (e) => {
    // La touche qui a ouvert le panneau ne doit pas le refermer aussitôt.
    if (panneau.hidden || e.timeStamp <= instantOuverture) return;
    const touche = e.key.toLowerCase();
    if (touche === 'escape' || (touche === 'e' && !e.repeat)) {
      e.preventDefault();
      fermer();
    }
  });

  // --- Dessiner le contenu ----------------------------------------------------------
  function rafraichir() {
    if (panneau.hidden) return;
    // On retient le bouton qui avait le clavier, pour le lui rendre après.
    const cleFocus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.cle : null;
    const defilement = contenu.scrollTop;

    argent.textContent = `${etat.argent} pièces`;
    for (const o of onglets) {
      const actif = o.dataset.onglet === ongletActif;
      o.classList.toggle('actif', actif);
      o.setAttribute('aria-selected', String(actif));
    }
    dessinerStock();
    contenu.innerHTML = '';
    barreProgression = null;
    if (ongletActif === 'fabriquer') dessinerFabriquer();
    else if (ongletActif === 'acheter') dessinerAcheter();
    else dessinerAmeliorer();

    contenu.scrollTop = defilement;
    if (cleFocus) {
      const retrouve = panneau.querySelector(`[data-cle="${cleFocus}"]`);
      if (retrouve && !retrouve.disabled) retrouve.focus({ preventScroll: true });
      else if (retrouve) $('atelier-fermer').focus({ preventScroll: true });
    }
  }

  // Le résumé du stock : des petites pastilles « Cuivre 2/5 ».
  function dessinerStock() {
    stock.innerHTML = '';
    const max = capaciteStock(etat);
    const s = etat.atelier.stock;
    for (const [id, m] of Object.entries(MATERIAUX)) {
      stock.append(el('span', 'pastille', `${m.court.charAt(0).toUpperCase()}${m.court.slice(1)} ${s[id]}/${max}`));
    }
    for (const [id, r] of Object.entries(RECETTES)) {
      if (!recetteDebloquee(etat, id) && s[id] === 0) continue;
      stock.append(el('span', 'pastille objet', `${r.nom} ${s[id]}/${max}`));
    }
  }

  function dessinerFabriquer() {
    const a = etat.atelier;
    const client = clientAuComptoir(etat);

    // La fabrication en cours, avec sa barre.
    const p = progressionFabrication(etat);
    if (p) {
      const encours = el('div', 'carte-atelier en-cours');
      encours.append(el('div', 'carte-titre', `En cours : ${p.nom}`));
      const barre = el('div', 'barre');
      barreProgression = el('div');
      barre.append(barreProgression);
      encours.append(barre);
      contenu.append(encours);
      majProgression();
    }

    for (const [id, r] of Object.entries(RECETTES)) {
      const carte = el('div', 'carte-atelier');
      const titre = el('div', 'carte-titre', r.nom);
      if (client && client.commande === id) {
        carte.classList.add('commandee');
        titre.append(el('span', 'etiquette', `Commandé par ${client.nom}`));
      }
      carte.append(titre);

      if (!recetteDebloquee(etat, id)) {
        carte.classList.add('verrouillee');
        carte.append(el('div', 'carte-detail', `Verrouillé : il faut les ${AMELIORATIONS[r.plans].nom.toLowerCase()} (onglet Améliorer).`));
        contenu.append(carte);
        continue;
      }

      // Les ingrédients : on montre ce qu'on a (et en couleur ce qui manque).
      const ingredients = el('div', 'carte-detail');
      ingredients.append('Il faut : ');
      Object.entries(r.ingredients).forEach(([m, n], i) => {
        if (i > 0) ingredients.append(', ');
        const manque = a.stock[m] < n;
        const morceau = el('span', manque ? 'manque' : 'ok', `${n} ${MATERIAUX[m].court}${n > 1 && m !== 'bois' ? 's' : ''} (${a.stock[m]})`);
        ingredients.append(morceau);
      });
      carte.append(ingredients);
      carte.append(el('div', 'carte-detail', `Durée : ${dureeFabrication(etat, id)} s · Vente : ${r.prixVente} pièces · En stock : ${a.stock[id]}`));

      const verdict = peutFabriquer(etat, id);
      carte.append(bouton('Fabriquer', `fabriquer-${id}`, verdict.possible, () => surAction('fabriquer', id)));
      if (!verdict.possible) carte.append(el('div', 'carte-raison', verdict.raison));
      contenu.append(carte);
    }
  }

  function dessinerAcheter() {
    const max = capaciteStock(etat);
    for (const [id, m] of Object.entries(MATERIAUX)) {
      const carte = el('div', 'carte-atelier');
      carte.append(el('div', 'carte-titre', m.nom));
      carte.append(el('div', 'carte-detail', `Prix : ${m.prix} pièces · En stock : ${etat.atelier.stock[id]}/${max}`));
      const place = max - etat.atelier.stock[id];
      const ligne = el('div', 'ligne-boutons');
      ligne.append(bouton(`Acheter 1 (${m.prix})`, `acheter1-${id}`, place >= 1 && etat.argent >= m.prix, () => surAction('acheter', id, 1)));
      if (place > 1) {
        ligne.append(bouton(`Remplir : ${place} (${m.prix * place})`, `remplir-${id}`, etat.argent >= m.prix * place, () => surAction('acheter', id, place)));
      }
      carte.append(ligne);
      if (place === 0) carte.append(el('div', 'carte-raison', 'Plus de place : les étagères en donnent plus.'));
      else if (etat.argent < m.prix) carte.append(el('div', 'carte-raison', "Pas assez d'argent."));
      contenu.append(carte);
    }
  }

  function dessinerAmeliorer() {
    for (const [id, am] of Object.entries(AMELIORATIONS)) {
      const carte = el('div', 'carte-atelier');
      carte.append(el('div', 'carte-titre', am.nom));
      carte.append(el('div', 'carte-detail', am.description));
      if (possedeAmelioration(etat, id)) {
        carte.classList.add('installee');
        carte.append(el('div', 'etiquette-installee', 'Installé ✓'));
      } else {
        carte.append(bouton(`Acheter (${am.prix} pièces)`, `ameliorer-${id}`, etat.argent >= am.prix, () => surAction('ameliorer', id)));
        if (etat.argent < am.prix) carte.append(el('div', 'carte-raison', `Encore ${am.prix - etat.argent} pièces à gagner.`));
      }
      contenu.append(carte);
    }
  }

  // Met à jour la barre de la fabrication en cours (appelé à chaque image).
  function majProgression() {
    if (!barreProgression) return;
    const p = progressionFabrication(etat);
    if (p) barreProgression.style.width = `${Math.round(p.progression * 100)}%`;
  }

  return {
    ouvrir,
    fermer,
    rafraichir,
    majProgression,
    estOuvert: () => !panneau.hidden,
  };
}
