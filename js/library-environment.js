// Every image remains an original asset. Replace paths here without editing scenes.
export const libraryBackgrounds = Object.freeze({
  entrance: { path: 'assets/כניסה קסומה לספריית בין השורות.png', width: 1672, height: 941, position: 'center 18%' },
  panorama: { path: 'assets/ספרייה קסומה באור זהוב.png', width: 1672, height: 941, position: 'center center' },
  main: { path: 'assets/ספרייה קלאסית עם מדרגות לולייניות.png', width: 1024, height: 1536, position: 'left center' }
});
export function createLibraryEnvironment({ documentRef = document, schedule = globalThis.requestAnimationFrame || (action => { action(); return 0; }), cancel = globalThis.cancelAnimationFrame || (() => {}) } = {}) {
  const root = documentRef.getElementById('library-environment');
  const layers = root ? [...root.querySelectorAll('.environment-layer')] : [];
  let current = null, visible = -1, generation = 0, frame = null;
  function show(key) {
    if (!libraryBackgrounds[key] || current === key) return;
    current = key;
    if (!root || !layers.length) return;
    const ticket = ++generation;
    if (frame !== null) cancel(frame);
    const next = (visible + 1) % layers.length, layer = layers[next], image = layer.querySelector('img');
    root.dataset.background = key;
    image.style.objectPosition = libraryBackgrounds[key].position;
    image.onload = () => { if (ticket !== generation) return; frame = schedule(() => {
      if (ticket !== generation) return;
      layers.forEach((node, index) => node.classList.toggle('is-visible', index === next)); visible = next; frame = null;
    }); };
    image.onerror = () => { if (ticket === generation) root.dataset.assetError = key; };
    image.src = libraryBackgrounds[key].path;
    if (image.complete && image.naturalWidth) image.onload();
  }
  return { show, get current() { return current; } };
}
