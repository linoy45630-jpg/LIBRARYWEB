const illustrations = { owl: 'assets/derived/components/owl-welcome.png', tuli: 'assets/derived/components/tuli-excited.png' };
export function createCharacters(documentRef = document) {
  const group = documentRef.createElement('div'); group.className = 'guide-characters'; group.setAttribute('aria-hidden', 'true');
  const figures = {};
  for (const [id, source] of Object.entries(illustrations)) {
    const figure = documentRef.createElement('div'); figure.className = 'guide-character'; figure.dataset.character = id;
    const image = documentRef.createElement('img'); image.src = source; image.alt = ''; image.width = id === 'owl' ? 490 : 432; image.height = id === 'owl' ? 503 : 710;
    figure.append(image); group.append(figure); figures[id] = figure;
  }
  return { element: group, set(character, state = 'idle', expression = 'idle') {
    for (const [id, figure] of Object.entries(figures)) {
      figure.dataset.state = id === character ? state : 'listening'; figure.classList.toggle('is-active', id === character);
      figure.dataset.expression = id === character ? expression : 'idle';
      figure.children[0].src = id === 'tuli' && expression === 'confused' ? 'assets/derived/components/tuli-confused.png' : illustrations[id];
      figure.children[0].width = id === 'owl' ? 490 : expression === 'confused' ? 390 : 432;
    }
  } };
}
