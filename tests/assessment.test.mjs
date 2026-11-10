import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTestDocument } from './dom-fixture.mjs';
import { createAssessmentState, initAssessment } from '../js/assessment.js';
import { assessmentQuestions } from '../js/assessment-content.js';
import { createProgressState } from '../js/learning-flow.js';
import { compareHebrew } from '../js/hebrew-order.js';

// Event/model regression tests, not native browser keyboard/pointer/layout tests.
export async function runAssessmentTests() {
  const results = [];
  const check = (test, action) => { action(); results.push({ test, passed: true }); };
  function fixture() {
    const document = createTestDocument(); globalThis.document = document;
    const section = document.createElement('section'); section.id = 'assessment'; document.append(section);
    const nodes = {};
    for (const id of ['assessment-question','assessment-progress','assessment-development-note']) {
      const node = document.createElement('div'); node.id = id; nodes[id] = node; section.append(node);
    }
    const progress = createProgressState();
    ['opening','secret-1','secret-2','secret-3'].forEach(id => progress.complete(id));
    progress.visit('assessment');
    let completions = 0;
    const model = initAssessment({ onComplete: () => { completions += 1; progress.complete('assessment'); progress.visit('completion'); } });
    const button = label => section.querySelectorAll('button').find(b => b.textContent === label);
    const select = index => {
      const radios = section.querySelectorAll('input'); radios.forEach(r => { r.checked = false; });
      radios[index].checked = true; radios[index].dispatch('change');
    };
    const solveSequence = () => { const rows = section.querySelectorAll('li'); rows[0].dispatch('dragstart',{dataTransfer:{setData(){}}}); rows[2].dispatch('drop'); button('בדיקת תשובה').click(); };
    return {document,section,nodes,model,progress,button,select,solveSequence,completionCount:()=>completions};
  }
  check('All five questions are active in the normal fixed sequence',()=>{
    const q=createAssessmentState();assert.deepEqual(q.questions.map(x=>x.id),['q1','q2','q3','q4','q5']);assert.equal(q.questions.length,5);
    assert.equal(q.questions[0].type,'sequence');assert.equal(q.questions.slice(1).every(x=>x.type==='single'),true);
  });
  check('Question 1 has exactly the newly requested three step texts',()=>{
    assert.deepEqual(assessmentQuestions[0].steps,['בודקים בכרטיס את סוג הספר','ניגשים למדף המתאים לפי השלט','מחפשים לפי שם המשפחה של המחבר']);
  });
  check('Unanswered, partial and incorrect sequence states never unlock next',()=>{
    const q=createAssessmentState();assert.equal(q.check(),'unanswered');assert.equal(q.next(),'blocked');
    q.move(0,1);assert.equal(q.check(),'partial');q.move(1,0);assert.equal(q.check(),'incorrect');assert.equal(q.next(),'blocked');
  });
  check('Sequence DOM contains three relevant illustrations and drag alternatives',()=>{
    const f=fixture();assert.equal(f.section.querySelectorAll('.sequence-visual').length,3);assert.equal(f.section.querySelectorAll('img').length,2);assert.equal(f.section.querySelectorAll('.decorative-spines').length,1);assert.equal(f.section.querySelectorAll('select').length,3);assert.equal(f.section.querySelectorAll('li').every(row=>row.draggable),true);
  });
  check('Up/down controls operate without dragging and restore control focus',()=>{
    const f=fixture();for(let i=0;i<2;i++){const row=f.section.querySelectorAll('li').find(li=>li.querySelector('.sequence-text').textContent===assessmentQuestions[0].steps[2]);row.querySelectorAll('button').find(b=>b.textContent==='למטה').click();}
    assert.deepEqual(f.model.answer.order,[0,1,2]);assert.equal(f.document.activeElement.tagName,'select');f.button('בדיקת תשובה').click();assert.equal(f.button('לשאלה הבאה').disabled,false);assert.equal(f.section.querySelectorAll('.sequence-correct').length,3);
  });
  check('Select-position alternative uses the same ordering model',()=>{
    const f=fixture();const select=f.section.querySelectorAll('select')[0];select.value='2';select.dispatch('change');assert.deepEqual(f.model.answer.order,[0,1,2]);
  });
  check('Drag/drop reorders correctly and checking never automatically skips feedback',()=>{
    const f=fixture();f.solveSequence();assert.equal(f.model.index,0);assert.equal(f.section.querySelector('#assessment-feedback').textContent,assessmentQuestions[0].feedback);assert.equal(f.section.querySelectorAll('h3').length,1);assert.equal(f.button('לשאלה הבאה').disabled,false);
  });
  check('Question 2 uses the existing book card and validates author field',()=>{
    const f=fixture();f.solveSequence();f.button('לשאלה הבאה').click();assert.equal(f.model.question.id,'q2');assert.equal(f.section.querySelectorAll('.book-card').length,1);assert.equal(f.section.querySelectorAll('input').length,4);f.select(0);f.button('בדיקת תשובה').click();assert.equal(f.model.index,1);assert.ok(f.button('לשאלה הבאה').disabled);f.select(2);f.button('בדיקת תשובה').click();assert.equal(f.section.querySelector('#assessment-feedback').textContent,assessmentQuestions[1].feedback);assert.equal(f.section.querySelectorAll('.is-correct').length,1);assert.equal(f.section.querySelectorAll('.choice-status').filter(x=>x.textContent==='תשובה נכונה').length,1);
  });
  const f=fixture();f.solveSequence();f.button('לשאלה הבאה').click();
  check('Repeated wrong selections stay on question 2 and do not reveal the answer',()=>{
    for(let i=0;i<5;i++){f.select(0);f.button('בדיקת תשובה').click();assert.equal(f.model.index,1);assert.ok(f.button('לשאלה הבאה').disabled);assert.equal(f.section.querySelectorAll('.is-correct').length,0);assert.equal(f.completionCount(),0);}
    f.select(2);f.button('בדיקת תשובה').click();f.button('לשאלה הבאה').click();
  });
  check('Question 3 uses four illustrated shelves in the requested order and a new genre',()=>{
    assert.equal(f.model.question.id,'q3');assert.deepEqual(f.model.question.options,['הרפתקאות','בלשות','פנטזיה','ספרי מידע']);assert.equal(f.section.querySelectorAll('.genre-shelf').length,4);assert.equal(f.section.querySelectorAll('.decorative-spines').length,4);assert.deepEqual(f.section.querySelectorAll('.shelf-sign').map(n=>n.textContent),f.model.question.options);f.select(2);f.button('בדיקת תשובה').click();assert.ok(f.button('לשאלה הבאה').disabled);f.select(1);f.button('בדיקת תשובה').click();f.button('לשאלה הבאה').click();
  });
  check('Question 4 validates explicit Hebrew ordering and shows book spines',()=>{
    assert.equal(f.model.question.id,'q4');assert.deepEqual(f.model.question.options,['ברק','גולן','אבני','דקל']);assert.equal([...f.model.question.options].sort(compareHebrew)[0],'אבני');assert.equal(f.section.querySelectorAll('.assessment-book-spine').length,4);f.select(2);f.button('בדיקת תשובה').click();f.button('לשאלה הבאה').click();
  });
  check('Question 5 replaces the weak draft and qualifies the comparison to listed options',()=>{
    const q=f.model.question;assert.equal(q.id,'q5');assert.equal(q.prompt,'איזה שם משפחה מופיע מיד אחרי ברמן בסדר הא׳–ב׳?');assert.deepEqual(q.options,['ברגר','ברוך','ברק','ברמן']);const sorted=[...q.options].sort(compareHebrew);assert.equal(sorted[sorted.indexOf('ברמן')+1],'ברק');assert.equal(q.options[q.answer],'ברק');assert.ok(q.feedback.includes('רק את האפשרויות המוצגות כאן'));assert.ok(q.feedback.includes('שמות משפחה נוספים ביניהם'));assert.equal(q.sourceStatus,'user-requested-revised-proposal');
  });
  check('Completion remains locked until question 5 is answered correctly',()=>{
    assert.equal(f.nodes['assessment-progress'].textContent,'שאלה 5 מתוך 5');assert.equal(f.progress.canVisit('completion'),false);assert.ok(f.button('לסיום').hidden);f.select(0);f.button('בדיקת תשובה').click();assert.equal(f.model.index,4);assert.equal(f.completionCount(),0);f.select(2);f.button('בדיקת תשובה').click();assert.equal(f.completionCount(),0);assert.equal(f.button('לסיום').hidden,false);assert.equal(f.button('לסיום').disabled,false);
  });
  check('Finish unlocks existing completion only after explicit confirmation',()=>{
    f.button('לסיום').click();assert.equal(f.completionCount(),1);assert.equal(f.progress.active,'completion');assert.ok(f.progress.isComplete('assessment'));
  });
  check('Revisiting completed content preserves quiz position, answers and finish navigation',()=>{
    f.progress.visit('secret-1');assert.equal(f.model.index,4);assert.ok(f.model.answers.every(answer=>answer.passed));f.progress.visit('assessment');assert.equal(f.nodes['assessment-progress'].textContent,'שאלה 5 מתוך 5');f.button('לסיום').click();assert.equal(f.progress.active,'completion');assert.equal(f.completionCount(),2);
  });
  check('All five questions show one heading at a time with accurate progress',()=>{
    const g=fixture();g.solveSequence();for(let i=0;i<5;i++){assert.equal(g.model.index,i);assert.equal(g.nodes['assessment-progress'].textContent,`שאלה ${i+1} מתוך 5`);assert.equal(g.section.querySelectorAll('h3').length,1);if(i>0){g.select(g.model.question.answer);g.button('בדיקת תשובה').click();}if(i<4)g.button('לשאלה הבאה').click();}assert.equal(g.model.pending,false);
  });
  check('Unanswered radio validation and success guard prevent contradictory feedback',()=>{
    const g=fixture();g.solveSequence();g.button('לשאלה הבאה').click();g.button('בדיקת תשובה').click();assert.equal(g.section.querySelector('#assessment-feedback').textContent,'יש לענות על השאלה לפני הבדיקה.');g.select(2);g.button('בדיקת תשובה').click();const message=g.section.querySelector('#assessment-feedback').textContent;assert.equal(g.model.select(0),false);assert.equal(g.model.answer.selected,2);assert.equal(g.section.querySelector('#assessment-feedback').textContent,message);
  });
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const code=await readFile(new URL('../js/assessment.js',import.meta.url),'utf8');
  check('No score/timer/mistake counter or partial-assessment gate is rendered',()=>{
    assert.equal(code.includes('שאלה 2 מתוך 5 — ממתינה לאישור'),false);assert.equal(code.includes('previewProvisionalAssessment'),false);assert.equal(/id="(?:score|timer|mistake-counter)"/.test(html),false);
  });
  return results;
}
