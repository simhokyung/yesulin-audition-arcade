/** Original anime-style 2D cast: articulated anatomy, cloth follow-through and optional pose atlases. */
import { drawPhotoFighter2D } from './photo-fighter2d.js';
import { BOSS_PHOTOS, getBossPhoto, bossPhotoAssetStatus } from './boss-visuals.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const INK='#182333',SKIN='#d5a68c';
function path(c,fn,fill,stroke=INK,w=1.5){c.beginPath();fn(c);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.stroke()}}
function line(c,pts,color=INK,w=1){path(c,c=>{pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y))},null,color,w)}
function poly(c,pts,fill,stroke=INK,w=1.5){path(c,c=>{pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()},fill,stroke,w)}
function ellipse(c,x,y,rx,ry,fill,stroke=null,w=1){path(c,c=>c.ellipse(x,y,rx,ry,0,0,TAU),fill,stroke,w)}
function gradient(c,x1,y1,x2,y2,a,b){const g=c.createLinearGradient(x1,y1,x2,y2);g.addColorStop(0,a);g.addColorStop(1,b);return g}
function bone(a,length,angle){return{x:a.x+Math.sin(angle)*length,y:a.y+Math.cos(angle)*length}}
function limb(c,a,b,wa,wb,fill,edge=INK){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;path(c,c=>{c.moveTo(a.x+nx*wa,a.y+ny*wa);c.bezierCurveTo(a.x+dx*.4+nx*wa,a.y+dy*.4+ny*wa,b.x+nx*wb,b.y+ny*wb,b.x+nx*wb,b.y+ny*wb);c.quadraticCurveTo(b.x+dx*.06,b.y+dy*.06,b.x-nx*wb,b.y-ny*wb);c.bezierCurveTo(a.x+dx*.5-nx*wa,a.y+dy*.5-ny*wa,a.x-nx*wa,a.y-ny*wa,a.x-nx*wa,a.y-ny*wa);c.quadraticCurveTo(a.x-dx*.08,a.y-dy*.08,a.x+nx*wa,a.y+ny*wa);c.closePath()},fill,edge,1.3)}
function hand(c,p,angle=0,skin=SKIN,gesture=false){c.save();c.translate(p.x,p.y);c.rotate(-angle);path(c,c=>{c.moveTo(-3,-4);c.quadraticCurveTo(-5,0,-3,5);c.lineTo(-1,8);c.lineTo(3,7);c.quadraticCurveTo(5,4,4,0);c.lineTo(3,-4);c.closePath()},skin,INK,1);if(gesture){line(c,[[-1,4],[-1,14]],skin,2.3);line(c,[[2,4],[2,15]],skin,2.3)}else{line(c,[[-1,2],[-1,6]],'#9e705e',.55);line(c,[[1,2],[1,6]],'#9e705e',.55)}c.restore()}
function shoe(c,p,angle,color){c.save();c.translate(p.x,p.y);c.rotate(angle);path(c,c=>{c.moveTo(-6,-5);c.lineTo(5,-5);c.quadraticCurveTo(9,-2,14,0);c.quadraticCurveTo(16,5,10,6);c.lineTo(-8,6);c.quadraticCurveTo(-9,1,-6,-5);c.closePath()},color,INK,1.3);line(c,[[-7,4],[11,4]],'#7b888e',.8);c.restore()}
function face(c,kind,headTilt,time,reduced){
 const prism=kind==='gojo',caden=kind==='sukuna',ignis=kind==='ignis',mime=kind==='mime',director=kind==='director',skin=caden?'#bc9a7f':mime||prism?'#dfbba2':SKIN;
 c.save();c.translate(0,-159);c.rotate(headTilt);
 if(caden){path(c,c=>{c.moveTo(-13,-20);c.quadraticCurveTo(-26,-6,-22,22);c.quadraticCurveTo(-30,44,-12,54);c.lineTo(-4,29);c.lineTo(12,39);c.quadraticCurveTo(27,10,14,-18);c.closePath()},'#2c2c3c',INK,1.1);line(c,[[-16,-10],[-17,14],[-20,32]],'#aaadb8',1.8);}
 if(prism){path(c,c=>{c.moveTo(-11,-12);c.quadraticCurveTo(-27,6,-16,34);c.quadraticCurveTo(-7,47,-16,57);c.lineTo(-24,46);c.quadraticCurveTo(-25,26,-23,8);c.closePath()},'#203f49',INK,1);for(let i=0;i<5;i++)line(c,[[-23,10+i*7],[-15,15+i*7]],'#71939a',1);}
 path(c,c=>{c.moveTo(-10,-12);c.quadraticCurveTo(-1,-19,9,-13);c.quadraticCurveTo(13,-8,12,-3);c.lineTo(15,1);c.lineTo(12,3);c.quadraticCurveTo(11,10,5,13);c.quadraticCurveTo(-2,12,-7,7);c.lineTo(-10,-3);c.closePath()},gradient(c,-11,-9,13,8,'#efd2b7',skin),INK,1.3);
 path(c,c=>{c.moveTo(-10,-7);c.quadraticCurveTo(-6,-3,-5,4);c.lineTo(2,11);c.quadraticCurveTo(-5,10,-8,6);c.closePath()},'#ae7f6c44',null);ellipse(c,-9,-1,2.7,4.1,skin,INK,.8);line(c,[[-10,-2],[-8,0],[-9,2]],'#9c7463',.7);
 const blink=!reduced&&Math.sin(time*.8)>.997,iris=ignis?'#a56a28':mime?'#286750':prism?'#9f7534':caden?'#626044':'#254843';
 path(c,c=>{c.moveTo(-2,-4);c.quadraticCurveTo(2,-5,5,-3);c.lineTo(0,-2);c.closePath()},blink?INK:'#ede5db',INK,.65);path(c,c=>{c.moveTo(8,-3);c.lineTo(11,-2);c.lineTo(9,-1);c.closePath()},blink?INK:'#ede5db',INK,.6);
 if(!blink){line(c,[[2,-3.6],[2,-1.8]],iris,1.4);line(c,[[9.6,-2.5],[9.6,-1.1]],iris,1)}line(c,[[-2,-7],[4,-6]],'#3b3734',1);line(c,[[8,-5],[11,-4]],'#3b3734',.8);line(c,[[8,2],[10,3],[8,3.5]],'#a37563',.7);line(c,[[4,7],[9,6]],'#7c5149',.7);
 if(director){path(c,c=>{c.moveTo(-12,-12);c.quadraticCurveTo(-13,-19,0,-22);c.quadraticCurveTo(12,-24,17,-16);c.quadraticCurveTo(11,-10,-12,-12);c.closePath()},gradient(c,-7,-23,10,-10,'#405d4c','#253f38'),INK,1.4);line(c,[[-10,-12],[9,-11]],'#819075',1);path(c,c=>{c.moveTo(-9,-9);c.quadraticCurveTo(-14,-19,3,-20)},null,'#172f36',2.1);path(c,c=>c.roundRect(-13,-7,5,10,2),'#344e50',INK,.8);line(c,[[-11,2],[-8,8],[2,8]],'#19343c',1.2);ellipse(c,4,8,2.5,1.3,'#213841');}
 else{
  const light=ignis?'#b47643':mime?'#695471':prism?'#365861':caden?'#454450':'#4d5050',dark=ignis?'#633f32':mime?'#3b2d48':prism?'#173a45':caden?'#262c3a':'#242f35';
  path(c,c=>{c.moveTo(-11,0);c.quadraticCurveTo(-16,-10,-12,-19);c.quadraticCurveTo(-7,-26,5,-22);c.quadraticCurveTo(15,-20,13,-9);c.lineTo(8,-14);c.lineTo(3,-12);c.lineTo(-3,-8);c.lineTo(-8,-9);c.lineTo(-8,1);c.closePath()},gradient(c,-6,-23,10,-7,light,dark),INK,1.2);
  for(let i=0;i<5;i++)path(c,c=>{c.moveTo(-11+i*4,-13);c.quadraticCurveTo(-10+i*4,-25,1+i*2,-22);c.quadraticCurveTo(-6+i*4,-19,-5+i*4,-13)},null,i%2?light:dark,1.1);
  if(mime){path(c,c=>{c.moveTo(-11,-14);c.quadraticCurveTo(-21,-1,-12,17);c.lineTo(-7,5);c.closePath()},light,INK,1);line(c,[[12,-9],[15,6],[11,10]],dark,4);}
  if(caden)line(c,[[-4,-22],[-9,-13],[-11,-4]],'#bac0c8',2);
  if(ignis){for(let i=0;i<4;i++)ellipse(c,-9+i*5,-20-(i%2)*2,4,3,light,dark,.8);path(c,c=>c.roundRect(-14,-6,4,10,2),'#b18c50',INK,.8);line(c,[[-12,3],[-6,8],[2,8]],'#806c4c',1.5);}
  if(kind==='actor'){path(c,c=>{c.moveTo(-10,-12);c.quadraticCurveTo(0,-15,12,-10);c.lineTo(12,-7);c.quadraticCurveTo(0,-11,-10,-9);c.closePath()},'#c77b64',INK,.8);}
 }
 if(prism||director){const color=prism?'#c7a661':'#21373d';line(c,[[-3,-6],[5,-5],[5,0],[-3,-1],[-3,-6]],color,.85);line(c,[[8,-4],[12,-3],[12,1],[8,0],[8,-4]],color,.8);line(c,[[5,-3],[8,-2]],color,.8);}
 c.restore();
}
function weapon(c,kind,p,angle,opts){
 c.save();c.translate(p.x,p.y);c.rotate(angle);
 if(kind==='director'&&opts.attackKind==='skill'){
  poly(c,[[1,-3],[16,-7],[38,-16],[38,13],[15,5],[1,5]],gradient(c,0,-15,0,13,'#e1ded0','#7a8d91'),INK,1.4);ellipse(c,39,-1.5,4,14,'#253e49',INK,1);line(c,[[12,5],[10,13],[5,13],[6,4]],'#5b706d',3);ellipse(c,39,-1.5,2,8,'#829c9f');
 }else if(kind==='director'){
  path(c,c=>c.roundRect(-2,-11,32,24,2),'#20343d',INK,1.2);line(c,[[2,-3],[25,-3]],'#b8ccc0',.9);line(c,[[2,2],[23,2]],'#8ba9a0',.8);line(c,[[5,5],[5,10],[13,10]],'#bdc7b4',.7);
  c.save();c.translate(-2,-11);c.rotate(opts.attack>0?-.7*(1-opts.strike):-.18);poly(c,[[0,-5],[33,-5],[33,1],[0,1]],'#dedfcd',INK,1);for(let i=0;i<4;i++)poly(c,[[i*9,-5],[i*9+5,-5],[i*9+2,1],[i*9-3,1]],'#29424a',null);c.restore();
 }else if(kind==='actor'&&opts.role==='bow'){
  path(c,c=>{c.moveTo(2,-36);c.bezierCurveTo(34,-21,33,21,2,38)},null,'#293c42',5);path(c,c=>{c.moveTo(2,-36);c.bezierCurveTo(34,-21,33,21,2,38)},null,'#c39c60',2.7);line(c,[[2,-36],[-8-opts.strike*10,1],[2,38]],'#e6dbc3',.8);line(c,[[-15,1],[47,1]],'#dacdab',1.6);poly(c,[[53,1],[44,-3],[44,5]],'#dce8e3',INK,.7);
 }else if(kind==='actor'){
  poly(c,[[-3,10],[3,10],[4,-61],[0,-76],[-4,-61]],gradient(c,-4,-30,4,-30,'#688a9e','#e0efed'),INK,1.3);line(c,[[0,-70],[0,8]],'#f3f3d6',1.2);path(c,c=>c.roundRect(-12,9,24,4,1),'#ccad67',INK,1);poly(c,[[-2,14],[3,14],[3,26],[-2,26]],'#765a3c',INK,1);line(c,[[-2,17],[3,18],[-2,21],[3,22]],'#c4a879',.7);
 }
 c.restore();
}
// The drawn weapon is a genuine rotating sprite layer, cut from the existing art.
// No new texture or combat timing is required; the attached wrist stays fixed.
const SWING_PARTS={
 actor:{pivot:[246,119],tip:[352,57],polygon:[[237,99],[359,42],[362,74],[268,126],[246,137],[232,126]]},
 director:{pivot:[285,145],tip:[353,126],polygon:[[280,115],[362,108],[362,174],[283,174],[267,154],[273,136]]},
};
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
export function sampleFighterMotion(o={}){
 const p=clamp(o.attackProgress??0,0,1),walking=clamp(o.walkWeight??(o.walk?1:0),0,1),gait=Math.sin(o.walkPhase??((o.time||0)*11)),melee=o.attack>0&&!['skill','ultimate'].includes(o.attackKind),swing=smooth((p-.19)/.46),recovery=smooth((p-.65)/.35),even=(o.comboIndex||1)%2===0,finish=o.comboIndex===4;
 const casting=o.attack>0&&o.attackKind==='skill',winding=-5*smooth(p/.19),lean=casting?(o.role==='bow'?-4*Math.sin(p*Math.PI):4*Math.sin((p+.13)*Math.PI)*(1-p)):melee?(p<.19?winding:p<.65?mix(-5,finish?14:10,swing):mix(finish?14:10,0,recovery)):0;
 const angle=melee?mix(even&&!finish?.65:-1.05,even&&!finish?-1.05:finish?1.2:.72,swing):0;
 return{p,walking,gait,melee,casting,lean,angle,swing,recovery};
}
function buildSwingPart(a,kind){
 const profile=SWING_PARTS[kind];if(!profile||a.rows!==3)return;
 const box=a.frames[4],sx=box.sw/362,sy=box.sh/362,points=profile.polygon.map(([x,y])=>[x*sx,y*sy]);
 const body=document.createElement('canvas'),part=document.createElement('canvas');body.width=part.width=box.sw;body.height=part.height=box.sh;
 for(const [canvas,mode]of [[body,'destination-out'],[part,'destination-in']]){const c=canvas.getContext('2d');if(!c)return;c.drawImage(a.image,box.sx,box.sy,box.sw,box.sh,0,0,box.sw,box.sh);c.globalCompositeOperation=mode;poly(c,points,'#fff',null);c.globalCompositeOperation='source-over';}
 a.swingPart={body,part,pivot:profile.pivot.map((v,i)=>v*(i?sy:sx)),tip:profile.tip.map((v,i)=>v*(i?sy:sx))};
}
function deformation(y,height,m,o){
 const h=clamp(-y/height,0,1),upper=smooth((h-.33)/.67),leg=h<.52?Math.sin(h/.52*Math.PI):0;
 return{x:m.lean*upper+m.walking*m.gait*(1.4*upper+2.1*leg),y:-m.walking*Math.abs(m.gait)*1.6*smooth(h/.55)+(o.attack>0?Math.sin(m.p*Math.PI)*.7*upper:Math.sin((o.time||0)*2.1)*.4*upper)};
}
function drawAtlasTexture(c,a,box,source,sx,sy,unitScale,m,o){
 const dx=-a.cellW*.5*unitScale,dy=-(box.foot??a.foot)*unitScale,dw=box.sw*unitScale,dh=box.sh*unitScale;
 const deform=!o.reduced&&(m.walking>.02||o.attack>0),bands=deform?24:1;
 for(let i=0;i<bands;i++){
  const top=Math.round(i*box.sh/bands),bottom=Math.round((i+1)*box.sh/bands),y0=dy+top*unitScale,y1=dy+bottom*unitScale;
  c.save();if(deform){const v0=deformation(y0,a.displayHeight,m,o),v1=deformation(y1,a.displayHeight,m,o),shx=(v1.x-v0.x)/(y1-y0),shy=1+(v1.y-v0.y)/(y1-y0);c.transform(1,0,shx,shy,v0.x-shx*y0,v0.y+(1-shy)*y0);}
  c.drawImage(source,sx,sy+top,box.sw,bottom-top,dx,y0,dw,(bottom-top)*unitScale+.10);c.restore();
 }
}
function drawAttachedWeapon(c,a,box,m,o,unitScale,trail){
 const part=a.swingPart;if(!part)return;
 const pivot={x:(part.pivot[0]-a.cellW*.5)*unitScale,y:(part.pivot[1]-(box.foot??a.foot))*unitScale},warp=o.reduced?{x:0,y:0}:deformation(pivot.y,a.displayHeight,m,o),angle=o.reduced?0:m.angle;
 c.save();c.translate(pivot.x+warp.x,pivot.y+warp.y);
 if(trail){
  if(o.reduced||m.p<.2||m.p>.78){c.restore();return;}
  const tail=sampleFighterMotion({...o,attackProgress:Math.max(.19,m.p-.13)}).angle,base=Math.atan2(part.tip[1]-part.pivot[1],part.tip[0]-part.pivot[0]),r=Math.hypot(part.tip[0]-part.pivot[0],part.tip[1]-part.pivot[1])*unitScale;
  if(Math.abs(tail-angle)>.02){for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,r-i*2,base+tail,base+angle,angle<tail);c.strokeStyle=i===2?'#fff4d8':o.character==='director'?'#f0d297':'#c5d8ff';c.globalAlpha*=i===0?.23:i===1?1.8:1.3;c.lineWidth=i===0?12:i===1?5:1.5;c.lineCap='round';c.stroke();}}
 }else{
  c.rotate(angle);c.drawImage(part.part,0,0,box.sw,box.sh,-part.pivot[0]*unitScale,-part.pivot[1]*unitScale,box.sw*unitScale,box.sh*unitScale);
 }
 c.restore();
}
const atlases=new Map(),atlasPoses=new WeakMap();
export function setFighterAtlas(kind,url,config={}){
 if(typeof Image==='undefined')return;const image=new Image(),entry={image,ready:false,cols:4,rows:2,displayHeight:194,...config};atlases.set(kind,entry);
 image.onload=()=>{
  entry.cellW=image.naturalWidth/entry.cols;entry.cellH=image.naturalHeight/entry.rows;
  entry.frames=Array.from({length:entry.cols*entry.rows},(_,f)=>{const col=f%entry.cols,row=Math.floor(f/entry.cols),sx=Math.round(col*entry.cellW),sy=Math.round(row*entry.cellH);return{sx,sy,sw:Math.round((col+1)*entry.cellW)-sx,sh:Math.round((row+1)*entry.cellH)-sy}});
  entry.foot=entry.cellH*(entry.anchorY??.98);entry.contentHeight=entry.cellH*.95;
  try{
   const surface=document.createElement('canvas');surface.width=image.naturalWidth;surface.height=image.naturalHeight;
   const ctx=surface.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
   const data=ctx.getImageData(0,0,surface.width,surface.height).data;
   // Each illustrated pose has its own baseline. Keep a single idle-derived scale,
   // but pin every pose's actual soles to the unit's unchanged collision origin.
   for(const box of entry.frames){let top=box.sh,foot=-1;const minPixels=Math.max(5,Math.round(box.sw*.014));
    for(let y=0;y<box.sh;y++){let count=0;for(let x=0;x<box.sw;x++)if(data[((box.sy+y)*surface.width+box.sx+x)*4+3]>80)count++;
     if(count>=minPixels){top=Math.min(top,y);foot=y;}
    }
    box.top=top;box.foot=foot>box.sh*.5?foot:entry.foot;
   }
   const idle=entry.frames.slice(0,3),feet=idle.map(box=>box.foot).sort((a,b)=>a-b),tops=idle.map(box=>box.top);
   if(feet.every(v=>v>entry.cellH*.6)&&tops.every(v=>v<entry.cellH*.4)){entry.foot=feet[1];entry.contentHeight=entry.foot-Math.min(...tops);}
  }catch{}
  buildSwingPart(entry,kind);entry.ready=true;for(const ready of entry.listeners||[])ready();entry.listeners?.clear();
 };image.onerror=()=>{entry.ready=false};image.src=url;
}
function atlasFighter(c,kind,x,y,scale,o){
 const a=atlases.get(kind);if(!a?.ready)return false;const attack=o.attack>0,ap=clamp(o.attackProgress??.5,0,1),hero=kind==='director'||kind==='actor',m=sampleFighterMotion(o);
 const frame=o.dead?6:o.domain?7:(o.hitReaction||o.hitStun)>0?6:hero&&o.dodge>0?11:hero&&attack&&o.attackKind==='ultimate'?10:hero&&attack&&o.attackKind==='skill'?8:hero&&o.buffTimer>4.62?9:attack?(ap<.19?3:ap<.74?4:5):o.windup?3:m.walking>.14?(m.gait>0?1:2):0;
 let blend=1,previous=frame;if(o.unit){let state=atlasPoses.get(o.unit);if(!state){state={frame,previous:frame,changed:o.time};atlasPoses.set(o.unit,state)}if(frame!==state.frame){state.previous=state.frame;state.frame=frame;state.changed=o.time}blend=o.reduced?1:smooth((o.time-state.changed)/(attack?.035:.07));previous=state.previous;}
 const unitScale=a.displayHeight/a.contentHeight,draw=f=>{
  const box=a.frames[f],rig=hero&&!o.reduced&&f===4&&m.melee&&a.swingPart;
  if(rig)drawAttachedWeapon(c,a,box,m,{...o,character:kind},unitScale,true);
  drawAtlasTexture(c,a,box,rig?a.swingPart.body:a.image,rig?0:box.sx,rig?0:box.sy,unitScale,m,o);
  if(rig)drawAttachedWeapon(c,a,box,m,o,unitScale,false);
  if(kind==='actor'&&f===8){
   const point=(xx,yy)=>{const x=(xx*box.sw/362-a.cellW*.5)*unitScale,y=(yy*box.sh/362-(box.foot??a.foot))*unitScale,d=o.reduced?{x:0,y:0}:deformation(y,a.displayHeight,m,o);return[x+d.x,y+d.y];};
   const vibration=o.reduced?0:Math.sin(ap*Math.PI*12)*Math.exp(-ap*2.7)*3.2;line(c,[point(216,9),point(154+vibration,89),point(232,199)],'#d4f0dd90',.85);
   line(c,[point(176,88),point(301,87)],'#e6f0d27a',.8);
  }

 };
 c.save();c.translate(x,y);c.scale(scale*(o.facing||1),scale);const recoil=o.reduced?0:clamp((o.hitReaction||0)/.3,0,1)*.08*(o.hitDir||1)*(o.facing||1),landing=o.reduced?0:clamp((o.landingTimer||0)/.22,0,1)*.045;c.rotate(recoil);c.scale(1+landing,1-landing);if(o.dead){const fall=clamp(o.deathProgress||0,0,1);if(!o.reduced)c.rotate((o.hitDir||1)*(o.facing||1)*smooth(fall)*1.1);c.globalAlpha*=1-fall*.5;}
 if(!o.reduced&&!attack&&m.walking<.02)c.scale(1,1+Math.sin(o.time*2.1)*.002);
 const opacity=c.globalAlpha;if(blend<1){c.globalAlpha=opacity*(1-blend);draw(previous)}c.globalAlpha=opacity*blend;draw(frame);c.restore();return true;
}
export function drawFighter2D(c,kind,x,y,scale=1,options={}){
 const o={facing:1,time:0,attack:0,attackKind:'',attackProgress:.5,comboIndex:1,role:'sword',walk:false,reduced:false,...options};
 if(drawPhotoFighter2D(c,kind,x,y,scale,o))return;
 if(atlasFighter(c,kind,x,y,scale,o))return;
 const gojo=kind==='gojo',sukuna=kind==='sukuna',director=kind==='director',actor=kind==='actor',ignis=kind==='ignis',mime=kind==='mime',extra=!gojo&&!sukuna&&!director&&!actor&&!ignis&&!mime,t=o.reduced?0:o.time,gait=o.walk&&!o.reduced?Math.sin(t*12):0,ap=clamp(o.attackProgress??.5,0,1),active=o.attack>0;
 const strike=active?(ap<.18?-.28*Math.sin(ap/.18*Math.PI/2):ap<.43?Math.sin((ap-.18)/.25*Math.PI/2):Math.pow(clamp(1-(ap-.43)/.57,0,1),1.45)):0;
 const hurt=clamp((o.hitReaction||o.hitStun||0)/.32,0,1),land=clamp((o.landingTimer||0)/.22,0,1),air=(o.launchZ||0)>2,hipY=-86+(o.reduced?0:Math.abs(gait)*1.5+land*5),lean=o.reduced?0:strike*.12+hurt*(o.hitDir||1)*o.facing*.17+(o.dodge>0?.27:0),breath=o.reduced?0:Math.sin(t*2.5)*.55;
 const cloth=gojo?'#344f70':sukuna?'#873e55':ignis?'#55505a':mime?'#d4d1c4':director?'#b39458':extra?'#655c73':'#568e89',shadow=gojo?'#1c324d':sukuna?'#412c43':ignis?'#2c323d':mime?'#6b5870':director?'#726744':extra?'#34374c':'#294e56',pants=gojo?'#28384e':sukuna?'#302d40':'#2e4650';
 c.save();c.translate(x,y);c.scale(scale*o.facing,scale);if(o.dodge>0&&!o.reduced)c.translate(0,7);c.lineCap='round';c.lineJoin='round';
 // Loose cloth follows the body with a small delay, never the collision origin.
 if(actor){path(c,c=>{c.moveTo(-8,-137+breath);c.bezierCurveTo(-25,-134,-27-strike*9,-145+Math.sin(t*5)*2,-45-strike*10,-139);c.lineTo(-36-strike*8,-133);c.lineTo(-47-strike*5,-126);c.quadraticCurveTo(-26,-129,-8,-129);c.closePath()},'#b86c5a',INK,1.2);}
 // Two bent, independently animated legs: no capsule-doll joints.
 for(const side of [-1,1]){const hip={x:side*8,y:hipY},ankle={x:side*9+gait*side*14+(active&&side===1?strike*8:0),y:-6-(air?8:Math.max(0,-gait*side)*7)},knee={x:side*9+gait*side*9+(air?side*9:0),y:-43+Math.abs(gait)*2+land*4+(air?7:0)};const fill=gradient(c,hip.x-8,hip.y,knee.x+9,knee.y,side===-1?shadow:pants,side===-1?pants:shadow);limb(c,hip,knee,sukuna?9:6.7,sukuna?8:5.5,fill);limb(c,knee,ankle,sukuna?7:5.3,sukuna?5.4:4.2,fill);line(c,[[knee.x-3,knee.y-7],[knee.x+2,knee.y-2],[knee.x-2,knee.y+4]],sukuna?'#899793':'#5c6c75',.8);shoe(c,ankle,air?side*.12:0,actor?'#8f8970':sukuna?'#484f51':'#243641');}
 // Hip pivot produces anticipation, lunge, hit recoil and settling without foot sliding.
 c.save();c.translate(0,hipY);c.rotate(lean);c.translate(0,-hipY+breath);
 const shoulder={x:16,y:-131},backShoulder={x:-15,y:-131},bow=actor&&o.role==='bow';
 let upper=.25+gait*-.22,lower=-.12+gait*.22;
 if(active){const targets=[[1.35,1.55],[2.15,1.7],[1.0,1.45],[ap<.43?2.6:1.15,ap<.43?2.3:1.4]][(o.comboIndex-1)%4];upper=mix(upper,targets[0],strike);lower=mix(lower,targets[1],strike);}
 if(bow){upper=1.45;lower=1.45;}if(o.domain){upper=2.05;lower=2.6;}if(hurt){upper-=hurt*.5;lower-=hurt*.6;}
 const elbow=bone(shoulder,29,upper),wrist=bone(elbow,27,lower),backElbow=bone(backShoulder,29,-.15+gait*.28-(bow?.8:0)),backWrist=bone(backElbow,26,.3-gait*.24-(bow?1.6:0));
 limb(c,backShoulder,backElbow,sukuna?9:6.5,5.1,shadow);limb(c,backElbow,backWrist,4.8,3.5,sukuna?SKIN:shadow);hand(c,backWrist,0);
 // Tailored torso: a curved waist, angled shoulders and layered folds.
 path(c,c=>{c.moveTo(-8,-142);c.quadraticCurveTo(-17,-139,-21,-130);c.quadraticCurveTo(-22,-113,-15,-96);c.lineTo(-16,-84);c.quadraticCurveTo(0,-79,16,-84);c.lineTo(14,-98);c.quadraticCurveTo(22,-114,20,-130);c.quadraticCurveTo(14,-139,8,-142);c.closePath()},gradient(c,-18,-126,17,-103,cloth,shadow),INK,1.6);
 path(c,c=>{c.moveTo(-19,-128);c.quadraticCurveTo(-15,-108,-11,-97);c.lineTo(-14,-86);c.lineTo(-7,-88);c.quadraticCurveTo(-9,-111,-6,-136);c.closePath()},'#071c2b28',null);
 path(c,c=>{c.moveTo(8,-141);c.quadraticCurveTo(14,-136,17,-128);c.lineTo(12,-122);c.lineTo(7,-134);c.closePath()},gojo?'#52627a':sukuna?'#faf3df':director?'#cfb779':'#7ba9a1',null);
 poly(c,[[-5,-149],[6,-149],[7,-139],[-7,-139]],SKIN,INK,1);
 if(gojo){poly(c,[[-9,-142],[-5,-115],[1,-125],[8,-141]],'#e1d5b3',INK,.8);line(c,[[2,-128],[4,-87]],'#baa575',1);path(c,c=>c.roundRect(-8,-116,17,12,2),'#2c4f59','#bfa96c',1);ellipse(c,0,-110,4,4,'#9ec9c7','#d9c087',1);}
 if(sukuna){poly(c,[[-8,-142],[-10,-116],[0,-125],[9,-114],[8,-143]],'#b6b5bd',INK,.8);poly(c,[[-4,-137],[4,-137],[5,-90],[-4,-90]],'#343443',INK,.7);line(c,[[-14,-132],[-11,-99],[-18,-87]],'#c5b5b2',1.4);line(c,[[13,-132],[12,-101],[17,-88]],'#c5b5b2',1.4);for(let i=0;i<3;i++)ellipse(c,2,-121+i*10,1.4,1.4,'#e1c8ab');}
 if(ignis){poly(c,[[-8,-142],[-9,-118],[1,-127],[10,-117],[9,-142]],'#ca9c58',INK,.8);line(c,[[-16,-134],[14,-93]],'#a58953',4);for(const px of [-12,8]){path(c,c=>c.roundRect(px,-119,9,15,1),'#4d5360','#bba26d',1);ellipse(c,px+4.5,-111,3,5,'#e8bc75');}line(c,[[-14,-92],[15,-92]],'#c59c59',3);}
 if(mime){poly(c,[[-7,-142],[-11,-117],[0,-127],[10,-116],[8,-141]],'#f0e8cb',INK,.8);poly(c,[[-5,-127],[5,-127],[9,-88],[-8,-88]],'#493449',INK,.8);path(c,c=>{c.moveTo(-12,-92);c.quadraticCurveTo(-25,-74,-8,-61);c.quadraticCurveTo(2,-70,-2,-87);c.closePath()},'#d6d5c7',INK,.8);line(c,[[-16,-83],[-9,-81]],'#324b4c',2);path(c,c=>{c.moveTo(17,-112);c.bezierCurveTo(38,-84,19,-69,45,-55)},null,'#71bda9',3);}
 if(director){poly(c,[[-7,-142],[-9,-126],[0,-133],[7,-124],[8,-142]],'#d3bf86',INK,.8);line(c,[[0,-131],[1,-86]],'#6c6548',.9);for(const px of [-13,6]){path(c,c=>c.roundRect(px,-115,9,14,1),'#8d794e','#5a5c48',.7);line(c,[[px,-114],[px+9,-114]],'#d1bd83',.8)}line(c,[[-14,-135],[11,-91]],'#344442',3);poly(c,[[8,-101],[15,-100],[14,-89],[7,-90]],'#e8dfbb',INK,.7);}
 if(actor){poly(c,[[-6,-141],[6,-141],[8,-91],[-7,-91]],'#cfbf8f',null);line(c,[[-14,-133],[-12,-104]],'#89b4a6',1.1);path(c,c=>{c.moveTo(-10,-142);c.quadraticCurveTo(-1,-137,10,-142);c.lineTo(12,-136);c.quadraticCurveTo(0,-129,-11,-136);c.closePath()},'#d18a6f',INK,1);poly(c,[[-16,-94],[16,-94],[15,-86],[-15,-86]],'#5b5140',INK,.8);path(c,c=>c.roundRect(-4,-95,10,9,1),'#c5a05e',INK,.8);}
 if(extra){line(c,[[-9,-122],[8,-107]],'#ae96ae',4);line(c,[[8,-123],[-9,-107]],'#ae96ae',4);}
 // Front upper arm, elbow crease, forearm and fingers remain separate bones.
 limb(c,shoulder,elbow,sukuna?8.7:6.6,sukuna?7.2:4.8,gradient(c,shoulder.x-6,shoulder.y,elbow.x+6,elbow.y,cloth,shadow));
 const lowerFill=sukuna?gradient(c,elbow.x-4,elbow.y,wrist.x+5,wrist.y,'#bbc3cb','#697384'):gradient(c,elbow.x-4,elbow.y,wrist.x+4,wrist.y,cloth,shadow);
 limb(c,elbow,wrist,sukuna?5.8:4.5,3.2,lowerFill);line(c,[[elbow.x-3,elbow.y-2],[elbow.x+2,elbow.y+1]],sukuna?'#a27a68':shadow,.8);
 if(sukuna){const a=bone(elbow,20,lower),b=bone(elbow,23,lower);line(c,[[a.x-4,a.y],[a.x+4,a.y]],'#d2d5d9',2);line(c,[[b.x-4,b.y],[b.x+4,b.y]],'#d2d5d9',1.1)}
 hand(c,wrist,lower,SKIN,o.domain);weapon(c,kind,wrist,actor&&bow?-.05:actor?-.25+strike*((o.comboIndex%2)?1.65:-1.1):-.15+strike*.2,{...o,strike});
 face(c,kind,o.reduced?0:-lean*.4+hurt*(o.hitDir||1)*o.facing*.08,t,o.reduced);
 c.restore();c.restore();
}

setFighterAtlas('director',new URL('./assets/director-fighter-v5.png',import.meta.url).href,{rows:3,displayHeight:185});
setFighterAtlas('actor',new URL('./assets/actor-fighter-v5.png',import.meta.url).href,{rows:3,displayHeight:188});
export function fighterAtlasStatus(){return {...Object.fromEntries([...atlases].map(([kind,a])=>[kind,{ready:a.ready,width:a.image.naturalWidth||0,height:a.image.naturalHeight||0}])),...Object.fromEntries(Object.entries(bossPhotoAssetStatus()).map(([kind,ready])=>[kind,{ready,width:getBossPhoto(kind)?.naturalWidth||0,height:getBossPhoto(kind)?.naturalHeight||0,source:'original-photo-rig'}]))}}

export function whenFighterAtlasReady(kind,callback){if(BOSS_PHOTOS[kind]){const image=getBossPhoto(kind);if(image&&!image.complete)image.addEventListener?.('load',callback,{once:true});return;}const entry=atlases.get(kind);if(!entry||entry.ready)return;if(!entry.listeners)entry.listeners=new Set();entry.listeners.add(callback);}
