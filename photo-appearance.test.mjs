import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Match the decoded, EXIF-oriented photo dimensions. The source pixels are not
// regenerated: Canvas receives the same original files as the HTML cards.
const photoSizes={
 'pino.png':[954,822], 'daegil.png':[512,512],
 'if.jpg':[3265,4898], 'max.jpg':[1315,2176], 'moving.png':[512,512],
};
class ImageMock{
 constructor(){this.complete=true;this.naturalWidth=1672;this.naturalHeight=941;}
 set src(value){this.url=value;const size=photoSizes[value.split('/').at(-1)];if(size)[this.naturalWidth,this.naturalHeight]=size;this.onload?.();}
 get src(){return this.url;}
}
globalThis.Image=ImageMock;
function context(){
 const calls=[],state={globalAlpha:1,matrix:[1,0,0,1,0,0]},stack=[];
 const multiply=m=>{const [a,b,c,d,e,f]=state.matrix,[aa,bb,cc,dd,ee,ff]=m;state.matrix=[a*aa+c*bb,b*aa+d*bb,a*cc+c*dd,b*cc+d*dd,a*ee+c*ff+e,b*ee+d*ff+f];};
 const c=new Proxy(state,{get(o,key){
  if(key==='calls')return calls;if(key in o)return o[key];
  if(key==='createLinearGradient'||key==='createRadialGradient')return(...args)=>{args.forEach(v=>assert(Number.isFinite(v)));return{addColorStop(offset){assert(Number.isFinite(offset));}};};
  if(key==='measureText')return value=>({width:String(value).length*9});
  return(...args)=>{
   for(const value of args)if(typeof value==='number')assert(Number.isFinite(value),`${String(key)} must receive finite geometry`);
   const call=[key,...args];if(key==='drawImage')call.matrix=[...o.matrix];calls.push(call);
   if(key==='save')stack.push({...o,matrix:[...o.matrix]});
   if(key==='restore'){assert(stack.length,'balanced Canvas restore');Object.assign(o,stack.pop());}
   if(key==='translate')multiply([1,0,0,1,args[0],args[1]]);
   if(key==='scale')multiply([args[0],0,0,args[1],0,0]);
   if(key==='rotate'){const co=Math.cos(args[0]),si=Math.sin(args[0]);multiply([co,si,-si,co,0,0]);}
   if(key==='transform')multiply(args);
  };
 },set(o,key,value){if(typeof value==='number')assert(Number.isFinite(value));o[key]=value;return true;}});
 return c;
}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
const {BOSS_PHOTOS,BOSS_VISUALS,getBossPhoto,bossPhotoAssetStatus,bossPhotoPlacement,drawBossPhotoPanel}=await import('./boss-visuals.js');
const {drawCombatCinematic}=await import('./combat-cinematic.js');
const {drawDomainCutscene,getTakeoverArtwork,domainAssetStatus}=await import('./domain-cinematic.js');
const {createGame,step,getDomainGuide}=await import('./engine.js');

test('the five boss identities use their assigned original photo in all portrait loaders',async()=>{
 const mapping={ignis:['피노','pino.png'],mime:['대길','daegil.png'],gojo:['이프','if.jpg'],max:['맥스','max.jpg'],sukuna:['무빙','moving.png']};
 for(const [id,[name,file]] of Object.entries(mapping)){
  assert.equal(BOSS_VISUALS[id].name,name);
  assert.equal(BOSS_PHOTOS[id].src,`./assets/photos/${file}`);
  assert.equal(getTakeoverArtwork(id),getBossPhoto(id),'intro/domain/fighter share the same original Image');
  const bytes=await readFile(new URL(BOSS_PHOTOS[id].src,import.meta.url));
  assert(bytes.length>10000,'the real photo file ships with the game');
  assert.equal(bytes.subarray(0,file.endsWith('.jpg')?2:4).toString('hex'),file.endsWith('.jpg')?'ffd8':'89504e47');
 }
 assert(Object.values(bossPhotoAssetStatus()).every(Boolean));
 assert.deepEqual(domainAssetStatus(),bossPhotoAssetStatus());
});

