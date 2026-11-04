// =============================================================================
// serveur.js — un tout petit serveur web pour jouer sur son ordinateur
// -----------------------------------------------------------------------------
// Pourquoi un serveur ? Les navigateurs refusent de charger les modules
// JavaScript d'une page ouverte directement par double-clic (adresse
// « file:// »). Ce serveur sert les fichiers du jeu à l'adresse
// http://localhost:8080 .
//
// Lancement : npm start   (ou : node serveur.js)
// Arrêt     : Ctrl + C dans le terminal.
// Il n'a besoin d'aucune installation : seulement Node.js.
// =============================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 8080;

// Le « type » de chaque fichier, pour que le navigateur sache le lire.
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
};

const serveur = createServer(async (requete, reponse) => {
  try {
    // On retire les paramètres (?...) et on décode les accents.
    let chemin = decodeURIComponent(new URL(requete.url, 'http://x').pathname);
    if (chemin.endsWith('/')) chemin += 'index.html';

    // Sécurité : on refuse de sortir du dossier du jeu, et de servir node_modules.
    const fichier = normalize(join(dossier, chemin));
    if (!fichier.startsWith(dossier + sep) || fichier.includes(`${sep}node_modules${sep}`)) {
      reponse.writeHead(403).end('Accès refusé');
      return;
    }

    const infos = await stat(fichier);
    if (!infos.isFile()) throw new Error('pas un fichier');

    const contenu = await readFile(fichier);
    reponse.writeHead(200, {
      'Content-Type': types[extname(fichier).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store', // toujours la dernière version pendant qu'on développe
    });
    reponse.end(contenu);
  } catch {
    reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Fichier introuvable');
  }
});

serveur.listen(port, () => {
  console.log('');
  console.log("  L'Atelier de Cuivrebourg est lancé !");
  console.log(`  Sur cet ordinateur : http://localhost:${port}`);
  // Les adresses pour un téléphone connecté au même réseau Wi-Fi.
  for (const liste of Object.values(networkInterfaces())) {
    for (const adresse of liste || []) {
      if (adresse.family === 'IPv4' && !adresse.internal) {
        console.log(`  Sur un téléphone du même Wi-Fi : http://${adresse.address}:${port}`);
      }
    }
  }
  console.log('  Pour arrêter : Ctrl + C');
  console.log('');
});

serveur.on('error', (erreur) => {
  if (erreur.code === 'EADDRINUSE') {
    console.error(`Le port ${port} est déjà utilisé. Ferme l'autre serveur, ou lance : PORT=8081 npm start`);
  } else {
    console.error('Le serveur n\'a pas pu démarrer :', erreur.message);
  }
  process.exit(1);
});
