/** Small, readable kit signatures. Decorative particles never create combat hits. */
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function poly(c,points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill()}
function line(c,points,color,w=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineWidth=w;c.strokeStyle=color;c.lineCap='round';c.stroke()}
function ellipse(c,x,y,rx,ry,color,w=2){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.strokeStyle=color;c.lineWidth=w;c.stroke()}
function text(c,value,x,y,size,color,align='center'){c.font=`800 ${size}px "Noto Sans KR",sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y)}
function star(c,x,y,r,color,angle=0){const pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4+angle;pts.push([x+Math.cos(a)*r*(i%2?.19:1),y+Math.sin(a)*r*(i%2?.19:1)]);}poly(c,pts,color)}
export function drawEmpoweredArrow(c,q,reduced=false){
 const x=q.x,y=q.y-57,angle=Math.atan2(q.vy,q.vx);c.save();c.translate(x,y);c.rotate(angle);
 const g=c.createLinearGradient(-184,0,39,0);g.addColorStop(0,'#75bffc00');g.addColorStop(.56,'#779ff46a');g.addColorStop(.86,'#b1e6f3c4');g.addColorStop(1,'#ebf5e6');
 poly(c,[[-188,-3],[-65,-15],[28,-7],[54,0],[28,7],[-65,15]],g);line(c,[[-166,0],[37,0]],'#eaf9e5',3.5);poly(c,[[63,0],[27,-17],[37,0],[27,17]],'#d3f1e7');poly(c,[[54,0],[30,-8],[37,0],[30,8]],'#698fdb');
 for(const j of [-1,1]){line(c,[[-116,j*21],[-76,j*12],[-47,j*15]],'#ada3ed',2);line(c,[[-167,j*22],[-98,j*22]],'#87b9e778',1.2);}if(!reduced){star(c,-46,0,17,'#c8d6f0',.4);star(c,-110,8,5,'#b5b9e8',.3);}c.restore();
}
export function drawCueDetonation(c,e,reduced=false){
 const age=clamp(1-e.life/(e.maxLife||.5)),alpha=clamp(1-age),index=e.cueIndex||e.hitIndex||1,count=e.cueCount||3,x=e.x,y=e.y-65,color=['#f5d897','#a9dcea','#d4b2ef'][(index-1)%3];c.save();c.globalAlpha=Math.min(1,alpha*1.7);
 const g=c.createRadialGradient(x,y,1,x,y,97);g.addColorStop(0,color+'69');g.addColorStop(1,color+'00');box(c,x-98,y-98,196,196,g);star(c,x,y,(reduced?33:51*(1-age)+12),color,index*.4);star(c,x,y,23,'#f3edcf',.3);
 for(let i=0;i<(reduced?5:12);i++){const a=i*2.399+index,rr=18+age*(85+i%3*9);line(c,[[x+Math.cos(a)*rr*.55,y+Math.sin(a)*rr*.55],[x+Math.cos(a)*rr,y+Math.sin(a)*rr]],i%3?color:'#efedce',2.3*(1-age)+.5);}
 c.save();c.translate(x,y-87);box(c,-46,-19,92,27,'#162c36ed',4);text(c,`액션 ${index} / ${count}`,0,0,13,color);c.restore();c.restore();
}
export function drawStaffStrike(c,e,origin,reduced=false){
 const age=clamp(1-e.life/(e.maxLife||.5)),alpha=clamp(1-age),type=e.staffType||e.staffRole||'light',x=e.x,y=e.y-69,ox=e.originX??origin.x,oy=e.originY??(origin.y-80),light=type==='light'||type==='lighting'||type==='spotlight',color=light?'#ecd29c':'#a6dbe9';c.save();c.globalAlpha=Math.min(.9,alpha*1.5);
 // A compact tripod or amplifier appears at the crew's firing origin.
 if(light){line(c,[[ox-20,oy+22],[ox-30,oy+55],[ox-7,oy+55]],'#c6c8b5',2);box(c,ox-36,oy+3,31,24,'#243745',4);poly(c,[[ox-5,oy+6],[ox+9,oy+1],[ox+9,oy+27],[ox-5,oy+22]],'#d6c6a0');const g=c.createLinearGradient(ox,oy,x,y);g.addColorStop(0,'#e7d4a323');g.addColorStop(1,'#e7d4a37d');poly(c,[[ox+8,oy+8],[x+20,y-28],[x+20,y+28],[ox+8,oy+23]],g);line(c,[[ox+10,oy+16],[x,y]],'#eadcba',2);}
 else{box(c,ox-28,oy+10,24,38,'#223b4a',3);ellipse(c,ox-16,oy+24,7,7,'#accfd9',1.6);ellipse(c,ox-16,oy+39,5,5,'#799cae',1.5);const ang=Math.atan2(y-oy,x-ox),distance=Math.hypot(x-ox,y-oy);for(let i=1;i<=3;i++){const rr=distance*i/4,px=ox+Math.cos(ang)*rr,py=oy+Math.sin(ang)*rr;c.save();c.translate(px,py);c.rotate(ang);c.beginPath();c.ellipse(0,0,10+rr*.03,15+i*7,0,-1.15,1.15);c.strokeStyle=color;c.lineWidth=2.5;c.stroke();c.restore();}}
 star(c,x,y,31*(1-age)+8,color,.5);star(c,x,y,13,'#ecf1d7',0);if(!reduced)for(let i=0;i<8;i++){const a=i*2.399,r=18+age*70;line(c,[[x+Math.cos(a)*r*.5,y+Math.sin(a)*r*.5],[x+Math.cos(a)*r,y+Math.sin(a)*r]],color,1.7);}c.restore();
}
export function drawCueMarks(c,unit,count=0,t=0,reduced=false){
 if(unit.hp<=0||unit.active===false)return;const x=unit.x,y=Math.max(137,unit.y-232-(unit.launchZ||0));c.save();box(c,x-57,y-20,114,36,'#102631ed',5);text(c,'액션 표식',x,y-6,10,'#c8d3c4');for(let i=0;i<3;i++){const on=i<count,xx=x-28+i*28;box(c,xx-9,y+2,18,6,on?['#f3d79e','#9fd6e4','#cab0eb'][i]:'#35464f',2);if(on&&i===count-1&&!reduced)line(c,[[xx-8,y+12],[xx+8,y+12]],'#f2ebc6',1);}c.restore();
}
export function drawDialogueBox(c,event,{x=360,y=122,width=560}={}){
 if(!event?.text)return;const life=event.life??1,max=event.maxLife??1,fade=Math.min(1,life/.18,(max-life)/.08+.15),speaker=event.speakerName||event.speaker||event.character||'';c.save();c.globalAlpha=clamp(fade);box(c,x,y,width,61,'#102630f5',6);box(c,x,y,3,61,event.color||'#d8e6ba',2);text(c,speaker,x+17,y+20,11,event.color||'#c9e6d6','left');const value=String(event.text);text(c,value,x+17,y+45,Math.min(16,(width-34)/Math.max(1,value.length)), '#f1f0de','left');c.restore();
}
export function drawKitEffects(c,s,t,reduced=false){
 let drawn=false;
 const bursts=s.effects.filter(e=>e.type==='supportBurst'&&['cue-detonation','staff'].includes(e.source||e.signature));
 for(const e of bursts){if((e.source||e.signature)==='cue-detonation')drawCueDetonation(c,e,reduced);else drawStaffStrike(c,e,s.player,reduced);drawn=true;}
 for(const e of s.effects){if(e.type!=='impact')continue;const source=e.source||e.signature,hasBurst=bursts.some(b=>b.attackId===e.attackId&&(b.source||b.signature)===source&&b.cueIndex===e.cueIndex&&b.staffType===e.staffType);
  if(source==='cue-detonation'&&!hasBurst){drawCueDetonation(c,e,reduced);drawn=true;}
  else if(source==='staff'&&!hasBurst){drawStaffStrike(c,e,s.player,reduced);drawn=true;}
  else if(source==='adlib-arrow'||hasBurst){c.save();const alpha=clamp(e.life/(e.maxLife||.24));c.globalAlpha=alpha;star(c,e.x,e.y-65,hasBurst?26:52,source==='cue-detonation'?'#f0d3a7':'#a9d9f2',-.2);star(c,e.x,e.y-65,hasBurst?12:23,'#f0f7df',.2);if(!hasBurst)for(let j=-1;j<=1;j++)line(c,[[e.x-82,e.y-72+j*13],[e.x+52,e.y-56+j*9]],'#b1b9ed',2);c.restore();drawn=true;}
 }

 const pending=s.followups?.filter(e=>e.source==='cue-detonation')||[];
 if(pending.length){const x=clamp(pending[0].x,120,1160),y=clamp(pending[0].y-235,137,405),total=pending[0].cueCount||3,first=Math.min(...pending.map(e=>e.cueIndex||1));c.save();box(c,x-75,y-19,150,38,'#122c37e8',4);text(c,'액션 표식 점화',x,y-5,10,'#d4dfce');for(let i=1;i<=total;i++){const xx=x+(i-(total+1)/2)*35,current=i===first,color=current?'#f5df9d':i<first?'#829b95':'#bbcae0';text(c,String(i),xx,y+12,current?16:13,color);if(i<total)text(c,'›',xx+18,y+11,12,'#829b95');}c.restore();}
 return drawn;
}
export function skillCardState(s,key){
 const p=s.player;if(p.character==='actor'&&key==='W'&&p.adlibReady)return{label:'애드리브 준비',color:'#a8dff6'};
 if(p.character==='actor'&&key==='Q'&&p.nextFinisherReady)return{label:'강마무리 준비',color:'#e5c2f5'};
 if(p.character==='director'&&key==='E'&&p.crewReady)return{label:'스태프 대기',color:'#eedda7'};
 if(p.character==='director'&&key==='W'&&s.boss.cueMarks>0)return{label:`표식 점화 ×${s.boss.cueMarks}`,color:'#eddaa7'};
 return null;
}
