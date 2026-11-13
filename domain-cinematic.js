// Original-photo takeover teaching: every judge keeps their existing movement rule.
import { drawTakeoverMap, mimePresentation } from './takeover-vfx.js';
import { BOSS_VISUALS, getBossPhoto, bossPhotoAssetStatus, drawBossPhotoPanel } from './boss-visuals.js';
import { drawMaxTakeoverMap } from './max-vfx.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
export function getTakeoverArtwork(id){return getBossPhoto(id);}
export function domainAssetStatus(){return bossPhotoAssetStatus();}
export function drawDomainCutscene(c,s,t,reduceMotion=false){
  const shot=s?.cinematic;
  if(!shot||shot.kind!=='domain'||shot.remaining<=0)return false;
  const id=s.boss.id,visual=BOSS_VISUALS[id]||BOSS_VISUALS.ignis,zone=s.hazards.find(h=>h.kind==='domain'&&h.type==='safezone'),chasing=zone?.domainType==='chasing-slashes';
  const p=clamp(1-shot.remaining/shot.duration),color=visual.color;
  const w=1280,h=720;
  c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';
  c.fillStyle=visual.deep;c.fillRect(0,0,w,h);
  const g=c.createRadialGradient(640,320,30,640,320,660);
  g.addColorStop(0,visual.wall);g.addColorStop(1,'#04060f');
  c.fillStyle=g;c.fillRect(0,0,w,h);
  drawBossPhotoPanel(c,id,{x:350,y:112,w:580,h:380,progress:p,reduced:reduceMotion});
  if(id==='max'){for(const side of [-1,1]){const x=640+side*450;c.fillStyle='#121c23';c.fillRect(x-29,145,58,312);for(let i=0;i<12;i++){c.fillStyle='#d3b48188';c.fillRect(x-20,153+i*25,40,12);}c.strokeStyle='#e5c68f80';c.lineWidth=1;c.strokeRect(x-49,185,98,218);} }
  if(!reduceMotion){
    c.save();c.globalCompositeOperation='screen';
    // Peripheral motion keeps eyes and fingers free of glare.
    for(let i=0;i<22;i++){
      const phase=(p*1.7+i*.137)%1,a=i*2.399,rad=410+phase*300;
      const x=640+Math.cos(a)*rad,y=330+Math.sin(a)*rad*.66;
      c.strokeStyle=color;c.globalAlpha=(1-phase)*.32;c.lineWidth=i%3===0?2:1;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*(25+phase*60),y+Math.sin(a)*30);c.stroke();
    }
    c.restore();
    if(p<.16){c.fillStyle=`rgba(225,231,211,${(1-p/.16)*.12})`;c.fillRect(0,0,w,h);}
  }
  const shade=c.createLinearGradient(0,470,0,720);shade.addColorStop(0,'#03071000');shade.addColorStop(.5,'#030710ae');shade.addColorStop(1,'#030710f5');
  c.fillStyle=shade;c.fillRect(0,470,w,250);
  c.fillStyle='#030710';c.fillRect(0,0,w,29);c.fillRect(0,691,w,29);
  c.fillStyle=color;c.fillRect(46,49,4,38);
  c.textAlign='left';c.textBaseline='alphabetic';c.font='700 14px "Noto Sans KR",sans-serif';
  c.fillText(`${visual.audition} · ${visual.role} ${visual.name}`,64,66);
  c.fillStyle='#ffffffbb';c.font='500 10px sans-serif';c.fillText('무대 장악',64,84);
  c.textAlign='center';
  const rise=reduceMotion?0:14*(1-ease(p*2));
  const rules={ignis:['움직이는 조명','민트 조명 안에서 계속 따라가세요!','조명 밖은 체력 −40% · 화살표 끝 ‘여기’로'],mime:['발판 교대','민트 발판으로! 신호가 바뀌면 이동!','민트 = 지금 · 금색 = 다음 · 연결 통로를 따라가기'],gojo:['가로 ↔ 세로 전환','빔이 꺼지면 새 민트 통로로!','민트 = 지금 · 금색은 다음 통로라 아직 위험'],max:['필름 칸 이동 → 되감기 → 마지막 촬영','민트 칸으로! 되감기엔 반대로 이동!','닫힌 셔터는 체력 −40% · 마지막 촬영은 옆으로!'],sukuna:['날아오는 칼날 벽','민트 빈틈에 맞추고 통과할 때까지 대기!','칼날에 닿으면 체력 −40% · Space로 뚫을 수 없어요']};
  const takeoverTitle=zone?.name?.replace(/^무대 장악\s*[·:]\s*/, '')||visual.takeover;
  let rule=chasing?['가로 7연사 → 세로 7연사 → 3방향','계속 이동! 반전 신호에 방향을 바꾸세요!','가로 칼날은 위아래 · 세로 칼날은 좌우 · 접촉 시 체력 −40%']:rules[id]||rules.ignis;if(id==='mime'&&zone){const m=mimePresentation(s,zone);rule=['발판 교대',`${m.symbol} 민트 발판으로 이동!`,'금색 ‘다음’은 예고 · 이동 신호에 연결 통로 따라가기'];}
  if(zone?.variantId==='return-light')rule=['중간에 방향이 바뀌는 조명','민트 조명을 따라가다 반대로 이동!','조명 밖은 체력 −40% · 금색 점선은 곧 이동할 위치'];
  if(zone?.variantId==='double-swap')rule=[`두 번의 배역 교대 · ${mimePresentation(s,zone).symbol}부터`,rule[1],'두 번 이동합니다 · 통로가 열리면 새 민트 발판으로'];
  if(zone?.variantId==='reverse-frames')rule=['위치가 반전되는 통로','빔이 꺼지면 새 민트 통로로!','민트 = 지금 · 금색은 다음 통로라 아직 위험'];
  c.fillStyle=color;c.font='700 12px "Noto Sans KR",sans-serif';c.fillText('무 대 장 악',640,529+rise);
  c.fillStyle='#ffffff';c.font='900 53px "Noto Sans KR","Apple SD Gothic Neo",sans-serif';
  c.fillText(takeoverTitle,640,586+rise);
  c.fillStyle='#f3f5e9';c.font='700 17px "Noto Sans KR",sans-serif';
  c.fillText(rule[0],565,616);
  c.fillStyle='#79ffe0';c.font='900 23px "Noto Sans KR",sans-serif';
  c.fillText(rule[1],565,649);
  c.fillStyle='#d7e7df';c.font='600 13px "Noto Sans KR",sans-serif';c.fillText(rule[2],565,674);
  if(chasing){c.save();const locked=p>.62,ink=locked?'#f4eddc':'#f27b91';c.strokeStyle=ink;c.lineWidth=2;for(const side of [-1,1]){const cx=640+side*514,cy=290;c.beginPath();c.arc(cx,cy,34,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(cx-46,cy);c.lineTo(cx+46,cy);c.moveTo(cx,cy-46);c.lineTo(cx,cy+46);c.stroke();}c.textAlign='center';c.fillStyle=ink;c.font='800 12px "Noto Sans KR",sans-serif';c.fillText(locked?'조준 고정 → 옆으로':'추적 중 → 계속 이동',640,100);c.restore();}
  if(id==='max')drawMaxTakeoverMap(c,s,zone);else if(chasing&&zone?.section==='burst')drawBurstLesson(c,zone);else drawTakeoverMap(c,s,zone);
  c.restore();return true;
}

