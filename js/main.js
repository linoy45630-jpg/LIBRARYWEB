import { approved } from './content.js';
import { sampleBook, sampleAuthors } from './provisional-content.js';
import { createBookCard, createDialogue } from './components.js';

document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = approved[node.dataset.copy]; });
document.querySelectorAll('[data-dialogue]').forEach(node => { node.append(createDialogue(approved[node.dataset.dialogue])); });
document.querySelectorAll('[data-book-card]').forEach(node => node.append(createBookCard(sampleBook)));

approved.scenes.forEach((scene, index) => {
  const article = document.createElement('article'); article.className = 'story-scene';
  const label = document.createElement('h3'); label.textContent = `${index + 1} · ${scene.speaker}`; article.append(label);
  scene.lines.forEach(line => { const p = document.createElement('p'); p.textContent = line; article.append(p); });
  document.querySelector('#opening-scenes').append(article);
});
approved.books.forEach((book, index) => {
  const li = document.createElement('li'); const bookElement = document.createElement('div');
  bookElement.className = 'discovery-book';
  const number = document.createElement('span'); number.className = 'book-number'; number.textContent = index + 1;
  const title = document.createElement('span'); title.textContent = book.title;
  bookElement.append(number, title); li.append(bookElement); document.querySelector('#discovery-books').append(li);
});
approved.genres.forEach(genre => {
  const shelf = document.createElement('div'); shelf.className = 'genre-shelf';
  const sign = document.createElement('h3'); sign.className = 'shelf-sign'; sign.textContent = genre;
  const spines = document.createElement('div'); spines.className = 'decorative-spines'; spines.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 7; i++) spines.append(document.createElement('span'));
  shelf.append(sign, spines); document.querySelector('#genre-shelves').append(shelf);
});
sampleAuthors.forEach(author => {
  const li = document.createElement('li'); const first = document.createElement('span'); first.textContent = author.firstName;
  const last = document.createElement('strong'); last.textContent = author.surname; li.append(first, last); document.querySelector('#author-books').append(li);
});
// Static shuffled presentation only; ordering, scoring and feedback are out of scope.
[2, 0, 1].forEach(index => {
  const li = document.createElement('li'); li.textContent = approved.assessmentSteps[index]; document.querySelector('#assessment-cards').append(li);
});

// Generic dialog preview: this does not unlock books or run a learning activity.
const dialog = document.querySelector('#component-dialog');
document.querySelector('#dialog-copy').textContent = approved.books[2].text;
let opener;
document.querySelector('#open-component-preview').addEventListener('click', event => { opener = event.currentTarget; dialog.showModal(); });
dialog.querySelectorAll('.close-dialog, .close-dialog-action').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('close', () => opener?.focus());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });

// Keep location indication separate from any future learning progress.
const links = [...document.querySelectorAll('.nav-links a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const link = links.find(a => a.hash === `#${entry.target.id}`);
    if (!link) return;
    links.forEach(a => a.removeAttribute('aria-current')); link.setAttribute('aria-current', 'location');
  }), { rootMargin: '-15% 0px -65% 0px' });
  links.forEach(a => { const section = document.querySelector(a.hash); if (section) observer.observe(section); });
}
