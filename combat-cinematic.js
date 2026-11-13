/** Original hero ultimates and four distinct judge introductions. Combat remains 2D. */
import { BOSS_VISUALS } from './boss-visuals.js';
import { getTakeoverArtwork } from './domain-cinematic.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>1-Math.pow(1-clamp(x),3),TAU=Math.PI*2;
const heroArt={};
for(const role of ['actor','director']){if(typeof Image==='undefined')continue;const image=new Image();image.decoding='async';image.src=new URL(`./assets/${role}-ultimate-v9.png`,import.meta.url).href;heroArt[role]=image;}
export function combatCinematicAssetStatus(){return Object.fromEntries(['actor','director'].map(role=>[role,!!(heroArt[role]?.complete&&heroArt[role]?.naturalWidth)]));}
function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function line(c,points,color,w=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.stroke()}
function text(c,value,x,y,size,color,weight=800){c.font=`${weight} ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(value,x,y)}
function corners(c,x,y,w,h,color){for(const a of [-1,1])for(const b of [-1,1])line(c,[[x+a*(w/2-28),y+b*h/2],[x+a*w/2,y+b*h/2],[x+a*w/2,y+b*(h/2-22)]],color,2)}
function coverArt(c,image,p,color,reduced,flip=1,style='classic'){
 const bg=c.createRadialGradient(640,290,20,640,340,740);bg.addColorStop(0,color);bg.addColorStop(1,'#07101e');box(c,0,0,1280,720,bg);
 if(!image?.complete||!image.naturalWidth)return;const zoom=reduced?1:style==='lamp'?1.105-.075*ease(p):style==='ribbon'?1.025+.035*ease(p):1.075-.04*ease(p),scale=Math.max(1280/image.naturalWidth,720/image.naturalHeight)*zoom,w=image.naturalWidth*scale,h=image.naturalHeight*scale;
 c.drawImage(image,(1280-w)/2+(reduced?0:flip*(1-ease(p))*(style==='ribbon'?35:22)),(720-h)/2+(reduced?0:style==='lamp'?-14*(1-ease(p)):6*Math.sin(p*Math.PI)),w,h);
}
function lampOpening(c,p,reduced){
 const opening=reduced?1:ease(p/.44);
 for(const side of [-1,1]){const x=640+side*525,g=c.createLinearGradient(x,64,x-side*170,610);g.addColorStop(0,'#ffe4a966');g.addColorStop(.65,'#e7ab6424');g.addColorStop(1,'#de9d5700');c.beginPath();c.moveTo(x-18,45);c.lineTo(x+18,45);c.lineTo(x-side*80+140,654);c.lineTo(x-side*80-140,654);c.closePath();c.fillStyle=g;c.fill();
  c.save();c.globalAlpha=.5;for(let i=0;i<3;i++){c.beginPath();c.ellipse(x,83,19+i*10,11+i*5,0,0,TAU);c.strokeStyle=i===0?'#fff1c1':'#e6b574';c.lineWidth=i===0?2:1;c.stroke();}c.restore();
  if(!reduced)for(let i=0;i<11;i++){const phase=(p*.72+i*.087)%1,xx=x-side*(30+phase*150)+Math.sin(i*4.1)*25,yy=556-phase*320;c.globalAlpha=(1-phase)*.65;line(c,[[xx,yy],[xx+side*3,yy-7]],i%2?'#e2b66a':'#fff0b7',1.5);}c.globalAlpha=1;
 }
 if(opening<1){const shutter=(1-opening)*333;box(c,0,0,1280,shutter,'#261b23');box(c,0,720-shutter,1280,shutter,'#261b23');line(c,[[0,shutter],[1280,shutter]],'#d8a86c',3);line(c,[[0,720-shutter],[1280,720-shutter]],'#d8a86c',3);}
}
function introMask(c,x,y,tilt,color){
 c.save();c.translate(x,y);c.rotate(tilt);c.beginPath();c.moveTo(-28,-28);c.quadraticCurveTo(0,-41,28,-28);c.lineTo(24,9);c.quadraticCurveTo(12,32,0,38);c.quadraticCurveTo(-17,27,-25,6);c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#99bdb1';c.lineWidth=1;c.stroke();
 for(const side of [-1,1]){c.beginPath();c.moveTo(side*6,-5);c.lineTo(side*20,-10);c.lineTo(side*17,1);c.lineTo(side*6,2);c.closePath();c.fillStyle='#252f3f';c.fill();}line(c,[[-9,17],[0,20],[10,15]],'#5d666a',1.5);c.restore();
}
function ribbonOpening(c,p,reduced){
 const opening=reduced?1:ease(p/.48),sway=reduced?0:Math.sin(p*2.5)*19;
 for(const side of [-1,1]){const x=640+side*523;c.save();c.globalAlpha=.86;introMask(c,x,289+side*sway,side*(.17+(reduced?0:p*.08)),'#d7ddd2');c.restore();
  for(let i=0;i<3;i++){c.beginPath();c.moveTo(x+side*(24+i*12),45);c.bezierCurveTo(x-side*(55+i*9),191,x+side*(74+i*5),316,x-side*(20+i*12),478);c.strokeStyle=i===1?'#a5f0cfab':'#4f9e936c';c.lineWidth=i===1?4:11;c.stroke();}
 }
 if(opening<1){const width=(1-opening)*640;for(const side of [0,1]){c.save();if(side){c.translate(1280,0);c.scale(-1,1);}c.beginPath();c.moveTo(0,0);c.lineTo(width+72,0);c.bezierCurveTo(width-4,180,width+60,360,width-58,720);c.lineTo(0,720);c.closePath();c.fillStyle='#302237';c.fill();c.strokeStyle='#8ccfb0';c.lineWidth=2;c.stroke();c.restore();}}
}
function peripheralStreaks(c,p,color,reduced){if(reduced)return;c.save();for(let i=0;i<28;i++){const a=i*2.399,phase=(p*1.25+i*.139)%1,rad=410+phase*260,x=640+Math.cos(a)*rad,y=312+Math.sin(a)*rad*.61;c.globalAlpha=(1-phase)*.26;line(c,[[x,y],[x+Math.cos(a)*(38+phase*42),y+Math.sin(a)*(23+phase*22)]],color,i%4?1:2)}c.restore()}
function filmstrip(c,y,p,color,reduced){box(c,0,y,1280,21,'#09131cee');const shift=reduced?0:(p*78)%41;for(let i=-1;i<33;i++)box(c,i*41+shift,y+6,19,9,color+'7a',1)}
export function drawCombatCinematic(c,s,t,reduced=false){
 const shot=s?.cinematic;if(!shot||shot.remaining<=0||!['playerUltimate','bossIntro'].includes(shot.kind))return false;
 const p=clamp(1-shot.remaining/shot.duration),hero=shot.kind==='playerUltimate',role=shot.actorId==='director'?'director':'actor',v=BOSS_VISUALS[shot.actorId]||BOSS_VISUALS.gojo,color=hero?(role==='actor'?'#c6dbff':'#efe4ab'):v.color;
 c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';
 if(hero){
  coverArt(c,heroArt[role],p,role==='actor'?'#2c3e67':'#55533c',reduced,role==='actor'?1:-1);peripheralStreaks(c,p,color,reduced);
  const shade=c.createLinearGradient(0,400,0,720);shade.addColorStop(0,'#09121e00');shade.addColorStop(.42,'#09121eb8');shade.addColorStop(1,'#09121ef8');box(c,0,400,1280,320,shade);
  filmstrip(c,40,p,color,reduced);filmstrip(c,676,p,color,reduced);corners(c,640,343,1174,566,color+'a0');
  const title=shot.name||(role==='actor'?'천의 얼굴, 커튼콜!':'원 테이크! 전원 액션!'),rise=reduced?0:18*(1-ease(p*3));
  text(c,role==='actor'?'배우의 단독 무대':'감독의 최종 연출',640,491+rise,13,color,900);
  c.save();c.translate(640,558+rise);if(!reduced)c.transform(1,0,-.04,1,0,0);c.strokeStyle='#0a1724';c.lineWidth=7;c.lineJoin='round';c.font='900 54px "Noto Sans KR",sans-serif';c.textAlign='center';c.strokeText(title,0,0);c.fillStyle='#fff6dc';c.fillText(title,0,0);c.restore();
  const dialogue=s.dialogue?.actorId===role?s.dialogue.text:s.effects?.filter(e=>e.type==='dialogue'&&e.actorId===role&&e.category==='ultimate').at(-1)?.text;
  text(c,dialogue||(role==='actor'?'검사 → 궁수 → 액션 · 열두 번의 피날레':'전원 대기. 조명, 카메라… 액션!'),640,600,20,color,800);
  const release=p>.76;text(c,release?'곧 연속 타격 · 마지막 한 방까지!':'R  궁극기 발동',640,642,15,'#deeadf',700);
  if(role==='director'){const w=1160*(.3+.7*ease(p));line(c,[[640-w/2,453],[640+w/2,453]],'#e3deb78c',1.5);for(let i=0;i<5;i++)box(c,82+i*24,103,13,5,i<Math.floor(p*6)?color:'#b2b99c33',1);}
  else if(!reduced){const a=clamp((p-.6)/.4);c.save();c.globalAlpha=.22*a;c.beginPath();c.moveTo(-40,448);c.bezierCurveTo(420,520,780,290,1330,391);c.strokeStyle='#d6e1f3';c.lineWidth=5;c.stroke();c.restore();}
 }else{
  const id=shot.actorId,third=id==='gojo',opening=reduced?1:ease(p/.43);
  coverArt(c,getTakeoverArtwork(id),p,v.wall,reduced,third||id==='ignis'?1:-1,id==='ignis'?'lamp':id==='mime'?'ribbon':'classic');
  if(id==='ignis')lampOpening(c,p,reduced);
  else if(id==='mime')ribbonOpening(c,p,reduced);
  else if(third){peripheralStreaks(c,p,color,reduced);for(let i=0;i<4;i++){const w=180+opening*(960-i*84),h=90+opening*(480-i*32);corners(c,640,325,w,h,i%2?'#d6c18a7a':'#a9dbe579');}if(!reduced){c.save();c.globalAlpha=(1-opening)*.9;box(c,0,0,640*(1-opening),720,'#0a1d2d');box(c,1280-640*(1-opening),0,640*(1-opening),720,'#0a1d2d');c.restore();}}
  else{const curtain=(1-opening)*653;for(const side of [0,1]){c.save();if(side){c.translate(1280,0);c.scale(-1,1)}c.beginPath();c.rect(0,0,curtain,720);c.clip();box(c,0,0,curtain,720,'#361c32');for(let i=0;i<15;i++)line(c,[[i*47,0],[i*47+8,720]],i%2?'#6e354d':'#1c1428',9);c.restore();}line(c,[[90,442],[1190,442]],'#d7c1c644',1);}
  const shade=c.createLinearGradient(0,400,0,720);shade.addColorStop(0,'#070f1b00');shade.addColorStop(.4,'#070f1bbd');shade.addColorStop(1,'#070f1bf5');box(c,0,400,1280,320,shade);
  box(c,0,0,1280,39,'#07101b');box(c,0,681,1280,39,'#07101b');
  text(c,`오디션의 네 관문 · ${v.audition}`,640,477,13,color,900);
  text(c,`${v.role} ${v.name}`,640,547,54,'#fff4dd',900);text(c,v.title,640,586,21,color,800);
  const quoteLines=(v.quoteLines||[v.quote]).slice(0,2);
  quoteLines.forEach((quote,i)=>text(c,quote,640,quoteLines.length===1?632:620+i*25,18,'#d8e3e4',600));corners(c,640,350,1186,588,color+'83');
 }
 // Single soft reveal, never repeated screen-filling flashes.
 if(!reduced&&p>.92){c.globalAlpha=clamp((p-.92)/.08)*.22;box(c,0,0,1280,720,'#07101b');}
 c.restore();return true;
}
