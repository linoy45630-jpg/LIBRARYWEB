// Visible copy stays verbatim. Vowelled candidates require listening verification
// for the selected voice before the speech controller uses them.
export function pronunciationCandidate(text) {
  return text.replaceAll('ספרייה', 'סִפרייה').replaceAll('ספרים', 'סְפָרִים')
    .replaceAll('תולי', 'תּוּלִי').replaceAll('שלושה', 'שְׁלוֹשָׁה').replaceAll('סודות', 'סוֹדוֹת');
}
export function normalizeDialogue(entry) {
  const source = typeof entry === 'string' ? { displayText: entry } : entry;
  const displayText = source.displayText ?? source.text ?? '';
  const speaker = source.speaker ?? source.character ?? 'owl';
  const audioSrc = source.audioSrc ?? source.audio ?? null;
  return { ...source, displayText, speechText: source.speechText ?? pronunciationCandidate(displayText), speaker,
    audioSrc, voicePreference: source.voicePreference ?? null,
    // Compatibility for existing learning modules; there is one canonical copy.
    text: displayText, character: speaker, audio: audioSrc };
}
