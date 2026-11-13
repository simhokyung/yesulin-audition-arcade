/**
 * 예술in: deterministic arena combat. All coordinates are 1280×720 canvas units;
 * x/y denote feet. Ground circles use radiusY (default radius * .55).
 * Fixed character: Q attack, W skill, E buff, R ultimate, Space dodge.
 * Visual-only effects: text/slash/ring/burst/beam/spark/transform. Events have id.
 * Story: stageclear -> startStage(next). Booth: automatic rounds; finished at time.
 * runTime counts active real time, including hit stop/domain cuts/transitions.
 * Takeovers, committed R attacks and late-boss entrances have explicit cinematic freezes.
 * Reactions expose hitKind/hitPower/hitReaction, landingTimer/landingPower;
 * landing effects and impact metadata are visual only, never extra score hits.
 * Difficulty and character stats below are the same values used by simulations.
 */

export const CHARACTERS = {
  director: {id:'director',name:'감독',title:'현장을 지배하는 자',color:'#dfff70',hp:280,speed:285,attack:25,attackCooldown:.34,range:125,skillCost:0,skillCooldown:4.8,skillName:'레디, 액션!',roleName:'현장 통제 — 전 스태프 대기!'},
  actor: {id:'actor',name:'배우',title:'장르를 넘나드는 자',color:'#b7acff',hp:280,speed:300,attack:24,attackCooldown:.30,range:125,skillCost:0,skillCooldown:4.8,skillName:'궁수 연기 — 애드리브',roleName:'메소드 몰입'},
};
export const SKILL_KITS = {
  director:{
    q:{name:'슬레이트 난타 — 컷! 컷! 컷!',description:'입력마다 3타. 적중한 한 묶음마다 액션 표식 1칸, 최대 3칸. 네 번째는 강한 마무리. 회복 마지막 0.14초에 다시 누르면 JUST 타격.',cooldown:.34},
    w:{name:'레디, 액션!',description:'메가폰 충격파 후 액션 표식만큼 연쇄 폭발. 예고 마지막 0.30초에 맞추면 공격을 끊습니다.',cooldown:4.8},
    e:{name:'현장 통제 — 전 스태프 대기!',description:'5초간 공격력 +25%, 이동속도 +15%. Q 마무리나 W 적중에 스태프 후속타 1묶음, 일반 피격 1회 보호.',cooldown:12},
    r:{name:'원 테이크 — 전원 액션!',description:'기세 100, 42초 재사용. 1.6초 연출 후 12연타와 대폭발. 이동 가능, Space로 취소.',cooldown:42},
  },
  actor:{
    q:{name:'검사 연기 — 대본 찢기',description:'입력마다 검 3타. 네 번째 강마무리가 적중하면 다음 W의 마지막 화살이 강화됩니다. 회복 마지막 0.14초에 다시 누르면 JUST 타격.',cooldown:.30},
    w:{name:'궁수 연기 — 애드리브',description:'뒤로 짧게 물러나며 화살 5발. 애드리브 준비 시 마지막은 큰 관통 화살. 이동 중 무적은 없습니다.',cooldown:4.8},
    e:{name:'메소드 몰입',description:'5초간 공격력 +20%, 공격속도 +25%, 이동속도 +18%. JUST 회피 성공 시 다음 Q가 강마무리부터 시작합니다(1회).',cooldown:12},
    r:{name:'천의 얼굴 — 커튼콜',description:'기세 100, 42초 재사용. 1.6초 연출 후 검·화살 12연타와 커튼콜. 이동 가능, Space로 취소.',cooldown:42},
  },
};
export const VOICE_LINES={
 actor:{start:'제 분량은 제가 챙깁니다.',attack:'칼 쓰는 역할? 가능합니다.',skill:'이 장면은 원거리로 갈게요!',buff:'잠깐만요. 감정 잡고.',ultimate:'대역 없이 갑니다!',hurt:'방금 건 감정 연기예요!',dodge:'동선 확인했습니다.',defeat:'방금 건 리허설이었습니다.',victory:'이 정도면… 주연 맞죠?'},
 director:{start:'오늘은 원 테이크로 갑니다.',attack:'컷! 한 번 더!',skill:'지금이야. 액션!',buff:'조명팀! 음향팀! 퇴근 걸렸다!',ultimate:'이 장면으로 끝낸다!',hurt:'이건 콘티에 없는데?',dodge:'동선 좋고!',interrupt:'좋아. 이 장면 살린다.',defeat:'보험용으로 한 테이크 더.',victory:'오케이! 전원 퇴근!'}
};
export const DIFFICULTIES = {
  rehearsal:{id:'rehearsal',name:'리허설',hp:.76,damage:.66,warning:1.24,attackSpeed:1.12},
  standard:{id:'standard',name:'본 촬영',hp:1,damage:1,warning:1,attackSpeed:1},
  hard:{id:'hard',name:'감독판',hp:1.17,damage:1.22,warning:.91,attackSpeed:.88},
};
export const BOSSES = [
  {id:'ignis',name:'피노',title:'조명감독',subtitle:'첫 무대의 긴장을 넘어서',location:'점화 스테이지',color:'#ffb465',hp:3800,damage:18,quote:'조명 켰다. 긴장해도 좋아. 네 장면을 시작해.',tip:'빛나는 바닥에서 벗어나세요. 골든 아워에는 계속 이동하는 민트색 조명을 따라가야 합니다.',review:'첫 장면, 좋았어. 다음 조명으로 가.',patterns:['풋라이트 점화','앰버 스윕','스파크 앙코르','무대 장악 · 골든 아워','조명 리허설']},
  {id:'mime',name:'대길',title:'가면연출가',subtitle:'나만의 배역을 찾아서',location:'가면 소극장',color:'#dfb0fa',hp:5400,damage:26,quote:'가면은 수없이 많지. 너는 어떤 장면을 보여줄 거야?',tip:'점선 FAKE는 가짜, 진한 HIT만 실제 타격입니다. 무대 장악에서는 진짜 번호·모양을 찾고 연결 통로가 열리면 다음 패널로 옮기세요.',review:'네 장면을 찾았군. 다음 무대로.',patterns:['리본 피어스','거짓 커튼','더블 캐스팅','무대 장악 · 페르소나 극장','대역 오디션']},
  {id:'gojo',name:'이프',title:'경계심사관',subtitle:'달라진 흐름에 응답하기',location:'프레임 스튜디오',color:'#a7c9ff',hp:8200,damage:38,quote:'아까 통했던 동선이, 이번에도 통할까?',tip:'프레임 관통은 마지막 0.5초에 고정됩니다. 무대 장악은 가로·세로 안전 통로가 바뀌므로 빔이 꺼진 예고 때 이동하세요.',review:'흐름이 달라도 네 장면은 살아 있어.',patterns:['초점 견인','경계 반발','프레임 관통','무대 장악 · 무한 시사회','리플레이']},
  {id:'sukuna',name:'무빙',title:'종막집행관',subtitle:'마지막까지 집중을 지키기',location:'종막 심사장',color:'#ff8491',hp:9400,damage:45,quote:'마지막 장면이다. 끝까지 네 박자를 지켜라.',tip:'박자 절단의 연속 예고선을 피하세요. 종막 집행은 방향이 바뀌는 칼날 벽입니다. 이동하는 틈에 맞춰 통과하고, 마지막 두 대각선에서는 방향을 꺾으세요.',review:'끝까지 지켰군. 이 무대는 네 것이다.',patterns:['박자 절단','단두 큐','종막 투창','무대 장악 · 종막 집행','앙코르 참격']},
];

const BOUNDS={left:76,right:1204,top:340,bottom:624};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const groundDistance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const recoilDefaults=()=>({knockX:0,knockY:0,hitStun:0,launchZ:0,launchV:0,hitDir:1,hitKind:'',hitPower:0,hitReaction:0,landingTimer:0,landingPower:0});
const EDGES=['skill','buff','dodge','ultimate','attackPressed'];
function isRankedRun(s){return s.mode==='booth'||s.mode==='challenge'||s.mode==='practice';}
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function event(s,type,x,y,extra={}){s.effects.push({id:++s.uid,type,x,y,life:.5,maxLife:.5,color:'#fff',...extra});}
function words(s,text,x=s.player.x,y=s.player.y-110,color='#fff',life=1.25){event(s,'text',x,y,{text,color,life,maxLife:life});}
function speak(s,category,priority=0){
  const p=s.player,text=VOICE_LINES[p.character][category];if(!text)return;
  if(priority<2&&((s.dialogueCooldown||0)>0||(s.dialogueHistory?.[category]??-999)>s.time-8))return;
  s.dialogueHistory??={};s.dialogueHistory[category]=s.time;s.dialogueCooldown=2.8;
  const id=++s.uid;s.dialogue={id,speaker:'player',actorId:p.character,character:p.character,text,category,priority,remaining:2.2,duration:2.2};
  event(s,'dialogue',p.x,p.y-125,{...s.dialogue,life:2.2,maxLife:2.2});
}
function signature(s,kind,text,count=1){event(s,'signature',s.player.x,s.player.y,{kind,character:s.player.character,text,count,color:CHARACTERS[s.player.character].color,life:.8,maxLife:.8});}
function queueFollowup(s,extra){const f={id:++s.uid,kind:'damage',remaining:.2,duration:.2,stage:s.stage,bossId:s.boss.id,attackId:++s.uid,character:s.player.character,x:s.boss.x,y:s.boss.y,radius:145,radiusY:90,...extra};f.duration=f.remaining;s.followups.push(f);return f;}
function crewFollowup(s,target){
  const p=s.player;if(!p.crewReady||p.buffTimer<=0)return;p.crewReady=false;s.stats.crewBursts++;
  for(const [n,staffType] of ['light','sound'].entries())queueFollowup(s,{source:'staff',staffType,x:target.x,y:target.y,originX:p.x,originY:p.y-100,remaining:.16+n*.18,damage:n?50:40,hitIndex:n+1,hitCount:2});
  signature(s,'crew-trigger','조명! 음향! 지금!',2);
}
function updateFollowups(s,dt){
  const due=[];for(const f of s.followups){if(f.stage!==s.stage||f.bossId!==s.boss.id||s.boss.hp<=0){f.cancelled=true;continue;}f.remaining-=dt;if(f.remaining<=0)due.push(f);}
  s.followups=s.followups.filter(f=>!f.cancelled&&f.remaining>0);
  for(const f of due){if(s.boss.hp<=0)break;if(f.kind==='arrow'){const p=s.player;projectile(s,'player','star-arrow',p.x+p.facing*28,p.y-8,Math.cos(f.angle)*760,Math.sin(f.angle)*760,{damage:f.damage,color:'#f3e6ff',radius:23,radiusY:15,life:2,piercing:true,empowered:true,signature:'adlib-arrow',source:'adlib-arrow',attackId:f.attackId,hitIndex:5,hitCount:5});continue;}
    event(s,'supportBurst',f.x,f.y,{...f,color:CHARACTERS[f.character].color,life:.4,maxLife:.4,signature:f.source});
    for(const t of targets(s))if(circleContains(t.x,t.y,f))hitTarget(s,t,f.damage,{kind:'skill',source:f.source,signature:f.source,attackId:f.attackId,hitIndex:f.hitIndex||1,hitCount:f.hitCount||1,staffType:f.staffType,cueIndex:f.cueIndex,cueCount:f.cueCount,originX:f.originX,originY:f.originY});
  }
}
function boost(s){return (s.player.buff?1.35:1)*(s.fever>0?1.15:1)*(s.player.buffTimer>0?(s.player.character==='director'?1.25:1.2):1);}
function startCinematic(s,kind,actorId,name,duration,focusX,focusY){
  const id=++s.uid;s.cinematic={id,kind,actorId,name,duration,remaining:duration,focusX,focusY};s.inputBuffer={};s.player.actionQueue={};s.player.attackBuffer=0;
  event(s,'cinematic',focusX,focusY,{id,kind,actorId,character:CHARACTERS[actorId]?actorId:undefined,bossId:CHARACTERS[actorId]?undefined:actorId,text:name,duration,life:duration,maxLife:duration,color:CHARACTERS[actorId]?.color||s.boss.color});
}
function multiplier(s){s.multiplier=Math.min(3,Math.min(2.5,1+Math.floor(s.combo/8)*.25)+(s.fever>0?.5:0));s.stats.maxMultiplier=Math.max(s.stats.maxMultiplier,s.multiplier);}
function addScore(s,value){s.scoreExact+=value;s.score=Math.round(s.scoreExact);}
function grade(s,name){s.player.timingGrade=name;s.player.timingTimer=.85;}
function decayEffects(s,dt){for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0).slice(-180);}
function recoil(s,u,dt){
  u.hitStun=Math.max(0,u.hitStun-dt);u.hitReaction=Math.max(0,u.hitReaction-dt);u.landingTimer=Math.max(0,u.landingTimer-dt);
  u.x=clamp(u.x+u.knockX*dt,BOUNDS.left,BOUNDS.right);u.y=clamp(u.y+u.knockY*dt,BOUNDS.top,BOUNDS.bottom);u.knockX*=Math.exp(-10*dt);u.knockY*=Math.exp(-10*dt);
  if(u.launchZ>0||u.launchV>0){u.launchV-=850*dt;u.launchZ=Math.max(0,u.launchZ+u.launchV*dt);if(u.launchZ===0&&u.launchV<0){
    u.landingPower=clamp(Math.abs(u.launchV)/210,.45,2.2);u.launchV=0;u.landingTimer=.22;
    event(s,'landing',u.x,u.y,{power:u.landingPower,direction:u.hitDir,targetId:u===s.player?'player':u.id,character:u===s.player?u.character:undefined,bossId:u===s.boss?u.id:undefined,color:'#e9dcc1',life:.35,maxLife:.35});
    event(s,'ring',u.x,u.y,{radius:30+u.landingPower*18,color:'#f7ecc3',life:.2,maxLife:.2});
  }}
}
function circleContains(x,y,h,margin=0){return Math.pow((x-h.x)/(h.radius+margin),2)+Math.pow((y-h.y)/((h.radiusY??h.radius*.55)+margin*.55),2)<=1;}
function laneContains(x,y,h,margin=0){const co=Math.cos(h.angle||0),si=Math.sin(h.angle||0),dx=x-h.x,dy=y-h.y;return Math.abs(dx*co+dy*si)<h.width/2+margin&&Math.abs(-dx*si+dy*co)<h.height/2+margin;}
function regionContains(x,y,r,margin=0){return r.type==='ellipse'?circleContains(x,y,r,margin):laneContains(x,y,{...r,angle:r.angle||0},margin);}
function outsideDomainSafe(x,y,h,margin=0){
  if(!h.domainType)return !circleContains(x,y,{x:h.safeX,y:h.safeY,radius:h.safeRadius,radiusY:h.safeRadiusY},-margin);
  if(h.safeRegions?.length)return !h.safeRegions.some(r=>regionContains(x,y,r,-margin));
  return (h.dangerRegions||[]).some(r=>regionContains(x,y,r,margin));
}
export function isInsideHazard(x,y,h,margin=0){
  if(h.decoy)return false;
  if(h.domainType)return !!h.active&&!!h.lethalActive&&outsideDomainSafe(x,y,h,margin);
  if(h.type==='safezone')return !circleContains(x,y,{x:h.safeX,y:h.safeY,radius:h.safeRadius,radiusY:h.safeRadiusY},-margin);
  return h.type==='lane'?laneContains(x,y,h,margin):circleContains(x,y,h,margin);
}
export function getTakeoverView(h){
  if(!h)return null;
  const safeRegions=h.safeRegions||[{type:'ellipse',x:h.safeX,y:h.safeY,radius:h.safeRadius,radiusY:h.safeRadiusY}];
  return {type:h.domainType||'safezone',safeRegions,dangerRegions:h.dangerRegions||[],nextSafeRegions:h.nextSafeRegions||[],pursuitState:h.pursuitState||null,pursuitVariant:h.pursuitVariant||null,section:h.section||null,shotIndex:h.shotIndex||0,shotCount:h.section==='burst'?7:h.slashes?.length||0,nextShotIn:h.nextShotIn??null,beatIndex:h.domainPhase||0,beatCount:h.phaseCount||1,previewRegions:h.previewRegions||[],aimPoint:h.aimPoint||null,origin:h.origin||null,slashes:h.slashes||[],waves:h.waves||[],bladeCheckpoint:h.bladeCheckpoint||0,arrivalSeconds:h.arrivalSeconds??null,panels:h.panels||[],safeIndex:h.safeIndex,nextSafeIndex:h.nextSafeIndex,phaseName:h.phaseName||h.name,phaseRemaining:!h.active?h.remaining:h.phaseRemaining??h.life,phaseDuration:!h.active?h.duration:h.phaseDuration??h.totalLife,phaseIndex:h.domainPhase||0,phaseCount:h.phaseCount||1,pulseActive:!!h.active&&h.lethalActive!==false,warning:!h.active||!!h.phaseWarning,guide:{x:h.safeX,y:h.safeY},instruction:h.instruction||'안전 조명 안으로 이동하세요.'};
}
function domainTitle(h,v){
 if(h.domainType==='mask-panels'){const panel=h.panels?.find(p=>p.x===h.safeX);return `${panel?.label||''}번 ${['원','마름모','삼각형'][panel?.index||0]} 패널로 이동`;}
 if(h.domainType==='lens-corridors')return v.warning?'빔이 꺼졌어요. 다음 통로로 이동!':'현재 통로 유지 · 금빛 다음 길 확인';
 if(h.domainType==='blade-waves')return `${(h.domainPhase||0)+1}/5 · 칼날 벽의 틈으로 이동!`;
 if(h.domainType==='rhythm-slashes')return `${(h.domainPhase||0)+1}/5박자 · 선이 나타나면 바로 옆으로!`;
 return '움직이는 민트색 조명을 따라가세요';
}
function domainInstruction(s,h,v){
 const targetPanel=h.panels?.find(p=>p.x===h.safeX),inside=s?.player?(h.domainType==='mask-panels'?!!targetPanel&&circleContains(s.player.x,s.player.y,targetPanel):!outsideDomainSafe(s.player.x,s.player.y,h)):false;
 if(h.domainType==='mask-panels'){
  const panel=h.panels?.find(p=>p.x===h.safeX),name=`${['①','②','③'][panel?.index||0]} ${['원형','마름모','삼각형'][panel?.index||0]} 발판`;
  return h.active&&h.phaseWarning&&!inside?`이제 ${name}으로! 연결된 길을 따라가세요!`:inside?`${name} 안에 머무르세요. 다음 표지를 확인하세요.`:`${name} 안으로 이동하세요!`;
 }
 if(h.domainType==='lens-corridors')return v.warning?'빔이 꺼진 지금, 새 민트색 통로 안으로 이동하세요!':'현재 민트색 통로를 유지하고 금빛 다음 길을 확인하세요.';
 if(h.domainType==='rhythm-slashes')return v.warning?`세 갈래 예고선이 보이면 바로 옆 빈틈으로 이동하세요! ${(h.domainPhase||0)+1}/5박자.`:'선 사이에 머무르세요. 다음 예고선이 나타나면 다시 옆으로 이동하세요.';
 return h.instruction||'안전 조명 안으로 이동하세요.';
}
export function getDomainGuide(s,h){
  const v=getTakeoverView(h);if(!v)return null;const p=s?.player;
  const insideSafe=p?!outsideDomainSafe(p.x,p.y,h):false;
  const targetPanel=h.panels?.find(panel=>panel.x===h.safeX)||null,currentPanel=h.panels?.find(panel=>p&&circleContains(p.x,p.y,panel))||null;
  const targetRegion=targetPanel||null,targetReached=!!p&&(targetRegion?circleContains(p.x,p.y,targetRegion):insideSafe);
  if(h.domainType==='blade-waves')return bladeGuide(s,h,v);
  if(h.domainType==='chasing-slashes')return pursuitGuide(s,h,v);
  return {...v,target:v.guide,targetRegion,targetReached,destinationReached:targetReached,transition:!!h.active&&!!h.phaseWarning,currentPanel,targetPanel,nextPanel:h.panels?.[h.nextSafeIndex]||null,phase:v.phaseIndex,remaining:v.phaseRemaining,title:domainTitle(h,v),timerLabel:!h.active?'공격까지':h.phaseWarning?'이동 시간':'유지 시간',progress:clamp(1-v.phaseRemaining/Math.max(.01,v.phaseDuration),0,1),insideSafe,dangerousNow:!!p&&v.pulseActive&&outsideDomainSafe(p.x,p.y,h),instruction:domainInstruction(s,h,v)};
}


