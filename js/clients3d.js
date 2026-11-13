// =============================================================================
// clients3d.js — les clients de l'atelier, en 3D, sur la place (étape 2)
// -----------------------------------------------------------------------------
// La liste des clients est dans l'état du jeu (logique-atelier.js). Ici, on
// fait seulement correspondre un personnage 3D à chaque client :
//   - un nouveau client entre par le portail et va prendre sa place dans la file ;
//   - quand la file avance, il avance aussi ;
//   - une fois servi, il repart vers le portail et disparaît.
// (Ce fichier a été sorti de main.js dans la version 1.7, pour l'alléger.)
// =============================================================================

import { MONDE, clientPeutAvancer } from './logique.js';
import { creerHabitant, animerMarche, supprimerPersonnage } from './personnages.js';

const VITESSE_CLIENT = 2.2;

// « scene » : la scène de la place. Renvoie de quoi les faire vivre.
export function creerClients3d(scene) {
  const clients3d = new Map(); // numéro du client → { objet, chemin, place, partant }

  // Met les personnages d'accord avec la liste des clients du jeu.
  function synchroniser(clients) {
    const file = MONDE.clients.file;
    const presents = new Set();
    clients.forEach((client, place) => {
      presents.add(client.id);
      let c = clients3d.get(client.id);
      if (!c) {
        // Nouveau client : il apparaît devant le portail.
        const objet = creerHabitant(client.id);
        objet.position.set(MONDE.clients.entree.x, 0, MONDE.clients.entree.z);
        objet.rotation.y = Math.PI;
        scene.add(objet);
        c = { objet, chemin: [...MONDE.clients.chemin, file[place]], place, partant: false };
        clients3d.set(client.id, c);
      } else if (c.place !== place) {
        // La file a avancé : sa destination finale change.
        if (c.chemin.length === 0) c.chemin.push(file[place]);
        else c.chemin[c.chemin.length - 1] = file[place];
        c.place = place;
      }
    });
    // Les clients servis repartent par où ils sont venus.
    for (const [id, c] of clients3d) {
      if (!c.partant && !presents.has(id)) {
        c.partant = true;
        c.chemin = [...MONDE.clients.chemin].reverse().concat([MONDE.clients.entree]);
      }
    }
  }

  // Fait marcher les clients. « ferrus » : sa position s'il est sur la place
  // (les clients s'arrêtent poliment s'il est sur leur chemin), sinon null.
  // « tournerVers » : la fonction de main.js qui tourne un personnage en douceur.
  function animer(dt, ferrus, tournerVers) {
    for (const [id, c] of clients3d) {
      let vitesse = 0;
      const but = c.chemin[0];
      if (but) {
        const dx = but.x - c.objet.position.x;
        const dz = but.z - c.objet.position.z;
        const distance = Math.hypot(dx, dz);
        const pas = VITESSE_CLIENT * dt;
        const prochain = distance <= pas
          ? { x: but.x, z: but.z }
          : { x: c.objet.position.x + (dx / distance) * pas, z: c.objet.position.z + (dz / distance) * pas };
        const attend = ferrus !== null && !clientPeutAvancer(c.objet.position, prochain, ferrus);
        if (!attend) {
          if (distance <= pas) c.chemin.shift(); // étape du trajet atteinte
          else vitesse = VITESSE_CLIENT;
          c.objet.position.x = prochain.x;
          c.objet.position.z = prochain.z;
        }
        if (distance > 0.01) tournerVers(c.objet, Math.atan2(dx, dz), dt, 8);
      } else if (c.partant) {
        // Arrivé au portail : il quitte la place.
        supprimerPersonnage(c.objet);
        clients3d.delete(id);
        continue;
      } else {
        // En attente dans la file : il regarde vers le comptoir (vers le nord).
        tournerVers(c.objet, Math.PI, dt, 4);
      }
      animerMarche(c.objet, vitesse, dt);
    }
  }

  return {
    synchroniser,
    animer,
    nombre: () => clients3d.size,
    positions: () => [...clients3d.values()].map((c) => c.objet.position),
  };
}
