import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,BOSSES,getDomainGuide} from './engine.js';
import {takeoverInstruction,mimePresentation} from './takeover-vfx.js';

const walk=(s,p)=>({left:p.x<s.player.x-3,right:p.x>s.player.x+3,up:p.y<s.player.y-3,down:p.y>s.player.y+3});

test('all takeover action guides preserve real destinations and distinguish movement deadlines from live attacks',()=>{
 const observed=new Set();
 for(let stage=0;stage<BOSSES.length;stage++)for(const variant of (BOSSES[stage].id==='max'?[0]:BOSSES[stage].id==='sukuna'?[0,1,2]:[0,1]))for(const character of ['actor','director']){
  const s=createGame({stage,character,skipIntro:true});s.boss.patternIndex=3;s.boss.patternCooldown=0;s.boss.takeoverCount=variant;step(s);
  let count=0;
  while(s.hazards.some(h=>h.kind==='domain')&&s.status==='playing'&&count++<2500){
   const h=s.hazards.find(h=>h.kind==='domain'),actual=getDomainGuide(s,h),before=JSON.stringify(s),ui=takeoverInstruction(s,h);
   assert.equal(JSON.stringify(s),before,'presentation cannot mutate attack geometry or timing');
   assert.deepEqual(ui.target,actual.target,'arrow destination comes directly from the engine');
   assert(Number.isFinite(ui.remaining)&&ui.remaining>=0);assert(Number.isFinite(ui.progress));
   assert(ui.title.length<=38,`${h.domainType}: ${ui.title}`);assert(ui.tip.length<=72,ui.tip);
   assert(!ui.tip.includes('안전 조명 밖'),'no shared misleading spotlight rule');
   assert(!/즉사|INSTANT KO/.test(ui.tip+ui.title),'v20 never promises instant death');
   if(h.domainType==='mask-panels'){const m=mimePresentation(s,h);assert(ui.title.includes(m.symbol));assert.equal(ui.timerLabel,!h.active||m.changing?'이동 마감':m.preview?'다음 이동':'장악 종료');if(m.changing)assert(ui.tip.includes('연결 통로'));}
   if(h.domainType==='lens-corridors'){assert.equal(ui.timerLabel,actual.warning?'이동 마감':h.domainPhase<3?'다음 이동':'장악 종료');if(!actual.warning)assert(ui.tip.includes('아직 위험'));}
   if(h.domainType==='memory-archive'&&h.archivePhase==='final'){assert.equal(ui.timerLabel,actual.tracking?'조준 고정까지':h.phaseWarning?'촬영까지':'촬영 종료');assert(ui.tip.includes('부채꼴'));}
   if(h.domainType==='chasing-slashes'&&h.section==='burst'&&h.active){const next=h.slashes.find(q=>!q.started&&!q.finished);assert.equal(ui.timerLabel,next?'다음 발사':'칼날 통과');if(next)assert.equal(ui.remaining,Math.max(0,actual.nextShotIn));}
   observed.add(h.variantId||h.domainType);step(s,s.cinematic?{}:walk(s,actual.target));if(s.boss.attacks)s.boss.patternCooldown=999;
  }
  assert.equal(s.status,'playing',`${s.boss.id}/${variant}/${character} can follow the unchanged live guide`);assert(count<2500);
 }
 assert.equal(observed.size,10);
});