export function createGame({character='director',difficulty='standard',seed=42,stage=0,skipIntro=false,mode='story',duration=90}={}){
  if(!CHARACTERS[character])character='director';if(!DIFFICULTIES[difficulty])difficulty='standard';
  mode=mode==='challenge'?'challenge':mode==='booth'?'booth':'story';if(isRankedRun({mode})){seed=424242;difficulty='standard';stage=0;skipIntro=true;}duration=[60,90,120].includes(duration)?duration:90;
  const s={version:15,runCharacter:character,dialogue:null,dialogueCooldown:0,dialogueHistory:{},lastDamage:null,followups:[],rehearsal:null,audition:null,playerHistory:[],introducedBosses:[],cinematic:null,pendingUltimate:false,mode,duration:mode==='booth'?duration:0,timeLeft:mode==='challenge'?null:mode==='booth'?duration:0,runTime:0,round:0,transitionTimer:0,endReason:null,domainDeath:null,inputBuffer:{},scoreExact:0,multiplier:1,fever:0,lastJustAttack:0,rng:seed>>>0,seed:seed>>>0,uid:0,status:'playing',difficulty,stage:0,time:0,stageTime:0,score:0,combo:0,maxCombo:0,comboTimer:0,
    player:{...recoilDefaults(),x:270,y:500,hp:280,maxHp:280,energy:100,maxEnergy:100,hype:0,character,role:'sword',facing:1,invuln:0,attackAnim:0,attackKind:'',dodgeTimer:0,dodgeElapsed:0,dodgeId:0,lastJustDodge:-1,dodgeX:0,dodgeY:0,attackCooldown:0,attackId:0,comboIndex:0,chainTimer:0,precisionWindow:false,precisionQueued:false,precisionAttempted:false,queuedAttack:false,timingGrade:'',timingTimer:0,swapCooldown:0,hitFlash:0,slow:0,buff:false,combo:0,cooldowns:{skill:0,buff:0,dodge:0,role:0,ultimate:0}},
    boss:null,enemies:[],hazards:[],projectiles:[],effects:[],spotlight:{x:480,y:490,radius:105,radiusY:62,active:true,timer:0},
    stats:{extraActivations:{},extraCompletions:{},extraSuccesses:{},counterWindows:0,counterDamage:0,rehearsals:0,auditionSuccesses:0,auditionMistakes:0,patternCasts:{},takeoverCasts:{},takeoverActivations:{},takeoverSurvived:{},damageDealt:0,damageTaken:0,hits:0,dodges:0,perfectDodges:0,justDodges:0,justHits:0,finishers:0,maxMultiplier:1,bossKills:0,skills:0,buffs:0,adlibs:0,methodFinishers:0,cueDetonations:0,crewBursts:0,blocks:0,swaps:0,ultimates:0,kills:0,stagesCleared:0,spotlightSeconds:0},
    announcedPhase:false,shake:0,hitStop:0,skipIntro};
  startStage(s,clamp(stage|0,0,BOSSES.length-1),{retry:true,entrance:mode==='challenge'});return s;
}

export function startStage(s,index,{retry=false,entrance=false}={}){
  index=clamp(index|0,0,BOSSES.length-1);const d=DIFFICULTIES[s.difficulty],config=BOSSES[index],p=s.player,ranked=isRankedRun(s),ultimateRemaining=retry?0:p.cooldowns.ultimate;
  s.stage=index;s.stageTime=0;s.status='playing';s.cinematic=null;s.pendingUltimate=false;s.endReason=null;s.domainDeath=null;s.transitionTimer=0;s.hazards=[];s.projectiles=[];s.followups=[];s.rehearsal=null;s.audition=null;s.playerHistory=[];s.effects=[];s.lastDamage=null;s.combo=0;s.comboTimer=0;s.announcedPhase=false;s.hitStop=0;s.shake=0;multiplier(s);
  p.x=ranked?430:270;p.y=500;p.facing=1;p.hp=retry?p.maxHp:Math.min(p.maxHp,p.hp+(ranked?65:100));p.energy=retry?100:Math.min(100,p.energy+45);p.hype=retry?0:Math.min(100,p.hype+20);
  p.character=s.runCharacter;p.role='sword';p.castRole='sword';p.castTimer=0;p.buffTimer=0;p.buffName='';p.shieldCharges=0;p.invuln=1;p.attackAnim=0;p.dodgeTimer=0;p.attackCooldown=0;p.swapCooldown=0;p.hitFlash=0;p.slow=0;p.buff=false;p.combo=0;p.cooldowns={skill:0,buff:0,dodge:0,role:0,ultimate:ultimateRemaining};p.attackSequence=null;p.adlibReady=false;p.nextFinisherReady=false;p.methodRewardSpent=false;p.crewReady=false;p.retreatTimer=0;p.retreatDirection=0;
  Object.assign(p,recoilDefaults(),{comboIndex:0,chainTimer:0,precisionWindow:false,precisionQueued:false,precisionAttempted:false,queuedAttack:false,attackBuffer:0,actionQueue:{},attackDuration:0,attackProgress:1,timingGrade:'',timingTimer:0});
  const hp=Math.round(config.hp*d.hp*(ranked?.55*(s.mode==='booth'?Math.pow(1.15,Math.floor(s.round/BOSSES.length)):1):1));
  s.boss={...config,...recoilDefaults(),x:ranked?800:1000,y:480,hp,maxHp:hp,active:!!s.skipIntro,phase:1,telegraph:null,attackAnim:0,attackKind:'',stun:0,hitFlash:0,facing:-1,patternCooldown:ranked?1.2:2,patternIndex:ranked?0:Math.floor(random(s)*2),attacks:0,takeoverCount:0,counterRemaining:0,counterDuration:0,counterReason:"",lastCounterSource:null,lastExtraCompleteId:null,shield:0,cueMarks:0,lastCueAttack:0};
  s.enemies=s.skipIntro?[]:[0,1].map((n)=>({...recoilDefaults(),id:`extra-${n}`,name:n?'NG 엑스트라':'야근의 망령',kind:'extra',x:650+n*240,y:420+n*145,hp:110+index*15,maxHp:110+index*15,facing:-1,attackCooldown:1.5+n,attackAnim:0,hitFlash:0,stun:0,telegraph:0,speed:105+index*5}));
  s.spotlight={x:490,y:480,radius:105,radiusY:62,active:true,timer:0};
  words(s,retry?'오늘도 무사히 크랭크인!':ranked?`STAGE ${s.stage+1} · 체력 +65`:'한 씬 더! 체력 +100',640,282,'#dfff70',1.3);
  speak(s,'start');
  if(entrance||!retry&&!s.introducedBosses.includes(config.id)){if(!s.introducedBosses.includes(config.id))s.introducedBosses.push(config.id);startCinematic(s,'bossIntro',config.id,config.name+' · '+config.subtitle,[3,3.2,3.4,3.8][index],s.boss.x,s.boss.y);}
  return s;
}

function hitTarget(s,target,amount,{kind='basic',knockback=0,perfect=false,attackId=0,hitIndex=1,hitCount=1,finisher:ultimateFinisher=false,source='',signature:signatureId='',staffType,cueIndex,cueCount,originX,originY,performanceRole}={}){
  if(target.hp<=0||target===s.boss&&!target.active)return;
  if(target.audition){if(kind!=='ultimate')selectAudition(s,target);return 0;}
  const boss=target===s.boss,finisher=kind==='finisher'||ultimateFinisher;let damage=amount*boost(s)*(perfect?1.3:1);
  if(target===s.boss&&target.id==='gojo'&&target.shield>0&&kind==='basic')damage*=.62;
  if(boss&&s.audition&&!s.audition.solved)damage*=.55;
  if(boss&&s.boss.counterRemaining>0)damage*=1.2;
  damage=Math.min(target.hp,Math.round(damage));target.hp-=damage;target.hitFlash=finisher?.22:.13;
  const direction=Math.sign(target.x-s.player.x)||s.player.facing,force=kind==='ultimate'?(finisher?1000:160):kind==='skill'?480:finisher?610:180,resistance=boss?.32:1;
  target.hitDir=direction;target.knockX=direction*(force+knockback*3)*resistance;target.knockY=clamp((target.y-s.player.y)/65,-1,1)*force*.22*resistance;
  target.hitKind=kind;target.hitPower=kind==='ultimate'?(finisher?3:1.25):finisher?2.1:kind==='skill'?1.5:perfect?1.35:1;target.hitReaction=finisher?.4:kind==='ultimate'?.5:.18;target.landingTimer=0;
  target.hitStun=finisher?(boss?.15:.5):(boss?.055:.16);if(!boss)target.stun=Math.max(target.stun,target.hitStun);
  if(finisher||kind==='skill'){target.launchV=Math.max(target.launchV,boss?(finisher?210:kind==='ultimate'?240:110):finisher?370:310);target.launchZ=Math.max(1,target.launchZ);}
  if(boss&&s.boss.counterRemaining>0)s.stats.counterDamage+=damage;
  s.stats.damageDealt+=damage;s.stats.hits++;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);s.comboTimer=.9;
  if(s.combo%16===0){s.fever=5;event(s,'comic',640,350,{text:'흥행 폭발!',subtitle:'FEVER · 공격력 +15%',power:2,color:'#f5ff6e',life:1,maxLife:1});}
  multiplier(s);addScore(s,damage*s.multiplier);
  if(perfect&&attackId!==s.lastJustAttack){s.lastJustAttack=attackId;s.stats.justHits++;addScore(s,60);s.player.hype=Math.min(100,s.player.hype+10);grade(s,'JUST HIT');event(s,'comic',target.x,target.y,{text:'JUST!',subtitle:'타이밍 완벽 +60',power:1.4,color:'#eaff7a',life:.7,maxLife:.7});}
  if(finisher&&s.lastFinisherAttack!==attackId){s.lastFinisherAttack=attackId;s.stats.finishers++;event(s,'comic',target.x,target.y,{text:s.player.character==='director'?'퇴근 도장!':'연기대상! ',comboIndex:4,power:1.6,color:'#fff0a6',life:.7,maxLife:.7});}
  s.player.hype=Math.min(100,s.player.hype+(kind==='ultimate'?0:(source==='actor-arrow'||source==='adlib-arrow'?2.6:2.6/Math.max(1,hitCount))+damage*.03));s.player.energy=Math.min(100,s.player.energy+1.8);
  event(s,'text',target.x+(random(s)-.5)*30,target.y-110,{text:String(damage),color:s.player.buff?'#e9ff89':'#fff',life:.65,maxLife:.65,size:22});
  event(s,'impact',target.x,target.y,{color:CHARACTERS[s.player.character].color,life:finisher?.30:.24,maxLife:finisher?.30:.24,power:target.hitPower,comboIndex:s.player.comboIndex,perfect,kind,attackId,direction,character:s.player.character,targetId:target.id,damage,time:s.time,hitIndex,strikeIndex:hitIndex,hitCount,totalHits:hitCount,finisher,source,signature:signatureId,staffType,cueIndex,cueCount,originX,originY,performanceRole});
  event(s,'spark',target.x,target.y-45,{color:CHARACTERS[s.player.character].color,life:.22,maxLife:.22});s.shake=Math.max(s.shake,kind==='ultimate'?(finisher?22:4):kind==='skill'?11:finisher?10:4);
  s.hitStop=Math.max(s.hitStop,kind==='ultimate'?(finisher?.10:.012):finisher?.075:kind==='skill'?.065:.018);
  if(target.hp<=0){s.stats.kills++;if(boss)s.stats.bossKills++;event(s,'confetti',target.x,target.y,{radius:boss?190:80,power:boss?2:1,color:target.color||'#dfff70',life:1.1,maxLife:1.1});event(s,'burst',target.x,target.y-35,{radius:boss?140:55,color:target.color||'#dfff70',life:.8,maxLife:.8});}
  if(s.player.character==='actor'&&kind==='finisher'&&!s.player.adlibReady){s.player.adlibReady=true;signature(s,'adlib-ready','애드리브 준비 · 다음 W 강화');}
  if(s.player.character==='director'&&(kind==='finisher'||source==='director-wave'))crewFollowup(s,target);
  return damage;
}

