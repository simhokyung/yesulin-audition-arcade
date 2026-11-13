import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,startStage,BOSSES,CHARACTERS,getPersonalityGuide,getPatternGuide,isInsideHazard,rankedPatternAt,patternTurnFor} from './engine.js';

const LEGACY=BOSSES.filter(b=>b.id!=='max'),ids=LEGACY.map(b=>b.id),walk=(s,p)=>p?{left:p.x<s.player.x-3,right:p.x>s.player.x+3,up:p.y<s.player.y-3,down:p.y>s.player.y+3}:{};
function fixture(stage,character='director',dt=1/60,x=520,y=480){
 const s=createGame({stage:BOSSES.findIndex(b=>b.id===ids[stage]),character,skipIntro:true});s.cinematic=null;Object.assign(s.player,{x,y,invuln:0});Object.assign(s.boss,{x:950,y:480,patternIndex:6,patternCooldown:0});step(s,{},dt);assert(s.personality);return s;
}
function run(s,{dt=1/60,policy='walk',reaction=.35,observe=()=>{}}={}){
 const start=s.personality.attackId,noticed=new Map();let frames=0;
 while(s.status==='playing'&&s.personality&&frames++<1000){
  const g=getPersonalityGuide(s);if(g.phase!=='waiting'&&!g.tracking&&!noticed.has(g.index))noticed.set(g.index,s.personality.elapsed);
  const age=s.personality.elapsed-(noticed.get(g.index)??Infinity),input=policy==='walk'&&age>=reaction?walk(s,g.target):{};
  observe(s,g,input);step(s,input,dt);
 }
 return {frames,start,completed:!s.personality&&s.status==='playing',damage:s.stats.damageTaken};
}

test('personal skills extend all previous pattern lists with distinct ordinary audition techniques',()=>{
 assert.deepEqual(LEGACY.map(b=>b.patterns[6]),['빨뚜 통째로, 액션!','끝까지 캐스팅','자리해야지~','원테이크, 따라와']);
 assert.deepEqual(LEGACY.map(b=>b.patterns.length),[7,7,7,10]);assert.deepEqual(LEGACY.map(b=>[b.hp,b.damage]),[[4100,18],[5800,26],[8800,38],[10100,50]]);
 for(const c of Object.values(CHARACTERS))assert.equal(c.hp,260);
 for(const id of ids){assert.equal(rankedPatternAt(id,0),id==='sukuna'?7:6);const seen=new Set(Array.from({length:11},(_,turn)=>rankedPatternAt(id,turn)));assert.deepEqual([...seen].sort(),id==='sukuna'?[0,1,2,3,4,5,6,7,8,9]:[0,1,2,3,4,5,6]);assert.equal(patternTurnFor(id,3),['ignis','mime'].includes(id)?4:1);}
});

test('ignoring each personal attack takes ordinary damage at 30 and 60 Hz, never domain instant death',()=>{
 for(let stage=0;stage<4;stage++)for(const dt of [1/30,1/60])for(const phase of [1,2]){
  const s=fixture(stage,'director',dt);s.boss.phase=phase;const r=run(s,{dt,policy:'still'});
  assert(r.completed||s.status==='gameover');assert(r.damage>0&&r.damage<=260,ids[stage]);assert.equal(s.endReason,s.player.hp>0?null:'defeat');assert.equal(s.stats.personalityCasts[ids[stage]],1);if(r.completed)assert.equal(s.stats.personalityShots[ids[stage]],stage===1?2:stage===0?3:7);
 }
});

test('both roles can walk every personal attack after .25-second responses without dodge or combat-stat modification',()=>{
 for(let stage=0;stage<4;stage++)for(const character of ['director','actor'])for(const dt of [1/30,1/60])for(const point of [[76,340],[640,482],[1204,624]]){
  const s=fixture(stage,character,dt,...point),r=run(s,{dt,reaction:.25});
  assert(r.completed,JSON.stringify({stage,character,dt,point}));assert.equal(r.damage,0,JSON.stringify({stage,character,dt,point}));assert.equal(s.stats.dodges,0);assert.equal(s.stats.skills,0);assert.equal(s.player.hp,260);
 }
});

