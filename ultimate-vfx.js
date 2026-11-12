/** Impact-driven performances. Every stroke belongs to an actual engine strike. */
import { drawFighter2D } from './fighter2d.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
function line(c,pts,color,width=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke()}
function poly(c,pts,color){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill()}
function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function caption(c,value,x,y,size,color){c.font=`900 ${size}px "Noto Sans KR",sans-serif`;c.textAlign='center';c.strokeStyle='#10222d';c.lineWidth=4;c.strokeText(value,x,y);c.fillStyle=color;c.fillText(value,x,y)}
function corners(c,x,y,w,h,color,width=2){for(const sx of [-1,1])for(const sy of [-1,1])line(c,[[x+sx*(w/2-22),y+sy*h/2],[x+sx*w/2,y+sy*h/2],[x+sx*w/2,y+sy*(h/2-18)]],color,width)}
function star(c,x,y,r,color,rotation=0){const pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4+rotation;pts.push([x+Math.cos(a)*r*(i%2?.17:1),y+Math.sin(a)*r*(i%2?.17:1)]);}poly(c,pts,color)}
// A curved, genuinely tapered strip: opaque ivory edge, coloured body, thin echo.
function blade(c,x,y,length,angle,thickness,color,age,reduced=false){c.save();c.translate(x,y);c.rotate(angle);const sweep=reduced?0:age*20;c.translate(sweep,0);const g=c.createLinearGradient(-length*.6,-20,length*.55,20);g.addColorStop(0,color+'00');g.addColorStop(.45,color+'bd');g.addColorStop(.8,'#f7f1d6ee');g.addColorStop(1,color+'00');c.beginPath();c.moveTo(-length*.62,16);c.bezierCurveTo(-length*.25,-thickness*1.8,length*.22,-thickness*1.5,length*.58,-5);c.bezierCurveTo(length*.10,-thickness*.15,-length*.25,thickness*.35,-length*.62,16);c.closePath();c.fillStyle=g;c.fill();c.beginPath();c.moveTo(-length*.49,9);c.bezierCurveTo(-length*.18,-thickness*1.2,length*.2,-thickness*.8,length*.55,-5);c.strokeStyle='#fff5dc';c.lineWidth=2;c.stroke();c.beginPath();c.moveTo(-length*.42,24);c.bezierCurveTo(-length*.11,-thickness*.6,length*.26,-thickness*.2,length*.48,6);c.strokeStyle=color+'9e';c.lineWidth=1;c.stroke();c.restore()}
function spark(c,x,y,age,index,color,reduced,power=1){const n=reduced?5:14,a=clamp(1-age);c.save();c.globalAlpha*=a;star(c,x,y,(reduced?18:36*(1-age)+6)*power,'#f8edcb',index*.6);star(c,x,y,18*power,color,index*.7+.5);for(let i=0;i<n;i++){const ang=i*2.399+index*.8,rr=(18+age*(65+i%3*14))*power,x0=x+Math.cos(ang)*rr*.5,y0=y+Math.sin(ang)*rr*.55,x1=x+Math.cos(ang)*rr,y1=y+Math.sin(ang)*rr*.9;line(c,[[x0,y0],[x1,y1]],i%3?color:'#f4e9c4',(i%3===0?3:1.6)*a);if(i%3===0)star(c,x1,y1,2.5*(1-age),color,ang);}c.restore()}
function slate(c,x,y,age,scale=1){c.save();c.translate(x,y);c.rotate(-.16+age*.16);c.scale(scale,scale);box(c,-55,-37,110,77,'#142d38',5);c.strokeStyle='#e6dfb6';c.lineWidth=2;c.strokeRect(-55,-37,110,77);for(let i=0;i<3;i++)line(c,[[-46,-5+i*12],[46,-5+i*12]],'#c5d4b755',1);c.save();c.translate(-55,-37);c.rotate(-Math.max(0,.20-age)*3);box(c,0,-17,110,17,'#e9e6c8',2);for(let i=0;i<9;i++)poly(c,[[i*14,-17],[i*14+8,-17],[i*14,0],[i*14-8,0]],'#28454d');c.restore();caption(c,'ACTION!',0,25,22,'#f3f1c4');c.restore()}
function arrow(c,x,y,length,angle,color){c.save();c.translate(x,y);c.rotate(angle);const g=c.createLinearGradient(-length,0,10,0);g.addColorStop(0,color+'00');g.addColorStop(1,color);line(c,[[-length,0],[14,0]],g,2.5);poly(c,[[28,0],[9,-7],[14,0],[9,7]],'#f3edcd');line(c,[[-length*.7,-6],[-length*.6,0],[-length*.7,6]],color,1.5);c.restore()}
export function drawSequenceTrail(c,e,reduced=false){
 if(e.type!=='slash'||!e.hitIndex)return false;
 const age=clamp(1-e.life/(e.maxLife||.18)),n=e.hitIndex,dir=e.facing||1,heavy=!!e.finisher,x=e.x,y=e.y-30;
 c.save();c.globalAlpha=clamp(e.life/(e.maxLife||.18))* .87;
 const a=(n%2?-.65:.50)*dir+(heavy?-.30:0),length=(heavy?245:155)+(n%3)*18;
 blade(c,x,y,length,a,heavy?34:20,e.kind==='slate'?'#d8dfad':'#a7cde9',age,reduced);
 if(!reduced)blade(c,x-dir*12,y+13,length*.83,a+.15,9,e.kind==='slate'?'#d7c99b':'#c4b8de',age,true);
 c.restore();return true;
}
export function ultimatePhase(character,index=1){
 if(character==='actor')return index===12?{id:'final',label:'피날레',color:'#ead6ff',pose:'finisher',role:'sword'}:index<=4?{id:'sword',label:'검사 연기',color:'#a7b9ff',pose:'sword',role:'sword'}:index<=8?{id:'bow',label:'궁수 연기',color:'#87dcf4',pose:'skill',role:'bow'}:{id:'action',label:'액션 연기',color:'#efd29c',pose:'finisher',role:'sword'};
 return index===12?{id:'final',label:'파이널 컷',color:'#f2e5b3',pose:'finisher',role:'sword'}:index<=4?{id:'light',label:'조명팀, 액션!',color:'#f6d99a',pose:'slate',role:'sword'}:index<=8?{id:'sound',label:'음향팀, 액션!',color:'#99d9ee',pose:'slate',role:'sword'}:{id:'action',label:'전원, 액션!',color:'#e7b4d3',pose:'slate',role:'sword'};
}
function renderStrike(c,e,role,reduced){
 const age=clamp(1-e.life/(e.maxLife||.24)),n=e.strikeIndex||e.hitIndex||1,x=e.x,y=e.y-79,dir=e.direction||1,alpha=clamp(e.life/(e.maxLife||.24));
 c.save();c.globalAlpha=Math.min(.96,alpha*1.6);
 if(role==='actor'){
  if(n>=5&&n<=8&&!e.finisher){for(let j=-1;j<=1;j++)arrow(c,x+dir*(j?0:12),y+j*13,240+j*19,dir===1?-.07:Math.PI+.07,j?'#adc4eb':'#e4d6ad');}
  else{const angle=([-0.72,.56,-.18,.88,-.93,.26][(n-1)%6])*dir;blade(c,x,y,290+(n%4)*32,angle,42,'#8faff8',age,reduced);if(!reduced){blade(c,x-dir*20,y+14,255,angle-.16,14,'#b89ce8',age,true);blade(c,x+dir*12,y-15,270,angle+.13,9,'#82c3f0',age,true);}}
  if(n>=9&&n<=11){blade(c,x-9,y+11,370,-.82*dir,41,'#ebcda4',age,reduced);if(!reduced)blade(c,x+15,y-6,310,.62*dir,22,'#9ddbc6',age,true);}
  spark(c,x,y,age,n,ultimatePhase(role,n).color,reduced,e.finisher?1.6:1);
 }else{
  const phase=ultimatePhase(role,n);if(phase.id==='light'){const g=c.createLinearGradient(x,Math.max(160,y-210),x,y+38);g.addColorStop(0,'#f4d08a00');g.addColorStop(1,'#f4d08a67');poly(c,[[x-18,y-210],[x+18,y-210],[x+72,y+38],[x-72,y+38]],g);line(c,[[x,y-140],[x,y+24]],'#f6e6b2',2);}else if(phase.id==='sound'){for(let j=0;j<3;j++){c.beginPath();c.ellipse(x,y,(48+j*26)*(1+age*.4),24+j*13,0,-1.1,1.1);c.strokeStyle=j%2?'#a2ddec':'#aabdea';c.lineWidth=3-j*.5;c.stroke();}}else if(phase.id==='action'){for(let j=-1;j<=1;j++)blade(c,x+j*15,y+j*12,285,(-.55+j*.48),22,'#e5a9cf',age,reduced);}
  const width=200+(n%3)*26,height=118+(n%2)*22;corners(c,x,y,width,height,'#eadcaf',2.5);line(c,[[x-dir*170,y+(n%2?26:-24)],[x+dir*32,y]],'#e5d1a6',2.5);
  if(n%3===1){c.save();c.translate(x,y);c.rotate(n%2?-.15:.12);box(c,-64,-26,128,47,'#112b38d9',3);caption(c,['READY','ACTION','CUT'][(Math.floor(n/3))%3],0,9,25,'#f3e8b8');c.restore()}
  else if(n%3===2)slate(c,x,y,age,.80);
  else{blade(c,x,y,300,.22*dir,25,'#e9dfac',age,reduced);corners(c,x,y,254,168,'#b2d2bd',1);}
  spark(c,x,y,age,n,phase.color,reduced,1);
 }
 // Real hit index, not a decorative damage number. Engine damage text stays independent.
 if(!e.finisher)caption(c,`${String(n).padStart(2,'0')} HIT`,clamp(x+dir*95,70,1210),clamp(y-82,250,520),16,role==='actor'?'#e0e9ff':'#eeebbd');
 c.restore();
}
function finish(c,e,reduced){const age=clamp(1-e.life/(e.maxLife||.8)),alpha=clamp((1-age)/.42),x=e.x,y=e.y-85,actor=e.character==='actor';c.save();c.globalAlpha=.98*alpha;
 const g=c.createRadialGradient(x,y,10,x,y,260);g.addColorStop(0,(actor?'#d6e6ff':'#e9ddb4')+'3d');g.addColorStop(1,'#ffffff00');box(c,x-270,y-270,540,540,g);
 if(actor){blade(c,x,y,650,-.63,92,'#afcfee',age,reduced);blade(c,x+8,y+9,510,.50,48,'#d9c4e7',age,reduced);if(!reduced)for(let j=0;j<3;j++)blade(c,x-30,y+25+j*16,390+j*30,-.67,14,'#b6cfdf',age,true);}
 else{corners(c,x,y,470+age*90,270+age*50,'#f0e7b8',3);slate(c,x,y,age,2.35);for(let j=0;j<3;j++){line(c,[[x-245,y-100+j*95],[x+245,y-100+j*95]],'#e3d9ae66',1);}}
 spark(c,x,y,age,12,actor?'#d2deff':'#f2e7b7',reduced,2.7);
 if(!reduced)for(let i=0;i<20;i++){const a=i*2.399,rr=64+age*(180+(i%4)*24),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.55;c.save();c.translate(xx,yy);c.rotate(i+age*2);box(c,-(i%3?2:7),-2,i%3?4:14,4,i%2?'#c4d6ed':'#eadcb2',1);c.restore();}
 caption(c,actor?'CURTAIN CALL!':'FINAL CUT!',clamp(x,270,1010),clamp(y-170,257,400),actor?36:38,'#fff0cd');c.restore();}
