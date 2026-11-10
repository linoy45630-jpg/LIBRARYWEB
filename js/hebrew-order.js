// Explicit educational alphabet order; final forms sort with their base letter.
export const HEBREW_ALPHABET = 'אבגדהוזחטיכלמנסעפצקרשת';
const finalForms = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
export function normalizeHebrew(value) {
  return value.normalize('NFKD').replace(/[\u0591-\u05C7]/g, '').replace(/[ךםןףץ]/g, letter => finalForms[letter]).replace(/\s/g, '');
}
export function compareHebrew(a, b) {
  a = normalizeHebrew(a); b = normalizeHebrew(b);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const left = HEBREW_ALPHABET.indexOf(a[i]);
    const right = HEBREW_ALPHABET.indexOf(b[i]);
    if (left < 0 || right < 0) throw new Error('Unsupported character in Hebrew surname');
    if (left !== right) return left - right;
  }
  return a.length - b.length;
}
