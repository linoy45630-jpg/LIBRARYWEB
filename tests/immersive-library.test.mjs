import assert from 'node:assert/strict';
import { normalizeDialogue, pronunciationCandidate } from '../js/dialogue-data.js';
import { createVoicePreferences, hebrewVoices } from '../js/voice-preferences.js';
import { createSpeechController } from '../js/speech-controller.js';
import { introScenes } from '../js/cinematic-intro.js';
import { libraryBackgrounds, createLibraryEnvironment } from '../js/library-environment.js';
import { voicePreviewEnabled, initVoicePreview } from '../js/voice-preview.js';
import { createTestDocument } from './dom-fixture.mjs';

export function runImmersiveTests() {
  const results=[], test=(name,action)=>{action();results.push({test:name,passed:true});};
  const clean=text=>text.replace(/[\u0591-\u05c7]/g,'');
  test('Four dialogue lines share exactly three visual scenes',()=>{assert.deepEqual(introScenes.map(line=>line.scene),[1,2,2,3]);assert.deepEqual(introScenes.map(line=>line.background),['entrance','panorama','panorama','main']);});
  test('Display copy stays unvowelled and speech candidates preserve every base letter',()=>{for(const line of introScenes){assert.equal(clean(line.displayText),line.displayText);assert.equal(clean(line.speechText),line.displayText);assert.equal(line.text,line.displayText);assert.equal(line.character,line.speaker);}});
  test('Legacy learning dialogue normalizes to new canonical fields without rewriting',()=>{const line=normalizeDialogue({character:'tuli',text:'תולי מחפש ספרים.',audio:'future.mp3'});assert.equal(line.displayText,'תולי מחפש ספרים.');assert.equal(line.speaker,'tuli');assert.equal(line.audioSrc,'future.mp3');assert.equal(clean(line.speechText),line.displayText);});
  test('Explicit speech text and audio source are preserved',()=>{const line=normalizeDialogue({speaker:'owl',displayText:'ספרים',speechText:'סְפָרִים',audioSrc:'owl.mp3',voicePreference:{voiceURI:'verified'}});assert.equal(line.speechText,'סְפָרִים');assert.equal(line.audio,'owl.mp3');assert.equal(line.voicePreference.voiceURI,'verified');});
  test('Pronunciation candidates affect only known ambiguous words',()=>{assert.equal(clean(pronunciationCandidate('תולי מצא שלושה ספרים בספרייה.')),'תולי מצא שלושה ספרים בספרייה.');});
  const available=[{name:'Other Hebrew',lang:'he',voiceURI:'other',default:true},{name:'Verified voice',lang:'he-IL',voiceURI:'verified'},{name:'English female',lang:'en-US',voiceURI:'en'}];
  const synthesis={getVoices:()=>available,cancel(){},speak(utterance){spoken.push(utterance);}};
  let stored=null, spoken=[]; const storage={getItem:()=>stored,setItem:(key,value)=>stored=value};
  const preferences=createVoicePreferences({synthesis,storage});
  test('Prefer he-IL and exclude unrelated voices',()=>{assert.equal(hebrewVoices(synthesis)[0].voiceURI,'verified');assert.equal(hebrewVoices(synthesis).length,2);});
  test('No voice is labelled female without manual listening confirmation',()=>{assert.equal(preferences.resolve('owl').verifiedFemale,false);preferences.set('owl',{voiceURI:'verified'});assert.equal(preferences.resolve('owl').verifiedFemale,false);});
  test('Manually verified female preference survives local storage',()=>{preferences.set('owl',{voiceURI:'verified',verifiedFemale:true,pronunciationVerified:true});const restored=createVoicePreferences({synthesis,storage});assert.equal(restored.resolve('owl').verifiedFemale,true);assert.equal(restored.resolve('owl').pronunciationVerified,true);});
  test('Unavailable saved voice uses honest unverified fallback',()=>{preferences.set('owl',{voiceURI:'missing',verifiedFemale:true,pronunciationVerified:true});assert.equal(preferences.resolve('owl').verifiedFemale,false);assert.equal(preferences.resolve('owl').pronunciationVerified,false);assert.equal(preferences.resolve('owl').voice.lang,'he-IL');});
  test('Denied browser storage does not prevent voice selection',()=>{const denied=createVoicePreferences({synthesis,storage:{getItem(){throw Error();},setItem(){throw Error();}}});denied.set('owl',{voiceURI:'verified',verifiedFemale:true});assert.equal(denied.resolve('owl').verifiedFemale,true);});
  test('Corrupted storage payload is ignored safely',()=>{const corrupted=createVoicePreferences({synthesis,storage:{getItem:()=>JSON.stringify('invalid'),setItem(){}}});corrupted.set('owl',{voiceURI:'verified'});assert.equal(corrupted.resolve('owl').voice.voiceURI,'verified');});
  class Utterance{constructor(text){this.text=text;}}
  const speech=createSpeechController({synthesis,Utterance,storage:{getItem:()=>null,setItem(){}},schedule:()=>0,clearSchedule(){}});
  const line=normalizeDialogue({speaker:'owl',displayText:'ספרים בספרייה'});
  test('Untested niqqud is not used in normal narration',()=>{speech.setLine(line);speech.enable();assert.equal(spoken.at(-1).text,line.displayText);assert.equal(spoken.at(-1).pitch,undefined);});
  test('Verified pronunciation uses separate speechText and keeps display unchanged',()=>{speech.setVoicePreference('owl',{voiceURI:'verified',verifiedFemale:true,pronunciationVerified:true});speech.setLine(line);assert.equal(spoken.at(-1).text,line.speechText);assert.equal(speech.current.displayText,'ספרים בספרייה');assert.equal(speech.voiceStatus().verifiedFemale,true);});
  test('Development comparison never advances the learning dialogue',()=>{let completed=false;speech.setLine({...line,onComplete:()=>completed=true});speech.previewCurrent({pronunciation:false});spoken.at(-1).onend();assert.equal(completed,false);assert.equal(spoken.at(-1).text,line.displayText);assert.equal(speech.current.onComplete instanceof Function,true);speech.stop();});
  test('Voice preview is restricted to explicit local development URL',()=>{assert.equal(voicePreviewEnabled({hostname:'localhost',search:'?voice-preview=1'}),true);assert.equal(voicePreviewEnabled({hostname:'example.com',search:'?voice-preview=1'}),false);assert.equal(voicePreviewEnabled({hostname:'localhost',search:''}),false);});
  test('Development UI enumerates voices with manual female and pronunciation checks',()=>{const document=createTestDocument();document.body=document;const panel=initVoicePreview(speech,{documentRef:document,synthesis});assert.equal(panel.querySelectorAll('select').length,2);assert.equal(panel.querySelectorAll('input').filter(input=>input.type==='checkbox').length,3);assert.equal(panel.querySelectorAll('button').length,2);assert.equal(panel.querySelectorAll('option').length,6);});
  test('Background configuration uses the supplied entrance, panorama and untouched staircase asset',()=>{assert.ok(libraryBackgrounds.entrance.path.includes('כניסה'));assert.ok(libraryBackgrounds.panorama.path.includes('באור'));assert.ok(libraryBackgrounds.main.path.includes('מדרגות לולייניות'));});
  test('Background switches preserve the current image until the next loads',()=>{
    const document=createTestDocument();document.getElementById=id=>document.querySelector('#'+id);const root=document.createElement('div');root.id='library-environment';document.append(root);
    for(let i=0;i<2;i++){const layer=document.createElement('div');layer.className='environment-layer';const image=document.createElement('img');image.style={};layer.append(image);root.append(layer);}
    const frames=[];const world=createLibraryEnvironment({documentRef:document,schedule:action=>{frames.push(action);return frames.length;},cancel(){}});
    world.show('entrance');root.children[0].children[0].onload();frames.at(-1)();assert.ok(root.children[0].className.includes('is-visible'));
    world.show('panorama');assert.ok(root.children[0].className.includes('is-visible'));root.children[1].children[0].onload();frames.at(-1)();assert.equal(world.current,'panorama');assert.ok(root.children[1].className.includes('is-visible'));
    world.show('main');root.children[0].children[0].onload();frames.at(-1)();assert.ok(root.children[0].children[0].src.endsWith(libraryBackgrounds.main.path));
  });
  test('Delayed background loads cannot restore an old scene',()=>{
    const document=createTestDocument();document.getElementById=id=>document.querySelector('#'+id);const root=document.createElement('div');root.id='library-environment';document.append(root);for(let i=0;i<2;i++){const layer=document.createElement('div');layer.className='environment-layer';const img=document.createElement('img');img.style={};layer.append(img);root.append(layer);}
    const frames=[];const world=createLibraryEnvironment({documentRef:document,schedule:action=>{frames.push(action);return frames.length;},cancel(){}});world.show('entrance');const old=root.children[0].children[0].onload;world.show('main');old();assert.equal(frames.length,0);assert.equal(world.current,'main');
  });
  test('Prerecorded audioSrc can play without an installed Hebrew voice',()=>{
    let media;class Audio{constructor(src){this.src=src;media=this;}play(){return Promise.resolve();}pause(){}}
    const player=createSpeechController({synthesis:{getVoices:()=>[],cancel(){}},Utterance,AudioClass:Audio});player.setLine({speaker:'owl',displayText:'שלום',audioSrc:'future-hebrew.mp3'});player.enable();assert.equal(media.src,'future-hebrew.mp3');media.onplaying();assert.equal(player.state,'speaking');player.stop();assert.equal(player.state,'idle');
  });
  test('Late Hebrew voices narrate the current enabled line, not an old scene',()=>{
    let voices=[],changed,played=[];const player=createSpeechController({synthesis:{getVoices:()=>voices,cancel(){},speak:u=>played.push(u),addEventListener:(name,fn)=>changed=fn},Utterance,schedule:()=>0,clearSchedule(){}});
    player.setLine({speaker:'owl',displayText:'פתיחה'});player.enable();assert.equal(player.state,'unavailable');player.setLine({speaker:'tuli',displayText:'ספרים'});voices=[{name:'Hebrew',lang:'he-IL',voiceURI:'hebrew'}];changed();assert.equal(played.at(-1).text,'ספרים');player.stop();
  });
  return results;
}