function hurtPlayer(s,amount,source={}){
  const p=s.player;if(p.hp<=0)return false;
  if(p.invuln>0){if(p.dodgeTimer>0&&!source.dodgeNotified){source.dodgeNotified=true;if(p.dodgeElapsed<=.115&&p.lastJustDodge!==p.dodgeId){p.lastJustDodge=p.dodgeId;s.stats.perfectDodges++;s.stats.justDodges++;addScore(s,150);p.hype=Math.min(100,p.hype+12);grade(s,'JUST DODGE');speak(s,'dodge');if(p.character==='actor'&&p.buffTimer>0&&!p.methodRewardSpent){p.methodRewardSpent=true;p.nextFinisherReady=true;signature(s,'method-ready','동선 완벽 · 다음 Q 강마무리');}event(s,'comic',p.x,p.y,{text:'JUST DODGE!',subtitle:'종이 한 장 차이 +150',power:1.3,color:'#c9ff8f',life:.85,maxLife:.85});}}return false;}
  if(p.shieldCharges>0&&p.buffTimer>0){p.shieldCharges--;p.invuln=.24;s.stats.blocks++;event(s,'comic',p.x,p.y,{text:'감독의 보호!',subtitle:'일반 피격 1회 방어',character:'director',color:'#dfff70',power:1.2,life:.7,maxLife:.7});return false;}
  const damage=Math.min(p.hp,Math.max(1,Math.round(amount*DIFFICULTIES[s.difficulty].damage)));p.hp-=damage;p.invuln=.72;p.hitFlash=.2;p.hitStun=.16;p.hitDir=Math.sign(p.x-(source.x??s.boss.x))||-p.facing;p.knockX=p.hitDir*300;p.knockY=clamp((p.y-(source.y??s.boss.y))/60,-1,1)*65;p.launchV=160;p.launchZ=1;p.attackSequence=null;p.hitKind='hurt';p.hitPower=1.4;p.hitReaction=.32;p.landingTimer=0;p.chainTimer=0;p.comboIndex=0;p.precisionQueued=false;p.queuedAttack=false;p.attackBuffer=0;s.stats.damageTaken+=damage;s.combo=0;s.comboTimer=0;s.shake=10;s.hitStop=Math.max(s.hitStop,.045);multiplier(s);
  s.lastDamage={x:p.x,y:p.y,damage,sourceId:source.id,hazard:source.type?JSON.parse(JSON.stringify(source)):null};speak(s,'hurt');
  p.hype=Math.min(100,p.hype+6);words(s,`−${damage}`,p.x,p.y-90,'#ff9494',.7);
  if(source.kind==='seed'){p.energy=Math.max(0,p.energy-12);p.slow=1.1;words(s,'대본이 기억 안 나…',p.x,p.y-125,'#b9d58b',.9);}
  if(p.hp<=0){s.status='gameover';s.endReason='defeat';speak(s,'defeat',3);s.followups=[];s.hazards=[];s.projectiles=[];words(s,'컷! 이건 NG야!',640,300,'#ff9c84',4);}return true;
}
function checkActiveDomains(s){
  if(s.status!=='playing'||s.player.hp<=0)return false;
  const h=s.hazards.find(h=>h.kind==='domain'&&h.active&&h.life>0&&(h.domainType==='blade-waves'?(s._movementStart&&!s._bladeSweepReady?projectedBladeHit(s,h):h.sweptHit||isInsideHazard(s.player.x,s.player.y,h)):h.domainType==='chasing-slashes'?(s._movementStart&&!s._bladeSweepReady?projectedPursuitHit(s,h):h.sweptHit||isInsideHazard(s.player.x,s.player.y,h)):isInsideHazard(s.player.x,s.player.y,h)));
  if(!h)return false;
  const p=s.player;s.stats.damageTaken+=p.hp;p.hp=0;p.invuln=0;p.hitFlash=.45;p.hitStun=1;s.status='gameover';s.endReason='domain';s.combo=0;s.comboTimer=0;s.shake=24;
  s.domainDeath={bossId:s.boss.id,name:h.name,x:p.x,y:p.y,instruction:getDomainGuide(s,h).instruction,tip:getDomainGuide(s,h).instruction,domainType:h.domainType,phase:h.domainPhase,hazard:JSON.parse(JSON.stringify(h))};speak(s,'defeat',3);s.followups=[];s.hazards=[];s.projectiles=[];s.inputBuffer={};
  event(s,'domaincut',p.x,p.y,{fatal:true,bossId:s.boss.id,text:'무대에 압도당했다',subtitle:h.name+' · 즉사',color:s.boss.color,power:4,life:2.5,maxLife:2.5});
  words(s,'무대 장악 · 즉사',640,300,'#ff8f9e',3);return true;
}
function targets(s){return [...(s.audition?.active&&!s.audition.selected?s.audition.figures.filter(f=>f.hp>0).sort((a,b)=>groundDistance(a,s.player)-groundDistance(b,s.player)):[]),...s.enemies.filter(e=>e.hp>0),...(s.boss.active&&s.boss.hp>0?[s.boss]:[])];}
function aimedTarget(s){const p=s.player;return targets(s).filter(t=>(t.x-p.x)*p.facing>=-20).sort((a,b)=>groundDistance(a,p)-groundDistance(b,p))[0];}
function projectile(s,owner,kind,x,y,vx,vy,extra={}){s.projectiles.push({id:++s.uid,owner,kind,x,y,vx,vy,radius:9,radiusY:6,damage:20,life:3,color:'#fff',hits:[],...extra});}
function basicAttack(s){
  const p=s.player,c=CHARACTERS[p.character],methodFinisher=p.character==='actor'&&p.nextFinisherReady;p.comboIndex=p.character==='actor'&&p.nextFinisherReady?4:p.chainTimer>0?p.comboIndex%4+1:1;if(p.character==='actor'&&p.nextFinisherReady){p.nextFinisherReady=false;s.stats.methodFinishers++;}speak(s,'attack');p.combo=p.comboIndex;p.chainTimer=.9;p.attackId=++s.uid;
  const finisher=p.comboIndex===4,perfect=p.precisionQueued;p.precisionQueued=false;p.precisionAttempted=false;p.queuedAttack=false;
  p.attackCooldown=(c.attackCooldown+(finisher?.10:0))*(p.character==='actor'&&p.buffTimer>0?.8:1);p.attackAnim=finisher?.42:.28;p.attackDuration=p.attackAnim;p.attackProgress=0;p.attackKind=finisher?'finisher':p.character==='director'?'slate':'sword';p.attackBuffer=0;
  const nearest=aimedTarget(s),advance=finisher?42:16,lunge=nearest&&Math.abs(nearest.y-p.y)<75?Math.min(advance,Math.max(0,Math.abs(nearest.x-p.x)-60)):advance;
  p.x=clamp(p.x+p.facing*lunge,BOUNDS.left,BOUNDS.right);
  p.attackSequence={kind:'basic',attackId:p.attackId,elapsed:0,duration:.24,hitIndex:0,hitCount:3,nextHit:0,comboIndex:p.comboIndex,stage:s.stage,bossId:s.boss.id,finisher,perfect,methodFinisher};
  resolveSequenceStrike(s,p.attackSequence);
}
function resolveSequenceStrike(s,q){
  const p=s.player,c=CHARACTERS[p.character],ultimate=q.kind==='ultimate',last=q.hitIndex===q.hitCount-1,finisher=ultimate?last:q.finisher&&last;
  const factor=q.finisher?[.55,.65,1.6][q.hitIndex]:.44*[1,1.05,1.15][q.comboIndex-1];
  const amount=ultimate?(p.character==='director'?1600:1750)*(last?.45:.55/11):c.attack*factor;
  q.hitIndex++;q.performanceRole=ultimate?(p.character==='actor'?(last?'final':q.hitIndex<=4?'sword':q.hitIndex<=8?'bow':'action'):(last?'slate-finish':q.hitIndex<=4?'crew-cue':'bombardment')):p.character==='actor'?'sword':'slate';q.nextHit=q.hitIndex*(ultimate?.2:.1);p.strikeIndex=q.hitIndex;p.strikeCount=q.hitCount;
  for(const t of targets(s))if(ultimate||(Math.abs(t.y-p.y)<65&&Math.abs(t.x-p.x)<c.range+(finisher?27:0)&&(t.x-p.x)*p.facing>-28)){
    const dealt=hitTarget(s,t,amount,{kind:ultimate?'ultimate':finisher?'finisher':'basic',knockback:finisher?12:0,perfect:q.perfect,attackId:q.attackId,hitIndex:q.hitIndex,hitCount:q.hitCount,finisher,performanceRole:q.performanceRole,source:q.methodFinisher?'method-strike':'',signature:q.methodFinisher?'method-strike':''});if(t===s.boss&&dealt>0)q.hitBoss=true;
    if(ultimate)t.stun=Math.max(t.stun,last?.6:.08);
  }
  event(s,'slash',p.x+p.facing*55,p.y-45,{facing:p.facing,kind:p.character==='director'?'slate':'sword',radius:c.range*(finisher?1.6:1),comboIndex:q.comboIndex,attackId:q.attackId,hitIndex:q.hitIndex,hitCount:q.hitCount,finisher,power:finisher?2.3:1,color:c.color,life:.18,maxLife:.18});
  if(!ultimate&&last&&p.character==='director'&&q.hitBoss&&s.boss.lastCueAttack!==q.attackId){s.boss.lastCueAttack=q.attackId;s.boss.cueMarks=Math.min(3,s.boss.cueMarks+1);signature(s,'cue-mark','액션 표식 '+s.boss.cueMarks+' / 3',s.boss.cueMarks);}
  if(ultimate&&last)event(s,'ultimateFinish',s.boss.x,s.boss.y,{character:p.character,attackId:q.attackId,power:4,text:SKILL_KITS[p.character].r.name,color:c.color,life:.8,maxLife:.8});
}
function updateAttackSequence(s,dt){
  const p=s.player,q=p.attackSequence;if(!q)return;
  if(q.stage!==s.stage||q.bossId!==s.boss.id||s.boss.hp<=0||s.status!=='playing'){p.attackSequence=null;return;}
  q.elapsed+=dt;if(q.kind==='ultimate'){p.attackAnim=Math.max(0,q.duration-q.elapsed);p.attackDuration=q.duration;p.attackProgress=clamp(q.elapsed/q.duration,0,1);p.invuln=Math.max(p.invuln,.08);}
  while(q.hitIndex<q.hitCount&&q.elapsed+1e-9>=q.nextHit){resolveSequenceStrike(s,q);if(s.boss.hp<=0)break;}
  if(q.elapsed>=q.duration||s.boss.hp<=0)p.attackSequence=null;
}
function preciseDirectorCut(s){
  const p=s.player,b=s.boss;
  if(!b.active||groundDistance(p,b)>=430||!b.telegraph||b.telegraph.remaining>.3)return false;
  const attackId=b.telegraph.attackId;if(s.audition?.attackId===attackId&&!s.audition.active)s.audition=null;s.hazards=s.hazards.filter(h=>h.attackId!==attackId||h.active);b.telegraph=null;b.stun=.65;b.patternCooldown=1.1;
  p.hype=Math.min(100,p.hype+15);speak(s,'interrupt',2);grade(s,'CUT!');event(s,'comic',b.x,b.y,{text:'컷 타이밍!',subtitle:'레디 액션 · 완벽한 연출',character:'director',power:1.5,color:'#dfff70',life:.8,maxLife:.8});return true;
}
function useSkill(s){
  const p=s.player,c=CHARACTERS[p.character],kit=SKILL_KITS[p.character];if(p.cooldowns.skill>0)return;
  p.attackSequence=null;p.cooldowns.skill=kit.w.cooldown;p.attackAnim=.65;p.attackDuration=.65;p.attackProgress=0;p.attackKind='skill';s.stats.skills++;speak(s,'skill');if(p.character==='director')p.invuln=Math.max(p.invuln,.2);p.attackId=++s.uid;
  event(s,'skillcut',p.x,p.y,{character:p.character,role:p.character==='actor'?'bow':'director',text:kit.w.name,subtitle:p.character==='director'?'메가폰 충격파 · READY, ACTION!':'활 시전 후 자동 검 복귀',power:2,color:c.color,life:.65,maxLife:.65});
  if(p.character==='director'){
    preciseDirectorCut(s);words(s,'레디… 액션!',p.x,p.y-145,'#e6ff7c');event(s,'ring',p.x,p.y,{radius:325,radiusY:180,color:'#dfff70',life:.55,maxLife:.55});
    for(const t of targets(s))if(groundDistance(p,t)<325){hitTarget(s,t,175,{kind:'skill',knockback:35,source:'director-wave',attackId:p.attackId});t.stun=Math.max(t.stun,t===s.boss?.12:.45);}
    const marks=s.boss.cueMarks;s.boss.cueMarks=0;if(marks){s.stats.cueDetonations++;for(let n=0;n<marks;n++)queueFollowup(s,{source:'cue-detonation',remaining:.18+n*.2,damage:60,cueIndex:n+1,cueCount:marks,originX:p.x,originY:p.y-70,attackId:p.attackId,hitIndex:n+1,hitCount:marks});}
    for(const q of s.projectiles)if(q.owner==='enemy'&&groundDistance(p,q)<325)q.life=0;
  }else{
    p.castRole='bow';p.castTimer=.65;p.retreatTimer=.12;p.retreatDirection=-p.facing;const empowered=p.adlibReady;p.adlibReady=false;if(empowered)s.stats.adlibs++;words(s,'궁수 연기!',p.x,p.y-145,'#cabaff');const t=aimedTarget(s),angle=t?Math.atan2(t.y-p.y,t.x-p.x):p.facing===1?0:Math.PI;
    for(let i=-2;i<=2;i++){if(empowered&&i===2){queueFollowup(s,{kind:'arrow',source:'adlib-arrow',remaining:.2,angle,damage:168,attackId:p.attackId});continue;}projectile(s,'player','star-arrow',p.x+p.facing*28,p.y-8,Math.cos(angle+i*.065)*710,Math.sin(angle+i*.065)*710,{damage:52,color:'#d4c4ff',radius:12,radiusY:8,life:2,piercing:true,source:'actor-arrow',attackId:p.attackId,hitIndex:i+3,hitCount:5});}
  }
}
function useBuff(s){
  const p=s.player,kit=SKILL_KITS[p.character];if(p.cooldowns.buff>0)return;
  p.cooldowns.buff=kit.e.cooldown;p.buffTimer=5;p.buffName=kit.e.name;p.shieldCharges=p.character==='director'?1:0;p.crewReady=p.character==='director';p.methodRewardSpent=false;s.stats.buffs++;speak(s,'buff');if(p.crewReady)signature(s,'crew-ready','조명·음향 스태프 대기');
  event(s,'buff',p.x,p.y,{character:p.character,text:kit.e.name,subtitle:kit.e.description,duration:5,life:.75,maxLife:.75,color:CHARACTERS[p.character].color,power:1.5});
  event(s,'ring',p.x,p.y,{radius:145,radiusY:80,color:CHARACTERS[p.character].color,life:.65,maxLife:.65});words(s,kit.e.name,p.x,p.y-145,CHARACTERS[p.character].color,1);
}
function useUltimate(s){
  const p=s.player,kit=SKILL_KITS[p.character];if(p.hype<100||p.cooldowns.ultimate>0||s.pendingUltimate||p.attackSequence?.kind==='ultimate')return;
  p.hype=0;p.cooldowns.ultimate=kit.r.cooldown;s.stats.ultimates++;speak(s,'ultimate',2);p.retreatTimer=0;p.attackSequence=null;p.attackKind='ultimate';p.attackAnim=0;p.attackProgress=0;s.pendingUltimate=true;
  // Only uncommitted attacks are cancelled. A live takeover remains lethal after the cut.
  s.hazards=s.hazards.filter(h=>h.kind==='domain'&&h.active);s.rehearsal=null;if(s.audition&&!s.audition.active)s.audition=null;s.boss.telegraph=null;s.boss.patternCooldown=Math.max(1.4,s.boss.patternCooldown);
  startCinematic(s,'playerUltimate',p.character,kit.r.name,1.6,p.x,p.y);
}
function resolveUltimate(s){
  const p=s.player,kit=SKILL_KITS[p.character];s.pendingUltimate=false;
  if(s.status!=='playing'||s.boss.hp<=0)return;
  p.attackId=++s.uid;p.attackKind='ultimate';p.attackAnim=2.3;p.attackDuration=2.3;p.attackProgress=0;p.invuln=Math.max(p.invuln,.08);
  p.attackSequence={kind:'ultimate',attackId:p.attackId,elapsed:0,duration:2.3,hitIndex:0,hitCount:12,nextHit:0,comboIndex:0,stage:s.stage,bossId:s.boss.id,finisher:true,perfect:false};
  event(s,'skillcut',p.x,p.y,{text:kit.r.name,character:p.character,power:3,color:CHARACTERS[p.character].color,life:.9,maxLife:.9});
  resolveSequenceStrike(s,p.attackSequence);
}