test('Max ships the byte-identical original photograph and the five audition names are unambiguous',async()=>{
 const bytes=await readFile(new URL('./assets/photos/max.jpg',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),'352e49229085ef084c7e6e86ac2735c646b3650f3814be6abef6d09d38171368');
 assert.deepEqual(Object.values(BOSS_VISUALS).map(v=>v.audition),['서류 심사','1차 오디션','2차 오디션','3차 오디션','최종 오디션']);assert.equal(BOSS_VISUALS.max.signature,'남는 건 추억이다~');
});

test('photo push-in contains every source edge without stretching at every cinematic progress',()=>{
 for(const size of Object.values(photoSizes))for(const reduced of [false,true])for(const bounds of [{x:330,y:65,w:620,h:370},{x:350,y:112,w:580,h:380}]){
  for(let frame=0;frame<=120;frame++){
   const image={naturalWidth:size[0],naturalHeight:size[1]},r=bossPhotoPlacement(image,{...bounds,progress:frame/120,reduced});
   assert(r.x>=bounds.x-1e-8&&r.y>=bounds.y-1e-8);
   assert(r.x+r.w<=bounds.x+bounds.w+1e-8&&r.y+r.h<=bounds.y+bounds.h+1e-8);
   assert(Math.abs(r.w/r.h-size[0]/size[1])<1e-10,'preserve original face proportions');
  }
 }
 assert.equal(bossPhotoPlacement({naturalWidth:0,naturalHeight:0}),null);
});

test('a decoded portrait uses the entire source image; loading failure preserves a named fallback',()=>{
 for(const id of Object.keys(BOSS_PHOTOS)){
  const image=getBossPhoto(id),c=context();
  assert.equal(drawBossPhotoPanel(c,id),true);
  const draws=c.calls.filter(v=>v[0]==='drawImage');
  assert.equal(draws.length,1);assert.equal(draws[0][1],image);
  assert.equal(draws[0].length,6,'five-argument drawImage displays the entire uncropped original');
  image.complete=false;
  const unloaded=context();assert.equal(drawBossPhotoPanel(unloaded,id),false);
  assert(!unloaded.calls.some(v=>v[0]==='drawImage'));
  assert(unloaded.calls.some(v=>v[0]==='fillText'&&v[1]===BOSS_VISUALS[id].name));
  assert.equal(bossPhotoAssetStatus()[id],false);image.complete=true;
 }
});

test('all five photo entrances render without mutating combat state or intro duration',()=>{
 for(let stage=0;stage<5;stage++)for(const reduced of [false,true])for(const progress of [0,.12,.44,.77,.99]){
  const s=createGame({stage,skipIntro:true});
  s.cinematic={kind:'bossIntro',actorId:s.boss.id,duration:[3,3.2,3.4,3.6,3.8][stage],remaining:[3,3.2,3.4,3.6,3.8][stage]*(1-progress)};
  const before=JSON.stringify(s),c=context();freeze(s);
  assert.equal(drawCombatCinematic(c,s,1,reduced),true);
  assert.equal(JSON.stringify(s),before);
  assert(c.calls.some(v=>v[0]==='drawImage'&&v[1]===getBossPhoto(s.boss.id)));
  assert(c.calls.some(v=>v[0]==='fillText'&&String(v[1]).includes(s.boss.name)));
 }
});

