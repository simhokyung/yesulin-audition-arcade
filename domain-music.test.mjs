import test from 'node:test';
import assert from 'node:assert/strict';
import {DomainMusic, DOMAIN_MUSIC_TRACKS} from './domain-music.js';
import {GameAudio} from './audio.js';
import {createGame, step, getDomainGuide, patternTurnFor} from './engine.js';
import {createPractice, stepPractice} from './practice.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
function afterEntrance(s){for(let n=0;s.cinematic&&n<240;n++)step(s,{},1/60);assert.equal(s.cinematic,null);return s;}
function context() {
  const sources = [], filters = [];
  return {state: 'running', sources, filters, decodeAudioData: async () => ({duration: 12}),
    createGain: () => ({gain: {value: 0}, connect(bus) {return bus;}, disconnect() {}}),
    createBiquadFilter() { const filter={frequency:{value:0},Q:{value:0},connect(bus){return bus;},disconnect(){}};filters.push(filter);return filter; },
    createBufferSource() {
      const source = {starts: [], stopped: 0, playbackRate:{value:1}, connect(gain) {return gain;}, disconnect() {},
        start(...args) {this.starts.push(args);}, stop() {this.stopped++; this.onended?.();}};
      sources.push(source); return source;
    }};
}
function state(bossId = 'gojo') {
  return {status: 'playing', stage: ['ignis','mime','gojo','max','sukuna'].indexOf(bossId), runTime: 10, boss: {id: bossId},
    cinematic: {id: 9, kind: 'domain', actorId: bossId, remaining: .8},
    hazards: [{id: 8, kind: 'domain', active: false, warning: 1.85, life: 2.6}]};
}
function setup(t, tracks = {gojo: 'assets/supplied-gojo.ogg', sukuna: 'assets/supplied-sukuna.ogg'}) {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (src, options) => {
    requests.push({src, signal: options.signal});
    return {ok: true, arrayBuffer: async () => new ArrayBuffer(8)};
  });
  const c = context(), music = new DomainMusic(tracks); music.attach(c, {});
  t.after(() => music.destroy());
  return {music, c, requests};
}

test('empty mapping never fetches or creates a recording source', async t => {
  const {music, c, requests} = setup(t, {});
  music.sync(state(), {enabled: true}); await settle();
  assert.equal(requests.length, 0); assert.equal(c.sources.length, 0); assert.equal(music.playing, false);
  assert.equal(music.configure({gojo: 'javascript:alert(1)'}).gojo, null);
});

test('default cues are local original WAV files and expose actual decode and playback state', async t => {
  const {music} = setup(t, DOMAIN_MUSIC_TRACKS), s = state();
  assert.match(DOMAIN_MUSIC_TRACKS.gojo.src, /assets\/domain-prism-original\.wav\?v=8$/);
  assert.match(DOMAIN_MUSIC_TRACKS.sukuna.src, /assets\/domain-caden-original\.wav\?v=8$/);
  assert.equal(DOMAIN_MUSIC_TRACKS.gojo.loop, true); assert.equal(DOMAIN_MUSIC_TRACKS.sukuna.loop, true);
  music.sync(s, {enabled: true}); await settle();
  assert.equal(music.status().playing, true); assert.equal(music.status().decoded, true);
  assert.deepEqual(music.status().ready, {ignis:true,mime:true,gojo:true,max:true,sukuna:true});
  music.reset(); assert.equal(music.status().playing, false); assert.equal(music.status().bossId, null);
});

test('recordings require sound ON and play once across cutscene, warning and active domain', async t => {
  const {music, c, requests} = setup(t), s = state();
  music.sync(s); await settle(); assert.equal(requests.length, 0);
  music.sync(s, {enabled: true}); await settle();
  assert.equal(requests.length, 2); assert.equal(c.sources.length, 1);
  const source = c.sources[0]; assert.equal(source.loop, true);
  s.cinematic = null; s.runTime += .8; music.sync(s, {enabled: true}); await settle();
  s.hazards[0].active = true; s.runTime += 1.85; music.sync(s, {enabled: true}); await settle();
  assert.equal(c.sources.length, 1); assert.equal(source.stopped, 0);
  s.hazards = []; music.sync(s, {enabled: true});
  assert.equal(music.playing, false); assert.equal(source.stopped, 1);
});

test('pause and mute immediately release sources; resuming uses the current domain position', async t => {
  const {music, c} = setup(t, {gojo: {src: 'gojo.ogg', start: 2}}), s = state();
  music.sync(s, {enabled: true}); await settle(); assert.equal(c.sources[0].starts[0][1], 2);
  s.runTime += 1.25; music.sync(s, {enabled: true, paused: true});
  assert.equal(c.sources[0].stopped, 1); assert.equal(music.playing, false);
  music.sync(s, {enabled: true}); await settle(); assert.equal(c.sources[1].starts[0][1], 3.25);
  music.sync(s, {enabled: false}); assert.equal(c.sources[1].stopped, 1);
  s.runTime += 1; music.sync(s, {enabled: true}); await settle(); assert.equal(c.sources[2].starts[0][1], 4.25);
});

test('death, cancellation, replay and boss transitions do not leave an old source playing', async t => {
  const {music, c, requests} = setup(t), first = state();
  music.sync(first, {enabled: true}); await settle();
  first.status = 'gameover'; music.sync(first, {enabled: true}); assert.equal(c.sources[0].stopped, 1);
  const retry = state(); music.sync(retry, {enabled: true}); await settle();
  assert.equal(c.sources[1].starts[0][1], 0);
  retry.cinematic = null; retry.hazards = []; music.sync(retry, {enabled: true}); assert.equal(c.sources[1].stopped, 1);
  music.sync(state('sukuna'), {enabled: true}); await settle(); assert.equal(c.sources.length, 3);
  assert.equal(requests.length, 2, 'decoded recordings are reused');
  music.reset(); assert.equal(c.sources[2].stopped, 1); assert.equal(music.segment, null);
});

test('a slow decode cannot start after the domain has ended', async t => {
  const {music, c} = setup(t, {gojo: 'gojo.ogg'}), s = state(); let finish;
  c.decodeAudioData = () => new Promise(resolve => {finish = resolve;});
  music.sync(s, {enabled: true}); await settle();
  s.cinematic = null; s.hazards = []; music.sync(s, {enabled: true});
  finish({duration: 12}); await settle();
  assert.equal(c.sources.length, 0); assert.equal(music.playing, false);
});

test('changing configuration aborts old loads and cannot start stale recordings', async t => {
  const {music, c, requests} = setup(t, {gojo: 'old.ogg'}), s = state(); let finish;
  c.decodeAudioData = () => new Promise(resolve => {finish = resolve;});
  music.sync(s, {enabled: true}); await settle();
  music.configure({}); assert.equal(requests[0].signal.aborted, true);
  finish({duration: 12}); await settle(); assert.equal(c.sources.length, 0);
});

test('failed recordings fall back without repeated network attempts or uncaught rejection', async t => {
  const {music, requests} = setup(t, {gojo: 'missing.ogg'}), s = state();
  t.mock.method(globalThis, 'fetch', async src => {requests.push({src}); throw new Error('unavailable');});
  for (let i = 0; i < 4; i++) {music.sync(s, {enabled: true}); await settle();}
  assert.equal(requests.length, 1); assert.equal(music.errors.get('missing.ogg'), 'unavailable');
  assert.equal(music.playing, false);
});

