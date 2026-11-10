import { presentDialogue } from './dialogue-events.js';
import { approved } from './content.js';
import { sampleBook } from './provisional-content.js';
import { createBookCard } from './components.js';
import { assessmentQuestions } from './assessment-content.js';

// Decorative illustrations reuse approved assets and the existing shelf language.
function shelfIllustration() {
  const spines = document.createElement('span'); spines.className = 'decorative-spines'; spines.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 7; i++) spines.append(document.createElement('span'));
  return spines;
}
function sequenceIllustration(index) {
  const visual = document.createElement('span'); visual.className = 'sequence-visual'; visual.setAttribute('aria-hidden', 'true');
  if (index === 1) { visual.classList.add('sequence-shelf'); visual.append(shelfIllustration()); }
  else { const image = document.createElement('img'); image.alt = ''; image.src = index === 0 ? 'assets/כרטיס פרטי ספר מעוטר בעברית.png' : 'assets/derived/components/tuli-excited.png'; image.width = 60; image.height = 90; image.loading = 'lazy'; visual.append(image); }
  return visual;
}

export function createAssessmentState() {
  const questions = assessmentQuestions;
  const answers = questions.map(question => ({ order: question.type === 'sequence' ? [2, 0, 1] : null, selected: null, touched: false, passed: false }));
  let index = 0;
  return {
    questions, answers, get index() { return index; }, get pending() { return false; },
    get question() { return questions[index]; }, get answer() { return answers[index]; },
    move(from, to) {
      const answer = answers[index];
      if (answer.passed || questions[index].type !== 'sequence' || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from > 2 || to > 2) return false;
      const [step] = answer.order.splice(from, 1); answer.order.splice(to, 0, step); answer.touched = true; return true;
    },
    select(value) {
      const question = questions[index], answer = answers[index];
      if (answer.passed || question.type !== 'single' || !Number.isInteger(value) || value < 0 || value >= question.options.length) return false;
      answer.selected = value; answer.touched = true; return true;
    },
    check() {
      const question = questions[index], answer = answers[index];
      if (answer.passed) return 'correct';
      if (!answer.touched) return 'unanswered';
      const matches = question.type === 'sequence' ? answer.order.filter((value, i) => value === i).length : Number(answer.selected === question.answer);
      if (matches === (question.type === 'sequence' ? 3 : 1)) { answer.passed = true; return 'correct'; }
      return matches > 0 && question.type === 'sequence' ? 'partial' : 'incorrect';
    },
    next() {
      if (!answers[index].passed) return 'blocked';
      if (index + 1 < questions.length) { index += 1; return 'question'; }
      return 'completed';
    },
    reviewFirst() { index = 0; }
  };
}

