// =============================================================================
// creer-zip.js — fabrique une archive .zip de sauvegarde du projet
// -----------------------------------------------------------------------------
// Crée « atelier-cuivrebourg.zip » avec tous les fichiers du jeu, SAUF le
// dossier node_modules (trop gros, et réinstallable avec « npm install ») et
// les anciennes archives .zip.
//
// Lancement : npm run zip
// Aucune installation nécessaire : on utilise seulement ce que Node.js fournit.
// =============================================================================

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const nomArchive = 'atelier-cuivrebourg.zip';
const ignores = new Set(['node_modules', '.git']);

// Liste tous les fichiers du projet (en descendant dans les sous-dossiers).
function listerFichiers(dossier) {
  const resultat = [];
  for (const nom of readdirSync(dossier).sort()) {
    if (ignores.has(nom) || nom.endsWith('.zip')) continue;
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) resultat.push(...listerFichiers(chemin));
    else resultat.push(chemin);
  }
  return resultat;
}

// « CRC32 » : une empreinte qui permet de vérifier qu'un fichier n'est pas abîmé.
const tableCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(donnees) {
  let crc = 0xffffffff;
  for (const octet of donnees) crc = tableCrc[(crc ^ octet) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Date au format des fichiers zip (format « DOS »).
function dateDos(date) {
  const heure = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const jour = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { heure, jour };
}

const entrees = [];
const morceaux = [];
let position = 0;

for (const fichier of listerFichiers(racine)) {
  // Dans l'archive, tout est rangé dans un dossier « atelier-cuivrebourg/ ».
  const nom = Buffer.from(`atelier-cuivrebourg/${relative(racine, fichier).split(sep).join('/')}`, 'utf8');
  const donnees = readFileSync(fichier);
  const compresse = deflateRawSync(donnees, { level: 9 });
  const crc = crc32(donnees);
  const { heure, jour } = dateDos(statSync(fichier).mtime);

  // En-tête local de chaque fichier.
  const entete = Buffer.alloc(30);
  entete.writeUInt32LE(0x04034b50, 0);
  entete.writeUInt16LE(20, 4);          // version nécessaire
  entete.writeUInt16LE(0x0800, 6);      // noms en UTF-8 (accents)
  entete.writeUInt16LE(8, 8);           // compression « deflate »
  entete.writeUInt16LE(heure, 10);
  entete.writeUInt16LE(jour, 12);
  entete.writeUInt32LE(crc, 14);
  entete.writeUInt32LE(compresse.length, 18);
  entete.writeUInt32LE(donnees.length, 22);
  entete.writeUInt16LE(nom.length, 26);
  entete.writeUInt16LE(0, 28);

  morceaux.push(entete, nom, compresse);
  entrees.push({ nom, crc, taille: donnees.length, tailleCompressee: compresse.length, heure, jour, position });
  position += entete.length + nom.length + compresse.length;
}

// Le « sommaire » de l'archive, à la fin du fichier.
const debutSommaire = position;
for (const e of entrees) {
  const ligne = Buffer.alloc(46);
  ligne.writeUInt32LE(0x02014b50, 0);
  ligne.writeUInt16LE(20, 4);
  ligne.writeUInt16LE(20, 6);
  ligne.writeUInt16LE(0x0800, 8);
  ligne.writeUInt16LE(8, 10);
  ligne.writeUInt16LE(e.heure, 12);
  ligne.writeUInt16LE(e.jour, 14);
  ligne.writeUInt32LE(e.crc, 16);
  ligne.writeUInt32LE(e.tailleCompressee, 20);
  ligne.writeUInt32LE(e.taille, 24);
  ligne.writeUInt16LE(e.nom.length, 28);
  ligne.writeUInt32LE(e.position, 42);
  morceaux.push(ligne, e.nom);
  position += ligne.length + e.nom.length;
}

const fin = Buffer.alloc(22);
fin.writeUInt32LE(0x06054b50, 0);
fin.writeUInt16LE(entrees.length, 8);
fin.writeUInt16LE(entrees.length, 10);
fin.writeUInt32LE(position - debutSommaire, 12);
fin.writeUInt32LE(debutSommaire, 16);
morceaux.push(fin);

const archive = Buffer.concat(morceaux);
writeFileSync(join(racine, nomArchive), archive);
console.log(`Archive créée : ${nomArchive} (${entrees.length} fichiers, ${Math.round(archive.length / 1024)} Ko)`);
