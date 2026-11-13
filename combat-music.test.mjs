import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatMusic,COMBAT_TEMPOS,combatScoreStep,combatArrangement} from './combat-music.js';
function harness(){const context={currentTime:0,state:'running'},events=[],nodes=[],node=(kind,args)=>{const n={ends:args[1]+args[2],stops:0,onended:null,stop(){this.stops++;this.onended?.();}};events.push({kind,args});nodes.push(n);return n;},music=new CombatMusic({note:(...a)=>node('note',a),noise:(...a)=>node('noise',[0,...a])});music.attach(context,{});const state={status:'playing',boss:{id:'ignis',hp:100,maxHp:100}};const advance=(seconds,opts={})=>{for(let t=0;t<seconds;t+=.02){context.currentTime+=.02;for(const n of nodes)if(!n.ended&&n.ends<=context.currentTime){n.ended=true;n.onended?.();}music.sync(state,{enabled:true,...opts});}};return{music,context,state,events,nodes,advance};}

test('original eight-bar score has melody, bass, harmony and drums with finite bounded parameters',()=>{
 for(const mode of Object.keys(COMBAT_TEMPOS)){const notes=Array.from({length:128},(_,n)=>combatScoreStep(mode,n)).flat();assert(notes.length>300);assert(notes.some(n=>n.kind==='noise'));assert(notes.some(n=>n.kind==='note'&&n.frequency<150));assert(notes.some(n=>n.kind==='note'&&n.frequency>700));assert(new Set(notes.filter(n=>n.kind==='note').map(n=>n.frequency)).size>20);for(const n of notes){for(const v of Object.values(n))if(typeof v==='number')assert(Number.isFinite(v));assert(n.volume>0&&n.volume<=.18);assert(n.duration>0&&n.duration<2);assert(Math.abs(n.pan)<=.45);}}
 assert.equal(combatArrangement({boss:{id:'sukuna',hp:42,maxHp:100}}),'climax');assert.equal(combatArrangement({boss:{id:'sukuna',hp:43,maxHp:100}}),'finale');
});

test('music never starts before opt-in and owns only bounded voices with complete pause/end cleanup',()=>{
 const {music,context,state,events,nodes,advance}=harness();music.sync(state);assert.equal(events.length,0);advance(4);assert(events.length>0);assert(music.voices.size<=40);const beat=music.step;music.sync(state,{enabled:true,paused:true});assert.equal(music.voices.size,0);assert.equal(music.playing,false);advance(.1);assert(music.step>=beat,'resume keeps phrase position');state.status='gameover';music.sync(state,{enabled:true});assert.equal(music.voices.size,0);assert.equal(music.playing,false);const count=events.length;context.currentTime+=4;music.sync(state,{enabled:true});assert.equal(events.length,count);music.destroy();assert.equal(music.voices.size,0);assert(nodes.every(n=>n.stops>0||n.ended));
});

test('finale and climax arrangements enter at a bar boundary without resetting the phrase',()=>{
 const {music,state,advance}=harness();advance(.3);assert.equal(music.mode,'audition');state.boss={id:'sukuna',hp:100,maxHp:100};advance(.2);assert.equal(music.mode,'audition');advance(2);assert.equal(music.mode,'finale');const before=music.step;state.boss.hp=30;advance(2);assert.equal(music.mode,'climax');assert(music.step>before);assert.equal(music.status().bpm,172);music.destroy();
});

test('takeover keeps the musical position but schedules no competing combat layer',()=>{
 const {music,events,advance}=harness();advance(2);const start=music.step,count=events.length;advance(2,{domain:true});assert(music.step>start);assert.equal(events.length,count);advance(.3);assert(events.length>count);music.destroy();
});

test('muting and a new practice epoch cannot replay queued music or create a catch-up burst',()=>{
 const {music,context,state,events,advance}=harness();advance(.4);music.sync(state,{enabled:false});assert.equal(music.voices.size,0);const count=events.length;context.currentTime+=120;music.sync(state,{enabled:false});assert.equal(events.length,count);music.sync(state,{enabled:true});assert(events.slice(count).length<=18,'one current tick resumes, not 120 seconds of missed notes');state.practice={epoch:2};music.sync(state,{enabled:true});assert(music.step<=1);music.destroy();
});
