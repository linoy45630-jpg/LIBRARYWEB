export const STAGES = ['opening', 'secret-1', 'secret-2', 'secret-3', 'assessment', 'completion'];
export function createProgressState() {
  const completed = new Set();
  let active = 'opening';
  const canVisit = id => STAGES.includes(id) && (id === 'opening' || completed.has(STAGES[STAGES.indexOf(id) - 1]));
  return {
    canVisit,
    isComplete: id => completed.has(id),
    get active() { return active; },
    visit(id) { if (!canVisit(id)) return false; active = id; return true; },
    complete(id) { if (!canVisit(id)) return false; completed.add(id); return true; }
  };
}

export function initLearningFlow() {
  const progress = createProgressState();
  const nav = [...document.querySelectorAll('.nav-links a')];
  const panels = STAGES.map(id => document.getElementById(id));
  const storyboard = document.getElementById('storyboard');
  function update() {
    panels.forEach((panel, i) => { panel.hidden = STAGES[i] !== progress.active; });
    storyboard.hidden = progress.active !== 'opening';
    nav.forEach(link => {
      const id = link.hash.slice(1);
      const available = progress.canVisit(id);
      const current = id === progress.active;
      const completed = progress.isComplete(id);
      link.setAttribute('aria-disabled', String(!available));
      if (current) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
      link.dataset.stageStatus = current ? 'current' : completed ? 'completed' : available ? 'available' : 'locked';
      link.querySelector('.progress-state').textContent = current ? 'כאן עכשיו' : completed ? 'הושלם' : available ? 'זמין' : 'נעול';
    });
  }
  function visit(id, focus = true) {
    if (!progress.visit(id)) return false;
    update();
    window.dispatchEvent?.(new CustomEvent('library-stage-change', { detail: id }));
    window.history.replaceState(null, '', `#${id}`);
    if (focus) {
      const heading = document.querySelector(id === 'opening' ? '#page-title' : id === 'completion' ? '#completion-title' : `#${id}-title`);
      heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true });
      document.querySelector('#main').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    return true;
  }
  nav.forEach(link => link.addEventListener('click', event => { event.preventDefault(); visit(link.hash.slice(1)); }));
  window.addEventListener('hashchange', () => {
    const id = window.location.hash.slice(1);
    if (id === 'main' || id === 'storyboard') return;
    if (!visit(id)) window.history.replaceState(null, '', `#${progress.active}`);
  });
  document.querySelectorAll('[data-start-learning]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); progress.complete('opening'); visit('secret-1');
  }));
  document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); visit('opening'); });
  document.getElementById('completion-home').addEventListener('click', () => visit('opening'));
  // Reviewing again keeps completed activities and opened books intact.
  document.getElementById('completion-review').addEventListener('click', () => visit('secret-1'));
  visit('opening', false);
  return { complete(id) { const done = progress.complete(id); update(); return done; }, visit, progress };
}
