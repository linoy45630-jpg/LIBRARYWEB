import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTestDocument } from './dom-fixture.mjs';
import { initSecret3 } from '../js/secret-3.js';
import { compareHebrew, normalizeHebrew } from '../js/hebrew-order.js';
import { approved } from '../js/content.js';
import { sampleAuthors } from '../js/provisional-content.js';

export async function runSecret3Tests() {
  const document = createTestDocument(); globalThis.document = document; globalThis.window = { location: { hash: '' } };
  const section = document.createElement('section'); section.id = 'secret-3'; document.append(section);
  const ids = ['secret-3-card','secret-3-shelf','author-books','author-choices','author-instruction','author-feedback','author-announcement','author-search-path','author-alphabet','secret-3-completion','secret-3-next','assessment-title','found-book-title','author-draft-note'];
  const html = await readFile(new URL('../index.html', import.meta.url),'utf8'); const nodes = {};
  ids.forEach(id => { assert.ok(html.includes('id="' + id + '"')); const el = document.createElement(id.endsWith('next') ? 'button' : 'div'); el.id = id; nodes[id] = el; (id === 'assessment-title' ? document : section).append(el); });
  nodes['secret-3-shelf'].hidden = true; nodes['secret-3-completion'].hidden = true; nodes['secret-3-next'].disabled = true;
  let completionCalls = 0; initSecret3({ onComplete: () => { completionCalls += 1; } });
  const books = nodes['author-books'], choices = nodes['author-choices']; const surname = section.querySelector('.author-surname');
  const text = node => node.textContent || node.children.map(text).join('');
  const names = () => books.querySelectorAll('strong').map(text); const state = () => section.dataset.searchState;
  const results = []; const check = (test, action) => { action(); results.push({ test, passed: true }); };
  check('Revised six-surname sequence is explicitly Hebrew-sorted', () => {
    const expected = ['אבני','ברגר','ברוך','ברמן','ברק','גולן']; assert.deepEqual(names(),expected); assert.deepEqual([...expected].reverse().sort(compareHebrew),expected); assert.equal(normalizeHebrew('ךםןףץ'),'כמנפצ');
  });
  const initialBooks = [...books.querySelectorAll('button')]; const target = initialBooks[4];
  check('Target exists initially and all existing books have title and author', () => {
    assert.equal(initialBooks.length,6); assert.ok(target.getAttribute('aria-label').includes('סוד הדרקון הכחול')); assert.equal(books.querySelectorAll('.shelf-book-title').length,6); sampleAuthors.forEach(a => assert.ok(a.title && a.firstName && a.surname));
  });
  check('Surname is required before either groups or books can advance', () => {
    assert.equal(state(),'surname'); assert.ok(nodes['secret-3-shelf'].hidden); target.dispatch('click'); assert.equal(state(),'surname'); assert.equal(choices.children.length,0);
  });
  check('Surname click shows the original shelf and highlights first letter', () => { surname.click(); assert.equal(state(),'first-letter'); assert.equal(nodes['secret-3-shelf'].hidden,false); assert.equal(text(surname.querySelector('mark')),'ב'); assert.equal(nodes['author-feedback'].textContent,approved.secret3SurnameCorrect); });
  check('Repeated first-letter errors do not advance', () => { for (const i of [0,2,0]) choices.children[i].click(); assert.equal(state(),'first-letter'); assert.equal(names().length,6); });
  check('First-letter choice narrows to B without removing the target', () => { choices.children[1].click(); assert.equal(state(),'second-letter'); assert.deepEqual(names(),['ברגר','ברוך','ברמן','ברק']); assert.ok(books.querySelectorAll('button').includes(target)); assert.equal(text(surname.querySelector('mark')),'ר'); });
  check('Wrong second letters allow retries and do not complete', () => { choices.children[0].click(); choices.children[2].click(); assert.equal(state(),'second-letter'); assert.equal(completionCalls,0); });
  check('Third-letter comparison highlights one letter per name and keeps target unselected', () => { choices.children[1].click(); assert.equal(state(),'comparison'); assert.deepEqual(books.querySelectorAll('mark').map(text),['ג','ו','מ','ק']); assert.equal(books.querySelectorAll('.found-book').length,0); });
  check('Existing books become selectable only at the final search step', () => { choices.children[0].click(); assert.equal(state(),'find-book'); assert.equal(nodes['author-instruction'].textContent,approved.secret3FindPrompt); books.querySelectorAll('button').forEach(b => assert.equal(b.disabled,false)); });
  check('Wrong existing book shows revised feedback with unlimited retry', () => { const wrong = books.querySelectorAll('button')[0]; for(let i=0;i<4;i++)wrong.click(); assert.equal(state(),'find-book'); assert.equal(nodes['author-feedback'].textContent,approved.secret3Incorrect); assert.equal(completionCalls,0); });
  check('Correct existing book is highlighted, not inserted or replaced', () => { target.click(); assert.equal(state(),'completed'); assert.equal(books.querySelectorAll('button').length,4); assert.ok(books.querySelectorAll('button').includes(target)); assert.equal(books.querySelectorAll('.found-book')[0],target); assert.equal(nodes['found-book-title'].textContent,'סוד הדרקון הכחול'); assert.equal(nodes['author-feedback'].textContent,approved.secret3Correct); assert.equal(completionCalls,1); });
  check('Success displays approved owl and Tuli completion once', () => { const d=nodes['secret-3-completion'].children; assert.equal(d.length,2); assert.equal(d[0].children[1].textContent,approved.secret3ClosingOwl); assert.equal(d[1].children[1].textContent,approved.secret3ClosingTuli); target.dispatch('click'); assert.equal(d.length,2); assert.equal(completionCalls,1); });
  check('Sorted shelf and enabled assessment navigation remain functional', () => { assert.deepEqual([...names()].sort(compareHebrew),names()); nodes['secret-3-next'].click(); assert.equal(window.location.hash,'assessment'); assert.equal(document.activeElement,nodes['assessment-title']); });
  const source = await readFile(new URL('../js/secret-3.js',import.meta.url),'utf8');
  check('Old gap and insertion interaction is removed', () => { assert.equal(source.includes('insertionGaps'),false); assert.equal(source.includes('insertion-gap'),false); assert.equal(books.querySelectorAll('.insertion-gap').length,0); });
  const spec=await readFile(new URL('../docs/inspection/revised-spec-2026-11-09.txt',import.meta.url),'utf8');
  check('Approved revised Secret 3 strings match the new specification', () => { ['secret3SurnamePrompt','secret3SurnameCorrect','secret3FirstPrompt','secret3NarrowPrompt','secret3FindPrompt','secret3Correct','secret3Incorrect','secret3ClosingOwl','secret3ClosingTuli'].forEach(key=>assert.ok(spec.includes(approved[key]),key)); });
  return results;
}
