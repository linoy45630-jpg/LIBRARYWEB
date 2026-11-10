import { presentDialogue } from './dialogue-events.js';
import { approved } from './content.js';
import { sampleBook, sampleAuthors, secret3Draft } from './provisional-content.js';
import { createBookCard, createDialogue } from './components.js';
import { HEBREW_ALPHABET, compareHebrew, normalizeHebrew } from './hebrew-order.js';

export function initSecret3({ onComplete = () => {} } = {}) {
  const section = document.querySelector('#secret-3');
  const get = id => section.querySelector('#' + id);
  const cardSlot = get('secret-3-card');
  cardSlot.append(createBookCard(sampleBook, { interactiveSurname: true }));
  const surname = cardSlot.querySelector('.author-surname');
  const books = get('author-books'), choices = get('author-choices');
  const instruction = get('author-instruction'), feedback = get('author-feedback');
  const live = get('author-announcement'), next = get('secret-3-next');
  const completion = get('secret-3-completion'), shelf = get('secret-3-shelf');
  const target = normalizeHebrew(sampleBook.surname);
  const original = [...sampleAuthors].sort((a, b) => compareHebrew(a.surname, b.surname));
  let visible = original, state = 'surname', activeLetter = -1, announcements = 0;
  const elements = new Map();
  function draftNote(show) { const note = get('author-draft-note'); if (note) note.hidden = !show; }
  function announce(value) { presentDialogue('secret-3', instruction.textContent && instruction.textContent !== value ? [value, instruction.textContent] : value); feedback.textContent = value; live.textContent = (++announcements) + '. ' + value; }
  function letters(node, value, active) {
    node.replaceChildren();
    [...value].forEach((letter, index) => { const span = document.createElement(index === active ? 'mark' : 'span'); span.textContent = letter; node.append(span); });
  }
  // Construct every book once, including the target. Narrowing reuses these nodes.
  original.forEach((author, index) => {
    const li = document.createElement('li'); li.className = index % 2 ? 'author-book author-book-alt' : 'author-book';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'shelf-book'; button.disabled = true;
    button.setAttribute('aria-label', author.title + ', מאת ' + author.firstName + ' ' + author.surname);
    const title = document.createElement('span'); title.className = 'shelf-book-title'; title.textContent = author.title;
    const first = document.createElement('span'); first.textContent = author.firstName;
    const last = document.createElement('strong'); last.textContent = author.surname;
    button.append(title, first, last); li.append(button); elements.set(author, { li, button, last });
    button.addEventListener('click', () => {
      if (state !== 'find-book') return;
      if (author.surname !== sampleBook.surname || author.title !== sampleBook.title) { announce(approved.secret3Incorrect); return; }
      draftNote(false);
      state = 'completed'; section.dataset.searchState = state;
      instruction.textContent = sampleBook.title;
      elements.forEach(item => { item.button.disabled = false; item.button.setAttribute('aria-disabled', 'true'); });
      button.classList.add('found-book'); button.setAttribute('aria-pressed', 'true');
      get('found-book-title').textContent = author.title; get('found-book-title').hidden = false;
      completion.append(createDialogue(approved.secret3ClosingOwl), createDialogue(approved.secret3ClosingTuli, 'תולי'));
      completion.hidden = false; next.disabled = false; announce(approved.secret3Correct); presentDialogue('secret-3', [approved.secret3Correct, approved.secret3ClosingOwl, { character: 'tuli', text: approved.secret3ClosingTuli, expression: 'celebrating' }]); onComplete();
    });
  });
  function draw() {
    books.replaceChildren();
    visible.forEach(author => {
      const item = elements.get(author); letters(item.last, author.surname, activeLetter);
      item.button.disabled = state !== 'find-book'; books.append(item.li);
    });
    letters(surname, sampleBook.surname, activeLetter);
  }
  function setState(value, text, letter) {
    state = value; activeLetter = letter; section.dataset.searchState = value;
    draftNote(value === 'comparison');
    instruction.textContent = text; presentDialogue('secret-3', text); choices.replaceChildren(); draw(); instruction.focus({ preventScroll: true });
  }
  function choice(label, action) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'search-choice'; button.textContent = label;
    button.addEventListener('click', action); choices.append(button); return button;
  }
  function firstLetter() {
    setState('first-letter', approved.secret3FirstPrompt, 0);
    [...new Set(original.map(author => normalizeHebrew(author.surname)[0]))].forEach(letter => {
      choice(letter + ' · ' + original.filter(a => normalizeHebrew(a.surname)[0] === letter).map(a => a.surname).join(', '), () => {
        if (state !== 'first-letter') return;
        if (letter !== target[0]) { draftNote(true); announce(secret3Draft.firstHint); return; }
        visible = original.filter(a => normalizeHebrew(a.surname)[0] === letter);
        get('author-search-path').textContent = sampleBook.genre + ' ← ' + letter;
        secondLetter(); announce(approved.secret3NarrowPrompt);
      });
    });
  }
  function secondLetter() {
    setState('second-letter', approved.secret3NarrowPrompt, 1);
    secret3Draft.secondLetterChoices.forEach(letter => choice(target[0] + letter, () => {
      if (state !== 'second-letter') return;
      if (letter !== target[1]) { draftNote(true); announce(secret3Draft.secondHint); return; }
      visible = visible.filter(a => normalizeHebrew(a.surname).startsWith(target.slice(0, 2)));
      get('author-search-path').textContent = sampleBook.genre + ' ← ' + target.slice(0, 2);
      compareFurther(); announce(secret3Draft.secondCorrect);
    }));
  }
  function compareFurther() {
    setState('comparison', secret3Draft.thirdPrompt, 2);
    const guide = get('author-alphabet'); guide.hidden = false; guide.replaceChildren();
    [...HEBREW_ALPHABET].forEach(letter => { const span = document.createElement(letter === target[2] ? 'mark' : 'span'); span.textContent = letter; guide.append(span); });
    choice(secret3Draft.continueSearch, () => { if (state === 'comparison') setState('find-book', approved.secret3FindPrompt, 2); });
  }
  section.dataset.searchState = state; instruction.textContent = approved.secret3SurnamePrompt;
  draw(); // Target is present from initialization, not added on success.
  surname.setAttribute('aria-pressed', 'false'); surname.setAttribute('aria-controls', 'secret-3-shelf');
  surname.addEventListener('click', () => {
    if (state !== 'surname') return;
    surname.classList.add('surname-selected'); surname.setAttribute('aria-pressed', 'true'); surname.setAttribute('aria-disabled', 'true');
    shelf.hidden = false; firstLetter(); announce(approved.secret3SurnameCorrect);
  });
  next.addEventListener('click', () => {
    if (state !== 'completed') return;
    window.location.hash = 'assessment';
    const heading = document.querySelector('#assessment-title'); heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true });
  });
}