test('non-looping clips do not restart after their natural end and destroy clears resources', async t => {
  const {music, c} = setup(t, {gojo: {src: 'gojo.ogg', loop: false}}), s = state();
  music.sync(s, {enabled: true}); await settle(); assert.equal(c.sources[0].loop, false);
  s.runTime += 13; c.sources[0].onended(); music.sync(s, {enabled: true}); await settle();
  assert.equal(c.sources.length, 1); music.destroy();
  assert.equal(music.context, null); assert.equal(music.buffers.size, 0); assert.equal(music.pending.size, 0);
});

for (const bossId of ['ignis','mime']) {
  test(`${bossId} music variation keeps its exact position through pause, mute and end`, async t => {
    const {music,c,requests}=setup(t,DOMAIN_MUSIC_TRACKS), s=state(bossId), config=DOMAIN_MUSIC_TRACKS[bossId];
    music.sync(s,{enabled:true});await settle();
    assert.equal(requests.length,3,'five bosses use three decoded original recordings');
    assert.equal(c.sources[0].playbackRate.value,config.playbackRate);
    assert.equal(c.filters[0].type,config.filterType);assert.equal(c.filters[0].frequency.value,config.filterHz);
    assert.equal(music.status().bossId,bossId);assert.equal(c.sources[0].loop,true);
    s.runTime+=2;music.sync(s,{enabled:true,paused:true});assert.equal(c.sources[0].stopped,1);
    music.sync(s,{enabled:true});await settle();assert.equal(c.sources[1].starts[0][1],2*config.playbackRate);
    music.sync(s,{enabled:false});assert.equal(c.sources[1].stopped,1);
    s.runTime+=1;music.sync(s,{enabled:true});await settle();assert.equal(c.sources[2].starts[0][1],3*config.playbackRate);
    s.cinematic=null;s.hazards=[];music.sync(s,{enabled:true});assert.equal(music.status().playing,false);
    assert.equal(c.sources[2].stopped,1);assert.equal(music.status().bossId,null);
  });
  test(`${bossId} late decode cannot leak into a retry or a completed takeover`, async t => {
    const {music,c}=setup(t,{[bossId]:DOMAIN_MUSIC_TRACKS[bossId]}),s=state(bossId);let finish;
    c.decodeAudioData=()=>new Promise(resolve=>{finish=resolve;});
    music.sync(s,{enabled:true});await settle();music.reset();
    finish({duration:6.2});await settle();assert.equal(c.sources.length,0);
    const retry=state(bossId);music.sync(retry,{enabled:true});await settle();assert.equal(c.sources.length,1);
    retry.status='gameover';music.sync(retry,{enabled:true});assert.equal(c.sources[0].stopped,1);
  });
}

function audioHarness(t, {holdSources=false}={}) {
  const starts=[],sourceNodes=[],shapers=[],panners=[];
  const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(...xs){xs.forEach(x=>assert(Number.isFinite(x)));},
    setValueAtTime(...xs){xs.forEach(x=>assert(Number.isFinite(x)));},exponentialRampToValueAtTime(...xs){xs.forEach(x=>assert(Number.isFinite(x)));}});
  const node=()=>({connect(n){return n;},disconnect(){},gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),
    start(time){starts.push(time);assert(Number.isFinite(time));},stop(time){if(!holdSources||time===undefined)this.onended?.();}});
  const previousContext=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
  t.after(()=>{if(previousContext)Object.defineProperty(globalThis,'AudioContext',previousContext);else delete globalThis.AudioContext;});
  globalThis.AudioContext=class {
    constructor(){this.state='running';this.currentTime=1;this.sampleRate=8000;this.destination=node();}
    createGain(){return node();}createDynamicsCompressor(){return node();}createOscillator(){const n=node();sourceNodes.push(n);return n;}
    createBiquadFilter(){return node();}createBufferSource(){const n=node();sourceNodes.push(n);return n;}
    createStereoPanner(){const n={...node(),pan:param()};panners.push(n);return n;}
    createWaveShaper(){const n=node();shapers.push(n);return n;}
    createBuffer(_,n){const values=new Float32Array(n);return {getChannelData:()=>values};}async close(){this.state='closed';}
  };
  const audio=new GameAudio();audio.setDomainTracks({});t.after(()=>audio.destroy());
  return {audio,starts,sourceNodes,shapers,panners};
}

test('new boss attack sounds use hazard kinds, with a distinct harmless feint cue', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  const s={...state('ignis'),cinematic:null,hazards:[],effects:[],player:{character:'director'},stats:{}};
  audio.update(s,1/60);const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push(name);cue(name,meta);};
  const mapping={footlight:'ignite','light-sweep':'light-sweep','spark-spot':'spark','ribbon-thrust':'ribbon','mask-feint':'feint','mask-slam':'mask','ribbon-cross':'ribbon'};
  let id=0;for(const [kind,name] of Object.entries(mapping)){
    heard.length=0;audio.context.currentTime+=1;s.hazards=[{id:++id,kind,active:true,decoy:kind==='mask-feint'}];
    audio.update(s,1/60);assert(heard.includes(name));assert(!heard.includes('impact'),'hazards alone do not invent player hits');
  }
});

test('R preparation and its twelve real strikes are separate, ordered and never replayed', async t => {
  const {audio,starts}=audioHarness(t);await audio.setEnabled(true);
  for(const character of ['actor','director']){
    audio.reset();const s=afterEntrance(createGame({mode:'challenge',character}));s.boss.patternCooldown=999;s.boss.hp=s.boss.maxHp=100000;s.player.hype=100;
    const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};
    audio.update(s,1/60);step(s,{ultimate:true},1/60);audio.update(s,1/60);
    assert.equal(s.cinematic?.kind,'playerUltimate');assert.equal(s.stats.ultimates,1);assert.equal(s.boss.hp,100000);
    assert(heard.some(e=>e.name==='cinematic'&&e.meta.kind==='playerUltimate'));
    assert(!heard.some(e=>e.name==='impact'||e.name.startsWith('ultimate-')),'preparation never sounds like damage');
    for(let i=0;i<360&&s.player.attackSequence?.kind!=='ultimate';i++){step(s,{},1/60);audio.context.currentTime+=1/60;audio.update(s,1/60);}
    for(let i=0;i<240&&s.player.attackSequence;i++){step(s,{},1/60);audio.context.currentTime+=1/60;audio.update(s,1/60);}
    const strikes=heard.filter(e=>e.name==='ultimate-hit'||e.name==='ultimate-finisher');
    assert.equal(strikes.length,12);assert.deepEqual(strikes.map(e=>e.meta.hitIndex),Array.from({length:12},(_,i)=>i+1));
    assert.equal(strikes.filter(e=>e.name==='ultimate-finisher').length,1);assert.equal(strikes.at(-1).name,'ultimate-finisher');
    assert(strikes.every(e=>e.meta.damage>0));assert(!heard.some(e=>e.name==='sword'||e.name==='slate'));
    const count=strikes.length;audio.update(s,1/60);assert.equal(heard.filter(e=>e.name.startsWith('ultimate-')).length,count);
    assert(starts.length>0);audio.cue=cue;
  }
});

