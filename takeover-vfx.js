/** Shared combat geometry drives the floor, tactical map and high-priority guidance. */
import * as Combat from './engine.js';
import { drawBladeWavesFloor, drawBladeWavesGuides, bladeWaveInstruction } from './blade-waves-vfx.js';
import { drawPursuitFloor, drawPursuitGuides, pursuitInstruction } from './pursuit-vfx.js';
const TAU=Math.PI*2,MINT='#79ffe0',clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),masks=new WeakMap();
export function takeoverView(h){
 if(Combat.getTakeoverView)return Combat.getTakeoverView(h);
 return{safeRegions:h.safeRegions||[{type:'ellipse',x:h.safeX,y:h.safeY,radius:h.safeRadius,radiusY:h.safeRadiusY}],dangerRegions:h.dangerLanes?.map(r=>({...r,type:'lane'}))||[],nextSafeRegions:[],phaseName:'안전 조명',phaseRemaining:h.active?h.life:h.remaining,phaseDuration:h.active?(h.totalLife||h.life):h.duration,phaseIndex:h.domainPhase||0,phaseCount:1,pulseActive:h.active,guide:{x:h.safeX,y:h.safeY},instruction:'밝은 안전지대로 이동하세요'};
}
export function takeoverGuide(s,h){
 if(Combat.getDomainGuide)return Combat.getDomainGuide(s,h);
 const view=takeoverView(h),insideSafe=!Combat.isInsideHazard(s.player.x,s.player.y,h);return{...view,type:h.domainType||'moving-light',warning:!h.active,remaining:view.phaseRemaining,insideSafe,dangerousNow:h.active&&!insideSafe,target:view.guide,title:'무대 장악',instruction:view.instruction};
}
export function mimePresentation(s,h){
 const v=takeoverView(h),g=takeoverGuide(s,h),panels=v.panels||h.panels||[],target=g.target||v.guide,goal=g.targetRegion||panels.find(p=>Math.abs(p.x-target.x)<2&&Math.abs(p.y-target.y)<2)||v.safeRegions?.find(r=>r.type==='ellipse'),index=goal?.index??panels.findIndex(p=>goal&&Math.abs(p.x-goal.x)<2&&Math.abs(p.y-goal.y)<2),changing=!!h.active&&!!h.phaseWarning;
 const reached=typeof g.targetReached==='boolean'?g.targetReached:!!goal&&Math.pow((s.player.x-goal.x)/goal.radius,2)+Math.pow((s.player.y-goal.y)/(goal.radiusY||goal.radius*.6),2)<=1;
 const previous=changing?panels[h.safeIndex]:null,preview=changing?null:Object.hasOwn(g,'nextPanel')?g.nextPanel:h.nextSafeIndex==null?null:panels[h.nextSafeIndex];
 return{goal,index,reached,changing,previous,preview,panels,symbol:`${['①','②','③'][Math.max(0,index)]} ${['○','◇','△'][Math.max(0,index)]}`};
}
function polygonPoints(r){
 const a=r.angle||0,co=Math.cos(a),si=Math.sin(a);
 if(r.type==='ellipse')return Array.from({length:40},(_,i)=>({x:r.x+Math.cos(i*TAU/40)*r.radius,y:r.y+Math.sin(i*TAU/40)*(r.radiusY??r.radius*.55)}));
 return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:r.x+x*r.width*.5*co-y*r.height*.5*si,y:r.y+x*r.width*.5*si+y*r.height*.5*co}));
}
function shape(c,r,fill,stroke=null,width=1,project=null){
 const points=polygonPoints(r);c.beginPath();points.forEach((p,i)=>{p=project?project(p.x,p.y):p;i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)});c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}
}
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke()}
function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function label(c,value,x,y,size,color,weight=800){c.font=`${weight} ${size}px "Noto Sans KR",sans-serif`;c.fillStyle=color;c.textAlign='center';c.fillText(value,x,y)}
function dot(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill()}
function arrow(c,x,y,tx,ty,color,size=13,dashed=false){const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy);if(len<12)return;const ux=dx/len,uy=dy/len;line(c,[[x,y],[tx,ty]],'#102631',6);c.setLineDash(dashed?[10,7]:[]);line(c,[[x,y],[tx,ty]],color,2.5);c.setLineDash([]);c.beginPath();c.moveTo(tx,ty);c.lineTo(tx-ux*size-uy*size*.55,ty-uy*size+ux*size*.55);c.lineTo(tx-ux*size+uy*size*.55,ty-uy*size-ux*size*.55);c.closePath();c.fillStyle=color;c.fill()}
function clippedFloor(c){c.beginPath();c.rect(45,328,1190,314);c.clip()}
function stripedOutside(c,h,safeRegions,active){
 let surface=masks.get(h);if(!surface){surface=document.createElement('canvas');surface.width=1280;surface.height=720;masks.set(h,surface)}const m=surface.getContext('2d');m.clearRect(0,0,1280,720);m.save();clippedFloor(m);box(m,45,328,1190,314,active?'#a04c632e':'#b5956220');
 m.beginPath();for(let x=-270;x<1280;x+=42){m.moveTo(x,642);m.lineTo(x+314,328)}m.strokeStyle=active?'#e6a6b44d':'#d3c29c2c';m.lineWidth=1.5;m.stroke();m.globalCompositeOperation='destination-out';for(const r of safeRegions)shape(m,r,'#fff');m.restore();c.drawImage(surface,0,0);
}
export function drawTakeoverFloor(c,s,h,t,reduced=false){
 const v=takeoverView(h),g=takeoverGuide(s,h),type=h.domainType||g.type||'moving-light',safe=v.safeRegions||[],danger=v.dangerRegions||[],pulse=!!v.pulseActive;
 if(type==='chasing-slashes'){drawPursuitFloor(c,s,h,v,g,t,reduced);return;}
 if(type==='blade-waves'){drawBladeWavesFloor(c,s,h,v,g,t,reduced);return;}
 c.save();clippedFloor(c);
 if(type==='moving-light'||type==='mask-panels')stripedOutside(c,h,safe,pulse);else{
  for(const r of danger){shape(c,r,pulse?'#c3597740':'#ddbf8933',pulse?'#ffc0baaa':'#e8cd9aaa',pulse?3:2);c.save();c.beginPath();const pts=polygonPoints(r);pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();for(let x=-300;x<1350;x+=42)line(c,[[x,650],[x+350,300]],pulse?'#ffb6b660':'#e8d3ad45',1);c.restore();}
 }
 if(type==='mask-panels'){
  const m=mimePresentation(s,h);for(const r of m.panels)shape(c,r,'#899b9b0a','#b4c0bf44',1);for(const r of safe)shape(c,r,'#94b9b710','#b4d1c52a',1);
  if(m.goal)shape(c,m.goal,'#79ffe039',MINT+'b0',2.5);if(m.preview&&m.preview!==m.goal){c.setLineDash([7,7]);shape(c,m.preview,'#e9cb8910','#f3d58ca0',2);c.setLineDash([]);}
 }else{for(const r of safe)shape(c,r,'#79ffe020',MINT+'55',1);for(const r of v.nextSafeRegions||[]){c.setLineDash([7,7]);shape(c,r,'#f6d68c10','#f6d68ca8',2);c.setLineDash([]);}}
 if(type==='moving-light'&&safe[0]){const r=safe[0],glow=c.createLinearGradient(r.x,200,r.x,r.y);glow.addColorStop(0,'#79ffe000');glow.addColorStop(1,'#79ffe02b');c.beginPath();c.moveTo(r.x-20,200);c.lineTo(r.x+20,200);c.lineTo(r.x+r.radius,r.y);c.lineTo(r.x-r.radius,r.y);c.closePath();c.fillStyle=glow;c.fill();}
 if(type==='rhythm-slashes'&&pulse){for(const [i,r]of danger.entries()){c.save();c.translate(r.x,r.y-58);c.rotate(r.angle||0);line(c,[[-r.width/2,-2],[r.width/2,2]],i%2?'#e1d5e1':'#f5d9cc',3);line(c,[[-r.width/2,-10],[r.width/2,5]],'#a8587580',7);c.restore();}}
 c.restore();
}
export function drawTakeoverGuides(c,s,h,t,reduced=false){
 const v=takeoverView(h),g=takeoverGuide(s,h),type=h.domainType||g.type||'moving-light',safe=v.safeRegions||[],target=g.target||v.guide||{x:h.safeX,y:h.safeY};
 if(type==='chasing-slashes'){drawPursuitGuides(c,s,h,v,g,t,reduced);return;}
 if(type==='blade-waves'){drawBladeWavesGuides(c,s,h,v,g,t,reduced);return;}
 const mime=type==='mask-panels'?mimePresentation(s,h):null;
 c.save();c.save();clippedFloor(c);
 for(const r of safe){if(mime&&r!==mime.goal&&!(r.type==='ellipse'&&r.x===mime.goal?.x)){shape(c,r,null,'#9eb9b470',1.5);continue;}shape(c,r,null,'#09232c',8);shape(c,r,null,MINT,3.5);}
 for(const r of v.dangerRegions||[]){c.setLineDash(v.pulseActive?[]:[9,6]);shape(c,r,null,'#10232d',6);shape(c,r,null,v.pulseActive?'#ffd0c4':'#f0d5a4',2.5);c.setLineDash([]);}
 for(const r of mime?(mime.preview?[mime.preview]:[]):v.nextSafeRegions||[]){c.setLineDash([6,7]);shape(c,r,null,'#f8d993',3);c.setLineDash([]);}
 c.restore();
 if(mime){for(const [i,panel]of mime.panels.entries()){const goal=i===mime.index,prev=panel===mime.previous,next=panel===mime.preview,yy=clamp(panel.y-(panel.radiusY||65)-28,340,565),color=goal?MINT:next?'#f8d993':'#9baaaa',suffix=goal?(mime.reached?' 도착!':' · 여기로!'):prev?' 이전 발판':next?' 다음':'';const w=goal?194:next||prev?156:90;box(c,panel.x-w/2,yy-23,w,31,goal?'#082c32f5':'#112730df',5);label(c,`${['①','②','③'][i]} ${['○','◇','△'][i]}${suffix}`,panel.x,yy,goal?21:15,color);}
  if(mime.goal){c.beginPath();c.ellipse(mime.goal.x,mime.goal.y,21,12,0,0,TAU);c.strokeStyle=MINT;c.lineWidth=2;c.stroke();}
 }
 const wantsMove=mime?!mime.reached:!g.insideSafe||type==='moving-light'&&Math.hypot(s.player.x-target.x,s.player.y-target.y)>25;
 if(wantsMove&&Number.isFinite(target?.x)&&Number.isFinite(target?.y)){const dx=target.x-s.player.x,dy=target.y-s.player.y,len=Math.hypot(dx,dy)||1;arrow(c,s.player.x+dx/len*14,s.player.y+dy/len*14,target.x,target.y,MINT,14,true);dot(c,s.player.x,s.player.y,5,'#effff4');}
 if(type==='moving-light'&&h.variantId==='return-light'&&h.active&&target&&h.travelDirection){const dir=Math.sign(h.travelDirection);arrow(c,target.x-dir*16,target.y,target.x+dir*29,target.y,MINT,8,false);}
 if(type==='rhythm-slashes'&&target){line(c,[[target.x-13,target.y],[target.x+13,target.y]],MINT,2);line(c,[[target.x,target.y-9],[target.x,target.y+9]],MINT,2);}
 if(!mime&&target&&Number.isFinite(target.x)){const near=safe.find(r=>Math.abs(r.x-target.x)<8&&Math.abs(r.y-target.y)<8),bottom=target.y+(near?(near.type==='ellipse'?(near.radiusY||50):(near.height||80)/2):20),yy=clamp(bottom+22,390,624),caption=type==='moving-light'?'여기 · 조명 따라가기':g.insideSafe?'여기서 대기':'여기로 이동';
  const xx=clamp(target.x,151,1129);box(c,xx-107,yy-19,214,29,'#092b30f2',4);label(c,caption,xx,yy+1,17,MINT);
  if(type==='lens-corridors')for(const next of v.nextSafeRegions||[]){const nx=clamp(next.x,120,1160),ny=next.width>1000?clamp(next.y-14,352,610):351;box(c,nx-41,ny-18,82,24,'#2b2932ed',4);label(c,'다음',nx,ny,13,'#f8d993');}}
 c.restore();
}
export function takeoverInstruction(s,h){
 const g=takeoverGuide(s,h),v=takeoverView(h),type=h.domainType||g.type||'moving-light',phase=(v.phaseIndex??h.domainPhase??0)+1,count=v.phaseCount||1;
 let title,tip,blade,timerLabel,remaining=g.remaining??v.phaseRemaining??0,duration=Math.max(.01,v.phaseDuration||h.duration||1),progress=g.progress;
 if(type==='memory-archive'){
  const final=h.archivePhase==='final',rewind=h.archivePhase==='rewind',moving=!h.active||h.phaseWarning;
  title=final?(g.tracking?'카메라 추적 중 · 계속 이동':g.targetReached?'촬영선 밖에서 대기':'조준 고정! 옆으로!'):moving?(rewind?'되감기! 이전 민트 칸으로':'민트 필름 칸으로 이동'):g.targetReached?'민트 칸 안에서 대기':'위험! 민트 칸 안으로!';
  tip=final?'촬영 부채꼴에 닿으면 체력 −40% · 고정된 선 밖으로':moving?'화살표 끝 ‘여기’로 · 셔터가 닫힌 칸은 체력 −40%':'금색 ‘다음’은 예고 · 이동 신호가 뜨면 움직이세요';
  timerLabel=final?(g.tracking?'조준 고정까지':h.phaseWarning?'촬영까지':'촬영 종료'):moving?'이동 마감':phase<count?'다음 이동':'장악 종료';
  if(final&&g.tracking){remaining=Math.max(0,remaining-(h.lockWindow??1.1));duration=Math.max(.01,duration-(h.lockWindow??1.1));progress=clamp(1-remaining/duration);}
 }
 else if(type==='chasing-slashes'){blade=pursuitInstruction(h,v,g);title=blade.title;tip=blade.tip;}
 else if(type==='blade-waves'){blade=bladeWaveInstruction(h,v,g);title=blade.title;tip=blade.tip;}
 else
 if(type==='moving-light'){const back=h.variantId==='return-light',reversing=back&&h.active&&h.elapsed>=2.4&&h.elapsed<3.1;title=!g.insideSafe?'민트 조명 안으로 이동':reversing?'방향 반전! 조명을 따라가세요':'조명 안에서 계속 따라가기';tip=!h.active?'조명 밖은 체력 −40% · 화살표 끝 ‘여기’로':back&&h.elapsed<2.4?'곧 반대로 이동 · 금색 점선은 다음 위치':'조명 밖은 체력 −40% · 멈추지 말고 빛을 따라가세요';timerLabel=!h.active?'이동 마감':'장악 종료';}
 else if(type==='mask-panels'){const m=mimePresentation(s,h);title=m.reached?`${m.symbol} 여기서 대기`:`${m.symbol} 민트 발판으로 이동!`;tip=m.changing?'민트 연결 통로를 따라 이동 · 통로 밖은 체력 −40%':m.preview?'금색 ‘다음’은 예고 · 이동 신호가 뜰 때 움직이세요':'민트 발판 밖은 체력 −40% · 장악이 끝날 때까지 대기';timerLabel=!h.active||m.changing?'이동 마감':m.preview?'다음 이동':'장악 종료';}
 else if(type==='lens-corridors'){const horizontal=(v.safeRegions||[])[0]?.width>1000,orientation=horizontal?'가로':'세로';title=g.warning?`지금 이동! 민트 ${orientation} 통로로`:g.insideSafe?`${orientation} 통로 안에서 대기`:`위험! 민트 ${orientation} 통로 안으로`;tip=g.warning?'빔이 꺼진 지금 이동 · 시간 안에 ‘여기’로':'빔에 닿으면 체력 −40% · 금색 ‘다음’은 아직 위험';timerLabel=g.warning?'이동 마감':phase<count?'다음 이동':'장악 종료';}
 else{title=g.warning?`${phase}/${count} 새 예고선! 옆으로 이동하세요`:g.dangerousNow?'위험! 공격선 밖으로!':`${phase}/${count} 회피 성공 · 다음 선을 기다리세요`;tip=g.warning?'선이 나타나면 선을 가로질러 옆으로 · 방향키 / Space':'매 박자 새 위치를 겨눕니다 · 다음 예고선이 뜨면 다시 이동';}
 if(Number.isFinite(blade?.remaining)){remaining=blade.remaining;duration=Math.max(.01,blade.duration||duration);progress=clamp(1-remaining/duration);}
 return{...v,...g,type,title,tip,phase,count,statusColor:blade?.statusColor,targetReached:type==='mask-panels'?mimePresentation(s,h).reached:g.targetReached,timerLabel:timerLabel||blade?.timerLabel||g.timerLabel||'발사까지',progress,remaining:Math.max(0,remaining),duration,warning:!!g.warning};
}
export function drawTakeoverMap(c,s,h,x=983,y=534,w=265,height=140){
 if(!h)return;if(h.domainType==='chasing-slashes'){drawPursuitLesson(c,x,y,w,height);return;}const v=takeoverView(h),g=takeoverGuide(s,h),mx=x+16,my=y+39,mw=w-32,mh=60,project=(px,py)=>({x:mx+(px-76)/1128*mw,y:my+(py-340)/284*mh});
 c.save();box(c,x,y,w,height,'#071e27f2',7);label(c,'컷신 뒤 피할 곳',x+w/2,y+24,12,'#d2e9dd');box(c,mx,my,mw,mh,'#4e35454d');c.save();c.beginPath();c.rect(mx,my,mw,mh);c.clip();
 for(const r of v.dangerRegions||[])shape(c,r,'#dd8d9266','#e7b7ab',1,project);
 const mime=h.domainType==='mask-panels'?mimePresentation(s,h):null,blade=h.domainType==='blade-waves';
 for(const r of v.safeRegions||[])shape(c,r,mime?'#a4b6b41a':'#79ffe03b',mime?'#9ab1ab55':MINT,1.5,project);if(mime?.goal)shape(c,mime.goal,'#79ffe055',MINT,2,project);if(blade&&g.targetRegion)shape(c,g.targetRegion,'#79ffe033',MINT,2,project);
 for(const r of mime?(mime.preview?[mime.preview]:[]):blade?[]:v.nextSafeRegions||[]){c.setLineDash([3,3]);shape(c,r,null,'#f0d397',1.5,project);c.setLineDash([]);}
 const p=project(s.player.x,s.player.y),target=g.target||v.guide;if(target){const end=project(target.x,target.y);if(mime?!mime.reached:blade?!g.targetReached:!g.insideSafe)arrow(c,p.x,p.y,end.x,end.y,MINT,5,false)}dot(c,p.x,p.y,4,'#f5ffed');c.restore();label(c,'흰 점 = 나 · 민트 표시 = 피할 곳',x+w/2,y+125,10,'#bde5d7',700);c.restore();
}

