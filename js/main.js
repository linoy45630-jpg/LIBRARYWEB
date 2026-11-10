import { initDialogueController } from './dialogue-controller.js';
import { initVoicePreview, voicePreviewEnabled } from './voice-preview.js';
import { approved } from './content.js';
import { sampleBook, introMedia } from './provisional-content.js';
import { createBookCard, createDialogue } from './components.js';
import { initSecret1 } from './secret-1.js';
import { initSecret2 } from './secret-2.js';
import { initSecret3 } from './secret-3.js';
import { initLearningFlow } from './learning-flow.js';
import { initAssessment } from './assessment.js';

document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = approved[node.dataset.copy]; });
document.querySelectorAll('[data-dialogue]').forEach(node => node.append(createDialogue(approved[node.dataset.dialogue])));
document.querySelectorAll('[data-book-card]').forEach(node => node.append(createBookCard(sampleBook)));
approved.scenes.forEach((scene, index) => {
  const article = document.createElement('article'); article.className = 'story-scene';
  const label = document.createElement('h3'); label.textContent = (index + 1) + ' · ' + scene.speaker; article.append(label);
  scene.lines.forEach(line => { const p = document.createElement('p'); p.textContent = line; article.append(p); });
  document.querySelector('#opening-scenes').append(article);
});
document.querySelector('#secret-3-tuli-introduction').append(createDialogue(approved.secret3TuliIntroduction, 'תולי'));
approved.completionSummary.forEach(text => { const li = document.createElement('li'); li.textContent = text; document.querySelector('#completion-summary').append(li); });

// Future media replaces the storyboard only when a real video is supplied.
if (introMedia.video) {
  const fragment = document.querySelector('#intro-video-template').content.cloneNode(true);
  const video = fragment.querySelector('video'); video.src = introMedia.video;
  if (introMedia.poster) video.poster = introMedia.poster;
  const track = fragment.querySelector('track');
  if (introMedia.captions) track.src = introMedia.captions; else track.remove();
  document.querySelector('#intro-media').append(fragment);
  document.querySelector('#intro-storyboard').hidden = true;
  document.querySelector('#intro-continue').hidden = false;
  document.querySelector('#intro-pause').hidden = true;
}
document.querySelector('#intro-replay').addEventListener('click', () => {
  const video = document.querySelector('#intro-media video');
  if (video) { video.currentTime = 0; video.play().catch(() => video.focus()); }

});
const flow = initLearningFlow();
initSecret1({ onComplete: () => flow.complete('secret-1') });
initSecret2({ onComplete: () => flow.complete('secret-2') });
initSecret3({ onComplete: () => flow.complete('secret-3') });
initAssessment({ onComplete: () => { flow.complete('assessment'); flow.visit('completion'); } });

const dialogue = initDialogueController({ video: !!introMedia.video });
if (voicePreviewEnabled()) initVoicePreview(dialogue.speech);
