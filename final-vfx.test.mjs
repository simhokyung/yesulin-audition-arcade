import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,getDomainGuide} from './engine.js';
import {getFinalPatternGuide,finalWallParts} from './final-patterns.js';
import {finalPatternGuide,drawFinalFloor,drawFinalWarnings,drawFinalProjectile,drawFinalPresence,finalPoseState,drawFinalTakeoverFloor,drawFinalTakeoverGuides,finalTakeoverInstruction,drawFinalTakeoverMap} from './final-vfx.js';
import {GameAudio} from './audio.js';
function canvas(){const calls=[],texts=[],state={globalAlpha:1},stack=[];return{calls,texts,c:new Proxy(state,{set(o,k,v){if(typeof v==='number')assert(Number.isFinite(v),`${String(k)} finite`);o[k]=v;return true;},get(o,k){if(k in o)return o[k];if(k==='measureText')return s=>({width:String(s).length*8});if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop(){}});return(...args)=>{args.forEach(a=>{if(typeof a==='number')assert(Number.isFinite(a),`${String(k)} finite`)});calls.push([k,...args]);if(k==='fillText')texts.push(args[0]);if(k==='save')stack.push(o.globalAlpha);if(k==='restore')o.globalAlpha=stack.pop()??1;};}})}}
for(const index of [7,8,9])test(`final ordinary ${index} reads actual geometry, holds locked aim, and emits real audio once`,()=>{
 const s=createGame({stage:4,skipIntro:true});s.boss.patternIndex=index;s.boss.patternCooldown=0;s.player.hp=s.player.maxHp=9999;const audio=new GameAudio(),heard=[],events=new Map(),locked=new Map();audio.cue=(name,meta={})=>heard.push({name,...meta});audio.update(s,1/60);let frames=0,saw=false,walls=0,bodies=0;
 for(let f=0;f<1300;f++){
  step(s,{left:f%240>=120&&s.player.x>180,right:f%240<120&&s.player.x<1100,up:f%160>=80&&s.player.y>355,down:f%160<80&&s.player.y<605});if(s.boss.attacks)s.boss.patternCooldown=999;
  const run=s.finalPattern;saw||=!!run;const before=JSON.stringify(s),g=finalPatternGuide(s),base=getFinalPatternGuide(s);if(g){assert.equal(g.title,base.title);assert.equal(g.remaining,base.remaining);assert.equal(g.total,base.total);assert(g.remaining>=0);frames++;}
  for(const reduced of [false,true]){const v=canvas();drawFinalFloor(v.c,s,s.time,reduced);drawFinalWarnings(v.c,s,s.time,reduced);drawFinalPresence(v.c,s,s.time,reduced,()=>{});for(const q of s.projectiles.filter(q=>q.finalPattern)){assert(drawFinalProjectile(v.c,q,reduced));assert(v.calls.some(c=>c[0]==='ellipse'&&c[1]===q.x&&c[2]===q.y&&c[3]===q.radius&&c[4]===q.radiusY));bodies++;}for(const h of s.hazards.filter(h=>h.type==='final-wall'))for(const r of finalWallParts(h)){assert(v.calls.some(c=>c[0]==='strokeRect'&&c[1]===-r.width/2&&c[2]===-r.height/2&&c[3]===r.width&&c[4]===r.height));walls++;}}
  finalPoseState(s);assert.equal(JSON.stringify(s),before,'VFX leaves actual combat state untouched');for(const q of run?.shots||[])if(q.path&&q.locked){const path=JSON.stringify(q.path);if(locked.has(q.id))assert.equal(path,locked.get(q.id));else locked.set(q.id,path);}
  audio.update(s,1/60);const n=heard.length;audio.update(s,1/60);assert.equal(heard.length,n);for(const e of s.effects)if(e.type==='finalShot'&&e.kind==='launch')events.set(e.id,e);if(saw&&!run)break;
 }
 assert(saw&&!s.finalPattern);assert(frames>50);assert.equal(heard.filter(e=>e.type==='finalShot'&&e.kind==='launch').length,events.size);assert(events.size>0);assert(!heard.some(e=>e.type==='finalShot'&&e.kind==='hit'));if(index===7)assert(walls>0);else assert(bodies>0);audio.destroy();
});

test('last-cut read-only guide and floor show only actual danger plus distinct preview routes',()=>{
 const s=createGame({stage:4,skipIntro:true});s.boss.patternIndex=3;s.boss.patternCooldown=0;let frames=0,locked=false,active=false,warning=false;const audio=new GameAudio(),heard=[],events=new Map();audio.cue=(name,meta={})=>heard.push({name,...meta});audio.update(s,1/60);
 for(let f=0;f<1300&&s.status==='playing';f++){
  const old=s.hazards.find(h=>h.domainType==='last-cut'),g=old?getDomainGuide(s,old):null;
  step(s,g?{left:g.target.x<s.player.x-3,right:g.target.x>s.player.x+3,up:g.target.y<s.player.y-3,down:g.target.y>s.player.y+3}:{});if(s.boss.attacks)s.boss.patternCooldown=999;
  const h=s.hazards.find(h=>h.domainType==='last-cut');if(!h){if(frames)break;continue;}
  const before=JSON.stringify(s),guide=finalTakeoverInstruction(s,h);assert(guide.remaining>=0);assert(Math.abs(guide.progress-Math.max(0,Math.min(1,1-guide.remaining/guide.duration)))<1e-9);const shot=h.pendingShots.find(q=>q.phase==='tracking'||q.locked&&!q.started);if(h.active&&!h.phaseWarning&&shot){const expected=shot.phase==='tracking'?shot.lockAt-h.phaseElapsed:shot.fireAt-h.phaseElapsed;assert(Math.abs(guide.remaining-Math.max(0,expected))<1e-9,'visible countdown measures actual tracking lock or launch deadline');}audio.update(s,1/60);for(const e of s.effects)if(e.type==='finalShot')events.set(e.id,e);assert(Number.isFinite(guide.target.x)&&Number.isFinite(guide.target.y));locked||=guide.locked;active||=h.dangerRegions.length>0;warning||=h.phaseWarning;
  for(const reduced of [false,true]){const v=canvas();drawFinalTakeoverFloor(v.c,s,h,s.time,reduced);drawFinalTakeoverGuides(v.c,s,h,s.time,reduced);drawFinalTakeoverMap(v.c,s,h);assert(v.texts.includes('벽을 피하며 조준 고정 때 방향 전환'));}
  assert.equal(JSON.stringify(s),before);frames++;
 }
 assert(frames>100&&locked&&active&&warning);assert.equal(heard.filter(e=>e.kind==='phase').length,[...events.values()].filter(e=>e.kind==='phase').length);assert.equal(heard.filter(e=>e.kind==='phase').length,3);assert.equal(heard.filter(e=>e.kind==='launch'&&e.type==='finalShot').length,6);audio.destroy();
});
