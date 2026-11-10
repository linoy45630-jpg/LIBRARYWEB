import { approved } from './content.js';

// Current working version, explicitly requested by the user.
// Q2–4 use proposed November 9 wording; Q5 is a revised user-requested
// implementation proposal. These statuses do not imply previous approval.
export const assessmentQuestions = [
  { id: 'q1', type: 'sequence', presentation: 'illustrated-sequence', sourceStatus: 'approved-sequence',
    prompt: approved.assessmentInstruction,
    steps: approved.assessmentSteps,
    feedback: approved.assessmentCorrect, hint: approved.assessmentIncorrect },
  { id: 'q2', type: 'single', presentation: 'card', sourceStatus: 'november-9-proposal-user-requested',
    prompt: 'איזה פרט בכרטיס הספר מספר לנו מי כתב אותו?', options: ['שם הספר', 'סוג הספר', 'שם המחבר', 'שם הספרייה'], answer: 2,
    feedback: 'שם המחבר הוא הפרט שמספר לנו מי כתב את הספר.', hint: 'נסו שוב. חפשו פרט שמציין אדם, ולא את שם הספר או את סוגו.' },
  { id: 'q3', type: 'single', presentation: 'shelves', sourceStatus: 'november-9-proposal-user-requested',
    prompt: 'בכרטיס הספר כתוב שסוג הספר הוא בלשות. לאיזה מדף ניגש בספרייה של תולי?', options: ['הרפתקאות', 'בלשות', 'פנטזיה', 'ספרי מידע'], answer: 1,
    feedback: 'מחפשים את השלט שתואם לסוג הספר המופיע בכרטיס.', hint: 'בדקו שוב את סוג הספר שבשאלה והשוו אותו לשלטי המדפים.' },
  { id: 'q4', type: 'single', presentation: 'spines', sourceStatus: 'november-9-proposal-user-requested',
    prompt: 'איזה שם משפחה יופיע ראשון בסדר הא׳–ב׳?', options: ['ברק', 'גולן', 'אבני', 'דקל'], answer: 2,
    feedback: 'אבני מתחיל באות א׳, שקודמת לאותיות ב׳, ג׳ וד׳.', hint: 'השוו את האות הראשונה בכל שם משפחה לפי סדר האלף־בית.' },
  { id: 'q5', type: 'single', presentation: 'spines', sourceStatus: 'user-requested-revised-proposal',
    proposalLabel: 'נוסח מוצע לביקורת בגרסת העבודה',
    prompt: 'איזה שם משפחה מופיע מיד אחרי ברמן בסדר הא׳–ב׳?', options: ['ברגר', 'ברוך', 'ברק', 'ברמן'], answer: 2,
    feedback: 'כל השמות מתחילים באותיות בר. משווים את האות השלישית: מ׳ באה לפני ק׳, ולכן ברק מופיע אחרי ברמן. אנחנו משווים רק את האפשרויות המוצגות כאן; ברשימה רחבה יותר עשויים להופיע שמות משפחה נוספים ביניהם.',
    hint: 'כל האפשרויות מתחילות בבר. השוו את האות השלישית וחפשו את השם הבא אחרי ברמן מבין האפשרויות המוצגות.' }
];
