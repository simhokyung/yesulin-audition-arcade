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
function rectangle(x,y,w,h){return[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];}
function overlap(a,b){for(const pts of [a,b])for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length],nx=-(q.y-p.y),ny=q.x-p.x;let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;for(const v of a){const n=v.x*nx+v.y*ny;amin=Math.min(amin,n);amax=Math.max(amax,n);}for(const v of b){const n=v.x*nx+v.y*ny;bmin=Math.min(bmin,n);bmax=Math.max(bmax,n);}if(amax<=bmin||bmax<=amin)return false;}return true;}
function hazardShape(h){
 if(h.type==='lane'){const a=h.angle||0,co=Math.cos(a),si=Math.sin(a);return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:h.x+x*h.width/2*co-y*h.height/2*si,y:h.y+x*h.width/2*si+y*h.height/2*co}));}
 if(h.type==='circle')return Array.from({length:16},(_,i)=>({x:h.x+Math.cos(i*TAU/16)*h.radius,y:h.y+Math.sin(i*TAU/16)*(h.radiusY||h.radius*.55)}));return null;
}
function speechLines(c,value,maxWidth){
 const letters=Array.from(String(value).replace(/\s+/g,' ').trim()),lines=[];let line='';
 for(const letter of letters){const next=line+letter;if(c.measureText(next).width>maxWidth&&line){lines.push(line.trim());line=letter.trim();if(lines.length===2)break;}else line=next;}
 if(lines.length<2&&line)lines.push(line.trim());if(lines.join('').replace(/\s/g,'').length<letters.join('').replace(/\s/g,'').length){let last=lines.at(-1)||'';while(last&&c.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);lines[lines.length-1]=last+'…';}return lines.slice(0,2);
}
/** Pure layout: reject HUD, combatants and exact floor telegraphs before drawing a single bubble. */
export function dialogueLayout(c,s,event){
 if(!event?.text||!String(event.text).trim()||s.cinematic||s.hazards.some(h=>h.kind==='domain'))return null;const p=s.player;c.save();c.font='800 16px "Noto Sans KR",sans-serif';const lines=speechLines(c,event.text,224),w=Math.max(120,Math.min(248,Math.max(...lines.map(v=>c.measureText(v).width))+24)),h=lines.length*20+17;c.restore();
 const head={x:p.x,y:p.y-173-(p.launchZ||0)},side=s.boss.x>=p.x?-1:1,choices=[{x:p.x-w/2,y:head.y-h-34},{x:p.x+side*(55+(side<0?w:0)),y:head.y-28},{x:p.x-side*(55+(side>0?w:0)),y:head.y-28},{x:p.x+side*(55+(side<0?w:0)),y:head.y+34}];
 const units=[p,s.boss,...s.enemies,...(s.audition?.figures||[])].filter(u=>u.hp>0),blocked=units.map(u=>rectangle(u.x-48,u.y-195-(u.launchZ||0),96,205));if(s.combo>1)blocked.push(rectangle(1090,150,166,120));if(p.comboIndex>0||p.attackSequence)blocked.push(rectangle(36,205,212,140));if(p.character==='director')blocked.push(rectangle(s.boss.x-65,s.boss.y-260-(s.boss.launchZ||0),130,52));if(p.hp/p.maxHp<=.3){const side=s.boss.x>=p.x?-1:1;blocked.push(rectangle(clamp(p.x+side*96,80,1200)-57,clamp(p.y-83,258,590)-22,114,37));}if(s.boss.counterRemaining>0){const side=s.boss.facing===1?-1:1;blocked.push(rectangle(clamp(s.boss.x+side*99,95,1185)-54,clamp(s.boss.y-82,277,566)-31,108,49));}for(const h of s.hazards){const shape=hazardShape(h);if(shape)blocked.push(shape);}
 for(const raw of choices){const x=clamp(raw.x,28,1252-w),y=clamp(raw.y,242,626-h),shape=rectangle(x-5,y-5,w+10,h+10);if(blocked.some(p=>overlap(shape,p)))continue;
  const edge={x:clamp(head.x,x+10,x+w-10),y:clamp(head.y,y+5,y+h-5)},dx=head.x-edge.x,dy=head.y-edge.y,len=Math.hypot(dx,dy)||1,tip={x:edge.x+dx/len*15,y:edge.y+dy/len*15};return{x,y,width:w,height:h,lines,head,edge,tip};
 }return null;
}
export function drawDialogueBox(c,event,{state,layout}={}){
 const at=layout||(state?dialogueLayout(c,state,event):null);if(!at)return false;const life=event.life??event.remaining??1,max=event.maxLife??event.duration??1,fade=Math.min(1,life/.18,(max-life)/.08+.15),color=event.color||(state?.player.character==='director'?'#f1d894':'#c5c4f3'),{x,y,width,height,edge,tip}=at;
 c.save();c.globalAlpha=clamp(fade);const dx=tip.x-edge.x,dy=tip.y-edge.y,len=Math.hypot(dx,dy)||1;poly(c,[[edge.x-dy/len*6,edge.y+dx/len*6],[tip.x,tip.y],[edge.x+dy/len*6,edge.y-dx/len*6]],'#f4efd9');box(c,x,y,width,height,'#f4efd9f5',7);box(c,x,y,3,height,color,2);for(let i=0;i<at.lines.length;i++)text(c,at.lines[i],x+12,y+23+i*20,16,'#253743','left');c.restore();return true;
}
export function drawRoleArrow(c,q,reduced=false){
 c.save();c.translate(q.x,q.y-57);c.rotate(Math.atan2(q.vy,q.vx));line(c,[[-34,0],[18,0]],'#e6d5b1',2);poly(c,[[27,0],[14,-5],[17,0],[14,5]],'#c7e7f1');for(const side of [-1,1])poly(c,[[-31,side*6],[-18,side*3],[-24,0],[-36,0]],side>0?'#b5a5dd':'#7fc4d7');if(!reduced){line(c,[[-54,-2],[-37,-2]],'#8cbdda70',1);line(c,[[-49,3],[-34,3]],'#d1c6eb60',1);}c.restore();
}
export function drawRolePresence(c,s,t,reduced=false){
 const p=s.player,f=p.facing||1,domain=s.hazards.some(h=>h.kind==='domain'),skill=p.attackKind==='skill'&&p.attackAnim>0,age=clamp(p.attackProgress||0);
 c.save();if(p.character==='director'){
  if(skill){const x=p.x+f*57,y=p.y-155-(p.launchZ||0);c.save();c.translate(x,y);c.scale(f,1);c.globalAlpha=(1-age)*.65;for(let i=0;i<3;i++){c.beginPath();c.ellipse(10+i*17+age*25,0,10+i*4,14+i*8,0,-1.1,1.1);c.strokeStyle=i===2?'#d8e5b0':'#ffe3a4';c.lineWidth=i===0?3:1.5;c.stroke();}c.restore();}
  if(p.crewReady){const x=p.x-f*61,y=p.y-42;line(c,[[x,y-2],[x-9,y+16],[x+9,y+16]],'#b5cabf',1.5);box(c,x-11,y-15,22,14,'#31464e',3);ellipse(c,x+f*9,y-8,5,7,'#ecd69e',2);const sx=x-f*29;box(c,sx-9,y-7,18,25,'#243e4b',3);ellipse(c,sx,y+1,5,5,'#a4ddec',1.3);ellipse(c,sx,y+11,3,3,'#7facc5',1.1);}
  const hit=s.effects.filter(e=>e.type==='impact'&&['basic','finisher'].includes(e.kind)).at(-1);if(hit&&!domain){const a=clamp(hit.life/(hit.maxLife||.24));c.save();c.globalAlpha=a;const x=hit.x,y=hit.y-70;c.translate(x,y);c.rotate(-.12);box(c,-16,-12,32,23,'#243d45',2);box(c,-18,-17,36,6,'#f2dfb4',1);for(let i=0;i<4;i++)poly(c,[[-17+i*9,-17],[-11+i*9,-17],[-15+i*9,-11],[-21+i*9,-11]],'#42595d');line(c,[[-10,-5],[10,-5]],'#d6dcb9',1);star(c,18,-14,7,'#f5de9b',.2);c.restore();}
 }else if(p.buffTimer>0){const x=p.x,y=p.y-103-(p.launchZ||0),bow=p.castRole==='bow'&&p.castTimer>0;c.globalAlpha=domain?.15:.34;for(const side of [-1,1])line(c,[[x+side*30,y-49],[x+side*38,y-49],[x+side*38,y+31],[x+side*30,y+31]],bow?'#8fdaeb':'#c8b5f0',1.5);if(!reduced)for(let i=0;i<3;i++)star(c,x+Math.sin(i*2.1)*27,y-25-((t*16+i*23)%58),2.5,bow?'#b5eaf0':'#e0c9f0',.2);}
 c.restore();
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
