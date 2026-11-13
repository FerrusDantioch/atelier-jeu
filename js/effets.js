// =============================================================================
// effets.js — le halo lumineux de la qualité « Élevée » (version 1.7)
// -----------------------------------------------------------------------------
// En qualité « Élevée », l'image est retravaillée après avoir été dessinée :
// ce qui brille très fort (les lanternes, les fenêtres, les braises, les
// lucioles) déborde un peu sur ce qui l'entoure, comme une vraie lumière dans
// la nuit. C'est joli, mais cela demande plus de travail à la carte
// graphique : ce n'est donc ni en « Normale », ni en « Économie ».
//
// Les modules nécessaires (fournis avec Three.js, copiés dans lib/three/) ne
// sont chargés que si le joueur choisit cette qualité.
// =============================================================================

import * as THREE from '../lib/three/three.module.js';

// Prépare les effets. Renvoie une promesse de :
//   { dessiner(scene, camera, nuit), redimensionner(), liberer() }
// « nuit » : de 0 (plein jour) à 1 (pleine nuit, ou un lieu sombre).
export async function creerEffets(renderer) {
  const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('../lib/three/postprocessing/EffectComposer.js'),
    import('../lib/three/postprocessing/RenderPass.js'),
    import('../lib/three/postprocessing/UnrealBloomPass.js'),
    import('../lib/three/postprocessing/OutputPass.js'),
  ]);
  const taille = renderer.getDrawingBufferSize(new THREE.Vector2());
  // L'image de travail : plus précise que l'écran (pour garder les lumières
  // très fortes), et lissée (pas d'escaliers sur les bords).
  const cible = new THREE.WebGLRenderTarget(taille.x, taille.y, { type: THREE.HalfFloatType, samples: 4 });
  const atelier = new EffectComposer(renderer, cible);
  const dessin = new RenderPass(null, null);
  const halo = new UnrealBloomPass(new THREE.Vector2(taille.x / 2, taille.y / 2), 0.4, 0.55, 1.0);
  atelier.addPass(dessin);
  atelier.addPass(halo);
  atelier.addPass(new OutputPass()); // la correction tonale et les couleurs de l'écran
  return {
    dessiner(scene, camera, nuit) {
      dessin.scene = scene;
      dessin.camera = camera;
      // Le jour, seul ce qui est vraiment éblouissant fait un halo (sinon tout
      // le sol au soleil baverait) ; la nuit, les lanternes suffisent.
      halo.threshold = 2.4 - 1.65 * nuit;
      halo.strength = 0.25 + 0.3 * nuit;
      atelier.render();
    },
    redimensionner() {
      const t = renderer.getDrawingBufferSize(new THREE.Vector2());
      atelier.setPixelRatio(renderer.getPixelRatio());
      atelier.setSize(t.x / renderer.getPixelRatio(), t.y / renderer.getPixelRatio());
    },
    liberer() {
      atelier.dispose();
      cible.dispose();
    },
  };
}