test('each visible locked direction is immutable even when the player reverses',()=>{
 for(const stage of [0,1,3]){
  const s=fixture(stage),locked=new Map();run(s,{observe(state){for(const q of state.personality.shots){if(!q.locked)continue;const value=JSON.stringify({origin:q.origin,target:q.target,path:q.path,angle:q.angle});if(locked.has(q.id))assert.equal(value,locked.get(q.id));else{locked.set(q.id,value);assert(q.launchAt-(q.lockedAt??q.lockAt)>=.65-1/30);}}}});
  assert.equal(locked.size,stage===1?2:stage===0?3:7);
 }
});

test('cap warnings stay harmless and exactly three real cap bodies launch with a .42-second rhythm',()=>{
 const s=fixture(0),events=new Map(),seen=new Set();run(s,{observe(state){for(const q of state.personality.shots)assert.equal(isInsideHazard(state.player.x,state.player.y,q),false);for(const q of state.projectiles){assert.equal(q.kind,'red-cap');assert.equal(q.radius,21);assert.equal(q.radiusY,15);assert.equal(q.personalityPattern,true);seen.add(q.id);}for(const e of state.effects)if(e.type==='personalityShot'&&e.kind==='launch')events.set(e.shotId,e);}});
 assert.equal(events.size,3);assert.equal(seen.size,3);const times=[...events.values()].map(e=>e.time);for(let i=1;i<3;i++)assert(Math.abs(times[i]-times[i-1]-.42)<.034);
});

test('charge geometry uses actual moving body ellipses, not the whole warning path',()=>{
 for(const stage of [1,3]){
  const s=fixture(stage);while(!s.personality.shots[0].locked)step(s);
  const shot=s.personality.shots[0],target={...s.player};assert(Math.hypot(target.x-shot.origin.x,target.y-shot.origin.y)>300);
  while(shot.phase!=='active')step(s);assert.equal(s.stats.damageTaken,0,'launching far away cannot damage the full line');
  for(let f=0;f<100&&shot.phase==='active'&&s.stats.damageTaken===0;f++){const body=shot.body;if(Math.hypot(body.x-target.x,body.y-target.y)>90)assert.equal(s.stats.damageTaken,0);step(s);}
  assert(s.stats.damageTaken>0,'actual crossing body deals damage');
 }
});

test('a fast charge cannot tunnel through feet at either frame rate',()=>{
 for(const stage of [1,3])for(const dt of [1/30,1/60]){
  const s=fixture(stage,'director',dt);while(s.personality.shots[0].phase!=='active')step(s,{},dt);
  const q=s.personality.shots[0],a={x:q.body.x,y:q.body.y},b=q.path[1];Object.assign(s.player,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,invuln:0});q.dashDuration=q.dashElapsed+.0001;const hp=s.player.hp;step(s,{},dt);assert(s.player.hp<hp);assert(q.hit);
 }
});

test('Moving gives each aftercut a separate .62-second warning with an exact finite collider',()=>{
 const s=fixture(3),seen=new Set();run(s,{observe(state){for(const h of state.hazards.filter(h=>h.kind==='moving-aftercut')){
  if(!seen.has(h.id)){assert.equal(h.duration,.62);assert(h.remaining>=.62-1/30);assert.equal(h.active,false);assert.equal(h.height,42);assert(h.width>0&&h.width<=760.01);seen.add(h.id);}
  assert.equal(h.personalityPattern,true);assert.equal(h.totalLife,.24);
 }}});assert.equal(seen.size,7);
});

test('If reserves the current place seven times after an initial tracking cue and old reservations remain fixed until expiry',()=>{
 const s=fixture(2),places=new Map();run(s,{observe(state){for(const h of state.hazards){if(!h.locked)continue;if(places.has(h.id))assert.deepEqual([h.x,h.y],places.get(h.id));else places.set(h.id,[h.x,h.y]);assert.equal(h.kind,'seat-reservation');assert.equal(h.radius,72);assert.equal(h.radiusY,46);assert.equal(h.totalLife,1.25);}}});
 assert.equal(places.size,7);assert(new Set([...places.values()].map(p=>p.join(','))).size>1,'later reservations follow actual new player positions');
});

