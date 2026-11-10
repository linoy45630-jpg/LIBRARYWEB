// Optional presentation channel: no learning state depends on narration.
const listeners = new Set();
export function subscribeDialogue(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function presentDialogue(stage, entries, options = {}) {
  const lines = (Array.isArray(entries) ? entries : [entries]).map(normalizeDialogue);
  listeners.forEach(listener => listener({ stage, lines, ...options }));
}
import { normalizeDialogue } from './dialogue-data.js';
