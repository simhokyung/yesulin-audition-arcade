/** Real engine fixtures for Max. Only the initial opponent, cast and positions
 * are selected; every subsequent step uses normal movement and resources. */
import * as Engine from './engine.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const sourceHashes=()=>Object.fromEntries(['engine.js','max-patterns.js'].map(name=>[name,createHash('sha256').update(readFileSync(new URL('./'+name,import.meta.url))).digest('hex')]));
const loadedSourceSha256=sourceHashes(),loadedEngineSha256=loadedSourceSha256['engine.js'];
const walk=(p,t)=>t?{left:t.x<p.x-3,right:t.x>p.x+3,up:t.y<p.y-3,down:t.y>p.y+3}:{};
const round=n=>+n.toFixed(5);
export function runMaxRoute({pattern=0,character='director',phase=1,takeoverCount=0,x=640,y=482,bossX=900,bossY=480,reaction=.35,hz=60,policy='follow',trace=false}={}){
 const stage=Engine.BOSSES.findIndex(b=>b.id==='max');if(stage<0)throw new Error('Max not installed');
 const s=Engine.createGame({mode:'challenge',character});Engine.startStage(s,stage,{retry:true,entrance:true});const dt=1/hz;while(s.cinematic)Engine.step(s,{},dt);
 Object.assign(s.player,{x,y});Object.assign(s.boss,{x:bossX,y:bossY,phase,takeoverCount,patternIndex:Engine.patternTurnFor('max',pattern),patternCooldown:0});
 Engine.step(s,{},dt);const attackId=s.boss.telegraph?.attackId;
 if(!attackId||s.boss.telegraph.index!==pattern)throw new Error('Selected Max cast not created');
 const clock=s.time,startHP=s.player.hp,seen=new Map(),phases=new Set(),events=new Map(),samples=[];let target={x,y},frames=0,maxStep=0,last={x,y},guideMissing=0;
 for(;frames<hz*40&&s.status==='playing';frames++){
  const ownHazards=s.hazards.filter(h=>h.attackId===attackId),domain=ownHazards.find(h=>h.kind==='domain');
  if(!s.maxPattern&&!ownHazards.length&&!s.projectiles.some(q=>q.attackId===attackId)&&s.boss.telegraph?.attackId!==attackId)break;
  const guide=domain?Engine.getDomainGuide(s,domain):Engine.getMaxPatternGuide(s);
  if(guide){
   // Every visible shot can be read, including a lock before it becomes the
   // highlighted primary cue. Do not charge that reaction a second time.
   if(!domain)for(const shot of guide.shots||[]){const returning=['return-warning','returning'].includes(shot.phase),shotKey=`${shot.id}:${returning?'return':'out'}`;if(!['tracking','waiting','done'].includes(shot.phase)&&!seen.has(shotKey))seen.set(shotKey,s.time);}
   const key=domain?`${guide.cueId||domain.id+':'+domain.domainPhase}:${guide.locked??false}`:guide.cueId;
   phases.add(domain?guide.archivePhase??domain.domainPhase:guide.phase);
   if(key&&guide.phase!=='waiting'&&(domain||guide.locked||!guide.tracking)&&!seen.has(key))seen.set(key,s.time);
   if(!s.cinematic&&seen.has(key)&&s.time-seen.get(key)>=reaction&&guide.target)target={...guide.target};
  }else if(s.maxPattern||domain)guideMissing++;
  const input=s.cinematic?{}:policy==='follow'?walk(s.player,target):policy==='still'?{}:policy==='circle'?{left:Math.cos((s.time-clock)*1.4)<-.2,right:Math.cos((s.time-clock)*1.4)>.2,up:Math.sin((s.time-clock)*1.4)<-.2,down:Math.sin((s.time-clock)*1.4)>.2}:Object.fromEntries(policy.split('-').map(k=>[k,true]));
  Engine.step(s,input,dt);maxStep=Math.max(maxStep,Math.hypot(s.player.x-last.x,s.player.y-last.y));last={x:s.player.x,y:s.player.y};
  for(const e of s.effects)if((e.type==='maxShot'||e.type==='archiveCue')&&!events.has(e.id))events.set(e.id,{type:e.type,kind:e.kind,index:e.index,time:round(s.time-clock)});
  if(trace&&frames%Math.max(1,Math.round(hz/10))===0)samples.push({time:round(s.time-clock),p:{x:round(s.player.x),y:round(s.player.y),hp:s.player.hp},guide:guide?{cueId:guide.cueId,phase:guide.phase,archivePhase:guide.archivePhase,remaining:guide.remaining,tracking:guide.tracking,locked:guide.locked,target:guide.target}:null,input});
  if(![s.player.x,s.player.y,s.player.hp].every(Number.isFinite))throw new Error('Nonfinite Max simulation');
 }
 return {pattern,name:Engine.BOSSES[stage].patterns[pattern],character,phase,takeoverCount,start:{x,y},bossStart:{x:bossX,y:bossY},reactionSeconds:reaction,hz,policy,completed:frames<hz*40,survived:s.player.hp>0,escaped:s.stats.damageTaken===0,damageTaken:s.stats.damageTaken,startHP,hp:s.player.hp,seconds:round(s.time-clock),maxStep:round(maxStep),guideMissing,dodges:s.stats.dodges,skills:s.stats.skills,ultimates:s.stats.ultimates,endReason:s.endReason,phases:[...phases],events:[...events.values()],...(trace?{samples}:{} )};
}
export function summarizeMaxRoutes(runs){return Object.fromEntries([...new Set(runs.map(r=>r.pattern))].map(pattern=>{const rows=runs.filter(r=>r.pattern===pattern);return[pattern,{name:rows[0].name,cases:rows.length,completed:rows.filter(r=>r.completed).length,survived:rows.filter(r=>r.survived).length,clean:rows.filter(r=>r.escaped).length,averageDamage:round(rows.reduce((n,r)=>n+r.damageTaken,0)/rows.length),maxDamage:Math.max(...rows.map(r=>r.damageTaken)),missingGuideFrames:rows.reduce((n,r)=>n+r.guideMissing,0)}]}));}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const smoke=process.argv.includes('--smoke'),runs=[];
 for(const pattern of [0,1,2,3,4,5,6])for(const character of ['director','actor'])for(const hz of smoke?[60]:[30,60])for(const phase of smoke?[1]:[1,2])for(const reaction of smoke?[.35]:[.25,.35])for(const[x,y]of smoke?[[640,482]]:[[76,340],[76,624],[640,482],[1204,340],[1204,624]])for(const[bossX,bossY]of smoke?[[900,480]]:[[180,380],[900,480],[1100,580]])for(const policy of ['follow','still'])runs.push(runMaxRoute({pattern,character,hz,phase,reaction,x,y,bossX,bossY,policy}));
 if(JSON.stringify(sourceHashes())!==JSON.stringify(loadedSourceSha256))throw new Error('Engine changed while Max checks were running');
 const report={generatedAt:new Date().toISOString(),engineSha256:loadedEngineSha256,sourceSha256:loadedSourceSha256,method:'Selected Max cast with normal ranked resources. Initial boss/player placements and phase/rotation are fixture setup only. After cast, only actual directional inputs are used at30/60Hz; no attacks, Space, E/R, HP edits, invulnerability edits, teleports, hazard deletion or cooldown cheats. Each visible fixed aim/return cue or domain phase requires the specified reaction delay before following the public guide.',limitations:['Geometry-aware input policies, not measured human success rates.','Isolated route tests do not measure five-boss resource attrition; full challenge and fresh-resource duels report that separately.'],follow:summarizeMaxRoutes(runs.filter(r=>r.policy==='follow')),stationary:summarizeMaxRoutes(runs.filter(r=>r.policy==='still')),runs};
 writeFileSync(new URL(smoke?'../../work/v19-max-smoke.json':'./max-balance-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,runs:runs.length},null,2));
}
