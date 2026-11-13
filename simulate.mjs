import {createGame,step,startStage,BOSSES,DIFFICULTIES,isInsideHazard,getDomainGuide,getPatternGuide,getTakeoverView,patternTurnFor,getPersonalityGuide} from './engine.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// These are deterministic input bots, NOT a probabilistic damage calculator.
// Every attack, collider, cooldown, energy refill and invulnerability frame is
// resolved by the same fixed-step engine used by the browser game.
const sourceHashes=()=>Object.fromEntries(['engine.js','max-patterns.js'].map(name=>[name,createHash('sha256').update(readFileSync(new URL('./'+name,import.meta.url))).digest('hex')]));
const loadedSourceSha256=sourceHashes(),loadedEngineSha256=loadedSourceSha256['engine.js'];
const arg=process.argv.find(x=>x.startsWith('--seeds='));
const seeds=arg?Number(arg.split('=')[1]):100;
const booth=process.argv.includes('--booth');
const challenge=process.argv.includes('--challenge');
export const profiles={
  beginner:{reaction:.53,slip:.21,dodgeChance:.65,skillChance:.8,precisionChance:.08,ultimate:true},
  regular:{reaction:.29,slip:.08,dodgeChance:.92,skillChance:.97,precisionChance:.45,ultimate:true},
  expert:{reaction:.14,slip:.015,dodgeChance:.99,skillChance:1,precisionChance:.95,ultimate:true},
};
function rng(seed){let r=seed>>>0;return()=>{r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296;};}
const originalBossIds=['ignis','mime','gojo','sukuna'];
const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const bound=(v,a,b)=>Math.max(a,Math.min(b,v));
export function makeController(profile,loadout,seed){
  const random=rng(seed^0xc0ffee);let wait=0,command={},ignore=0,lastDomainPhase='',phaseReaction=0,pursuitMotorTarget=null,pursuitMotorLanes=null,auditionId=null,auditionChoice=null;const projectileSeen=new Map(),personalCueSeen=new Map(),maxCueSeen=new Map();
  return (s,dt)=>{
    if(s.cinematic){wait=0;command={};pursuitMotorTarget=null;pursuitMotorLanes=null;return {};}
    wait-=dt;if(wait>0){const held={...command,skill:false,buff:false,ultimate:false,dodge:false,attackPressed:false};
      // Reaction/geometry decisions stay at10Hz. Between decisions, release a held
      // direction at the already-known target instead of overshooting it for100ms.
      if(pursuitMotorLanes&&!pursuitMotorLanes.some(l=>isInsideHazard(s.player.x,s.player.y,l,8))){held.left=held.right=held.up=held.down=false;}
      if(pursuitMotorTarget){const p=s.player,t=pursuitMotorTarget;if(held.left&&p.x<=t.x+4)held.left=false;if(held.right&&p.x>=t.x-4)held.right=false;if(held.up&&p.y<=t.y+4)held.up=false;if(held.down&&p.y>=t.y-4)held.down=false;}
      return held;}wait=.1;
    const p=s.player,b=s.boss,character=loadout.startsWith('actor')?'actor':'director';
    // Only currently visible projectiles are observed; a profile still needs its
    // normal reaction delay. Future spawns and hidden aim points are not read.
    for(const q of s.projectiles)if(q.owner==='enemy'&&!projectileSeen.has(q.id))projectileSeen.set(q.id,s.time);
    const observedProjectiles=s.projectiles.filter(q=>q.owner==='enemy'&&s.time-projectileSeen.get(q.id)>=profile.reaction);
    const projectileRisk=(point)=>observedProjectiles.reduce((risk,q)=>{
      const rx=(q.radius||9)+24,ry=(q.radiusY||6)+20,dx=(point.x-q.x)/rx,dy=(point.y-q.y)/ry,vx=q.vx/rx,vy=q.vy/ry;
      const t=bound((dx*vx+dy*vy)/(vx*vx+vy*vy||1),0,.48);
      return risk+(Math.hypot(dx-vx*t,dy-vy*t)<1?5:0);
    },0);
    let target=s.enemies.length?s.enemies.reduce((a,e)=>dist(e,p)<dist(a,p)?e:a):b;
    const ordinary=getPatternGuide(s),personal=getPersonalityGuide(s),camera=s.maxPattern?ordinary:null,audition=s.audition&&!s.audition.selected?s.audition:null,rehearsal=ordinary?.kind==='rehearsal';
    if(audition){if(auditionId!==audition.id){auditionId=audition.id;const chooseReal=random()>=profile.slip*.25;auditionChoice=audition.figures.find(f=>f.real===chooseReal);}target=auditionChoice;}else{auditionId=null;auditionChoice=null;}
    let dest={x:bound(target.x+(p.x>target.x?1:-1)*68,80,1200),y:target.y};
    const conceptVisible=s.hazards.some(h=>h.conceptPattern&&!h.decoy&&(h.active||h.duration-h.remaining>=profile.reaction));
    if(rehearsal||conceptVisible&&ordinary?.target&&['follow-spot','mask-route','projectile-cue'].includes(ordinary.kind))dest=ordinary.target;
    // Each personality shot/charge supplies its own visible lock cue. A later
    // cue never resets an already observed shot's reaction clock.
    const personalKey=personal?`${s.personality?.attackId}:${personal.index||1}`:null;
    if(personalKey&&personal.phase!=='waiting'&&(personal.locked||!personal.tracking)&&!personalCueSeen.has(personalKey))personalCueSeen.set(personalKey,s.time);
    const personalNoticed=personalKey&&personalCueSeen.has(personalKey)&&s.time-personalCueSeen.get(personalKey)>=profile.reaction;
    if(personal){dest=personalNoticed&&personal.target?personal.target:{x:p.x,y:p.y};}
    // Max's fixed aim and return warnings are separate visible decisions. Never
    // read a not-yet-shown target, and charge a reaction delay for each new cue.
    if(camera)for(const shot of camera.shots||[]){const key=`${shot.id}:${['return-warning','returning'].includes(shot.phase)?'return':'out'}`;if(!['tracking','waiting','done'].includes(shot.phase)&&!maxCueSeen.has(key))maxCueSeen.set(key,s.time);}
    const cameraKey=camera?.cueId;
    if(cameraKey&&camera.phase!=='waiting'&&(camera.locked||!camera.tracking)&&!maxCueSeen.has(cameraKey))maxCueSeen.set(cameraKey,s.time);
    const cameraNoticed=cameraKey&&maxCueSeen.has(cameraKey)&&s.time-maxCueSeen.get(cameraKey)>=profile.reaction;
    if(camera)dest=cameraNoticed&&camera.target?camera.target:{x:p.x,y:p.y};

    // React to signs only after the chosen controller delay, occasionally miss one.
    if(!s.hazards.some(h=>h.kind==='domain'&&h.active)&&random()<profile.slip*.16)ignore=.45;ignore=Math.max(0,ignore-.1);
    const threats=ignore>0?[]:s.hazards.filter(h=>!h.decoy&&h.kind!=='flowers'&&h.kind!=='rehearsal-light'&&(h.active||h.duration-h.remaining>=profile.reaction));
    const dangerAt=(point)=>threats.reduce((sum,h)=>sum+(isInsideHazard(point.x,point.y,h,18)?h.active?5:2.5:0),projectileRisk(point));
    const dangerNow=dangerAt(p);
    const safe=threats.find(h=>h.kind==='domain');
    if(safe){const guide=getDomainGuide(s,safe),phaseKey=safe.domainType==='memory-archive'?`${guide.cueId}:${guide.locked??false}`:safe.id+':'+safe.domainPhase+':'+(guide.continuous?guide.navigationPhase:safe.phaseWarning+':'+(safe.bladeCheckpoint||0)+':'+(safe.pursuitState||''));if(lastDomainPhase&&lastDomainPhase!==phaseKey&&safe.active&&(guide.continuous||safe.phaseWarning||safe.domainType==='memory-archive'&&guide.locked||safe.domainType==='blade-waves'&&safe.domainPhase===4&&safe.bladeCheckpoint===1))phaseReaction=profile.reaction;lastDomainPhase=phaseKey;if(phaseReaction>0){phaseReaction-=.1;return {...command,attack:false,skill:false,buff:false,ultimate:false,dodge:false,attackPressed:false};}dest=guide.kind==='memory-archive'&&guide.archivePhase==='final'&&guide.tracking?{x:p.x,y:p.y}:guide.target;}else{lastDomainPhase='';phaseReaction=0;}
    if(!safe&&(dangerNow||dangerAt(dest))){
      const candidates=[dest,{x:p.x,y:p.y}];
      for(const r of [70,135,210,290])for(let n=0;n<16;n++){const a=n*Math.PI/8;candidates.push({x:bound(p.x+Math.cos(a)*r,80,1200),y:bound(p.y+Math.sin(a)*r*.72,342,622)});}
      let best=Infinity;for(const q of candidates){const score=dangerAt(q)*10000+dist(q,p)+dist(q,target)*.15;if(score<best){best=score;dest=q;}}
    }
    pursuitMotorTarget=['chasing-slashes','memory-archive'].includes(safe?.domainType)||camera?{...dest}:null;
    pursuitMotorLanes=safe?.domainType==='chasing-slashes'&&safe.section!=='burst'&&safe.pursuitState!=='tracking'?safe.previewRegions.map(r=>({...r})):null;
    let dx=dest.x-p.x,dy=dest.y-p.y;
    const incoming=observedProjectiles.find(q=>{const dx=p.x-q.x,dy=p.y-q.y;return dist(q,p)<220&&dx*q.vx+dy*q.vy>0&&projectileRisk(p)>0;});
    const imminent=threats.some(h=>isInsideHazard(p.x,p.y,h,10)&&(h.active||h.remaining<.23));
    const moveTolerance=12;
    command={left:dx<-moveTolerance,right:dx>moveTolerance,up:dy<-10,down:dy>10,attack:!safe&&!rehearsal&&(!personal||dist(p,dest)<18)&&(!camera||cameraNoticed&&dist(p,dest)<18)&&(!audition||audition.active&&dist(p,target)<100),
      skill:!safe&&!rehearsal&&!audition&&p.cooldowns.skill===0&&dist(p,target)<(character==='director'?320:600)&&random()<profile.skillChance&&(character!=='director'||!b.telegraph||b.telegraph.remaining<.28||profile.reaction>.4),
      buff:p.cooldowns.buff===0&&dist(p,target)<420,
      dodge:(imminent||!!incoming)&&p.cooldowns.dodge===0&&random()<profile.dodgeChance,
      attackPressed:!safe&&p.attackCooldown>0&&p.attackCooldown<=.135&&!p.precisionAttempted&&random()<profile.precisionChance,
      ultimate:!rehearsal&&!audition&&profile.ultimate&&p.hype>=100&&p.cooldowns.ultimate===0&&b.active&&!safe,
    };
    // Facing follows movement. Stop facing away when stationary in attack range.
    if(!safe&&Math.abs(dx)<moveTolerance&&Math.abs(dy)<10&&Math.abs(target.x-p.x)>5&&Math.sign(target.x-p.x)!==p.facing){command.left=target.x<p.x;command.right=target.x>p.x;}
    return command;
  };
}