test('all Q subhits in a render are audible once, with no decorative or zero-damage hits', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  const s={...state('ignis'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};
  audio.update(s,1/60);const heard=[];audio.cue=(name,meta)=>heard.push({name,meta});
  s.effects=[1,2,3].flatMap(i=>[
    {id:i*3,type:'impact',attackId:7,hitIndex:i,hitCount:3,kind:i===3?'finisher':'basic',finisher:i===3,damage:20,x:700},
    {id:i*3+1,type:'impact',attackId:7,hitIndex:i,hitCount:3,kind:i===3?'finisher':'basic',finisher:i===3,damage:20,x:720},
    {id:i*3+2,type:'slash',attackId:7,hitIndex:i}]);
  s.effects.push({id:20,type:'impact',damage:0});audio.update(s,1/60);
  assert.equal(heard.length,3);assert.deepEqual(heard.map(e=>e.meta.hitIndex),[1,2,3]);
  assert.equal(heard.filter(e=>e.meta.finisher).length,1);assert.notEqual(heard[0].meta.pan,heard[1].meta.pan);
  audio.update(s,1/60);assert.equal(heard.length,3);
});

test('muted combat is consumed without stale hits when sound is enabled', async t => {
  const {audio,starts}=audioHarness(t);const s={...state('ignis'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};
  audio.update(s,1/60);s.effects=[{id:1,type:'impact',attackId:9,hitIndex:1,kind:'basic',damage:20}];audio.update(s,1/60);
  await audio.setEnabled(true);starts.length=0;const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push(name);cue(name,meta);};
  audio.update(s,1/60);assert.equal(heard.length,0);
});

test('all five boss introductions sound once on their first state and are independent of hits', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);const heard=[],cue=audio.cue.bind(audio);
  audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};
  for(const bossId of ['ignis','mime','gojo','max','sukuna']){
    const s={...state(bossId),hazards:[],effects:[],player:{character:'actor'},stats:{}};
    s.cinematic={id:50,kind:'bossIntro',actorId:bossId,duration:bossId==='gojo'?2.4:2.8,remaining:2};
    audio.update(s,1/60);audio.update(s,1/60);
  }
  assert.equal(heard.length,5);assert(heard.every(e=>e.name==='cinematic'&&e.meta.kind==='bossIntro'));
});

test('Ignis and Mime real duel introductions sound once, and leaving releases every scheduled voice', async t => {
  const {audio}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
  for(const stage of [0,1]){
    const s=createPractice({character:'director',stage}), heard=[], cue=audio.cue.bind(audio);
    audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};
    assert.equal(s.cinematic?.kind,'bossIntro');audio.update(s,1/60);
    for(let i=0;i<30;i++){stepPractice(s,{},1/60);audio.context.currentTime+=1/60;audio.update(s,1/60);}
    assert.equal(heard.filter(x=>x.name==='cinematic').length,1);
    assert(!heard.some(x=>['impact','hit','fatal'].includes(x.name)));
    assert(audio.sources.size>0);audio.pause(true);audio.reset();audio.update(null,1/60);
    assert.equal(audio.sources.size,0);assert.equal(audio.sourceNodes.size,0);assert.equal(audio.getDomainMusicStatus().playing,false);
    audio.cue=cue;audio.pause(false);
  }
});

test('R cinematics suspend an active takeover recording without advancing its position', async t => {
  const {music,c}=setup(t,{gojo:{src:'gojo.ogg',loop:false}}),s=state();
  music.sync(s,{enabled:true});await settle();s.cinematic=null;s.runTime+=2;music.sync(s,{enabled:true});
  s.cinematic={id:20,kind:'playerUltimate',remaining:1.6};music.sync(s,{enabled:true});assert.equal(c.sources[0].stopped,1);
  s.runTime+=1.6;s.cinematic=null;music.sync(s,{enabled:true});await settle();
  assert.equal(c.sources[1].starts[0][1],2,'R cinematic time is excluded from the takeover recording');
  s.runTime+=1;music.sync(s,{enabled:false});s.runTime+=1;music.sync(s,{enabled:true});await settle();
  assert.equal(c.sources[2].starts[0][1],4,'mute still follows the advancing combat');
});

test('dense real-hit audio has a bounded source budget, safe output curve and immediate cleanup', async t => {
  const {audio,shapers,panners}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
  for(let i=1;i<=200;i++)audio.cue(i%12===0?'ultimate-finisher':'ultimate-hit',
    {eventId:i,hitIndex:i%12+1,hitCount:12,character:i%2?'actor':'director',pan:i%2?.7:-.7});
  assert.equal(audio.sources.size,96,'hard cap limits simultaneous and scheduled voices');
  assert.equal(shapers.length,1);assert(shapers[0].curve.every(n=>Number.isFinite(n)&&Math.abs(n)<.92));
  assert(panners.length>0);assert(panners.every(n=>Math.abs(n.pan.value)<=.75));
  audio.pause(true);assert.equal(audio.sources.size,0);assert.equal(audio.sourceNodes.size,0);
  const count=audio.lastCue.size;audio.cue('ultimate-finisher',{eventId:900});assert.equal(audio.lastCue.size,count);
  audio.pause(false);audio.cue('impact',{eventId:901,damage:1});assert(audio.sources.size>0);
  await audio.setEnabled(false);assert.equal(audio.sources.size,0);
  await audio.setEnabled(true);audio.cue('cinematic',{eventId:902,kind:'bossIntro',duration:2.8,bossId:'sukuna'});
  assert(audio.sources.size>0);audio.reset();assert.equal(audio.sources.size,0);assert.equal(audio.lastCue.size,0);
});

test('extended late-boss takeovers keep the original recording looping until their actual end', async t => {
  const {music,c}=setup(t,DOMAIN_MUSIC_TRACKS);c.decodeAudioData=async()=>({duration:6.2});
  for(const bossId of ['gojo','sukuna']){
    const s=state(bossId);music.sync(s,{enabled:true});await settle();const source=c.sources.at(-1);
    assert.equal(source.loop,true);assert.equal(source.loopEnd,6.2);
    s.cinematic=null;s.runTime+=10;music.sync(s,{enabled:true});await settle();
    assert.equal(music.playing,true);assert.equal(c.sources.at(-1),source,'no duplicate source across loops');
    s.hazards=[];music.sync(s,{enabled:true});assert.equal(source.stopped,1);assert.equal(music.playing,false);
  }
});

test('replacing a practice state releases queued sounds without requiring a launch UI reset', async t => {
  const {audio}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
  const first={...state('ignis'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};
  audio.update(first,1/60);audio.cue('cinematic',{eventId:100,kind:'playerUltimate',actorId:'actor',duration:1.6});
  const oldSources=[...audio.sources];assert(oldSources.length>0);
  const replay={...state('mime'),cinematic:null,hazards:[],effects:[],player:{character:'director'},stats:{}};
  audio.update(replay,1/60);
  assert(oldSources.every(source=>!audio.sources.has(source)));
  assert.equal(audio.lastState,replay);assert.equal(audio.lastEffectId,0);
});

test('enhanced kit sounds follow positive damage metadata, including separate delayed cue detonations', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  const s={...state('ignis'),cinematic:null,hazards:[],effects:[],player:{character:'director'},stats:{}};
  audio.update(s,1/60);const heard=[];audio.cue=(name,meta)=>heard.push({name,meta});
  s.effects=[
    {id:1,type:'impact',attackId:80,kind:'skill',signature:'adlib-arrow',character:'actor',damage:100},
    {id:2,type:'impact',attackId:81,kind:'basic',signature:'method-strike',character:'actor',damage:50},
    {id:3,type:'impact',attackId:82,kind:'skill',source:'cue-detonation',cueIndex:0,damage:80},
    {id:4,type:'impact',attackId:82,kind:'skill',source:'cue-detonation',cueIndex:1,damage:80},
    {id:5,type:'impact',attackId:82,kind:'skill',source:'cue-detonation',cueIndex:1,damage:80},
    {id:6,type:'impact',attackId:83,kind:'skill',signature:'staff',staffType:'light',damage:45},
    {id:7,type:'impact',attackId:83,kind:'skill',signature:'staff',staffType:'sound',damage:45},
    {id:8,type:'impact',attackId:84,kind:'skill',signature:'adlib-arrow',damage:0},
    {id:9,type:'slash',signature:'cue-detonation'},
  ];audio.update(s,1/60);
  assert.deepEqual(heard.map(e=>e.name),['actor-pierce','actor-breakthrough','director-burst','director-burst','director-light','director-sound']);
  audio.update(s,1/60);assert.equal(heard.length,6);
});

