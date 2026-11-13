// =============================================================================
// copier-three.js — copie Three.js depuis node_modules vers lib/three/
// -----------------------------------------------------------------------------
// Pourquoi ? Le jeu ne doit pas dépendre d'un site extérieur (CDN) ni du
// dossier node_modules (qui n'est pas envoyé sur GitHub). On garde donc une
// copie des fichiers nécessaires dans le projet.
//
// Depuis les versions récentes, three.module.js charge three.core.js : il faut
// donc copier LES DEUX fichiers, sinon le jeu ne démarre pas.
//
// Ce script est lancé automatiquement après « npm install ».
// Pour le relancer à la main : npm run copier-three
// =============================================================================

import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(racine, 'node_modules', 'three');
const destination = join(racine, 'lib', 'three');

if (!existsSync(source)) {
  console.error('Three.js n\'est pas installé. Lance d\'abord : npm install');
  process.exit(1);
}

const fichiers = [
  ['build/three.module.js', 'three.module.js'],
  ['build/three.core.js', 'three.core.js'],
  ['LICENSE', 'LICENSE'],
];

mkdirSync(destination, { recursive: true });
for (const [depuis, vers] of fichiers) {
  copyFileSync(join(source, depuis), join(destination, vers));
}

// Version 1.7 : les « effets » de la qualité « Élevée » (le halo lumineux
// autour des lanternes). Ce sont des modules fournis avec Three.js, dans son
// dossier d'exemples. Ils chargent Three.js par son nom (« three ») : un
// navigateur ne sait pas le trouver tout seul, alors on remplace ce nom par le
// chemin de notre copie.
const effets = [
  'postprocessing/EffectComposer.js',
  'postprocessing/Pass.js',
  'postprocessing/RenderPass.js',
  'postprocessing/ShaderPass.js',
  'postprocessing/MaskPass.js',
  'postprocessing/UnrealBloomPass.js',
  'postprocessing/OutputPass.js',
  'shaders/CopyShader.js',
  'shaders/LuminosityHighPassShader.js',
  'shaders/OutputShader.js',
];
for (const f of effets) {
  const texte = readFileSync(join(source, 'examples', 'jsm', f), 'utf8').replace(/from\s+'three'/g, "from '../three.module.js'");
  for (const m of texte.matchAll(/from\s+'(\.\.?\/[^']+)'/g)) {
    const voulu = join(dirname(f), m[1]).replaceAll('\\', '/');
    if (voulu !== 'three.module.js' && !effets.includes(voulu)) {
      console.error(`Attention : ${f} a besoin de ${voulu}, qui n'est pas copié.`);
      process.exit(1);
    }
  }
  mkdirSync(dirname(join(destination, f)), { recursive: true });
  writeFileSync(join(destination, f), texte);
}

// Vérification : three.module.js ne doit charger que des fichiers qu'on a copiés.
const module = readFileSync(join(destination, 'three.module.js'), 'utf8');
const imports = [...module.matchAll(/from\s+'(\.\/[^']+)'/g)].map((m) => m[1].slice(2));
const manquants = [...new Set(imports)].filter((f) => !existsSync(join(destination, f)));
if (manquants.length > 0) {
  console.error('Attention, fichiers manquants pour Three.js :', manquants.join(', '));
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).version;
console.log(`Three.js ${version} copié dans lib/three/ (${fichiers.length + effets.length} fichiers).`);