// This labelled teaching diagram is intentionally not a destination map: tracking has no safe goal yet.
function drawPursuitLesson(c,x,y,w,height){
 c.save();box(c,x,y,w,height,'#071e27f2',7);label(c,'추격 난무 · 회피 순서',x+w/2,y+23,12,'#d2e9dd');
 const colors=['#ff8a9e','#fff1dc','#79ffe0'],names=['① 추적','② 고정','③ 옆으로'];
 for(let i=0;i<3;i++){const cx=x+44+i*(w-88)/2,cy=y+66;box(c,cx-31,cy-24,62,47,'#24303c',4);c.save();c.beginPath();c.rect(cx-30,cy-23,60,45);c.clip();
 c.setLineDash(i===0?[3,3]:[]);line(c,[[cx-29,cy-12],[cx+29,cy+12]],colors[Math.min(i,1)],i===0?1.5:2);c.setLineDash([]);dot(c,cx,cy,3.5,'#fbfff2');
 if(i===0){c.beginPath();c.arc(cx,cy,10,0,TAU);c.strokeStyle=colors[0];c.lineWidth=1;c.stroke();}
 if(i===2)arrow(c,cx,cy,cx+7,cy-19,MINT,5,false);c.restore();label(c,names[i],cx,y+110,11,colors[i]);}
 label(c,'계속 이동 → 흰 선이 멈추면 방향 전환',x+w/2,y+129,9,'#d8e4dc',700);c.restore();
}
