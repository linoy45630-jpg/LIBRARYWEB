import assert from 'node:assert/strict';
// Minimal event fixture, not a browser or layout engine.
export function createTestDocument() {
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
  return document;
}
