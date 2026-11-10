import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Event-level regression tests against the actual production modules.
// This minimal DOM double does NOT validate native dialog focus trapping,
// browser keyboard activation, pointer input, CSS layout or mobile rendering.
export async function runSecret1Tests() {
  let document;
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag; this.children = []; this.attributes = {}; this.listeners = {};
      this.className = ''; this.dataset = {}; this.hidden = false; this.disabled = false; this.open = false;
      this.textContent = ''; this.classList = { add: name => { this.className += ` ${name}`; }, toggle: (name, enabled) => {
        const list = new Set(this.className.split(' ').filter(Boolean));
        if (enabled) list.add(name); else list.delete(name); this.className = [...list].join(' ');
      } };
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key]; }
    addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); }
    dispatch(type, values = {}) {
      const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
      for (const handler of this.listeners[type] ?? []) handler(event);
      return event;
    }
    click() { if (!this.disabled) this.dispatch('click'); }
    focus() { document.activeElement = this; }
    showModal() { assert.equal(this.open, false); this.open = true; }
    close() { if (this.open) { this.open = false; this.dispatch('close'); } }
    getBoundingClientRect() { return { left: 20, right: 660, top: 20, bottom: 700 }; }
    querySelectorAll(selector) {
      const matches = node => selector.split(',').some(part => {
        const value = part.trim();
        return value.startsWith('.') ? node.className.split(' ').includes(value.slice(1)) : value.startsWith('#') ? node.id === value.slice(1) : node.tagName === value;
      });
      const found = [];
      const visit = node => { for (const child of node.children) { if (matches(child)) found.push(child); visit(child); } };
      visit(this); return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  }
  document = new Element('document');
  document.createElement = tag => new Element(tag);
  document.createTextNode = text => { const node = new Element('text'); node.textContent = text; return node; };
  const ids = ['discovery-books', 'component-dialog', 'dialog-title', 'dialog-copy', 'dialog-book-card', 'secret-1-summary', 'secret-1-next', 'books-status', 'secret-2-title'];
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const nodes = {};
  for (const id of ids) {
    assert.ok(html.includes(`id="${id}"`), `Missing production markup: ${id}`);
    const node = new Element(); node.id = id; nodes[id] = node;
    if (!id.startsWith('dialog-')) document.append(node);
  }
  const dialog = nodes['component-dialog'];
  dialog.append(nodes['dialog-title'], nodes['dialog-copy'], nodes['dialog-book-card']);
  const close = new Element('button'); close.className = 'close-dialog';
  const closeAction = new Element('button'); closeAction.className = 'close-dialog-action'; dialog.append(close, closeAction);
  nodes['secret-1-summary'].hidden = true; nodes['dialog-book-card'].hidden = true;
  const window = { location: { hash: '' } };
  globalThis.document = document;
  globalThis.window = window;
  const load = name => import(new URL(`../js/${name}`, import.meta.url).href);
  const { approved } = await load('content.js', ['approved']);
  const { sampleBook } = await load('provisional-content.js', ['sampleBook']);
  const components = await load('components.js', ['createBookCard', 'createDialogue']);
  const { initSecret1 } = await load('secret-1.js', ['initSecret1'], { approved, sampleBook, ...components });
  const results = [];
  const check = (name, action) => { action(); results.push({ test: name, passed: true }); };
  let completionCalls = 0;
  initSecret1({ onComplete: () => { completionCalls += 1; } });
  const books = nodes['discovery-books'].children.map(item => item.children[0]);
  const locks = () => books.map(book => book.disabled);
  check('Exactly four books; only book 1 initially available', () => {
    assert.equal(books.length, 4); assert.deepEqual(locks(), [false, true, true, true]); assert.ok(nodes['secret-1-next'].disabled); assert.equal(completionCalls, 0);
  });
  check('Locked book cannot open, even through dispatched click', () => { books[3].dispatch('click'); assert.equal(dialog.open, false); });
  const open = index => {
    books[index].click(); assert.equal(dialog.open, true);
    assert.equal(nodes['dialog-title'].textContent, approved.books[index].title);
    assert.equal(nodes['dialog-copy'].textContent, approved.books[index].text);
    assert.equal(document.activeElement, close);
  };
  check('Book 1 exact content; no book card; no early unlock', () => {
    open(0); assert.ok(nodes['dialog-book-card'].hidden); assert.equal(nodes['dialog-book-card'].children.length, 0); assert.ok(books[1].disabled);
  });
  check('Close button completes book 1 and returns focus', () => { close.click(); assert.deepEqual(locks(), [false, false, true, true]); assert.equal(document.activeElement, books[0]); });
  check('Review does not unlock another book', () => { open(0); closeAction.click(); assert.deepEqual(locks(), [false, false, true, true]); });
  check('Book 2 hides card; Escape cancel path completes it and restores focus', () => {
    open(1); assert.ok(nodes['dialog-book-card'].hidden); const event = dialog.dispatch('cancel');
    assert.ok(event.defaultPrevented); assert.equal(dialog.open, false); assert.equal(document.activeElement, books[1]); assert.deepEqual(locks(), [false, false, false, true]);
  });
  check('Book 3 first displays the reusable card with provisional values', () => {
    open(2); assert.equal(nodes['dialog-book-card'].hidden, false); assert.equal(nodes['dialog-book-card'].children.length, 1);
    assert.equal(nodes['dialog-book-card'].querySelector('.book-field-title').textContent, sampleBook.title);
    closeAction.click(); assert.deepEqual(locks(), [false, false, false, false]); assert.ok(nodes['secret-1-next'].disabled);
  });
  check('Review of early book removes card and does not finish book 4', () => {
    open(0); assert.ok(nodes['dialog-book-card'].hidden); assert.equal(nodes['dialog-book-card'].children.length, 0); close.click(); assert.ok(nodes['secret-1-summary'].hidden);
  });
  check('Book 4 closing reveals exact two-speaker summary and enables next', () => {
    open(3); assert.ok(nodes['secret-1-next'].disabled); closeAction.click();
    assert.equal(nodes['secret-1-summary'].hidden, false); assert.equal(nodes['secret-1-next'].disabled, false);
    const dialogues = nodes['secret-1-summary'].children; assert.equal(dialogues.length, 2);
    assert.equal(dialogues[0].children[1].textContent, approved.secret1ClosingOwl);
    assert.equal(dialogues[1].children[0].textContent, 'תולי'); assert.equal(dialogues[1].children[1].textContent, approved.secret1ClosingTuli);
    assert.equal(document.activeElement, books[3]);
  });
  check('Reviews never duplicate closing dialogue or card', () => {
    open(3); close.click(); open(2); assert.equal(nodes['dialog-book-card'].children.length, 1); close.click(); assert.equal(nodes['secret-1-summary'].children.length, 2); assert.equal(completionCalls, 1);
  });
  check('Next navigates only after completion and moves focus to existing heading', () => {
    nodes['secret-1-next'].click(); assert.equal(window.location.hash, 'secret-2'); assert.equal(document.activeElement, nodes['secret-2-title']);
  });
  return results;
}
