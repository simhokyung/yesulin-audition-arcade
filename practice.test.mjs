import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startStage,step,BOSSES,CHARACTERS,getDomainGuide,patternTurnFor} from './engine.js';
import {createPractice as createRawPractice,stepPractice} from './practice.js';
function finishIntro(s){while(s.cinematic)step(s);return s;}
function createPractice(options={}){return finishIntro(createRawPractice(options));}
const tick=(s,seconds,input={})=>{for(let i=0;i<seconds*60;i++)stepPractice(s,input,1/60);};

test('all eight practice duels use ranked HP, damage, difficulty and initial setup',()=>{for(const character of ['director','actor'])for(let stage=0;stage<4;stage++){const p=createPractice({stage,character}),c=createGame({mode:'challenge',character});startStage(c,stage,{retry:true,entrance:true});finishIntro(c);assert.equal(p.mode,'practice');assert.equal(p.difficulty,'standard');assert.equal(p.boss.hp,c.boss.hp);assert.equal(p.boss.damage,c.boss.damage);assert.equal(p.enemies.length,0);assert.equal(p.player.character,character);assert.equal(p.seed,c.seed);assert.equal(p.timeLeft,null);assert.equal(p.duration,0);assert.equal(p.practice.kind,'duel');}});
test('practice boss movement, casts, colliders and damage match the production engine step for step',()=>{for(const character of ['director','actor'])for(let stage=0;stage<4;stage++){const p=createPractice({stage,character}),c=createGame({mode:'challenge',character});startStage(c,stage,{retry:true,entrance:true});finishIntro(c);for(let i=0;i<300&&p.status==='playing';i++){const input={left:i%120<60,right:i%120>=60,up:i%180<90,down:i%180>=90};stepPractice(p,input);step(c,input);assert.deepEqual(p.boss,c.boss);assert.deepEqual(p.hazards,c.hazards);assert.deepEqual(p.player,c.player);assert.equal(p.stats.damageTaken,c.stats.damageTaken);}}});
test('each duel ends after its chosen boss without an automatic next act',()=>{for(let stage=0;stage<4;stage++){const s=createPractice({stage});s.boss.hp=0;stepPractice(s);assert.equal(s.status,'victory');assert.equal(s.endReason,'clear');assert.equal(s.transitionTimer,0);assert.equal(s.practice.successes,1);const time=s.runTime;tick(s,2);assert.equal(s.stage,stage);assert.equal(s.stats.stagesCleared,1);assert.equal(s.runTime,time);}});
test('duel damage and defeat use ordinary combat without a freeze-reset or training immunity',()=>{const s=createPractice();s.player.invuln=0;s.player.hp=1;s.hazards=[{id:991,type:'circle',kind:'test',x:s.player.x,y:s.player.y,radius:300,radiusY:200,damage:30,active:true,life:1}];stepPractice(s);assert.equal(s.status,'gameover');assert.equal(s.player.hp,0);tick(s,3);assert.equal(s.status,'gameover');assert.equal(s.practice.attempts,1);assert.equal(s.practice.phase,'attempt');});
test('a fresh retry restores HP, cooldowns, signatures and score without carrying queued hits',()=>{const old=createPractice({stage:2,character:'actor'});old.player.hp=73;old.player.cooldowns.ultimate=29;old.player.adlibReady=true;old.score=999;old.followups.push({remaining:.1,damage:1000});const fresh=createPractice({stage:2,character:'actor'});assert.equal(fresh.player.hp,CHARACTERS.actor.hp);assert.equal(fresh.player.cooldowns.ultimate,0);assert.equal(fresh.player.adlibReady,false);assert.equal(fresh.player.nextFinisherReady,false);assert.equal(fresh.followups.length,0);assert.equal(fresh.score,0);assert.equal(fresh.stats.damageDealt,0);assert.equal(fresh.boss.id,'gojo');assert.equal(fresh.player.character,'actor');});
test('practice keeps its non-ranked identity while all Q W E R inputs remain usable',()=>{const s=createPractice({character:'actor'});s.player.x=700;s.boss.x=780;s.boss.y=500;s.boss.patternCooldown=999;stepPractice(s,{attackPressed:true});tick(s,.4);assert.equal(s.stats.hits,3);stepPractice(s,{buff:true,skill:true});assert.equal(s.stats.skills,1);assert.equal(s.stats.buffs,1);s.player.hype=100;stepPractice(s,{ultimate:true});assert.equal(s.stats.ultimates,1);assert.equal(s.cinematic.kind,'playerUltimate');assert.equal(s.mode,'practice');assert.equal(s.practice.kind,'duel');assert.ok(!('ghost' in s.practice));assert.ok(!('feedback' in s.practice));});
test('practice remains untimed beyond 120 seconds and clamps invalid choices safely',()=>{const s=createPractice({stage:99,character:'missing',kind:'pattern',demonstrate:true,difficulty:'hard'});assert.equal(s.boss.id,'sukuna');assert.equal(s.player.character,'director');assert.equal(s.practice.kind,'duel');assert.equal(s.practice.phase,'attempt');assert.equal(s.difficulty,'standard');s.boss.patternCooldown=1000;tick(s,125);assert.equal(s.status,'playing');assert.equal(s.timeLeft,null);assert.equal(s.endReason,null);assert.equal(createPractice({stage:-100}).boss.id,'ignis');});
test('invalid practice time deltas cannot advance simulation',()=>{const s=createPractice(),before=JSON.stringify(s);for(const dt of [NaN,Infinity,-1,0])stepPractice(s,{right:true},dt);assert.equal(JSON.stringify(s),before);});