test('every takeover variant retains its safety geometry and guide while showing the original photo',()=>{
 for(let stage=0;stage<5;stage++)for(const count of [0,1])for(const reduced of [false,true]){
  const s=createGame({stage,skipIntro:true});s.cinematic=null;
  s.boss.patternIndex=3;s.boss.patternCooldown=0;s.boss.takeoverCount=count;
  step(s);const zone=s.hazards.find(h=>h.kind==='domain');assert(zone);
  const guide=JSON.stringify(getDomainGuide(s,zone)),before=JSON.stringify(s),c=context();freeze(s);
  assert.equal(drawDomainCutscene(c,s,1,reduced),true);
  assert.equal(JSON.stringify(s),before);
  assert.equal(JSON.stringify(getDomainGuide(s,zone)),guide);
  assert(c.calls.some(v=>v[0]==='drawImage'&&v[1]===getBossPhoto(s.boss.id)));
  assert(c.calls.some(v=>v[0]==='fillText'&&String(v[1]).includes('무대')));
 }
});

test('player ultimate artwork remains separate from boss photos',()=>{
 for(const role of ['actor','director']){
  const s=createGame({character:role,skipIntro:true});s.player.hype=100;step(s,{ultimate:true});
  assert.equal(s.cinematic?.kind,'playerUltimate');const before=JSON.stringify(s),c=context();freeze(s);
  assert.equal(drawCombatCinematic(c,s,1,false),true);assert.equal(JSON.stringify(s),before);
  const draws=c.calls.filter(v=>v[0]==='drawImage');assert.equal(draws.length,1);
  assert(draws[0][1].src.includes(`${role}-ultimate-v9.png`));
  assert(!draws.some(v=>Object.keys(BOSS_PHOTOS).some(id=>v[1]===getBossPhoto(id))));
 }
});

const {PHOTO_FACE_PROFILES,samplePhotoFighterPose,drawPhotoFighter2D}=await import('./photo-fighter2d.js');

test('every original-face contour stays inside its own source photograph',()=>{
 for(const id of Object.keys(BOSS_PHOTOS)){
  const p=PHOTO_FACE_PROFILES[id];assert(p&&p.width>0&&p.displayWidth>0);
  for(const contour of [p.outline,...(p.extras||[])]){
   assert(contour.length>=3);
   for(const [x,y] of contour)assert(x>=0&&x<=1&&y>=0&&y<=1);
  }
 }
});

test('walking and casting poses move continuously with finite articulated limbs',()=>{
 const allNumbers=value=>typeof value==='number'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(allNumbers):[];
 for(const id of Object.keys(BOSS_PHOTOS))for(const kind of ['walk','attack','windup','domain','hit','air']){
  let previous=null,maxMotion=0;
  for(let frame=0;frame<=240;frame++){
   const options=freeze({time:frame/60,walkWeight:kind==='walk'?1:0,walkPhase:frame/60*6.8,
    attack:kind==='attack'?1:0,attackProgress:frame/240,windup:kind==='windup',domain:kind==='domain',
    hitReaction:kind==='hit'?.3*(1-frame/240):0,launchZ:kind==='air'?20:0});
   const pose=samplePhotoFighterPose(id,options);assert(allNumbers(pose).every(Number.isFinite));
   if(previous){
    const d=Math.hypot(pose.wrist.x-previous.wrist.x,pose.wrist.y-previous.wrist.y);maxMotion=Math.max(maxMotion,d);
    assert(d<9,'a 60 Hz frame never snaps the attached wrist across the body');
   }
   for(const leg of pose.legs){
    assert(Math.abs(Math.hypot(leg.knee.x-leg.hip.x,leg.knee.y-leg.hip.y)-39)<.4,'upper leg keeps its rig length');
    assert(Math.abs(Math.hypot(leg.foot.x-leg.knee.x,leg.foot.y-leg.knee.y)-40)<.4,'lower leg keeps its rig length');
    assert(leg.foot.y<=-5,'sole remains above its unchanged ground anchor');
   }
   previous=pose;
  }
  if(kind==='walk')assert(maxMotion>.1,'walking must visibly articulate, not hold a static portrait');
 }
});

