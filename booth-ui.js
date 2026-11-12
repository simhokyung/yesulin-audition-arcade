import {LocalRanking,getIndividualBoard,toCSV,normalizeIdentity,getPersonalStanding,RANKING_STORAGE_KEY} from './ranking.js';
const $=id=>document.getElementById(id);
const el=(tag,className,text)=>{const n=document.createElement(tag);n.className=className;if(text!==undefined)n.textContent=text;return n};
export class BoothUI {
  constructor(onSettings,notify){
    this.duration=0;this.mode='challenge';this.boardDuration=0;this.board='individual';this.ranking=new LocalRanking();this.entries=[];this.notify=notify;this.onSettings=onSettings;this.storageError='';
    const loaded=this.ranking.load();this.entries=loaded.entries;this.storageError=loaded.error||'';
    window.addEventListener('storage',e=>{if(e.key!==RANKING_STORAGE_KEY)return;const fresh=this.ranking.load();this.entries=fresh.entries;this.storageError=fresh.error||'';this.render();});
    $('export-ranking').onclick=()=>{if(!this.entries.length){this.notify('아직 저장된 기록이 없습니다.');return}const blob=new Blob([toCSV(this.entries)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='예술in-부스-랭킹.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    this.render();
  }
  updateSettings(){this.onSettings?.();}
  lock(locked){$('player-name').disabled=locked;}
  newRun(character){
    const identity=normalizeIdentity({name:$('player-name').value});
    return {runId:globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2),...identity,character,createdAt:new Date().toISOString()};
  }
  finish(s,run){
    if(s.mode!=='challenge'||s.practice)return {ok:false,title:'연습 기록',copy:'연습 기록은 순위에 등록되지 않습니다.',comparison:'',rank:null};
    const previous=getPersonalStanding(this.entries,run,{duration:0,difficulty:s.difficulty}).best;
    const saved=this.ranking.save({...run,score:Math.round(s.score),duration:s.duration,difficulty:s.difficulty,bosses:s.stats.bossKills??s.stats.stagesCleared,maxCombo:s.maxCombo,runTime:s.runTime,endReason:s.endReason});
    if(!saved.ok){this.storageError=saved.error;this.render();return {title:'기록 저장을 확인해 주세요',copy:saved.error,ok:false,rank:null};}
    this.entries=saved.entries;this.storageError='';this.boardDuration=s.duration;this.render();const board=getIndividualBoard(this.entries,{duration:s.duration,difficulty:s.difficulty});
    const index=board.findIndex(r=>r.name===saved.entry.name&&r.crew===saved.entry.crew),own=board[index],isBest=own?.runId===saved.entry.runId;
    const comparison=previous?(isBest?'개인 최고 기록을 갱신했습니다.':'기존 최고 기록을 유지합니다.'):'첫 오디션 기록입니다.';
    return {ok:true,rank:index>=0?index+1:null,comparison,title:'현재 '+(index+1)+'위',copy:'이 브라우저에 저장했습니다.'};
  }
  nextParticipant(){ $('player-name').value=''; }
  setLiveRun(run){
    const panel=$('visible-live-run');panel.classList.toggle('hidden',!run);
    if(!run)return;
    const score=Math.max(0,Math.round(run.score||0)),passed=Math.max(0,Math.min(4,Math.floor(run.bosses||0)));
    $('visible-live-score').textContent=passed+'/4 통과 · '+score.toLocaleString()+'점';
    const own=getPersonalStanding(this.entries,{name:run.name},{duration:0,difficulty:'standard'}).best;
    $('visible-live-gap').textContent=!own?'통과 오디션 수가 먼저 반영됩니다.':passed>own.bosses?'내 최고보다 더 많은 오디션 통과!':passed<own.bosses?'내 최고 '+own.bosses+'/4 통과 · 현재 '+passed+'/4 통과':score>own.score?'같은 통과 수 · 내 최고보다 +'+(score-own.score).toLocaleString()+'점':score===own.score?'내 최고 기록과 동점!':'같은 통과 수 · 내 최고까지 '+(own.score-score).toLocaleString()+'점';
  }
  renderVisibleBoard(rows,identity,hasName){
    $('visible-rank-rows').replaceChildren(...rows.slice(0,5).map((r,i)=>{
      const me=hasName&&r.name===identity.name&&r.crew===identity.crew;
      const row=el('li','visible-rank-row'+(me?' is-me':'')),person=el('div','visible-rank-person'),name=el('strong','',r.name);
      if(me)name.append(el('span','you-tag','MY'));
      person.append(name,el('small','',(r.character==='actor'?'배우':'감독')+' · '+r.bosses+'/4 오디션 통과'));
      const place=el('span','visible-rank-place',['🥇','🥈','🥉'][i]||String(i+1));place.setAttribute('aria-label',(i+1)+'위');
      const score=el('div','visible-rank-score');score.append(el('b','',r.bosses+'/4 통과'),el('small','',Math.round(r.score).toLocaleString()+'점'));row.append(place,person,score);return row;
    }));
    $('visible-rank-empty').classList.toggle('hidden',rows.length>0);
    const own=getPersonalStanding(this.entries,identity,{duration:0,difficulty:'standard'});
    $('visible-rank-me').replaceChildren(el('span','',hasName?identity.name+' · 내 최고 기록':'내 기록'),el('strong','',hasName&&own.best?own.rank+'위 · '+own.best.score.toLocaleString()+'점':hasName?'첫 기록에 도전!':'닉네임을 입력하세요'),el('small','',hasName&&own.best?own.best.bosses+'/4 오디션 통과 · 최대 '+own.best.maxCombo+' HIT':'통과 수·점수 기준 최고 기록'));
    $('visible-rank-note').textContent=this.storageError||'참여 '+rows.length+'명 · 통과 수 우선, 동률은 점수 · 이 브라우저에 저장';
  }
  render(){
    const identity=normalizeIdentity({name:$('player-name').value}),hasName=$('player-name').value.trim().length>=2;
    const opts={duration:this.boardDuration,difficulty:'standard'},individual=getIndividualBoard(this.entries,opts),rows=individual;
    $('ranking-name-label').textContent='도전자';$('ranking-stat-label').textContent='통과 오디션';
    $('ranking-rows').replaceChildren(...rows.slice(0,10).map((r,i)=>{const me=hasName&&r.name===identity.name&&r.crew===identity.crew;const li=el('li','rank-row'+(me?' is-me':'')),pos=el('span','rank-position',String(i+1).padStart(2,'0')),person=el('div','rank-person'),detail=el('span','rank-detail');person.append(el('strong','',r.name),el('span','',r.character==='actor'?'배우':'감독'));if(me)person.firstChild.append(el('span','you-tag','MY'));detail.append(el('b','',r.bosses+' / 4 통과'),document.createTextNode('최대 '+r.maxCombo+' HIT'));li.append(pos,person,el('strong','rank-score',Math.round(r.score).toLocaleString()),detail);return li}));
    const standing=getPersonalStanding(this.entries,identity,opts),personal=$('personal-standing');
    personal.replaceChildren();const summary=el('div','',hasName?identity.name+' · 무제한 도전':'닉네임을 정하고 첫 기록에 도전하세요.');
    summary.append(el('small','',hasName?(identity.crew||'개인 참가')+' · '+standing.total+'명 참여':'네 오디션에 도전하고 최고 기록을 남기세요.'));
    personal.append(summary,el('strong','',hasName&&standing.best?standing.rank+'위 · '+standing.best.score.toLocaleString()+'점':'아직 기록 없음'));
    $('ranking-empty').classList.toggle('hidden',rows.length>0);
    $('ranking-summary').textContent=this.storageError||'시즌 14 · 통과 오디션 수 우선, 같으면 점수순'+' · '+individual.length+'명 참여 · 이 브라우저에 저장';
    this.renderVisibleBoard(individual,identity,hasName);
  }
}
