import { presentDialogue } from './dialogue-events.js';
import { approved } from './content.js';
import { sampleBook } from './provisional-content.js';
import { createDialogue } from './components.js';

export function initSecret2({ onComplete = () => {} } = {}) {
  const section = document.querySelector('#secret-2');
  const shelves = section.querySelector('#genre-shelves');
  const feedback = section.querySelector('#genre-feedback');
  const feedbackText = section.querySelector('#genre-feedback-text');
  const announcement = section.querySelector('#genre-announcement');
  const transition = section.querySelector('#secret-2-transition');
  const next = section.querySelector('#secret-2-next');
  const genreField = section.querySelector('.book-field-genre');
  let completed = false;
  let lastSelection = null;
  let attempts = 0;
  let incorrectAttempts = 0;

  // Native buttons provide Enter/Space activation. The shelf artwork is unchanged.
  const buttons = approved.genres.map(genre => {
    const shelf = document.createElement('button');
    shelf.type = 'button'; shelf.className = 'genre-shelf';
    shelf.setAttribute('aria-label', `מדף ${genre}`);
    shelf.setAttribute('aria-pressed', 'false');
    shelf.setAttribute('aria-controls', 'genre-feedback');
    const sign = document.createElement('span'); sign.className = 'shelf-sign'; sign.textContent = genre;
    const spines = document.createElement('span'); spines.className = 'decorative-spines'; spines.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 7; i++) spines.append(document.createElement('span'));
    const state = document.createElement('span'); state.className = 'genre-state';
    shelf.append(sign, spines, state); shelves.append(shelf);
    shelf.addEventListener('click', () => {
      // Keep success immutable, including for dispatched/programmatic clicks.
      if (completed) return;
      lastSelection = shelf;
      attempts += 1;
      buttons.forEach(button => {
        button.classList.toggle('is-incorrect', false);
        button.setAttribute('aria-pressed', 'false');
        button.querySelector('.genre-state').textContent = '';
      });
      const correct = genre === sampleBook.genre;
      shelf.setAttribute('aria-pressed', 'true');
      shelf.classList.toggle('is-incorrect', !correct);
      shelf.classList.toggle('is-correct', correct);
      state.textContent = correct ? 'המדף המתאים' : 'נסו שוב';
      feedbackText.textContent = correct ? approved.secret2Correct : approved.secret2Incorrect;
      feedback.hidden = false;
      presentDialogue('secret-2', { character: 'owl', text: feedbackText.textContent, expression: correct ? 'encouraging' : 'thinking' });
      // Attempt number ensures repeated identical errors produce a changed live
      // region without changing or duplicating the visible approved dialogue.
      announcement.textContent = `ניסיון ${attempts}. ${feedbackText.textContent}`;
      if (!correct) {
        incorrectAttempts += 1;
        if (incorrectAttempts >= 2) genreField.classList.add('genre-hint');
        return;
      }
      completed = true;
      genreField.classList.toggle('genre-hint', false);
      genreField.classList.add('field-highlight');
      buttons.forEach(button => button.setAttribute('aria-disabled', 'true'));
      transition.append(createDialogue(approved.secret2TuliTransition, 'תולי'), createDialogue(approved.secret2OwlTransition));
      transition.hidden = false;
      presentDialogue('secret-2', [approved.secret2Correct, { character: 'tuli', text: approved.secret2TuliTransition, expression: 'excited' }, approved.secret2OwlTransition]);
      next.disabled = false;
      onComplete();
    });
    return shelf;
  });

  // Dismissible inline feedback keeps the book card and shelf signs visible.
  // It does not use or interfere with Secret 1's modal dialog or focus handlers.
  section.querySelector('#close-genre-feedback').addEventListener('click', () => {
    feedback.hidden = true;
    lastSelection?.focus({ preventScroll: true });
  });
  next.addEventListener('click', () => {
    if (!completed) return;
    window.location.hash = 'secret-3';
    const heading = document.querySelector('#secret-3-title');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  });
}
