// =============================================================================
// interface.js — tout ce qui s'affiche PAR-DESSUS la 3D
// -----------------------------------------------------------------------------
// Le compteur d'argent, le cadre « Objectif », les petits messages temporaires,
// l'aide d'interaction et la boîte de dialogue. Ce sont des éléments HTML
// classiques (décrits dans index.html, mis en forme par css/style.css).
// =============================================================================

const $ = (id) => document.getElementById(id);

export function creerInterface() {
  const elements = {
    haut: $('haut'),
    argent: $('argent-valeur'),
    fabrication: $('fabrication'),
    fabricationNom: $('fabrication-nom'),
    fabricationBarre: $('fabrication-barre'),
    objectif: $('objectif-texte'),
    messages: $('messages'),
    indice: $('indice'),
    boutonInteragir: $('bouton-interagir'),
    dialogue: $('dialogue'),
    orateur: $('dialogue-orateur'),
    texte: $('dialogue-texte'),
    choix: $('dialogue-choix'),
    suite: $('dialogue-suite'),
  };

  // L'état de la boîte de dialogue en cours (null = aucune).
  let dialogue = null;

  // --- Compteur d'argent et objectif ------------------------------------------------
  function majArgent(montant) {
    elements.argent.textContent = String(montant);
  }
  function majObjectif(texte) {
    if (elements.objectif.textContent !== texte) elements.objectif.textContent = texte;
  }

  // --- Fabrication en cours (étape 2) ------------------------------------------------------
  // « p » vient de progressionFabrication : { nom, progression } ou null.
  let derniereLargeur = -1;
  function majFabrication(p) {
    if (!p) {
      if (!elements.fabrication.hidden) elements.fabrication.hidden = true;
      derniereLargeur = -1;
      return;
    }
    if (elements.fabrication.hidden) elements.fabrication.hidden = false;
    if (elements.fabricationNom.textContent !== p.nom) elements.fabricationNom.textContent = p.nom;
    // La barre se remplit doucement, par pas de 1 %.
    const largeur = Math.round(p.progression * 100);
    if (largeur !== derniereLargeur) {
      elements.fabricationBarre.style.width = `${largeur}%`;
      derniereLargeur = largeur;
    }
  }

  // --- Petits messages temporaires ------------------------------------------------------
  // Un message apparaît en fondu, reste 2,6 secondes, puis disparaît en fondu.
  function afficherMessage(texte) {
    // Pas plus de 3 messages à la fois : on retire le plus ancien.
    while (elements.messages.children.length >= 3) elements.messages.firstElementChild.remove();
    // Les messages se placent juste sous le bandeau du haut (argent + objectif),
    // quelle que soit sa hauteur : ils ne le recouvrent jamais.
    elements.messages.style.top = `${elements.haut.getBoundingClientRect().bottom + 10}px`;
    const message = document.createElement('div');
    message.className = 'message';
    message.textContent = texte;
    elements.messages.appendChild(message);
    requestAnimationFrame(() => requestAnimationFrame(() => message.classList.add('visible')));
    setTimeout(() => {
      message.classList.remove('visible');
      setTimeout(() => message.remove(), 450);
    }, 2600);
  }

  // --- Aide d'interaction (« E : Parler à Odile ») -----------------------------------------
  let dernierIndice = null;
  function majIndice(libelle) {
    if (libelle === dernierIndice) return; // rien n'a changé : on ne touche à rien
    dernierIndice = libelle;
    if (!libelle) {
      elements.indice.hidden = true;
      elements.boutonInteragir.classList.remove('disponible');
      return;
    }
    const tactile = document.body.classList.contains('tactile');
    elements.indice.innerHTML = '';
    if (!tactile) {
      const kbd = document.createElement('kbd');
      kbd.textContent = 'E';
      elements.indice.append(kbd, ' ');
    }
    elements.indice.append(libelle);
    elements.indice.hidden = false;
    elements.boutonInteragir.classList.add('disponible');
  }

  // --- Boîte de dialogue -----------------------------------------------------------------
  // ouvrirDialogue renvoie une « promesse » : elle se termine quand le joueur a
  // fait son choix, et donne l'action choisie (par exemple 'accepter').
  function ouvrirDialogue(definition) {
    return new Promise((terminer) => {
      dialogue = { definition, page: 0, selection: 0, terminer };
      document.body.classList.add('dialogue-ouvert');
      elements.dialogue.hidden = false;
      afficherPage();
    });
  }

  function afficherPage() {
    const { definition, page } = dialogue;
    const dernierePage = page === definition.repliques.length - 1;
    elements.orateur.textContent = definition.orateur;
    elements.texte.textContent = definition.repliques[page];
    elements.choix.innerHTML = '';
    elements.suite.hidden = dernierePage;
    if (dernierePage) {
      definition.choix.forEach((choix) => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'choix';
        bouton.textContent = choix.texte;
        bouton.tabIndex = -1; // le choix se fait avec E/Espace, les flèches, la souris ou le doigt
        bouton.addEventListener('click', (e) => {
          e.stopPropagation();
          fermerDialogue(choix.action);
        });
        elements.choix.appendChild(bouton);
      });
      majSelection();
    }
  }

  function majSelection() {
    [...elements.choix.children].forEach((bouton, index) => {
      bouton.classList.toggle('selectionne', index === dialogue.selection);
    });
  }

  function fermerDialogue(action) {
    if (!dialogue) return;
    const terminer = dialogue.terminer;
    dialogue = null;
    elements.dialogue.hidden = true;
    document.body.classList.remove('dialogue-ouvert');
    terminer(action);
  }

  // Passer à la réplique suivante, ou valider le choix sélectionné.
  function avancerDialogue() {
    if (!dialogue) return;
    const { definition } = dialogue;
    if (dialogue.page < definition.repliques.length - 1) {
      dialogue.page += 1;
      afficherPage();
    } else {
      fermerDialogue(definition.choix[dialogue.selection].action);
    }
  }

  // Changer le choix sélectionné (sens = -1 ou +1).
  function changerChoix(sens) {
    if (!dialogue || sens === 0) return;
    const nombre = dialogue.definition.choix.length;
    if (dialogue.page !== dialogue.definition.repliques.length - 1 || nombre < 2) return;
    dialogue.selection = (dialogue.selection + sens + nombre) % nombre;
    majSelection();
  }

  // Toucher (ou cliquer) la boîte fait passer à la suite… sauf sur la dernière
  // page, où il faut toucher un des choix (pour ne pas accepter par erreur).
  elements.dialogue.addEventListener('click', () => {
    if (dialogue && dialogue.page < dialogue.definition.repliques.length - 1) avancerDialogue();
  });

  return {
    majArgent,
    majObjectif,
    majFabrication,
    afficherMessage,
    majIndice,
    ouvrirDialogue,
    avancerDialogue,
    changerChoix,
    dialogueOuvert: () => dialogue !== null,
  };
}
