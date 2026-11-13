/** Ordinary targeted attacks: engine geometry is authoritative; trails never create collision. */
import { getPatternGuide } from './engine.js';
const TAU=Math.PI*2,RED='#ff93a5',LOCK='#fff0d5',MINT='#79ffe0';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const kinds=new Set(['follow-spot','mask-route','mask-route-fake','projectile-cue']);
export const isNormalPattern=h=>kinds.has(h.kind);
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
function oval(c,x,y,rx,ry,fill,stroke=null,width=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function clip(c){c.beginPath();c.rect(45,328,1190,314);c.clip();}
function lane(c,h,color,width=1){c.save();c.translate(h.x,h.y);c.rotate(h.angle||0);c.strokeStyle=color;c.lineWidth=width;c.strokeRect(-h.width/2,-h.height/2,h.width,h.height);c.restore();}
function frame(c,x,y,r,color,width=1.5){for(const side of [-1,1])for(const vertical of [-1,1])line(c,[[x+side*(r-6),y+vertical*r*.65],[x+side*r,y+vertical*r*.65],[x+side*r,y+vertical*(r*.65-5)]],color,width);}
function reticle(c,point,locked,progress,reduced,t){if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return;const color=locked?LOCK:RED,r=locked?19:23;c.save();c.translate(point.x,point.y);c.rotate(reduced||locked?0:Math.sin(t*1.8)*.13);c.lineWidth=locked?2:1.5;c.strokeStyle=color;for(let i=0;i<4;i++){c.beginPath();c.ellipse(0,0,r,r*.64,0,i*Math.PI/2+.12,i*Math.PI/2+1.1);c.stroke();}line(c,[[-r-6,0],[-r+2,0]],color,1.5);line(c,[[r-2,0],[r+6,0]],color,1.5);if(locked){frame(c,0,0,r+7,color,1.5);oval(c,0,0,3,2,color);}else{c.beginPath();c.ellipse(0,0,r+4,(r+4)*.64,0,-Math.PI/2,-Math.PI/2+TAU*clamp(progress));c.strokeStyle=RED+'7a';c.lineWidth=1;c.stroke();}c.restore();}
function indexLabel(c,h,color){const xx=clamp(h.aimPoint?.x??h.x,92,1188),yy=clamp((h.aimPoint?.y??h.y)+(h.type==='circle'?(h.radiusY??h.radius*.55):20)+15,355,625),number=['①','②','③','④','⑤','⑥','⑦'][(h.index||1)-1]||String(h.index||1),str=h.kind==='mask-route'?number+' 위험':number;c.font='900 14px "Noto Sans KR",sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#10252b';c.strokeText(str,xx,yy);c.fillStyle=color;c.fillText(str,xx,yy);}
function normals(s){return(s.hazards||[]).filter(isNormalPattern);}
function pending(s){return normals(s).filter(h=>!h.active&&!h.decoy).sort((a,b)=>a.remaining-b.remaining);}
export function normalPatternGuide(s){const actual=getPatternGuide(s);if(!actual||!['follow-spot','mask-route','projectile-cue'].includes(actual.kind))return null;const front=pending(s)[0],locked=!!front?.locked,tracking=!!front?.tracking,tip=actual.kind==='follow-spot'?(tracking?'조준 중 · 계속 이동! 흰 선이 고정되면 옆으로':'방향 고정! 선 옆으로 · 두 번째 조명도 확인'):actual.kind==='mask-route'?'번호가 붙은 위험 원을 피하세요 · 회색 FAKE는 가짜':tracking?'예측 조준 중 · 흰 선이 고정되면 방향 전환':front?.late?'끝이 아님! 늦게 오는 마지막 2발도 계속 회피':'선 옆으로! 실제 투사체가 모두 지날 때까지 주의';return{...actual,tip,color:front?(locked?LOCK:RED):'#f3c4cf'};}
export function drawNormalPatternFloor(c,s,t,reduced=false){
 const hazards=normals(s);if(!hazards.length)return;c.save();clip(c);
 // Recorded/predicted points are a quiet construction line, never a filled hazard.
 const path=hazards.find(h=>Array.isArray(h.path)&&h.path.length>1)?.path;if(path){const points=path.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(-24);if(points.length>1){c.setLineDash([2,8]);line(c,points.map(p=>[p.x,p.y]),'#acc1cd52',1);c.setLineDash([]);for(const p of points)oval(c,p.x,p.y,2.2,1.5,'#b6c9d44d');}}
 for(const h of hazards){
  if(h.decoy)continue;
  if(h.kind==='follow-spot'&&h.active){const ox=h.originX??s.boss.x,oy=h.originY??s.boss.y,aim=h.aimPoint||h,g=c.createLinearGradient(ox,oy-85,aim.x,aim.y);g.addColorStop(0,'#ffcf8224');g.addColorStop(1,'#ffe6b268');c.beginPath();c.moveTo(ox-5,oy-85);c.lineTo(ox+5,oy-85);c.lineTo(aim.x+28,aim.y);c.lineTo(aim.x-28,aim.y);c.closePath();c.fillStyle=g;c.fill();oval(c,aim.x,aim.y,26,15,'#ffe3ac42','#fff0cd',1.5);}
  if(h.kind==='mask-route'){const ready=h.active,color=ready?'#eadfc8':'#c9d1c3';c.save();c.translate(h.x,h.y-27);c.globalAlpha=ready?.8:.23;c.beginPath();c.moveTo(-16,-19);c.quadraticCurveTo(0,-25,16,-19);c.lineTo(13,4);c.quadraticCurveTo(0,25,-13,4);c.closePath();c.fillStyle=color;c.fill();line(c,[[-10,-4],[-3,-2]],'#36454b',2);line(c,[[3,-2],[10,-4]],'#36454b',2);c.restore();}
 }
 c.restore();
}
export function drawNormalPatternWarnings(c,s,t,reduced=false){
 const hazards=normals(s),soon=pending(s);if(!hazards.length)return;c.save();clip(c);
 for(const h of hazards){if(h.decoy)continue;const rank=soon.indexOf(h),front=rank===0,locked=!!h.locked,color=locked?LOCK:RED;
  if(h.kind==='projectile-cue'){
   if(h.active)continue; // It has launched: the projectile body, not this entire route, is dangerous.
   c.save();c.globalAlpha=rank<2?1:.26;c.setLineDash(locked?[10,6]:[3,9]);c.lineDashOffset=reduced||locked?0:-t*16;
   c.translate(h.x,h.y);c.rotate(h.angle||0);line(c,[[-h.width/2,0],[h.width/2,0]],color,front?2:1);if(rank<2){line(c,[[-h.width/2,-h.height/2],[h.width/2,-h.height/2]],color+'52',1);line(c,[[-h.width/2,h.height/2],[h.width/2,h.height/2]],color+'52',1);}c.restore();
   if(front)reticle(c,h.aimPoint||h,locked,1-h.remaining/Math.max(.01,h.duration),reduced,t);
  }else if(h.kind==='follow-spot'){
   c.save();c.setLineDash(h.active||locked?[]:[8,7]);lane(c,h,'#17232b',5);lane(c,h,h.active?'#ffdfae':color,h.active?2.5:1.8);c.restore();if(front)reticle(c,h.aimPoint||h,locked,1-h.remaining/Math.max(.01,h.duration),reduced,t);
  }else if(h.kind==='mask-route'){
   c.save();c.setLineDash(h.active?[]:[8,6]);oval(c,h.x,h.y,h.radius,h.radiusY??h.radius*.55,null,'#19252d',5);oval(c,h.x,h.y,h.radius,h.radiusY??h.radius*.55,null,h.active?'#ffb5c1':LOCK,h.active?2.8:1.8);c.restore();
  }
  if(h.active||rank<2)indexLabel(c,h,h.active?'#ffd4dc':color);
 }
 c.restore();
}
/** An enemy projectile's bright envelope is its actual axis-aligned collision ellipse. */
export function drawEnemyProjectile(c,q,reduced=false){
 const rx=Math.max(1,q.radius||9),ry=Math.max(1,q.radiusY||6),speed=Math.hypot(q.vx||0,q.vy||0)||1,ux=(q.vx||0)/speed,uy=(q.vy||0)/speed,frameShot=q.kind==='frame-shard',ink=frameShot?'#c9e6e9':'#f0bed0';c.save();
 if(!reduced){for(let i=0;i<3;i++){const back=rx+5+i*10;line(c,[[q.x-ux*back,q.y-uy*back],[q.x-ux*(back+7),q.y-uy*(back+7)]],ink+['69','3d','20'][i],Math.max(1,2-i*.4));}}
 oval(c,q.x,q.y,rx,ry,frameShot?'#253f54':'#4a253d',ink,1.5);
 // Ornament is normalized inside the collision ellipse; rotation cannot enlarge the visible body.
 c.translate(q.x,q.y);c.scale(rx,ry);c.rotate(Math.atan2(q.vy||0,q.vx||1));
 if(frameShot){c.beginPath();c.moveTo(1,0);c.lineTo(0,-.92);c.lineTo(-1,0);c.lineTo(0,.92);c.closePath();const g=c.createLinearGradient(-1,-1,1,1);g.addColorStop(0,'#7295be');g.addColorStop(.45,'#d8f0e7');g.addColorStop(.6,'#fdf0c5');g.addColorStop(1,'#81bdcf');c.fillStyle=g;c.fill();line(c,[[-.65,0],[0,-.55],[.65,0],[0,.55],[-.65,0]],'#324963',.12);line(c,[[0,-.4],[.55,0],[0,.4]],'#f3f5d3',.1);}
 else{c.beginPath();c.moveTo(.99,0);c.bezierCurveTo(.2,-.78,-.61,-.7,-.96,-.16);c.lineTo(-.48,.25);c.bezierCurveTo(.12,.34,.58,.2,.99,0);c.closePath();const g=c.createLinearGradient(0,-1,0,1);g.addColorStop(0,'#d28fb1');g.addColorStop(.4,'#fff1d8');g.addColorStop(.63,'#ceafc8');g.addColorStop(1,'#583749');c.fillStyle=g;c.fill();line(c,[[-.75,-.12],[.8,-.03]],'#ffe9db',.13);}
 c.restore();
}
