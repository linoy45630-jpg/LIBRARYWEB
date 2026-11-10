// Values remain real HTML; the approved image supplies the printed labels.
export function createBookCard(book, { highlight = null, interactiveSurname = false } = {}) {
  const figure = document.createElement('figure');
  figure.className = 'book-card-wrapper';
  const card = document.createElement('div');
  card.className = 'book-card';
  const image = document.createElement('img');
  image.src = 'assets/כרטיס פרטי ספר מעוטר בעברית.png';
  image.alt = ''; image.width = 1024; image.height = 1536; image.loading = 'lazy';
  card.append(image);
  const fields = [['title', 'שם הספר', book.title], ['author', 'שם המחבר', `${book.firstName} ${book.surname}`], ['genre', 'ג׳אנר', book.genre], ['year', 'שנת הוצאה', book.year]];
  const list = document.createElement('dl');
  fields.forEach(([key, label, value]) => {
    const term = document.createElement('dt'); term.className = 'visually-hidden'; term.textContent = label;
    const entry = document.createElement('dd'); entry.className = `book-field book-field-${key}`; entry.dataset.field = key;
    if (highlight === key) entry.classList.add('field-highlight');
    if (key === 'author') {
      entry.append(document.createTextNode(`${book.firstName} `));
      const surname = document.createElement(interactiveSurname ? 'button' : 'span');
      surname.className = 'author-surname'; surname.textContent = book.surname;
      if (interactiveSurname) { surname.type = 'button'; surname.setAttribute('aria-label', `שם המשפחה ${book.surname}`); }
      entry.append(surname);
    } else entry.textContent = value;
    list.append(term, entry);
  });
  card.append(list);
  const caption = document.createElement('figcaption'); caption.className = 'sample-note'; caption.textContent = 'כרטיס לדוגמה · פרטי ספר בדיוניים וזמניים';
  figure.append(card, caption); return figure;
}

export function createDialogue(text, speaker = 'הינשופה') {
  const block = document.createElement('div'); block.className = 'guide-dialogue';
  const label = document.createElement('strong'); label.textContent = speaker;
  const copy = document.createElement('p'); copy.textContent = text;
  block.append(label, copy); return block;
}