export function drawUltimatePerformance(c,s,t,reduced=false){
 const p=s.player,q=p.attackSequence,impacts=s.effects.filter(e=>e.type==='impact'&&e.kind==='ultimate'&&e.damage>0),finishes=s.effects.filter(e=>e.type==='ultimateFinish');
 if(!impacts.length&&!finishes.length&&q?.kind!=='ultimate')return false;
 // Stable bounded work: engine retains <180 effects; at most four targets per recent strike.
 for(const e of impacts.slice(-12))renderStrike(c,e,e.character||p.character,reduced);
 if(q?.kind==='ultimate'&&!reduced){const phase=clamp(q.elapsed/q.duration),step=q.hitIndex,dir=p.facing||1;c.save();c.globalAlpha=.24;
  if(p.character==='actor'){drawFighter2D(c,'actor',p.x-dir*68,p.y-5,1,{time:t,facing:dir,attack:.3,attackKind:ultimatePhase('actor',step).pose,attackProgress:.48,role:ultimatePhase('actor',step).role,comboIndex:step%4+1,reduced:true});if(step>5){c.globalAlpha=.15;drawFighter2D(c,'actor',p.x+dir*72,p.y+3,1,{time:t,facing:dir,attack:.3,attackKind:'finisher',attackProgress:.65,comboIndex:4,reduced:true});}}
  else{corners(c,p.x,p.y-96,150,200,'#e4e2ac',1.5);for(let i=0;i<6;i++){const yy=p.y-170+((phase*240+i*23)%156);box(c,p.x-76,yy,10,6,'#dfdfb5',1);box(c,p.x+66,yy,10,6,'#dfdfb5',1);}}c.restore();
 }
 for(const e of finishes.slice(-1))finish(c,e,reduced);
 return true;
}
