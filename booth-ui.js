import {LocalRanking,createEntry,getIndividualBoard,toCSV,normalizeIdentity,getPersonalStanding,RANKING_SEASON,formatRunTime} from './ranking.js';
import {SharedRanking,newSessionNonce} from './shared-ranking.js';
const $=id=>document.getElementById(id);
const el=(tag,className,text)=>{const n=document.createElement(tag);n.className=className;if(text!==undefined)n.textContent=text;return n};
export class BoothUI {
  constructor(onSettings,notify){
    this.duration=0;this.mode='challenge';this.boardDuration=0;this.board='individual';this.ranking=new LocalRanking();this.entries=[];this.notify=notify;this.onSettings=onSettings;this.shared=new SharedRanking();this.activeRun=null;this.onSaved=null;
    this.shared.subscribe(snapshot=>{this.entries=snapshot.entries;this.render();if(snapshot.result)this.onSaved?.(snapshot.result);});
    const reconnect=()=>{if(this.activeRun)void this.shared.startRun(this.activeRun);void this.shared.retryPending();void this.shared.refresh();};
    window.addEventListener('online',reconnect);window.addEventListener('focus',()=>{if(!document.hidden)reconnect()});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body.dataset.screen!=='playing')reconnect()});
    this.refreshTimer=setInterval(()=>{if(!document.hidden&&document.body.dataset.screen!=='playing')reconnect()},20000);
    void this.shared.refresh();void this.shared.retryPending();
    $('export-ranking').onclick=()=>{if(!this.entries.length){this.notify('아직 저장된 기록이 없습니다.');return}const blob=new Blob([toCSV(this.entries)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='예술in-부스-랭킹.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    this.render();
  }
  updateSettings(){this.onSettings?.();}
  lock(locked){$('player-name').disabled=locked;}
  newRun(character){
    const identity=normalizeIdentity({name:$('player-name').value});
    const run={runId:globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2),...identity,character,clientNonce:newSessionNonce(),createdAt:new Date().toISOString()};
    this.activeRun=run;void this.shared.startRun(run);return run;
  }
  abandonRun(){this.activeRun=null;}
  refresh(){void this.shared.refresh();void this.shared.retryPending();}
  async finish(s,run){
    if(s.mode!=='challenge'||s.practice||!['clear','defeat','domain'].includes(s.endReason))return {ok:false,title:'순위 미등록',copy:'연습 또는 중도 종료 기록은 순위에 등록되지 않습니다.',comparison:'',rank:null};
    if(this.activeRun?.runId===run?.runId)this.activeRun=null;
    let entry;try{entry=createEntry({...run,crew:'',score:Math.round(s.score),duration:s.duration,difficulty:s.difficulty,bosses:s.stats.bossKills??s.stats.stagesCleared,maxCombo:s.maxCombo,runTime:s.runTime,lastClearTime:s.lastClearTime,stageClearTimes:s.stageClearTimes,endReason:s.endReason});}catch(error){return{ok:false,pending:false,rank:null,copy:error.message}}
    const backup=this.ranking.save(entry); // Backup only. It never supplies a public rank.
    const result=await this.shared.finishRun(run,entry);
    if(!result.ok&&!result.pending&&backup.ok)result.copy+=' 이 기기에는 기록을 보관했어요.';
    return result;
  }
  statusText(count){
    const pending=this.shared.pending.length;
    if(pending)return '기록 '+pending+'건 전송 대기 · 연결되면 자동 재시도'+(this.shared.persistent?'':' · 이 탭을 유지해 주세요');
    if(this.shared.status==='loading')return '전체 크루 순위를 불러오는 중…';
    if(this.shared.status!=='ready')return this.entries.length?'연결 확인 중 · 마지막으로 확인한 전체 순위':'서버 연결을 확인하고 있어요 · 잠시 후 자동 재시도';
    return '참여 '+count+'명 · 통과 수 → 통과 시간 → 점수 · 서버에 저장';
  }
  nextParticipant(){ $('player-name').value=''; }
  setLiveRun(run){
    const panel=$('visible-live-run');panel.classList.toggle('hidden',!run);
    if(!run)return;
    const score=Math.max(0,Math.round(run.score||0)),passed=Math.max(0,Math.min(5,Math.floor(run.bosses||0)));
    $('visible-live-score').textContent=passed+'/5 통과 · '+(passed>0?formatRunTime(run.lastClearTime):score.toLocaleString()+'점');
    const own=getPersonalStanding(this.entries,{name:run.name},{duration:0,difficulty:'standard'}).best;
    const timed=passed>0&&typeof run.lastClearTime==='number';
    $('visible-live-gap').textContent=!own?'통과 수가 같으면 통과 시간이 짧을수록 유리해요.':passed>own.bosses?'내 최고보다 더 많은 관문 통과!':passed<own.bosses?'내 최고 '+own.bosses+'/5 통과 · 현재 '+passed+'/5 통과':timed&&run.lastClearTime<own.lastClearTime?'내 최고보다 '+(own.lastClearTime-run.lastClearTime).toFixed(2)+'초 빠르게 통과!':timed&&run.lastClearTime>own.lastClearTime?'내 최고 통과 시간 '+formatRunTime(own.lastClearTime):score>own.score?'같은 통과 기록 · 내 최고보다 +'+(score-own.score).toLocaleString()+'점':score===own.score?'내 최고 기록과 동점!':'내 최고까지 '+(own.score-score).toLocaleString()+'점';
  }
  renderVisibleBoard(rows,identity,hasName){
    $('visible-rank-rows').replaceChildren(...rows.slice(0,5).map((r,i)=>{
      const me=hasName&&r.name===identity.name&&r.crew===identity.crew;
      const row=el('li','visible-rank-row'+(me?' is-me':'')),person=el('div','visible-rank-person'),name=el('strong','',r.name);
      if(me)name.append(el('span','you-tag','MY'));
      person.append(name,el('small','',(r.character==='actor'?'배우':'감독')+' · '+r.bosses+'/5 관문 통과'));
      const place=el('span','visible-rank-place',['🥇','🥈','🥉'][i]||String(i+1));place.setAttribute('aria-label',(i+1)+'위');
      const score=el('div','visible-rank-score');score.append(el('b','',r.bosses+'/5 통과'),el('small','',r.bosses>0?formatRunTime(r.lastClearTime):Math.round(r.score).toLocaleString()+'점'));row.append(place,person,score);return row;
    }));
    $('visible-rank-empty').classList.toggle('hidden',rows.length>0);
    const empty=$('visible-rank-empty'),ready=this.shared.status==='ready';empty.querySelector('b').textContent=ready?'아직 기록이 없어요':this.shared.status==='loading'?'전체 순위를 불러오는 중':'전체 순위 연결 대기';empty.querySelector('p').textContent=ready?'새 기록부터 전체 순위에 반영돼요.':'연결되면 자동으로 갱신돼요.';
    const own=getPersonalStanding(this.entries,identity,{duration:0,difficulty:'standard'});
    $('visible-rank-me').replaceChildren(el('span','',hasName?identity.name+' · 내 최고 기록':'내 기록'),el('strong','',hasName&&own.best?own.rank+'위 · '+own.best.bosses+'/5 통과':hasName?'첫 기록에 도전!':'닉네임을 입력하세요'),el('small','',hasName&&own.best?(own.best.bosses>0?formatRunTime(own.best.lastClearTime)+' · ':'')+own.best.score.toLocaleString()+'점':'통과 수 → 통과 시간 → 점수'));
    $('visible-rank-note').textContent=this.statusText(rows.length);
  }
  render(){
    const identity=normalizeIdentity({name:$('player-name').value}),hasName=$('player-name').value.trim().length>=2;
    const opts={duration:this.boardDuration,difficulty:'standard'},individual=getIndividualBoard(this.entries,opts),rows=individual;
    $('ranking-name-label').textContent='도전자';$('ranking-stat-label').textContent='통과 / 시간';
    $('ranking-rows').replaceChildren(...rows.slice(0,10).map((r,i)=>{const me=hasName&&r.name===identity.name&&r.crew===identity.crew;const li=el('li','rank-row'+(me?' is-me':'')),pos=el('span','rank-position',String(i+1).padStart(2,'0')),person=el('div','rank-person'),detail=el('span','rank-detail');person.append(el('strong','',r.name),el('span','',r.character==='actor'?'배우':'감독'));if(me)person.firstChild.append(el('span','you-tag','MY'));detail.append(el('b','',r.bosses+' / 5 통과'),document.createTextNode(r.bosses>0?formatRunTime(r.lastClearTime):'통과 시간 --'));li.append(pos,person,el('strong','rank-score',Math.round(r.score).toLocaleString()),detail);return li}));
    const standing=getPersonalStanding(this.entries,identity,opts),personal=$('personal-standing');
    personal.replaceChildren();const summary=el('div','',hasName?identity.name+' · 무제한 도전':'닉네임을 정하고 첫 기록에 도전하세요.');
    summary.append(el('small','',hasName?(identity.crew||'개인 참가')+' · '+standing.total+'명 참여':'다섯 관문에 도전하고 최고 기록을 남기세요.'));
    personal.append(summary,el('strong','',hasName&&standing.best?standing.rank+'위 · '+standing.best.bosses+'/5 통과 · '+(standing.best.bosses>0?formatRunTime(standing.best.lastClearTime):standing.best.score.toLocaleString()+'점'):'아직 기록 없음'));
    $('ranking-empty').classList.toggle('hidden',rows.length>0);$('ranking-empty').querySelector('h3').textContent=this.shared.status==='ready'?'첫 번째 기록을 남겨 보세요.':'전체 순위를 확인하고 있어요.';$('ranking-empty').querySelector('p').textContent=this.shared.status==='ready'?'새 기록부터 전체 순위에 반영돼요.':'연결되면 자동으로 갱신돼요.';
    $('ranking-summary').textContent='시즌 '+RANKING_SEASON+' · '+this.statusText(individual.length);
    this.renderVisibleBoard(individual,identity,hasName);
  }
}