function addHazard(s,b,type,name,warn,extra={}){
  const h={id:++s.uid,attackId:b.telegraph.attackId,name,type,x:s.player.x,y:s.player.y,radius:80,radiusY:44,width:600,height:60,angle:0,remaining:warn,duration:warn,life:.6,active:false,color:b.color,damage:b.damage,...extra};h.totalLife=h.life;s.hazards.push(h);return h;
}

function openCounter(s,sourceId,reason){
 const b=s.boss;if(s.status!=='playing'||b.hp<=0||b.lastCounterSource===sourceId)return;
 b.lastCounterSource=sourceId;b.counterRemaining=1.8;b.counterDuration=1.8;b.counterReason=reason;b.telegraph=null;s.stats.counterWindows++;
 event(s,'counterOpen',b.x,b.y,{bossId:b.id,text:'반격 기회!',reason,duration:1.8,life:1.8,maxLife:1.8,color:'#ffd57c'});
}
function recordPlayerPath(s){
 const last=s.playerHistory.at(-1);if(!last||s.time-last.time>=.099)s.playerHistory.push({x:s.player.x,y:s.player.y,time:s.time});while(s.playerHistory.length&&s.time-s.playerHistory[0].time>2.5)s.playerHistory.shift();
}

/** Shared presentation-only guide for new ordinary mechanics and real counter windows. */
export function getPatternGuide(s){
 const b=s.boss,p=s.player;if(b.counterRemaining>0)return {kind:'counter',title:'반격 기회!',instruction:'보스가 멈췄습니다. 지금 공격하면 피해 +20%!',remaining:b.counterRemaining,duration:b.counterDuration,target:{x:b.x+(p.x<b.x?-65:65),y:b.y},targetReached:groundDistance(p,b)<130,timerLabel:'반격 시간'};
 const a=s.audition;if(a&&!a.selected){const real=a.figures.find(f=>f.real);return{kind:'audition',title:'대역 오디션 · ★ 진짜를 찾아라',instruction:a.active?'★ 진짜 실루엣만 공격하세요. ○ 대역은 피하세요!':'★ 표식을 확인하고 진짜 실루엣 쪽으로 이동하세요.',remaining:a.active?a.remaining:a.warning,duration:a.active?a.duration:a.warningDuration,target:{x:real.x+(p.x<real.x?-65:65),y:real.y},targetReached:groundDistance(p,real)<110,timerLabel:a.active?'선택 시간':'시작까지',figureId:real.id};}
 const lights=s.hazards.filter(h=>h.kind==='rehearsal-light'&&!h.visited).sort((a,b)=>a.index-b.index),h=lights[0];if(h)return{kind:'rehearsal',title:`조명 리허설 ${h.index}/3`,instruction:`${h.index}번 조명 안으로 이동해 잠깐 머무르세요!`,remaining:h.active?h.life:h.remaining,duration:h.active?h.totalLife:h.duration,target:{x:h.x,y:h.y},targetReached:circleContains(p.x,p.y,h),timerLabel:h.active?'조명 유지':'켜질 때까지',index:h.index,total:3};
 const extras=s.hazards.filter(h=>h.extraPattern&&h.kind!=='rehearsal-light');if(!extras.length)return null;const last=extras.reduce((a,b)=>(a.active?a.life:a.remaining+a.life)>(b.active?b.life:b.remaining+b.life)?a:b);return{kind:last.kind.startsWith('encore')?'encore':'replay',title:last.kind.startsWith('encore')?'앙코르 참격 · 마지막 4타 주의':'리플레이 · 기억 경로에서 벗어나기',instruction:last.kind.startsWith('encore')?'빠른 3타 뒤 마지막 4타가 남아 있습니다. 긴 금색 예고까지 피하세요!':'방금 지나온 자리들이 차례로 공격됩니다. 다른 방향으로 이동하세요!',remaining:last.active?last.life:last.remaining+last.life,duration:last.duration+last.totalLife,target:null,timerLabel:'마지막 타격까지'};
}

function beginExtraPattern(s,b,name,warning){
 const p=s.player;event(s,'patternCue',b.x,b.y,{bossId:b.id,kind:{ignis:'rehearsal',mime:'audition',gojo:'replay',sukuna:'encore'}[b.id],text:name,life:.8,maxLife:.8});
 if(b.id==='ignis'){
  const id=++s.uid,dir=p.x<640?1:-1;s.rehearsal={id,successes:0,finished:0,total:3};
  const positions=[[p.x+dir*120,p.y>480?p.y-45:p.y+45],[p.x-dir*40,p.y],[p.x+dir*110,p.y>480?p.y-65:p.y+65]];
  positions.forEach(([x,y],n)=>addHazard(s,b,'circle',name,warning+n*1.05,{x:clamp(x,140,1140),y:clamp(y,390,580),radius:86,radiusY:52,life:.9,damage:b.damage,kind:'rehearsal-light',trialId:id,index:n+1,total:3,visited:false,dwell:0,blocksBoss:true,color:'#b7e6b7'}));
 }else if(b.id==='mime'){
  const id=++s.uid,cx=clamp(p.x+80,300,980),real=b.attacks%3;
  s.audition={id,attackId:b.telegraph.attackId,warning,warningDuration:warning,active:false,remaining:3.6,duration:3.6,selected:null,solved:false,figures:[-1,0,1].map((side,n)=>({...recoilDefaults(),id:'audition-'+id+'-'+n,audition:true,x:cx+side*165,y:clamp(p.y,390,580),hp:1,maxHp:1,stun:0,real:n===real,symbol:n===real?'★':'○',label:n===real?'진짜':'대역',color:n===real?'#ffe59b':'#aaa0bd'}))};
 }else if(b.id==='gojo'){
  const history=s.playerHistory.length?s.playerHistory:[p],path=[1.2,.8,.4,0].map(delay=>{const point=history.reduce((a,c)=>Math.abs(c.time-(s.time-delay))<Math.abs(a.time-(s.time-delay))?c:a);return{x:point.x,y:point.y};});
  path.forEach((point,n)=>addHazard(s,b,'circle',name,warning+n*.26,{...point,radius:78,radiusY:48,life:.25,damage:b.damage*.85,kind:'replay',index:n+1,total:4,path,blocksBoss:true,color:'#b9d5ff'}));
 }else{
  const angle=Math.atan2(p.y-b.y,p.x-b.x);
  for(let n=0;n<3;n++)addHazard(s,b,'lane',name,warning+n*.24,{x:p.x,y:p.y+(n-1)*42,width:1400,height:34,angle:n%2?.23:-.23,life:.18,damage:b.damage*.7,kind:'encore-slash',index:n+1,total:4,blocksBoss:true});
  addHazard(s,b,'lane',name,warning+1.5,{x:p.x,y:p.y,width:1400,height:62,angle:angle+Math.PI/2,life:.28,damage:b.damage*1.15,kind:'encore-finisher',index:4,total:4,late:true,blocksBoss:true,color:'#ffce8a'});
 }
 for(const h of s.hazards)if(h.attackId===b.telegraph.attackId){h.extraPattern=true;h.patternBossId=b.id;h.startDamage=s.stats.damageTaken;}
}
function completeExtraPattern(s,id,bossId,success){if(s.boss.lastExtraCompleteId===id)return;s.boss.lastExtraCompleteId=id;s.stats.extraCompletions[bossId]=(s.stats.extraCompletions[bossId]||0)+1;if(success)s.stats.extraSuccesses[bossId]=(s.stats.extraSuccesses[bossId]||0)+1;}
function finishRehearsalLight(s,h){
 const trial=s.rehearsal;if(!trial||trial.id!==h.trialId)return;trial.finished++;if(h.visited)trial.successes++;else{hurtPlayer(s,h.damage,h);event(s,'rehearsalResult',h.x,h.y,{success:false,index:h.index,total:3,life:.6,maxLife:.6});}
 if(trial.finished===3){if(trial.successes===3){s.stats.rehearsals++;openCounter(s,trial.id,'조명 리허설 성공');}completeExtraPattern(s,h.attackId,'ignis',trial.successes===3);s.rehearsal=null;}
}
function selectAudition(s,figure){
 const a=s.audition;if(!a||!a.active||a.selected)return;a.selected=figure.id;a.solved=figure.real;for(const f of a.figures)f.hp=0;
 event(s,'auditionHit',figure.x,figure.y,{bossId:s.boss.id,success:figure.real,figureId:figure.id,text:figure.real?'진짜를 찾았다!':'대역입니다!',life:.75,maxLife:.75});
 completeExtraPattern(s,a.attackId,'mime',figure.real);
 if(figure.real){s.stats.auditionSuccesses++;a.remaining=.55;openCounter(s,a.id,'대역 오디션 간파');}else{s.stats.auditionMistakes++;hurtPlayer(s,s.boss.damage*.75,{kind:'audition-fake',x:figure.x,y:figure.y});}
}
function updateTrials(s,dt){
 const a=s.audition;if(a){if(!a.active){a.warning=Math.max(0,a.warning-dt);if(a.warning===0){a.active=true;s.stats.extraActivations.mime=(s.stats.extraActivations.mime||0)+1;}}else{a.remaining=Math.max(0,a.remaining-dt);if(a.remaining===0){if(!a.selected)completeExtraPattern(s,a.attackId,'mime',false);s.audition=null;}}}
 if(s.rehearsal&&!s.hazards.some(h=>h.trialId===s.rehearsal.id))s.rehearsal=null;
}

