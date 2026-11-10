import assert from 'node:assert/strict';
import { createIntroSequence, introScenes } from '../js/cinematic-intro.js';
import { createSpeechController } from '../js/speech-controller.js';
import { approved } from '../js/content.js';
import { proposedVideoLink } from '../js/provisional-content.js';

export function runCinematicTests() {
  const results=[];
  const test=(name,action)=>{action();results.push({test:name,passed:true});};
  let scenes=[], finished=0, cancelled=0, pauses=0, resumes=0;
  const intro=createIntroSequence({onScene:(line,index)=>scenes.push({line,index}),onFinish:()=>finished++,onCancel:()=>cancelled++,onPause:()=>pauses++,onResume:()=>resumes++});
  test('Opening contains three exact approved scenes and one explicitly proposed link',()=>{
    assert.deepEqual(introScenes.slice(0,3).map(s=>s.text),approved.scenes.flatMap(s=>s.lines));
    assert.equal(introScenes[3].text,proposedVideoLink); assert.equal(introScenes[3].proposed,true);
    assert.deepEqual(introScenes.map(s=>s.character),['owl','tuli','tuli','owl']); assert.equal(introScenes[2].expression,'confused');
  });
  test('Start displays welcome and does not advance based on a timer',()=>{intro.start(); assert.equal(intro.index,0); assert.equal(scenes.length,1); assert.equal(finished,0);});
  test('Speech completion advances scenes in order',()=>{scenes.at(-1).line.onComplete(); assert.equal(intro.index,1); scenes.at(-1).line.onComplete(); assert.equal(intro.index,2);});
  test('Pause defers speech-end advancement and invokes speech pause hook',()=>{intro.pause(); scenes.at(-1).line.onComplete(); intro.next(); assert.equal(intro.index,2); assert.equal(pauses,1);});
  test('Resume consumes deferred completion once',()=>{intro.resume(); assert.equal(resumes,1); assert.equal(intro.index,3);});
  test('Final speech completion reveals continuation without navigating to learning',()=>{scenes.at(-1).line.onComplete(); assert.equal(intro.finished,true); assert.equal(finished,1); assert.equal(intro.index,3);});
  test('Replay resets opening; old callbacks cannot skip the new first scene',()=>{const old=scenes.at(-1).line.onComplete;intro.start();old();assert.equal(intro.index,0);assert.equal(intro.finished,false);});
  test('Skip cancels pending speech and reveals continuation',()=>{const old=scenes.at(-1).line.onComplete;const count=cancelled;intro.skip();old();assert.equal(intro.finished,true);assert.equal(intro.index,0);assert.ok(cancelled>count);});
  test('Manual next works without audio and cannot run after cancellation',()=>{intro.start();intro.next();assert.equal(intro.index,1);intro.cancel();intro.next();assert.equal(intro.index,1);});
  let spoken=[], callbacks=[], states=[], cancellations=0;
  const synthesis={getVoices:()=>[{lang:'he-IL',name:'Hebrew'}],speak:u=>spoken.push(u),cancel:()=>cancellations++};
  class Utterance {constructor(text){this.text=text;}}
  const speech=createSpeechController({synthesis,Utterance,onState:s=>states.push(s),schedule:fn=>{callbacks.push(fn);return callbacks.length;},clearSchedule:()=>{}});
  test('Initial load without user activation makes no autoplay attempt',()=>{speech.setLine(introScenes[0]);assert.equal(speech.attemptAutoplay({isActive:false,hasBeenActive:false}),false);assert.equal(spoken.length,0);});
  test('Allowed user activation starts narration and subsequent lines start automatically',()=>{speech.attemptAutoplay({isActive:true});assert.equal(spoken.length,1);speech.setLine(introScenes[1]);assert.equal(spoken.length,2);assert.equal(spoken[1].text,introScenes[1].text);});
  test('Blocked browser policy returns an actionable state',()=>{spoken.at(-1).onerror({error:'not-allowed'});assert.equal(speech.state,'blocked');speech.enable();assert.equal(speech.state,'pending');});
  test('No-start watchdog reports blocked playback without advancing dialogue',()=>{let ended=false;speech.setLine({...introScenes[0],onComplete:()=>ended=true});callbacks.at(-1)();assert.equal(speech.state,'blocked');assert.equal(ended,false);});
  test('Watchdog cannot stop a started line or a newer scene',()=>{speech.replay();const obsolete=callbacks.at(-1);speech.setLine(introScenes[1]);spoken.at(-1).onstart();obsolete();callbacks.at(-1)();assert.equal(speech.state,'speaking');});
  test('Pause before speech starts cancels queued audio; resume retries current line',()=>{speech.setLine(introScenes[2]);const old=spoken.at(-1);speech.pause();old.onstart();assert.equal(speech.state,'paused');speech.resume();assert.equal(speech.state,'pending');assert.equal(spoken.at(-1).text,introScenes[2].text);});
  test('Mute remains effective across automatic scene narration',()=>{speech.toggleMute();const count=spoken.length;speech.setLine(introScenes[2]);speech.attemptAutoplay({hasBeenActive:true});assert.equal(spoken.length,count);assert.equal(speech.muted,true);speech.stop();assert.ok(cancellations>0);});
  return results;
}