test('readiness and dialogue identity motifs do not become phantom hits or duplicate signatures', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  const s={...state('ignis'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};
  audio.update(s,1/60);const heard=[];audio.cue=(name,meta)=>heard.push({name,meta});
  s.effects=[{id:1,type:'signature',kind:'adlib-ready',character:'actor'},
    {id:2,type:'dialogue',speaker:'player',character:'actor',text:'배역은 바뀌어도, 주인공은 나야!'}];
  audio.update(s,1/60);assert.deepEqual(heard.map(e=>e.name),['actor-ready']);
  s.effects=[{id:3,type:'signature',kind:'cue-mark',character:'director',count:3}];audio.update(s,1/60);
  assert.equal(heard.at(-1).name,'director-cue');assert.equal(heard.at(-1).meta.count,3);
  s.effects=[{id:4,type:'dialogue',speaker:'player',character:'director',category:'win',text:'이 무대는 완성됐어.'}];audio.update(s,1/60);
  assert.equal(heard.at(-1).name,'signature');audio.update(s,1/60);assert.equal(heard.length,3);
  assert(!heard.some(e=>e.name==='impact'));
});

test('duel restart epochs clear queued sounds and allow new low event IDs without replay', async t => {
  const {audio}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
  const s={...state('ignis'),practice:{kind:'duel',epoch:1},cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};
  audio.update(s,1/60);audio.cue('actor-skill');const oldSources=[...audio.sources];assert(oldSources.length>0);
  s.effects=[{id:50,type:'impact',kind:'basic',damage:20}];audio.update(s,1/60);
  s.practice={kind:'duel',epoch:2};s.effects=[];s.runTime=0;audio.update(s,1/60);
  assert(oldSources.every(source=>!audio.sources.has(source)));assert.equal(audio.practiceEpoch,2);assert.equal(audio.lastEffectId,0);
  s.effects=[{id:1,type:'impact',attackId:1,kind:'skill',signature:'adlib-arrow',character:'actor',damage:20}];
  const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push(name);cue(name,meta);};
  audio.update(s,1/60);assert(heard.includes('actor-pierce'));
});

test('changing the selected duel boss blocks late decoding from the abandoned fight', async t => {
  const {music,c}=setup(t,{ignis:'ignis.ogg'}),first=state('ignis');first.practice={kind:'duel',epoch:1};let finish;
  c.decodeAudioData=()=>new Promise(resolve=>{finish=resolve;});music.sync(first,{enabled:true});await settle();
  const next=state('mime');next.practice={kind:'duel',epoch:1};next.cinematic=null;next.hazards=[];
  music.sync(next,{enabled:true});finish({duration:6.2});await settle();assert.equal(c.sources.length,0);
  const retry=state('ignis');retry.practice={kind:'duel',epoch:1};music.sync(retry,{enabled:true});await settle();
  assert.equal(c.sources.length,1);assert.equal(c.sources[0].starts[0][1],0);
  music.sync(retry,{enabled:true,paused:true});assert.equal(c.sources[0].stopped,1);
  music.sync(retry,{enabled:true});await settle();assert.equal(c.sources[1].starts[0][1],0);
  music.destroy();assert.equal(c.sources[1].stopped,1);
});

test('new original signatures and skill accents have finite bounded Web Audio envelopes', async t => {
  const {audio,starts,shapers}=audioHarness(t);await audio.setEnabled(true);
  const cues=['actor-pierce','actor-breakthrough','director-cue','director-burst','director-light','director-sound','signature','actor-ready','crew-ready'];
  for(const [i,name] of cues.entries()){const n=starts.length;audio.cue(name,{eventId:100+i,character:i%2?'actor':'director',count:3});assert(starts.length>n,name);}
  assert(shapers[0].curve.every(x=>Math.abs(x)<.92));
});

test('live enhanced W and staff followups emit their distinct sounds on actual damaging frames', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  for(const character of ['director','actor']){
    audio.reset();const s=afterEntrance(createGame({mode:'challenge',character}));s.boss.patternCooldown=999;s.boss.stun=99;s.boss.hp=s.boss.maxHp=100000;
    s.boss.x=s.player.x+100;s.boss.y=s.player.y;s.player.adlibReady=character==='actor';s.boss.cueMarks=3;
    audio.update(s,1/60);const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};
    if(character==='director'){step(s,{buff:true},1/60);audio.update(s,1/60);}
    step(s,{skill:true},1/60);audio.update(s,1/60);
    for(let i=0;i<150;i++){step(s,{},1/60);audio.context.currentTime+=1/60;audio.update(s,1/60);}
    if(character==='director'){
      assert.equal(heard.filter(e=>e.name==='director-burst').length,3);
      assert.equal(heard.filter(e=>e.name==='director-light').length,1);
      assert.equal(heard.filter(e=>e.name==='director-sound').length,1);
    }else assert.equal(heard.filter(e=>e.name==='actor-pierce').length,1);
    assert(heard.filter(e=>['director-burst','director-light','director-sound','actor-pierce'].includes(e.name)).every(e=>e.meta.damage>0));
    audio.cue=cue;
  }
});

test('live method-enhanced Q accents all three real strikes and reserves its heavy finish for the last', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);const s=afterEntrance(createGame({mode:'challenge',character:'actor'}));
  s.boss.patternCooldown=999;s.boss.stun=99;s.boss.hp=s.boss.maxHp=100000;s.boss.x=s.player.x+60;s.boss.y=s.player.y;
  s.player.nextFinisherReady=true;audio.update(s,1/60);const heard=[],cue=audio.cue.bind(audio);
  audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};
  step(s,{attack:true,attackPressed:true},1/60);audio.update(s,1/60);
  for(let i=0;i<60;i++){step(s,{},1/60);audio.context.currentTime+=1/60;audio.update(s,1/60);}
  const hits=heard.filter(e=>e.name==='actor-breakthrough');assert.equal(hits.length,3);
  assert.deepEqual(hits.map(e=>e.meta.finisher),[false,false,true]);assert(hits.every(e=>e.meta.damage>0));
});

test('actual single-boss duel plays combat audio and a new duel clears the old fight sounds', async t => {
  const {audio}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
  const s=afterEntrance(createPractice({character:'actor',stage:0,kind:'duel'}));
  s.boss.patternCooldown=999;s.boss.stun=99;s.boss.x=s.player.x+60;s.boss.y=s.player.y;
  audio.update(s,1/60);const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push(name);cue(name,meta);};
  const hp=s.boss.hp;stepPractice(s,{attack:true,attackPressed:true},1/60);audio.update(s,1/60);
  assert(s.boss.hp<hp);assert(heard.includes('impact'));const oldSources=[...audio.sources];assert(oldSources.length>0);
  const restarted=createPractice({character:'director',stage:2,kind:'duel'});audio.update(restarted,1/60);
  assert.equal(restarted.mode,'practice');assert.equal(restarted.practice.kind,'duel');
  assert.equal(restarted.stats.damageTaken,0);assert(oldSources.every(source=>!audio.sources.has(source)));
  assert.equal(audio.lastState,restarted);assert.equal(audio.getDomainMusicStatus().playing,false);
});