function beginPattern(s){
  const b=s.boss,p=s.player,d=DIFFICULTIES[s.difficulty],intro=b.id==='ignis'||b.id==='mime',turn=b.patternIndex++%5,i=isRankedRun(s)?(b.id==='ignis'?[0,4,1,2,3]:b.id==='mime'?[0,1,4,2,3]:[0,3,1,4,2])[turn]:turn;b.attacks++;
  s.stats.patternCasts[b.id+':'+i]=(s.stats.patternCasts[b.id+':'+i]||0)+1;
  // Opening acts teach their three normal patterns first; later ranked acts retain their established order.
  let warning=([1.15,1.1,1.7,1.8][i])*d.warning*(b.phase===2?.94:1);
  if(b.id==='ignis')warning=([1.6,1.65,1.75,2.65][i])*d.warning;
  if(b.id==='mime')warning=([1.35,1.45,1.55,2.25][i])*d.warning;
  if(b.id==='gojo')warning=([1.05,1.0,1.25,1.85][i])*d.warning*(b.phase===2&&i!==3?.94:1);
  if(b.id==='sukuna')warning=([1.0,1.0,1.3,1.85][i])*d.warning*(b.phase===2&&i!==3?.94:1);
  if(i===3)warning=Math.max(1.65,warning);
  if(i===4)warning=({ignis:1.1,mime:1.1,gojo:1.0,sukuna:.85}[b.id])*d.warning;
  const name=b.patterns[i],angle=Math.atan2(p.y-b.y,p.x-b.x),aim={x:p.x,y:p.y};
  b.telegraph={name,type:'cast',x:p.x,y:p.y,radius:90,width:600,height:60,remaining:warning,duration:warning,dir:p.x>b.x?1:-1,color:b.color,index:i,attackId:++s.uid,angle,aim};b.attackKind=name;
  if(i===3||i===2&&b.id==='gojo')event(s,'domaincut',b.x,b.y,{bossId:b.id,text:name,subtitle:i===3?'안전 조명 밖 = 즉사 · 무적 무효':'위험 예고 · 지금 방향을 정하세요',color:b.color,power:i===3?3:2,life:.75,maxLife:.75});
  if(b.id==='ignis'){
    if(i===0)addHazard(s,b,'circle',name,warning,{x:p.x,y:p.y,radius:80,radiusY:48,life:.75,kind:'footlight'});
    if(i===1)addHazard(s,b,'lane',name,warning,{x:(b.x+p.x)/2,y:(b.y+p.y)/2,width:1100,height:68,angle,life:.6,kind:'light-sweep',damage:b.damage*.95});
    if(i===2)for(let n=0;n<3;n++)addHazard(s,b,'circle',name,warning+n*.28,{x:clamp(p.x+(n-1)*150,76,1204),y:p.y,radius:68,radiusY:42,life:.45,kind:'spark-spot',damage:b.damage*.85});
    if(i===3)domain(s,b,name,warning,2.0,1,160);
  }else if(b.id==='mime'){
    if(i===0)addHazard(s,b,'lane',name,warning,{x:(b.x+p.x)/2,y:(b.y+p.y)/2,width:900,height:64,angle,life:.4,kind:'ribbon-thrust'});
    if(i===1){addHazard(s,b,'circle',name,warning,{x:clamp(p.x+(p.x<640?170:-170),76,1204),y:p.y,radius:105,radiusY:65,life:.55,kind:'mask-feint',decoy:true,cue:'FAKE',damage:0});addHazard(s,b,'circle',name,warning+.2,{x:p.x,y:p.y,radius:105,radiusY:65,life:.55,kind:'mask-slam',decoy:false,cue:'HIT',damage:b.damage*.95});}
    if(i===2)for(let n=0;n<2;n++)addHazard(s,b,'lane',name,warning+n*.35,{x:p.x,y:p.y,width:1000,height:50,angle:angle+(n===0?-.38:.38),life:.35,kind:'ribbon-cross',damage:b.damage*.85});
    if(i===3)domain(s,b,name,warning,2.3,1,138);
  }else if(b.id==='gojo'){
    if(i===0)addHazard(s,b,'circle',name,warning,{x:p.x,y:p.y,radius:130,radiusY:75,life:1.35,color:'#6cbcff',kind:'blue',damage:b.damage*.9});
    if(i===1)addHazard(s,b,'circle',name,warning,{x:b.x,y:b.y,radius:b.phase===2?250:235,radiusY:b.phase===2?145:135,life:.5,color:'#ff718e',kind:'red',damage:b.damage*1.2});
    if(i===2){addHazard(s,b,'lane',name,warning,{x:(b.x+p.x)/2,y:(b.y+p.y)/2,width:1500,height:b.phase===2?118:106,angle,life:.7,color:'#c49cff',kind:'purple',damage:b.damage*1.7,tracking:true,locked:false,lockWindow:.5});Object.assign(b.telegraph,{tracking:true,locked:false,lockWindow:.5});}
    if(i===3)domain(s,b,name,warning,2.6,1.1);
  }else if(b.id==='sukuna'){
    if(i===0)for(let n=0;n<(b.phase===2?4:3);n++)addHazard(s,b,'lane',name,warning+n*.22,{x:p.x,y:p.y+(n-1)*48,width:1450,height:39,angle:n%2?.23:-.23,life:.27,kind:'slash'});
    if(i===1)addHazard(s,b,'circle',name,warning,{x:p.x,y:p.y,radius:130,radiusY:76,life:.5,damage:b.damage*1.35,kind:'cleave'});
    if(i===2){addHazard(s,b,'lane',name,warning,{x:(b.x+p.x)/2,y:(b.y+p.y)/2,width:1450,height:86,angle,life:.7,color:'#ffb46d',kind:'fire-arrow',damage:b.damage*1.5});addHazard(s,b,'circle',name,warning+.35,{x:p.x,y:p.y,radius:160,radiusY:90,life:1.2,color:'#ffb46d',kind:'fire-burst',damage:b.damage*.85});}
    if(i===3)domain(s,b,name,warning,3.0,1.2);
  }
  if(i===4)beginExtraPattern(s,b,name,warning);
  if(i===3)startCinematic(s,'domain',b.id,b.telegraph.name,b.id==='ignis'?.65:b.id==='mime'?.7:.8,b.x,b.y);
}
function domain(s,b,name,warning,life,mult,customRadius){
  const p=s.player,safeX=clamp(p.x+(p.x<640?150:-150),170,1110),safeY=clamp(p.y+(p.y>485?-65:65),400,570);
  const safeRadius=customRadius??((b.id==='sukuna'?100:108)-(b.phase===2?10:0));
  const count=b.takeoverCount++;const type=b.id==='sukuna'&&count%2===1?'chasing-slashes':{ignis:'moving-light',mime:'mask-panels',gojo:'lens-corridors',sukuna:'blade-waves'}[b.id];
  if(type==='chasing-slashes'){name='무대 장악 · 종막 집행 · 추격 난무';b.telegraph.name=name;b.attackKind=name;const cut=s.effects.findLast(e=>e.type==='domaincut'&&e.bossId===b.id);if(cut){cut.text=name;cut.subtitle='조준이 고정되면 방향 전환 · 실제 칼날 접촉 즉사';}}
  s.stats.takeoverCasts[type]=(s.stats.takeoverCasts[type]||0)+1;
  const total=type==='chasing-slashes'?8.05:{ignis:4.8,mime:6.8,gojo:8.95,sukuna:21.35}[b.id];
  const h=addHazard(s,b,'safezone',name,warning,{x:640,y:480,radius:1000,radiusY:500,safeX,safeY,safeRadius,safeRadiusY:safeRadius*.6,life:total,damage:b.damage*mult,kind:'domain',domainType:type,domainPhase:0,elapsed:0,phaseElapsed:0,phaseWarning:false,lethalActive:true,phaseCount:b.id==='sukuna'?5:b.id==='gojo'?4:b.id==='mime'?2:1,baseSafeX:safeX,baseSafeY:safeY});
  configureDomainPhase(s,h,0,false);
  s.spotlight.x=h.safeX;s.spotlight.y=h.safeY;s.spotlight.radius=h.safeRadius;s.spotlight.radiusY=h.safeRadiusY;s.spotlight.timer=-warning-total;s.spotlight.locked=warning+total;
  words(s,h.instruction,h.safeX,h.safeY-110,'#e8ff91',warning);
}
function safeEllipse(x,y,radius,radiusY=radius*.6){return {type:'ellipse',x,y,radius,radiusY};}
function safeRect(x,y,width,height){return {type:'rect',x,y,width,height,angle:0};}
function laneEscape(p,lanes){
  let best={x:640,y:480},score=Infinity;
  for(const r of [70,110,170,240,340,500])for(let n=0;n<24;n++){
    const a=n*Math.PI/12,q={x:clamp(p.x+Math.cos(a)*r,90,1190),y:clamp(p.y+Math.sin(a)*r*.72,350,614)};
    if(lanes.some(l=>regionContains(q.x,q.y,l,24)))continue;
    const d=groundDistance(p,q);if(d<score){best=q;score=d;}
  }return best;
}
const BLADE_LAYOUTS=[
 {vertical:[[405,520],[555,425]],horizontal:[[300,660],[1000,650]],turn:[[420,420],[850,550]]},
 {vertical:[[535,415],[405,550]],horizontal:[[965,620],[300,640]],turn:[[850,420],[420,550]]},
 {vertical:[[430,550],[540,390]],horizontal:[[240,620],[1060,700]],turn:[[440,540],[840,410]]},
];
const dot=(x,y,nx,ny)=>x*nx+y*ny;
function bladeWave(s,h,index,angle,gapStart,gapEnd,gapSize,duration,delay=0,target=null){
 const nx=Math.cos(angle),ny=Math.sin(angle),tx=-ny,ty=nx,corners=[[76,340],[76,624],[1204,340],[1204,624]],normal=corners.map(([x,y])=>dot(x,y,nx,ny)),tangent=corners.map(([x,y])=>dot(x,y,tx,ty));
 const start=Math.min(...normal)-40,end=Math.max(...normal)+40,id=++s.uid;
 const w={id,waveIndex:index,angle,normalX:nx,normalY:ny,tangentX:tx,tangentY:ty,normalStart:start,normalEnd:end,normalPosition:start,previousNormalPosition:start,tangentMin:Math.min(...tangent)-80,tangentMax:Math.max(...tangent)+80,gapStart,gapEnd,gapCenter:gapStart,previousGapCenter:gapStart,gapSize,thickness:22,speed:(end-start)/duration,delay,elapsed:0,duration,started:false,finished:false,cleared:false,target,segments:[],direction:Math.abs(nx)>.9?(nx>0?'left-to-right':'right-to-left'):Math.abs(ny)>.9?(ny>0?'top-to-bottom':'bottom-to-top'):'diagonal'};
 w.x=nx*start+tx*gapStart;w.y=ny*start+ty*gapStart;w.originX=w.x;w.originY=w.y;return w;
}
function bladeRegions(w){
 const d=w.normalPosition,g=w.gapCenter,half=w.gapSize/2,make=(a,b)=>({type:'lane',x:w.normalX*d+w.tangentX*(a+b)/2,y:w.normalY*d+w.tangentY*(a+b)/2,width:b-a,height:w.thickness,angle:w.angle+Math.PI/2,waveId:w.id});
 w.x=w.normalX*d+w.tangentX*g;w.y=w.normalY*d+w.tangentY*g;
 w.gapRegion={type:'lane',x:w.x,y:w.y,width:w.gapSize,height:w.thickness+8,angle:w.angle+Math.PI/2};
 w.segments=w.started&&!w.finished?[make(w.tangentMin,g-half),make(g+half,w.tangentMax)]:[];
}
function bladeNavigation(p,h){
 const focus=h.domainPhase===4?(h.bladeCheckpoint||0):0,w=h.waves?.[focus];if(!w)return {target:{x:p.x,y:p.y},arrivalSeconds:0,reached:true};
 if(w.cleared&&focus===h.waves.length-1)return {target:{x:p.x,y:p.y},arrivalSeconds:0,reached:true,wave:w};
 let target;
 if(w.target)target={x:w.target.x,y:w.target.y};
 else{const pn=dot(p.x,p.y,w.normalX,w.normalY),r=clamp((pn-w.normalStart)/(w.normalEnd-w.normalStart),0,1),g=w.gapStart+(w.gapEnd-w.gapStart)*r;target={x:w.normalX*pn+w.tangentX*g,y:w.normalY*pn+w.tangentY*g};}
 target.x=clamp(target.x,80,1200);target.y=clamp(target.y,344,620);
 const untilStart=!h.active?h.remaining:h.phaseWarning?h.phaseRemaining:Math.max(0,w.delay-h.phaseElapsed),arrival=Math.max(0,(dot(p.x,p.y,w.normalX,w.normalY)-w.normalPosition)/w.speed)+untilStart;
 return {target,arrivalSeconds:arrival,reached:Math.hypot(target.x-p.x,(target.y-p.y)*1.4)<20,wave:w};
}
function bladeGuide(s,h,v){
 const p=s?.player||{x:h.safeX,y:h.safeY},nav=bladeNavigation(p,h),insideSafe=!outsideDomainSafe(p.x,p.y,h),done=nav.wave?.cleared&&h.bladeCheckpoint===h.waves.length-1,turn=h.domainPhase===4&&(h.bladeCheckpoint||0)>0;
 const direction=['왼쪽 → 오른쪽','오른쪽 → 왼쪽','위 → 아래','아래 → 위','대각선 두 번'][h.domainPhase],axis=h.domainPhase<2?'위아래':h.domainPhase<4?'좌우':'표시된 방향';
 const instruction=done?'통과! 다음 칼날이 오는 방향을 확인하세요.':turn?'첫 벽을 통과했어요. 방향을 꺾어 다음 대각선 틈으로!':`${direction} 칼날 벽! ${axis}로 움직여 표시된 틈을 맞추세요.`;
 const targetRegion={type:'ellipse',x:nav.target.x,y:nav.target.y,radius:22,radiusY:16};
 return {...v,target:nav.target,targetRegion,targetReached:nav.reached,destinationReached:nav.reached,transition:v.warning,insideSafe,dangerousNow:v.pulseActive&&!insideSafe,arrivalSeconds:nav.arrivalSeconds,phase:v.phaseIndex,remaining:v.phaseRemaining,title:domainTitle(h,v),instruction,timerLabel:v.warning?'진입 준비':'벽 통과까지',progress:clamp(1-v.phaseRemaining/Math.max(.01,v.phaseDuration),0,1)};
}
function configureBlades(s,h,index,warning){
 h.domainPhase=index;h.phaseWarning=warning;h.phaseElapsed=0;h.safeRegions=[];h.dangerRegions=[];h.lethalActive=!warning;h.sweptHit=false;h.bladeCheckpoint=0;h.phaseCount=5;
 if(h._configuredPhase!==index){
  h._configuredPhase=index;h.bladeVariant??=s.boss.attacks%3;h.bladeMirror??=s.boss.phase===2;
  const layout=BLADE_LAYOUTS[h.bladeVariant],mx=x=>h.bladeMirror?1280-x:x,my=y=>h.bladeMirror?964-y:y;
  if(index<2){const a=layout.vertical[index].map(my),angle=index===0?0:Math.PI,sign=index===0?1:-1;h.waves=[bladeWave(s,h,0,angle,a[0]*sign,a[1]*sign,index?96:100,2.7)];}
  else if(index<4){const a=layout.horizontal[index-2].map(mx),angle=index===2?Math.PI/2:-Math.PI/2,sign=index===2?-1:1;h.waves=[bladeWave(s,h,0,angle,a[0]*sign,a[1]*sign,index===2?150:144,2.35)];}
  else{const [a,b]=layout.turn.map(([x,y])=>({x:mx(x),y:my(y)})),sx=Math.sign(b.x-a.x),sy=Math.sign(b.y-a.y),angles=[Math.atan2(sy,sx),Math.atan2(sy,-sx)];h.waves=[a,b].map((point,n)=>{const angle=angles[n],g=dot(point.x,point.y,-Math.sin(angle),Math.cos(angle));return bladeWave(s,h,n,angle,g,g,160,3,n?1.65:0,point);});}
  const first=h.waves[0];event(s,'bladeWave',first.originX,first.originY,{kind:'warning',waveId:first.id,phase:index,waveIndex:0,direction:first.direction,normalX:first.normalX,normalY:first.normalY,life:.6,maxLife:.6});
 }
 const nav=bladeNavigation(s.player,h);h.safeX=nav.target.x;h.safeY=nav.target.y;h.safeRadius=22;h.safeRadiusY=16;
 if(warning){const time=Math.hypot((nav.target.x-s.player.x)/285,(nav.target.y-s.player.y)/(285*.72));h.phaseDuration=Math.max(1.65,time+.65);const extra=h.phaseDuration-1.65;h.life+=extra;h.totalLife+=extra;}
 else h.phaseDuration=index<2?2.7:index<4?2.35:4.65;
 h.phaseRemaining=h.phaseDuration;h.phaseName=['왼쪽에서 오는 벽','오른쪽에서 오는 벽','위에서 내려오는 벽','아래에서 올라오는 벽','두 대각선 · 방향 전환'][index];h.instruction=warning?'표시된 틈 위치로 이동하세요.':'칼날 벽의 틈을 통과하세요.';
 h.nextSafeRegions=[safeEllipse(nav.target.x,nav.target.y,22,16)];for(const w of h.waves)bladeRegions(w);
}
/** Continuous relative-motion slab test: a dodge cannot jump across a moving blade.
 * During the normal-axis crossing interval the tangential coordinate must remain
 * inside the actual moving gap for the whole interval (linear motion in one step).
 */
export function sweptBladeCollision(from,to,w){
 if(!w.started)return false;const a=dot(from.x,from.y,w.normalX,w.normalY)-w.previousNormalPosition,b=dot(to.x,to.y,w.normalX,w.normalY)-w.normalPosition,half=w.thickness/2,delta=b-a;let enter=0,exit=1;
 if(Math.abs(delta)<1e-10){if(Math.abs(a)>=half)return false;}else{const t1=(-half-a)/delta,t2=(half-a)/delta;enter=Math.max(0,Math.min(t1,t2));exit=Math.min(1,Math.max(t1,t2));if(enter>=exit)return false;}
 const ta=dot(from.x,from.y,w.tangentX,w.tangentY)-w.previousGapCenter,tb=dot(to.x,to.y,w.tangentX,w.tangentY)-w.gapCenter;
 return Math.max(Math.abs(ta+(tb-ta)*enter),Math.abs(ta+(tb-ta)*exit))>w.gapSize/2+1e-9;
}
function projectedBladeHit(s,h){
 if(!h.active||h.phaseWarning)return false;
 return h.waves.some(w=>{const elapsed=h.phaseElapsed+(s._bladeStepDt||0)-w.delay;if(elapsed<0||w.finished)return false;const r=clamp(elapsed/w.duration,0,1),projected={...w,started:true,previousNormalPosition:w.normalPosition,previousGapCenter:w.gapCenter,normalPosition:w.normalStart+(w.normalEnd-w.normalStart)*r,gapCenter:w.gapStart+(w.gapEnd-w.gapStart)*r};return sweptBladeCollision(s._movementStart,s.player,projected);});
}
function updateBlades(s,h,dt){
 h.elapsed+=dt;h.phaseElapsed+=dt;h.phaseRemaining=Math.max(0,h.phaseDuration-h.phaseElapsed);h.sweptHit=false;
 if(h.phaseWarning){if(h.phaseRemaining<=1e-9)configureBlades(s,h,h.domainPhase,false);}
 else{
  const from=s._movementStart||s.player;
  for(const w of h.waves){w.previousNormalPosition=w.normalPosition;w.previousGapCenter=w.gapCenter;
   const elapsed=h.phaseElapsed-w.delay;if(elapsed<0)continue;
   if(!w.started){w.started=true;event(s,'bladeWave',w.originX,w.originY,{kind:'launch',waveId:w.id,phase:h.domainPhase,waveIndex:w.waveIndex,direction:w.direction,normalX:w.normalX,normalY:w.normalY,gapX:w.x,gapY:w.y,life:.45,maxLife:.45});}
   const wasFinished=w.finished;w.elapsed=clamp(elapsed,0,w.duration);const r=w.elapsed/w.duration;w.normalPosition=w.normalStart+(w.normalEnd-w.normalStart)*r;w.gapCenter=w.gapStart+(w.gapEnd-w.gapStart)*r;w.finished=elapsed>=w.duration;bladeRegions(w);
   if(!wasFinished&&sweptBladeCollision(from,s.player,w))h.sweptHit=true;
   const relative=dot(s.player.x,s.player.y,w.normalX,w.normalY)-w.normalPosition;
   if(!w.passNotified&&Math.abs(relative)<90){w.passNotified=true;event(s,'bladeWave',w.x,w.y,{kind:'pass',waveId:w.id,phase:h.domainPhase,waveIndex:w.waveIndex,direction:w.direction,normalX:w.normalX,normalY:w.normalY,life:.25,maxLife:.25});}
   if(w.started&&relative<-w.thickness/2&&!h.sweptHit){w.cleared=true;if(h.domainPhase===4&&w.waveIndex===0)h.bladeCheckpoint=1;}
  }
  h.dangerRegions=h.waves.flatMap(w=>w.segments);
  if(h.phaseRemaining<=1e-9&&!h.sweptHit&&h.domainPhase<4)configureBlades(s,h,h.domainPhase+1,true);
 }
 const nav=bladeNavigation(s.player,h);h.safeX=nav.target.x;h.safeY=nav.target.y;h.arrivalSeconds=nav.arrivalSeconds;h.nextSafeRegions=[safeEllipse(nav.target.x,nav.target.y,22,16)];s._bladeSweepReady=true;
}