test('practice uses the same first blade and second pursuit as production and resets the alternation on retry',()=>{
 for(const character of ['director','actor']){
  const practice=createPractice({stage:3,character}),production=createGame({mode:'challenge',character});startStage(production,3,{retry:true,entrance:true});finishIntro(production);
  while(practice.cinematic){stepPractice(practice);step(production);}
  for(const [occurrence,type] of [[0,'blade-waves'],[1,'chasing-slashes']]){
   while(practice.boss.counterRemaining>0){stepPractice(practice);step(production);}
   for(const s of [practice,production]){s.boss.patternIndex=patternTurnFor(s.boss.id,3,{occurrence});s.boss.patternCooldown=0;}
   stepPractice(practice);step(production);assert.equal(practice.hazards[0].domainType,type);
   for(let f=0;f<2400&&practice.status==='playing'&&(practice.hazards.length||practice.cinematic);f++){
    const g=getDomainGuide(practice,practice.hazards[0]),p=practice.player,input=g?{left:g.target.x-p.x<-4,right:g.target.x-p.x>4,up:g.target.y-p.y<-4,down:g.target.y-p.y>4}:{};
    stepPractice(practice,input);step(production,input);assert.deepEqual(practice.hazards,production.hazards);assert.deepEqual(practice.boss,production.boss);assert.deepEqual(practice.player,production.player);
   }
   assert.equal(practice.status,'playing');assert.equal(practice.hazards.length,0);assert.equal(practice.player.hp,CHARACTERS[character].hp);
  }
  assert.equal(practice.boss.takeoverCount,2);assert.equal(practice.stats.takeoverSurvived['chasing-slashes'],1);assert.equal(createPractice({stage:3,character}).boss.takeoverCount,0);
 }
});

test('each selected practice opponent plays its real entrance before accepting combat input',()=>{
 for(const character of ['director','actor'])for(let stage=0;stage<4;stage++){
  const s=createRawPractice({stage,character});assert.equal(s.cinematic.kind,'bossIntro');assert.equal(s.cinematic.actorId,BOSSES[stage].id);assert.equal(s.cinematic.duration,[3,3.2,3.4,3.8][stage]);const p=JSON.stringify(s.player),world=s.time;
  stepPractice(s,{attackPressed:true,skill:true,buff:true,dodge:true,right:true},1/30);assert.equal(JSON.stringify(s.player),p);assert.equal(s.time,world);finishIntro(s);stepPractice(s);assert.equal(s.stats.skills,0);assert.equal(s.stats.hits,0);assert.equal(s.status,'playing');
 }
});
test('all four extra normal patterns use identical figures, colliders and outcomes in practice and production',()=>{
 for(const character of ['director','actor'])for(let stage=0;stage<4;stage++){
  const p=createPractice({stage,character}),c=createGame({mode:'challenge',character});startStage(c,stage,{retry:true,entrance:true});finishIntro(c);
  for(const s of [p,c]){s.boss.patternIndex=patternTurnFor(s.boss.id,4);s.boss.patternCooldown=0;}stepPractice(p);step(c);assert.equal(p.boss.telegraph.index,4);
  for(let n=0;n<300&&p.status==='playing';n++){const input={up:n<80,right:n>=80&&n<160};stepPractice(p,input);step(c,input);assert.deepEqual(p.hazards,c.hazards);assert.deepEqual(p.audition,c.audition);assert.deepEqual(p.rehearsal,c.rehearsal);assert.deepEqual(p.player,c.player);assert.deepEqual(p.stats,c.stats);}
 }
});