test('blade wave warning, launch and nearby pass sound once with directional pan and no phantom hit', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  const s={...state('sukuna'),cinematic:null,hazards:[],effects:[],player:{character:'director'},stats:{}};
  audio.update(s,1/60);const heard=[];audio.cue=(name,meta)=>heard.push({name,meta});
  s.effects=[{id:1,type:'bladeWave',kind:'warning',waveId:100,normalX:1,normalY:0},
    {id:2,type:'bladeWave',kind:'launch',waveId:100,normalX:1,normalY:0},
    {id:3,type:'bladeWave',kind:'pass',waveId:100,normalX:1,normalY:0}];audio.update(s,1/60);
  assert.deepEqual(heard.map(e=>e.name),['blade-prealert','blade-release','blade-pass']);
  assert(heard[0].meta.pan<0);assert(heard[1].meta.pan<0);assert(heard[2].meta.pan>0);
  s.effects=[{id:4,type:'bladeWave',kind:'launch',waveId:100,normalX:1,normalY:0}];audio.update(s,1/60);assert.equal(heard.length,3);
  s.effects=[{id:5,type:'bladeWave',kind:'warning',waveId:101,normalX:-1,normalY:0}];audio.update(s,1/60);assert(heard.at(-1).meta.pan>0);
  s.effects=[{id:6,type:'bladeWave',kind:'warning',waveId:102,normalX:0,normalY:1}];audio.update(s,1/60);assert.equal(heard.at(-1).meta.axis,'y');assert.equal(heard.at(-1).meta.pan,0);
  assert(!heard.some(e=>['hit','impact','fatal'].includes(e.name)),'a wave event alone cannot create collision sound');
});

test('muted or paused blade events are consumed and reset permits reused IDs in a new duel', async t => {
  const {audio,starts}=audioHarness(t,{holdSources:true});
  const make=()=>({...state('sukuna'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}});
  const s=make();audio.update(s,1/60);s.effects=[{id:1,type:'bladeWave',kind:'launch',waveId:50,normalX:1,normalY:0}];audio.update(s,1/60);
  await audio.setEnabled(true);const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push(name);cue(name,meta);};
  audio.update(s,1/60);assert(!heard.includes('blade-release'));
  s.effects=[{id:2,type:'bladeWave',kind:'launch',waveId:51,normalX:-1,normalY:0}];audio.update(s,1/60);assert(heard.includes('blade-release'));assert(audio.sources.size>0);
  audio.pause(true);assert.equal(audio.sources.size,0);const count=starts.length;
  s.effects=[{id:3,type:'bladeWave',kind:'pass',waveId:51,normalX:-1,normalY:0}];audio.update(s,1/60);assert.equal(starts.length,count);
  audio.pause(false);heard.length=0;audio.update(s,1/60);assert(!heard.includes('blade-pass'));
  const next=make();audio.update(next,1/60);assert.equal(audio.waveCueKeys.size,0);
  next.effects=[{id:1,type:'bladeWave',kind:'launch',waveId:50,normalX:1,normalY:0}];audio.update(next,1/60);assert(heard.includes('blade-release'));
});

test('wave cues use finite original envelopes with bounded voices and release all tails on mute', async t => {
  const {audio,starts,shapers,panners}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
  for(let i=0;i<90;i++)audio.cue(['blade-prealert','blade-release','blade-pass'][i%3],
    {eventId:2000+i,axis:i%2?'x':'y',normalY:i%2?1:-1,pan:i%2?.6:-.6});
  assert(starts.length>0);assert(audio.sources.size<=96);assert(panners.every(n=>Math.abs(n.pan.value)<=.75));
  assert(shapers[0].curve.every(n=>Number.isFinite(n)&&Math.abs(n)<.92));await audio.setEnabled(false);assert.equal(audio.sources.size,0);
});

test('live Caden waves synchronize with emitted events and fatal sound requires a real collision', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  for(const walk of [true,false]){
    audio.reset();const s=createPractice({character:'actor',stage:4});s.boss.patternIndex=patternTurnFor(s.boss.id,3);s.boss.patternCooldown=0;
    audio.update(s,1/60);const heard=[],events=new Map(),cue=audio.cue.bind(audio);
    audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};let sawDomain=false;
    for(let i=0;i<3000&&s.status==='playing';i++){
      const h=s.hazards.find(h=>h.domainType==='blade-waves'),g=walk&&h?getDomainGuide(s,h):null;
      const input=g?{left:g.target.x-s.player.x<-4,right:g.target.x-s.player.x>4,up:g.target.y-s.player.y<-4,down:g.target.y-s.player.y>4}:{};
      stepPractice(s,input,1/60);if(s.boss.attacks>0)s.boss.patternCooldown=999;
      audio.context.currentTime+=1/60;audio.update(s,1/60);
      for(const e of s.effects)if(e.type==='bladeWave')events.set(e.id,e);
      if(s.hazards.some(h=>h.domainType==='blade-waves'))sawDomain=true;
      if(sawDomain&&!s.hazards.some(h=>h.domainType==='blade-waves'))break;
    }
    const names={warning:'blade-prealert',launch:'blade-release',pass:'blade-pass'};
    for(const [kind,name] of Object.entries(names))assert.equal(heard.filter(e=>e.name===name).length,[...events.values()].filter(e=>e.kind===kind).length,kind);
    assert(heard.some(e=>e.name==='blade-release'));assert(heard.some(e=>e.name==='blade-pass'));
    const fatalities=heard.filter(e=>e.name==='fatal');assert.equal(fatalities.length,s.endReason==='domain'?1:0);
    if(!walk){assert.equal(s.endReason,'domain');assert(s.stats.damageTaken>0);}
    audio.cue=cue;
  }
});

test('pursuit milestones play once per real slash and preserve followup and crossing identity', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  const s={...state('sukuna'),cinematic:null,hazards:[],effects:[],player:{character:'director'},stats:{}};
  audio.update(s,1/60);const heard=[];audio.cue=(name,meta)=>heard.push({name,meta});
  s.effects=[{id:1,type:'pursuitSlash',kind:'tracking',slashId:201,normalX:1,normalY:0},
    {id:2,type:'pursuitSlash',kind:'lock',slashId:201,normalX:1,normalY:0},
    {id:3,type:'pursuitSlash',kind:'launch',slashId:201,normalX:1,normalY:0,strikeIndex:1},
    {id:4,type:'pursuitSlash',kind:'launch',slashId:202,normalX:-1,normalY:0,strikeIndex:2,followup:true},
    {id:5,type:'pursuitSlash',kind:'pass',slashId:201,normalX:1,normalY:0}];audio.update(s,1/60);
  assert.deepEqual(heard.map(e=>e.name),['pursuit-track','pursuit-lock','pursuit-release','pursuit-release','pursuit-pass']);
  assert(heard[0].meta.pan<0);assert(heard[3].meta.pan>0);assert(heard[4].meta.pan>0);assert.equal(heard[3].meta.followup,true);
  s.effects=[{id:6,type:'pursuitSlash',kind:'launch',slashId:202,normalX:-1,normalY:0}];audio.update(s,1/60);assert.equal(heard.length,5);
  s.effects=[{id:7,type:'pursuitSlash',kind:'launch',slashId:203,normalX:0,normalY:1,cross:true},
    {id:8,type:'pursuitSlash',kind:'launch',slashId:204,normalX:0,normalY:-1,cross:true}];audio.update(s,1/60);
  assert.equal(heard.length,7);assert(heard.slice(-2).every(e=>e.meta.cross===true&&e.meta.pan===0&&e.meta.axis==='y'));
  assert(!heard.some(e=>['hit','impact','fatal'].includes(e.name)),'tracking or slash movement alone cannot create collision sound');
});

