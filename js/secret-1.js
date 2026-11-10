import { presentDialogue } from './dialogue-events.js';
import { approved } from './content.js';
import { sampleBook } from './provisional-content.js';
import { createBookCard, createDialogue } from './components.js';

// A book is completed when its popup is closed, including with Escape.
// Only a contiguous completed prefix can unlock the next book. Reload resets it.
export function initSecret1({ onComplete = () => {} } = {}) {
  const shelf = document.querySelector('#discovery-books');
  const dialog = document.querySelector('#component-dialog');
  const cardSlot = document.querySelector('#dialog-book-card');
  const summary = document.querySelector('#secret-1-summary');
  const next = document.querySelector('#secret-1-next');
  const status = document.querySelector('#books-status');
  let completedCount = 0;
  let activeIndex = null;
  let opener = null;
  const buttons = approved.books.map((book, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'discovery-book';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'component-dialog');
    const number = document.createElement('span'); number.className = 'book-number'; number.textContent = index + 1;
    const title = document.createElement('span'); title.textContent = book.title;
    const state = document.createElement('span'); state.className = 'book-state';
    button.append(number, title, state); item.append(button); shelf.append(item);
    button.addEventListener('click', () => {
      // Guard programmatic clicks as well as native disabled-button activation.
      if (index > completedCount || dialog.open) return;
      activeIndex = index; opener = button;
      document.querySelector('#dialog-title').textContent = book.title;
      document.querySelector('#dialog-copy').textContent = book.text;
      cardSlot.replaceChildren();
      cardSlot.hidden = index < 2;
      if (index >= 2) cardSlot.append(createBookCard(sampleBook));
      dialog.showModal();
      presentDialogue('secret-1', book.text, { inDialog: true });
      dialog.scrollTop = 0;
      dialog.querySelector('.close-dialog').focus({ preventScroll: true });
    });
    return button;
  });

  function renderProgress() {
    buttons.forEach((button, index) => {
      const locked = index > completedCount;
      const completed = index < completedCount;
      button.disabled = locked;
      button.classList.toggle('is-completed', completed);
      const label = locked ? 'נעול' : completed ? 'הושלם' : 'זמין';
      button.querySelector('.book-state').textContent = label;
      button.setAttribute('aria-label', `ספר ${index + 1}: ${approved.books[index].title} — ${label}`);
    });
    next.disabled = completedCount < buttons.length;
    if (completedCount === buttons.length) {
      if (summary.hidden) {
        summary.append(createDialogue(approved.secret1ClosingOwl), createDialogue(approved.secret1ClosingTuli, 'תולי'));
        summary.hidden = false;
        presentDialogue('secret-1', [approved.secret1ClosingOwl, { character: 'tuli', text: approved.secret1ClosingTuli, expression: 'excited' }]);
        onComplete();
      }
      status.textContent = 'כל ארבעת הספרים הושלמו. ניתן לעיין בהם שוב ולעבור לסוד השני.';
    } else if (completedCount > 0) {
      status.textContent = `הושלמו ${completedCount} מתוך 4 ספרים. ספר ${completedCount + 1} זמין כעת.`;
    }
  }

  dialog.querySelectorAll('.close-dialog, .close-dialog-action').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault(); dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (activeIndex === completedCount) completedCount += 1;
    activeIndex = null;
    renderProgress();
    opener?.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  next.addEventListener('click', () => {
    if (next.disabled) return;
    window.location.hash = 'secret-2';
    const heading = document.querySelector('#secret-2-title');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  });
  renderProgress();
}