function pursuitEvent(s,h,q,kind){event(s,'pursuitSlash',q.x??q.originX,q.y??q.originY,{kind,slashId:q.id,phase:h.domainPhase,beatIndex:h.domainPhase,beatCount:h.phaseCount,section:h.section,variation:h.pursuitVariant,strikeIndex:q.index+1,strikeCount:q.count,shotIndex:q.index+1,shotCount:q.count,globalShotIndex:h.domainPhase*7+q.index+1,scheduledFireTime:q.fireAt!==undefined&&h.burstStartTime!==undefined?h.burstStartTime+q.fireAt:null,actualFireTime:kind==='launch'?s.time:null,followup:q.kind==='followup',cross:q.kind==='cross',originX:q.originX,originY:q.originY,normalX:q.normalX,normalY:q.normalY,direction:q.angle,life:kind==='tracking'?.5:.35,maxLife:kind==='tracking'?.5:.35});}
function pursuitAim(s,h){
 const p=s.player,o=h.origin;h.aimPoint={x:p.x,y:p.y};const angle=Math.atan2(p.y-o.y,p.x-o.x),old=h.history[0]||p,dx=p.x-old.x,dy=p.y-old.y;
 const follow=Math.hypot(dx,dy)>12?Math.atan2(-dy,-dx):angle+Math.PI/2;
 h.aimAngles=h.section==='final'?[angle-.72,angle,angle+.72]:[angle];
 h.previewRegions=h.aimAngles.map((a,i)=>({type:'lane',x:p.x,y:p.y,width:3200,height:h.section==='final'?60:54,angle:a,slashId:h.slashes[i].id,followup:h.section==='pincer',cross:h.section==='final'}));
 for(let i=0;i<h.slashes.length;i++)positionPursuitSlash(h.slashes[i],h.aimAngles[i],p,h.section==='final'?9:h.domainPhase);
 const perpendicular={x:-Math.sin(angle),y:Math.cos(angle)},options=[-1,1].map(sign=>({x:clamp(p.x+perpendicular.x*sign*150,90,1190),y:clamp(p.y+perpendicular.y*sign*150,352,612)}));
 h.target=options.sort((a,b)=>groundDistance(a,{x:640,y:482})-groundDistance(b,{x:640,y:482}))[0];
}
function positionPursuitSlash(q,angle,p,phase){
 const nx=Math.cos(angle),ny=Math.sin(angle),tx=-ny,ty=nx,coordinates=[[76,340],[76,624],[1204,340],[1204,624]].map(([x,y])=>dot(x,y,nx,ny));
 q.angle=angle;q.normalX=nx;q.normalY=ny;q.tangentX=tx;q.tangentY=ty;q.normalStart=Math.min(...coordinates)-100;q.normalEnd=Math.max(...coordinates)+100;q.tangentPosition=dot(p.x,p.y,tx,ty);
 q.normalPosition=q.previousNormalPosition=q.normalStart;q.width=phase===9?128:104;q.height=phase===9?60:54;
 q.delay=0;q.duration=phase===9?.85:phase>=6?.55:.25;q.speed=(q.normalEnd-q.normalStart)/q.duration;
 q.originX=nx*q.normalStart+tx*q.tangentPosition;q.originY=ny*q.normalStart+ty*q.tangentPosition;q.x=q.originX;q.y=q.originY;
}
function pursuitEscape(p,lanes){
 let best=null,score=Infinity;
 for(const radius of [75,105,140,185,240,320])for(let n=0;n<48;n++){
  const angle=n*Math.PI/24,q={x:clamp(p.x+Math.cos(angle)*radius,82,1198),y:clamp(p.y+Math.sin(angle)*radius*.72,346,618)};
  if(lanes.some(l=>regionContains(q.x,q.y,l,18)))continue;
  const cost=Math.hypot((q.x-p.x)/285,(q.y-p.y)/(285*.72));if(cost<score){best=q;score=cost;}
 }
 return best||{x:640,y:480};
}

function configureBurst(s,h,index){
 h.domainPhase=index;h.phaseCount=3;h.section='burst';h.pursuitVariant=index===0?'horizontal-burst':'vertical-burst';h.pursuitState='tracking';h.phaseWarning=true;h.lethalActive=true;h.phaseElapsed=0;h.phaseDuration=2.85;h.phaseRemaining=2.85;h.sweptHit=false;h.safeRegions=[];h.dangerRegions=[];h.previewRegions=[];h.nextSafeRegions=[];h.shotIndex=0;h.nextShotIn=1;h.burstMirror=s.boss.phase===2;h.burstStartX=s.player.x;h.burstMemory=h.active?{x:s.player.x,y:s.player.y}:null;h.burstStartTime=h.active?s.time:undefined;h.phaseName=index===0?'좌우 7연사 · 중간 방향 반전':'상하 7연사 · 가로 이동';h.trackingPending=false;
 h.slashes=Array.from({length:7},(_,i)=>({id:++s.uid,index:i,count:7,kind:'burst',lockAt:.4+i*.2,fireAt:1+i*.2,tracking:true,locked:false,started:false,finished:false,passNotified:false,trackingNotified:false,aimMode:i===1||i===2?'memory':'current'}));
 for(const q of h.slashes)aimBurstSlash(s,h,q);const nav=burstNavigation(s.player,h);h.target=nav.target;h.safeX=nav.target.x;h.safeY=nav.target.y;h.safeRadius=22;h.safeRadiusY=16;h.instruction='7연사 준비! 고정된 선을 보고 계속 움직이세요.';
}
function aimBurstSlash(s,h,q){
 const positive=(q.index%2===0)!==h.burstMirror,angle=h.domainPhase===0?(positive?0:Math.PI):(positive?Math.PI/2:-Math.PI/2),aim=q.aimMode==='memory'&&h.burstMemory?{...h.burstMemory,y:h.domainPhase===0?h.burstMemory.y+(h.burstMirror?-70:70):h.burstMemory.y}:s.player;
 positionPursuitSlash(q,angle,aim,0);q.duration=.45;q.speed=(q.normalEnd-q.normalStart)/q.duration;q.aimPoint={x:aim.x,y:aim.y};q.warningRemaining=Math.max(0,q.fireAt-h.phaseElapsed);
 q.preview={type:'lane',x:aim.x,y:aim.y,width:3200,height:q.height,angle,slashId:q.id,shotIndex:q.index+1,shotCount:7,tracking:!q.locked,locked:q.locked,warningRemaining:q.warningRemaining};
}
function burstNavigation(p,h){
 if(!h.active)return{target:{x:p.x,y:480},navigationPhase:'prepare'};
 if(h.domainPhase===0){const reverse=h.phaseElapsed>=1.05,towardBottom=h.burstMirror?!reverse:reverse;return{target:{x:p.x,y:reverse&&h.phaseElapsed<1.35?p.y:towardBottom?624:340},navigationPhase:reverse?'reverse':'outbound'};}
 return{target:{x:h.burstStartX<640?1204:76,y:p.y},navigationPhase:'cross'};
}
function burstGuide(s,h,v){
 const p=s?.player||{x:h.safeX,y:h.safeY},nav=burstNavigation(p,h),insideSafe=!outsideDomainSafe(p.x,p.y,h),direction=h.domainPhase===0?((h.burstMirror?nav.navigationPhase!=='reverse':nav.navigationPhase==='reverse')?'아래':'위'):(h.burstStartX<640?'오른쪽':'왼쪽');
 const instruction=!h.active?'7연사 준비! 무대 중앙 높이로 이동하세요.':h.domainPhase===0?(nav.navigationPhase==='reverse'?(h.phaseElapsed<1.35?'방향 반전 준비! 앞 칼날이 지나가면 반대로 이동하세요!':`지금 방향 반전! ${h.burstMirror?'위':'아래'}로 계속 이동하며 남은 칼날을 피하세요!`):`좌우에서 7연사! ${h.burstMirror?'아래':'위'}로 계속 이동하고 반전 신호를 기다리세요!`):`위아래에서 7연사! ${h.burstStartX<640?'오른쪽':'왼쪽'}으로 계속 이동하세요!`;
 const navigationCue=!h.active?'prepare':nav.navigationPhase==='reverse'?(h.phaseElapsed<1.35?'turn-wait':'turn'):'move',atBoundary=Math.abs(nav.target.x-p.x)<4&&Math.abs(nav.target.y-p.y)<4,directionLabel=!h.active?'중앙 높이로':navigationCue==='turn-wait'?'반전 준비 · 잠깐 유지':atBoundary?'끝에서 잠깐 유지':`${direction}${direction.endsWith('쪽')?'으로':'로'} 계속`;
 return{...v,...nav,navigationCue,directionLabel,continuous:true,targetRegion:{type:'ellipse',x:nav.target.x,y:nav.target.y,radius:22,radiusY:16},targetReached:groundDistance(p,nav.target)<12,destinationReached:groundDistance(p,nav.target)<12,tracking:h.pursuitState==='tracking',aimLocked:h.pursuitState!=='tracking',pursuitState:h.pursuitState,phase:h.domainPhase,insideSafe,dangerousNow:!!h.active&&!insideSafe,remaining:!h.active?h.remaining:h.phaseRemaining,title:`${h.domainPhase+1}/3 · ${h.phaseName}`,instruction,timerLabel:!h.active?'공격까지':'7연사 진행',shotIndex:h.shotIndex,shotCount:7,nextShotIn:h.nextShotIn,progress:clamp(1-(!h.active?h.remaining:h.phaseRemaining)/(!h.active?h.duration:h.phaseDuration),0,1)};
}
function projectedBurstHit(s,h){
 if(!h.active)return false;return h.slashes.some(q=>{const elapsed=h.phaseElapsed+(s._bladeStepDt||0)-q.fireAt;if(elapsed<0||q.finished)return false;return sweptPursuitCollision(s._movementStart,s.player,{...q,started:true,previousNormalPosition:q.normalPosition,normalPosition:q.normalStart+(q.normalEnd-q.normalStart)*clamp(elapsed/q.duration,0,1)});});
}
function updateBurst(s,h,dt){
 if(!h.burstMemory){h.burstMemory={x:s.player.x,y:s.player.y};h.burstStartTime=s.time-dt;}
 h.elapsed+=dt;h.phaseElapsed+=dt;h.phaseRemaining=Math.max(0,h.phaseDuration-h.phaseElapsed);h.sweptHit=false;
 for(const q of h.slashes){
  if(!q.locked){aimBurstSlash(s,h,q);if(!q.trackingNotified&&(q.index===0||h.slashes[q.index-1].locked)){q.trackingNotified=true;pursuitEvent(s,h,q,'tracking');}if(h.phaseElapsed+1e-9>=q.lockAt){q.locked=true;q.tracking=false;q.preview.tracking=false;q.preview.locked=true;pursuitEvent(s,h,q,'lock');}}
  q.warningRemaining=Math.max(0,q.fireAt-h.phaseElapsed);if(q.preview)q.preview.warningRemaining=q.warningRemaining;
  const elapsed=h.phaseElapsed-q.fireAt;if(elapsed<-1e-9)continue;
  if(!q.started){q.started=true;h.shotIndex++;pursuitEvent(s,h,q,'launch');}
  const wasFinished=q.finished;q.previousNormalPosition=q.normalPosition;const r=clamp(elapsed/q.duration,0,1);q.normalPosition=q.normalStart+(q.normalEnd-q.normalStart)*r;q.x=q.normalX*q.normalPosition+q.tangentX*q.tangentPosition;q.y=q.normalY*q.normalPosition+q.tangentY*q.tangentPosition;q.finished=elapsed>=q.duration;
  q.region={type:'lane',x:q.x,y:q.y,width:q.width,height:q.height,angle:q.angle,slashId:q.id,shotIndex:q.index+1,shotCount:7};
  if(!wasFinished&&sweptPursuitCollision(s._movementStart||s.player,s.player,q))h.sweptHit=true;
  if(!q.passNotified&&Math.hypot(q.x-s.player.x,q.y-s.player.y)<160){q.passNotified=true;pursuitEvent(s,h,q,'pass');}
 }
 h.dangerRegions=h.slashes.filter(q=>q.started&&!q.finished).map(q=>q.region);const next=h.slashes.find(q=>!q.locked);h.previewRegions=h.slashes.filter(q=>q.locked&&!q.started||q===next).map(q=>q.preview);h.nextShotIn=Math.max(0,h.slashes.find(q=>!q.started)?.fireAt-h.phaseElapsed)||0;h.pursuitState=h.shotIndex?'flight':h.slashes.some(q=>q.locked)?'locked':'tracking';h.phaseWarning=!h.shotIndex;
 const nav=burstNavigation(s.player,h);h.target=nav.target;h.safeX=nav.target.x;h.safeY=nav.target.y;h.nextSafeRegions=[safeEllipse(nav.target.x,nav.target.y,22,16)];s._bladeSweepReady=true;
 if(h.phaseRemaining<=1e-9&&!h.sweptHit)configurePursuit(s,h,h.domainPhase+1);
}

