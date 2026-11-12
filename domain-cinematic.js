// Illustrated takeover teaching: every judge has a different movement rule.
import { drawTakeoverMap, mimePresentation } from './takeover-vfx.js';
import { BOSS_VISUALS } from './boss-visuals.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
const art={};
for(const [id,visual] of Object.entries(BOSS_VISUALS)){
  if(typeof Image==='undefined')continue;
  const image=new Image(); image.decoding='async';
  image.src=new URL(`./assets/${visual.asset}-takeover-v8.png`,import.meta.url).href;
  art[id]=image;
}
export function getTakeoverArtwork(id){return art[id];}
export function domainAssetStatus(){return Object.fromEntries(Object.keys(BOSS_VISUALS).map(id=>[id,!!(art[id]?.complete&&art[id]?.naturalWidth)]));}
export function drawDomainCutscene(c,s,t,reduceMotion=false){
  const shot=s?.cinematic;
  if(!shot||shot.kind!=='domain'||shot.remaining<=0)return false;
  const id=s.boss.id,visual=BOSS_VISUALS[id]||BOSS_VISUALS.ignis,zone=s.hazards.find(h=>h.kind==='domain'&&h.type==='safezone'),chasing=zone?.domainType==='chasing-slashes';
  const p=clamp(1-shot.remaining/shot.duration),color=visual.color;
  const image=art[id],w=1280,h=720;
  c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';
  c.fillStyle=visual.deep;c.fillRect(0,0,w,h);
  if(image?.complete&&image.naturalWidth){
    // Keep the face AND hand seal visible throughout the push-in. No pose stretching.
    const z=reduceMotion?1:chasing?1.04+.025*ease(p):1.015+.045*ease(p);
    const cover=Math.max(w/image.naturalWidth,h/image.naturalHeight)*z;
    const dw=image.naturalWidth*cover,dh=image.naturalHeight*cover;
    c.drawImage(image,(w-dw)/2+(reduceMotion?0:(1-ease(p))*(chasing?-24:18)),(h-dh)/2+6+(reduceMotion||!chasing?0:(1-ease(p))*10),dw,dh);
  }else{
    // A readable, non-blocking fallback if an optional image has not decoded yet.
    const g=c.createRadialGradient(640,320,30,640,320,660);
    g.addColorStop(0,visual.wall);g.addColorStop(1,'#04060f');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  }
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
  const rules={ignis:['움직이는 조명','밝은 조명 안에서 빛을 따라가세요','조명이 계속 이동합니다 · 멈춰 있으면 위험'],mime:['진짜 가면 찾기','진짜 패널을 보고 다음 신호에 이동!','◇ ○ △ 표시 확인 · 금빛 다음 패널로 열린 통로 이동'],gojo:['교차 프레임','가로 → 세로 · 바뀌는 빈틈으로!','예고 동안 이동 · 밝은 통로 안에서 교차 공격 회피'],sukuna:['다가오는 다섯 차례 칼날 벽','방향을 보고 민트색 빈틈에 맞추세요!','좌우 · 상하 · 대각선에서 접근 · 칼날이 지나갈 때까지 빈틈 유지']};
  const takeoverTitle=zone?.name?.replace(/^무대 장악\s*[·:]\s*/, '')||visual.takeover;
  let rule=chasing?['단발 연사 → 시간차 협공 → 3방향 피날레','빨강은 계속 이동, 흰색이면 방향 전환!','조준이 멈추면 방향 전환 · 마지막 뒤 황금 반격!']:rules[id]||rules.ignis;if(id==='mime'&&zone){const m=mimePresentation(s,zone);rule=['목적지 발판 찾기',`${m.symbol} 밝은 민트 발판으로!`,'민트색 하나 = 지금 목적지 · 금색 점선 = 다음 발판'];}
  c.fillStyle=color;c.font='700 12px "Noto Sans KR",sans-serif';c.fillText('무 대 장 악',640,529+rise);
  c.fillStyle='#ffffff';c.font='900 53px "Noto Sans KR","Apple SD Gothic Neo",sans-serif';
  c.fillText(takeoverTitle,640,586+rise);
  c.fillStyle='#f3f5e9';c.font='700 17px "Noto Sans KR",sans-serif';
  c.fillText(rule[0]+' · 치명 공격에 대비하세요',565,616);
  c.fillStyle='#79ffe0';c.font='900 23px "Noto Sans KR",sans-serif';
  c.fillText(rule[1],565,649);
  c.fillStyle='#d7e7df';c.font='600 13px "Noto Sans KR",sans-serif';c.fillText(rule[2],565,674);
  if(chasing){c.save();const locked=p>.62,ink=locked?'#f4eddc':'#f27b91';c.strokeStyle=ink;c.lineWidth=2;for(const side of [-1,1]){const cx=640+side*514,cy=290;c.beginPath();c.arc(cx,cy,34,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(cx-46,cy);c.lineTo(cx+46,cy);c.moveTo(cx,cy-46);c.lineTo(cx,cy+46);c.stroke();}c.textAlign='center';c.fillStyle=ink;c.font='800 12px "Noto Sans KR",sans-serif';c.fillText(locked?'조준 고정 → 옆으로':'추적 중 → 계속 이동',640,100);c.restore();}
  drawTakeoverMap(c,s,zone);
  c.restore();return true;
}
