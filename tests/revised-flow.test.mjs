import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTestDocument } from './dom-fixture.mjs';
import { createProgressState, initLearningFlow, STAGES } from '../js/learning-flow.js';
import { createAssessmentState, initAssessment } from '../js/assessment.js';
import { approved } from '../js/content.js';
import { secret1OptionalCheck } from '../js/provisional-content.js';

export async function runRevisedFlowTests() {
  const results = [];
  const check = (test, action) => { action(); results.push({ test, passed: true }); };
  check('Prerequisites block visits and completion of future stages', () => {
    const p = createProgressState(); assert.equal(p.active,'opening');
    for (const id of STAGES.slice(1)) { assert.equal(p.visit(id),false); assert.equal(p.complete(id),false); }
    assert.equal(p.complete('opening'),true); assert.equal(p.visit('secret-1'),true); assert.equal(p.visit('assessment'),false);
  });
  check('Completed content can be reviewed without clearing progress', () => {
    const p = createProgressState(); ['opening','secret-1','secret-2'].forEach(id=>p.complete(id));
    p.visit('secret-3'); p.visit('secret-1'); assert.ok(p.isComplete('secret-2')); assert.ok(p.canVisit('secret-3')); assert.equal(p.canVisit('assessment'),false);
  });
  const doc = createTestDocument(); globalThis.document = doc;
  const nodes = {}, nav = [], starts = [];
  const add = (id, tag='div') => { const node=doc.createElement(tag);node.id=id;nodes[id]=node;doc.append(node);return node; };
  STAGES.forEach(id=>{ add(id,'section');add(id==='opening'?'page-title':id==='completion'?'completion-title':id+'-title','h2'); });
  add('storyboard','section');add('main');nodes.main.scrollIntoView=()=>{};
  const brand=add('brand','a');brand.className='brand';add('completion-home','button');add('completion-review','button');
  for(const id of STAGES.slice(0,5)) { const a=doc.createElement('a');a.hash='#'+id; a.removeAttribute=key=>{delete a.attributes[key];};const span=doc.createElement('span');span.className='progress-state';a.append(span);nav.push(a); }
  const start=doc.createElement('button');starts.push(start);
  doc.getElementById=id=>nodes[id];const queryAll=doc.querySelectorAll.bind(doc);
  doc.querySelectorAll=selector=>selector==='.nav-links a'?nav:selector==='[data-start-learning]'?starts:queryAll(selector);
  const listeners={};globalThis.window={location:{hash:''},history:{replaceState(a,b,hash){window.location.hash=hash;}},addEventListener(type,fn){listeners[type]=fn;}};
  const flow=initLearningFlow();const active=()=>STAGES.filter(id=>!nodes[id].hidden);
  check('DOM stage manager shows only opening initially and locks progress links',()=>{assert.deepEqual(active(),['opening']);assert.equal(nav[3].getAttribute('aria-disabled'),'true');});
  check('Progress and forged hashes cannot bypass interactions',()=>{nav[3].click();assert.deepEqual(active(),['opening']);window.location.hash='#secret-3';listeners.hashchange();assert.equal(window.location.hash,'#opening');assert.deepEqual(active(),['opening']);});
  check('Opening skip/start unlocks Secret 1 and focuses its heading',()=>{start.click();assert.deepEqual(active(),['secret-1']);assert.equal(nodes.storyboard.hidden,true);assert.equal(doc.activeElement,nodes['secret-1-title']);});
  check('Completion callbacks unlock one next stage while review keeps state',()=>{flow.complete('secret-1');nav[2].click();assert.deepEqual(active(),['secret-2']);nav[1].click();assert.deepEqual(active(),['secret-1']);assert.ok(flow.progress.isComplete('secret-1'));assert.equal(flow.progress.canVisit('secret-3'),false);});
  check('Completion is unavailable before assessment completion',()=>{assert.equal(flow.visit('completion'),false);flow.complete('secret-2');flow.complete('secret-3');assert.ok(flow.visit('assessment'));assert.equal(flow.visit('completion'),false);});
  check('Completion home and learn-again are functional review actions',()=>{flow.complete('assessment');flow.visit('completion');nodes['completion-home'].click();assert.deepEqual(active(),['opening']);flow.visit('completion');nodes['completion-review'].click();assert.deepEqual(active(),['secret-1']);assert.ok(flow.progress.isComplete('secret-3'));});

  check('Normal assessment contains all five questions and optional Secret 1 check remains off',()=>{const q=createAssessmentState();assert.equal(q.questions.length,5);assert.equal(secret1OptionalCheck.enabled,false);assert.deepEqual(q.questions.map(x=>x.id),['q1','q2','q3','q4','q5']);});
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const source=await readFile(new URL('../docs/inspection/revised-spec-2026-11-09.txt',import.meta.url),'utf8');
  check('Completion uses revised approved wording without scores',()=>{for(const key of ['completionTitle','completionBody','completionAction']){assert.ok(source.includes(approved[key]));assert.ok(html.includes('data-copy="'+key+'"'));}approved.completionSummary.forEach(text=>assert.ok(source.includes(text)));});
  return results;
}
