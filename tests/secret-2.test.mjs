import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTestDocument } from './dom-fixture.mjs';
import { approved } from '../js/content.js';
import { sampleBook } from '../js/provisional-content.js';
import { createBookCard } from '../js/components.js';
import { initSecret2 } from '../js/secret-2.js';

// Exercises production event handlers. Native keyboard/pointer input and CSS
// layout must be verified separately in a real desktop/mobile browser.
export async function runSecret2Tests() {
  const document = createTestDocument();
  globalThis.document = document;
  globalThis.window = { location: { hash: '' } };
  const section = document.createElement('section'); section.id = 'secret-2'; document.append(section);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const nodes = {};
  for (const id of ['genre-shelves', 'genre-feedback', 'genre-feedback-text', 'genre-announcement', 'secret-2-transition', 'secret-2-next', 'close-genre-feedback', 'secret-3-title']) {
    assert.ok(html.includes(`id="${id}"`), `Missing markup: ${id}`);
    const node = document.createElement(id.includes('next') || id.includes('close') ? 'button' : 'div'); node.id = id; nodes[id] = node;
    (id === 'secret-3-title' ? document : section).append(node);
  }
  nodes['genre-feedback'].hidden = true; nodes['secret-2-transition'].hidden = true; nodes['secret-2-next'].disabled = true;
  section.append(createBookCard(sampleBook));
  let completionCalls = 0;
  initSecret2({ onComplete: () => { completionCalls += 1; } });
  const buttons = nodes['genre-shelves'].children;
  const field = section.querySelector('.book-field-genre');
  const hasClass = (element, name) => element.className.split(' ').includes(name);
  const results = [];
  const check = (test, action) => { action(); results.push({ test, passed: true }); };
  check('Book card displays fantasy and no invented publication year', () => {
    assert.equal(field.textContent, 'פנטזיה'); assert.equal(section.querySelector('.book-field-year').textContent, '—');
  });
  check('Four native shelf buttons with real Hebrew signs', () => {
    assert.equal(buttons.length, 4);
    assert.deepEqual(buttons.map(b => b.querySelector('.shelf-sign').textContent), ['בלשות', 'הרפתקאות', 'פנטזיה', 'ספרי מידע']);
    buttons.forEach(b => { assert.equal(b.tagName, 'button'); assert.equal(b.type, 'button'); assert.equal(b.disabled, false); });
  });
  check('Transition is initially locked, including dispatched clicks', () => {
    nodes['secret-2-next'].dispatch('click'); assert.equal(window.location.hash, ''); assert.ok(nodes['secret-2-transition'].hidden);
  });
  check('Wrong selection gives exact approved feedback without completing', () => {
    buttons[0].click(); assert.equal(nodes['genre-feedback-text'].textContent, approved.secret2Incorrect);
    assert.equal(nodes['genre-feedback'].hidden, false); assert.ok(nodes['secret-2-next'].disabled);
    assert.equal(hasClass(field, 'field-highlight'), false); assert.equal(hasClass(field, 'genre-hint'), false); assert.equal(completionCalls, 0); assert.ok(nodes['secret-2-transition'].hidden);
    assert.ok(hasClass(buttons[0], 'is-incorrect')); assert.equal(buttons[0].querySelector('.genre-state').textContent, 'נסו שוב');
  });
  check('Feedback dismissal returns focus to the attempted shelf', () => {
    nodes['close-genre-feedback'].click(); assert.ok(nodes['genre-feedback'].hidden); assert.equal(document.activeElement, buttons[0]);
  });
  check('Repeated wrong attempts remain available and are announced again', () => {
    let previous = nodes['genre-announcement'].textContent;
    for (const index of [0, 0, 1, 3, 1]) {
      buttons[index].click(); assert.equal(nodes['genre-feedback-text'].textContent, approved.secret2Incorrect);
      assert.notEqual(nodes['genre-announcement'].textContent, previous); previous = nodes['genre-announcement'].textContent;
      assert.ok(nodes['secret-2-next'].disabled); assert.ok(nodes['secret-2-transition'].hidden);
      buttons.forEach(b => assert.notEqual(b.getAttribute('aria-disabled'), 'true'));
      assert.equal(hasClass(buttons[2], 'is-correct'), false); assert.ok(hasClass(field, 'genre-hint')); assert.equal(completionCalls, 0);
    }
  });
  check('Correct selection highlights shelf and genre, with exact success text', () => {
    assert.equal(typeof approved.secret2Correct, 'string'); buttons[2].click();
    assert.equal(nodes['genre-feedback-text'].textContent, approved.secret2Correct);
    assert.ok(hasClass(buttons[2], 'is-correct')); assert.ok(hasClass(field, 'field-highlight'));
    assert.equal(buttons[2].getAttribute('aria-pressed'), 'true'); assert.equal(buttons[2].querySelector('.genre-state').textContent, 'המדף המתאים');
    assert.equal(buttons.filter(b => hasClass(b, 'is-incorrect')).length, 0);
  });
  check('Success unlocks transition and shows exact Tuli then owl dialogue', () => {
    assert.equal(nodes['secret-2-next'].disabled, false); assert.equal(nodes['secret-2-transition'].hidden, false);
    const dialogues = nodes['secret-2-transition'].children; assert.equal(dialogues.length, 2);
    assert.equal(dialogues[0].children[0].textContent, 'תולי'); assert.equal(dialogues[0].children[1].textContent, approved.secret2TuliTransition);
    assert.equal(dialogues[1].children[0].textContent, 'הינשופה'); assert.equal(dialogues[1].children[1].textContent, approved.secret2OwlTransition);
  });
  check('Closing success feedback preserves highlights and success', () => {
    nodes['close-genre-feedback'].click(); assert.ok(nodes['genre-feedback'].hidden);
    assert.ok(hasClass(buttons[2], 'is-correct')); assert.ok(hasClass(field, 'field-highlight'));
    assert.equal(document.activeElement, buttons[2]); assert.equal(nodes['secret-2-next'].disabled, false);
  });
  check('Subsequent selections cannot contradict success or duplicate dialogue', () => {
    const announcement = nodes['genre-announcement'].textContent;
    for (const button of buttons) { assert.equal(button.getAttribute('aria-disabled'), 'true'); button.dispatch('click'); }
    assert.equal(nodes['genre-feedback-text'].textContent, approved.secret2Correct);
    assert.equal(nodes['genre-announcement'].textContent, announcement); assert.ok(nodes['genre-feedback'].hidden);
    assert.equal(nodes['secret-2-transition'].children.length, 2); assert.equal(completionCalls, 1);
  });
  check('Enabled next button targets the existing Secret 3 heading', () => {
    nodes['secret-2-next'].click(); assert.equal(window.location.hash, 'secret-3'); assert.equal(document.activeElement, nodes['secret-3-title']);
  });
  const specification = await readFile(new URL('../docs/inspection/revised-spec-2026-11-09.txt', import.meta.url), 'utf8');
  for (const key of ['secret2Introduction', 'secret2Explanation', 'secret2Prompt', 'secret2Incorrect', 'secret2Correct', 'secret2TuliTransition', 'secret2OwlTransition']) assert.ok(specification.includes(approved[key]), key);
  results.push({ test: 'All Secret 2 dialogue is present verbatim in the authoritative extraction', passed: true });
  return results;
}
