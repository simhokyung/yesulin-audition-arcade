// Canvas 2D battle: illustrated pose atlases, painted scenery and readable grounded VFX.
import { BOSSES, CHARACTERS, SKILL_KITS, isInsideHazard } from './engine.js';
import { drawFighter2D, fighterAtlasStatus, whenFighterAtlasReady } from './fighter2d.js';
import { drawDomainCutscene } from './domain-cinematic.js';
import { BOSS_VISUALS, drawAuditionBackdrop, drawTakeoverSet, drawJudgeTechnique, drawCounterOpening, judgePatternGuide, drawJudgePatternFloor, drawJudgePatternGuides } from './boss-visuals.js';
import { drawUltimatePerformance, drawSequenceTrail, ultimatePhase } from './ultimate-vfx.js';
import { drawCombatCinematic, combatCinematicAssetStatus } from './combat-cinematic.js';
import { drawEmpoweredArrow, drawCueMarks, drawKitEffects, drawDialogueBox, dialogueLayout, drawRoleArrow, drawRolePresence, skillCardState } from './skill-vfx.js';
import { drawTakeoverFloor, drawTakeoverGuides, takeoverInstruction } from './takeover-vfx.js';
import { pursuitVolleyLabel } from './pursuit-vfx.js';
import { isNormalPattern, normalPatternGuide, drawNormalPatternFloor, drawNormalPatternWarnings, drawEnemyProjectile } from './normal-pattern-vfx.js';
const TAU=Math.PI*2;
const SAFE_MINT='#79ffe0';
const domainHazard=s=>s.hazards.find(h=>h.kind==='domain'&&h.type==='safezone');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function poly(c,pts,fill,stroke=null,w=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.lineJoin='round';c.stroke()}}
function line(c,pts,color,w=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke()}
function rect(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function ellipse(c,x,y,rx,ry,color,stroke=null,w=2){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(color){c.fillStyle=color;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke()}}
function text(c,str,x,y,size=14,color='#fff',weight=500,align='left'){c.font=`${weight} ${size}px "Space Grotesk","Noto Sans KR","Apple SD Gothic Neo",sans-serif`;c.textAlign=align;c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(str,x,y)}
function textWithin(c,str,x,y,width,size,color,weight=700){c.save();c.font=`${weight} ${size}px "Space Grotesk","Noto Sans KR","Apple SD Gothic Neo",sans-serif`;let fitted=String(str);if(c.measureText(fitted).width>width){while(fitted&&c.measureText(fitted+'…').width>width)fitted=fitted.slice(0,-1);fitted+='…';}text(c,fitted,x,y,size,color,weight);c.restore();}
function star(c,x,y,r,color,spin=0){let p=[];for(let i=0;i<8;i++){const a=i*Math.PI/4+spin;p.push([x+Math.cos(a)*(i%2?r*.26:r),y+Math.sin(a)*(i%2?r*.26:r)])}poly(c,p,color)}
function shade(c,x,y,w,h){const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#11191c00');g.addColorStop(1,'#11191c55');rect(c,x,y,w,h,g)}

export const drawCharacter=drawFighter2D;

function drawSpotlight(c,sp,t,hideLabel=false){
  if(!sp.active)return;const g=c.createLinearGradient(sp.x-70,100,sp.x,sp.y);g.addColorStop(0,'#f6e9a403');g.addColorStop(.6,'#f6e9a40c');g.addColorStop(1,'#ecf8b229');poly(c,[[sp.x-85,110],[sp.x-55,110],[sp.x+sp.radius,sp.y],[sp.x-sp.radius,sp.y]],g);
  const e=c.createRadialGradient(sp.x,sp.y,0,sp.x,sp.y,sp.radius);e.addColorStop(0,'#e8f5a924');e.addColorStop(1,'#e8f5a906');ellipse(c,sp.x,sp.y,sp.radius,sp.radiusY??62,e,'#e6f5ae65',1.5);
  c.save();c.setLineDash([6,9]);ellipse(c,sp.x,sp.y,sp.radius+5,(sp.radiusY??62)+3,null,'#e2f39438',1);c.restore();
  for(let i=0;i<7;i++){const x=sp.x+Math.sin(i*19+t*.5)*sp.radius*.8,y=sp.y-20-((t*22+i*31)%170);star(c,x,y,2+i%2,'#f3f6d555',t*.2)}
  if(!hideLabel)text(c,'조명 · 공격력 +35%',sp.x,sp.y+(sp.radiusY??62)+18,10,'#d4e9a3a0',600,'center');
}
function drawHazard(c,h,t,reduced=false,paintedEffects=false){
  if(h.warningOnly||h.kind==='projectile-cue')return;
  const color=h.color||'#ee9e78',progress=h.active?1:clamp(1-h.remaining/h.duration,0,1),alpha=h.active?.3:.08+progress*.14;
  if(h.decoy){c.save();c.setLineDash([4,10]);ellipse(c,h.x,h.y,h.radius,h.radiusY??h.radius*.55,'#b4cbd00b','#a2b5bc88',2);c.restore();return;}
  if(h.type==='safezone')return; // Shared takeover geometry is drawn by drawTakeoverFloor.
  c.save();c.translate(h.x,h.y);c.fillStyle=color;c.globalAlpha=alpha;
  if(h.type==='lane'){c.rotate(h.angle||0);rect(c,-h.width/2,-h.height/2,h.width,h.height,color);c.globalAlpha=h.active?.95:.6;c.strokeStyle=color;c.lineWidth=h.active?4:2;c.setLineDash(h.active?[]:[10,8]);c.strokeRect(-h.width/2,-h.height/2,h.width,h.height);c.setLineDash([]);if(h.active&&!paintedEffects){const beam=c.createLinearGradient(0,-h.height/2,0,h.height/2);beam.addColorStop(0,color+'00');beam.addColorStop(.5,'#fff7eacc');beam.addColorStop(1,color+'00');rect(c,-h.width/2,-h.height/2,h.width,h.height,beam);line(c,[[-h.width/2,0],[h.width/2,0]],'#ffffe9',3)}else{rect(c,-h.width/2,-2,h.width*progress,4,color);for(let i=0;i<h.width;i+=75)poly(c,[[-h.width/2+i,-7],[-h.width/2+i+8,0],[-h.width/2+i,7]],null,color,1)}}
  else{ellipse(c,0,0,h.radius,h.radiusY??h.radius*.55,color);c.globalAlpha=.85;c.setLineDash(h.active?[]:[8,5]);ellipse(c,0,0,h.radius,h.radiusY??h.radius*.55,null,color,h.active?3:2);c.setLineDash([]);if(!h.active){c.globalAlpha=.35;ellipse(c,0,0,h.radius*progress,(h.radiusY??h.radius*.55)*progress,color);text(c,h.kind==='meteor'?'!!':'!',0,7,26,color,900,'center')}else if(h.kind==='flowers'){for(let i=0;i<18;i++){const a=i*2.4,r=Math.sqrt(i/18)*h.radius,x=Math.cos(a)*r,y=Math.sin(a)*r*.5;star(c,x,y,7,i%2?'#e8c2c4':'#e3e6b2',i);ellipse(c,x,y,2,2,'#e6cc81')}}else if(paintedEffects){/* Painted active effects are drawn in front of the fighters. */}else if(h.kind==='blue'||h.kind==='red'){c.globalAlpha=.6;for(let i=0;i<4;i++)ellipse(c,0,-25,h.radius*(.2+i*.18),h.radius*(.12+i*.1),null,color,4);ellipse(c,0,-25,29,29,color);star(c,0,-25,21,'#f0f7ff',t*2)}else{for(let i=0;i<8;i++){const a=i*TAU/8,x=Math.cos(a)*h.radius*.65,y=Math.sin(a)*(h.radiusY??h.radius*.55)*.65;c.globalAlpha=.6;poly(c,[[x-20,y],[x-10,y-45],[x+Math.sin(t*15+i)*15,y-90-i%3*15],[x+18,y-17],[x+24,y]],color);c.globalAlpha=.85;poly(c,[[x-10,y],[x,y-47],[x+12,y]],'#f8e4ad')}}}
  c.restore();
}
function effect(c,e,reduced=false){
  const a=clamp(e.life/(e.maxLife||.5),0,1),p=reduced?.45:1-a;c.save();c.globalAlpha=Math.min(1,a*2);
  if(['impact','comic','confetti'].includes(e.type)){comicEffect(c,e,a,p,reduced);c.restore();return;}
  if(e.type==='text'){const y=e.y-p*25,size=e.size||18;c.font=`800 ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;c.textAlign='center';c.lineWidth=5;c.strokeStyle='#142126cc';c.strokeText(e.text,e.x,y);c.fillStyle=e.color;c.fillText(e.text,e.x,y)}
  else if(e.type==='slash'&&drawSequenceTrail(c,e,reduced)){/* Actual rapid strike. */}
  else if(e.type==='slash'){c.translate(e.x,e.y);c.scale(e.facing||1,1);c.rotate(-.65+p*1.3);c.beginPath();c.ellipse(-30,0,(e.radius||90)*.65,58,-.2,-1.5,1.5);c.strokeStyle=e.color;c.lineWidth=10*a+2;c.stroke();c.beginPath();c.ellipse(-30,0,(e.radius||90)*.7,62,-.2,-1.4,1.2);c.strokeStyle='#f3f7d9';c.lineWidth=3;c.stroke()}
  else if(e.type==='ring'){ellipse(c,e.x,e.y,e.radius*(.4+p*.7),(e.radiusY||e.radius*.55)*(.4+p*.7),null,e.color,8*a+1);ellipse(c,e.x,e.y,e.radius*(.3+p*.7),(e.radiusY||e.radius*.55)*(.3+p*.7),null,e.color+'66',3)}
  else if(e.type==='spark'){for(let i=0;i<8;i++){const angle=i*TAU/8;line(c,[[e.x+Math.cos(angle)*12,e.y+Math.sin(angle)*12],[e.x+Math.cos(angle)*(25+p*35),e.y+Math.sin(angle)*(25+p*35)]],i%2?e.color:'#fff1c8',3*a)}star(c,e.x,e.y,20*a,'#fff4c8',p)}
  else if(e.type==='burst'){for(let i=0;i<12;i++){const angle=i*TAU/12,r=(e.radius||70)*p;star(c,e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r*.7,8*a,e.color,i)}}
  else if(e.type==='beam'){c.globalAlpha=a*.35;c.save();c.translate(e.x,e.y);c.rotate(e.angle||0);rect(c,-(e.width||800)/2,-(e.height||70)/2,e.width||800,e.height||70,e.color);c.restore()}
  else if(e.type==='transform'){ellipse(c,e.x,e.y,70*Math.sin(p*Math.PI),100*Math.sin(p*Math.PI),null,e.color,5*a);for(let i=0;i<6;i++)star(c,e.x+Math.cos(i+p*4)*60,e.y+Math.sin(i+p*4)*60,10*a,e.color,p)}
  c.restore();
}
function outlined(c,str,x,y,size,color,align='left'){
  c.save();c.font=`900 ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;c.textAlign=align;c.textBaseline='alphabetic';c.lineJoin='round';c.strokeStyle='#10202a';c.lineWidth=Math.max(3,size*.13);c.strokeText(str,x,y);c.fillStyle=color;c.fillText(str,x,y);c.restore();
}
function jagged(c,x,y,r,color,stretch=1,rotation=0){
  const pts=[];for(let i=0;i<24;i++){const a=i*TAU/24+rotation,rr=r*(i%2?.49:.85+(i%3)*.1);pts.push([x+Math.cos(a)*rr*stretch,y+Math.sin(a)*rr]);}poly(c,pts,color,'#10202a',3);
}
function comicEffect(c,e,a,p,reduced){
  const color=e.color||'#e8ff99',dir=e.direction||e.hitDir||e.facing||1;
  if(e.type==='impact'){
    const radius=(e.radius||44)*(e.finisher?1.35:1),x=e.x,y=e.y-64;
    if(!reduced){
      for(let i=0;i<12;i++){const angle=(i*2.399)+(e.id||0),r=radius*(.45+p*2.2);line(c,[[x+Math.cos(angle)*r*.55,y+Math.sin(angle)*r*.6],[x+Math.cos(angle)*r,y+Math.sin(angle)*r]],i%3?'#ffdd92':color,(1-p)*4+1);}
      for(let i=0;i<5;i++)line(c,[[x-dir*(35+i*12),y-28+i*14],[x-dir*(95+p*80+i*13),y-25+i*15]],color+'99',2);
    }
    c.globalAlpha=Math.min(1,a*2.7);jagged(c,x,y,radius*(reduced?.68:.45+Math.sin(p*Math.PI)*.8),color,1.25,.2);
    jagged(c,x,y,radius*.42,'#fff1cb',1.2,-.2);
    if(e.perfect)outlined(c,'JUST!',x+dir*25,y-40,29,'#eaff92','center');else if(e.finisher||e.kind==='finisher')outlined(c,'빵!!',x+dir*30,y-32,32,'#ffe097','center');
  }else if(e.type==='comic'){
    if((e.subtitle||'').includes('심사 종료')){rect(c,328,236,624,61,'#122632f5',6);rect(c,328,236,4,61,e.color||'#d7e3b6',2);text(c,e.subtitle,640,254,11,'#bacfc8',800,'center');text(c,e.text,640,281,18,'#f0e8ce',800,'center');return;}
    if(e.niceDodge){const xx=clamp(e.x,110,1170),yy=clamp(e.y-178,236,520);outlined(c,'NICE DODGE!',xx,yy,24,'#c6ffe1','center');text(c,'관객 환호!  아슬아슬한 한 걸음',xx,yy+21,11,'#e9ead2',800,'center');for(let i=0;i<6;i++)star(c,xx-60+i*24,yy-30-(i%2)*8,3+2*a,'#d8e9b8',0);return;}
    const x=clamp(e.x||640,160,1120),y=clamp((e.y||400)-146-(reduced?0:p*28),185,530);
    c.save();c.translate(x,y);if(!reduced)c.rotate(-.08);jagged(c,0,-6,Math.min(88,31+(e.text||'').length*4),'#f4eac7',2.2,.1);
    outlined(c,e.text||'이게 된다!',0,3,Math.min(25,230/Math.max(1,(e.text||'').length)),'#263b3e','center');c.restore();
  }else if(e.type==='confetti'){
    const count=reduced?10:38;
    for(let i=0;i<count;i++){const angle=i*2.399+(e.id||0),rr=60+p*(160+(i%7)*27),x=e.x+Math.cos(angle)*rr,y=e.y-65+Math.sin(angle)*rr*.65+p*p*105;c.save();c.translate(x,y);c.rotate(reduced?i:i+p*8);rect(c,-4,-3,8+(i%3)*3,6,['#e8ff99','#ffb287','#baa6ff','#e9dba9'][i%4],1);c.restore();}
    outlined(c,e.text||'오케이! 한 번에 갔어!',clamp(e.x,230,1050),e.y-190,27,'#eaff9a','center');
  }
}
function drawSafetyOutline(c,h,s,t=0,reduced=false){
  if(h.decoy){c.save();c.setLineDash([4,10]);ellipse(c,h.x,h.y,h.radius,h.radiusY??h.radius*.55,null,'#c1d0cfaa',2);c.setLineDash([]);const yy=clamp(h.y+(h.radiusY||55)+12,356,625);rect(c,h.x-68,yy-14,136,23,'#122632ed',3);text(c,'가짜 · FAKE',h.x,yy+2,12,'#c7d8d5',800,'center');c.restore();return;}
  if(isNormalPattern(h))return;
  if(h.kind==='mask-slam'){const yy=clamp(h.y+(h.radiusY||65)+14,356,625);rect(c,h.x-73,yy-14,146,23,'#261c2df2',3);text(c,'위험 · HIT',h.x,yy+3,13,'#f4d5de',900,'center');}
  if(h.type==='safezone'){drawTakeoverGuides(c,s,h,t,reduced);return;}
  if(h.active)return;c.save();const locked=h.kind==='purple'&&h.locked;c.strokeStyle=locked?'#e7d9ff':h.color;c.lineWidth=locked?3:2;c.globalAlpha=.9;c.setLineDash(locked?[]:[8,6]);if(h.kind==='purple'&&h.tracking)c.lineDashOffset=reduced?0:-t*24;
  if(h.type==='lane'){c.translate(h.x,h.y);c.rotate(h.angle||0);c.strokeRect(-h.width/2,-h.height/2,h.width,h.height);}else ellipse(c,h.x,h.y,h.radius,h.radiusY||h.radius*.55,null,h.color,2);c.restore();
}
function drawDomainInstruction(c,s,h){
  if(s.cinematic&&s.cinematic.kind!=='playerUltimate')return;
  const v=takeoverInstruction(s,h),safe=typeof v.targetReached==='boolean'?v.targetReached:v.insideSafe,remaining=v.remaining,progress=Number.isFinite(v.progress)?v.progress:clamp(1-remaining/v.duration,0,1),color=v.statusColor||(safe?SAFE_MINT:'#ffd39a');
  rect(c,276,121,728,113,'#071e27fa',7);rect(c,276,121,5,113,color,2);
  textWithin(c,`${h.name||'무대 장악'}${h.variantName&&h.domainType!=='chasing-slashes'?` · ${h.variantName}`:''}${h.domainType==='chasing-slashes'?` · ${pursuitVolleyLabel(h,v)}`:v.count>1?` · ${v.phase}/${v.count}`:''}`,298,142,540,12,'#d2e4e1',700);
  textWithin(c,v.title,298,172,540,v.title.length>28?16:18,color,900);
  textWithin(c,v.tip,298,198,540,12,'#c5e5df',600);
  text(c,v.timerLabel,982,145,11,color,800,'right');
  text(c,`${remaining.toFixed(1)}초`,984,192,39,'#f3fff5',900,'right');
  rect(c,298,216,683,7,'#345052',3);rect(c,298,216,683*progress,7,color,3);
}
function drawPatternInstruction(c,guide){
 if(!guide)return;const color=guide.color,remaining=Math.max(0,Number(guide.remaining)||0),duration=Math.max(.01,Number(guide.duration)||1);
 rect(c,276,121,728,77,'#10232af5',6);rect(c,276,121,4,77,color,2);
 textWithin(c,guide.title,298,149,420,17,color,900);textWithin(c,guide.tip,298,174,670,12,'#c8ddd5',600);
 text(c,`${guide.timerLabel} ${remaining.toFixed(1)}초`,984,145,12,color,800,'right');
 rect(c,298,187,683,4,'#3a4e51',2);rect(c,298,187,683*clamp(remaining/duration,0,1),4,color,2);
}
function drawPrecision(c,s,reduced){
  const p=s.player;if(!p.precisionWindow&&!p.precisionQueued&&!(p.timingTimer>0))return;
  c.save();
  if(p.precisionWindow||p.precisionQueued){
    ellipse(c,p.x,p.y+6,47,17,'#ddff8d15','#e4ff94',3);
    c.beginPath();c.ellipse(p.x,p.y+6,55,21,0,Math.PI,TAU);c.strokeStyle='#f1ffbb';c.lineWidth=4;c.stroke();
    outlined(c,p.precisionQueued?'PERFECT!':'지금 Q!',p.x,Math.min(642,p.y+62),16,'#edffab','center');
  }
  if(p.timingTimer>0&&p.timingGrade&&p.timingGrade!=='JUST DODGE')outlined(c,p.timingGrade==='JUST DODGE'?'NICE DODGE':p.timingGrade,p.x,p.y-204-(p.launchZ||0),20,'#efffa7','center');
  c.restore();
}
function drawHUD(c,s,reduced=false){
  const p=s.player,b=s.boss,col=CHARACTERS[p.character].color;
  const hp=clamp(p.hp/p.maxHp,0,1),bossHp=clamp(b.hp/b.maxHp,0,1),healthColor=hp<=.3?'#ff9f9b':col;
  // Health and the opponent own the top line; score is deliberately secondary.
  rect(c,24,18,340,94,'#10232aee',7);rect(c,24,18,4,94,healthColor,2);
  text(c,'내 체력',43,42,12,'#d2e5dc',800);text(c,p.character==='director'?'감독':'배우',344,42,12,'#bed3ce',700,'right');
  text(c,String(Math.ceil(p.hp)),43,73,29,healthColor,900);text(c,`/ ${p.maxHp}`,105,71,14,'#b8c9c2',700);
  if(hp<=.3)text(c,'회피 우선',344,70,14,'#ffc4b9',900,'right');
  rect(c,43,85,301,12,'#3d4c4b',3);rect(c,43,85,301*hp,12,healthColor,3);
  rect(c,380,18,876,94,'#10232aee',7);rect(c,380,18,4,94,b.color,2);
  text(c,'현재 상대',400,40,11,'#bfcdc9',700);text(c,BOSS_VISUALS[b.id]?.name||b.name,480,43,25,'#fff0da',900);
  text(c,b.active?`남은 체력 ${Math.ceil(bossHp*100)}%`:'심사 대기',1236,43,21,b.color,900,'right');
  rect(c,400,58,836,17,'#494449',4);rect(c,400,58,836*bossHp,17,b.color,4);
  text(c,s.mode==='practice'?`최대 콤보 ${s.maxCombo||0}회`:`이번 점수 ${Math.floor(s.score).toLocaleString('ko-KR')}`,400,99,11,'#a8bcb5',700);
  text(c,b.active?`${Math.ceil(b.hp).toLocaleString('ko-KR')} / ${b.maxHp.toLocaleString('ko-KR')}`:`엑스트라 ${s.enemies.length}명 남음`,818,99,11,'#c0ceca',600,'center');
  text(c,`${s.mode==='practice'?'1:1 연습 · ':''}${BOSS_VISUALS[b.id]?.audition||'오디션'}`,1236,99,11,'#adbfba',700,'right');
  const domain=domainHazard(s),special=normalPatternGuide(s)||judgePatternGuide(s),counter=b.counterRemaining>0?{title:'반격! 지금 공격하세요',tip:'피해 +20% · Q / W / R로 공격!',remaining:b.counterRemaining,duration:b.counterDuration||1.8,color:'#ffda84',timerLabel:'반격 시간'}:null;if(domain)drawDomainInstruction(c,s,domain);else if(!s.cinematic&&(counter||special))drawPatternInstruction(c,counter||special);
  if(b.telegraph&&!s.cinematic&&!domain&&!special&&!counter){const te=b.telegraph,purple=b.id==='gojo'&&te.index===2,detail=purple?(te.tracking?'추적 중 · 계속 이동':te.locked?'방향 고정 · 선 옆으로 회피':'공격선 옆으로 회피'):'',width=purple?590:410,x=640-width/2,height=purple?68:44;
    rect(c,x,121,width,height,'#231f27ed',4);text(c,te.name,640,145,16,te.color,800,'center');
    if(purple)text(c,detail,640,172,16,te.locked?'#d5ffe8':'#e2ceff',900,'center');
    rect(c,x,121+height-3,width*clamp(1-te.remaining/te.duration,0,1),3,te.locked?'#b1ffe0':te.color);
    if(te.remaining<=.3&&!purple){rect(c,x,121,4,height,'#f1ff99');text(c,p.character==='director'&&p.cooldowns.skill<=0?'지금 W! · 컷 타이밍':'위험! 회피 타이밍',640,180,11,'#efffa2',900,'center');}
  }
  if(p.buff&&!domain){rect(c,43,121,166,25,'#d8ef9928',3);text(c,'✦  조명 버프 · 공격력 +35%',54,138,10,'#e0f7a3',700)}
  if(s.combo>1){
    const fever=Number(s.fever)>0||s.fever===true;
    c.save();c.translate(1224,206);if(!reduced)c.rotate(-.055);
    outlined(c,String(s.combo).padStart(2,'0'),0,0,55,fever?'#ffcb76':'#e6f9b1','right');
    text(c,s.combo>=32?'S · 관객 기립!':s.combo>=16?'A · 무대 장악!':s.combo>=8?'B · 좋은 호흡!':'연속 적중',0,23,13,fever?'#ffdba2':'#e2e9ce',900,'right');
    text(c,`점수 ×${Number(s.multiplier||1).toFixed(1)}`,0,46,13,'#d4c3ff',800,'right');c.restore();
  }
  if((Number(s.fever)>0||s.fever===true)){rect(c,38,165,202,34,'#f5bf641f',4);outlined(c,'관객 열광!',48,188,18,'#ffd386');}
  if(s.transitionTimer>0&&!s.effects.some(e=>(e.subtitle||'').includes('심사 종료'))){outlined(c,'좋았어! 다음 심사 바로 갑니다!',640,308,25,'#e5ff98','center');}
  if(p.comboIndex>0){
    text(c,'Q 연속 공격',44,218,10,'#bdc9b6',800);
    for(let i=1;i<=4;i++){const on=i===p.comboIndex;rect(c,43+(i-1)*41,227,33,26,on?'#e6ff93':'#243b3de6',4);text(c,i===4?'강타':String(i),59+(i-1)*41,245,i===4?10:14,on?'#21332a':'#8b9f95',900,'center');}
    text(c,domain?'안전지대부터!':p.precisionQueued?'강타 준비!':p.precisionWindow?'지금 Q!':'Q를 누르고 있으면 연속 공격',44,271,11,p.precisionWindow||p.precisionQueued?'#eaff99':'#99ada0',800);
  }
  if(p.attackSequence?.kind==='ultimate'){rect(c,43,288,197,52,'#132933e8',5);text(c,ultimatePhase(p.character,p.attackSequence.hitIndex).label,54,305,12,ultimatePhase(p.character,p.attackSequence.hitIndex).color,800);text(c,`${p.attackSequence.hitIndex} / ${p.attackSequence.hitCount} 타격`,54,329,22,'#f1edd5',900);}
  if(p.buffTimer>0){rect(c,43,151,205,25,'#b9b0ef28',3);text(c,`${p.buffName} · ${p.buffTimer.toFixed(1)}초`,54,168,11,'#e4d9ff',800);}
  const kit=SKILL_KITS[p.character],short=p.character==='director'?['슬레이트 난타','레디 액션!','스태프 지휘','전원 액션!']:['검사 연기','궁수 연기','메소드 몰입','커튼콜!'],abilities=[['Q',short[0],p.attackCooldown],['W',short[1],p.cooldowns.skill],['E',short[2],p.cooldowns.buff],['R',short[3],p.cooldowns.ultimate],['SPACE','회피',p.cooldowns.dodge]];
  abilities.forEach(([key,name,cooldown],i)=>{
    const signature=skillCardState(s,key),x=220+i*170,y=646,w=156,blocked=cooldown>0,charged=key!=='R'||p.hype>=100,ready=!blocked&&charged;
    rect(c,x,y,w,65,ready?'#182f35f5':'#0a1825f5',6);rect(c,x,y,w,3,ready?'#a9e7c9':'#54636e',2);
    rect(c,x+7,y+8,key==='SPACE'?49:26,23,ready?'#c0ecce':'#34434e',3);text(c,key,x+(key==='SPACE'?31:20),y+25,key==='SPACE'?9:15,ready?'#14352d':'#a2b0b8',900,'center');
    text(c,name,x+(key==='SPACE'?65:41),y+24,key==='E'?11:12,'#eef1df',800);
    if(signature){c.save();c.strokeStyle=signature.color;c.lineWidth=ready?2.5:1.5;c.strokeRect(x+1,y+1,w-2,63);c.restore();text(c,signature.label,x+8,y+42,11,signature.color,900);}
    if(key==='E'&&p.buffTimer>0&&!signature)text(c,`강화 ${p.buffTimer.toFixed(1)}초`,x+8,y+41,11,'#e4cfa1',800);
    if(blocked){text(c,'재사용',x+8,y+58,10,'#99b0b5',700);text(c,`${cooldown<3?(Math.ceil(cooldown*10)/10).toFixed(1):Math.ceil(cooldown)}초`,x+w-9,y+58,27,'#f5e8d0',900,'right');}
    else if(!charged){text(c,'충전 중',x+8,y+58,11,'#a9bed2',700);text(c,`${Math.floor(p.hype)}%`,x+w-9,y+58,27,'#c6d8ef',900,'right');}
    else{text(c,key==='R'?'R 궁극기 준비':signature?key==='W'?'W로 연계 발동':key==='Q'?'Q로 강마무리':'후속 타격 대기':key==='Q'?'길게 눌러 연타':'사용 가능',x+8,y+57,14,'#bff0ce',800);}
    if(key==='R'){rect(c,x+7,y+61,w-14,3,'#3a4955',1);rect(c,x+7,y+61,(w-14)*clamp(p.hype/100,0,1),3,ready?'#e2f4a4':'#aac8e8',1);}
  });

}
function drawLowHealth(c,s){
 const p=s.player;if(s.cinematic||domainHazard(s)||p.hp<=0||p.hp/p.maxHp>.3)return;
 const side=s.boss.x>=p.x?-1:1,x=clamp(p.x+side*96,80,1200),y=clamp(p.y-83,258,590);
 rect(c,x-57,y-22,114,37,'#301f2bef',5);text(c,'체력 부족',x,y-6,12,'#ffb4a5',900,'center');
 rect(c,x-42,y+3,84,4,'#643c46',2);rect(c,x-42,y+3,84*clamp(p.hp/p.maxHp,0,1),4,'#ffc0af',2);
}
function drawLanding(c,e,reduced){const a=clamp(e.life/(e.maxLife||.4),0,1),p=reduced?.4:1-a;for(let i=0;i<(reduced?4:8);i++){const angle=i*2.399,r=(19+p*45)*(e.power||1);ellipse(c,e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r*.28,3+p*9,2+p*3,'#c9c9ac'+Math.round(a*60).toString(16).padStart(2,'0'));}ellipse(c,e.x,e.y,19+p*35,6+p*8,null,'#d7ddbf'+Math.round(a*80).toString(16).padStart(2,'0'),1.2)}
export class Renderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.bg=new Map();this.previousUnits=new WeakMap();this.lastState=null;this.deathTimes=new WeakMap();this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');this.reduceMotion=this.motionQuery.matches;this.motionQuery.addEventListener?.('change',e=>{this.reduceMotion=e.matches});for(const id of Object.keys(BOSS_VISUALS)){const b=document.createElement('canvas');b.width=1280;b.height=720;drawAuditionBackdrop(b.getContext('2d'),id);this.bg.set(id,b)}}
 render(s,time,{lobby=false,selected='director'}={}){
  const c=this.ctx,reduced=this.reduceMotion;if(!reduced&&!s?.hitStop)this.visualTime=time;const t=reduced?0:this.visualTime??time,stage=lobby?'ignis':s.boss.id;
  c.clearRect(0,0,1280,720);c.save();if(!lobby&&s.shake>0&&!reduced)c.translate(Math.sin(t*57)*Math.min(4,s.shake*.28),Math.cos(t*51)*Math.min(3,s.shake*.18));c.drawImage(this.bg.get(stage)||this.bg.get('ignis'),0,0);
  // Painted lighting lifts silhouettes against the set, without flattening the stage.
  const wash=c.createRadialGradient(650,355,100,650,420,640);wash.addColorStop(0,'#8faeb313');wash.addColorStop(1,'#10202a00');rect(c,0,120,1280,600,wash);
  if(lobby){
   drawSpotlight(c,{x:848,y:570,radius:172,radiusY:67,active:true},t,true);ellipse(c,850,589,78,19,'#10212c88');drawFighter2D(c,selected,850,586,2.05,{time:t,facing:1,reduced,attack:0,attackProgress:1});text(c,selected==='actor'?'배우':'감독',851,623,12,'#e6e8cd',800,'center');
  }else{
   if(this.lastState!==s){this.previousUnits=new WeakMap();this.lastState=s;}
   if(this.lastBoss!==s.boss){this.previousUnits=new WeakMap();this.lastBoss=s.boss;}
   drawTakeoverSet(c,s,t,reduced);
   if(s.player.attackSequence?.kind==='ultimate'){c.save();c.globalAlpha=.20*Math.min(1,.35+s.player.attackSequence.elapsed*4);rect(c,0,115,1280,530,'#04101e');c.restore();}
   if(!domainHazard(s)&&!s.hazards.some(h=>h.kind==='rehearsal-light'))drawSpotlight(c,s.spotlight,t);
   drawJudgePatternFloor(c,s,t,reduced);
   for(const h of s.hazards){if(h.type==='safezone')drawTakeoverFloor(c,s,h,t,reduced);else if(h.kind!=='rehearsal-light')drawHazard(c,h,t,reduced,true);}
   drawNormalPatternFloor(c,s,t,reduced);
   for(const e of s.effects)if(e.type==='landing')drawLanding(c,e,reduced);
   const units=[...s.enemies.map(unit=>({unit,kind:'extra'})),...(s.audition&&!s.audition.solved?(s.audition.figures||[]).map(unit=>({unit,kind:'mime',auditionFigure:true})):[]),{unit:s.boss,kind:s.boss.id},{unit:s.player,kind:s.player.character}].sort((a,b)=>a.unit.y-b.unit.y);
   for(const {unit:u,kind,auditionFigure}of units){let deathProgress=0;if(u.hp<=0){if(u!==s.boss)continue;if(!this.deathTimes.has(u))this.deathTimes.set(u,time);deathProgress=clamp((time-this.deathTimes.get(u))/.8,0,1);if(time-this.deathTimes.get(u)>1.5)continue;}const previous=this.previousUnits.get(u),dt=previous?clamp(t-previous.time,0,.05):1/60,distance=previous?Math.hypot(u.x-previous.x,(u.y-previous.y)*1.25):0,moving=distance>.10&&!(u.dodgeTimer>0)&&!(u.launchZ>1)&&!(u.hitReaction>0),walkTarget=moving?Math.min(1,distance/Math.max(1,dt*220)):0;
    const walkWeight=(previous?.walkWeight||0)+(walkTarget-(previous?.walkWeight||0))*(1-Math.exp(-dt*19)),walkPhase=(previous?.walkPhase||0)+(moving?distance*.04:0),walking=walkWeight>.04;
    this.previousUnits.set(u,{x:u.x,y:u.y,time:t,walkWeight,walkPhase});
    const airborne=Math.min(.5,(u.launchZ||0)/110);ellipse(c,u.x,u.y+3,27*(1-airborne),8*(1-airborne*.3),'#0a192b77');
    if(u===s.boss&&s.player.attackSequence?.kind==='ultimate'){const glow=c.createRadialGradient(u.x,u.y-85,20,u.x,u.y-85,155);glow.addColorStop(0,s.player.character==='actor'?'#799ffb47':'#e4cd9c3b');glow.addColorStop(1,'#ffffff00');rect(c,u.x-155,u.y-240,310,310,glow);}
    if(u.buffTimer>0){c.save();c.globalAlpha=.35;ellipse(c,u.x,u.y,41,14,null,CHARACTERS[u.character]?.color||'#dcff9b',2);for(let i=0;i<5;i++){const yy=u.y-12-((i*24+(reduced?30:t*22))%132);star(c,u.x+Math.sin(i*2.3)*25,yy,2.6,CHARACTERS[u.character]?.color||'#dcff9b',0)}c.restore()}
    const duration=u.attackDuration||(u.attackKind==='skill'?.65:u.attackKind==='ultimate'?1.2:.7),progress=u.attackDuration?u.attackProgress:clamp(1-(u.attackAnim||0)/duration,0,1);
    const sequence=u===s.player?u.attackSequence:null;let poseProgress=progress,poseKind=u.attackKind,poseCombo=u.comboIndex||1,poseRole=u.castRole==='bow'&&u.castTimer>0?'bow':'sword';
    if(sequence?.hitIndex>0){const interval=sequence.kind==='ultimate'?.2:.1,age=Math.max(0,sequence.elapsed-(sequence.hitIndex-1)*interval);poseProgress=clamp(.35+age/interval*.65,0,1);poseCombo=(sequence.hitIndex-1)%4+1;
      const finish=sequence.hitIndex===sequence.hitCount&&sequence.finisher;poseKind=finish?'finisher':u.character==='director'?'slate':'sword';if(sequence.kind==='ultimate'){const phase=ultimatePhase(u.character,sequence.hitIndex);poseKind=phase.pose;poseRole=phase.role;}if(finish)poseCombo=4;
    }
    c.save();if(u===s.boss&&!s.boss.active)c.globalAlpha=.5;if(auditionFigure)c.globalAlpha=s.audition.active===false?.18:.62;
    drawFighter2D(c,kind,u.x,u.y-(u.launchZ||0),auditionFigure?.84:kind==='extra'?.92:1,{unit:u,facing:u.facing||1,time:t,attack:u.attackAnim||0,attackKind:poseKind,attackProgress:poseProgress,comboIndex:poseCombo,role:poseRole,walk:walking,walkWeight,walkPhase,dodge:u.dodgeTimer||0,buffTimer:u.buffTimer||0,hitStun:u.hitStun||0,hitReaction:u.hitReaction||0,hitKind:u.hitKind,hitPower:u.hitPower,hitDir:u.hitDir||1,launchZ:u.launchZ||0,landingTimer:u.landingTimer||0,landingPower:u.landingPower||0,dead:u.hp<=0,deathProgress,windup:!!(u===s.boss&&s.boss.telegraph),domain:!!(u===s.boss&&s.boss.telegraph?.index===3),reduced});
    if(u===s.player){poly(c,[[u.x-5,u.y+20],[u.x+5,u.y+20],[u.x,u.y+14]],CHARACTERS[u.character].color,null);if(!domainHazard(s))text(c,u.character==='director'?'감독':poseRole==='bow'?'배우 · 궁수':u.buffTimer>0?'검사 · 몰입':'배우 · 검사',u.x,Math.min(637,u.y+33),9,CHARACTERS[u.character].color,700,'center')}
    else if(kind==='extra'){rect(c,u.x-22,u.y-195,44,3,'#142530');rect(c,u.x-22,u.y-195,44*u.hp/u.maxHp,3,'#acbba8');}
    c.restore();
   }
   drawLowHealth(c,s);
   for(const q of s.projectiles){if(q.owner==='enemy')drawEnemyProjectile(c,q,reduced);else if(q.empowered)drawEmpoweredArrow(c,q,reduced);else drawRoleArrow(c,q,reduced);}
   drawRolePresence(c,s,t,reduced);
   drawKitEffects(c,s,t,reduced);
   drawUltimatePerformance(c,s,t,reduced);
   if(s.player.character==='director')drawCueMarks(c,s.boss,s.boss.cueMarks||0,t,reduced);
   for(const h of s.hazards)drawJudgeTechnique(c,h,s,t,reduced);
   for(const e of s.effects){if(e.type==='auditionHit'){effect(c,{...e,type:'text',text:e.success?'진짜 발견!':'대역! 체력 감소',color:e.success?'#ffda84':'#ffb3a5',y:e.y-170,size:17},reduced);continue;}if(e.type==='rehearsalResult'&&!e.success){effect(c,{...e,type:'text',text:`${e.index}번 조명 놓침`,color:'#ffb3a5',y:e.y-80,size:15},reduced);continue;}if(e.type==='supportBurst'||e.type==='dialogue'||e.type==='signature'||e.type==='ultimateFinish'||e.type==='impact'&&(e.kind==='ultimate'||['cue-detonation','staff','adlib-arrow'].includes(e.source||e.signature)))continue;if(e.type==='comic'&&(e.subtitle||'').includes('심사 종료'))continue;if(s.player.attackKind==='ultimate'&&s.player.attackAnim>0&&(e.type==='beam'||e.type==='slash'&&e.power===2||e.type==='ring'&&e.radius===420))continue;if(e.type==='landing'||e.type==='domaincut'||e.type==='skillcut'||e.type==='cinematic')continue;if(e.type==='text'&&domainHazard(s)&&!/^[+−\-]?\d+(?:\.\d+)?$/.test(String(e.text||'')))continue;effect(c,e.type==='text'&&e.text==='오늘도 무사히 크랭크인!'?{...e,text:'최종 오디션, 액션!'}:e.type==='comic'&&e.text==='JUST DODGE!'?{...e,text:'NICE DODGE!',niceDodge:true}:e,reduced);}
   const review=s.effects.find(e=>e.type==='comic'&&(e.subtitle||'').includes('심사 종료'));if(review)effect(c,review,reduced);
   if(!domainHazard(s))drawCounterOpening(c,s.boss,s.boss.counterRemaining||0,s.boss.counterDuration||1.8,t,reduced);
   for(const h of s.hazards)if(h.kind!=='rehearsal-light')drawSafetyOutline(c,h,s,t,reduced);
   drawJudgePatternGuides(c,s,t,reduced);
   drawNormalPatternWarnings(c,s,t,reduced);
   if(!domainHazard(s))drawPrecision(c,s,reduced);drawHUD(c,s,reduced);
   if(!s.cinematic&&!domainHazard(s)&&!s.projectiles.some(q=>q.owner==='enemy')){const speech=s.effects.filter(e=>e.type==='dialogue').at(-1);if(speech){const layout=dialogueLayout(c,s,speech);if(layout)drawDialogueBox(c,speech,{state:s,layout});}}
  }
  c.restore();
  if(!lobby&&s.cinematic?.kind==='domain')drawDomainCutscene(c,s,t,reduced);
  else if(!lobby&&drawCombatCinematic(c,s,t,reduced)){
    // Even an ultimate portrait cannot cover a live takeover's actual escape geometry.
    if(s.hazards.length){for(const h of s.hazards)drawSafetyOutline(c,h,s,t,reduced);drawNormalPatternWarnings(c,s,t,reduced);const h=domainHazard(s);if(h)drawDomainInstruction(c,s,h);}
  }
  if(this.canvas.dataset){this.canvas.dataset.gameRenderer='canvas-2d';this.canvas.dataset.worldRenderer='canvas-2d';this.canvas.dataset.vfxRenderer='canvas-2d';this.canvas.dataset.worldCamera=!lobby&&s.cinematic?`${s.cinematic.kind}-illustration`:'battle';this.canvas.dataset.fighterAtlases=JSON.stringify(fighterAtlasStatus());this.canvas.dataset.combatCinematicAssets=JSON.stringify(combatCinematicAssetStatus());}
 }
}
const INK_RENDER='#172b36';
export function drawPortrait(canvas,character){const c=canvas.getContext('2d');c.clearRect(0,0,220,240);const g=c.createRadialGradient(110,120,2,110,120,140);g.addColorStop(0,character==='director'?'#76945b3d':'#b78caa2e');g.addColorStop(1,'#10263100');rect(c,0,0,220,240,g);drawFighter2D(c,character,110,280,1.44,{facing:1,time:0,attackProgress:1,reduced:true});whenFighterAtlasReady(character,()=>drawPortrait(canvas,character));}
