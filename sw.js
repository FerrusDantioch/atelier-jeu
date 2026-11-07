// =============================================================================
// sw.js — le « service worker » : il permet de jouer SANS connexion (étape 4)
// -----------------------------------------------------------------------------
// Un service worker est un petit programme que le navigateur garde de côté.
// Il se place entre le jeu et internet :
//   - avec une connexion, il télécharge toujours la version la plus récente
//     du jeu (et en garde une copie) : les mises à jour arrivent tout de suite ;
//   - sans connexion (dans le métro, en avion…), il donne la copie gardée :
//     le jeu se lance quand même.
// C'est aussi ce qui permet d'« installer » le jeu sur un téléphone Android,
// comme une application.
//
// À chaque nouvelle version du jeu, on change VERSION ci-dessous (la même que
// dans package.json et js/logique-reglages.js) : les anciennes copies sont
// alors effacées.
// =============================================================================

const VERSION = '1.5.0';
const NOM_CACHE = `cuivrebourg-${VERSION}`;

// Tous les fichiers nécessaires pour jouer, gardés dès l'installation.
const FICHIERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/apple-touch-icon.png',
  'lib/three/three.module.js',
  'lib/three/three.core.js',
  'js/commandes.js',
  'js/decor-zones.js',
  'js/decor.js',
  'js/eau.js',
  'js/decor-gare.js',
  'js/decor-mine.js',
  'js/decor-galerie.js',
  'js/saisons.js',
  'js/vie.js',
  'js/formes.js',
  'js/interface-atelier.js',
  'js/interface-options.js',
  'js/interface.js',
  'js/logique-atelier.js',
  'js/logique-commandes.js',
  'js/logique-galerie.js',
  'js/logique-musique.js',
  'js/logique-quetes.js',
  'js/logique-reglages.js',
  'js/logique-saisons.js',
  'js/logique-sauvegarde.js',
  'js/logique-temps.js',
  'js/logique-zones.js',
  'js/logique.js',
  'js/main.js',
  'js/musique.js',
  'js/personnages.js',
];

// Installation : on garde une copie de tous les fichiers.
self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches.open(NOM_CACHE)
      .then((cache) => cache.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// Activation : on efface les copies des anciennes versions.
self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n.startsWith('cuivrebourg-') && n !== NOM_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Chaque fichier demandé : d'abord internet (la version la plus récente),
// et seulement en cas d'échec, la copie gardée.
self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  const adresse = new URL(requete.url);
  // On ne s'occupe que des fichiers du jeu lui-même (pas des autres sites),
  // et pas de la grosse archive .zip ni des captures d'écran.
  if (requete.method !== 'GET' || adresse.origin !== self.location.origin) return;
  if (adresse.pathname.endsWith('.zip') || adresse.pathname.includes('/captures/')) return;

  evenement.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse.ok && reponse.type === 'basic') {
          const copie = reponse.clone();
          caches.open(NOM_CACHE).then((cache) => cache.put(requete, copie)).catch(() => {});
        }
        return reponse;
      })
      .catch(() => caches.match(requete, { ignoreSearch: true })
        .then((gardee) => gardee || (requete.mode === 'navigate' ? caches.match('index.html') : undefined))
        .then((reponse) => reponse || new Response('Hors ligne', { status: 503, statusText: 'Hors ligne' }))),
  );
});
