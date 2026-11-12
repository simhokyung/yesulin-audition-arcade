/** Pursuit choreography uses engine lanes verbatim. Thin sights are not current colliders. */
const MINT='#79ffe0',RED='#ff8a9e',WHITE='#fff1dc',FOLLOW='#e5bbff',TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function line(c,p,color,w=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.stroke();}
function text(c,value,x,y,size,color){c.font=`900 ${size}px "Noto Sans KR",sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(value,x,y);}
function box(c,x,y,w,h,color,r=0){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();}
function clip(c){c.beginPath();c.rect(45,328,1190,314);c.clip();}
function region(c,r,color,width=2,fill=null){
 if(!r)return;c.save();c.translate(r.x,r.y);c.rotate(r.angle||0);c.beginPath();
 if(r.type==='ellipse')c.ellipse(0,0,r.radius,r.radiusY??r.radius*.6,0,0,TAU);else c.rect(-r.width/2,-r.height/2,r.width,r.height);
 if(fill){c.fillStyle=fill;c.fill();}c.strokeStyle=color;c.lineWidth=width;c.stroke();c.restore();
}
export function pursuitState(h,v){return v.pursuitState||h.pursuitState||'tracking';}
export function pursuitColor(h,v){const phase=pursuitState(h,v);return phase==='tracking'?RED:phase==='locked'?WHITE:FOLLOW;}
export function pursuitVolleyLabel(h,v={}){const phase=v.phaseIndex??h.domainPhase??0,section=v.section||h.section;return section==='single'?`단발 연사 ${phase+1} / 6`:section==='pincer'?`시간차 협공 ${phase-5} / 3`:section==='final'?'피날레 · 3방향 동시':`${phase+1} / ${v.phaseCount||h.phaseCount||1}`;}
function sight(c,r,color,state,t,reduced){
 c.save();c.translate(r.x,r.y);c.rotate(r.angle||0);
 // The future corridor remains unfilled. Fine dashed edges contrast with solid moving steel.
 c.setLineDash(state==='tracking'?[7,10]:[13,8]);c.lineDashOffset=reduced?0:-t*(state==='tracking'?13:5);
 c.strokeStyle=color+(state==='tracking'?'85':'b8');c.lineWidth=state==='tracking'?1.2:1.7;
 c.strokeRect(-r.width/2,-r.height/2,r.width,r.height);c.setLineDash([]);
 line(c,[[-r.width/2,0],[r.width/2,0]],color+(state==='tracking'?'a8':'c9'),state==='locked'?1.8:1);
 const n=Math.min(10,Math.max(2,Math.floor(r.width/95)));
 for(let i=0;i<n;i++){const x=-r.width/2+(i+.5)*r.width/n;line(c,[[x-4,-4],[x+1,0],[x-4,4]],color+'77',1);}
 c.restore();
}
function reticle(c,p,color,state,t,reduced){
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
 c.save();c.translate(p.x,p.y);c.rotate(reduced?0:state==='tracking'?Math.sin(t*1.4)*.14:0);
 const r=state==='tracking'?20:17;c.strokeStyle=color;c.lineWidth=1.7;
 for(let j=0;j<4;j++){const a=j*Math.PI/2;c.beginPath();c.arc(0,0,r,a+.15,a+.67);c.stroke();}
 line(c,[[-r-7,0],[-r+3,0]],color,1.5);line(c,[[r-3,0],[r+7,0]],color,1.5);
 line(c,[[0,-r-7],[0,-r+3]],color,1.5);line(c,[[0,r-3],[0,r+7]],color,1.5);c.restore();
}
function blade(c,r,slash,reduced){
 const length=r.width,half=r.height/2,kind=slash?.kind||'main';
 c.save();c.translate(r.x,r.y);c.rotate(r.angle||0);
 // Current engine rectangle is legible under the curved ornament. The edge does not grow.
 box(c,-length/2,-half,length,r.height,kind==='main'?'#cb677354':'#af78cf54');
 const steel=c.createLinearGradient(0,-half,0,half);steel.addColorStop(0,'#4f355e');steel.addColorStop(.32,kind==='main'?'#ae778d':'#a787cb');steel.addColorStop(.56,'#e3e9ed');steel.addColorStop(.72,'#fff1da');steel.addColorStop(1,'#6d536e');
 // Two interlocking, curved blades, contained entirely inside the exact hit rectangle.
 for(const sign of [-1,1]){c.save();c.scale(1,sign);c.beginPath();c.moveTo(-length*.49,0);c.bezierCurveTo(-length*.28,-half*.72,length*.23,-half*.98,length*.49,-half*.73);c.bezierCurveTo(length*.36,-half*.17,length*.13,half*.23,-length*.49,0);c.closePath();c.fillStyle=steel;c.fill();c.strokeStyle=sign<0?'#b6b2d2':'#fff0dd';c.lineWidth=1.3;c.stroke();c.restore();}
 const pivot=-length*.23;c.beginPath();c.ellipse(pivot,0,Math.min(5,length*.04),Math.min(5,half*.45),0,0,TAU);c.fillStyle='#efc4d3';c.fill();
 line(c,[[-length*.45,-half*.65],[length*.44,-half*.76]],'#fff4de',1.3);
 if(!reduced){
  // Sparse 18px streaks trail behind; they are neither filled corridors nor extra blade bodies.
  const localX=(slash?.normalX??Math.cos(r.angle||0))*Math.cos(r.angle||0)+(slash?.normalY??Math.sin(r.angle||0))*Math.sin(r.angle||0);
  const back=localX<0?1:-1;
  for(let i=0;i<3;i++){const y=(i-1)*half*.48;line(c,[[back*(length/2+3),y],[back*(length/2+15+i*3),y]],['#dec4d64d','#d5cbdd34','#c1b1cb24'][i],1.2);}
 }
 c.restore();
}
function arrow(c,x,y,tx,ty){const dx=tx-x,dy=ty-y,l=Math.hypot(dx,dy);if(l<10)return;const ux=dx/l,uy=dy/l;c.setLineDash([7,6]);line(c,[[x,y],[tx,ty]],'#092a32',6);line(c,[[x,y],[tx,ty]],MINT,2.5);c.setLineDash([]);c.beginPath();c.moveTo(tx,ty);c.lineTo(tx-ux*12-uy*6,ty-uy*12+ux*6);c.lineTo(tx-ux*12+uy*6,ty-uy*12-ux*6);c.closePath();c.fillStyle=MINT;c.fill();}
function entryPoint(q){
 const nx=q.normalX,ny=q.normalY,ox=q.originX,oy=q.originY;if(![nx,ny,ox,oy].every(Number.isFinite))return null;
 const hits=[];if(Math.abs(nx)>.0001)for(const x of [64,1216]){const u=(x-ox)/nx,y=oy+ny*u;if(u>=0&&y>=342&&y<=628)hits.push({x,y,u});}
 if(Math.abs(ny)>.0001)for(const y of [342,628]){const u=(y-oy)/ny,x=ox+nx*u;if(u>=0&&x>=64&&x<=1216)hits.push({x,y,u});}
 const p=hits.sort((a,b)=>a.u-b.u)[0];return p?{x:p.x+nx*18,y:p.y+ny*18}:null;
}
function shotOrder(c,h,v,state){
 for(const q of v.slashes||[]){if(q.finished)continue;const p=entryPoint(q);if(!p)continue;
  const color=q.started?(q.index?'#e5bbff':'#fff1dc'):'#d8cad0',next=state==='flight'&&!q.started;
  const section=v.section||h.section,phase=v.phaseIndex??h.domainPhase??0,order=section==='single'?`${phase+1}발`:section==='pincer'?`협공 ${phase-5}`:section==='final'?`${(q.index||0)+1} / ${q.count||3}`:`${(q.index||0)+1}발`;
  const x=clamp(p.x,105,1175),y=clamp(p.y,358,616),label=next?`다음 ${order}`:order;
  box(c,x-30,y-11,60,22,'#271f32d9',4);text(c,label,x,y+4,11,color);
  line(c,[[p.x-q.normalX*9,p.y-q.normalY*9],[p.x+q.normalX*8,p.y+q.normalY*8]],color,1.5);
 }
}
export function drawPursuitFloor(c,s,h,v,g,t,reduced=false){
 if(!h.active)return;
 const state=pursuitState(h,v),color=pursuitColor(h,v);c.save();clip(c);
 if(state!=='flight')for(const r of v.previewRegions||[])sight(c,r,color,state,t,reduced);
 else for(const r of v.previewRegions||[])sight(c,r,'#bb9ab4','flight',t,true);
 for(const r of v.dangerRegions||[]){const slash=(v.slashes||[]).find(a=>a.region===r||a.region&&Math.abs(a.region.x-r.x)<.01&&Math.abs(a.region.y-r.y)<.01);blade(c,r,slash,reduced);}
 if(state!=='flight')reticle(c,v.aimPoint||h.aimPoint,color,state,t,reduced);
 c.restore();
}
export function drawPursuitGuides(c,s,h,v,g,t,reduced=false){
 if(!h.active)return;
 const state=pursuitState(h,v),color=pursuitColor(h,v),tracking=state==='tracking';c.save();clip(c);
 // Red/white sights remain readable above offensive effects, but never become opaque floor fills.
 if(state!=='flight')for(const r of v.previewRegions||[])sight(c,r,color,state,t,true);
 for(const r of v.dangerRegions||[]){
  // A quiet ground projection defines the exact rectangle; only the curved metal edge shines.
  region(c,r,'#efbed535',1.1,'#b5678420');c.save();c.translate(r.x,r.y);c.rotate(r.angle||0);c.beginPath();c.moveTo(-r.width*.49,0);c.bezierCurveTo(-r.width*.28,-r.height*.36,r.width*.23,-r.height*.49,r.width*.49,-r.height*.365);c.strokeStyle='#fff2df';c.lineWidth=1.9;c.stroke();c.restore();
 }
 if(tracking){reticle(c,v.aimPoint||h.aimPoint,color,state,t,reduced);c.restore();return;}
 shotOrder(c,h,v,state);
 const target=g.target||v.guide,reached=!!(g.targetReached??g.destinationReached);
 if(g.targetRegion){c.setLineDash([5,5]);region(c,g.targetRegion,'#0c2c33',6);region(c,g.targetRegion,MINT,2.5);c.setLineDash([]);}
 if(target&&Number.isFinite(target.x)&&Number.isFinite(target.y)){
  if(!reached){const dx=target.x-s.player.x,dy=target.y-s.player.y,l=Math.hypot(dx,dy)||1;arrow(c,s.player.x+dx/l*15,s.player.y+dy/l*15,target.x,target.y);}
  c.beginPath();c.ellipse(target.x,target.y,13,8,0,0,TAU);c.strokeStyle=MINT;c.lineWidth=2;c.stroke();
  // Small caption sits below feet; the high HUD owns the full instruction.
  const xx=clamp(target.x,132,1148),yy=clamp(target.y+32,361,626);box(c,xx-67,yy-15,134,22,'#0b2831e8',4);text(c,reached?'선 밖 유지':'옆으로 이동',xx,yy+1,11,MINT);
 }
 c.restore();
}
export function pursuitInstruction(h,v,g){
 const state=pursuitState(h,v),phase=(v.phaseIndex??h.domainPhase??0)+1,count=v.phaseCount||h.phaseCount||1,reached=!!(g.targetReached??g.destinationReached),variant=v.pursuitVariant||h.pursuitVariant,section=v.section||h.section,
  variation=section==='single'?'단발 연사':section==='pincer'?'시간차 협공':section==='final'?'3방향 피날레':{rear:'뒤따르는 후속 칼날',flank:'측면에서 꺾이는 칼날',opposed:'양쪽에서 엇갈리는 칼날',cross:'시간차 교차 칼날'}[variant]||'연속 칼날',shots=(v.slashes||[]).length||1;
 if(!h.active)return{title:'추격 난무 준비 · 계속 이동',tip:'곧 빨간 조준이 따라옵니다 · 흰색 고정 신호를 기다리세요',timerLabel:g.timerLabel||'공격까지',statusColor:RED};
 return{title:state==='tracking'?'조준 중 · 계속 이동':state==='locked'?'조준 고정! 옆으로!':reached?(phase===count?'마지막 칼날 · 선 밖 유지':'선 밖 유지 · 다음 조준 대비'):section==='final'?'3방향 피날레! 빈틈으로!':'후속 칼날! 방향 전환',
  tip:state==='tracking'?`${pursuitVolleyLabel(h,v)} · 빨간 선이 나를 따라옵니다`:state==='locked'?`${variation} · ${shots===1?'지금 선 밖으로!':'세 방향 선 밖 빈틈으로!'}`:reached?(phase<count?'짧게 선 밖 유지 · 곧 새 조준! 다음 방향 전환 준비':`마지막 ${shots===3?'세 방향 칼날이':'칼날이'} 모두 지나가면 반격!`):section==='final'?'세 방향 동시 공격 · 민트 빈틈으로 방향 전환':section==='single'?'지금 한 발을 피하세요 · 곧 다시 조준합니다':'새 방향에서 오는 협공 · 이전 이동 방향을 바꾸세요',
  timerLabel:g.timerLabel||(state==='tracking'?'조준 추적':state==='locked'?'발사까지':'칼날 통과'),statusColor:pursuitColor(h,v)};
}
