import { approved } from './content.js';
import { subscribeDialogue, presentDialogue } from './dialogue-events.js';
import { createCharacters } from './character-controller.js';
import { createSpeechController } from './speech-controller.js';
import { createIntroSequence } from './cinematic-intro.js';
import { createLibraryEnvironment } from './library-environment.js';

export function initDialogueController({ video = false } = {}) {
  const environment = createLibraryEnvironment();
  const panel = document.createElement('aside'); panel.className = 'integrated-dialogue'; panel.setAttribute('aria-label', 'הדמויות והקריינות');
  const characters = createCharacters();
  const body = document.createElement('div'); body.className = 'integrated-dialogue-body speech-bubble';
  const inner = document.createElement('div'); inner.className = 'speech-bubble-inner';
  const name = document.createElement('strong'), copy = document.createElement('p'), status = document.createElement('p'), proposal = document.createElement('p'), voiceNotice = document.createElement('p');
  voiceNotice.className = 'voice-fallback-note';
  proposal.className = 'dialogue-proposal'; proposal.textContent = 'נוסח מקשר מוצע — טרם אושר כקריינות הסרטון'; proposal.hidden = true;
  status.className = 'narration-status'; status.setAttribute('role', 'status');
  const controls = document.createElement('div'); controls.className = 'narration-controls';
  let stage = null, lines = [], position = 0, current = null, viewToken = 0, cinematic = false;
  const saved = new Map();
  const speech = createSpeechController({ onState(state) {
    characters.set(current?.character || 'owl', state === 'speaking' ? 'speaking' : state === 'paused' ? 'listening' : 'idle', current?.expression);
    status.textContent = state === 'unavailable' ? 'לא נמצא קול עברי בדפדפן. אפשר להמשיך לקרוא וללמוד.' : state === 'blocked' ? 'נדרשת לחיצה להפעלת הקול. הטקסט זמין לקריאה.' : state === 'error' ? 'ההקראה לא הופעלה. אפשר לנסות שוב או להמשיך לקרוא.' : '';
    activation.hidden = speech.enabled && !['blocked', 'error'].includes(state);
    setIcon(pause, state === 'paused' ? 'המשך הקראה' : 'השהיית הקראה', state === 'paused' ? '▶' : 'Ⅱ');
    pause.disabled = !['speaking', 'paused'].includes(state);
    const voice = speech.voiceStatus(current?.speaker || 'owl');
    voiceNotice.textContent = current?.speaker === 'owl' && !voice.verifiedFemale ? (voice.voice ? 'קול עברי חלופי; קול נשי לינשופה טרם אומת.' : 'קול עברי לינשופה אינו זמין כרגע.') : '';
    voiceNotice.hidden = !voiceNotice.textContent;
  } });
  function setIcon(node, label, glyph) { node.setAttribute('aria-label', label); node.title = label; node.querySelector('span').textContent = glyph; }
  function button(label, glyph, action) {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'narration-icon';
    const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true'); node.append(icon); setIcon(node, label, glyph);
    node.addEventListener('click', action); controls.append(node); return node;
  }
  button('האזנה חוזרת לדיאלוג הנוכחי', '↻', () => { if (cinematic && intro.paused) intro.resume(); speech.replay(); });
  const pause = button('השהיית הקראה', 'Ⅱ', () => speech.state === 'paused' ? speech.resume() : speech.pause()); pause.disabled = true;
  button('עצירת הקראה', '■', () => speech.stop());
  const mute = button('השתקת קריינות', '♪', () => { const muted = speech.toggleMute(); setIcon(mute, muted ? 'ביטול השתקה' : 'השתקת קריינות', muted ? '×♪' : '♪'); mute.setAttribute('aria-pressed', String(muted)); }); mute.setAttribute('aria-pressed', 'false');
  const next = button('לדיאלוג הבא', '←', () => { if (cinematic) intro.next(); else nextLine(); });
  const activation = document.createElement('button'); activation.type = 'button'; activation.className = 'narration-activate'; activation.textContent = 'הפעלת קול והתחלה';
  activation.addEventListener('click', () => { if (cinematic && intro.paused) intro.resume(); speech.enable(); });
  function nextLine() { if (position + 1 < lines.length) { position++; show(); } }
  function show(auto = true) {
    const entry = lines[position]; if (!entry) return;
    const ticket = ++viewToken;
    current = { ...entry, onComplete: () => { if (ticket !== viewToken) return; entry.onComplete?.(); if (!cinematic && ticket === viewToken) nextLine(); } };
    name.textContent = entry.speaker === 'tuli' ? 'תולי' : 'הינשופה'; copy.textContent = entry.displayText; proposal.hidden = !entry.proposed;
    panel.dataset.speaker = entry.character; panel.classList.toggle('is-cinematic', cinematic);
    next.hidden = cinematic ? intro.finished : position + 1 >= lines.length;
    characters.set(entry.character, 'idle', entry.expression); speech.setLine(current, { auto });
    saved.set(stage, { lines, position });
  }
  inner.append(name, copy, proposal, controls, activation, status, voiceNotice); body.append(inner); panel.append(characters.element, body);
  const cinema = document.getElementById('cinematic-stage');
  const continueButton = document.getElementById('intro-continue');
  const sequencePause = document.getElementById('intro-pause');
  const intro = createIntroSequence({
    onScene(line, index) {
      environment.show(line.background);
      const entranceName = document.getElementById('entrance-name'); if (entranceName) entranceName.hidden = line.background !== 'entrance';
      if (cinema) { cinema.dataset.scene = String(line.scene); cinema.dataset.line = String(index + 1); cinema.dataset.playback = 'playing'; }
      if (continueButton) continueButton.hidden = true;
      if (sequencePause) { sequencePause.disabled = false; sequencePause.textContent = 'השהיית הפתיחה'; }
      presentDialogue('opening', line, { cinematic: true });
    },
    onFinish() { if (continueButton) continueButton.hidden = false; if (cinema) cinema.dataset.playback = 'finished'; if (sequencePause) sequencePause.disabled = true; next.hidden = true; characters.set(current?.character || 'owl', 'idle'); },
    onCancel() { viewToken++; speech.stop(); if (cinema) cinema.dataset.playback = 'stopped'; },
    onPause() { speech.pause(); if (cinema) cinema.dataset.playback = 'paused'; if (sequencePause) sequencePause.textContent = 'המשך הפתיחה'; },
    onResume() { speech.resume(); if (cinema) cinema.dataset.playback = 'playing'; if (sequencePause) sequencePause.textContent = 'השהיית הפתיחה'; }
  });
  function mount(target) {
    if (target.insertBefore) target.insertBefore(panel, target.querySelector('.section-heading')?.nextSibling || target.firstChild);
    else target.append(panel);
  }
  const initial = {
    'secret-1': [approved.secret1Instruction],
    'secret-2': [approved.secret2Introduction, approved.secret2Explanation, approved.secret2Prompt, approved.secret2Action],
    'secret-3': [{ character: 'tuli', text: approved.secret3TuliIntroduction }, approved.secret3Explanation, approved.secret3LetterIntroduction, approved.secret3SurnamePrompt],
    assessment: [approved.assessmentIntroduction, approved.assessmentInstruction],
    completion: [approved.completionTitle, { character: 'tuli', text: approved.completionBody, expression: 'celebrating' }, approved.completionAction, ...approved.completionSummary]
  };
  subscribeDialogue(event => {
    if (event.stage !== stage || (stage === 'opening' && video)) return;
    cinematic = !!event.cinematic;
    lines = event.lines; position = event.position || 0;
    const target = event.inDialog ? document.querySelector('#component-dialog .dialog-surface') : stage === 'opening' && cinema ? cinema : document.getElementById(stage);
    mount(target); show(!event.silent);
  });
  function enter(id) {
    if (stage === id) return;
    intro.cancel(); viewToken++; stage = id;
    if (id !== 'opening' || video) environment.show('main');
    const entranceName = document.getElementById('entrance-name'); if (entranceName) entranceName.hidden = true;
    if (id === 'opening') {
      if (video) return;
      if (!saved.has(id)) intro.start();
      else { const previous = saved.get(id); intro.skip(); environment.show('main'); presentDialogue(id, previous.lines.map(({ onComplete, ...line }) => line), { position: previous.position, silent: true }); }
    } else {
      const previous = saved.get(id);
      presentDialogue(id, previous?.lines || initial[id], { position: previous?.position || 0 });
    }
  }
  window.addEventListener('library-stage-change', event => enter(event.detail));
  document.querySelector('#component-dialog').addEventListener('close', () => { if (stage === 'secret-1' && panel.closest('dialog')) { viewToken++; speech.stop(); mount(document.getElementById(stage)); } });
  document.querySelector('#intro-replay').addEventListener('click', () => { if (stage === 'opening' && !video) intro.start(); });
  sequencePause?.addEventListener('click', () => intro.paused ? intro.resume() : intro.pause());
  // Cancel the intro before the existing start-learning handler enters Secret 1.
  document.getElementById('intro-skip')?.addEventListener('click', () => intro.skip(), { capture: true });
  window.addEventListener('pagehide', () => intro.cancel());
  enter('opening');
  // Conservative policy check: otherwise the explicit enable action stays visible.
  if (!video) speech.attemptAutoplay();
  return { speech, panel, intro, environment };
}
