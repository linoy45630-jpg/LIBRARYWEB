import assert from 'node:assert/strict';
import { createSpeechController } from '../js/speech-controller.js';
import { createCharacters } from '../js/character-controller.js';
import { initDialogueController } from '../js/dialogue-controller.js';
import { approved } from '../js/content.js';
import { subscribeDialogue, presentDialogue } from '../js/dialogue-events.js';
import { createTestDocument } from './dom-fixture.mjs';

export function runNarrationTests() {
  const results = [];
  const test = (name, action) => { action(); results.push({ test: name, passed: true }); };
  let utterances = [], cancels = 0, states = [], available = [{name:'Hebrew',lang:'he-IL',voiceURI:'hebrew'}];
  const synth = { getVoices: () => available, cancel: () => cancels++, speak: u => utterances.push(u), pause() {}, resume() {} };
  class Utterance { constructor(text) { this.text = text; } }
  const speech = createSpeechController({ synthesis: synth, Utterance, onState: state => states.push(state) });
  const owl = {character:'owl',text:'שלום'}, tuli = {character:'tuli',text:'יששש!'};
  test('No narration before explicit audio interaction', () => { speech.setLine(owl); assert.equal(utterances.length,0); });
  test('Enable chooses Hebrew voice and child-friendly rate', () => { speech.enable(); assert.equal(utterances[0].lang,'he-IL'); assert.equal(utterances[0].voice,available[0]); assert.equal(utterances[0].rate,.85); });
  test('Animation lifecycle follows start, pause, resume and end', () => { utterances.at(-1).onstart(); assert.equal(speech.state,'speaking'); speech.pause(); assert.equal(speech.state,'paused'); speech.resume(); assert.equal(speech.state,'speaking'); utterances.at(-1).onend(); assert.equal(speech.state,'idle'); });
  test('Replay keeps exact current line and cancels previous audio', () => { const count=cancels; speech.replay(); assert.equal(utterances.at(-1).text,owl.text); assert.ok(cancels>count); });
  test('New dialogue cancels narration; stale callbacks cannot change scene', () => { const previous=utterances.at(-1); speech.setLine(tuli); utterances.at(-1).onstart(); previous.onend(); previous.onerror(); assert.equal(speech.state,'speaking'); assert.equal(utterances.at(-1).text,tuli.text); });
  test('One Hebrew voice is shared when no second voice exists', () => assert.equal(utterances.at(-1).voice,available[0]));
  test('Selected Hebrew voices map consistently to characters without guessing gender', () => { available.push({name:'Other',lang:'he-IL',voiceURI:'other'}); speech.setVoicePreference('tuli',{voiceURI:'other'}); speech.setLine(tuli); assert.equal(utterances.at(-1).voice.name,'Other'); speech.setLine(owl); assert.equal(utterances.at(-1).voice.name,'Hebrew'); });
  test('Mute cancels, survives new lines, and replay never unmutes', () => { speech.toggleMute(); const count=utterances.length; speech.setLine(tuli); speech.replay(); assert.equal(utterances.length,count); assert.equal(speech.muted,true); speech.toggleMute(); assert.equal(utterances.length,count); speech.replay(); assert.equal(utterances.length,count+1); });
  test('Stop invalidates callbacks including completion callback', () => { let called=false; speech.setLine({...owl,onComplete:()=>called=true}); const old=utterances.at(-1); speech.stop(); old.onstart(); old.onend(); assert.equal(called,false); assert.equal(speech.state,'idle'); });
  test('Speech errors return recoverable state', () => { speech.replay(); utterances.at(-1).onerror(); assert.equal(speech.state,'error'); speech.replay(); utterances.at(-1).onstart(); assert.equal(speech.state,'speaking'); });
  test('Missing Hebrew voice fails gracefully without unrelated voice', () => { available=[{name:'English',lang:'en-US'}]; const count=utterances.length; speech.setLine(owl); assert.equal(speech.state,'unavailable'); assert.equal(utterances.length,count); });
  test('Missing speech API does not throw', () => { const missing=createSpeechController({synthesis:null,Utterance:null}); missing.setLine(owl); assert.equal(missing.enable(),false); assert.equal(missing.state,'unavailable'); });
  test('Characters use independent original-derived image elements', () => { const document=createTestDocument(); const characters=createCharacters(document); assert.equal(characters.element.querySelectorAll('img').length,2); characters.set('tuli','speaking'); assert.equal(characters.element.children[1].dataset.state,'speaking'); assert.equal(characters.element.children[0].dataset.state,'listening'); assert.ok(characters.element.children[0].children[0].src.endsWith('owl-welcome.png')); });
  test('Dialogue events preserve speaker and exact text without learning mutation', () => { let received; const remove=subscribeDialogue(event=>received=event); presentDialogue('secret-2',[owl,tuli]); assert.equal(received.lines[1].text,tuli.text); assert.equal(received.lines[1].character,'tuli'); remove(); });
  test('Silent review does not automatically replay saved narration', () => { available=[{name:'Hebrew',lang:'he-IL'}]; const count=utterances.length; speech.setLine(owl,{auto:false}); assert.equal(utterances.length,count); });
  test('Integrated controls match characters and navigation cancels stale speech', () => {
    const originalDocument=globalThis.document, originalWindow=globalThis.window, originalSynth=globalThis.speechSynthesis, originalUtterance=globalThis.SpeechSynthesisUtterance;
    const document=createTestDocument(), handlers={};
    document.getElementById=id=>document.querySelector('#'+id);
    for (const id of ['opening','secret-1','secret-2','secret-3','assessment','completion','component-dialog','intro-replay']) { const node=document.createElement('section'); node.id=id; document.append(node); }
    globalThis.document=document; globalThis.window={addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn)}; globalThis.speechSynthesis=synth; globalThis.SpeechSynthesisUtterance=Utterance;
    try {
      const {panel,speech:integrated}=initDialogueController();
      assert.equal(panel.querySelector('strong').textContent,'הינשופה');
      assert.equal(panel.querySelector('p').textContent,approved.welcome);
      const controls=panel.querySelectorAll('button'); assert.equal(controls.length,6); assert.ok(controls.every(button=>button.type==='button'));
      controls[0].click(); const old=utterances.at(-1); old.onstart();
      assert.equal(panel.querySelector('.guide-character').dataset.state,'speaking');
      handlers['library-stage-change'][0]({detail:'secret-2'});
      utterances.at(-1).onstart(); old.onend(); assert.equal(integrated.state,'speaking');
      assert.equal(panel.querySelector('p').textContent,approved.secret2Introduction);
      controls[3].click(); handlers['library-stage-change'][0]({detail:'completion'}); assert.equal(integrated.muted,true); assert.equal(integrated.state,'idle');
      controls[4].click(); assert.equal(panel.querySelector('strong').textContent,'תולי'); assert.equal(panel.querySelector('p').textContent,approved.completionBody); integrated.stop();
    } finally { globalThis.document=originalDocument; globalThis.window=originalWindow; globalThis.speechSynthesis=originalSynth; globalThis.SpeechSynthesisUtterance=originalUtterance; }
  });
  return results;
}
