export function voicePreviewEnabled(location = globalThis.location) {
  return !!location && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname)
    && new URLSearchParams(location.search).get('voice-preview') === '1';
}
export function initVoicePreview(speech, { documentRef = document, synthesis = globalThis.speechSynthesis } = {}) {
  const panel = documentRef.createElement('details'); panel.className = 'voice-preview';
  const summary = documentRef.createElement('summary'); summary.textContent = 'כלי פיתוח: בחירת קולות ובדיקת הגייה'; panel.append(summary);
  const note = documentRef.createElement('p'); note.textContent = 'הדפדפן אינו מספק נתון מגדר תקני. האזינו לדיאלוג פעיל לפני אישור קול נשי. סימון הניקוד חל רק על הקול הנבחר; בטלו אם ההגייה פחות ברורה.'; panel.append(note);
  const rows = [];
  for (const speaker of ['owl', 'tuli']) {
    const row = documentRef.createElement('fieldset'), legend = documentRef.createElement('legend'); legend.textContent = speaker === 'owl' ? 'קול הינשופה' : 'קול תולי'; row.append(legend);
    const label = documentRef.createElement('label'); label.textContent = 'קול עברי '; const select = documentRef.createElement('select'); select.setAttribute('aria-label', legend.textContent); label.append(select); row.append(label);
    function checkbox(text) { const wrapper = documentRef.createElement('label'), input = documentRef.createElement('input'); input.type = 'checkbox'; wrapper.append(input, documentRef.createTextNode(text)); row.append(wrapper); return input; }
    const female = speaker === 'owl' ? checkbox('האזנתי ואימתתי שזהו קול נשי מתאים לינשופה') : null;
    const pronunciation = checkbox('השוויתי: הניקוד משפר את ההגייה בקול זה');
    function populate() {
      select.replaceChildren();
      const fallback = documentRef.createElement('option'); fallback.value = ''; fallback.textContent = 'קול עברי חלופי — ללא אימות מגדר'; select.append(fallback);
      for (const voice of speech.voices()) { const option = documentRef.createElement('option'); option.value = voice.voiceURI; option.textContent = voice.name + ' · ' + voice.lang; select.append(option); }
      const saved = speech.preferences.get(speaker); select.value = saved.voiceURI || ''; if (female) female.checked = saved.verifiedFemale === true; pronunciation.checked = saved.pronunciationVerified === true;
    }
    function save() { speech.setVoicePreference(speaker, { voiceURI: select.value, verifiedFemale: female?.checked === true, pronunciationVerified: pronunciation.checked }); }
    select.addEventListener('change', () => { if (female) female.checked = false; pronunciation.checked = false; save(); });
    female?.addEventListener('change', save); pronunciation.addEventListener('change', save);
    rows.push(populate); populate(); panel.append(row);
  }
  for (const [text, pronunciation] of [['השמעת הדיאלוג הנוכחי ללא ניקוד', false], ['השמעת הדיאלוג הנוכחי עם ניקוד לניסיון', true]]) {
    const button = documentRef.createElement('button'); button.type = 'button'; button.textContent = text; button.addEventListener('click', () => speech.previewCurrent({ pronunciation })); panel.append(button);
  }
  const available = documentRef.createElement('p'); available.textContent = speech.voices().length ? 'ההגדרות נשמרות מקומית בדפדפן זה. עברו לשורה של הדמות הרצויה כדי להאזין לקולה.' : 'אין כרגע קול עברי. הטקסט והלמידה זמינים.'; panel.append(available);
  synthesis?.addEventListener?.('voiceschanged', () => { rows.forEach(populate); available.textContent = speech.voices().length ? 'רשימת הקולות עודכנה. ניתן לבחור ולהאזין.' : 'לא נמצא קול עברי בדפדפן.'; });
  documentRef.body.append(panel); return panel;
}