function configurePursuit(s,h,index){
 if(index<2){configureBurst(s,h,index);return;}
 h.domainPhase=index;h.phaseCount=3;h.shotIndex=0;h.nextShotIn=null;h.section='final';h.pursuitVariant='cross';h.pursuitState='tracking';h.phaseWarning=true;h.lethalActive=true;h.phaseElapsed=0;h.phaseDuration=.35;h.phaseRemaining=h.phaseDuration;h.sweptHit=false;h.safeRegions=[];h.dangerRegions=[];h.nextSafeRegions=[];h.history=[];
 h.origin={x:640,y:780};h.slashes=Array.from({length:3},(_,i)=>({id:++s.uid,index:i,count:3,kind:'cross',started:false,finished:false,passNotified:false}));
 pursuitAim(s,h);h.safeX=h.target.x;h.safeY=h.target.y;h.safeRadius=22;h.safeRadiusY=16;h.phaseName='3방향 동시 마무리';h.instruction='붉은 조준이 따라옵니다. 계속 움직이세요!';if(h.active)pursuitEvent(s,h,h.slashes[0],'tracking');else h.trackingPending=true;
}
function pursuitNavigation(p,h){
 const escaped=h.active&&h.pursuitState!=='tracking'&&!h.previewRegions.some(r=>regionContains(p.x,p.y,r,8));
 return {target:escaped?{x:p.x,y:p.y}:h.target||{x:h.safeX,y:h.safeY},reached:escaped};
}
function pursuitGuide(s,h,v){
 if(h.section==='burst')return burstGuide(s,h,v);
 const p=s?.player||{x:h.safeX,y:h.safeY},navigation=pursuitNavigation(p,h),target=navigation.target,targetReached=navigation.reached,tracking=h.pursuitState==='tracking',locked=h.pursuitState==='locked',insideSafe=!outsideDomainSafe(p.x,p.y,h);
 const instruction=!h.active?'추격 난무! 붉은 조준은 따라옵니다. 고정 신호 뒤 방향을 꺾으세요.':tracking?`${h.phaseName} · 다시 조준! 움직이며 고정 신호를 보세요!`:locked?(targetReached?'조준 고정! 선 밖으로 나왔습니다. 발사를 기다리세요.':'조준 고정! 화살표 쪽으로 방향을 꺾어 선을 벗어나세요!'):targetReached?(h.domainPhase===h.phaseCount-1?'마지막 세 칼날이 지날 때까지 선 밖 유지! 이후 금색 반격 기회를 잡으세요.':'짧게 선 밖 유지! 곧 다시 조준합니다. 다음 방향 전환을 준비하세요.'):h.section==='final'?'3방향 동시 참격! 세 예고선 밖으로 빠져나가세요.':h.section==='pincer'?'시간차 협공! 새 방향의 칼날을 피하고 다음 조준을 확인하세요.':'단발 칼날! 선 밖에서 다음 고정 신호를 준비하세요!';
 return {...v,target,targetRegion:{type:'ellipse',x:target.x,y:target.y,radius:22,radiusY:16},targetReached,destinationReached:targetReached,tracking,aimLocked:!tracking,pursuitState:h.pursuitState,phase:h.domainPhase,remaining:!h.active?h.remaining:h.phaseRemaining,insideSafe,dangerousNow:!!h.active&&!insideSafe,title:`${h.domainPhase+1}/3 · ${h.phaseName}`,instruction,timerLabel:!h.active?'공격까지':tracking?'조준 추적':locked?'발사까지':'칼날 통과',progress:clamp(1-(!h.active?h.remaining:h.phaseRemaining)/Math.max(.01,!h.active?h.duration:h.phaseDuration),0,1)};
}
/** Exact relative-motion intersection against the current finite moving rectangle. */
export function sweptPursuitCollision(from,to,q){
 if(!q.started)return false;const axes=[[q.normalX,q.normalY,q.previousNormalPosition,q.normalPosition,q.width/2],[q.tangentX,q.tangentY,q.tangentPosition,q.tangentPosition,q.height/2]];let enter=0,exit=1;
 for(const [nx,ny,previous,current,half] of axes){const a=dot(from.x,from.y,nx,ny)-previous,b=dot(to.x,to.y,nx,ny)-current,delta=b-a;
  if(Math.abs(delta)<1e-10){if(Math.abs(a)>=half)return false;}else{const t1=(-half-a)/delta,t2=(half-a)/delta;enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));if(enter>=exit)return false;}
 }return enter<exit&&exit>0&&enter<1;
}
function projectedPursuitHit(s,h){
 if(h.section==='burst')return projectedBurstHit(s,h);
 if(!h.active||h.pursuitState!=='flight')return false;
 return h.slashes.some(q=>{const elapsed=h.phaseElapsed+(s._bladeStepDt||0)-q.delay;if(elapsed<0||q.finished)return false;return sweptPursuitCollision(s._movementStart,s.player,{...q,started:true,previousNormalPosition:q.normalPosition,normalPosition:q.normalStart+(q.normalEnd-q.normalStart)*clamp(elapsed/q.duration,0,1)});});
}
function updatePursuit(s,h,dt){
 if(h.section==='burst'){updateBurst(s,h,dt);return;}
 if(h.trackingPending){h.trackingPending=false;pursuitEvent(s,h,h.slashes[0],'tracking');}
 h.elapsed+=dt;h.phaseElapsed+=dt;h.phaseRemaining=Math.max(0,h.phaseDuration-h.phaseElapsed);h.sweptHit=false;
 if(h.pursuitState==='tracking'){
  h.history.push({x:s.player.x,y:s.player.y,time:s.time});while(h.history.length>1&&s.time-h.history[0].time>.35)h.history.shift();pursuitAim(s,h);
  if(h.phaseRemaining<=1e-9){h.pursuitState='locked';h.phaseElapsed=0;h.phaseDuration=h.section==='final'?1.15:.65;h.phaseRemaining=h.phaseDuration;h.target=pursuitEscape(s.player,h.previewRegions);pursuitEvent(s,h,h.slashes[0],'lock');}
 }else if(h.pursuitState==='locked'){
  if(h.phaseRemaining<=1e-9){h.pursuitState='flight';h.phaseWarning=false;h.phaseElapsed=0;h.phaseDuration=h.section==='final'?.85:.25;h.phaseRemaining=h.phaseDuration;}
 }else{
  for(const q of h.slashes){const elapsed=h.phaseElapsed-q.delay;if(elapsed<0)continue;const wasFinished=q.finished;q.previousNormalPosition=q.normalPosition;
   if(!q.started){q.started=true;h.shotIndex=(h.shotIndex||0)+1;pursuitEvent(s,h,q,'launch');}
   const r=clamp(elapsed/q.duration,0,1);q.normalPosition=q.normalStart+(q.normalEnd-q.normalStart)*r;q.x=q.normalX*q.normalPosition+q.tangentX*q.tangentPosition;q.y=q.normalY*q.normalPosition+q.tangentY*q.tangentPosition;q.finished=elapsed>=q.duration;
   q.region={type:'lane',x:q.x,y:q.y,width:q.width,height:q.height,angle:q.angle,slashId:q.id,followup:q.kind==='followup',cross:q.kind==='cross'};
   if(!wasFinished&&sweptPursuitCollision(s._movementStart||s.player,s.player,q))h.sweptHit=true;
   if(!q.passNotified&&Math.hypot(q.x-s.player.x,q.y-s.player.y)<160){q.passNotified=true;pursuitEvent(s,h,q,'pass');}
  }
  h.dangerRegions=h.slashes.filter(q=>q.started&&!q.finished).map(q=>q.region);
  if(h.phaseRemaining<=1e-9&&!h.sweptHit&&h.domainPhase<h.phaseCount-1)configurePursuit(s,h,h.domainPhase+1);
 }
 const nav=pursuitNavigation(s.player,h);h.safeX=nav.target.x;h.safeY=nav.target.y;h.nextSafeRegions=[safeEllipse(nav.target.x,nav.target.y,22,16)];s._bladeSweepReady=true;
}

function configureDomainPhase(s,h,index,warning){
  if(h.domainType==='blade-waves'){configureBlades(s,h,index,warning);return;}
  if(h.domainType==='chasing-slashes'){configurePursuit(s,h,index);return;}
  h.domainPhase=index;h.phaseWarning=warning;h.phaseElapsed=0;h.nextSafeRegions=[];h.dangerRegions=[];h.safeRegions=[];h.lethalActive=!warning;
  if(h.domainType==='moving-light'){
    h.safeRadius=145;h.safeRadiusY=87;h.safeRegions=[safeEllipse(h.safeX,h.safeY,145,87)];h.phaseDuration=4.8;h.phaseName='움직이는 조명';h.instruction='민트색 조명이 이동합니다. 빛 안에서 계속 따라가세요.';
  }else if(h.domainType==='mask-panels'){
    h.panels=[300,640,980].map((x,n)=>({...safeEllipse(x,480,135,81),index:n,label:String(n+1),shape:['circle','diamond','triangle'][n]}));
    if(h.safeIndex===undefined){h.safeIndex=h.panels.reduce((a,c)=>groundDistance(c,s.player)<groundDistance(a,s.player)?c:a).index;h.nextSafeIndex=h.safeIndex===1?(s.boss.phase===2?0:2):1;}
    const current=h.panels[h.safeIndex],next=h.panels[h.nextSafeIndex];h.safeRadius=135;h.safeRadiusY=81;
    if(warning){h.safeRegions=[current,next,safeRect((current.x+next.x)/2,480,Math.abs(current.x-next.x)+110,120)];h.nextSafeRegions=[next];h.safeX=next.x;h.safeY=480;h.phaseDuration=2;h.lethalActive=true;h.phaseName='배역 교대 예고';h.instruction=`이제 ${['①','②','③'][next.index]} ${['원형','마름모','삼각형'][next.index]} 발판으로! 연결된 길을 따라가세요!`;}
    else {const panel=index===0?current:next;h.safeRegions=[panel];h.safeX=panel.x;h.safeY=panel.y;h.phaseDuration=index===0?2:2.8;h.phaseName=`진짜 가면 ${panel.label}번`;h.instruction=`${['①','②','③'][panel.index]} ${['원형','마름모','삼각형'][panel.index]} 발판 안으로 이동하세요!`;}
  }else if(h.domainType==='lens-corridors'){
    const lanes=[safeRect(640,480,1400,70),safeRect(600,480,160,700),safeRect(640,405,1400,64),safeRect(940,480,144,700)],r=lanes[index];h.safeRegions=[r];h.safeX=r.width>1000?clamp(s.player.x,160,1120):r.x;h.safeY=r.width>1000?r.y:clamp(s.player.y,380,590);h.safeRadius=60;h.safeRadiusY=40;
    if(r.width>1000){const top=r.y-r.height/2,bottom=r.y+r.height/2;h.dangerRegions=[safeRect(640,top/2,1400,top),safeRect(640,(bottom+720)/2,1400,720-bottom)];}
    else{const left=r.x-r.width/2,right=r.x+r.width/2;h.dangerRegions=[safeRect(left/2,480,left,700),safeRect((right+1280)/2,480,1280-right,700)];}
    const dx=Math.max(0,Math.abs(s.player.x-r.x)-r.width/2),dy=Math.max(0,Math.abs(s.player.y-r.y)-r.height/2),walkSeconds=Math.hypot(dx/285,dy/(285*.72));
    h.phaseDuration=warning?Math.max(1.65,walkSeconds+.65):1;if(warning&&h.phaseDuration>1.65){const extra=h.phaseDuration-1.65;h.life+=extra;h.totalLife+=extra;s.spotlight.locked=Math.max(0,s.spotlight.locked||0)+extra;}
    if(!warning&&index<3)h.nextSafeRegions=[lanes[index+1]];h.phaseName=(index%2?'세로':'가로')+' 렌즈 통로';h.instruction=warning?'빔이 꺼진 지금, 다음 민트색 통로로 이동하세요.':(index%2?'세로':'가로')+' 민트색 통로 안에 머무르세요. 다음 방향을 준비하세요.';
  }else{
    if(warning||!h.aimOrigin){h.aimOrigin={x:s.boss.x,y:s.boss.y};h.aimPoint={x:s.player.x,y:s.player.y};h.aimAngle=Math.atan2(s.player.y-s.boss.y,s.player.x-s.boss.x);}
    h.dangerRegions=[-1,0,1].map(n=>({type:'lane',x:(h.aimOrigin.x+h.aimPoint.x)/2,y:(h.aimOrigin.y+h.aimPoint.y)/2,width:1450,height:46,angle:h.aimAngle+n*.24}));
    const target=laneEscape(s.player,h.dangerRegions);h.safeX=target.x;h.safeY=target.y;h.safeRadius=35;h.safeRadiusY=24;h.phaseDuration=warning?1.65:.36;h.phaseName=`${index+1} / 5 박자`;h.instruction=warning?'예고선에 수직으로 빠져나가세요. 다음 박자는 현재 위치를 다시 겨눕니다.':'참격 발동! 선 사이에 머물고 다음 박자 예고에 옆으로 이동하세요.';
  }
  h.phaseRemaining=h.phaseDuration;
}
function updateDomain(s,h,dt){
  if(h.domainType==='blade-waves'){updateBlades(s,h,dt);return;}
  if(h.domainType==='chasing-slashes'){updatePursuit(s,h,dt);return;}
  h.elapsed+=dt;h.phaseElapsed+=dt;h.phaseRemaining=Math.max(0,h.phaseDuration-h.phaseElapsed);
  if(h.domainType==='moving-light'){
    const direction=h.baseSafeX<640?1:-1;h.safeX=clamp(h.baseSafeX+direction*clamp(h.elapsed/4.8,0,1)*330,170,1110);h.safeY=h.baseSafeY+Math.sin(h.elapsed/4.8*Math.PI*2)*20;h.safeRegions=[safeEllipse(h.safeX,h.safeY,145,87)];
  }else if(h.phaseRemaining<=1e-9){
    if(h.domainType==='mask-panels'){if(h.domainPhase===0&&!h.phaseWarning)configureDomainPhase(s,h,0,true);else if(h.phaseWarning)configureDomainPhase(s,h,1,false);}
    else if(h.phaseWarning)configureDomainPhase(s,h,h.domainPhase,false);
    else if(h.domainPhase<h.phaseCount-1)configureDomainPhase(s,h,h.domainPhase+1,true);
  }
  if(h.domainType==='moving-light'){s.spotlight.x=h.safeX;s.spotlight.y=h.safeY;}
}
function resolvePattern(s,t){
  const b=s.boss,p=s.player;b.attackAnim=.7;
  event(s,'burst',b.x,b.y-40,{radius:55,color:b.color,life:.4,maxLife:.4});
}

