import { normalizeDialogue } from './dialogue-data.js';
import { createVoicePreferences } from './voice-preferences.js';

export function createSpeechController({ synthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance, AudioClass = globalThis.Audio, onState = () => {}, schedule = setTimeout, clearSchedule = clearTimeout, storage } = {}) {
  const preferences = createVoicePreferences({ synthesis, storage });
  let enabled = false, muted = false, token = 0, current = null, media = null, state = 'idle';
  const update = value => { state = value; onState(value); };
  let watchdog = null, pausedBeforeStart = false;
  function clearWatchdog() { if (watchdog !== null) clearSchedule(watchdog); watchdog = null; }
  function stop() { token++; clearWatchdog(); pausedBeforeStart = false; if (media) { media.pause(); media = null; } synthesis?.cancel?.(); update('idle'); }
  function voices() { return preferences.voices(); }
  function play(line = current, { pronunciation } = {}) {
    stop(); current = line ? normalizeDialogue(line) : null;
    line = current;
    if (!line || !enabled || muted) return false;
    const ticket = token;
    const active = () => ticket === token;
    const start = () => { if (active()) { clearWatchdog(); update('speaking'); } };
    const finish = () => { if (!active()) return; clearWatchdog(); update('idle'); line.onComplete?.(); };
    const error = event => { if (active()) { clearWatchdog(); update(event?.error === 'not-allowed' ? 'blocked' : 'error'); } };
    try {
      if (line.audioSrc && AudioClass) {
        media = new AudioClass(line.audioSrc); media.onplaying = start; media.onended = finish; media.onerror = error;
        media.play()?.catch(error); return true;
      }
      const available = voices();
      // Do not silently narrate Hebrew through an unrelated language voice.
      if (!synthesis || !Utterance || !available.length) { update('unavailable'); return false; }
      const choice = preferences.resolve(line.speaker, line.voicePreference);
      const usePronunciation = pronunciation ?? choice.pronunciationVerified;
      const utterance = new Utterance(usePronunciation ? line.speechText : line.displayText); utterance.lang = 'he-IL'; utterance.rate = 0.85;
      utterance.voice = choice.voice;
      utterance.onstart = start; utterance.onend = finish; utterance.onerror = error;
      utterance.onpause = () => { if (active()) update('paused'); };
      utterance.onresume = start;
      update('pending');
      // This detects a missing start event; it never advances dialogue or animation.
      watchdog = schedule(() => { if (active() && state === 'pending') { stop(); update('blocked'); } }, 5000);
      synthesis.speak(utterance); return true;
    } catch { error(); return false; }
  }
  synthesis?.addEventListener?.('voiceschanged', () => {
    // An already-enabled learner may be waiting for asynchronous voice loading.
    // Read only the current line; old scene callbacks remain invalidated.
    if (state === 'unavailable' && voices().length) {
      if (enabled && !muted && current) play(); else update('idle');
    }
  });
  return {
    get state() { return state; }, get muted() { return muted; }, get enabled() { return enabled; }, get current() { return current; }, voices, preferences,
    setLine(line, { auto = true } = {}) { stop(); current = line ? normalizeDialogue(line) : null; if (auto && enabled && !muted) play(current); },
    setVoicePreference(speaker, preference) { stop(); preferences.set(speaker, preference); update('idle'); },
    voiceStatus(speaker = current?.speaker || 'owl') { return preferences.resolve(speaker, current?.speaker === speaker ? current.voicePreference : null); },
    previewCurrent({ pronunciation = false } = {}) {
      if (!current) return false;
      const original = current; enabled = true;
      const played = play({ ...current, onComplete: null }, { pronunciation }); current = original; return played;
    },
    enable() { enabled = true; return play(); }, replay() { enabled = true; return play(); }, stop,
    attemptAutoplay(activation = globalThis.navigator?.userActivation) {
      if (!activation?.isActive && !activation?.hasBeenActive) return false;
      enabled = true; return play();
    },
    pause() {
      if (state === 'pending') { stop(); pausedBeforeStart = true; update('paused'); return; }
      if (state !== 'speaking') return;
      try { if (media) media.pause(); else synthesis?.pause?.(); update('paused'); } catch { update('error'); }
    },
    resume() {
      if (state !== 'paused' || muted) return;
      if (pausedBeforeStart) { play(); return; }
      try { if (media) media.play()?.catch(() => update('error')); else synthesis?.resume?.(); update('speaking'); } catch { update('error'); }
    },
    toggleMute() { muted = !muted; if (muted) stop(); return muted; }
  };
}
