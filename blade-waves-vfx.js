/** Traveling blade walls: draw only current colliders, never colour their entire future path lethal. */
const MINT='#79ffe0',TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function line(c,p,color,w=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.stroke()}
function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function polygon(c,points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill()}
function text(c,value,x,y,size,color){c.font=`900 ${size}px "Noto Sans KR",sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(value,x,y)}
function clip(c){c.beginPath();c.rect(45,328,1190,314);c.clip()}
function shape(c,r,color,width=2,fill=null){c.save();c.translate(r.x,r.y);c.rotate(r.angle||0);c.strokeStyle=color;c.lineWidth=width;if(r.type==='ellipse'){c.beginPath();c.ellipse(0,0,r.radius,r.radiusY??r.radius*.6,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}c.stroke();}else{if(fill)box(c,-r.width/2,-r.height/2,r.width,r.height,fill);c.strokeRect(-r.width/2,-r.height/2,r.width,r.height);}c.restore();}
function arrow(c,x,y,tx,ty,color,size=12,dashed=false){const dx=tx-x,dy=ty-y,l=Math.hypot(dx,dy);if(l<8)return;const ux=dx/l,uy=dy/l;line(c,[[x,y],[tx,ty]],'#102631',6);c.setLineDash(dashed?[8,6]:[]);line(c,[[x,y],[tx,ty]],color,2.5);c.setLineDash([]);polygon(c,[[tx,ty],[tx-ux*size-uy*size*.55,ty-uy*size+ux*size*.55],[tx-ux*size+uy*size*.55,ty-uy*size-ux*size*.55]],color)}
function axes(w){const a=w.angle||0;return{nx:w.normalX??Math.cos(a),ny:w.normalY??Math.sin(a),tx:w.tangentX??-Math.sin(a),ty:w.tangentY??Math.cos(a)}}
function waves(v){return(v.waves||[]).filter(w=>!w.finished)}
function directionName(w){const {nx,ny}=axes(w);return Math.abs(nx)>.85?(nx>0?'왼쪽 → 오른쪽':'오른쪽 → 왼쪽'):Math.abs(ny)>.85?(ny>0?'위 → 아래':'아래 → 위'):(nx>0?(ny>0?'왼쪽 위 ↘':'왼쪽 아래 ↗'):(ny>0?'오른쪽 위 ↙':'오른쪽 아래 ↖'))}
function blade(c,r,w,reduced){
 const {nx,ny,tx,ty}=axes(w),along=(r.angle||0),co=Math.cos(along),si=Math.sin(along),length=r.width,thick=r.height;const sign=Math.sign(nx*(-si)+ny*co)||1;
 c.save();c.translate(r.x,r.y);c.rotate(along);const lead=sign*thick/2,back=-lead;
 // The thin floor footprint exactly matches the engine segment.
 box(c,-length/2,-thick/2,length,thick,'#ae52605e');c.strokeStyle='#eec3c2';c.lineWidth=2;c.strokeRect(-length/2,-thick/2,length,thick);
 const steel=c.createLinearGradient(0,back,0,lead);steel.addColorStop(0,'#452b4f');steel.addColorStop(.27,'#84618a');steel.addColorStop(.57,'#7ca6b8');steel.addColorStop(.83,'#dce4ee');steel.addColorStop(1,'#fff0d7');
 const bevel=Math.min(10,length*.12);polygon(c,[[-length/2+bevel,back],[length/2-bevel,back],[length/2,0],[length/2-bevel,lead],[-length/2+bevel,lead],[-length/2,0]],steel);line(c,[[-length/2+3,lead],[length/2-3,lead]],'#fff4dc',3.2);line(c,[[-length/2+2,back],[length/2-2,back]],'#573755',2);
 // Engraved bevels and narrow trailing streaks communicate motion without adding false hit area.
 const count=Math.min(18,Math.ceil(length/45));for(let i=0;i<count;i++){const x=-length/2+12+i*(length-24)/Math.max(1,count-1);line(c,[[x,back+sign*2],[x+9,lead-sign*3]],'#fff0e074',1);}
 if(!reduced&&w.started){for(let j=0;j<3;j++){const xx=-length*.35+(((w.elapsed||0)*37+j*length*.29)%Math.max(1,length*.7));line(c,[[xx-3,lead],[xx+4,lead]],'#fff8e7',1.5);line(c,[[xx,lead-sign*3],[xx,lead+sign*3]],'#e6e7e79c',1);} }
 if(!reduced&&w.started)for(let j=1;j<=3;j++){const yy=back-sign*j*7;line(c,[[-length/2+10+j*8,yy],[length/2-10-j*8,yy]],['#d4a4bc59','#ac82a637','#9785a51f'][j-1],1.4);}
 c.restore();
}
export function drawBladeWavesFloor(c,s,h,v,g,t,reduced=false){
 c.save();clip(c);
 const current=waves(v);for(const w of current){if(!w.started)continue;for(const r of w.segments||[])blade(c,r,w,reduced);if(w.gapRegion){shape(c,w.gapRegion,MINT+'9c',2,'#79ffe00b');}}
 // Preview is a narrow alignment target, not an all-floor immunity zone.
 if(g.targetRegion){c.setLineDash([5,6]);shape(c,g.targetRegion,MINT+'69',1.5,'#79ffe008');c.setLineDash([]);}
 c.restore();
}
function edgeBadge(c,w,index){
 const {nx,ny}=axes(w),ox=w.originX??(640-nx*700),oy=w.originY??(480-ny*300);let x=clamp(ox,82,1198),y=clamp(oy,344,618);
 // Keep edge markers inside the playfield; bottom HUD and top guidance remain free.
 if(Math.abs(nx)>.85){x=nx>0?88:1192;y=clamp(w.y??480,374,585);}else if(Math.abs(ny)>.85){y=ny>0?346:617;x=clamp(w.x??640,145,1135);}
 const incoming=w.started?'진행':'진입',color=w.started?'#f0bac6':'#f1d6aa';arrow(c,x-nx*12,y-ny*12,x+nx*13,y+ny*13,color,7);if(Math.abs(ny)>.85){box(c,x-48,y+(ny>0?15:-38),96,21,'#2a2634e8',3);text(c,`${index}차 ${incoming}`,x,y+(ny>0?30:-23),11,color);}else{const xx=x+(nx>0?51:-51);box(c,xx-36,y-11,72,22,'#2a2634e8',3);text(c,`${index}차 ${incoming}`,xx,y+4,11,color);}
}
export function drawBladeWavesGuides(c,s,h,v,g,t,reduced=false){
 c.save();c.save();clip(c);
 for(const r of v.dangerRegions||[]){shape(c,r,'#1a2433',7);shape(c,r,'#ffdddb',2.5);}
 const active=waves(v);for(const w of active)if(w.started&&w.gapRegion){shape(c,w.gapRegion,MINT,3);}
 if(g.targetRegion){c.setLineDash([7,6]);shape(c,g.targetRegion,'#092c32',6);shape(c,g.targetRegion,MINT,2.5);c.setLineDash([]);}
 c.restore();
 active.slice(0,2).forEach((w,i)=>edgeBadge(c,w,(v.phaseIndex??0)===4?`5-${(w.waveIndex||0)+1}`:(v.phaseIndex??0)+1));
 const reached=!!(g.targetReached??g.destinationReached),target=g.target||v.guide;
 if(!reached&&target){const dx=target.x-s.player.x,dy=target.y-s.player.y,l=Math.hypot(dx,dy)||1;arrow(c,s.player.x+dx/l*14,s.player.y+dy/l*14,target.x,target.y,MINT,13,true);}
 if(target){c.beginPath();c.ellipse(target.x,target.y,15,9,0,0,TAU);c.strokeStyle=MINT;c.lineWidth=2;c.stroke();const x=clamp(target.x,130,1150),y=clamp(target.y+29,364,624);box(c,x-67,y-17,134,25,'#092b30ef',4);text(c,reached?'빈틈 정렬 완료':'여기 · 빈틈 맞추기',x,y,14,MINT);}
 c.restore();
}
export function bladeWaveInstruction(h,v,g){
 const phase=(v.phaseIndex??h.domainPhase??0)+1,count=v.phaseCount||5,reached=!!(g.targetReached??g.destinationReached),focus=(v.waves||[])[v.bladeCheckpoint||0],direction=focus?directionName(focus):'',turn=phase===5&&(v.bladeCheckpoint||0)>0,cleared=!!focus?.cleared;
 const title=cleared?'통과! 다음 칼날 준비':turn&&!reached?'방향 전환! 새 빈틈으로':reached?'빈틈에 맞춘 채 대기':'민트 빈틈에 몸을 맞추세요';
 const arrival=Number.isFinite(g.arrivalSeconds)&&!cleared?` · 도착 ${Math.max(0,g.arrivalSeconds).toFixed(1)}초`:'';
 return{title,tip:cleared?'다음 벽은 다른 방향 · 새 민트 표식을 확인하세요':`${direction}${arrival} · 칼날 접촉 즉사`,timerLabel:!h.active?'출발까지':g.warning?'다음 칼날':'통과까지',targetReached:reached};
}
