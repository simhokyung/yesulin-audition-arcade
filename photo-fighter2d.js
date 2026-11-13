/** Original-photo faces on continuous 2D rigs. This module only paints; it never writes combat state. */
import { BOSS_PHOTOS, BOSS_VISUALS, getBossPhoto } from './boss-visuals.js';
import { drawRedCapBottle } from './bottle-vfx.js';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
// Normalized points trace the original pixels at display time. No regenerated face,
// color correction, expression replacement or source-image resampling is stored.
export const PHOTO_FACE_PROFILES={
 ignis:{center:[.503,.526],width:.302,displayWidth:49,skin:'#b68c70',outline:[
  [.357,.290],[.354,.245],[.364,.199],[.385,.153],[.415,.127],[.458,.109],[.49,.115],[.527,.099],[.566,.108],[.606,.139],[.632,.178],[.646,.225],[.639,.28],[.626,.326],[.628,.361],[.62,.399],[.607,.415],[.592,.46],[.565,.492],[.536,.515],[.507,.532],[.474,.528],[.441,.511],[.41,.485],[.39,.45],[.376,.42],[.364,.404],[.354,.374],[.354,.342]
 ]},
 mime:{center:[.551,.422],width:.224,displayWidth:46,skin:'#cda282',outline:[
  [.444,.279],[.44,.242],[.447,.208],[.469,.174],[.501,.153],[.538,.145],[.578,.15],[.615,.166],[.641,.191],[.65,.224],[.651,.259],[.646,.286],[.642,.306],[.65,.317],[.651,.338],[.639,.354],[.628,.356],[.623,.378],[.609,.393],[.6,.416],[.573,.427],[.545,.415],[.521,.405],[.505,.385],[.49,.371],[.476,.353],[.472,.335],[.464,.322],[.459,.302]
 ]},
 gojo:{center:[.615,.601],width:.508,displayWidth:51,skin:'#c18e71',outline:[
  [.401,.342],[.389,.312],[.385,.267],[.394,.226],[.42,.198],[.462,.175],[.51,.165],[.563,.165],[.6,.157],[.654,.159],[.708,.168],[.755,.187],[.792,.215],[.816,.249],[.828,.291],[.829,.337],[.842,.344],[.856,.36],[.859,.388],[.851,.415],[.837,.434],[.821,.44],[.813,.484],[.793,.522],[.768,.552],[.735,.578],[.697,.597],[.655,.61],[.61,.612],[.566,.603],[.523,.584],[.487,.559],[.458,.525],[.435,.487],[.421,.448],[.405,.437],[.388,.419],[.375,.39],[.375,.366],[.382,.346]
 ],extras:[
  [[.49,.174],[.473,.161],[.45,.146],[.432,.128],[.412,.112],[.393,.091],[.381,.07],[.382,.054],[.394,.045],[.409,.047],[.421,.06],[.429,.082],[.443,.086],[.444,.073],[.438,.06],[.44,.048],[.453,.049],[.465,.061],[.477,.082],[.487,.077],[.496,.084],[.508,.112],[.515,.135],[.534,.145],[.532,.166]],
  [[.65,.169],[.649,.151],[.665,.14],[.669,.116],[.666,.087],[.66,.062],[.663,.043],[.675,.032],[.689,.035],[.694,.046],[.693,.065],[.701,.074],[.712,.062],[.725,.054],[.738,.059],[.744,.073],[.739,.088],[.728,.1],[.741,.102],[.751,.094],[.763,.099],[.768,.112],[.761,.13],[.74,.145],[.724,.163],[.708,.17]]
 ]},
 max:{center:[.463,.344],width:.322,displayWidth:50,skin:'#c89c77',outline:[[.323,.205],[.31,.184],[.301,.158],[.303,.132],[.317,.109],[.342,.092],[.372,.082],[.41,.076],[.448,.078],[.478,.082],[.511,.081],[.548,.087],[.579,.102],[.601,.127],[.609,.153],[.596,.172],[.579,.185],[.577,.217],[.57,.246],[.559,.277],[.543,.304],[.517,.326],[.49,.34],[.46,.347],[.429,.338],[.401,.32],[.378,.297],[.358,.267],[.344,.237],[.33,.231]]},
 sukuna:{center:[.5,.218],width:.135,displayWidth:44,skin:'#c7a181',outline:[
  [.439,.105],[.439,.081],[.445,.061],[.461,.04],[.484,.029],[.506,.027],[.53,.035],[.549,.054],[.56,.078],[.563,.101],[.559,.119],[.564,.127],[.564,.145],[.552,.157],[.549,.176],[.536,.198],[.516,.215],[.501,.222],[.483,.215],[.468,.199],[.458,.178],[.45,.163],[.445,.147],[.438,.133]
 ]}
};
const WARDROBE={
 ignis:{light:'#c9cccb',mid:'#a5acab',dark:'#697775',pants:'#35434a',seam:'#71817c',shoe:'#f3f0e6'},
 mime:{light:'#c5cccb',mid:'#a3b0b0',dark:'#657a7d',pants:'#7695ad',seam:'#8ca09f',shoe:'#eeeae1'},
 gojo:{light:'#353b3e',mid:'#1d252a',dark:'#10191e',pants:'#303a43',seam:'#48545c',shoe:'#29333c'},
 max:{light:'#8c6749',mid:'#67472f',dark:'#3d2c25',pants:'#c9c2ac',seam:'#9a7755',shoe:'#302b28'},
 sukuna:{light:'#38404a',mid:'#242c37',dark:'#101923',pants:'#763547',seam:'#495768',shoe:'#202b34'}
};
function path(c,build,fill,stroke='#14232b',width=1){c.beginPath();build(c);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke()}}
function line(c,points,color,width=1){path(c,c=>points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)),null,color,width)}
function oval(c,x,y,rx,ry,color,stroke=null,width=1){path(c,c=>c.ellipse(x,y,rx,ry,0,0,TAU),color,stroke,width)}
function poly(c,points,fill,stroke=null,width=1){path(c,c=>{points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()},fill,stroke,width)}
function grad(c,x,y,xx,yy,a,b){const g=c.createLinearGradient(x,y,xx,yy);g.addColorStop(0,a);g.addColorStop(1,b);return g}
function bone(p,length,angle){return{x:p.x+Math.sin(angle)*length,y:p.y+Math.cos(angle)*length}}
function limb(c,a,b,wa,wb,fill){const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;path(c,c=>{c.moveTo(a.x+nx*wa,a.y+ny*wa);c.bezierCurveTo(a.x+dx*.4+nx*wa,a.y+dy*.4+ny*wa,b.x+nx*wb,b.y+ny*wb,b.x+nx*wb,b.y+ny*wb);c.quadraticCurveTo(b.x+dx*.06,b.y+dy*.06,b.x-nx*wb,b.y-ny*wb);c.bezierCurveTo(a.x+dx*.45-nx*wa,a.y+dy*.45-ny*wa,a.x-nx*wa,a.y-ny*wa,a.x-nx*wa,a.y-ny*wa);c.quadraticCurveTo(a.x-dx*.05,a.y-dy*.05,a.x+nx*wa,a.y+ny*wa);c.closePath()},fill,'#15212b',.8)}
// Continuous fabric over both bones avoids separate hard-edged elbow/knee pieces.
function clothLimb(c,a,j,b,wa,wj,wb,fill){
 const normal=(p,q)=>{const l=Math.hypot(q.x-p.x,q.y-p.y)||1;return{x:-(q.y-p.y)/l,y:(q.x-p.x)/l}},n=normal(a,j),m=normal(j,b),nl=Math.hypot(n.x+m.x,n.y+m.y)||1,k={x:(n.x+m.x)/nl,y:(n.y+m.y)/nl};
 path(c,c=>{c.moveTo(a.x+n.x*wa,a.y+n.y*wa);
 c.quadraticCurveTo((a.x+j.x)/2+n.x*wa,(a.y+j.y)/2+n.y*wa,j.x+k.x*wj,j.y+k.y*wj);
 c.quadraticCurveTo((j.x+b.x)/2+m.x*wj,(j.y+b.y)/2+m.y*wj,b.x+m.x*wb,b.y+m.y*wb);
 c.quadraticCurveTo(b.x+(b.x-j.x)*.06,b.y+(b.y-j.y)*.06,b.x-m.x*wb,b.y-m.y*wb);
 c.quadraticCurveTo((j.x+b.x)/2-m.x*wj,(j.y+b.y)/2-m.y*wj,j.x-k.x*wj,j.y-k.y*wj);
 c.quadraticCurveTo((a.x+j.x)/2-n.x*wa,(a.y+j.y)/2-n.y*wa,a.x-n.x*wa,a.y-n.y*wa);
 c.quadraticCurveTo(a.x-(j.x-a.x)*.12,a.y-(j.y-a.y)*.12,a.x+n.x*wa,a.y+n.y*wa);c.closePath();},fill,'#182830',.6);
}
/** Two-bone inverse kinematics keeps the sole in place while the knee bends. */
function kneeFor(hip,foot){const upper=39,lower=40,dx=foot.x-hip.x,dy=foot.y-hip.y,d=clamp(Math.hypot(dx,dy),1,upper+lower-.1),along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along)),len=Math.hypot(dx,dy)||1;return{x:hip.x+dx/len*along+dy/len*bend,y:hip.y+dy/len*along-dx/len*bend}}
/** Character-specific hand choreography, driven only by the engine's visible shot phase. */
function personalityGesture(kind,o){
 if(o.personalitySkill!==kind||!o.personalityPhase)return null;
 const phase=o.personalityPhase,p=clamp(o.personalityProgress??0),n=o.personalityIndex||1;
 const wind=phase==='tracking'?smooth(p*3):1,release=phase==='dashing'?smooth(p):phase==='recover'?1:0,
  weight=phase==='recover'?1-smooth(p):wind;
 const poses={
  ignis:{ready:[.32,2.8,-.25,.4],release:[1.62,1.32,-.2,.3],lean:.075},
  mime:{ready:[.5,2.6,-.65,.7],release:[1.25,1.0,-.8,.1],lean:.2},
  gojo:{ready:[.8,2.5,-.4,.6],release:[1.05,.65,-.5,.4],lean:.06},
  max:{ready:[.25,2.85,-.3,.25],release:[.8,2.3,-.55,.75],lean:.035},
  sukuna:{ready:n%2?[.3,2.5,-1.1,-.3]:[-.35,.5,.6,2.1],release:n%2?[1.8,1.4,-1.3,-.6]:[.2,-.7,-.8,-1.5],lean:.24}
 }[kind];if(!poses)return null;
 return{arms:poses.ready.map((v,i)=>lerp(v,poses.release[i],release)),weight,lean:o.reduced?0:poses.lean*release*weight};
}
export function samplePhotoFighterPose(kind,o={}){
 const gesture=personalityGesture(kind,o),t=o.reduced?0:o.time||0,walk=o.reduced?0:clamp(o.walkWeight??(o.walk?1:0)),phase=(o.walkPhase??t*6.8)*1.7,
  p=clamp(o.attackProgress??.5),active=o.attack>0,strike=active?Math.sin(smooth(p)*Math.PI):0,
  hurt=clamp((o.hitReaction||o.hitStun||0)/.3),wind=o.windup?smooth((o.windupProgress??1)*5):active?1-smooth((p-.2)/.8):0,domain=o.domain?(o.windup?wind:1):0,
  breath=o.reduced?0:Math.sin(t*2.4)*.45,
  hipY=-83.2+(o.reduced?0:walk*(4.5+Math.cos(phase*2)*1.1))+clamp((o.landingTimer||0)/.22)*2.8,
  lean=o.reduced?0:Math.sin(phase)*walk*.025+strike*.09+hurt*(o.hitDir||1)*(o.facing||1)*.12+(gesture?.lean||0);
 const legs=[-1,1].map(side=>{const q=phase+(side<0?Math.PI:0),hip={x:side*8,y:hipY},foot={x:side*8+Math.sin(q)*walk*22+strike*(side>0?8:-3),y:-5-Math.max(0,Math.cos(q))*walk*10-((o.launchZ||0)>2?7:0)},knee=kneeFor(hip,foot);return{side,hip,knee,foot}});
 const gait=Math.sin(phase)*walk;
 let upper=.2-gait*.35,lower=.32+gait*.25,backUpper=-.16+gait*.4,backLower=.23-gait*.25;
 if(kind==='ignis'){upper=lerp(upper,1.75,wind*.8+strike*.2);lower=lerp(lower,2.9,wind*.8+strike*.2);}
 if(kind==='mime'){upper=lerp(upper,1.1,.65);lower=lerp(lower,3.45,.78);backUpper+=strike*.7;backLower+=strike*.9;}
 if(kind==='gojo'){upper=lerp(upper,1.4,wind*.7+strike*.3);lower=lerp(lower,2.05,wind*.7+strike*.3);}
 if(kind==='max'){upper=lerp(upper,.32,.88+wind*.12);lower=lerp(lower,2.95,.88+wind*.12);backUpper=lerp(backUpper,-.2,.6);backLower=lerp(backLower,.25,.6);}
 if(kind==='sukuna'){upper+=strike*1.75;lower+=strike*1.35;backUpper-=strike*.55;backLower+=strike*.4;}
 if(domain){
  const hands={ignis:[1.35,2.85,-.35,.65],mime:[.95,3.35,-1.5,-1.8],gojo:[1.3,2.5,-1.05,-2.55],max:[.55,2.8,-.6,.7],sukuna:[2.1,1.65,-.9,-.55]}[kind];
  if(hands){upper=lerp(upper,hands[0],domain);lower=lerp(lower,hands[1],domain);backUpper=lerp(backUpper,hands[2],domain);backLower=lerp(backLower,hands[3],domain);}
 }
 if(gesture){const [a,b,d,e]=gesture.arms;upper=lerp(upper,a,gesture.weight);lower=lerp(lower,b,gesture.weight);backUpper=lerp(backUpper,d,gesture.weight);backLower=lerp(backLower,e,gesture.weight);}
 upper-=hurt*.5;lower-=hurt*.4;
 const shoulder={x:17,y:-130+breath},backShoulder={x:-17,y:-130+breath},elbow=bone(shoulder,28,upper),wrist=bone(elbow,26,lower),backElbow=bone(backShoulder,28,backUpper),backWrist=bone(backElbow,25,backLower);
 return{hipY,lean,breath,walk,gait,strike,hurt,wind,domain,legs,shoulder,elbow,wrist,backShoulder,backElbow,backWrist,upper,lower,headTilt:o.reduced?0:-lean*.55+Math.sin(t*1.8)*.012};
}
function shoe(c,p,color,angle=0){c.save();c.translate(p.x,p.y);c.rotate(angle);path(c,c=>{c.moveTo(-6,-5);c.quadraticCurveTo(-2,-8,5,-5);c.lineTo(9,-1);c.quadraticCurveTo(17,0,16,4);c.lineTo(-7,4);c.quadraticCurveTo(-9,0,-6,-5);c.closePath()},color,'#19262e',1);line(c,[[-7,3],[15,3]],'#a2aaa5',1.4);line(c,[[2,-3],[7,-2]],'#7d8b8d',1);c.restore()}
function drawHand(c,p,skin,gesture='relaxed',angle=0){c.save();c.translate(p.x,p.y);c.rotate(angle);path(c,c=>{c.moveTo(-3,-3);c.quadraticCurveTo(-5,0,-3,5);c.quadraticCurveTo(0,8,3,5);c.lineTo(4,0);c.quadraticCurveTo(3,-3,1,-4);c.closePath()},skin,'#624c41',.65);if(gesture==='thumb'){path(c,c=>{c.moveTo(-2,1);c.lineTo(-3,-7);c.quadraticCurveTo(-1,-12,1,-8);c.lineTo(2,-1)},skin,'#624c41',.6)}else if(gesture==='cast'){for(let i=0;i<4;i++)line(c,[[i*1.6-2,1],[i*1.8-2,8+(i%2)*2]],skin,1.5)}else for(let i=0;i<3;i++)line(c,[[i*1.5-2,1],[i*1.5-2,4]],'#8f6c58',.45);c.restore()}
function drawCup(c,p,angle){c.save();c.translate(p.x,p.y);c.rotate(angle);poly(c,[[-6,-15],[7,-15],[5,2],[-5,2]],'#eeeae8','#798a87',.7);poly(c,[[-5,-4],[6,-4],[5,2],[-5,2]],'#8a657f');oval(c,.5,-15,7.5,2,'#c2b9c1','#778e8d',.6);path(c,c=>{c.moveTo(-6,-15);c.quadraticCurveTo(-6,-25,1,-25);c.quadraticCurveTo(8,-25,7,-15)},'#bc96b088','#869492',.6);line(c,[[1,-18],[3,-33],[7,-37]],'#bb879e',1.5);c.restore()}
function drawPhone(c,p,angle,flash=false){c.save();c.translate(p.x+2,p.y-5);c.rotate(angle);path(c,c=>c.roundRect(-6,-21,13,25,2.5),'#141c22','#788080',.7);path(c,c=>c.roundRect(-4.5,-19,8.7,9.4,2),'#273139','#0d141a',.5);for(const [x,y] of [[-2.5,-16.5],[1.8,-16.5],[-2.5,-12]]){oval(c,x,y,1.65,1.65,'#080d12','#7e8d95',.5);oval(c,x-.3,y-.3,.5,.5,'#52646c');}oval(c,2,-11.9,.7,.7,flash?'#ffeccb':'#9faaa3');line(c,[[7,-12],[7,-7]],'#879494',.7);c.restore();}
function drawBottle(c,p){drawRedCapBottle(c,p.x+2,p.y-5,.8,-.35);}
function drawTorso(c,kind,m,w,skin){
 path(c,c=>{c.moveTo(-8,-143);c.quadraticCurveTo(-19,-141,-23,-130);c.quadraticCurveTo(-23,-112,-17,-94);c.lineTo(-18,-81);c.quadraticCurveTo(0,-76,18,-81);c.lineTo(16,-95);c.quadraticCurveTo(23,-116,22,-132);c.quadraticCurveTo(17,-141,8,-143);c.closePath()},grad(c,-24,-128,21,-107,w.light,w.dark),'#15242b',1.1);
 // A narrow photographic neckline avoids a floating-head seam.
 path(c,c=>{c.moveTo(-6,-150);c.lineTo(7,-150);c.lineTo(8,-138);c.quadraticCurveTo(0,-132,-8,-139);c.closePath()},skin,'#775b4b',.6);
 if(kind==='ignis'){
  poly(c,[[-9,-140],[-14,-125],[-12,-83],[12,-83],[15,-126],[8,-140],[0,-135]],'#e4e7df','#a3b1ab',.6);
  poly(c,[[-8,-143],[-10,-131],[-3,-127],[0,-135],[5,-128],[11,-133],[8,-142],[0,-136]],'#f1efe4','#b7c2b8',.6);
  line(c,[[0,-134],[0,-121]],'#a6b6ad',.9);oval(c,1,-128,.7,.7,'#87958e');oval(c,1,-123,.7,.7,'#87958e');
  for(const side of [-1,1]){path(c,c=>{c.moveTo(side*11,-141);c.quadraticCurveTo(side*17,-124,side*12,-81)},null,'#d4d8cf',2.2);line(c,[[side*13,-137],[side*14,-98],[side*12,-84]],'#879793',.7);}
 }else if(kind==='max'){
  poly(c,[[-9,-141],[0,-136],[9,-141],[10,-124],[-9,-124]],'#191d1d','#282925',.6);
  for(const side of [-1,1]){path(c,c=>{c.moveTo(side*9,-143);c.quadraticCurveTo(side*15,-137,side*9,-127);c.lineTo(side*3,-135);c.closePath()},w.dark,w.mid,.7);path(c,c=>{c.moveTo(side*7,-124);c.quadraticCurveTo(side*7,-103,side*9,-85)},null,w.seam,1);line(c,[[side*13,-112],[side*14,-95]],w.dark,1.7);line(c,[[side*16,-111],[side*17,-97]],w.light,.5);}
  line(c,[[0,-132],[0,-82]],'#b69a6c',1.3);line(c,[[2,-131],[2,-82]],'#392c21',.8);oval(c,0,-126,1.5,2,'#b49b76');for(let i=-14;i<=14;i+=4)line(c,[[i,-83],[i,-79]],w.dark,.7);
 }else if(kind==='mime'||kind==='sukuna'){
  path(c,c=>{c.moveTo(-10,-145);c.quadraticCurveTo(-21,-147,-20,-134);c.quadraticCurveTo(-12,-124,0,-135);c.quadraticCurveTo(16,-126,21,-135);c.quadraticCurveTo(20,-148,9,-146);c.lineTo(8,-139);c.quadraticCurveTo(0,-132,-8,-140);c.closePath()},grad(c,-12,-145,12,-131,w.light,w.dark),'#26353b',.9);
  if(kind==='mime'){
   line(c,[[-5,-134],[-5+Math.sin(m.gait)*.9,-111]],'#768b8a',1);line(c,[[6,-134],[7,-109]],'#81938f',1);oval(c,-5,-111,1,2,'#81928c');oval(c,7,-109,1,2,'#81928c');
   path(c,c=>{c.moveTo(-10,-100);c.lineTo(-13,-87);c.quadraticCurveTo(0,-82,13,-87);c.lineTo(10,-100)},null,'#718786',.8);line(c,[[-10,-100],[10,-100]],'#b9c8bf',.65);
  }else{
   line(c,[[0,-134],[2,-83]],'#74828a',1);line(c,[[2,-134],[4,-84]],'#131d26',.6);
   for(const side of [-1,1])line(c,[[side*11,-112],[side*14,-102]],'#111b24',1.5);
   path(c,c=>{c.moveTo(-7,-136);c.quadraticCurveTo(-8,-117,-2,-111);c.quadraticCurveTo(4,-115,8,-134)},null,'#a2b1ac',.65);poly(c,[[-7,-113],[3,-113],[3,-104],[-7,-104]],'#567b75','#b2c6b7',.4);
  }
 }else{
  path(c,c=>{c.moveTo(-9,-141);c.quadraticCurveTo(0,-130,9,-141)},null,'#0b161c',3);path(c,c=>{c.moveTo(-9,-141);c.quadraticCurveTo(0,-134,9,-141)},null,'#49534f',.7);
 }
 for(const side of [-1,1]){line(c,[[side*17,-126],[side*14,-118],[side*15,-110]],w.seam,.65);line(c,[[side*14,-92],[side*8,-88]],w.dark,1);}
 path(c,c=>{c.moveTo(-17,-83);c.quadraticCurveTo(0,-78,17,-83)},null,w.seam,1.5);
}
function facePath(c,points,p,sourceW,sourceH,scale){const map=([x,y])=>[(x-p.center[0])*sourceW*scale,(y-p.center[1])*sourceH*scale];const all=points.map(map);c.moveTo(...all[0]);for(let i=1;i<all.length;i++)c.lineTo(...all[i]);c.closePath();}
export function drawPhotoFace(c,kind,{x=0,y=-140,tilt=0,facing=1}={}){
 const p=PHOTO_FACE_PROFILES[kind],image=getBossPhoto(kind);if(!p)return false;
 c.save();c.translate(x,y);c.rotate(tilt);c.scale(facing,1); // keep the original face unmirrored as the body changes direction
 if(image?.complete&&image.naturalWidth){
  const iw=image.naturalWidth,ih=image.naturalHeight,scale=p.displayWidth/(p.width*iw);
  c.beginPath();facePath(c,p.outline,p,iw,ih,scale);for(const extra of p.extras||[])facePath(c,extra,p,iw,ih,scale);
  c.clip();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  c.drawImage(image,-p.center[0]*iw*scale,-p.center[1]*ih*scale,iw*scale,ih*scale);
 }else{
  // A neutral loading silhouette keeps the game playable; no previous boss identity flashes.
  oval(c,0,-30,22,29,'#22323b','#8caba4',1);c.font='800 12px sans-serif';c.fillStyle='#d9ede0';c.textAlign='center';c.fillText(BOSS_VISUALS[kind].name,0,-24);
 }
 c.restore();return true;
}
export function drawPhotoFighter2D(c,kind,x,y,scale=1,o={}){
 if(!BOSS_PHOTOS[kind])return false;
 const m=samplePhotoFighterPose(kind,o),w=WARDROBE[kind],p=PHOTO_FACE_PROFILES[kind],facing=o.facing||1;
 c.save();c.translate(x,y);c.scale(scale*facing,scale);
 if(o.dead){const f=smooth(o.deathProgress||0);if(!o.reduced)c.rotate(f*1.12*(o.hitDir||1)*facing);c.globalAlpha*=1-f*.6;}
 for(const leg of m.legs){const {hip,knee,foot,side}=leg,fill=grad(c,hip.x-9,hip.y,knee.x+9,knee.y,side<0?w.dark:w.pants,w.pants);clothLimb(c,hip,knee,foot,8.2,6.8,4.6,fill);line(c,[[knee.x-3,knee.y-4],[knee.x+3,knee.y-1],[knee.x-1,knee.y+3]],kind==='sukuna'?'#a05c6a':w.seam,.65);line(c,[[hip.x-3,hip.y+8],[knee.x-3,knee.y-7]],'#c5d1c41b',.9);shoe(c,foot,w.shoe,Math.max(0,-m.gait*side)*.08);}
 c.save();c.translate(0,m.hipY);c.rotate(m.lean);c.translate(0,-m.hipY+m.breath);
 const sleeve=(a,j,b,back=false)=>clothLimb(c,a,j,b,8.5,7,4.2,grad(c,a.x-7,a.y,b.x+6,b.y,back?w.mid:w.light,w.dark));
 sleeve(m.backShoulder,m.backElbow,m.backWrist,true);drawHand(c,m.backWrist,p.skin,m.domain?'cast':'relaxed');
 drawTorso(c,kind,m,w,p.skin);
 sleeve(m.shoulder,m.elbow,m.wrist);line(c,[[m.elbow.x-4,m.elbow.y-2],[m.elbow.x+2,m.elbow.y+1]],w.seam,.7);
 drawHand(c,m.wrist,p.skin,kind==='ignis'&&(m.wind||m.domain)?'thumb':m.domain||m.wind&&kind==='gojo'?'cast':'relaxed',-.12*m.lower);
 if(kind==='ignis'&&o.personalitySkill==='ignis'&&['tracking','locked'].includes(o.personalityPhase))drawBottle(c,m.wrist);
 if(kind==='max')drawPhone(c,m.wrist,-.12*m.lower,m.strike>.85);
 if(kind==='mime')drawCup(c,{x:m.wrist.x+1,y:m.wrist.y},-.12*m.lower);
 drawPhotoFace(c,kind,{y:-139,tilt:m.headTilt,facing});
 c.restore();c.restore();return true;
}