function drawBurstLesson(c,h){
 const x=983,y=534,w=265;c.save();c.fillStyle='#071e27f2';c.beginPath();c.roundRect(x,y,w,140,7);c.fill();c.textAlign='center';c.font='800 12px "Noto Sans KR",sans-serif';c.fillStyle='#d2e9dd';c.fillText('7연사 이동법',x+w/2,y+23);
 const arrow=(xx,yy,dx,dy,color)=>{c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+dx,yy+dy);c.strokeStyle=color;c.lineWidth=2;c.stroke();const a=Math.atan2(dy,dx);c.beginPath();c.moveTo(xx+dx,yy+dy);c.lineTo(xx+dx-Math.cos(a-.5)*7,yy+dy-Math.sin(a-.5)*7);c.lineTo(xx+dx-Math.cos(a+.5)*7,yy+dy-Math.sin(a+.5)*7);c.closePath();c.fillStyle=color;c.fill();};
 for(let i=0;i<3;i++){const xx=x+44+i*(w-88)/2,yy=y+67;c.fillStyle='#24303c';c.fillRect(xx-31,yy-25,62,50);c.beginPath();c.arc(xx,yy,3.5,0,Math.PI*2);c.fillStyle='#f5fff0';c.fill();
  if(i===0){c.strokeStyle='#ddb5c6';c.lineWidth=1;c.beginPath();c.moveTo(xx-29,yy+5);c.lineTo(xx+29,yy+5);c.stroke();arrow(xx-9,yy+15,0,-31,'#79ffe0');arrow(xx+12,yy-15,0,31,'#ffe3a4');}
  else if(i===1){c.strokeStyle='#ddb5c6';c.lineWidth=1;c.beginPath();c.moveTo(xx+5,yy-22);c.lineTo(xx+5,yy+22);c.stroke();arrow(xx-22,yy+12,42,0,'#79ffe0');}
  else{c.strokeStyle='#ddb5c6';c.lineWidth=1;for(const a of [-.7,0,.7]){c.beginPath();c.moveTo(xx-Math.cos(a)*26,yy-Math.sin(a)*22);c.lineTo(xx+Math.cos(a)*26,yy+Math.sin(a)*22);c.stroke();}arrow(xx,yy,0,-21,'#79ffe0');}
  c.font='800 10px "Noto Sans KR",sans-serif';c.fillStyle='#dcebdc';c.fillText(['가로 7연사','세로 7연사','3방향'][i],xx,y+109);
 }
 c.font='700 10px "Noto Sans KR",sans-serif';c.fillStyle='#c8dfd5';c.fillText('중간 반전 → 가로 이동 → 선 밖',x+w/2,y+129);c.restore();
}