export function runFight({seed,stage,difficulty,loadout,profile='regular',maxSeconds=180}){
  const s=createGame({seed,stage,difficulty,character:loadout.startsWith('actor')?'actor':'director'}),control=makeController(profiles[profile],loadout,seed),dt=1/30;
  while(s.status==='playing'&&s.stageTime<maxSeconds)step(s,control(s,dt),dt);
  if(![s.player.hp,s.boss.hp,s.player.x,s.player.y,s.score].every(Number.isFinite))throw new Error(`Non-finite result ${seed}/${stage}/${difficulty}/${loadout}`);
  return {win:s.status==='stageclear'||s.status==='victory',timeout:s.status==='playing',seconds:s.stageTime,hp:s.player.hp,bossHp:s.boss.hp,damage:s.stats.damageTaken,skills:s.stats.skills,ultimates:s.stats.ultimates,dodges:s.stats.dodges,perfectDodges:s.stats.perfectDodges};
}

export function runCampaign({seed,difficulty,loadout,profile='regular'}){
  const s=createGame({seed,difficulty,character:loadout.startsWith('actor')?'actor':'director'}),control=makeController(profiles[profile],loadout,seed),dt=1/30;
  while(s.time<720){
    if(s.status==='stageclear')startStage(s,s.stage+1);
    else if(s.status!=='playing')break;
    step(s,control(s,dt),dt);
  }
  return {win:s.status==='victory',seconds:s.time,hp:s.player.hp,cleared:s.stats.stagesCleared};
}

export function runBooth({seed=1009,duration=90,loadout='director',profile='regular'}){
  const s=createGame({mode:'booth',duration,character:loadout.startsWith('actor')?'actor':'director'}),control=makeController(profiles[profile],loadout,seed),dt=1/60,clears=[];
  let lastClear=0,lastStageClock=0;
  while(s.status==='playing'&&s.runTime<duration+.1){step(s,control(s,dt),dt);if(s.stats.stagesCleared>lastClear){clears.push({boss:s.boss.id,round:s.round,seconds:+(s.runTime-lastStageClock).toFixed(2)});lastStageClock=s.runTime;lastClear=s.stats.stagesCleared;}}
  if(s.runTime>duration+1e-6)throw new Error('Booth exceeded its active-time ceiling');
  if(![s.score,s.player.hp,s.runTime,s.boss.hp].every(Number.isFinite))throw new Error('Non-finite booth result');
  return {status:s.status,endReason:s.endReason,seconds:s.runTime,score:s.score,cleared:s.stats.stagesCleared,hp:s.player.hp,damage:s.stats.damageTaken,justHits:s.stats.justHits,justDodges:s.stats.justDodges,finishers:s.stats.finishers,maxCombo:s.maxCombo,clears};
}

export function runPurpleReaction({character='director',difficulty='standard',phase=1,reaction=.1}={}){
  const s=createGame({stage:BOSSES.findIndex(b=>b.id==='gojo'),character,difficulty,skipIntro:true}),dt=1/60;s.player.x=520;s.player.y=500;s.boss.x=950;s.boss.y=480;s.boss.phase=phase;s.boss.patternIndex=2;s.boss.patternCooldown=0;step(s,{},dt);
  const h=s.hazards.find(h=>h.kind==='purple');while(h.tracking)step(s,{},dt);
  const warningAtLock=h.remaining;let elapsed=0;
  while(h.life>0&&s.status==='playing'){step(s,{up:elapsed>=reaction},dt);elapsed+=dt;}
  return {character,difficulty,phase,reactionSeconds:reaction,warningAtLock:+warningAtLock.toFixed(4),escaped:s.stats.damageTaken===0,damageTaken:s.stats.damageTaken};
}

export function runOpeningReaction({boss='ignis',pattern=0,character='director',reaction=.35,move=true}={}){
  const s=createGame({stage:BOSSES.findIndex(b=>b.id===boss),character,skipIntro:true}),dt=1/60;
  s.player.x=520;s.player.y=500;s.player.invuln=0;s.boss.x=950;s.boss.y=480;s.boss.patternIndex=pattern;s.boss.patternCooldown=0;step(s,{},dt);
  let elapsed=0;while(s.hazards.length&&elapsed<5&&s.status==='playing'){step(s,{up:move&&elapsed>=reaction},dt);elapsed+=dt;}
  return {boss,pattern,character,reactionSeconds:reaction,move,damageTaken:s.stats.damageTaken,escaped:s.stats.damageTaken===0};
}