test('muted pursuit events stay consumed and pause, reset and duel replacement clear all tails', async t => {
  const {audio,starts}=audioHarness(t,{holdSources:true});
  const make=()=>({...state('sukuna'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}});
  const s=make();audio.update(s,1/60);s.effects=[{id:1,type:'pursuitSlash',kind:'tracking',slashId:1,normalX:1}];audio.update(s,1/60);
  await audio.setEnabled(true);const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push(name);cue(name,meta);};
  audio.update(s,1/60);assert(!heard.includes('pursuit-track'));
  s.effects=[{id:2,type:'pursuitSlash',kind:'lock',slashId:1,normalX:1}];audio.update(s,1/60);assert(audio.sources.size>0);
  audio.pause(true);assert.equal(audio.sources.size,0);const count=starts.length;
  s.effects=[{id:3,type:'pursuitSlash',kind:'launch',slashId:1,normalX:1}];audio.update(s,1/60);assert.equal(starts.length,count);
  audio.pause(false);heard.length=0;audio.update(s,1/60);assert(!heard.includes('pursuit-release'));
  const next=make();audio.update(next,1/60);assert.equal(audio.pursuitCueKeys.size,0);
  next.effects=[{id:1,type:'pursuitSlash',kind:'tracking',slashId:1,normalX:1}];audio.update(next,1/60);assert(heard.includes('pursuit-track'));
  const oldSources=[...audio.sources];audio.reset();assert.equal(audio.sources.size,0);assert.equal(audio.pursuitCueKeys.size,0);
  assert(oldSources.every(source=>!audio.sourceNodes.has(source)));
});

test('pursuit cues keep finite low-gain envelopes, stereo bounds and the shared voice limit', async t => {
  const {audio,starts,shapers,panners}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
  for(let i=0;i<80;i++)audio.cue(['pursuit-track','pursuit-lock','pursuit-release','pursuit-pass'][i%4],
    {eventId:3000+i,cross:i%3===0,followup:i%2===1,strikeIndex:i%2+1,pan:i%2?.58:-.58});
  assert(starts.length>0);assert(audio.sources.size<=96);assert(panners.every(n=>Math.abs(n.pan.value)<=.75));
  assert(shapers[0].curve.every(n=>Number.isFinite(n)&&Math.abs(n)<.92));
  await audio.setEnabled(false);assert.equal(audio.sources.size,0);assert.equal(audio.sourceNodes.size,0);
});

test('Caden alternate takeovers reuse decoded music with one source and pause/mute/end cleanup', async t => {
  const {music,c,requests}=setup(t,{sukuna:DOMAIN_MUSIC_TRACKS.sukuna}),s=state('sukuna');
  s.hazards[0].domainType='blade-waves';music.sync(s,{enabled:true});await settle();
  const first=c.sources[0];assert.equal(music.playing,true);s.runTime+=7;s.cinematic=null;music.sync(s,{enabled:true});
  assert.equal(c.sources.length,1,'one recording persists across every blade phase');
  s.hazards=[];music.sync(s,{enabled:true});assert.equal(first.stopped,1);assert.equal(music.playing,false);
  s.hazards=[{id:50,kind:'domain',domainType:'chasing-slashes',active:false,life:15}];
  s.cinematic={id:51,kind:'domain',actorId:'sukuna',remaining:.8};music.sync(s,{enabled:true});await settle();
  assert.equal(c.sources.length,2);assert.equal(c.sources[1].starts[0][1],0);assert.equal(requests.length,1);
  s.runTime+=2;s.cinematic=null;music.sync(s,{enabled:true,paused:true});assert.equal(c.sources[1].stopped,1);
  music.sync(s,{enabled:true});await settle();assert.equal(c.sources[2].starts[0][1],2);
  music.sync(s,{enabled:false});assert.equal(c.sources[2].stopped,1);s.runTime+=1;music.sync(s,{enabled:true});await settle();
  assert.equal(c.sources[3].starts[0][1],3);s.hazards=[];music.sync(s,{enabled:true});assert.equal(c.sources[3].stopped,1);
  assert.equal(music.status().playing,false);assert.equal(music.status().bossId,null);
});

test('late Caden decoding cannot revive a cancelled chasing takeover or an abandoned duel', async t => {
  const {music,c}=setup(t,{sukuna:DOMAIN_MUSIC_TRACKS.sukuna}),s=state('sukuna');let finish;
  s.hazards[0].domainType='blade-waves';c.decodeAudioData=()=>new Promise(resolve=>{finish=resolve;});
  music.sync(s,{enabled:true});await settle();s.hazards=[{id:70,kind:'domain',domainType:'chasing-slashes',life:15}];
  s.cinematic=null;music.sync(s,{enabled:true});music.reset();finish({duration:6.2});await settle();
  assert.equal(c.sources.length,0);assert.equal(music.playing,false);
  const retry=state('sukuna');retry.practice={kind:'duel',epoch:1};retry.hazards[0].domainType='chasing-slashes';
  music.sync(retry,{enabled:true});await settle();assert.equal(c.sources.length,1);assert.equal(c.sources[0].starts[0][1],0);
  retry.status='gameover';music.sync(retry,{enabled:true});assert.equal(c.sources[0].stopped,1);
});

test('live chasing slashes play actual tracking, lock, seven-shot bursts and finale without phantom collisions', async t => {
  const {audio}=audioHarness(t);await audio.setEnabled(true);
  for(const walk of [true,false]){
    audio.reset();const s=createPractice({character:'actor',stage:4});s.boss.takeoverCount=1;s.boss.patternIndex=patternTurnFor(s.boss.id,3);s.boss.patternCooldown=0;
    audio.update(s,1/60);const heard=[],events=new Map(),cue=audio.cue.bind(audio);let sawDomain=false;
    audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};
    for(let i=0;i<2400&&s.status==='playing';i++){
      const h=s.hazards.find(h=>h.domainType==='chasing-slashes'),g=walk&&h?getDomainGuide(s,h):null;
      const input=g?{left:g.target.x-s.player.x<-4,right:g.target.x-s.player.x>4,up:g.target.y-s.player.y<-4,down:g.target.y-s.player.y>4}:{};
      stepPractice(s,input,1/60);if(s.boss.attacks>0)s.boss.patternCooldown=999;
      audio.context.currentTime+=1/60;audio.update(s,1/60);
      for(const e of s.effects)if(e.type==='pursuitSlash'){
        if(!events.has(e.id)&&e.kind==='tracking'&&e.phase===0){
          assert(s.hazards.some(h=>h.domainType==='chasing-slashes'&&h.active),'first tracking sound starts with actual active tracking');
          assert(!s.cinematic,'initial tracking sound must not preempt the takeover cutscene');
        }
        events.set(e.id,e);
      }
      if(s.hazards.some(h=>h.domainType==='chasing-slashes'))sawDomain=true;
      if(sawDomain&&!s.hazards.some(h=>h.domainType==='chasing-slashes'))break;
    }
    const names={tracking:'pursuit-track',lock:'pursuit-lock',launch:'pursuit-release',pass:'pursuit-pass'};
    for(const [kind,name] of Object.entries(names))assert.equal(heard.filter(e=>e.name===name).length,[...events.values()].filter(e=>e.kind===kind).length,kind);
    assert(heard.some(e=>e.name==='pursuit-lock'));assert(heard.some(e=>e.name==='pursuit-release'));
    assert.equal(heard.filter(e=>e.name==='fatal').length,s.endReason==='domain'?1:0);
    if(walk){assert(heard.some(e=>e.name==='pursuit-release'&&e.meta.shotCount===7));assert(heard.some(e=>e.name==='pursuit-release'&&e.meta.cross));}
    else{assert.equal(s.endReason,'domain');assert(s.stats.damageTaken>0);}
    audio.cue=cue;
  }
});


