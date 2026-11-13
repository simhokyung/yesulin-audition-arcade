import { getPatternGuide } from './engine.js';
/** Original audition judges and their practical stage effects. Internal IDs preserve combat compatibility. */
export const BOSS_VISUALS={
 ignis:{audition:'서류 심사',name:'피노',title:'첫 무대의 긴장을 넘어서',role:'조명감독',stage:'앰버 조명실',asset:'ignis',color:'#ffc979',deep:'#261c28',wall:'#52464c',cloth:'#613d32',takeover:'골든 아워',quote:'조명 켰다. 긴장해도 좋아. 네 장면을 시작해.',quoteLines:['빨뚜는 못 참지. 조명 켰다!','긴장 풀고, 네 장면을 보여줘.'],feature:'빨뚜',signature:'빨뚜 통째로, 액션!',featureQuote:'빨뚜는 못 참지!'},
 mime:{audition:'1차 오디션',name:'대길',title:'나만의 배역을 찾아서',role:'가면연출가',stage:'가면 의상실',asset:'mime',color:'#8be9c6',deep:'#1e2030',wall:'#494253',cloth:'#503147',takeover:'페르소나 극장',quote:'가면은 수없이 많지. 너는 어떤 장면을 보여줄 거야?',quoteLines:['추노 시작! 캐스팅할 때까지 쫓아간다.','너만의 장면을 보여줘.'],feature:'추노',signature:'끝까지 캐스팅',featureQuote:'거기 서! 추노 시작이다!'},
 gojo:{audition:'2차 오디션',name:'이프',title:'달라진 흐름에 응답하기',role:'경계심사관',stage:'프레임 심사실',asset:'prism',color:'#a5dce5',deep:'#152333',wall:'#344b60',cloth:'#253d59',takeover:'무한 시사회',quote:'아까 통했던 동선이, 이번에도 통할까?',quoteLines:['자리해야지~ 그 자리는 내가 쓸게.','달라진 동선에서도 네 장면을 보여줘.'],feature:'자리해야지',signature:'자리해야지~',featureQuote:'자리해야지~ 그 자리는 내가 쓸게.'},
 max:{audition:'3차 오디션',name:'맥스',title:'기억에 남는 한 장면',role:'기록심사관',stage:'추억 기록실',asset:'max',color:'#edc68c',deep:'#272125',wall:'#655347',cloth:'#574332',takeover:'추억 보관소',quote:'추억이 중요하다~ 자, 기억에 남을 장면 하나 보여줘.',quoteLines:['추억이 중요하다~','자, 기억에 남을 장면 하나 보여줘.'],feature:'추억',signature:'남는 건 추억이다~',featureQuote:'추억이 중요하다~'},
 sukuna:{audition:'최종 오디션',name:'무빙',title:'마지막까지 집중을 지키기',role:'종막집행관',stage:'종막 대극장',asset:'caden',color:'#efb3bf',deep:'#261d2c',wall:'#593e4c',cloth:'#5a2d3e',takeover:'종막 집행',quote:'마지막 장면이다. 끝까지 네 박자를 지켜라.',quoteLines:['무빙 좀 보여줘. 아직 컷 안 했어!','마지막까지 네 박자를 지켜라.'],feature:'현란한 무빙',signature:'원테이크, 따라와',featureQuote:'무빙 좀 보여줘. 아직 컷 안 했어!'},
};
/** User-supplied originals. These images are shared by UI, portraits and photo-face rigs. */
export const BOSS_PHOTOS={
 ignis:{src:'./assets/photos/pino.png'},
 mime:{src:'./assets/photos/daegil.png'},
 gojo:{src:'./assets/photos/if.jpg'},
 max:{src:'./assets/photos/max.jpg'},
 sukuna:{src:'./assets/photos/moving.png'},
};
const bossPhotos={};
for(const [id,photo] of Object.entries(BOSS_PHOTOS)){
 if(typeof Image==='undefined')continue;
 const image=new Image();image.decoding='async';
 image.src=new URL(photo.src,import.meta.url).href;bossPhotos[id]=image;
}
export function getBossPhoto(id){return bossPhotos[id]||null;}
export function bossPhotoAssetStatus(){return Object.fromEntries(Object.keys(BOSS_PHOTOS).map(id=>[id,!!(bossPhotos[id]?.complete&&bossPhotos[id]?.naturalWidth)]));}
/** Contain the entire original, including hair and gestures; animation never crops the photo. */
export function bossPhotoPlacement(image,{x=350,y=82,w=580,h=360,progress=1,reduced=false}={}){
 const iw=image?.naturalWidth||image?.width,ih=image?.naturalHeight||image?.height;
 if(!(iw>0&&ih>0&&w>0&&h>0))return null;
 const p=Math.max(0,Math.min(1,progress)),ease=1-Math.pow(1-p,3),zoom=reduced?1:.975+.025*ease;
 const scale=Math.min(w/iw,h/ih)*zoom,dw=iw*scale,dh=ih*scale;
 return{x:x+(w-dw)/2,y:y+(h-dh)/2,w:dw,h:dh};
}
/** A light-box portrait: no tint, face warp, invented expression or painted-over pixels. */
export function drawBossPhotoPanel(c,id,options={}){
 const v=BOSS_VISUALS[id]||BOSS_VISUALS.ignis,image=getBossPhoto(id),
  {x=350,y=82,w=580,h=360,progress=1,reduced=false}=options;
 const rect=bossPhotoPlacement(image,{x,y,w,h,progress,reduced});
 c.save();
 const glow=c.createRadialGradient(x+w/2,y+h/2,24,x+w/2,y+h/2,w*.78);
 glow.addColorStop(0,v.color+'33');glow.addColorStop(1,v.color+'00');
 c.fillStyle=glow;c.fillRect(x-w*.4,y-h*.25,w*1.8,h*1.5);
 if(rect&&image?.complete&&image.naturalWidth){
  c.shadowColor='#00000099';c.shadowBlur=28;c.shadowOffsetY=12;
  c.fillStyle=v.deep;c.fillRect(rect.x-7,rect.y-7,rect.w+14,rect.h+14);
  c.shadowBlur=0;c.shadowOffsetY=0;
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  c.drawImage(image,rect.x,rect.y,rect.w,rect.h);
  c.strokeStyle=v.color+'90';c.lineWidth=1;c.strokeRect(rect.x-7.5,rect.y-7.5,rect.w+15,rect.h+15);
  // Corner tabs remain outside the original image rather than across a face.
  for(const sx of [-1,1])for(const sy of [-1,1]){
   const xx=rect.x+rect.w/2+sx*(rect.w/2+11),yy=rect.y+rect.h/2+sy*(rect.h/2+11);
   c.beginPath();c.moveTo(xx-sx*19,yy);c.lineTo(xx,yy);c.lineTo(xx,yy-sy*19);
   c.strokeStyle=v.color;c.lineWidth=2;c.stroke();
  }
 }else{
  c.fillStyle=v.deep;c.fillRect(x+90,y+30,w-180,h-60);
  c.strokeStyle=v.color+'66';c.lineWidth=1;c.strokeRect(x+90,y+30,w-180,h-60);
  c.font='800 38px "Noto Sans KR",sans-serif';c.textAlign='center';c.fillStyle=v.color;
  c.fillText(v.name,x+w/2,y+h/2+12);
 }
 c.restore();return !!(rect&&image?.complete&&image.naturalWidth);
}
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke()}
function polygon(c,points,fill,stroke=null,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
function box(c,x,y,w,h,fill,r=0){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function ellipse(c,x,y,rx,ry,fill,stroke=null,width=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
function label(c,value,x,y,size,color,weight=700){c.font=`${weight} ${size}px "Noto Sans KR",sans-serif`;c.fillStyle=color;c.textAlign='center';c.fillText(value,x,y)}
function frame(c,x,y,w,h,color,width=3){c.strokeStyle=color;c.lineWidth=width;c.strokeRect(x-w/2,y-h/2,w,h);const d=Math.min(16,w*.16);for(const a of [-1,1])for(const b of [-1,1])line(c,[[x+a*(w/2-d),y+b*h/2],[x+a*w/2,y+b*h/2],[x+a*w/2,y+b*(h/2-d)]],color,width+1)}
function mask(c,x,y,size,color,ghost=false){c.save();c.translate(x,y);c.scale(size/50,size/50);c.beginPath();c.moveTo(-27,-27);c.quadraticCurveTo(0,-36,27,-27);c.lineTo(24,9);c.quadraticCurveTo(12,32,0,38);c.quadraticCurveTo(-15,29,-24,8);c.closePath();c.fillStyle=color;c.fill();c.strokeStyle=ghost?'#c2cccbb0':'#263b45';c.lineWidth=2;c.stroke();for(const side of [-1,1])polygon(c,[[side*5,-7],[side*20,-12],[side*18,-3],[side*7,0]],'#213b44');line(c,[[-10,17],[0,21],[12,15]],'#415254',1.5);c.restore()}
function lens(c,x,y,r,phase,color){c.save();c.translate(x,y);c.rotate(phase);frame(c,0,0,r*2,r*1.7,color,2.5);frame(c,0,0,r*1.45,r*1.22,'#ecdfb3',1);for(let i=0;i<6;i++){const a=i*TAU/6;polygon(c,[[Math.cos(a)*r*.78,Math.sin(a)*r*.78],[Math.cos(a+.6)*r*.38,Math.sin(a+.6)*r*.38],[Math.cos(a+1)*r*.76,Math.sin(a+1)*r*.76]],color+'66')}ellipse(c,0,0,r*.2,r*.2,'#fff2c9');c.restore()}
function baton(c,x,y,length,angle,color='#e0d7cd'){c.save();c.translate(x,y);c.rotate(angle);line(c,[[-length*.45,0],[length*.5,0]],'#172837',5);line(c,[[-length*.45,0],[length*.5,0]],color,2);polygon(c,[[length*.5+7,0],[length*.46,-4],[length*.46,4]],color);box(c,-length*.49,-3,length*.17,6,'#4d3545',1);c.restore()}
/** An attack opportunity, never a mint safety zone. Timing is supplied by the combat engine. */
export function drawCounterOpening(c,b,remaining,duration=2,t=0,reduced=false){
 if(!(remaining>0)||!(b.hp>0))return;const gold='#ffda84',ratio=clamp(remaining/Math.max(.01,duration)),spin=reduced?0:t*.28;
 c.save();const glow=c.createRadialGradient(b.x,b.y-70,8,b.x,b.y-70,112);glow.addColorStop(0,'#ffce681a');glow.addColorStop(1,'#ffce6800');box(c,b.x-112,b.y-182,224,224,glow);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+spin;c.beginPath();c.ellipse(b.x,b.y+2,55,19,0,a+.14,a+.98);c.strokeStyle=i%2?'#edba63':gold;c.lineWidth=2.5;c.stroke();}
 for(const side of [-1,1])polygon(c,[[b.x+side*68,b.y+1],[b.x+side*57,b.y-5],[b.x+side*57,b.y+7]],gold);
 const side=b.facing===1?-1:1,x=clamp(b.x+side*99,95,1185),y=clamp(b.y-82,277,566);
 box(c,x-54,y-31,108,49,'#302731ef',5);label(c,'반격!',x,y-9,23,gold,900);label(c,`${remaining.toFixed(1)}초`,x,y+9,12,'#ffedbb',800);
 box(c,x-44,y+14,88,3,'#695638',1);box(c,x-44,y+14,88*ratio,3,gold,1);c.restore();
}
const numberMark=n=>['①','②','③','④'][Math.max(0,(n||1)-1)]||String(n||1);
function lightTargets(s){const all=s.hazards.filter(h=>h.kind==='rehearsal-light').sort((a,b)=>a.index-b.index);return{all,target:all.find(h=>h.active&&!h.visited)||all.find(h=>!h.visited)};}
function localPatternGuide(s){
 const lights=lightTargets(s);if(lights.target){const h=lights.target;return{kind:'light',title:h.active?`${numberMark(h.index)} 민트 조명 안으로!`:`${numberMark(h.index)} 다음 조명으로 이동 준비`,tip:'1 → 2 → 3 순서 · 켜진 조명 안에 잠깐 머무르세요',remaining:Math.max(0,h.active?h.life:h.remaining),duration:h.active?h.totalLife||.9:h.duration,color:h.active?'#79ffe0':'#f0d391',timerLabel:h.active?'조명 유지':'켜질 때까지'};}
 const a=s.audition;if(a&&!a.selected)return{kind:'audition',title:a.active===false?'대역 오디션 · 그림자를 보세요':'★ 진짜 실루엣을 Q / W로 공격!',tip:a.active===false?'별이 드러나면 진짜를 선택하세요':'★ = 진짜 · ○ = 대역 · 본체와 실루엣을 구별하세요',remaining:Math.max(0,a.active?a.remaining:a.warning),duration:a.active?a.duration:a.warningDuration,color:'#f6d995',timerLabel:a.active===false?'등장까지':'선택 시간'};
 const replay=s.hazards.filter(h=>h.kind==='replay').sort((a,b)=>a.index-b.index);if(replay.length){const h=replay.find(h=>!h.active)||replay[0];return{kind:'replay',title:'지나온 자리를 다시 공격합니다!',tip:'점선은 과거 이동 경로 · 번호 순서대로 공격하니 새 자리로',remaining:Math.max(0,h.active?h.life:h.remaining),duration:h.active?h.totalLife||1:h.duration,color:'#b6e7ee',timerLabel:h.active?'공격 유지':'다음 공격'};}
 const encore=s.hazards.filter(h=>h.kind==='encore-slash'||h.kind==='encore-finisher');if(encore.length){const h=encore.find(h=>h.late)||encore.at(-1);return{kind:'encore',title:'아직 끝이 아님 · 마지막 4타까지!',tip:'늦게 오는 마지막 예고선도 벗어나세요',remaining:Math.max(0,h.active?h.life:h.remaining),duration:h.active?h.totalLife||1:h.duration,color:'#f2c6d9',timerLabel:h.active?'마지막 공격':'마지막 발사까지'};}
 return null;
}
export function judgePatternGuide(s){const local=localPatternGuide(s);if(!local)return null;const actual=getPatternGuide(s);return{...local,remaining:actual?.remaining??local.remaining,duration:actual?.duration??local.duration,timerLabel:actual?.timerLabel||local.timerLabel};}
export function drawJudgePatternFloor(c,s,t,reduced){
 const {all,target}=lightTargets(s);c.save();
 for(const h of [...all.filter(h=>h!==target),...(target?[target]:[])]){const current=h===target&&h.active&&!h.visited,color=h.visited?'#a2bbb47a':current?'#79ffe0':h===target?'#e6c982':'#e6c98266';c.setLineDash(current||h.visited?[]:[7,7]);ellipse(c,h.x,h.y,h.radius,h.radiusY||h.radius*.6,current?'#79ffe028':null,color,current?3:1.5);c.setLineDash([]);
  if(current){const g=c.createLinearGradient(h.x,200,h.x,h.y);g.addColorStop(0,'#79ffe000');g.addColorStop(1,'#79ffe028');polygon(c,[[h.x-10,200],[h.x+10,200],[h.x+h.radius,h.y],[h.x-h.radius,h.y]],g);}
 }
 const path=s.hazards.find(h=>h.kind==='replay'&&h.path)?.path;if(path?.length){c.setLineDash([3,7]);line(c,path.map(p=>[p.x,p.y]),'#b4d5e65c',1.5);c.setLineDash([]);for(const p of path)ellipse(c,p.x,p.y,3,2,'#c1dce788');}
 c.restore();
}
export function drawJudgePatternGuides(c,s,t,reduced){
 const {all,target}=lightTargets(s);c.save();
 for(const h of [...all.filter(h=>h!==target),...(target?[target]:[])]){const current=h===target&&h.active&&!h.visited,col=h.visited?'#a6bdb7':current?'#79ffe0':h===target?'#efdaa3':'#efdaa366',yy=clamp(h.y+(h.radiusY||h.radius*.6)+17,353,627);c.setLineDash(current||h.visited?[]:[7,7]);ellipse(c,h.x,h.y,h.radius,h.radiusY||h.radius*.6,null,current?'#092b33':col,current?7:1.5);if(current)ellipse(c,h.x,h.y,h.radius,h.radiusY||h.radius*.6,null,col,3);c.setLineDash([]);if(h===target||h.index===(target?.index||0)+1||h.visited)label(c,`${numberMark(h.index)}${h.visited?' 완료':current?' 여기로!':h!==target?' 다음':''}`,h.x,yy,current?17:13,col,900);}
 if(target&&!target.visited){const p=s.player,dx=target.x-p.x,dy=target.y-p.y,len=Math.hypot(dx,dy),col=target.active?'#79ffe0':'#efdaa3';if(len>22){const ux=dx/len,uy=dy/len;c.setLineDash([7,7]);line(c,[[p.x+ux*15,p.y+uy*15],[target.x,target.y]],'#102b33',5);line(c,[[p.x+ux*15,p.y+uy*15],[target.x,target.y]],col,2);c.setLineDash([]);polygon(c,[[target.x,target.y],[target.x-ux*12-uy*6,target.y-uy*12+ux*6],[target.x-ux*12+uy*6,target.y-uy*12-ux*6]],col);}}
 const a=s.audition;if(a&&!a.selected)for(const f of a.figures||[]){if(f.hp<=0)continue;const ready=a.active!==false,color=f.real?'#ffe69d':'#bfced0',caption=f.real?(ready?'★ 진짜 · Q / W':'★ 진짜 · 준비'):'○ 대역',y=clamp(f.y-196,253,440);box(c,f.x-63,y-20,126,27,'#172635e8',4);label(c,caption,f.x,y,ready&&f.real?15:12,color,900);}
 for(const h of s.hazards){if(h.kind==='replay'){const same=s.hazards.filter(q=>q.kind==='replay'&&Math.abs(q.x-h.x)<8&&Math.abs(q.y-h.y)<8),front=same.find(q=>q.active)||same[0];if(front!==h)continue;const yy=clamp(h.y+(h.radiusY||50)+17,355,627);label(c,`${numberMark(h.index)} 기억 공격`,h.x,yy,12,h.active?'#e3f7f8':'#b7dbe1',800);}if(h.kind==='encore-finisher'&&!h.active){const xx=clamp(h.x,170,1110),yy=clamp(h.y+Math.abs(h.height||60)/2+19,358,627);box(c,xx-96,yy-17,192,24,'#2d2336eb',4);label(c,'마지막 4타 · 아직 끝이 아님',xx,yy,12,'#ffcfdd',900);}}
 c.restore();
}
export function drawAuditionBackdrop(c,id){
 const v=BOSS_VISUALS[id]||BOSS_VISUALS.ignis,g=c.createLinearGradient(0,0,0,720);g.addColorStop(0,v.deep);g.addColorStop(.5,v.wall);g.addColorStop(1,'#17242c');box(c,0,0,1280,720,g);
 // Back walls remain clearly stage architecture, never a reproduced scene.
 for(let i=0;i<11;i++){const x=64+i*115;box(c,x,130,88,225,v.deep+'8c');line(c,[[x+4,135],[x+4,348]],v.color+'22',2)}
 if(id==='ignis'){
  for(let i=0;i<8;i++){const x=180+i*134,y=160+(i%2)*35;line(c,[[x,100],[x,y]],'#14202a',5);box(c,x-22,y,44,45,'#26323c',5);ellipse(c,x,y+25,15,16,'#ba9061','#efd6a0',2);const beam=c.createLinearGradient(x,y+35,x,350);beam.addColorStop(0,'#ffd59b1c');beam.addColorStop(1,'#ffd59b02');polygon(c,[[x-10,y+30],[x+10,y+30],[x+65,350],[x-65,350]],beam);}
  for(let i=0;i<5;i++){box(c,410+i*94,285,70,59,'#293942',3);for(let j=0;j<4;j++)box(c,420+i*94+j*12,297,5,24,j%2?'#d19d64':'#79634e',1)}
 }else if(id==='mime'){
  for(let i=0;i<7;i++){const x=180+i*150;frame(c,x,243,105,155,'#9c8e96',3);mask(c,x,218,26,i%2?'#cec7b7':'#b3b3bf');line(c,[[x-22,266],[x+22,266]],'#7f817f',2);}
  for(const x of [286,920]){c.beginPath();c.moveTo(x,116);c.bezierCurveTo(x+70,203,x-80,253,x+14,349);c.strokeStyle='#66b9a461';c.lineWidth=16;c.stroke();c.strokeStyle='#c5e3c04a';c.lineWidth=2;c.stroke();}
 }else if(id==='gojo'){
  for(let i=0;i<6;i++){const size=270-i*29,x=668-i*5,y=245+i*4;frame(c,x,y,size*1.72,size*.65,i%2?'#8aaab244':'#c0ad804d',2);}
  for(const x of [264,1006]){lens(c,x,235,49,Math.PI/4,'#82a7b3');box(c,x-8,286,16,65,'#2b3c4c');}
  for(let i=0;i<5;i++)polygon(c,[[390+i*115,145],[440+i*115,153],[403+i*115,340],[353+i*115,340]],'#d9e5cc08','#adc7c31e',1);
 }else if(id==='max'){
  for(let i=0;i<7;i++){const x=166+i*160,y=218+(i%2)*38;c.save();c.translate(x,y);c.rotate((i%2?1:-1)*.075);box(c,-49,-65,98,128,'#dfd4b9',2);box(c,-40,-56,80,89,i%2?'#846e53':'#6d7773');frame(c,0,-10,70,70,'#c9b28c66',1);line(c,[[-28,43],[28,43]],'#9e8e72',2);c.restore();}
  for(const x of [90,1186]){box(c,x-18,136,36,213,'#161e22');for(let j=0;j<9;j++)box(c,x-11,143+j*23,22,12,'#ae9770',2);}
  box(c,494,292,294,54,'#352c29',3);label(c,'MEMORY ARCHIVE',640,324,19,'#cdb994',800);
 }else{
  for(const x of [210,1070]){box(c,x-35,135,70,215,'#332b3c');for(let i=0;i<5;i++)box(c,x-27+i*12,148,5,190,i%2?'#b7a39b':'#726471');}
  polygon(c,[[358,350],[410,160],[640,127],[870,160],[922,350]],'#301e30','#ae8086',3);
  for(let i=0;i<9;i++){const x=426+i*53;box(c,x,171,26,179,i%2?'#522e40':'#3a2438');line(c,[[x+8,178],[x+8,346]],'#9f697130',2)}
  box(c,539,315,202,35,'#4c3a46',3);box(c,580,298,120,20,'#796772',2);baton(c,640,218,150,-.38,'#c6c9d3');
 }
 box(c,0,0,1280,43,'#111f29');line(c,[[0,73],[1280,73]],'#5a676c',3);line(c,[[0,100],[1280,100]],'#5a676c',3);for(let i=0;i<13;i++)line(c,[[i*100,73],[i*100+50,100],[i*100+100,73]],'#40525c',2);
 const floor=c.createLinearGradient(0,349,0,720);floor.addColorStop(0,v.wall);floor.addColorStop(1,'#15242c');box(c,0,349,1280,371,floor);line(c,[[0,350],[1280,350]],'#182832',6);
 for(let i=0;i<11;i++)line(c,[[640+(i-5)*95,351],[640+(i-5)*240,720]],v.color+'13',1);for(const y of [391,445,518,615,703])line(c,[[0,y],[1280,y]],v.color+'16',1);
 for(const side of [0,1]){c.save();if(side){c.translate(1280,0);c.scale(-1,1)}const velvet=c.createLinearGradient(0,0,80,0);velvet.addColorStop(0,v.deep);velvet.addColorStop(.48,v.cloth);velvet.addColorStop(1,v.deep);c.beginPath();c.moveTo(0,105);c.lineTo(80,105);c.bezierCurveTo(95,205,42,291,48,345);c.bezierCurveTo(50,445,72,562,69,638);c.lineTo(0,651);c.closePath();c.fillStyle=velvet;c.fill();for(let i=0;i<5;i++)line(c,[[9+i*13,116],[15+i*7,335],[12+i*11,636]],i%2?'#e6cbb41b':'#0b162d44',3);line(c,[[1,316],[29,331],[52,320]],'#bbaa80',3);c.restore()}
 box(c,0,106,1280,18,v.cloth);for(let i=0;i<8;i++){c.beginPath();c.moveTo(i*160,119);c.quadraticCurveTo(i*160+80,151,(i+1)*160,119);c.strokeStyle='#baa58166';c.lineWidth=2;c.stroke()}
 for(let x=145;x<1220;x+=165){ellipse(c,x,642,18,5,'#0b1925');ellipse(c,x,640,9,2,'#d9c59f')}
 box(c,84,284,154,34,'#101f2cd9',2);label(c,v.stage,161,306,12,'#ded6bd');
}
export function drawTakeoverSet(c,s,t,reduced){
 const h=s.hazards.find(h=>h.kind==='domain');if(!h)return;const id=s.boss.id,v=BOSS_VISUALS[id]||BOSS_VISUALS.ignis,p=h.active?1:clamp(1-h.remaining/h.duration);
 c.save();c.globalAlpha=.25+p*.55;const wash=c.createLinearGradient(0,174,0,643);wash.addColorStop(0,v.deep+'de');wash.addColorStop(1,v.deep+'72');box(c,40,174,1200,470,wash);
 c.beginPath();c.rect(76,184,1128,162);c.clip();
 if(id==='ignis'){for(let i=0;i<13;i++){const x=100+i*88;box(c,x-13,195,26,28,'#353139',3);ellipse(c,x,218,10,8,'#ffdc9b');polygon(c,[[x-6,218],[x+6,218],[x+62,349],[x-62,349]],'#ffc58115')}label(c,'GOLDEN HOUR',640,286,28,'#ffdfa8',800);}
 else if(id==='mime'){mask(c,640,255,73,'#dcd7bf');for(const side of [-1,1]){c.beginPath();c.moveTo(640+side*100,195);c.bezierCurveTo(640+side*270,230,640+side*80,320,640+side*460,337);c.strokeStyle='#8fe8c393';c.lineWidth=14;c.stroke();c.strokeStyle='#c7ffe7';c.lineWidth=1.5;c.stroke()}}
 else if(id==='gojo'){for(let i=0;i<6;i++){c.save();c.translate(640,265);c.rotate((reduced?0:Math.sin(t*.3)*.025)*(i%2?-1:1));frame(c,0,0,155+i*108,62+i*30,i%2?'#e8ce9b':'#a8e7ef',i%2?1:2);c.restore()}lens(c,640,265,40,reduced?0:t*.12,'#badeda');}
 else if(id==='max'){for(let i=0;i<9;i++){const xx=130+i*127;c.save();c.translate(xx,265);c.rotate((i%2?1:-1)*.06);box(c,-47,-52,94,102,'#edd7ab30',2);frame(c,0,-8,78,68,'#eed8ad',1.5);line(c,[[-28,37],[28,37]],'#e6d7b17a',2);c.restore();}label(c,'추억 보관소 · 감기 / 되감기 / 마지막 한 장',640,330,13,'#f5debb',800);}
 else{for(let i=0;i<5;i++)line(c,[[126,230+i*17],[1154,230+i*17]],'#e4c9ce4f',1);for(let i=0;i<14;i++){const x=126+i*79;line(c,[[x,225],[x,310]],'#c4b9c446',1)}baton(c,640,253,240,reduced?-.3:-.3+Math.sin(t*.7)*.06,'#f4e4dc');if(h.domainType==='chasing-slashes'){const a=reduced?.55:.55+Math.sin(t*.9)*.06;for(const sign of [-1,1]){c.save();c.translate(640,254);c.rotate(sign*a);c.beginPath();c.moveTo(-123,5);c.bezierCurveTo(-52,-20,55,-12,139,-34);c.bezierCurveTo(101,4,14,16,-123,5);c.closePath();c.fillStyle=sign<0?'#d1bbd48a':'#c7d7e28a';c.fill();c.strokeStyle='#f0dae9';c.lineWidth=1;c.stroke();c.restore();}ellipse(c,640,254,11,11,'#55364b','#efb4c7',2);label(c,'추격 난무 · 조준 / 고정 / 후속',640,321,12,'#efc1d0',800);}else if(h.domainType==='blade-waves'){const phase=(h.domainPhase||0)+1;for(let j=0;j<5;j++){const xx=570+j*35;ellipse(c,xx,321,7,7,j<phase?'#e8c4c6':'#482a3e','#d7a2b060',1);}label(c,`${phase} / 5  칼날 파도`,640,194,12,'#ead1d4',800);}for(const x of [280,1000]){polygon(c,[[x-52,194],[x+52,194],[x+43,340],[x-43,340]],'#722b43aa','#b87c8a',1);}}
 c.restore();
}
export function drawJudgeTechnique(c,h,s,t,reduced){
 if(h.kind==='domain'||h.kind==='rehearsal-light')return;const p=h.active?1:clamp(1-h.remaining/(h.duration||1)),x=h.x,y=h.y-66,id=s.boss.id,v=BOSS_VISUALS[id]||BOSS_VISUALS.ignis;
 c.save();c.globalAlpha=(h.active?1:.3+p*.55)*(h.decoy?.42:1);
 if(h.kind==='footlight'||h.kind==='spark-spot'){
  ellipse(c,x,h.y,h.radius*.56,(h.radiusY||44)*.6,'#2c2d35','#caa575',2);ellipse(c,x,h.y-3,h.radius*.35,12,'#f5ce87');
  if(h.active){const beam=c.createLinearGradient(x,y-105,x,h.y);beam.addColorStop(0,'#ffc98000');beam.addColorStop(.5,'#ffd69b80');beam.addColorStop(1,'#ffe8b8c9');polygon(c,[[x-h.radius*.66,h.y],[x-13,y-110],[x+13,y-110],[x+h.radius*.66,h.y]],beam);for(let i=0;i<8;i++){const a=i*2.399,rr=18+(reduced?20:(t*.9+i*.17)%1*65);line(c,[[x+Math.cos(a)*rr,h.y-20-Math.sin(a)*rr],[x+Math.cos(a)*(rr+7),h.y-24-Math.sin(a)*(rr+7)]],'#f9db9f',2)}}
 }else if(h.kind==='light-sweep'){
  if(h.active){c.translate(x,y);c.rotate(h.angle||0);const g=c.createLinearGradient(0,-h.height/2,0,h.height/2);g.addColorStop(0,'#e7a04d00');g.addColorStop(.5,'#ffeac8c7');g.addColorStop(1,'#e7a04d00');box(c,-h.width/2,-h.height/2,h.width,h.height,g);for(let i=0;i<9;i++)frame(c,-h.width/2+i*h.width/8,0,24,h.height*.6,'#d7ae7180',1)}
 }else if(h.kind==='mask-feint'||h.kind==='mask-slam'){
  mask(c,x,y-(h.active?0:(1-p)*20),h.active?53:35,h.decoy?'#aebbc0':'#e1dac6',h.decoy);
  if(h.active&&!h.decoy){for(let i=0;i<8;i++){const a=i*TAU/8;polygon(c,[[x+Math.cos(a)*36,h.y+Math.sin(a)*22],[x+Math.cos(a)*h.radius,h.y+Math.sin(a)*(h.radiusY||65)],[x+Math.cos(a+.1)*55,h.y+Math.sin(a+.1)*33]],'#9ee5c58a')}}
 }else if(h.kind==='ribbon-thrust'||h.kind==='ribbon-cross'){
  if(h.active){c.translate(x,y);c.rotate(h.angle||0);c.beginPath();c.moveTo(-h.width/2,-7);c.bezierCurveTo(-h.width*.18,-30,h.width*.2,24,h.width/2,0);c.bezierCurveTo(h.width*.18,7,-h.width*.18,-8,-h.width/2,7);c.closePath();c.fillStyle='#8cdbc2';c.fill();line(c,[[-h.width/2,-2],[h.width/2,0]],'#e5f2d9',1.2);polygon(c,[[h.width/2+11,0],[h.width/2-11,-10],[h.width/2-6,0],[h.width/2-11,10]],'#dbd9c6')}
 }else if(h.kind==='blue'||h.kind==='red'){
  const pull=h.kind==='blue',r=h.active?46:15+p*28;lens(c,x,y,r,reduced?0:t*(pull?-.3:.25),pull?'#a4dce1':'#e7c385');
  if(h.active)for(let i=0;i<8;i++){const a=i*TAU/8,rr=50+(reduced?25:((i*.19+(pull?-t:t)*.6+100)%1)*65),tx=x+Math.cos(a)*rr,ty=y+Math.sin(a)*rr*.53;line(c,[[tx,ty],[tx+Math.cos(a)*(pull?-13:13),ty+Math.sin(a)*(pull?-8:8)]],pull?'#b2e4e2aa':'#ead2a3aa',2)}
 }else if(h.kind==='replay'){
  frame(c,x,h.y-30,h.radius*1.3,(h.radiusY||55)*1.3,h.active?'#dcf0ed':'#83b9cb',h.active?2.5:1);lens(c,x,y,h.active?29:19,reduced?0:t*.2,'#bce3e5');if(h.active){ellipse(c,x,h.y,h.radius*.8,(h.radiusY||55)*.8,null,'#d2eee2a0',3);for(let i=0;i<6;i++){const a=i*TAU/6;line(c,[[x+Math.cos(a)*23,y+Math.sin(a)*15],[x+Math.cos(a)*52,y+Math.sin(a)*35]],'#dcebd1a0',1.5);}}
 }else if(h.kind==='purple'){
  if(!h.active){lens(c,s.boss.x,s.boss.y-109,26+p*22,reduced?0:t*.25,'#c7e4da');frame(c,s.boss.x,s.boss.y-109,85+p*18,64+p*14,h.locked?'#f3d6a3':'#87c7d7',2);}
  else{c.translate(x,y);c.rotate(h.angle||0);const height=h.height||106,g=c.createLinearGradient(0,-height/2,0,height/2);g.addColorStop(0,'#8ed5dc00');g.addColorStop(.27,'#9bd9dd77');g.addColorStop(.48,'#e9e7cbd9');g.addColorStop(.52,'#fff2cc');g.addColorStop(.73,'#91ccdf77');g.addColorStop(1,'#8ed5dc00');box(c,-h.width/2,-height/2,h.width,height,g);for(let i=0;i<9;i++)frame(c,-h.width/2+i*h.width/8,0,39,height*.6,'#d1dfbd99',1.4)}
 }else if(h.kind==='slash'||h.kind==='cleave'||h.kind==='encore-slash'||h.kind==='encore-finisher'){
  if(h.active){c.translate(x,y);const n=h.kind==='cleave'?3:1;for(let i=0;i<n;i++){c.save();c.rotate((h.angle||0)+(n>1?(i-1)*.73:0));const len=n>1?145:Math.min(980,h.width*(h.late?.92:.7));polygon(c,[[-len/2,-8],[len/2,0],[-len/2,8],[-len*.18,0]],h.late?'#c799ca99':'#a65a7388');line(c,[[-len/2,0],[len/2,0]],'#e7dce4',h.late?4:2.5);for(let j=0;j<5;j++)line(c,[[-len*.35+j*len*.17,-9],[-len*.35+j*len*.17,9]],'#f1c5c555',1);c.restore()}}
 }else if(h.kind==='fire-arrow'){
  if(!h.active)baton(c,s.boss.x,s.boss.y-105,60+p*45,-.4,'#e8d6d7');else{c.translate(x,y);c.rotate(h.angle||0);const g=c.createLinearGradient(0,-29,0,29);g.addColorStop(0,'#b94b7000');g.addColorStop(.5,'#d89cad66');g.addColorStop(1,'#b94b7000');box(c,-h.width/2,-29,h.width,58,g);baton(c,0,0,h.width*.9,0,'#e4d9df');for(let i=0;i<7;i++)line(c,[[-h.width*.4+i*h.width*.13,-17],[-h.width*.35+i*h.width*.13,17]],'#c8a2b14d',1.5)}
 }else if(h.kind==='fire-burst'&&h.active){for(let i=0;i<12;i++){const a=i*2.399,rr=h.radius*.65,px=x+Math.cos(a)*rr,py=h.y+Math.sin(a)*(h.radiusY||65)*.65;polygon(c,[[px-5,py],[px,py-36-i%3*15],[px+5,py],[px,py+6]],i%2?'#dfd3dca0':'#b86f8a99')}}
 c.restore();
}