export function runTakeoverRoute({boss='ignis',character='director',x=520,y=500,stationary=false}={}){
  const s=createGame({stage:BOSSES.findIndex(b=>b.id===boss),character,skipIntro:true}),dt=1/60;
  s.player.x=x;s.player.y=y;s.player.cooldowns.dodge=99;s.boss.patternIndex=3;s.boss.patternCooldown=0;step(s,{},dt);
  const h=s.hazards[0],warnings=new Map();while(s.cinematic)step(s,{},dt);
  if(stationary){const g=getDomainGuide(s,h);s.player.x=g.target.x;s.player.y=g.target.y;}
  for(let n=0;n<2400&&s.hazards.length&&s.status==='playing';n++){
    const g=getDomainGuide(s,h),dx=g.target.x-s.player.x,dy=g.target.y-s.player.y;
    if(h.phaseWarning)warnings.set(h.domainPhase,h.phaseDuration);
    step(s,stationary?{}:{left:dx<-4,right:dx>4,up:dy<-4,down:dy>4},dt);
  }
  return {boss,character,start:{x,y},stationary,survived:s.status==='playing'&&s.hazards.length===0,hp:s.player.hp,endReason:s.endReason,dodges:s.stats.dodges,initialWarning:h.duration,transitionWarnings:[...warnings].map(([phase,seconds])=>({phase,seconds:+seconds.toFixed(3)})),seconds:+s.runTime.toFixed(2)};
}

export function runBladeRoute({character='director',variant=0,mirror=false,x=640,y=480,bossX=1000,bossY=480,reaction=.35,policy='follow'}={}){
  const s=createGame({stage:BOSSES.findIndex(b=>b.id==='sukuna'),character,skipIntro:true}),dt=1/60;
  Object.assign(s.player,{x,y});s.player.cooldowns.dodge=99;Object.assign(s.boss,{x:bossX,y:bossY,attacks:variant===0?2:variant-1,phase:mirror?2:1,patternIndex:3,patternCooldown:0});step(s);
  let key='',wait=0;const warnings=new Map();
  for(let f=0;f<2400&&s.status==='playing'&&s.hazards.length;f++){
    const h=s.hazards[0],g=getDomainGuide(s,h),k=h.domainPhase+':'+h.phaseWarning+':'+h.bladeCheckpoint;
    if(k!==key){if(!key||h.phaseWarning||h.domainPhase===4&&h.bladeCheckpoint===1)wait=reaction;key=k;}
    if(h.phaseWarning)warnings.set(h.domainPhase,h.phaseDuration);
    let input={};if(!s.cinematic){wait-=dt;if(wait<=0){const dx=g.target.x-s.player.x,dy=g.target.y-s.player.y;input=policy==='follow'?{left:dx<-4,right:dx>4,up:dy<-4,down:dy>4}:policy==='still'?{}:policy==='circle'?{left:Math.cos(s.time*1.2)<-.2,right:Math.cos(s.time*1.2)>.2,up:Math.sin(s.time*1.2)<-.2,down:Math.sin(s.time*1.2)>.2}:{[policy]:true};}}
    step(s,input,dt);
  }
  return {character,variant,mirror,start:{x,y},bossStart:{x:bossX,y:bossY},reactionSeconds:reaction,policy,survived:s.status==='playing'&&!s.hazards.length,hp:s.player.hp,endReason:s.endReason,dodges:s.stats.dodges,seconds:+s.runTime.toFixed(2),transitionWarnings:[...warnings].map(([phase,seconds])=>({phase,seconds:+seconds.toFixed(3)}))};
}

export function runPursuitRoute({character='director',phase=1,x=640,y=482,bossX=1000,bossY=480,reaction=.35,policy='follow',dodgeAssist=false}={}){
  const s=createGame({stage:BOSSES.findIndex(b=>b.id==='sukuna'),character,skipIntro:true}),dt=1/60;
  Object.assign(s.player,{x,y});s.player.cooldowns.dodge=dodgeAssist?0:99;Object.assign(s.boss,{x:bossX,y:bossY,phase,takeoverCount:1,patternIndex:3,patternCooldown:0});step(s);
  let key='',wait=0,dashBeat=-1;const phases=new Set(),launches=new Map();let maxConcurrentBlades=0;
  for(let f=0;f<1800&&s.status==='playing'&&s.hazards.length;f++){
    const h=s.hazards[0],g=getDomainGuide(s,h),k=h.domainPhase+':'+(g.continuous?g.navigationPhase:h.pursuitState);
    if(k!==key){if(g.continuous||h.pursuitState!=='flight')wait=reaction;key=k;}
    let input={};if(!s.cinematic){wait-=dt;if(wait<=0){const dx=g.target.x-s.player.x,dy=g.target.y-s.player.y;input=policy==='follow'||policy==='once'&&h.domainPhase===0?{left:dx<-4,right:dx>4,up:dy<-4,down:dy>4}:policy==='still'||policy==='once'?{}:policy==='circle'?{left:Math.cos(s.time*1.2)<-.2,right:Math.cos(s.time*1.2)>.2,up:Math.sin(s.time*1.2)<-.2,down:Math.sin(s.time*1.2)>.2}:policy.includes('-')?Object.fromEntries(policy.split('-').map(k=>[k,true])):{[policy]:true};}}
    if(!s.cinematic&&dodgeAssist&&wait<=0&&h.pursuitState!=='tracking'&&dashBeat!==h.domainPhase&&s.player.cooldowns.dodge<=0&&(input.left||input.right||input.up||input.down)){input.dodge=true;dashBeat=h.domainPhase;}
    if(h.active)phases.add(h.domainPhase+':'+h.pursuitState);step(s,input,dt);maxConcurrentBlades=Math.max(maxConcurrentBlades,h.dangerRegions.length);for(const e of s.effects)if(e.type==='pursuitSlash'&&e.kind==='launch')launches.set(e.slashId,{phase:e.phase,shot:e.shotIndex,section:e.section,time:+e.actualFireTime.toFixed(6),scheduled:+(e.scheduledFireTime??e.actualFireTime).toFixed(6)});
  }
  return {character,phase,start:{x,y},bossStart:{x:bossX,y:bossY},reactionSeconds:reaction,policy,dodgeAssist,survived:s.status==='playing'&&!s.hazards.length,hp:s.player.hp,endReason:s.endReason,dodges:s.stats.dodges,phases:[...phases],maxConcurrentBlades,launches:[...launches.values()],seconds:+s.runTime.toFixed(2)};
}

function finishEntrance(s){while(s.cinematic)step(s,{},1/60);}
function rankedFixture({stage,character='director',x=640,y=482,phase=1,takeoverCount=0,turn=1}){
  const s=createGame({mode:'challenge',character});startStage(s,stage,{retry:true,entrance:true});finishEntrance(s);
  Object.assign(s.player,{x,y});Object.assign(s.boss,{phase,takeoverCount,patternIndex:turn,patternCooldown:0});
  step(s,{},1/60);return s;
}

