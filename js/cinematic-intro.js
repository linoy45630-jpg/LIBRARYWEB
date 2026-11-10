import { approved } from './content.js';
import { proposedVideoLink } from './provisional-content.js';
import { normalizeDialogue } from './dialogue-data.js';

export const introScenes = [
  { speaker: 'owl', displayText: approved.scenes[0].lines[0], expression: 'idle', background: 'entrance', scene: 1 },
  { speaker: 'tuli', displayText: approved.scenes[1].lines[0], expression: 'excited', background: 'panorama', scene: 2 },
  { speaker: 'tuli', displayText: approved.scenes[2].lines[0], expression: 'confused', background: 'panorama', scene: 2 },
  { speaker: 'owl', displayText: proposedVideoLink, expression: 'encouraging', proposed: true, background: 'main', scene: 3 }
].map(normalizeDialogue);

// No timed dialogue advancement. Speech completion or the learner advances scenes.
export function createIntroSequence({ onScene, onFinish = () => {}, onCancel = () => {}, onPause = () => {}, onResume = () => {} }) {
  let index = 0, generation = 0, running = false, paused = false, finished = false, pendingEnd = false;
  function show() {
    const ticket = ++generation;
    onScene({ ...introScenes[index], onComplete: () => complete(ticket) }, index);
  }
  function next() {
    if (!running || paused) return;
    pendingEnd = false;
    if (index < introScenes.length - 1) { index++; show(); }
    else { generation++; running = false; finished = true; onFinish(); }
  }
  function complete(ticket) { if (ticket !== generation || !running) return; if (paused) pendingEnd = true; else next(); }
  return {
    get index() { return index; }, get paused() { return paused; }, get finished() { return finished; },
    start() { onCancel(); index = 0; running = true; paused = false; finished = false; pendingEnd = false; show(); },
    next,
    pause() { if (!running || paused) return; paused = true; onPause(); },
    resume() { if (!running || !paused) return; paused = false; onResume(); if (pendingEnd) next(); },
    skip() { generation++; running = false; paused = false; pendingEnd = false; finished = true; onCancel(); onFinish(); },
    cancel() { generation++; running = false; paused = false; pendingEnd = false; onCancel(); }
  };
}