test('a double missed casting charge opens exactly one existing counter window',()=>{
 const s=fixture(1);run(s);assert.equal(s.stats.counterWindows,1);assert.equal(s.boss.counterRemaining,1.8);assert.equal(s.boss.counterDuration,1.8);assert.equal(s.boss.counterReason,'끝까지 캐스팅 회피');
 const hit=fixture(1);run(hit,{policy:'still'});assert.equal(hit.stats.counterWindows,0);assert.equal(hit.boss.counterRemaining,0);
});

test('remaining caps, reservations, dashes and aftercuts prevent any next skill or takeover',()=>{
 for(let stage=0;stage<4;stage++){
  const s=fixture(stage);run(s,{observe(state){state.boss.patternCooldown=0;assert.equal(state.boss.attacks,1);assert(!state.hazards.some(h=>h.kind==='domain'));}});
  assert.equal(s.boss.attacks,1);assert.equal(s.projectiles.length,0);assert.equal(s.hazards.length,0);
 }
});

test('ultimate, precise director CUT, stage change and defeat clean up the complete personal sequence',()=>{
 for(let stage=0;stage<4;stage++){
  const ultimate=fixture(stage);ultimate.player.hype=100;step(ultimate,{ultimate:true});assert.equal(ultimate.personality,null);assert.equal(ultimate.boss.personalityMotion,null);assert.equal(ultimate.hazards.length,0);assert.equal(ultimate.projectiles.length,0);
  const cut=fixture(stage);while(cut.boss.telegraph.remaining>.25)step(cut,walk(cut,getPersonalityGuide(cut).target));cut.player.x=cut.boss.x-60;cut.player.y=cut.boss.y;step(cut,{skill:true});assert.equal(cut.personality,null);assert.equal(cut.boss.telegraph,null);assert.equal(cut.player.timingGrade,'CUT!');
  const fresh=fixture(stage);startStage(fresh,BOSSES.findIndex(b=>b.id===ids[stage]),{retry:true});assert.equal(fresh.personality,null);assert.equal(fresh.hazards.length,0);assert.equal(fresh.projectiles.length,0);
  const dead=fixture(stage);dead.boss.hp=0;step(dead);assert.equal(dead.personality,null);assert.equal(dead.projectiles.length,0);assert.equal(dead.hazards.length,0);
 }
});

test('charge commitment pins the warned origin under ordinary recoil while still taking Q damage',()=>{
 for(const stage of [1,3]){
  const s=fixture(stage);while(!s.personality.shots[0].locked)step(s,walk(s,getPersonalityGuide(s).target));const q=s.personality.shots[0],origin={...q.origin},hp=s.boss.hp;
  s.player.x=origin.x-65;s.player.y=origin.y;s.player.facing=1;step(s,{attack:true});assert(s.boss.hp<hp);assert.deepEqual({x:s.boss.x,y:s.boss.y},origin);assert.deepEqual(q.origin,origin);
 }
});

test('guide reads actual remaining aftercut time and never mutates gameplay state',()=>{
 const s=fixture(3);let checked=0;run(s,{observe(state){const before=JSON.stringify(state),g=getPersonalityGuide(state);assert.equal(JSON.stringify(state),before);assert.deepEqual(getPatternGuide(state),g);const shot=g.shots.find(q=>q.phase==='active'&&q.dashElapsed>=q.dashDuration),h=shot&&g.hazards.find(h=>h.id===shot.followupId);if(h&&g.index===shot.index){assert.equal(g.remaining,h.active?h.life:h.remaining);checked++;}}});assert(checked>0);
});

test('same inputs keep all four new skills deterministic including trajectories and sound event IDs',()=>{
 for(let stage=0;stage<4;stage++){const a=fixture(stage),b=fixture(stage);for(let f=0;f<400&&a.personality;f++){const input=walk(a,getPersonalityGuide(a)?.target);step(a,input);step(b,input);assert.deepEqual(a,b);}}
});


test('personal damage retains its real source kind for a precise result-screen dodge tip',()=>{
 for(let stage=0;stage<4;stage++){const s=fixture(stage);run(s,{policy:'still'});assert(s.lastDamage.hazard?.personalityPattern);assert([['red-cap'],['casting-chase'],['seat-reservation'],['moving-dash','moving-aftercut']][stage].includes(s.lastDamage.hazard.kind));}
});