// This is a fresh single-boss ranked setup, not the legacy story runner. No HP,
// damage, cooldown, projectile or invulnerability value is changed in this run.
export function runRankedDuel({seed=1009,stage=0,loadout='director',profile='regular',safetyLimitSeconds=180}={}){
  const s=createGame({mode:'challenge',character:loadout});startStage(s,stage,{retry:true,entrance:true});
  const control=makeController(profiles[profile],loadout,seed),dt=1/60;
  while(s.status==='playing'&&!s.stats.stagesCleared&&s.runTime<safetyLimitSeconds)step(s,control(s,dt),dt);
  return {boss:BOSSES[stage].id,character:loadout,profile,win:s.stats.stagesCleared===1,safetyStopped:s.status==='playing'&&!s.stats.stagesCleared,seconds:+s.runTime.toFixed(2),damageTaken:s.stats.damageTaken,hp:s.player.hp,endReason:s.endReason,patternCasts:{...s.stats.patternCasts},variantCasts:{...s.stats.takeoverVariantCasts}};
}

export function runVariantRoute({boss='ignis',character='director',phase=1,takeoverCount=0,x=640,y=482,reaction=.35,policy='follow'}={}){
  const stage=BOSSES.findIndex(b=>b.id===boss),s=rankedFixture({stage,character,x,y,phase,takeoverCount,turn:patternTurnFor(boss,3)}),dt=1/60;
  const h=s.hazards.find(h=>h.kind==='domain');if(!h)throw new Error('Ranked domain fixture did not cast '+boss);
  let previousKey='',wait=0;const phases=new Set();
  for(let f=0;f<3600&&s.status==='playing'&&s.hazards.includes(h);f++){
    const g=getDomainGuide(s,h),key=h.active+':'+h.domainPhase+':'+(h.phaseWarning||false)+':'+(g.navigationPhase??'');
    if(key!==previousKey){wait=reaction;previousKey=key;}let input={};
    if(!s.cinematic){wait-=dt;if(wait<=0){const dx=g.target.x-s.player.x,dy=g.target.y-s.player.y;input=policy==='follow'?{left:dx<-4,right:dx>4,up:dy<-4,down:dy>4}:policy==='still'?{}:policy==='circle'?{left:Math.cos(s.time)<-.2,right:Math.cos(s.time)>.2,up:Math.sin(s.time)<-.2,down:Math.sin(s.time)>.2}:{[policy]:true};}}
    if(h.active)phases.add(h.domainPhase);step(s,input,dt);
  }
  return {boss,character,phase,takeoverCount,variantId:h.variantId,variantName:h.variantName,start:{x,y},reactionSeconds:reaction,policy,survived:s.status==='playing'&&!s.hazards.includes(h),hp:s.player.hp,endReason:s.endReason,dodges:s.stats.dodges,phases:[...phases],seconds:+s.runTime.toFixed(2)};
}

export function runNewNormal({boss='ignis',character='director',phase=1,x=640,y=482,reaction=.35,policy='follow'}={}){
  const stage=BOSSES.findIndex(b=>b.id===boss),s=rankedFixture({stage,character,x,y,phase,turn:patternTurnFor(boss,5)}),dt=1/60;
  if(s.boss.telegraph?.index!==5)throw new Error('Ranked new-pattern fixture did not cast index5 '+boss);
  const attackId=s.boss.telegraph.attackId,seen=new Set(),lockedSeen=new Map();let walkTarget={x,y};
  let frames=0;for(;frames<1200&&s.status==='playing';frames++){
    // React to each actual fixed warning independently; a rapid new warning
    // must not restart the reaction clock for a previously observed shot.
    for(const h of s.hazards)if(h.conceptPattern&&!h.decoy&&(h.locked||h.active)&&!lockedSeen.has(h.id))lockedSeen.set(h.id,s.time);
    const noticed=s.hazards.filter(h=>lockedSeen.has(h.id)&&s.time-lockedSeen.get(h.id)>=reaction),p=s.player;
    if(noticed.length){
      const candidates=[{x:p.x,y:p.y}];for(const r of [50,80,120,180,260])for(let a=0;a<32;a++){const angle=a*Math.PI/16;candidates.push({x:bound(p.x+Math.cos(angle)*r,76,1204),y:bound(p.y+Math.sin(angle)*r*.72,340,624)});}
      // warningOnly has no beam damage in the engine. This copy measures only
      // its visible fixed preview geometry; it never mutates the live collider.
      const safe=candidates.filter(q=>!noticed.some(h=>isInsideHazard(q.x,q.y,{...h,warningOnly:false},25)));
      safe.sort((a,b)=>dist(a,p)-dist(b,p));if(safe.length)walkTarget=safe[0];
    }
    const input=policy==='follow'?{left:walkTarget.x-p.x<-3,right:walkTarget.x-p.x>3,up:walkTarget.y-p.y<-3,down:walkTarget.y-p.y>3}:policy==='still'?{}:policy==='circle'?{left:Math.cos(s.time)<-.2,right:Math.cos(s.time)>.2,up:Math.sin(s.time)<-.2,down:Math.sin(s.time)>.2}:{[policy]:true};
    step(s,input,dt);for(const q of s.projectiles)if(q.owner==='enemy')seen.add(q.id);
    if(!s.hazards.some(h=>h.attackId===attackId)&&!s.projectiles.some(q=>q.owner==='enemy')&&s.boss.telegraph?.attackId!==attackId)break;
  }
  return {boss,character,phase,start:{x,y},reactionSeconds:reaction,policy,completed:frames<1200,escaped:s.stats.damageTaken===0,damageTaken:s.stats.damageTaken,hp:s.player.hp,dodges:s.stats.dodges,observedProjectileIds:seen.size,seconds:+s.runTime.toFixed(2)};
}

function conceptLedger(){return {seen:new Set(),damage:0,byBoss:Object.fromEntries(BOSSES.map(b=>[b.id,{launches:0,projectilesLaunched:0,hits:0,damage:0}]))};}
function recordConceptEvents(s,ledger){
  for(const e of s.effects){if(e.type!=='bossShot'||ledger.seen.has(e.id))continue;ledger.seen.add(e.id);const row=ledger.byBoss[e.bossId];if(!row)continue;if(e.kind==='launch'){row.launches++;if(e.projectileId!=null)row.projectilesLaunched++;}else if(e.kind==='hit'){row.hits++;row.damage+=e.damage||0;}}
  if(s.stats.damageTaken>ledger.damage&&s.lastDamage?.hazard?.conceptPattern){const row=ledger.byBoss[s.lastDamage.hazard.patternBossId];row.hits++;row.damage+=s.stats.damageTaken-ledger.damage;}
  ledger.damage=s.stats.damageTaken;
}