function updatePlayer(s,input,dt){
  const p=s.player;p.character=s.runCharacter;p.role='sword';const c=CHARACTERS[p.character];p.invuln=Math.max(0,p.invuln-dt);p.hitFlash=Math.max(0,p.hitFlash-dt);p.slow=Math.max(0,p.slow-dt);p.attackAnim=Math.max(0,p.attackAnim-dt);p.attackCooldown=Math.max(0,p.attackCooldown-dt);p.swapCooldown=Math.max(0,p.swapCooldown-dt);
  p.attackProgress=p.attackDuration>0?clamp(1-p.attackAnim/p.attackDuration,0,1):1;
  p.attackBuffer=Math.max(0,p.attackBuffer-dt);for(const key of Object.keys(p.actionQueue)){p.actionQueue[key]-=dt;if(p.actionQueue[key]<=0)delete p.actionQueue[key];}
  for(const key of ['skill','buff','ultimate'])if(input[key])p.actionQueue[key]=.18;
  if(input.attackPressed&&(p.attackCooldown<=0||p.hitStun>0||p.dodgeTimer>0||p.castTimer>0))p.attackBuffer=.18;
  recoil(s,p,dt);p.chainTimer=Math.max(0,p.chainTimer-dt);if(p.chainTimer===0)p.comboIndex=0;p.timingTimer=Math.max(0,p.timingTimer-dt);if(p.timingTimer===0)p.timingGrade='';
  if(input.attackPressed&&p.attackCooldown>0&&p.hitStun<=0&&!p.precisionAttempted){p.precisionAttempted=true;p.queuedAttack=true;if(p.attackCooldown<=.14)p.precisionQueued=true;}
  for(const k of Object.keys(p.cooldowns))p.cooldowns[k]=Math.max(0,p.cooldowns[k]-dt);
  p.buffTimer=Math.max(0,p.buffTimer-dt);if(p.buffTimer===0){p.buffName='';p.shieldCharges=0;p.crewReady=false;}p.castTimer=Math.max(0,p.castTimer-dt);if(p.castTimer===0)p.castRole='sword';
  p.buff=s.spotlight.active&&circleContains(p.x,p.y,s.spotlight);p.energy=Math.min(p.maxEnergy,p.energy+dt*(p.buff?7.5:3.4));p.hype=Math.min(100,p.hype+dt*(p.buff?1.7:.28));if(p.buff)s.stats.spotlightSeconds+=dt;
  let mx=(input.right?1:0)-(input.left?1:0),my=(input.down?1:0)-(input.up?1:0);const length=Math.hypot(mx,my);if(length){mx/=length;my/=length;}if(mx)p.facing=Math.sign(mx);
  if(input.dodge&&p.cooldowns.dodge<=0&&p.dodgeTimer<=0){p.attackSequence=null;p.retreatTimer=0;p.attackBuffer=0;p.queuedAttack=false;p.precisionQueued=false;p.attackAnim=0;p.attackCooldown=0;p.dodgeTimer=.24;p.dodgeElapsed=0;p.dodgeId++;p.invuln=Math.max(p.invuln,.24);p.cooldowns.dodge=1.1;p.dodgeX=mx||(!my?p.facing:0);p.dodgeY=my;s.stats.dodges++;event(s,'ring',p.x,p.y,{radius:45,color:'#e9e9de',life:.25,maxLife:.25});}
  if(p.dodgeTimer>0){p.dodgeTimer=Math.max(0,p.dodgeTimer-dt);p.dodgeElapsed+=dt;p.x+=p.dodgeX*790*dt;p.y+=p.dodgeY*510*dt;}else{const speed=c.speed*(p.buffTimer>0?(p.character==='director'?1.15:1.18):1)*(p.slow>0?.5:1)*(p.hitStun>0?.18:1)*(p.attackAnim>0?.82:1);p.x+=mx*speed*dt;p.y+=my*speed*.72*dt;}
  if(p.retreatTimer>0&&p.dodgeTimer<=0){const retreat=Math.min(dt,p.retreatTimer);p.x+=p.retreatDirection*360*retreat;p.retreatTimer=Math.max(0,p.retreatTimer-dt);}
  p.x=clamp(p.x,BOUNDS.left,BOUNDS.right);p.y=clamp(p.y,BOUNDS.top,BOUNDS.bottom);
  updateAttackSequence(s,dt);
  if(p.hitStun<=0&&p.dodgeTimer<=0&&p.attackSequence?.kind!=='ultimate'){
    if(p.actionQueue.ultimate&&p.hype>=100&&p.cooldowns.ultimate<=0){delete p.actionQueue.ultimate;useUltimate(s);return;}
    if(p.actionQueue.buff&&p.cooldowns.buff<=0){delete p.actionQueue.buff;useBuff(s);}
    if(p.actionQueue.skill&&p.cooldowns.skill<=0&&p.dodgeTimer<=0){delete p.actionQueue.skill;useSkill(s);return;}
    if((input.attack||p.queuedAttack||p.attackBuffer>0)&&p.attackCooldown<=0&&p.dodgeTimer<=0&&p.castTimer<=0&&!p.attackSequence)basicAttack(s);
  }
  p.precisionWindow=p.attackCooldown>0&&p.attackCooldown<=.14&&!p.precisionAttempted;
}
function updateEnemies(s,dt){
  const p=s.player;for(const e of s.enemies){recoil(s,e,dt);if(e.hp<=0)continue;e.hitFlash=Math.max(0,e.hitFlash-dt);e.stun=Math.max(0,e.stun-dt);e.attackAnim=Math.max(0,e.attackAnim-dt);if(e.stun>0)continue;e.facing=p.x>=e.x?1:-1;
    if(e.telegraph>0){e.telegraph-=dt;if(e.telegraph<=0){e.attackAnim=.32;if(groundDistance(e,p)<100)hurtPlayer(s,11+s.stage*2,e);e.attackCooldown=1.7;}continue;}
    e.attackCooldown-=dt;if(groundDistance(e,p)>72){const a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*.8*dt;}else if(e.attackCooldown<=0)e.telegraph=.58;
  }
  s.enemies=s.enemies.filter(e=>e.hp>0);
  if(!s.enemies.length&&!s.boss.active){s.boss.active=true;s.boss.patternCooldown=1.8;words(s,`${s.boss.name}, 등장!`,640,270,s.boss.color,1.5);p.energy=Math.min(100,p.energy+15);}
}
function updateBoss(s,dt){
  const b=s.boss,p=s.player;recoil(s,b,dt);b.hitFlash=Math.max(0,b.hitFlash-dt);b.attackAnim=Math.max(0,b.attackAnim-dt);b.stun=Math.max(0,b.stun-dt);b.shield=Math.max(0,b.shield-dt);if(!b.active||b.hp<=0)return;b.facing=p.x>=b.x?1:-1;
  if(b.hp<=b.maxHp*((b.id==='ignis'||b.id==='mime')?.5:.65)&&b.phase===1){b.phase=2;words(s,'분위기 바뀌었다… 2페이즈!',640,270,b.color,1.7);event(s,'ring',b.x,b.y,{radius:200,color:b.color,life:.7,maxLife:.7});}
  if(b.counterRemaining>0){b.counterRemaining=Math.max(0,b.counterRemaining-dt);return;}
  if(b.telegraph){b.telegraph.remaining-=dt;if(b.telegraph.remaining<=0){resolvePattern(s,b.telegraph);b.telegraph=null;b.patternCooldown=(b.id==='ignis'?(b.phase===2?1.5:1.8):b.id==='mime'?(b.phase===2?1.2:1.45):(b.phase===2?.765:1.08))*DIFFICULTIES[s.difficulty].attackSpeed*(b.id==='sukuna'?.85:1);}return;}
  // A fatal domain owns this attack window; don't fill its only safe area with
  // another boss attack before the domain ends.
  if(s.audition&&!s.audition.selected||s.hazards.some(h=>h.blocksBoss&&h.life>0))return;
  if(s.hazards.some(h=>h.kind==='domain'&&h.active&&h.life>0))return;
  if((b.id==='ignis'||b.id==='mime')&&s.hazards.some(h=>h.life>0))return;
  if(b.stun>0)return;
  b.patternCooldown-=dt;
  // Bosses approach slowly, giving melee characters reliable punish windows.
  // Only positioning changes: no new attack, random draw, timing or stat modifier.
  if(b.hitStun<=0){
    const side=Math.sign(b.x-p.x)||-b.facing,flank=b.attacks%4<2?1:-1;
    const targetX=clamp(p.x+side*(b.id==='ignis'?150:b.id==='mime'?105:b.id==='gojo'?170:100),155,1125),targetY=clamp(p.y+flank*(b.id==='ignis'?35:b.id==='mime'?60:b.id==='gojo'?82:72),375,585);
    const dx=targetX-b.x,dy=targetY-b.y,distance=Math.hypot(dx,dy),travel=Math.min((b.id==='ignis'?52:b.id==='mime'?64:72)*dt,distance);
    if(distance>0){b.x+=dx/distance*travel;b.y+=dy/distance*travel;}
  }
  b.x=clamp(b.x,155,1125);b.y=clamp(b.y,375,585);
  if(b.patternCooldown<=0){if(b.id==='gojo')b.shield=.8;beginPattern(s);}
}
function trackPurple(s,h,dt){
  // This same lane is both the visible warning and the eventual collider.
  // Never retarget in the final half-second, even after a dodge or teleport.
  if(!h.locked&&h.remaining-dt>=h.lockWindow){
    const b=s.boss,p=s.player;h.x=(b.x+p.x)/2;h.y=(b.y+p.y)/2;
    if(Math.hypot(p.x-b.x,p.y-b.y)>1)h.angle=Math.atan2(p.y-b.y,p.x-b.x);
    h.tracking=true;
  }else{h.tracking=false;h.locked=true;}
  const cast=s.boss.telegraph;if(cast?.attackId===h.attackId){cast.tracking=h.tracking;cast.locked=h.locked;cast.lockWindow=h.lockWindow;cast.angle=h.angle;if(h.tracking)cast.aim={x:s.player.x,y:s.player.y};}
}
function updateHazards(s,dt){
  const p=s.player;for(const h of s.hazards){if(!h.active){if(h.kind==='purple')trackPurple(s,h,dt);h.remaining-=dt;if(h.remaining<=0){h.active=true;if(h.extraPattern&&h.index===1)s.stats.extraActivations[h.patternBossId]=(s.stats.extraActivations[h.patternBossId]||0)+1;if(h.kind==='domain')s.stats.takeoverActivations[h.domainType]=(s.stats.takeoverActivations[h.domainType]||0)+1;if(!h.decoy&&h.kind!=='rehearsal-light')event(s,h.type==='lane'?'beam':'burst',h.x,h.y,{radius:h.radius,width:h.width,height:h.height,angle:h.angle,color:h.color,life:.45,maxLife:.45});}else continue;}else{h.life-=dt;if(h.life<=0){if(h.kind==='domain'){s.stats.takeoverSurvived[h.domainType]=(s.stats.takeoverSurvived[h.domainType]||0)+1;openCounter(s,h.id,'무대 장악 생존');}if(h.kind==='rehearsal-light')finishRehearsalLight(s,h);else if(h.extraPattern&&h.index===h.total)completeExtraPattern(s,h.attackId,h.patternBossId,s.stats.damageTaken===h.startDamage);continue;}}
    if(h.decoy)continue;
    if(h.kind==='rehearsal-light'){if(circleContains(p.x,p.y,h)){h.dwell=(h.dwell||0)+dt;if(h.dwell>=.15&&!h.visited){h.visited=true;event(s,'rehearsalResult',h.x,h.y,{success:true,index:h.index,total:3,life:.5,maxLife:.5});}}continue;}
    if(h.kind==='domain'){if(h.domainType)updateDomain(s,h,dt);if(checkActiveDomains(s))return;continue;}
    if(h.kind==='blue'&&groundDistance(p,h)<240&&p.dodgeTimer<=0){const a=Math.atan2(h.y-p.y,h.x-p.x);p.x+=Math.cos(a)*85*dt;p.y+=Math.sin(a)*65*dt;}
    if(isInsideHazard(p.x,p.y,h,-7)){const hit=hurtPlayer(s,h.damage,h);if(hit&&h.kind==='red')p.x=clamp(p.x+Math.sign(p.x-h.x||1)*75,BOUNDS.left,BOUNDS.right);}
  }s.hazards=s.hazards.filter(h=>h.life>0);checkActiveDomains(s);
}
function updateProjectiles(s,dt){
  for(const q of s.projectiles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;if(q.x<20||q.x>1260||q.y<300||q.y>670)q.life=0;if(q.life<=0)continue;
    if(q.owner==='enemy'){if(Math.abs(q.x-s.player.x)<q.radius+20&&Math.abs(q.y-s.player.y)<q.radiusY+18){hurtPlayer(s,q.damage,q);q.life=0;}}
    else for(const t of targets(s)){const id=t===s.boss?'boss':t.id;if(q.hits.includes(id))continue;if(Math.abs(q.x-t.x)<q.radius+34&&Math.abs(q.y-t.y)<q.radiusY+24){hitTarget(s,t,q.damage,{kind:q.finisher?'finisher':q.kind==='arrow'?'basic':'skill',perfect:q.perfect,attackId:q.attackId,hitIndex:q.hitIndex||1,hitCount:q.hitCount||1,source:q.source,signature:q.signature});q.hits.push(id);if(!q.piercing)q.life=0;}}
  }s.projectiles=s.projectiles.filter(q=>q.life>0);
}
function updateSpotlight(s,dt){const sp=s.spotlight;if(sp.locked>0){sp.locked-=dt;return;}sp.radius=105;sp.radiusY=62;sp.timer+=dt;if(sp.timer>8){sp.timer=0;sp.targetX=220+random(s)*830;sp.targetY=410+random(s)*150;}if(sp.targetX!==undefined){sp.x+=(sp.targetX-sp.x)*Math.min(1,dt*.8);sp.y+=(sp.targetY-sp.y)*Math.min(1,dt*.8);}sp.active=true;}

function completeStage(s){
  if(s.boss.hp>0||s.status!=='playing')return false;if(s.transitionTimer>0)return true;
  s.audition=null;s.rehearsal=null;s.stats.stagesCleared++;s.player.attackSequence=null;s.pendingUltimate=false;s.followups=[];s.hazards=[];s.projectiles=[];
  event(s,'comic',640,352,{text:s.boss.review,subtitle:s.boss.name+' · 심사 종료',bossId:s.boss.id,power:1,color:s.boss.color,life:.85,maxLife:.85});
  speak(s,'victory',3);
  if(s.mode==='practice'){s.status='victory';s.endReason='clear';}
  else if(s.mode==='challenge'&&s.stage===BOSSES.length-1){s.status='victory';s.endReason='clear';words(s,'최종 오디션 완료!',640,280,'#e7ff89',5);event(s,'confetti',640,480,{color:'#dfff70',power:3,text:'FINAL CLEAR',life:1.3,maxLife:1.3});}
  else if(isRankedRun(s)){s.transitionTimer=.9;words(s,'오케이! 바로 다음 배우!',640,280,'#e7ff89',.9);event(s,'confetti',640,480,{color:'#dfff70',power:2,text:s.stage===BOSSES.length-1?'앙코르! 아직 시간 남았다!':'NEXT TAKE',life:.9,maxLife:.9});}
  else{s.status=s.stage===BOSSES.length-1?'victory':'stageclear';words(s,s.stage===BOSSES.length-1?'오케이! 전원 퇴근!':'좋았어! 다음 씬으로!',640,280,'#e7ff89',5);}return true;
}

function finishBooth(s){s.status='finished';s.cinematic=null;s.pendingUltimate=false;s.endReason='timeout';s.runTime=s.duration;s.timeLeft=0;s.hazards=[];s.projectiles=[];s.inputBuffer={};event(s,'confetti',640,400,{color:'#e9ff7b',power:3,text:'촬영 종료!',life:2,maxLife:2});}

export function step(s,input={},dt=1/60){
  if(!Number.isFinite(dt)||dt<=0||s.status!=='playing')return s;dt=Math.min(dt,1/30);
  s.runTime+=dt;if(s.mode==='booth'){s.timeLeft=Math.max(0,s.duration-s.runTime);if(s.timeLeft<1e-8){finishBooth(s);return s;}}
  if(s.cinematic){
    s.inputBuffer={};s.player.actionQueue={};s.player.attackBuffer=0;s.player.queuedAttack=false;s.player.precisionQueued=false;s.cinematic.remaining=Math.max(0,s.cinematic.remaining-dt);
    if(s.cinematic.remaining===0){const kind=s.cinematic.kind;s.cinematic=null;if(kind==='playerUltimate'&&s.pendingUltimate)resolveUltimate(s);}
    return s;
  }
  s._movementStart=null;s._bladeSweepReady=true;
  for(const key of EDGES)if(input[key])s.inputBuffer[key]=true;
  if(checkActiveDomains(s))return s;
  if(s.transitionTimer>0){s.transitionTimer-=dt;s.fever=Math.max(0,s.fever-dt);decayEffects(s,dt);if(s.transitionTimer<=0){s.round++;startStage(s,s.round%BOSSES.length);}return s;}
  if(s.inputBuffer.dodge&&s.player.cooldowns.dodge<=0)s.hitStop=0;
  if(s.hitStop>0){const stopped=Math.min(dt,s.hitStop);s.hitStop=Math.max(0,s.hitStop-stopped);dt-=stopped;if(dt<1e-8)return s;}
  input={...input,...s.inputBuffer};s.inputBuffer={};s.time+=dt;s.stageTime+=dt;s.fever=Math.max(0,s.fever-dt);s.comboTimer=Math.max(0,s.comboTimer-dt);if(s.comboTimer===0)s.combo=0;multiplier(s);s.shake=Math.max(0,s.shake-dt*32);decayEffects(s,dt);s.dialogueCooldown=Math.max(0,s.dialogueCooldown-dt);if(s.dialogue){s.dialogue.remaining=Math.max(0,s.dialogue.remaining-dt);if(!s.dialogue.remaining)s.dialogue=null;}
  updateSpotlight(s,dt);s._movementStart={x:s.player.x,y:s.player.y};s._bladeStepDt=dt;s._bladeSweepReady=false;updateTrials(s,dt);updatePlayer(s,input,dt);recordPlayerPath(s);if(s.cinematic)return s;if(checkActiveDomains(s)||completeStage(s))return s;updateFollowups(s,dt);if(completeStage(s))return s;updateEnemies(s,dt);if(s.status!=='playing')return s;updateBoss(s,dt);if(s.cinematic)return s;updateHazards(s,dt);if(s.status!=='playing')return s;updateProjectiles(s,dt);if(!checkActiveDomains(s))completeStage(s);
  return s;
}