test('v14 counter and trial signals occur once, do not manufacture hits and respect mute', async t => {
  const {audio,starts}=audioHarness(t);await audio.setEnabled(true);
  const s={...state('mime'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};
  audio.update(s,1/60);const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};
  s.effects=[{id:1,type:'patternCue',kind:'audition',x:400},{id:2,type:'auditionHit',success:true,x:600},{id:3,type:'counterOpen',x:700}];audio.update(s,1/60);
  assert.deepEqual(heard.map(e=>e.name),['feint','audition-pick','counter-open']);
  audio.update(s,1/60);assert.equal(heard.length,3);assert(!heard.some(e=>['impact','hit','fatal'].includes(e.name)));
  await audio.setEnabled(false);const count=starts.length;
  s.effects=[{id:4,type:'patternCue',kind:'replay',x:300},{id:5,type:'rehearsalResult',success:true,index:2,x:500}];audio.update(s,1/60);assert.equal(starts.length,count);
  await audio.setEnabled(true);heard.length=0;audio.update(s,1/60);assert.equal(heard.length,0);
  for(const name of ['counter-open','trial-light','audition-pick','pattern-replay','pattern-encore'])audio.cue(name,{eventId:name,success:true,index:3});
  assert(starts.length>count);assert(audio.sources.size<=96);audio.pause(true);assert.equal(audio.sources.size,0);
});

test('longer judge entrances sustain their swell and release it immediately on pause',async t=>{
 const {audio}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
 const original=audio._note.bind(audio),durations=[];audio._note=(...args)=>{durations.push(args[2]);return original(...args);};
 audio.cue('cinematic',{kind:'bossIntro',actorId:'sukuna',duration:3.8,eventId:15001});
 assert(durations.some(d=>d>=3.7),'opening swell must follow the extended camera shot');
 assert(audio.duckUntil>=audio.context.currentTime+3.7);assert(audio.sources.size>0);
 audio.pause(true);assert.equal(audio.sources.size,0);assert.equal(audio.sourceNodes.size,0);
});

test('seven rapid real release cues remain distinct and directional without false damage sounds',async t=>{
 const {audio,starts,panners}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
 const s={...state('sukuna'),cinematic:null,hazards:[],effects:[],player:{character:'director'},stats:{}};audio.update(s,1/60);
 const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta)=>{heard.push({name,meta});cue(name,meta);};
 for(let n=0;n<7;n++){s.effects=[{id:15010+n,type:'pursuitSlash',kind:'launch',slashId:15010+n,shotIndex:n+1,shotCount:7,normalX:n%2?1:-1,normalY:0,section:'burst'}];audio.context.currentTime+=.2;audio.update(s,.2);audio.update(s,1/60);}
 assert.equal(heard.filter(e=>e.name==='pursuit-release').length,7);assert(!heard.some(e=>['hit','impact','fatal'].includes(e.name)));assert(starts.length>=14);assert(audio.sources.size<=96);assert(panners.every(p=>Math.abs(p.pan.value)<=.75));
 await audio.setEnabled(false);assert.equal(audio.sources.size,0);
});


for (const [stage,bossId,count] of [[0,'ignis',2],[1,'mime',3],[2,'gojo',5],[4,'sukuna',7]]) {
  test(`v17 ${bossId} ordinary tracking/lock/launch audio follows actual attack events once`, async t => {
    const {audio}=audioHarness(t);await audio.setEnabled(true);
    const s=createPractice({character:'actor',stage});while(s.cinematic)stepPractice(s,{},1/60);
    s.boss.patternIndex=patternTurnFor(s.boss.id,5);s.boss.patternCooldown=0;s.player.hp=s.player.maxHp=9999;
    audio.update(s,1/60);const heard=[],events=new Map(),cue=audio.cue.bind(audio);
    audio.cue=(name,meta={})=>{heard.push({name,meta});cue(name,meta);};let started=false;
    for(let frame=0;frame<600;frame++){
      stepPractice(s,{up:s.player.y>350},1/60);if(s.boss.attacks>0)s.boss.patternCooldown=999;
      started ||= s.hazards.some(h=>h.conceptPattern);
      for(const e of s.effects)if(e.type==='bossShot')events.set(e.id,e);
      audio.context.currentTime+=1/60;audio.update(s,1/60);const length=heard.length;audio.update(s,1/60);assert.equal(heard.length,length);
      if(started&&!s.hazards.some(h=>h.conceptPattern)&&!s.projectiles.some(q=>q.owner==='enemy'))break;
    }
    assert(started);const ordinary=heard.filter(e=>e.meta.type==='bossShot');
    assert.equal(ordinary.filter(e=>e.meta.kind==='tracking').length,1,'one initial tracking cue per cast');
    const launches=[...events.values()].filter(e=>e.kind==='launch');assert.equal(launches.length,count);
    assert.deepEqual(ordinary.filter(e=>e.meta.kind==='launch').map(e=>e.meta.eventId),launches.map(e=>e.id));
    const locks=[...events.values()].filter(e=>e.kind==='lock');assert.deepEqual(ordinary.filter(e=>e.meta.kind==='lock').map(e=>e.meta.eventId),locks.map(e=>e.id));
    assert(!ordinary.some(e=>e.meta.kind==='hit'),'launch/lock sounds never impersonate a hit');
    if(stage>=2)assert(ordinary.filter(e=>e.meta.kind==='launch').every(e=>e.meta.projectileId&&e.meta.projectileKind===(stage===2?'frame-shard':'rhythm-blade')));
    const length=heard.length;await audio.setEnabled(false);await audio.setEnabled(true);audio.update(s,1/60);assert.equal(heard.length,length,'enabling never replays consumed ordinary cues');
    assert(audio.sources.size<=96);audio.destroy();assert.equal(audio.sources.size,0);
  });
}

