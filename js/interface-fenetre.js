// =============================================================================
// interface-fenetre.js — une « fenêtre » toute prête (version 1.6)
// -----------------------------------------------------------------------------
// Le journal, la garde-robe, la vitrine, le petit jeu d'assemblage et le
// télescope s'affichent dans la même sorte de fenêtre que l'album : un cadre
// de parchemin au milieu de l'écran, un titre, « Jeu en pause », un bouton
// « Fermer », parfois des onglets, et un contenu qui défile.
// Ce fichier fabrique ces fenêtres, pour ne pas tout réécrire à chaque fois.
// Le jeu est en pause tant qu'une fenêtre est ouverte (main.js le sait grâce
// à « estOuvert »). Échap la referme.
// =============================================================================

// Petit outil : crée un élément HTML avec une classe et un texte.
export function el(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

// Un bouton d'action, comme ceux de l'établi.
export function boutonAction(texte, actif, surClic, classe = 'bouton-action') {
  const b = el('button', classe, texte);
  b.type = 'button';
  b.disabled = !actif;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    surClic();
  });
  return b;
}

// Crée une fenêtre.
//   - id, titre : pour la reconnaître ;
//   - onglets : [{ id, nom }] ou null ;
//   - largeur : en pixels, au plus ;
//   - dessiner(contenu, ongletActif) : remplit la fenêtre ;
//   - touche : une lettre qui ouvre et ferme la fenêtre (facultatif) ;
//   - estDisponible() : peut-on l'ouvrir maintenant ? (pour la touche)
//   - surOuverture(), surFermeture().
export function creerFenetre({ id, titre, onglets = null, largeur = 640, dessiner, touche = null, estDisponible = () => true, surOuverture = () => {}, surFermeture = () => {} }) {
  const panneau = el('div', 'panneau fenetre');
  panneau.id = id;
  panneau.setAttribute('role', 'dialog');
  panneau.setAttribute('aria-modal', 'true');
  panneau.setAttribute('aria-labelledby', `${id}-titre`);
  panneau.style.width = `min(calc(100% - 24px), ${largeur}px)`;
  panneau.hidden = true;

  const entete = el('div', 'atelier-entete');
  const h2 = el('h2', null, titre);
  h2.id = `${id}-titre`;
  const fermerBouton = el('button', 'bouton-fermer', 'Fermer');
  fermerBouton.type = 'button';
  entete.append(h2, el('span', 'options-pause', 'Jeu en pause'), fermerBouton);
  panneau.append(entete);

  let ongletActif = onglets ? onglets[0].id : null;
  const boutonsOnglets = [];
  if (onglets) {
    const barre = el('div', 'onglets');
    barre.setAttribute('role', 'tablist');
    for (const o of onglets) {
      const b = el('button', null, o.nom);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => {
        ongletActif = o.id;
        rafraichir();
        contenu.scrollTop = 0;
      });
      boutonsOnglets.push({ id: o.id, bouton: b });
      barre.append(b);
    }
    panneau.append(barre);
  }
  const contenu = el('div', 'defilable fenetre-contenu');
  panneau.append(contenu);
  document.body.append(panneau);

  let ouvert = false;
  function ouvrir(onglet) {
    if (onglet) ongletActif = onglet;
    if (!ouvert) {
      ouvert = true;
      panneau.hidden = false;
      document.body.classList.add('options-ouvert');
      surOuverture();
    }
    contenu.scrollTop = 0;
    rafraichir();
    const actif = boutonsOnglets.find((o) => o.id === ongletActif);
    (actif ? actif.bouton : fermerBouton).focus({ preventScroll: true });
  }
  function fermer() {
    if (!ouvert) return;
    ouvert = false;
    panneau.hidden = true;
    document.body.classList.remove('options-ouvert');
    if (document.activeElement) document.activeElement.blur();
    surFermeture();
  }
  function rafraichir() {
    if (!ouvert) return;
    for (const o of boutonsOnglets) {
      const actif = o.id === ongletActif;
      o.bouton.classList.toggle('actif', actif);
      o.bouton.setAttribute('aria-selected', String(actif));
    }
    const defilement = contenu.scrollTop;
    contenu.innerHTML = '';
    dessiner(contenu, ongletActif);
    contenu.scrollTop = defilement;
  }
  fermerBouton.addEventListener('click', fermer);
  window.addEventListener('keydown', (e) => {
    const t = e.key.toLowerCase();
    if (ouvert && (t === 'escape' || (touche && t === touche))) {
      e.preventDefault();
      fermer();
    } else if (!ouvert && touche && t === touche && !e.repeat && estDisponible()) {
      e.preventDefault();
      ouvrir();
    }
  });

  return {
    ouvrir,
    fermer,
    rafraichir,
    estOuvert: () => ouvert,
    changerTitre: (texte) => { h2.textContent = texte; },
    element: panneau,
  };
}