export function initAssessment({ onComplete = () => {} } = {}) {
  const section = document.querySelector('#assessment');
  const host = section.querySelector('#assessment-question');
  const progress = section.querySelector('#assessment-progress');
  const flag = section.querySelector('#assessment-development-note');
  flag.hidden = false;
  flag.textContent = 'גרסת עבודה לבדיקה: חמש השאלות פעילות. נוסח שאלה 5 הוא הצעה מעודכנת לביקורת.';
  const model = createAssessmentState();
  let dragged = null;
  function render(focus = false) {
    host.replaceChildren();
    const question = model.question, answer = model.answer;
    progress.textContent = `שאלה ${model.index + 1} מתוך 5`;
    const heading = document.createElement('h3'); heading.id = 'current-question-title'; heading.textContent = question.prompt; heading.setAttribute('tabindex', '-1');
    host.append(heading);
    if (question.proposalLabel) { const badge = document.createElement('p'); badge.className = 'pending-note'; badge.textContent = question.proposalLabel; host.append(badge); }
    const body = document.createElement('div'); body.className = 'assessment-question-body';
    const controls = document.createElement(question.type === 'single' ? 'fieldset' : 'div'); controls.className = 'question-controls';
    if (question.presentation === 'card') { body.classList.add('with-card'); const card = createBookCard(sampleBook); card.classList.add('assessment-context-card'); body.append(card); }
    if (question.presentation === 'shelves') controls.classList.add('shelf-options');
    if (question.presentation === 'spines') controls.classList.add('spine-options');
    const message = document.createElement('p'); message.id = 'assessment-feedback'; message.className = 'guide-dialogue'; message.setAttribute('role', 'status'); message.setAttribute('aria-atomic', 'true');
    const check = document.createElement('button'); check.type = 'button'; check.className = 'asset-button'; check.textContent = 'בדיקת תשובה'; check.disabled = answer.passed;
    const next = document.createElement('button'); next.type = 'button'; next.className = 'text-link'; next.textContent = model.index === 4 ? 'לסיום' : 'לשאלה הבאה'; next.disabled = !answer.passed; next.hidden = model.index === 4 && !answer.passed;
    function drawSequence(focusAt = null) {
      controls.replaceChildren();
      const hint = document.createElement('p'); hint.className = 'stage-note'; hint.textContent = 'אפשר לגרור את הכרטיסים, להשתמש בחצים או לבחור מיקום לכל שלב.';
      const list = document.createElement('ol'); list.id = 'assessment-cards'; list.className = 'assessment-cards';
      answer.order.forEach((value, position) => {
        const row = document.createElement('li'); row.draggable = !answer.passed; row.classList.toggle('sequence-correct', answer.passed);
        const text = document.createElement('span'); text.className = 'sequence-text'; text.textContent = question.steps[value]; row.append(text);
        row.append(sequenceIllustration(value));
        const actions = document.createElement('div'); actions.className = 'sequence-actions';
        const move = (to) => { if (model.move(position, to)) { message.textContent = ''; drawSequence(to); } };
        [['למעלה', position - 1], ['למטה', position + 1]].forEach(([label, destination]) => {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = answer.passed || destination < 0 || destination > 2;
          button.setAttribute('aria-label', `${label}: ${question.steps[value]}`); button.addEventListener('click', () => move(destination)); actions.append(button);
        });
        const select = document.createElement('select'); select.className = 'sequence-position'; select.disabled = answer.passed;
        select.setAttribute('aria-label', `מיקום השלב: ${question.steps[value]}`);
        for (let i = 0; i < 3; i++) { const option = document.createElement('option'); option.value = String(i); option.textContent = `מיקום ${i + 1}`; select.append(option); }
        select.value = String(position); select.addEventListener('change', () => move(Number(select.value))); actions.append(select); row.append(actions);
        row.addEventListener('dragstart', event => { if (answer.passed) { event.preventDefault(); return; } dragged = position; event.dataTransfer?.setData('text/plain', String(position)); });
        row.addEventListener('dragover', event => { if (!answer.passed) event.preventDefault(); });
        row.addEventListener('drop', event => { event.preventDefault(); if (dragged !== null && model.move(dragged, position)) { message.textContent = ''; drawSequence(position); } dragged = null; });
        row.addEventListener('dragend', () => { dragged = null; }); list.append(row);
      });
      if (answer.passed) { const status = document.createElement('p'); status.className = 'sequence-result'; status.textContent = 'סדר השלבים נכון'; controls.append(status); }
      controls.append(hint, list);
      if (focusAt !== null) list.querySelectorAll('select')[focusAt]?.focus({ preventScroll: true });
    }
    if (question.type === 'sequence') drawSequence(); else {
      const legend = document.createElement('legend'); legend.className = 'visually-hidden'; legend.textContent = question.prompt; controls.append(legend);
      question.options.forEach((option, index) => {
        const label = document.createElement('label'); label.className = 'single-option';
        const radio = document.createElement('input'); radio.type = 'radio'; radio.name = question.id; radio.value = String(index); radio.checked = answer.selected === index; radio.disabled = answer.passed;
        radio.addEventListener('change', () => { if (radio.checked && model.select(index)) { message.textContent = ''; controls.querySelectorAll('label').forEach(item => { item.classList.toggle('is-selected', false); item.classList.toggle('is-incorrect', false); }); label.classList.add('is-selected'); } });
        const text = document.createElement('span'); text.textContent = option; label.classList.toggle('is-selected', radio.checked); label.classList.toggle('is-correct', answer.passed && radio.checked);
        if (question.presentation === 'shelves') { label.classList.add('genre-shelf'); text.className = 'shelf-sign'; label.append(radio, text, shelfIllustration()); }
        else { if (question.presentation === 'spines') label.classList.add('assessment-book-spine'); label.append(radio, text); }
        const status = document.createElement('span'); status.className = 'choice-status'; status.textContent = answer.passed && radio.checked ? 'תשובה נכונה' : ''; label.append(status); controls.append(label);
      });
    }
    if (answer.passed) message.textContent = question.feedback;
    check.addEventListener('click', () => {
      const result = model.check();
      message.textContent = result === 'unanswered' ? 'יש לענות על השאלה לפני הבדיקה.' : result === 'correct' ? question.feedback : result === 'partial' ? `חלק מהשלבים במקומם. ${approved.assessmentIncorrect}` : question.hint;
      presentDialogue('assessment', message.textContent);
      if (result === 'correct') {
        check.disabled = true; next.disabled = false; next.hidden = false;
        if (question.type === 'sequence') drawSequence(); else controls.querySelectorAll('label').forEach(label => { const input = label.querySelector('input'); input.disabled = true; if (input.checked) { label.classList.add('is-correct'); label.querySelector('.choice-status').textContent = 'תשובה נכונה'; } });
        next.focus({ preventScroll: true });
      } else if (result !== 'unanswered' && question.type === 'single') {
        controls.querySelectorAll('label').forEach(label => { if (label.querySelector('input').checked) label.classList.add('is-incorrect'); });
      }
    });
    next.addEventListener('click', () => {
      const result = model.next();
      if (result === 'blocked') return;
      if (result === 'completed') { onComplete(); return; }
      render(true);
    });
    body.append(controls); host.append(body, message, check, next);
    if (focus) { heading.focus({ preventScroll: true }); presentDialogue('assessment', question.prompt); }
  }
  render(); return model;
}