test('new sixth patterns preserve actual projectiles and damage in practice and production',()=>{
 for(const character of ['director','actor'])for(let stage=0;stage<4;stage++)for(const phase of [1,2]){
  const p=createPractice({stage,character}),c=createGame({mode:'challenge',character});startStage(c,stage,{retry:true,entrance:true});finishIntro(c);
  for(const s of [p,c]){s.boss.phase=phase;s.boss.patternIndex=patternTurnFor(s.boss.id,5);s.boss.patternCooldown=0;}stepPractice(p);step(c);assert.equal(p.boss.telegraph.index,5);
  let launches=0;const seen=new Set();
  for(let n=0;n<600&&p.status==='playing';n++){
   const input={up:n%240<100,right:n%240>=100&&n%240<160,down:n%240>=160};stepPractice(p,input);step(c,input);
   assert.deepEqual(p.hazards,c.hazards);assert.deepEqual(p.projectiles,c.projectiles);assert.deepEqual(p.boss,c.boss);assert.deepEqual(p.player,c.player);assert.deepEqual(p.stats,c.stats);
   for(const e of p.effects)if(e.type==='bossShot'&&e.kind==='launch'&&!seen.has(e.id)){seen.add(e.id);launches++;}
  }
  assert.ok(launches>0,'actual new attack must execute');assert.equal(p.mode,'practice');assert.equal(p.practice.kind,'duel');
 }
});

test('both phase-selected domain variants match production geometry and reset on fresh practice',()=>{
 for(const character of ['director','actor'])for(let stage=0;stage<3;stage++)for(const phase of [1,2])for(const count of [0,1]){
  const p=createPractice({stage,character}),c=createGame({mode:'challenge',character});startStage(c,stage,{retry:true,entrance:true});finishIntro(c);
  for(const s of [p,c]){s.boss.phase=phase;s.boss.takeoverCount=count;s.boss.patternIndex=patternTurnFor(s.boss.id,3);s.boss.patternCooldown=0;}stepPractice(p);step(c);
  const h=p.hazards.find(h=>h.kind==='domain'),expected=[['straight-light','return-light'],['single-swap','double-swap'],['normal-frames','reverse-frames']][stage][(count+(phase===2?1:0))%2];assert.equal(h.variantId,expected);
  for(let n=0;n<1800&&p.status==='playing'&&p.hazards.includes(h);n++){
   const g=getDomainGuide(p,h),input={left:g.target.x-p.player.x<-4,right:g.target.x-p.player.x>4,up:g.target.y-p.player.y<-4,down:g.target.y-p.player.y>4};stepPractice(p,input);step(c,input);
   assert.deepEqual(p.hazards,c.hazards);assert.deepEqual(p.player,c.player);assert.deepEqual(p.stats,c.stats);
  }
  assert.equal(p.status,'playing');assert.equal(p.stats.takeoverVariantSurvived[expected],1);assert.equal(createPractice({stage,character}).boss.takeoverCount,0);
 }
});

test('personality skills use the same moving boss, real shots and outcomes in practice and challenge',()=>{
 for(const character of ['director','actor'])for(let stage=0;stage<4;stage++){
  const p=createPractice({stage,character}),c=createGame({mode:'challenge',character});startStage(c,stage,{retry:true,entrance:true});finishIntro(c);
  for(const s of [p,c]){s.boss.patternIndex=patternTurnFor(s.boss.id,6);s.boss.patternCooldown=0;}
  stepPractice(p);step(c);assert.equal(p.boss.telegraph.index,6);
  const launched=new Set();
  for(let frame=0;frame<600&&p.status==='playing';frame++){
   const input={up:frame%200<80,right:frame%200>=80&&frame%200<120,down:frame%200>=120};stepPractice(p,input);step(c,input);
   for(const key of ['personality','hazards','projectiles','boss','player','stats'])assert.deepEqual(p[key],c[key],key+' remains identical');
   for(const e of p.effects)if(e.type==='personalityShot'&&e.kind==='launch')launched.add(e.id);
  }
  assert(launched.size>0,'new skill actually launches in both modes');assert.equal(p.timeLeft,null);
 }
});
