/** Personal audition techniques. Every dangerous body and floor shape comes from engine geometry. */
import { getPersonalityGuide, PERSONALITY_LINES } from './engine.js';
import { dialogueLayout, drawDialogueBox } from './skill-vfx.js';
import { drawRedCapBottle } from './bottle-vfx.js';
import { BOSS_VISUALS } from './boss-visuals.js';
const TAU=Math.PI*2,INK='#102530',RED='#ff9b9e',LOCK='#ffe6a2',ACTIVE='#ff806a';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const number=n=>['①','②','③'][(n||1)-1]||String(n||1);
const QUOTES=PERSONALITY_LINES;
export const isPersonalityPattern=h=>h?.personalityPattern===true;
function line(c,pts,color,w=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();}
function oval(c,x,y,rx,ry,fill,stroke=null,w=1){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function box(c,x,y,w,h,fill,r=3){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(c,str,x,y,size=12,color=LOCK){c.save();c.textAlign='center';c.textBaseline='alphabetic';c.font=`900 ${size}px "Noto Sans KR",sans-serif`;c.strokeStyle=INK;c.lineWidth=4;c.lineJoin='round';c.strokeText(str,x,y);c.fillStyle=color;c.fillText(str,x,y);c.restore();}
function floorClip(c){c.beginPath();c.rect(45,328,1190,314);c.clip();}
function arrow(c,a,b,color,w=1.5){line(c,[[a.x,a.y],[b.x,b.y]],color,w);const angle=Math.atan2(b.y-a.y,b.x-a.x);line(c,[[b.x-Math.cos(angle-.48)*9,b.y-Math.sin(angle-.48)*9],[b.x,b.y],[b.x-Math.cos(angle+.48)*9,b.y-Math.sin(angle+.48)*9]],color,w);}
function lane(c,h,fill,stroke,w=1.5){c.save();c.translate(h.x,h.y);c.rotate(h.angle||0);if(fill)box(c,-h.width/2,-h.height/2,h.width,h.height,fill,0);if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.strokeRect(-h.width/2,-h.height/2,h.width,h.height);}c.restore();}
function hazardOutline(c,h,fill,stroke,w=1.5){if(h.type==='lane')lane(c,h,fill,stroke,w);else oval(c,h.x,h.y,h.radius,h.radiusY??h.radius*.55,fill,stroke,w);}
function visibleShots(s){return(s.personality?.shots||[]).filter(q=>!['waiting','done'].includes(q.phase));}
function pathOf(q){const from=q.origin||q.path?.[0],to=q.end||q.path?.at(-1)||q.target;if(!Number.isFinite(from?.x)||!Number.isFinite(from?.y)||!Number.isFinite(to?.x)||!Number.isFinite(to?.y))return null;return{from,to,angle:Math.atan2(to.y-from.y,to.x-from.x),length:Math.hypot(to.x-from.x,to.y-from.y)};}
function shotLane(q){const p=pathOf(q);return p?{type:'lane',x:(p.from.x+p.to.x)/2,y:(p.from.y+p.to.y)/2,width:p.length,height:q.width||48,angle:p.angle}:null;}
export function personalityPatternGuide(s){const g=getPersonalityGuide(s);if(!g)return null;return{...g,tip:g.instruction||g.tip||'',color:g.tracking?RED:g.phase==='active'?ACTIVE:LOCK};}
/** Render-only pose metadata; progress follows the actual tracking, lock and travel clocks. */
export function personalityPoseState(s){
 const run=s.personality,m=s.boss?.personalityMotion;if(!run)return{};
 const q=run.shots.find(q=>['tracking','locked'].includes(q.phase))||run.shots.filter(q=>q.phase==='active').at(-1)||run.shots.at(-1);if(!q)return{};
 let phase=q.phase==='active'?'dashing':q.phase==='done'?'recover':q.phase,progress=0;
 if(m){phase=m.phase==='active'?(m.progress>=1?'recover':'dashing'):m.phase;progress=clamp(m.progress||0);}
 else if(q.phase==='tracking')progress=clamp((run.elapsed-q.startAt)/Math.max(.01,q.lockAt-q.startAt));
 else if(q.phase==='locked')progress=clamp((run.elapsed-q.lockAt)/Math.max(.01,q.launchAt-q.lockAt));
 else if(q.phase==='active')progress=clamp((run.elapsed-q.launchAt)/Math.max(.01,q.duration||.5));
 return{personalitySkill:run.bossId,personalityPhase:phase,personalityProgress:progress,personalityIndex:q.index};
}
function chair(c,x,y,scale,color,active){c.save();c.translate(x,y);c.scale(scale,scale);c.globalAlpha*=active?.42:.78;
 line(c,[[-11,6],[-11,-14],[-9,-18],[9,-18],[11,-14],[11,6]],color,2);line(c,[[-11,2],[11,2]],color,3);line(c,[[-9,5],[-12,15]],color,2);line(c,[[9,5],[12,15]],color,2);line(c,[[-6,-12],[6,-12]],color,1);c.restore();}
export function drawPersonalityFloor(c,s,t,reduced=false){
 const hazards=(s.hazards||[]).filter(isPersonalityPattern);if(!hazards.length)return;c.save();floorClip(c);
 for(const h of hazards){
  if(h.kind==='seat-reservation'){
   const p=clamp(1-h.remaining/Math.max(.01,h.duration)),col=h.active?ACTIVE:LOCK;
   hazardOutline(c,h,h.active?'#c34e392b':'#b7953512',null);
   chair(c,h.x,h.y-7,.82,col,h.active);
   if(!h.active){c.save();c.translate(h.x,h.y);c.scale(h.radius,h.radiusY??h.radius*.55);c.beginPath();c.arc(0,0,.9,-Math.PI/2,-Math.PI/2+TAU*p);c.strokeStyle=LOCK+'90';c.lineWidth=.025;c.stroke();c.restore();}
   else {const rr=(h.radius||75)*.62;line(c,[[h.x-rr,h.y-rr*.45],[h.x+rr,h.y+rr*.45]],'#ffbda340',2);line(c,[[h.x+rr,h.y-rr*.45],[h.x-rr,h.y+rr*.45]],'#ffbda340',2);}
  }else if(h.kind==='moving-aftercut'){
   hazardOutline(c,h,h.active?'#ef7f543b':null,null);
   if(h.active){c.save();c.translate(h.x,h.y);c.rotate(h.angle||0);const fade=clamp(h.life/Math.max(.01,h.totalLife||h.life));line(c,[[-h.width/2,0],[h.width/2,0]],'#ffb870',4);line(c,[[-h.width/2+4,-1],[h.width/2-4,-1]],'#fff2d4',1.4);if(!reduced)for(let i=0;i<8;i++){const x=-h.width*.44+i*h.width*.12,dy=(1-fade)*(7+i%3*4);line(c,[[x,-2],[x+8,-dy]],'#f8bc8366',1);}c.restore();}
  }
 }
 c.restore();
}
export function drawPersonalityWarnings(c,s,t,reduced=false){
 const run=s.personality,shots=visibleShots(s),hazards=(s.hazards||[]).filter(isPersonalityPattern);if(!run&&!hazards.length)return;c.save();floorClip(c);
 for(const q of shots){
  if(!['tracking','locked'].includes(q.phase)||run?.bossId==='gojo')continue;
  const p=pathOf(q);if(!p)continue;const locked=q.phase==='locked',col=locked?LOCK:RED,wide=q.width||48;
  c.save();c.setLineDash(locked?[12,6]:[3,8]);c.lineDashOffset=reduced||locked?0:-t*18;
  line(c,[[p.from.x,p.from.y],[p.to.x,p.to.y]],INK,4);arrow(c,p.from,p.to,col,locked?2:1.4);
  // These are future direction guides. Never fill a dash/projectile route as if it were live damage.
  const nx=-Math.sin(p.angle)*wide/2,ny=Math.cos(p.angle)*wide/2;
  line(c,[[p.from.x+nx,p.from.y+ny],[p.to.x+nx,p.to.y+ny]],col+'65',1);line(c,[[p.from.x-nx,p.from.y-ny],[p.to.x-nx,p.to.y-ny]],col+'65',1);c.restore();
  const aim=q.target||p.to;oval(c,aim.x,aim.y,locked?14:18,locked?9:12,null,col,1.5);
  const label=run.bossId==='ignis'?`${number(q.index)} 빨뚜 병`:`${number(q.index)} ${locked?'방향 고정':'추적 중'}`;
  text(c,label,clamp(p.to.x,100,1180),clamp(p.to.y+26,353,628),12,col);
 }
 for(const h of hazards){
  const col=h.active?ACTIVE:LOCK;c.save();c.setLineDash(h.active?[]:[8,5]);hazardOutline(c,h,null,INK,5);hazardOutline(c,h,null,col,h.active?2.7:1.7);c.restore();
  if(h.kind==='seat-reservation')text(c,`${number(h.index)} ${h.active?'봉쇄 · 위험':'예약 자리 · 비우세요'}`,clamp(h.x,140,1140),clamp(h.y+(h.radiusY||45)+18,352,627),13,col);
  else if(h.kind==='moving-aftercut'&&!h.active)text(c,'후속 참격!',clamp(h.x,126,1154),clamp(h.y+Math.abs(h.height||40)/2+21,351,627),12,LOCK);
 }
 // The moving body alone has the live charge collision; the route and ghosts are just cues.
 for(const q of shots){if(q.phase!=='active'||!q.body||run?.bossId==='ignis'||q.dashElapsed>=q.dashDuration)continue;const b=q.body;oval(c,b.x,b.y,b.radius,b.radiusY,null,INK,5);oval(c,b.x,b.y,b.radius,b.radiusY,null,ACTIVE,2.1);}
 c.restore();
}
/** The complete rotating bottle fits within its visible axis-aligned collision ellipse. */
export function drawPersonalityProjectile(c,q,reduced=false){
 if(q.kind!=='red-cap')return false;const rx=Math.max(1,q.radius),ry=Math.max(1,q.radiusY),speed=Math.hypot(q.vx,q.vy)||1,ux=q.vx/speed,uy=q.vy/speed;
 c.save();if(!reduced)for(let i=1;i<=3;i++)line(c,[[q.x-ux*(rx+i*10),q.y-uy*(ry+i*10)],[q.x-ux*(rx+i*10+6),q.y-uy*(ry+i*10+6)]],'#b0efc6'+['60','38','1b'][i-1],1.2);
 oval(c,q.x,q.y,rx,ry,'#16784a18','#bceec69c',1.1);c.translate(q.x,q.y);c.scale(rx/21,ry/21);
 drawRedCapBottle(c,0,0,1,reduced?Math.PI/3:(q.age??q.elapsed??(4-(q.life||0)))*9);c.restore();return true;
}
export function drawPersonalityPresence(c,s,t,reduced=false,drawFighter=null){
 const m=s.boss?.personalityMotion,run=s.personality;if(!run||!m||!['active','dashing'].includes(m.phase)||m.progress>=1||reduced)return;
 const from=m.from||m.origin,to=m.to||m.target;if(!from||!to)return;const b=s.boss,dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
 c.save();for(let i=3;i>=1;i--){const back=i*(run.bossId==='sukuna'?22:16),x=b.x-ux*back,y=b.y-uy*back;c.globalAlpha=(4-i)*.035;
  if(drawFighter)drawFighter(c,b.id,x,y,1,{facing:b.facing||1,time:t,walk:true,walkWeight:1,walkPhase:t*10,reduced:false,personalitySkill:run.bossId,personalityPhase:'dashing',personalityProgress:m.progress||0});
 }
 c.globalAlpha=.55;const col=run.bossId==='sukuna'?'#ffc57d':'#d3d9b9';for(let i=0;i<5;i++){const spread=(i-2)*9,xx=b.x-ux*(25+i%2*13)-uy*spread,yy=b.y-70-uy*(25+i%2*13)+ux*spread;line(c,[[xx,yy],[xx-ux*28,yy-uy*28]],col+(i%2?'70':'aa'),i===2?2:1);}
 c.restore();
}
const FOLLOWUP_QUOTES={mime:['','잡았다! 너 내 배역 해라!'],gojo:['','거기도 내 자리인데~?','옆자리도 찜해야지~','자리가 좀 좁아졌지?','이제 자리 좀 잡았네~'],sukuna:['','무빙 좀 보여줘!','아직 안 끝났지!','한 번 더, 따라와!','마지막까지 집중!']};
/** Stable, readable phrases follow actual sequence milestones, without combat pauses or writes. */
export function bossFeatureSpeech(s){
 if(s.cinematic||s.status!=='playing'||s.hazards.some(h=>h.kind==='domain'))return null;
 if(s.boss.id==='max'){
  const e=s.effects.filter(e=>e.type==='maxShot'&&e.text&&e.life>0).at(-1);return e?{...e,bossSpeech:true,speakerName:'맥스',color:'#efcd92'}:null;
 }
 const run=s.personality;if(!run||!QUOTES[run.bossId])return null;
 let phrase=QUOTES[run.bossId],start=0,duration=2.6;
 if(run.elapsed>=2.6){phrase=null;let cursor=2.6;for(const q of run.shots){const value=FOLLOWUP_QUOTES[run.bossId]?.[q.index-1];if(q.index<2||!value||q.startAt<=0||q.phase==='waiting')continue;const cueStart=Math.max(cursor,q.startAt);if(run.elapsed>=cueStart&&run.elapsed<cueStart+2.1){phrase=value;start=cueStart;duration=2.1;break;}cursor=cueStart+2.1;}}
 if(!phrase)return null;
 return {text:phrase,life:duration-(run.elapsed-start),maxLife:duration,bossSpeech:true,speakerName:BOSS_VISUALS[run.bossId]?.name||s.boss.name,color:run.bossId==='ignis'?'#ffb0a0':run.bossId==='mime'?'#a8e8c4':run.bossId==='gojo'?'#b6dfe7':'#ffd296'};
}
export function drawPersonalitySpeech(c,s){
 const event=bossFeatureSpeech(s);if(!event)return false;
 const hazards=[...(s.hazards||[]),...[...visibleShots(s),...(s.maxPattern?.shots||[])].filter(q=>['tracking','locked'].includes(q.phase)).map(shotLane).filter(Boolean),...(s.projectiles||[]).filter(q=>q.owner==='enemy').map(q=>({type:'circle',x:q.x,y:q.y,radius:q.radius||12,radiusY:q.radiusY||12}))];
 const swapped={...s,player:{...s.boss,character:s.player.character},boss:s.player,hazards},layout=dialogueLayout(c,swapped,event);
 return layout?drawDialogueBox(c,event,{state:swapped,layout}):false;
}