test('seat guide uses active hazard state on the exact activation frame',()=>{
 const s=fixture(2);let checked=0;run(s,{observe(state){const guide=getPersonalityGuide(state);for(const h of state.hazards.filter(h=>h.active&&h.kind==='seat-reservation')){const shot=guide.shots.find(q=>q.hazardId===h.id);assert.equal(shot.phase,'active');if(guide.index===shot.index){assert.equal(guide.timerLabel,'자리 봉쇄');assert.equal(guide.remaining,h.life);assert.equal(guide.duration,h.totalLife);}checked++;}}});assert(checked>0);
});

test('cancelling a charge at an arena edge preserves a smooth return instead of snapping into the old boss box',()=>{
 for(const stage of [1,3]){const s=fixture(stage);while(s.personality.shots[0].phase!=='active')step(s);const q=s.personality.shots[0];q.path[1]={x:76,y:340};q.dashDuration=q.dashElapsed+.0001;s.player.x=1204;s.player.y=624;step(s);assert.equal(s.boss.x,76);assert.equal(s.boss.y,340);s.player.hype=100;step(s,{ultimate:true});assert.equal(s.personality,null);assert.equal(s.boss.personalReturn,true);s.cinematic=null;s.pendingUltimate=false;s.player.attackSequence=null;s.hitStop=0;const origin={x:s.boss.x,y:s.boss.y};step(s);assert(Math.hypot(s.boss.x-origin.x,s.boss.y-origin.y)<20);}
});

test('an actual fatal personal hit and a late ultimate remove every pending shot and cannot relaunch afterward',()=>{
 for(let stage=0;stage<4;stage++){
  const fatal=fixture(stage);fatal.player.hp=1;run(fatal,{policy:'still'});assert.equal(fatal.status,'gameover');assert.equal(fatal.stats.personalityHits[ids[stage]],1);assert(fatal.effects.some(e=>e.type==='personalityShot'&&e.kind==='hit'));assert.equal(fatal.personality,null);assert.equal(fatal.hazards.length,0);assert.equal(fatal.projectiles.length,0);const launches=fatal.stats.personalityShots[ids[stage]],time=fatal.time;for(let i=0;i<120;i++)step(fatal);assert.equal(fatal.time,time);assert.equal(fatal.stats.personalityShots[ids[stage]],launches);
  const late=fixture(stage);while(late.personality.shots[0].phase!=='active')step(late,walk(late,getPersonalityGuide(late).target));late.player.hype=100;step(late,{ultimate:true});assert.equal(late.personality,null);assert.equal(late.hazards.length,0);assert.equal(late.projectiles.length,0);assert.equal(late.boss.personalityMotion,null);
 }
});


function finalPhase({hp=.45,completed=1,count=1,index=2,counter=0}={}){
 const s=createGame({mode:'challenge'});startStage(s,BOSSES.findIndex(b=>b.id==='sukuna'),{retry:true});s.cinematic=null;Object.assign(s.boss,{hp:s.boss.maxHp*hp,takeoverCount:count,takeoversCompleted:completed,patternIndex:index,patternCooldown:0,counterRemaining:counter});return s;
}

test('Moving keeps the scheduled attack at low HP without an artificial takeover gate',()=>{const s=finalPhase(),turn=s.boss.patternIndex;step(s);assert.equal(s.boss.telegraph.index,rankedPatternAt('sukuna',turn));assert.equal(s.boss.patternIndex,turn+1);assert.equal(s.boss.takeoverCount,1);});
test('earned counter and live attack geometry still block a new final cast',()=>{const s=finalPhase({counter:1.8});for(let i=0;i<108;i++){step(s);assert.equal(s.boss.telegraph,null);}while(!s.boss.telegraph)step(s);assert.equal(s.boss.telegraph.index,8);const blocked=finalPhase();blocked.hazards.push({id:999,type:'circle',kind:'ordinary-test',blocksBoss:true,x:100,y:350,radius:5,radiusY:5,active:true,life:1,damage:1});step(blocked);assert.equal(blocked.boss.telegraph,null);});
test('scheduled second takeover is blade walls and consumes exactly one normal turn',()=>{const s=finalPhase({index:patternTurnFor('sukuna',3,{occurrence:1})}),turn=s.boss.patternIndex;step(s);assert.equal(s.hazards[0].domainType,'blade-waves');assert.equal(s.boss.takeoverCount,2);assert.equal(s.boss.patternIndex,turn+1);});