for(const [bossId,names] of Object.entries({
 ignis:['cap-track','cap-lock','cap-release'],
 mime:['casting-track','casting-lock','casting-dash'],
 gojo:['seat-track','seat-lock','seat-close'],
 sukuna:['moving-track','moving-lock','moving-dash'],
})){
 test(`personality ${bossId} preparation, lock and release are distinct, directional and deduplicated`,async t=>{
  const {audio,starts,panners}=audioHarness(t);await audio.setEnabled(true);
  const s={...state(bossId),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};
  audio.update(s,1/60);const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta={})=>{heard.push({name,meta});cue(name,meta);};
  let id=19000;
  for(const kind of ['tracking','lock','launch']){
   s.effects=[{id:++id,type:'personalityShot',kind,bossId,attackId:18,shotId:21,index:1,total:3,originX:250,originY:450}];audio.context.currentTime+=.2;audio.update(s,.2);
   // A duplicate event object with a new event ID cannot double a physical milestone.
   s.effects=[{...s.effects[0],id:++id}];audio.update(s,1/60);audio.update(s,1/60);
  }
  assert.deepEqual(heard.map(e=>e.name),names);assert(heard.every(e=>e.meta.pan<0));
  assert(!heard.some(e=>['hit','impact','fatal'].includes(e.name)));
  assert(starts.length>=6);assert(panners.every(p=>Math.abs(p.pan.value)<=.75));
  s.effects=[{id:++id,type:'personalityShot',kind:'hit',bossId,attackId:18,shotId:21,index:1,damage:20}];audio.update(s,1/60);
  assert.equal(heard.length,3,'physical hit effects are never replayed as releases or fake impact events');
  await audio.setEnabled(false);const mutedStarts=starts.length;
  s.effects=[{id:++id,type:'personalityShot',kind:'launch',bossId,attackId:18,shotId:22,index:2,originX:1000}];audio.update(s,.2);assert.equal(starts.length,mutedStarts);
  await audio.setEnabled(true);const count=heard.length;audio.update(s,1/60);assert.equal(heard.length,count,'unmute never repeats the consumed launch');
  audio.reset();assert.equal(audio.personalityCueKeys.size,0);
 });
}
test('personality cap preparation coalesces while individual throws and moving follow-ups stay distinct',async t=>{
 const {audio,starts}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);
 const s={...state('ignis'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};audio.update(s,1/60);
 const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta={})=>{heard.push({name,meta});cue(name,meta);};let id=20000;
 for(const kind of ['tracking','lock','launch'])for(let index=1;index<=3;index++){
  s.effects=[{id:++id,type:'personalityShot',kind,bossId:'ignis',attackId:8,shotId:80+index,index,total:3,originX:400}];audio.context.currentTime+=.14;audio.update(s,.14);
 }
 assert.equal(heard.filter(e=>e.name==='cap-track').length,1);assert.equal(heard.filter(e=>e.name==='cap-lock').length,3);assert.equal(heard.filter(e=>e.name==='cap-release').length,3);
 for(let index=1;index<=3;index++)for(const kind of ['launch','followup']){
  s.effects=[{id:++id,type:'personalityShot',kind,bossId:'sukuna',attackId:9,shotId:90+index,index,total:3,originX:index%2?200:1050}];audio.context.currentTime+=.2;audio.update(s,.2);
 }
 assert.equal(heard.filter(e=>e.name==='moving-dash').length,3);assert.equal(heard.filter(e=>e.name==='moving-followup').length,3);assert(starts.length>30);assert(audio.sources.size<=96);
 audio.pause(true);assert.equal(audio.sources.size,0);assert.equal(audio.sourceNodes.size,0);
});

test('Max archive music is a local original PCM recording and keeps exact playback through pause and mute',async t=>{
 const {readFile}=await import('node:fs/promises');const bytes=await readFile(new URL('./assets/domain-max-original.wav',import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');assert.equal(bytes.readUInt16LE(20),1);assert.equal(bytes.readUInt32LE(24),22050);assert(bytes.length>500000);
 assert.match(DOMAIN_MUSIC_TRACKS.max.src,/domain-max-original\.wav\?v=19$/);assert.equal(DOMAIN_MUSIC_TRACKS.max.loop,true);
 const {music,c}=setup(t,{max:DOMAIN_MUSIC_TRACKS.max}),s=state('max');music.sync(s,{enabled:true});await settle();assert.equal(music.status().bossId,'max');assert.equal(c.sources.length,1);
 s.runTime+=2;music.sync(s,{enabled:true,paused:true});assert.equal(c.sources[0].stopped,1);music.sync(s,{enabled:true});await settle();assert.equal(c.sources[1].starts[0][1],2);
 music.sync(s,{enabled:false});assert.equal(c.sources[1].stopped,1);s.hazards=[];s.cinematic=null;music.sync(s,{enabled:true});assert.equal(music.playing,false);
});

test('Max camera, return and each archive step sound once without phantom damage or replay after unmute',async t=>{
 const {audio,starts}=audioHarness(t,{holdSources:true});await audio.setEnabled(true);const s={...state('max'),cinematic:null,hazards:[],effects:[],player:{character:'actor'},stats:{}};audio.update(s,1/60);
 const heard=[],cue=audio.cue.bind(audio);audio.cue=(name,meta={})=>{heard.push({name,meta});cue(name,meta);};let id=24000;
 for(const kind of ['tracking','lock','launch','return-warning','return','hit','finish']){s.effects=[{id:++id,type:'maxShot',bossId:'max',attackId:100,shotId:105,index:1,total:4,kind,x:300}];audio.context.currentTime+=.15;audio.update(s,.15);s.effects=[{...s.effects[0],id:++id}];audio.update(s,1/60);}
 assert.deepEqual(heard.map(e=>e.name),['max-focus','max-lock','max-shutter','max-recall','max-return','max-finish']);assert(heard.every(e=>e.meta.pan<0));assert(!heard.some(e=>['hit','fatal','impact'].includes(e.name)));
 for(let index=1;index<=5;index++){s.effects=[{id:++id,type:'maxShot',bossId:'max',attackId:110,shotId:112,index,total:6,kind:'archive-close',x:640}];audio.context.currentTime+=.2;audio.update(s,.2);}
 assert.equal(heard.filter(e=>e.name==='max-archive-close').length,5,'same domain hazard has distinct indexed shutter steps');
 await audio.setEnabled(false);const count=starts.length;s.effects=[{id:++id,type:'maxShot',bossId:'max',attackId:110,shotId:112,index:6,total:6,kind:'archive-flash'}];audio.update(s,.2);assert.equal(starts.length,count);const after=heard.length;await audio.setEnabled(true);audio.update(s,1/60);assert.equal(heard.length,after);assert(audio.sources.size<=96);audio.reset();assert.equal(audio.maxCueKeys.size,0);
});

test('real Max photo release and return events have matching camera sounds and no duplicate cues',async t=>{
 const {audio}=audioHarness(t);await audio.setEnabled(true);const s=afterEntrance(createPractice({stage:3,character:'actor'}));s.player.hp=s.player.maxHp=10000;s.boss.patternIndex=patternTurnFor('max',6);s.boss.patternCooldown=0;
 const heard=[],events=new Map(),cue=audio.cue.bind(audio);audio.cue=(name,meta={})=>{heard.push({name,meta});cue(name,meta);};audio.update(s,1/60);let began=false;
 for(let i=0;i<700;i++){step(s,{down:s.player.y<610},1/60);for(const e of s.effects)if(e.type==='maxShot')events.set(e.id,e);audio.context.currentTime+=1/60;audio.update(s,1/60);const n=heard.length;audio.update(s,1/60);assert.equal(heard.length,n);if(s.maxPattern)began=true;if(s.boss.attacks)s.boss.patternCooldown=999;if(began&&!s.maxPattern)break;}
 assert(began);assert.equal(heard.filter(e=>e.name==='max-shutter').length,6);assert(s.stats.maxReturns>0);assert.equal(heard.filter(e=>e.name==='max-return').length,s.stats.maxReturns);assert.equal(heard.filter(e=>e.name==='max-recall').length,[...events.values()].filter(e=>e.kind==='return-warning').length);
});
