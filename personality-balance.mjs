/** Deterministic walking-only checks for the four personality skills.
 * Fixtures select one real cast at normal resources; every subsequent position,
 * warning, projectile, collision and damage value is advanced by engine.step.
 */
import * as Engine from './engine.js';
import {writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const loadedEngineSha256=createHash('sha256').update(readFileSync(new URL('./engine.js',import.meta.url))).digest('hex');
const {createGame,startStage,step,BOSSES,patternTurnFor}=Engine;
const bound=(v,a,b)=>Math.max(a,Math.min(b,v));
const walk=(p,t)=>t?{left:t.x<p.x-3,right:t.x>p.x+3,up:t.y<p.y-3,down:t.y>p.y+3}:{};
const round=n=>+n.toFixed(5);
export function runPersonalityRoute({boss='ignis',character='director',x=640,y=482,bossX=900,bossY=480,phase=1,reaction=.35,hz=60,policy='follow',trace=false}={}){
 const stage=BOSSES.findIndex(b=>b.id===boss),s=createGame({mode:'challenge',character});startStage(s,stage,{retry:true,entrance:true});
 const dt=1/hz;while(s.cinematic)step(s,{},dt);
 // Initial placements and a single selected cast are fixture setup, not bot movement.
 Object.assign(s.player,{x,y});Object.assign(s.boss,{x:bossX,y:bossY,phase,patternIndex:patternTurnFor(boss,6),patternCooldown:0});
 step(s,{},dt);const attackId=s.boss.telegraph?.attackId||s.personality?.attackId;
 if(!attackId||!s.personality)throw new Error(`No personality cast ${boss}`);
 const startHP=s.player.hp,clock=s.time,seenLocks=new Map(),events=new Map(),samples=[];
 let target={x,y},maxStep=0,frames=0,last={x,y},maxHazards=0;
 for(;frames<hz*25&&s.status==='playing';frames++){
  const guide=Engine.getPersonalityGuide(s),cast=s.personality;
  if(!cast&&s.boss.telegraph?.attackId!==attackId&&!s.hazards.some(h=>h.attackId===attackId)&&!s.projectiles.some(q=>q.attackId===attackId))break;
  if(guide){
   const key=`${attackId}:${guide.index||1}`;
   if(guide.phase!=='waiting'&&(guide.locked||!guide.tracking)&&!seenLocks.has(key))seenLocks.set(key,s.time);
   if(seenLocks.has(key)&&s.time-seenLocks.get(key)>=reaction&&guide.target)target={...guide.target};
  }
  const p=s.player,input=policy==='follow'?walk(p,target):policy==='still'?{}:policy==='circle'?{left:Math.cos((s.time-clock)*1.4)<-.2,right:Math.cos((s.time-clock)*1.4)>.2,up:Math.sin((s.time-clock)*1.4)<-.2,down:Math.sin((s.time-clock)*1.4)>.2}:Object.fromEntries(policy.split('-').map(direction=>[direction,true]));
  step(s,input,dt);
  maxStep=Math.max(maxStep,Math.hypot(p.x-last.x,p.y-last.y));last={x:p.x,y:p.y};maxHazards=Math.max(maxHazards,s.hazards.filter(h=>h.attackId===attackId).length);
  for(const e of s.effects)if(e.type==='personalityShot'&&!events.has(e.id))events.set(e.id,{id:e.id,kind:e.kind,index:e.index,time:round(s.time-clock),attackId:e.attackId});
  if(trace&&frames%Math.max(1,Math.round(hz/10))===0)samples.push({time:round(s.time-clock),p:{x:round(p.x),y:round(p.y),hp:p.hp},boss:{x:round(s.boss.x),y:round(s.boss.y)},guide:guide?{kind:guide.kind,index:guide.index,tracking:guide.tracking,locked:guide.locked,remaining:guide.remaining,target:guide.target}:null,personality:cast?{phase:cast.phase,index:cast.index,remaining:cast.remaining}:null,input});
  if(p.hp>p.maxHp||![p.x,p.y,p.hp].every(Number.isFinite))throw new Error('Invalid live engine state');
 }
 return {boss,character,phase,start:{x,y},bossStart:{x:bossX,y:bossY},reactionSeconds:reaction,hz,policy,completed:frames<hz*25,survived:s.player.hp>0,escaped:s.stats.damageTaken===0,damageTaken:s.stats.damageTaken,startHP,hp:s.player.hp,seconds:round(s.time-clock),maxStep:round(maxStep),maxHazards,dodges:s.stats.dodges,skills:s.stats.skills,ultimates:s.stats.ultimates,events:[...events.values()],...(trace?{samples}:{} )};
}
export function summarizePersonalityRoutes(runs){return Object.fromEntries(BOSSES.map(b=>{const rows=runs.filter(r=>r.boss===b.id);return[b.id,{name:b.name,skill:b.patterns[6],cases:rows.length,completed:rows.filter(r=>r.completed).length,survived:rows.filter(r=>r.survived).length,clean:rows.filter(r=>r.escaped).length,averageDamage:rows.length?round(rows.reduce((n,r)=>n+r.damageTaken,0)/rows.length):0,maxDamage:rows.length?Math.max(...rows.map(r=>r.damageTaken)):0}]}));}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const smoke=process.argv.includes('--smoke'),runs=[];
 for(const boss of BOSSES.map(b=>b.id))for(const character of ['director','actor'])for(const hz of [30,60])for(const phase of smoke?[1]:[1,2])for(const reaction of smoke?[.35]:[.25,.35])for(const [x,y] of smoke?[[640,482]]:[[76,340],[76,624],[640,482],[1204,340],[1204,624]])for(const [bossX,bossY] of smoke?[[900,480]]:[[180,380],[900,480],[1100,580]])for(const policy of ['follow','still'])runs.push(runPersonalityRoute({boss,character,hz,phase,reaction,x,y,bossX,bossY,policy}));
 const report={generatedAt:new Date().toISOString(),engineSha256:loadedEngineSha256,method:'One selected ordinary cast under ranked-equivalent standard resources. Initial player/boss placement is setup only. After spawning, the controller uses real directional inputs only; no attacks, E/R/Space, HP edits, teleports, cooldown edits or hazard/projectile deletion. It waits the listed reaction after each individual lock/visible fixed-warning cue before using the public escape target. Source geometry and actual hits are resolved at 30/60Hz.',limitations:['These are geometry-aware input policies, not measured human success rates.','The individual cast fixture does not evaluate multi-boss resource attrition; full challenge runs do that separately.'],follow:summarizePersonalityRoutes(runs.filter(r=>r.policy==='follow')),stationary:summarizePersonalityRoutes(runs.filter(r=>r.policy==='still')),runs};
 if(createHash('sha256').update(readFileSync(new URL('./engine.js',import.meta.url))).digest('hex')!==loadedEngineSha256)throw new Error('Engine source changed during route checks; rerun after implementation settles.');
 writeFileSync(new URL(smoke?'./personality-balance-smoke.json':'./personality-balance-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,runs:report.runs.length},null,2));
}
