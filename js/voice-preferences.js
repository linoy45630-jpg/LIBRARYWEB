const STORAGE_KEY = 'libraryweb.voice-preferences.v1';
export function hebrewVoices(synthesis) {
  return (synthesis?.getVoices?.() || []).filter(voice => /^(he|iw)(-|_|$)/i.test(voice.lang))
    .sort((a, b) => Number(/^he-IL$/i.test(b.lang)) - Number(/^he-IL$/i.test(a.lang)) || Number(b.default) - Number(a.default) || a.name.localeCompare(b.name));
}
export function createVoicePreferences({ synthesis = globalThis.speechSynthesis, storage } = {}) {
  let values = {};
  try {
    storage ??= globalThis.localStorage;
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || '{}');
    values = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { values = {}; }
  function get(speaker) { return values[speaker] || {}; }
  function set(speaker, preference) {
    if (!['owl', 'tuli'].includes(speaker)) return;
    values[speaker] = { voiceURI: preference.voiceURI || '', verifiedFemale: speaker === 'owl' && preference.verifiedFemale === true, pronunciationVerified: preference.pronunciationVerified === true };
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(values)); } catch { /* Private browsing can deny storage. */ }
  }
  function resolve(speaker, override) {
    const available = hebrewVoices(synthesis), preference = override || get(speaker);
    const selected = available.find(voice => voice.voiceURI && voice.voiceURI === preference.voiceURI);
    // Voice API has no standard gender field. Only a listening-confirmed choice
    // may be identified as female, never a guessed name or pitch adjustment.
    return { voice: selected || available[0] || null, verifiedFemale: !!selected && preference.verifiedFemale === true,
      pronunciationVerified: !!selected && preference.pronunciationVerified === true, fallback: !selected };
  }
  return { get, set, resolve, voices: () => hebrewVoices(synthesis) };
}
