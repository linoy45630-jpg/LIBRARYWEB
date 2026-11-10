// Fictional working examples; titles and non-target first names await final approval.
export const sampleBook = { title: 'סוד הדרקון הכחול', firstName: 'נועה', surname: 'ברק', genre: 'פנטזיה', year: '—' };
export const sampleAuthors = [
  { firstName: 'יעל', surname: 'אבני', title: 'האוצר שבעליית הגג' },
  { firstName: 'דנה', surname: 'ברגר', title: 'היער שמעבר לגשר' },
  { firstName: 'יואב', surname: 'ברוך', title: 'המסע אל האי' },
  { firstName: 'מיכל', surname: 'ברמן', title: 'מפתח הכוכבים' },
  { firstName: 'נועה', surname: 'ברק', title: 'סוד הדרקון הכחול' },
  { firstName: 'עידו', surname: 'גולן', title: 'ההר הסודי' }
];
export const introMedia = { video: null, captions: null, poster: null };
// PROVISIONAL optional Secret 1 check: disabled and never rendered for learners.
export const secret1OptionalCheck = { enabled: false, prompt: 'תולי רוצה לדעת מי כתב את הספר. על איזה פרט בכרטיס צריך ללחוץ?', correctField: 'author' };
// PROVISIONAL connecting video dialogue is not an approved transcript.
export const proposedVideoLink = 'אל דאגה, תולי! נגלה יחד שלושה סודות שיעזרו לנו למצוא את הספר.';
// PROVISIONAL microcopy only where the new specification has no full wording.
export const secret3Draft = {
  secondPrompt: 'האות השנייה בכרטיס מודגשת. בחרו את קבוצת שתי האותיות המתאימה.',
  secondLetterChoices: ['ג', 'ר', 'מ'],
  secondCorrect: 'כל שמות המשפחה בקבוצה מתחילים בבר. נבדוק עכשיו את האות השלישית.',
  thirdPrompt: 'בברגר האות השלישית היא ג, בברוך ו, בברמן מ ובברק ק. היעזרו באלף־בית ולחצו להמשך החיפוש.',
  continueSearch: 'ממשיכים לחפש',
  firstHint: 'השוו את האות הראשונה בכרטיס לתחילת שמות המשפחה בקבוצות.',
  secondHint: 'השוו את האות השנייה בכרטיס לאות השנייה בכל אפשרות.'
};
// Working assessment questions are maintained in assessment-content.js.