export function runChallenge({seed=1009,loadout='director',profile='regular',safetyLimitSeconds=300}={}){
  const s=createGame({mode:'challenge',character:loadout}),control=makeController(profiles[profile],loadout,seed),dt=1/60,clears=[];
  let lastClear=0,lastStageClock=0,firstUltimateAt=null;const pursuitLaunches=new Map(),concept=conceptLedger();
  // This guard protects the offline test runner; the game has no timeout branch.
  while(s.status==='playing'&&s.runTime<safetyLimitSeconds){step(s,control(s,dt),dt);recordConceptEvents(s,concept);for(const e of s.effects)if(e.type==='pursuitSlash'&&e.kind==='launch')pursuitLaunches.set(e.slashId,{phase:e.phase,shot:e.shotIndex,section:e.section,time:+e.actualFireTime.toFixed(6),scheduled:+(e.scheduledFireTime??e.actualFireTime).toFixed(6)});if(firstUltimateAt===null&&s.stats.ultimates>0)firstUltimateAt=+s.runTime.toFixed(2);if(s.stats.stagesCleared>lastClear){clears.push({boss:s.boss.id,seconds:+(s.runTime-lastStageClock).toFixed(2)});lastStageClock=s.runTime;lastClear=s.stats.stagesCleared;}}
  if(s.duration!==0||s.timeLeft!==null||s.endReason==='timeout')throw new Error('Challenge must never have a game time limit');
  if(![s.score,s.player.hp,s.runTime,s.boss.hp].every(Number.isFinite))throw new Error('Non-finite challenge result');
  return {maxPatternCasts:{...s.stats.maxPatternCasts},maxShots:s.stats.maxShots||0,maxReturns:s.stats.maxReturns||0,personalityCasts:{...s.stats.personalityCasts},personalityShots:{...s.stats.personalityShots},personalityHits:{...s.stats.personalityHits},personalityCompletions:{...s.stats.personalityCompletions},personalityAvoided:{...s.stats.personalityAvoided},conceptEffects:concept.byBoss,pursuitLaunches:[...pursuitLaunches.values()],win:s.status==='victory',status:s.status,endReason:s.endReason,deathTakeover:s.domainDeath?.domainType||null,deathVariant:s.domainDeath?.hazard?.variantId||null,takeoverVariantCasts:{...s.stats.takeoverVariantCasts},takeoverVariantActivations:{...s.stats.takeoverVariantActivations},takeoverVariantSurvived:{...s.stats.takeoverVariantSurvived},takeoverCasts:{...s.stats.takeoverCasts},takeoverActivations:{...s.stats.takeoverActivations},takeoverSurvived:{...s.stats.takeoverSurvived},safetyStopped:s.status==='playing',seconds:s.runTime,score:s.score,firstUltimateAt,patternCasts:{...s.stats.patternCasts},extraActivations:{...s.stats.extraActivations},extraCompletions:{...s.stats.extraCompletions},extraSuccesses:{...s.stats.extraSuccesses},counterWindows:s.stats.counterWindows,counterDamage:s.stats.counterDamage,rehearsals:s.stats.rehearsals,auditionSuccesses:s.stats.auditionSuccesses,auditionMistakes:s.stats.auditionMistakes,ultimates:s.stats.ultimates,adlibs:s.stats.adlibs,methodFinishers:s.stats.methodFinishers,cueDetonations:s.stats.cueDetonations,crewBursts:s.stats.crewBursts,cleared:s.stats.stagesCleared,hp:s.player.hp,damage:s.stats.damageTaken,justHits:s.stats.justHits,justDodges:s.stats.justDodges,finishers:s.stats.finishers,maxCombo:s.maxCombo,clears};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const start=performance.now(),rows=[],loadouts=['director','actor'];
  if(challenge){
    const allResults=[],bossTimes=Object.fromEntries(BOSSES.map(b=>[b.id,[]]));
    for(const profile of Object.keys(profiles))for(const loadout of loadouts){
      const results=[];for(let n=0;n<seeds;n++){const r=runChallenge({seed:1009+n*7919,loadout,profile});results.push(r);allResults.push(r);for(const clear of r.clears)bossTimes[clear.boss].push(clear.seconds);}
      const mean=key=>+(results.reduce((sum,r)=>sum+r[key],0)/results.length).toFixed(2),wins=results.filter(r=>r.win),times=wins.map(r=>r.seconds).sort((a,b)=>a-b),scores=results.map(r=>r.score).sort((a,b)=>a-b);
      rows.push({profile,loadout,runs:results.length,winRate:wins.length/results.length,domainDeathRate:results.filter(r=>r.endReason==='domain').length/results.length,ordinaryDefeatRate:results.filter(r=>r.endReason==='defeat').length/results.length,safetyStopped:results.filter(r=>r.safetyStopped).length,averageClears:mean('cleared'),reachRates:Object.fromEntries(BOSSES.map((b,i)=>[b.id,results.filter(r=>r.cleared>=i).length/results.length])),clearRates:Object.fromEntries(BOSSES.map((b,i)=>[b.id,results.filter(r=>r.cleared>i).length/results.length])),medianScore:scores[Math.floor(scores.length/2)],medianVictorySeconds:times.length?+times[Math.floor(times.length/2)].toFixed(2):null,averageDamageTaken:mean('damage'),averageJustHits:mean('justHits'),averageJustDodges:mean('justDodges'),averageFinishers:mean('finishers'),averageCounterWindows:mean('counterWindows'),averageCounterDamage:mean('counterDamage'),averageRehearsals:mean('rehearsals'),averageAuditionSuccesses:mean('auditionSuccesses'),averageAuditionMistakes:mean('auditionMistakes'),averageUltimates:mean('ultimates'),averageAdlibs:mean('adlibs'),averageMethodFinishers:mean('methodFinishers'),averageCueDetonations:mean('cueDetonations'),averageCrewBursts:mean('crewBursts'),medianFirstUltimateSeconds:(()=>{const ts=results.map(r=>r.firstUltimateAt).filter(x=>x!==null).sort((a,b)=>a-b);return ts.length?ts[Math.floor(ts.length/2)]:null})()});
    }
    const purpleReactionChecks=[];for(const character of loadouts)for(const difficulty of Object.keys(DIFFICULTIES))for(const phase of [1,2])for(const reaction of [.1,.2,.35])purpleReactionChecks.push(runPurpleReaction({character,difficulty,phase,reaction}));
    const openingReactionChecks=[];for(const boss of ['ignis','mime'])for(const pattern of [0,1,2])for(const character of loadouts)for(const move of [false,true])openingReactionChecks.push(runOpeningReaction({boss,pattern,character,move}));
    const takeoverRouteChecks=[];for(const boss of originalBossIds)for(const character of loadouts)for(const [x,y] of [[520,500],[76,340],[76,624],[1204,340],[1204,624]])takeoverRouteChecks.push(runTakeoverRoute({boss,character,x,y}));
    const stationaryTakeoverChecks=[];for(const boss of originalBossIds)for(const character of loadouts)stationaryTakeoverChecks.push(runTakeoverRoute({boss,character,stationary:true}));
    const bladeReactionChecks=[];for(const character of loadouts)for(const variant of [0,1,2])for(const mirror of [false,true])for(const [x,y] of [[76,340],[76,624],[1204,340],[1204,624],[640,480]])for(const [bossX,bossY] of [[155,375],[640,480],[1125,585]])bladeReactionChecks.push(runBladeRoute({character,variant,mirror,x,y,bossX,bossY,reaction:.35}));
    const bladeSimpleMotionChecks=[];for(const variant of [0,1,2])for(const mirror of [false,true])for(const policy of ['still','left','right','up','down','circle'])for(const [x,y] of [[76,340],[76,624],[1204,340],[1204,624],[640,480]])bladeSimpleMotionChecks.push(runBladeRoute({variant,mirror,policy,x,y,reaction:0}));
    const pursuitReactionChecks=[],pursuitLateReactionChecks=[],pursuitDodgeAssistChecks=[];for(const character of loadouts)for(const phase of [1,2])for(const x of [76,640,1204])for(const y of [340,482,624])for(const [bossX,bossY] of [[155,375],[640,480],[1125,585]]){pursuitReactionChecks.push(runPursuitRoute({character,phase,x,y,bossX,bossY,reaction:.35}));pursuitLateReactionChecks.push(runPursuitRoute({character,phase,x,y,bossX,bossY,reaction:.65}));pursuitDodgeAssistChecks.push(runPursuitRoute({character,phase,x,y,bossX,bossY,reaction:.65,dodgeAssist:true}));}
    const pursuitSimpleMotionChecks=[];for(const phase of [1,2])for(const x of [76,640,1204])for(const y of [340,482,624])for(const policy of ['still','left','right','up','down','up-left','up-right','down-left','down-right','circle'])pursuitSimpleMotionChecks.push(runPursuitRoute({phase,x,y,policy,reaction:0}));
    const pursuitSingleEscapeChecks=[];for(const phase of [1,2])for(const x of [76,640,1204])for(const y of [340,482,624])pursuitSingleEscapeChecks.push(runPursuitRoute({phase,x,y,policy:'once'}));
    const takeoverTypes=['moving-light','mask-panels','lens-corridors','memory-archive','blade-waves','chasing-slashes'],takeoverExposure=Object.fromEntries(takeoverTypes.map(type=>[type,{casts:allResults.reduce((n,r)=>n+(r.takeoverCasts[type]||0),0),activations:allResults.reduce((n,r)=>n+(r.takeoverActivations[type]||0),0),completed:allResults.reduce((n,r)=>n+(r.takeoverSurvived[type]||0),0),runsWithActivation:allResults.filter(r=>(r.takeoverActivations[type]||0)>0).length,fatalContacts:allResults.filter(r=>r.deathTakeover===type).length}]));
    const extraPatternExposure=Object.fromEntries(BOSSES.map(b=>[b.id,{name:b.patterns[4],casts:allResults.reduce((n,r)=>n+(r.patternCasts[b.id+':4']||0),0),activations:allResults.reduce((n,r)=>n+(r.extraActivations[b.id]||0),0),completions:allResults.reduce((n,r)=>n+(r.extraCompletions[b.id]||0),0),successes:allResults.reduce((n,r)=>n+(r.extraSuccesses[b.id]||0),0)}]));
    const variantRouteChecks=[],variantSimpleMotionChecks=[],newNormalChecks=[];
    for(const boss of ['ignis','mime','gojo'])for(const character of loadouts)for(const phase of [1,2])for(const takeoverCount of [0,1])for(const x of [76,640,1204])for(const y of [340,482,624])variantRouteChecks.push(runVariantRoute({boss,character,phase,takeoverCount,x,y}));
    for(const boss of ['ignis','mime','gojo'])for(const character of loadouts)for(const phase of [1,2])for(const takeoverCount of [0,1])for(const [x,y] of [[76,340],[640,482],[1204,624]])for(const policy of ['still','left','right'])variantSimpleMotionChecks.push(runVariantRoute({boss,character,phase,takeoverCount,x,y,policy,reaction:0}));
    for(const boss of originalBossIds)for(const character of loadouts)for(const phase of [1,2])for(const [x,y] of [[76,340],[76,624],[640,482],[1204,340],[1204,624]])for(const policy of ['follow','still','up'])newNormalChecks.push(runNewNormal({boss,character,phase,x,y,policy}));
    const rankedDuelChecks=[];for(const profile of Object.keys(profiles))for(const loadout of loadouts)for(let stage=0;stage<BOSSES.length;stage++){const samples=[];for(let n=0;n<Math.min(seeds,30);n++)samples.push(runRankedDuel({profile,loadout,stage,seed:1009+n*7919}));rankedDuelChecks.push({profile,character:loadout,boss:BOSSES[stage].id,runs:samples.length,wins:samples.filter(r=>r.win).length,averageDamageTaken:+(samples.reduce((n,r)=>n+r.damageTaken,0)/samples.length).toFixed(2),safetyStopped:samples.filter(r=>r.safetyStopped).length,medianCompletedSeconds:(()=>{const ts=samples.filter(r=>r.win).map(r=>r.seconds).sort((a,b)=>a-b);return ts.length?ts[Math.floor(ts.length/2)]:null})()});}
    const variantIds=['straight-light','return-light','single-swap','double-swap','normal-frames','reverse-frames','memory-archive','blade-waves','chasing-slashes'];
    const takeoverVariantExposure=Object.fromEntries(variantIds.map(id=>[id,{casts:allResults.reduce((n,r)=>n+(r.takeoverVariantCasts[id]||0),0),activations:allResults.reduce((n,r)=>n+(r.takeoverVariantActivations[id]||0),0),completed:allResults.reduce((n,r)=>n+(r.takeoverVariantSurvived[id]||0),0),runsWithActivation:allResults.filter(r=>(r.takeoverVariantActivations[id]||0)>0).length,fatalContacts:allResults.filter(r=>r.deathVariant===id).length}]));
    const sixthPatternExposure=Object.fromEntries(BOSSES.map(b=>[b.id,{name:b.patterns[5],casts:allResults.reduce((n,r)=>n+(r.patternCasts[b.id+':5']||0),0),runsWithCast:allResults.filter(r=>(r.patternCasts[b.id+':5']||0)>0).length,...Object.fromEntries(['launches','projectilesLaunched','hits','damage'].map(k=>[k,allResults.reduce((n,r)=>n+(r.conceptEffects[b.id][k]||0),0)]))}]));
    const personalityExposure=Object.fromEntries(BOSSES.map(b=>[b.id,{name:b.name,skill:b.patterns[6],...Object.fromEntries(['Casts','Shots','Hits','Completions','Avoided'].map(key=>[key.toLowerCase(),allResults.reduce((n,r)=>n+(r['personality'+key]?.[b.id]||0),0)]))}]));
    const wins=allResults.filter(r=>r.win),times=wins.map(r=>r.seconds).sort((a,b)=>a-b);
    const completeBursts=allResults.flatMap(r=>[0,1].map(phase=>r.pursuitLaunches.filter(q=>q.section==='burst'&&q.phase===phase)).filter(q=>q.length===7)),firingIntervals=completeBursts.flatMap(shots=>shots.slice(1).map((q,i)=>q.time-shots[i].time)),pursuitFiringValidation={completeBursts:completeBursts.length,intervalCount:firingIntervals.length,minIntervalSeconds:firingIntervals.length?+Math.min(...firingIntervals).toFixed(6):null,maxIntervalSeconds:firingIntervals.length?+Math.max(...firingIntervals).toFixed(6):null,allIntervalsWithinOneMicrosecondOfPointTwo:firingIntervals.length>0&&firingIntervals.every(x=>Math.abs(x-.2)<1e-6),maxActualVsScheduledErrorSeconds:completeBursts.length?+Math.max(...completeBursts.flat().map(q=>Math.abs(q.time-q.scheduled))).toFixed(6):null,maxConcurrentBodies:Math.max(...pursuitReactionChecks.map(q=>q.maxConcurrentBlades))};
    const report={generatedAt:new Date().toISOString(),engineVersion:createGame({mode:'challenge'}).version,engineSha256:loadedEngineSha256,sourceSha256:loadedSourceSha256,mode:'challenge',duration:0,gameTimeLimit:null,endsAfterBosses:BOSSES.length,bossOrder:BOSSES.map(b=>b.id),fixedEngineSeed:424242,fixedDifficulty:'standard',fixedCharacters:loadouts,controllerSeeds:seeds,totalRuns:allResults.length,simulationSafetyLimitSeconds:300,safetyStoppedRuns:allResults.filter(r=>r.safetyStopped).length,stepSeconds:1/60,elapsedSeconds:+((performance.now()-start)/1000).toFixed(2),victories:wins.length,medianVictorySeconds:times.length?+times[Math.floor(times.length/2)].toFixed(2):null,completedBossMedianSeconds:Object.fromEntries(Object.entries(bossTimes).map(([id,t])=>{t.sort((a,b)=>a-b);return[id,t.length?t[Math.floor(t.length/2)]:null]})),domainRule:'The full initial warning follows the frozen cinematic. Burst navigation asks for continuous travel and one signalled reversal, with a brief visible hold while an earlier body passes; being outside one preview does not finish a burst. The final three-way attack accepts either safe side and holds there until all bodies pass. Every individual shot has a matching visible line, locks .60 seconds before launch and never retargets. Preview lines and cleared trails never damage. Every actual body contact is fatal despite HP, E guard, dodge or R protection; R cinematics pause but cannot erase active takeovers.',bladeReactionChecks,bladeSimpleMotionChecks,bladeReactionMethod:'180 actual-step walks: both characters, three layouts and their mirrors, five player starts and three boss starts; .35-second input reaction after initial/relocation cues and the final diagonal turn. No dash, buff, attack, teleport, HP edit or invulnerability. 180 additional still/one-direction/circle policies test whether simple camping solves the sequence. The full challenge bots separately use .53/.29/.14-second reaction policies and ten-Hz decisions.',pursuitReactionChecks,pursuitLateReactionChecks,pursuitDodgeAssistChecks,pursuitSimpleMotionChecks,pursuitSingleEscapeChecks,takeoverExposure,extraPatternExposure,pursuitFiringValidation,pursuitFiringSamples:allResults.filter(r=>r.pursuitLaunches.length===17).slice(0,6).map(r=>r.pursuitLaunches),pursuitReactionMethod:'108 actual walks cover both fixed characters, both boss phases, nine arena starts and three boss positions. They delay .35 seconds on initial preparation, outbound, reversal, crossing and final tracking/lock cues. Repeated with .65 seconds, with and without a real Space dash once per phase.180 stationary/eight-fixed-direction/circle controls and18 first-burst-only controls test simple policies. Full challenges use their original .53/.29/.14 reaction policies at10Hz, including navigation changes; motors release at already observed targets at60Hz, never erase collision or damage. Burst movement is not stopped merely because one old preview has been escaped. Each isolated result includes all actual launch times; complete full-run samples are included separately. No teleport, HP edit or invulnerability override in these traversals. Medians include3/3.2/3.4/3.6/3.8-second entry cinematics, during which combat/cooldowns freeze.',scoreRule:'Actual HP damage × combo multiplier + 60 per landed JUST attack + 150 per JUST dodge. No overkill or clear bonus. Combo +0.25 per 8 hits (max 2.5), FEVER adds 0.5 (max 3).',takeoverRouteChecks,stationaryTakeoverChecks,takeoverRouteMethod:'40 actual-step walks from center and four corners across both characters; dodge cooldown stays unavailable. Eight additional tests start at the initial guide and remain still. No attack, HP override, invulnerability or teleport during traversal.',openingReactionChecks,openingReactionMethod:'Each new normal attack from a fixed open-arena position: stand still versus walk upward after 0.35 seconds, both fixed characters. No dodge or skill, no HP or damage override; initial spawn invulnerability is explicitly removed for this collider test.',purpleReactionChecks,purpleReactionMethod:'Separate single-Purple open-arena scenarios: walk upward after the stated delay from the lock cue. No dodge or skills. These measure timing at one position, not human success rates.',limitations:['Input controllers know visible hazard geometry, numbered light goals and the marked real silhouette; their win rates are not human win rates. The audition policy has a profile-dependent chance of choosing the visibly wrong figure.','Controllers use visible geometry and stop attacking during takeovers. New relocation warnings, the final diagonal turn, and pursuit tracking/lock transitions incur their profile reaction delay; initial warnings also require elapsed reaction time. These are geometry-aware policies, not calibrated human skill levels.','Profile differences are policies, not a calibrated human skill ordering; a middle policy can fare worse than a slower policy in some character matchups.','Victory and boss timing medians include completed fights only.','The 300-second simulation guard is a test safety measure; there is no time limit in the game.','Historical booth-balance-report.json measures the superseded timed mode and is not validation of this untimed challenge.'],profiles,rows};
    Object.assign(report,{
      method:'Actual v19 untimed five-boss challenge, fixed standard difficulty and engine seed424242. Both fixed characters use real QWER, movement, collision and cooldowns at60Hz; +65HP after nonfinal bosses, victory after the fifth. No HP/damage override, projectile deletion, teleport or game timeout. The offline300s safety guard is reported separately.',
      difficultyRevision:'Max joins between If and Moving as a camera/film audition examiner. The original four bosses retain their HP, attack values, QWER interactions and seven-pattern rotations. Seven pattern options retain every previous skill. Five-cast rotations retain the original takeover slots and cadence. Only the opening slot cycles personality attack6, previous concept attack5 and original attack0; all seven skills appear within11 scheduled casts. After Moving completes his first takeover and its earned counter window, HP at or below45percent prioritizes the second takeover at the next clear attack boundary, retaining the next normal skill and all warning geometry. Pino throws three staggered red-capped bottles and Daegil pursues with two committed charges, unchanged mechanically. If reserves five recent positions and fires five frame shots; Moving chains five alternating dashes with delayed trail cuts. Max uses two/three camera flashes, seven staggered photos, six returning photos in two groups, and one/three moving frames; every lock/return warning remains visible. Existing takeovers remain intact. PlayerHP260 and postcast recovery factor0.90 remain unchanged from v18; all existing boss HP, heal65, player QWER, damage and warning timings are unchanged. Max uses5200 rankedHP and41 base damage.',
      bossDisplayOrder:BOSSES.map(b=>b.name),maxExposure:{castsByPattern:Object.fromEntries([0,1,2,3,4,5,6].map(i=>[i,allResults.reduce((n,r)=>n+(r.patternCasts['max:'+i]||0),0)])),shots:allResults.reduce((n,r)=>n+r.maxShots,0),returns:allResults.reduce((n,r)=>n+r.maxReturns,0)},personalityExposure,variantRouteChecks,variantSimpleMotionChecks,newNormalChecks,rankedDuelChecks,takeoverVariantExposure,sixthPatternExposure,
      variantRouteMethod:'216 real walks: three bosses × both characters × both phases × two cast parities × nine arena starts. React .35s after each publicly visible phase cue; walk only, no dash, buff, attack, HP edit or teleport during traversal.216 still/fixed-direction controls use the same fixtures. The phase/parity matrix deliberately checks both selection paths for each variant.',
      newNormalMethod:'240 actual index5 casts: four bosses × two characters × two phases × center/four corners × geometry-aware walking/still/up-only policies. The isolated walker waits .35s after each individual fixed warning, then walks outside the already-visible fixed preview geometry. Rapid subsequent warnings have independent reaction clocks. It does not approach the boss, attack, dodge, buff, edit HP or delete projectiles; no future spawn/hidden aim data is read. This strict cue-response fixture is separate from the attacking campaign controller.',
      difficultyOrderMethod:'Independent ranked-equivalent duels start each boss at the same fresh player resources under the same controller policies. Their damage and clear rates are reported separately from campaign reach/conditional clear rates, so early deaths do not hide later-boss exposure. Clear-time alone is not a difficulty ranking.',
      controllerRevision:'Retains .53/.29/.14 profile delays, ten-Hz decisions and60Hz release at already-observed targets. Projected risk from visible current projectiles remains reaction-delayed. Public personality escape targets are read only after an individual fixed-cue delay; Q is released while moving to that target. These geometry-aware input policies are not calibrated human skill levels, and paired before/after engine runs use this identical updated controller separately.',
      baselineComparison:{revision:'18.0.0',commit:'a53cdbf78e13ef75768192c90579e1da036d2b37',method:'Separate paired runs use the same current input controller against both engines. See the v19 verification record for results; do not compare unlike controllers or interpret bot win rates as human skill.'},
    });
    for(const row of report.rows)row.conditionalClearRates=Object.fromEntries(BOSSES.map(b=>[b.id,row.reachRates[b.id]?+(row.clearRates[b.id]/row.reachRates[b.id]).toFixed(4):null]));
    if(JSON.stringify(sourceHashes())!==JSON.stringify(loadedSourceSha256))throw new Error('Engine source changed during simulation; rerun after implementation settles.');
    writeFileSync(new URL('./challenge-balance-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exit(0);
  }
  if(booth){
    let runs=0;const bossTimes=Object.fromEntries(BOSSES.map(b=>[b.id,[]])),cycleTimes=[];
    for(const duration of [60,90,120])for(const profile of Object.keys(profiles))for(const loadout of loadouts){
      const results=[];for(let n=0;n<seeds;n++){const r=runBooth({seed:1009+n*7919,duration,loadout,profile});results.push(r);for(const clear of r.clears)if(clear.round<BOSSES.length)bossTimes[clear.boss].push(clear.seconds);if(r.cleared>=BOSSES.length)cycleTimes.push(r.clears.slice(0,BOSSES.length).reduce((sum,c)=>sum+c.seconds,0));}runs+=results.length;
      const avg=key=>+(results.reduce((sum,r)=>sum+r[key],0)/results.length).toFixed(2),sorted=results.map(r=>r.score).sort((a,b)=>a-b);
      rows.push({duration,profile,loadout,runs:results.length,timeoutRate:results.filter(r=>r.endReason==='timeout').length/results.length,domainDeathRate:results.filter(r=>r.endReason==='domain').length/results.length,firstCycleClearRate:results.filter(r=>r.cleared>=BOSSES.length).length/results.length,averageClears:avg('cleared'),medianScore:sorted[Math.floor(sorted.length/2)],averageJustHits:avg('justHits'),averageJustDodges:avg('justDodges'),averageFinishers:avg('finishers'),averageDamageTaken:avg('damage'),maximumRunTime:Math.max(...results.map(r=>r.seconds))});
    }
    cycleTimes.sort((a,b)=>a-b);
    const purpleReactionChecks=[];for(const character of loadouts)for(const difficulty of Object.keys(DIFFICULTIES))for(const phase of [1,2])for(const reaction of [.1,.2,.35])purpleReactionChecks.push(runPurpleReaction({character,difficulty,phase,reaction}));
    const report={generatedAt:new Date().toISOString(),engineVersion:createGame({mode:'challenge'}).version,engineSha256:loadedEngineSha256,sourceSha256:loadedSourceSha256,mode:'booth',fixedCharacters:loadouts,purpleReactionChecks,purpleReactionMethod:'Separate deterministic single-Purple scenarios at a fixed open-arena position. Walk upward after the listed reaction delay from the visible lock cue; no dodge, skills, HP edits or damage overrides. These isolate timing and are not human pass rates.',movementRule:'V6 boss locomotion is preserved: Gojo maintains distance, Sukuna approaches closer, both change flanks between attack pairs at 72 units per second.',difficultyRevision:'V7 changes Purple to early tracking with a final 0.5-second fixed lane, 1.25-second base warning and 106/118 width. Postcast rest is 10 percent shorter. HP, damage, player cooldowns, all other hitboxes and warnings, domain safety, locomotion and scoring are unchanged.',cinematicRule:'Only domain cinematics freeze combat and discard input; booth runTime continues and the full hazard warning follows. Purple, flame and player R never cut away; R damage is immediate.',bossOrder:BOSSES.map(b=>b.id),domainRule:'Active domain contact outside its safe ellipse is fatal regardless of HP, invulnerability, dodge or guard. Only pre-cast interruption/ultimate can cancel it.',fixedEngineSeed:424242,fixedDifficulty:'standard',controllerSeeds:seeds,totalRuns:runs,stepSeconds:1/60,elapsedSeconds:+((performance.now()-start)/1000).toFixed(2),method:'Actual step engine, with 60/90/120-second ceilings. The engine seed is identical for every ranked run; controller reaction choices vary. Includes directional four-hit recoil and landing, hit stop, domain-only freezes, automatic scene transitions, independent W/E cooldowns, R hype limits and no HP overrides.',scoreRule:'Actual HP damage × combo multiplier + 60 per landed JUST attack + 150 per JUST dodge. No overkill damage or boss kill bonus. Combo: +0.25 per 8 hits (max 2.5); 16 hits starts 5s FEVER (+0.5 multiplier, max 3).',limitations:['Controllers know hazard geometry; these are not human win rates.','Controller policies approximate slower or faster reactions but do not reproduce human motor skill.','Boss and cycle time medians include only completed kills/cycles; deaths are separately reported.','Historical balance-report.json predates this combat revision and is intentionally unchanged.'],completedFirstCycleMedianSeconds:cycleTimes.length?+cycleTimes[Math.floor(cycleTimes.length/2)].toFixed(2):null,firstCycleMedianSeconds:Object.fromEntries(Object.entries(bossTimes).map(([id,times])=>{times.sort((a,b)=>a-b);return[id,times.length?times[Math.floor(times.length/2)]:null]})),profiles,rows};
    writeFileSync(new URL('./booth-balance-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exit(0);
  }
  let total=0;
  const selectedProfile=process.argv.find(x=>x.startsWith('--profile='))?.split('=')[1];
  for(const profile of selectedProfile?[selectedProfile]:Object.keys(profiles))for(const difficulty of Object.keys(DIFFICULTIES))for(const loadout of loadouts)for(let stage=0;stage<BOSSES.length;stage++){
    const results=[];for(let n=0;n<seeds;n++)results.push(runFight({seed:1009+n*7919,stage,difficulty,loadout,profile}));total+=results.length;
    const wins=results.filter(r=>r.win),sort=wins.map(r=>r.seconds).sort((a,b)=>a-b),average=(key)=>results.reduce((sum,r)=>sum+r[key],0)/results.length;
    rows.push({profile,difficulty,loadout,boss:BOSSES[stage].id,fights:results.length,winRate:+(wins.length/results.length).toFixed(3),medianWinSeconds:sort.length?+sort[Math.floor(sort.length/2)].toFixed(1):null,avgRemainingHp:+average('hp').toFixed(1),avgDamageTaken:+average('damage').toFixed(1),avgSkills:+average('skills').toFixed(1),avgUltimates:+average('ultimates').toFixed(1),timeouts:results.filter(r=>r.timeout).length});
  }
  const campaigns=[];let totalCampaigns=0;
  for(const profile of selectedProfile?[selectedProfile]:Object.keys(profiles))for(const difficulty of Object.keys(DIFFICULTIES))for(const loadout of loadouts){
    const results=[];for(let n=0;n<Math.min(seeds,20);n++)results.push(runCampaign({seed:1009+n*7919,difficulty,loadout,profile}));totalCampaigns+=results.length;
    const wins=results.filter(r=>r.win),times=wins.map(r=>r.seconds).sort((a,b)=>a-b);
    campaigns.push({profile,difficulty,loadout,runs:results.length,winRate:+(wins.length/results.length).toFixed(3),medianWinSeconds:times.length?+times[Math.floor(times.length/2)].toFixed(1):null,averageStagesCleared:+(results.reduce((a,r)=>a+r.cleared,0)/results.length).toFixed(2)});
  }
  const report={generatedAt:new Date().toISOString(),engineVersion:createGame({mode:'challenge'}).version,engineSha256:loadedEngineSha256,sourceSha256:loadedSourceSha256,totalFights:total,totalCampaigns,seedsPerCombination:seeds,stepSeconds:1/30,maxFightSeconds:180,elapsedSeconds:+((performance.now()-start)/1000).toFixed(2),method:'Seeded input controllers call the actual engine.step at 30 Hz. Each independent fight starts at full HP with two introductory extras. Campaigns keep HP and use only the in-game +100 HP stage recovery. No immunity, damage overrides, direct boss HP edits or skipped simulation events.',limitations:['Bots are input policies with access to hazard geometry, not evidence of human clear rates.','Individual fight rows start at full HP; separate campaign rows measure carry-over damage and recovery.','Repeated seeded fights can produce similar outcomes because boss attack order is mostly deterministic.','Rendering, input ergonomics and perceived difficulty require human playtesting.'],profiles,rows,campaigns};
  writeFileSync(new URL('./balance-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({totalFights:total,totalCampaigns,elapsedSeconds:report.elapsedSeconds,rows,campaigns},null,2));
}