test('reduced motion stops idle breathing and walking while retaining a readable action pose',()=>{
 for(const id of Object.keys(BOSS_PHOTOS)){
  const a=samplePhotoFighterPose(id,{time:1,walkPhase:1,walkWeight:1,reduced:true});
  const b=samplePhotoFighterPose(id,{time:100,walkPhase:100,walkWeight:1,reduced:true});
  assert.deepEqual(a,b);assert.equal(a.walk,0);assert.equal(a.headTilt,0);assert.equal(a.lean,0);
  const casting=samplePhotoFighterPose(id,{domain:true,reduced:true});
  assert.notDeepEqual(casting.wrist,a.wrist,'the cast remains recognizable without camera/body shaking');
 }
});

test('photo rigs preserve original facial proportions and orientation through both facing directions',()=>{
 for(const id of Object.keys(BOSS_PHOTOS))for(const facing of [-1,1])for(const reduced of [false,true])for(const mode of ['idle','walk','attack','windup','domain','hit','dead']){
  const o=freeze({time:1.2,facing,reduced,walk:mode==='walk',walkWeight:mode==='walk'?1:0,attack:mode==='attack'?1:0,
   attackProgress:.43,windup:mode==='windup',domain:mode==='domain',hitReaction:mode==='hit'?.2:0,dead:mode==='dead',deathProgress:.6,
   unit:freeze({x:640,y:500,hp:120,attackAnim:.5})});
  const before=JSON.stringify(o),c=context();assert.equal(drawPhotoFighter2D(c,id,640,500,1,o),true);assert.equal(JSON.stringify(o),before);
  const draws=c.calls.filter(v=>v[0]==='drawImage');assert.equal(draws.length,1);assert.equal(draws[0][1],getBossPhoto(id));
  const [a,b,cc,d]=draws[0].matrix;
  assert(a*d-b*cc>0,'turning the body never mirrors the original face');
  assert(Math.abs(Math.hypot(a,b)-Math.hypot(cc,d))<1e-8,'the face is never squeezed or stretched');
  assert(Math.abs(a*cc+b*d)<1e-8,'face is rotated rigidly, without shear');
  assert(c.calls.some(v=>v[0]==='clip'),'only traced face/antler pixels are shown');
  assert.deepEqual(c.matrix,[1,0,0,1,0,0],'drawing restores all caller transforms');
 }
 assert.equal(drawPhotoFighter2D(context(),'actor',0,0),false,'hero keeps the existing art renderer');
 assert.equal(drawPhotoFighter2D(context(),'director',0,0),false);
});

test('photo load failures keep each moving rig playable without reviving the old boss artwork',()=>{
 for(const id of Object.keys(BOSS_PHOTOS)){
  const image=getBossPhoto(id);image.complete=false;
  try{
   const c=context();assert.equal(drawPhotoFighter2D(c,id,640,500,1,{walk:true,time:1}),true);
   assert(!c.calls.some(v=>v[0]==='drawImage'));
   assert(c.calls.some(v=>v[0]==='fillText'&&v[1]===BOSS_VISUALS[id].name));
  }finally{image.complete=true;}
 }
});

test('personality gestures retain original faces through every skill phase and dash direction',()=>{
 for(const id of Object.keys(BOSS_PHOTOS))for(const facing of [-1,1])for(const phase of ['tracking','locked','dashing','recover'])for(const index of [1,2,3])for(const progress of [0,.3,.7,1]){
  const o=freeze({facing,time:1,personalitySkill:id,personalityPhase:phase,personalityProgress:progress,personalityIndex:index,walkWeight:phase==='dashing'?1:0});
  const c=context(),before=JSON.stringify(o);drawPhotoFighter2D(c,id,640,500,1,o);assert.equal(JSON.stringify(o),before);
  const draw=c.calls.find(v=>v[0]==='drawImage');assert.equal(draw[1],getBossPhoto(id));
  const [a,b,cc,d]=draw.matrix;assert(a*d-b*cc>0);assert(Math.abs(Math.hypot(a,b)-Math.hypot(cc,d))<1e-8);
  assert.deepEqual(c.matrix,[1,0,0,1,0,0]);
 }
});
