import { createGame, step, BOSSES, CHARACTERS, SKILL_KITS, getDomainGuide, getPatternGuide } from './engine.js';
import { Renderer, drawPortrait } from './renderer.js';
import { GameAudio } from './audio.js';
import { BoothUI } from './booth-ui.js';
import { normalizeIdentity } from './ranking.js';
import { createPractice, stepPractice } from './practice.js';
const $=id=>document.getElementById(id);
const canvas=$('arena'),renderer=new Renderer(canvas),audio=new GameAudio();
let selected='director',campaignDifficulty='standard',state=null,mode='lobby',paused=false,practice=false,practiceStage=0;
let practicePickerOpen=false,practiceViewKey='',exitContext=null;
let runMeta=null,observedStage=-1,observedRound=-1,combatGuideKey='';
let audioWanted=true;try{audioWanted=localStorage.getItem('yesulin-sound-enabled')!=='false';}catch{}
let lastTime=performance.now(),accumulator=0,renderTime=0,previousStatus='',toastTimer=null,returnFromModal=false;
const keys=new Set(),pressed=new Set(),touch=new Set();
const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',KeyQ:'attack',KeyW:'skill',KeyE:'buff',KeyR:'ultimate',Space:'dodge'};
const edgeKeys=new Set(['skill','buff','dodge','ultimate']);
const auditionLabel=stage=>stage===BOSSES.length-1?'최종 오디션':(stage+1)+'차 오디션';
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function setHidden(id,value){$(id).classList.toggle('hidden',value)}
function clearInput(){keys.clear();pressed.clear();touch.clear()}
function updateExitControls(){const active=mode==='playing'&&state?.status==='playing';$('exit-game').disabled=!active;$('exit-fullscreen').disabled=!active;setHidden('exit-fullscreen',!active||paused);}
try{const profile=JSON.parse(localStorage.getItem('yesulin-audition-profile-v6')||'null');if(profile?.name){const identity=normalizeIdentity({name:profile.name});$('player-name').value=identity.name;}}catch{}
const booth=new BoothUI(syncMode,toast);
function syncMode(){
 if(mode==='playing')return;
 $('scene-label').textContent='도전 준비';$('game-status').textContent='시간 제한 없는 4연전 · Q/W 공격 · E 강화 · R 궁극기 · Space 회피';
}

function selectCharacter(character){
  if(mode==='playing'){toast('이번 판은 '+CHARACTERS[selected].name+(selected==='actor'?'로':'으로')+' 끝까지 플레이합니다.');return}
  selected=character;document.querySelectorAll('.cast-card').forEach(card=>{const active=card.dataset.character===character;card.classList.toggle('selected',active);card.setAttribute('aria-pressed',String(active))});
  $('game-status').textContent=CHARACTERS[character].name+' 선택 완료 · Q/W 공격, E 강화, R 궁극기'; renderKit();
}
const easySkills={
 director:{q:'슬레이트 3연타. 액션 표식 최대 3개 충전.',w:'충격파를 쏘고, 모은 액션 표식을 연쇄 폭발!',e:'5초 강화 + 일반 피격 1회 방어. 스태프가 공격을 지원해요.',r:'스태프 총출동 12연타! 거대 슬레이트로 마무리.'},
 actor:{q:'검 3연타. 네 번째 묶음 적중 시 W 강화.',w:'물러나며 화살 5발. 강화 시 마지막은 관통 화살!',e:'5초간 공격·이동 강화. 정확히 피하면 다음 Q가 강한 마무리!',r:'검사 → 궁수 → 액션 배우! 컷신 뒤 12연타.'}
};
function renderKit(){
 const name=CHARACTERS[selected].name; $('kit-name').textContent=name+' 스킬';$('selected-name').textContent=name;
 const make=(key)=>{const skill=SKILL_KITS[selected][key],card=document.createElement('div'),badge=document.createElement('kbd'),title=document.createElement('b'),copy=document.createElement('p'),detail=document.createElement('small'),category=document.createElement('span');card.className='kit-card skill-'+key;badge.textContent=key.toUpperCase();title.textContent=skill.name;copy.textContent=easySkills[selected][key];category.className='skill-category';category.textContent={q:'연속 공격',w:'공격 기술',e:'5초 강화',r:'궁극기'}[key];detail.textContent=key==='q'?'누르고 있으면 연속 공격':key==='r'?'충전 100% + 재사용 '+skill.cooldown+'초':skill.cooldown+'초 후 다시 사용';card.append(category,badge,title,copy,detail);return card};
 $('kit-cards').replaceChildren(...['q','w','e','r'].map(make));
 renderLaunchOptions();
}
function renderLaunchOptions(){
 setHidden('practice-picker',!practicePickerOpen);$('practice-open').setAttribute('aria-expanded',String(practicePickerOpen));
 document.querySelectorAll('[data-practice-stage]').forEach(el=>{el.setAttribute('aria-label',CHARACTERS[selected].name+(selected==='actor'?'로 ':'으로 ')+auditionLabel(+el.dataset.practiceStage)+' '+BOSSES[+el.dataset.practiceStage].name+' 연습 시작')});
}
function prepareLaunch(){if(mode!=='lobby'||document.body.dataset.screen!=='casting')return;clearInput();launch();}
function openPracticePicker(){
 if(mode!=='lobby'||document.body.dataset.screen!=='casting')return;
 practicePickerOpen=true;renderLaunchOptions();document.querySelector('[data-practice-stage="'+practiceStage+'"]').focus({preventScroll:true});$('practice-picker').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function startPractice(stage){if(mode!=='lobby'||document.body.dataset.screen!=='casting')return;practiceStage=stage;launch({stage,isPractice:true});}
function lockCast(locked){document.querySelectorAll('.cast-card').forEach(card=>{card.disabled=locked;card.classList.toggle('cast-locked',locked)});}
function updateScenes(stage=0,complete=false){document.querySelectorAll('.scene').forEach((el,i)=>{el.classList.toggle('active',i===stage&&!complete);el.classList.toggle('done',!practice&&(i<stage||complete));el.querySelector('.scene-glyph').textContent=!practice&&(i<stage||complete)?'✓':i===stage?'↗':'·'});$('scene-label').textContent=auditionLabel(stage)+' · '+BOSSES[stage].name+(practice?' · 연습':complete?' · 통과':'');}
function launch({stage=0,isPractice=false}={}){
  booth.setLiveRun(null);audio.reset();combatGuideKey='';void setSound(audioWanted);document.body.dataset.screen='playing';clearInput();practice=isPractice;paused=false;mode='playing';previousStatus='playing';observedStage=-1;observedRound=-1;
  state=isPractice?createPractice({character:selected,stage}):createGame({mode:'challenge',character:selected,difficulty:campaignDifficulty,seed:Math.floor(Math.random()*0xffffffff),stage});
  practiceViewKey='';practicePickerOpen=false;setHidden('practice-bar',!isPractice);if(isPractice){practiceStage=stage;updatePracticeUI(state);}updateExitControls();
  runMeta=state.mode==='challenge'?booth.newRun(selected):null;booth.lock(true);lockCast(true);$('result-overlay').querySelector('.result-card').classList.toggle('booth-result',state.mode==='challenge');
  setHidden('intro',true);setHidden('result-overlay',true);setHidden('pause-overlay',true);
  updateScenes(stage);audio.pause(false);audio.cue('start');
  $('game-status').textContent=state.mode==='challenge'?'이그니스 → 미메 → 프리즘 → 카덴 · 시간 제한 없는 4연전 · Q/W 공격 · E 강화 · R 궁극기':isPractice?auditionLabel(stage)+' · '+BOSSES[stage].name+' 실전 연습':'엑스트라를 정리하고 보스를 만나세요. 조명 안에서는 공격력이 올라갑니다.';
  $('live-status').textContent=CHARACTERS[selected].name+(selected==='actor'?'로 ':'으로 ')+auditionLabel(stage)+' '+BOSSES[stage].name+' 시작';
  $('pause-toggle').textContent='Ⅱ';$('pause-toggle').setAttribute('aria-label','일시정지');
  accumulator=0;canvas.focus({preventScroll:true});$('game').scrollIntoView({behavior:'smooth',block:'start'});
}
function lobby({showPractice=false}={}){
 mode='lobby';state=null;runMeta=null;previousStatus='';exitContext=null;paused=false;practice=false;accumulator=0;clearInput();
 updateExitControls();returnFromModal=false;noteWasPlaying=false;rankingResume=false;
 for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
 booth.setLiveRun(null);audio.reset();audio.pause(true);combatGuideKey='';practicePickerOpen=showPractice;
 document.body.dataset.screen=$('player-name').value.trim()?'casting':'entry';
 canvas.setAttribute('aria-label','출전 대기. 역할을 고르고 시작하기 또는 연습모드를 선택하세요.');
 $('pause-toggle').textContent='Ⅱ';$('pause-toggle').setAttribute('aria-label','일시정지');booth.lock(false);lockCast(false);
 setHidden('intro',false);setHidden('result-overlay',true);setHidden('pause-overlay',true);setHidden('practice-bar',true);
 updateScenes(0);selectCharacter(selected);syncMode();booth.render();
 if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
 if(document.body.dataset.screen==='entry')$('player-name').focus({preventScroll:true});
 else if(showPractice)openPracticePicker();else $('start-game').focus({preventScroll:true});
 if(!showPractice)window.scrollTo({top:0,behavior:'smooth'});
}
function requestExit(){
 if(mode!=='playing'||state?.status!=='playing'||$('exit-dialog').open)return;
 exitContext={state,wasPaused:paused};paused=true;updateExitControls();clearInput();accumulator=0;audio.pause(true);
 $('pause-toggle').textContent='▶';$('pause-toggle').setAttribute('aria-label','게임 재개');
 $('exit-dialog').showModal();$('exit-continue').focus({preventScroll:true});
}
function cancelExit(){
 if(!exitContext)return;const previous=exitContext;exitContext=null;$('exit-dialog').close();clearInput();accumulator=0;
 if(mode!=='playing'||state!==previous.state)return;
 paused=previous.wasPaused;updateExitControls();if(!paused)combatGuideKey='';setHidden('pause-overlay',!paused);audio.pause(paused);
 $('pause-toggle').textContent=paused?'▶':'Ⅱ';$('pause-toggle').setAttribute('aria-label',paused?'게임 재개':'일시정지');
 (paused?$('resume-game'):canvas).focus({preventScroll:true});
}
function confirmExit(){
 if(!exitContext)return;
 // Discard the live run before any later animation frame can enter result saving.
 mode='lobby';state=null;runMeta=null;clearInput();accumulator=0;audio.reset();audio.pause(true);
 exitContext=null;$('exit-dialog').close();lobby();toast('게임을 종료했습니다. 이번 점수는 저장하지 않았어요.');
}
function togglePause(force){if(mode!=='playing'||state?.status!=='playing'||$('exit-dialog').open)return;paused=typeof force==='boolean'?force:!paused;updateExitControls();clearInput();setHidden('pause-overlay',!paused);audio.pause(paused);$('pause-toggle').textContent=paused?'▶':'Ⅱ';$('pause-toggle').setAttribute('aria-label',paused?'게임 재개':'일시정지');$('game-status').textContent=paused?'잠깐 쉬는 시간. Esc를 누르면 촬영을 이어갑니다.':'다시 액션! 공격 예고를 확인하고 빈틈을 노리세요.';if(!paused){accumulator=0;combatGuideKey='';canvas.focus({preventScroll:true})}else $('resume-game').focus({preventScroll:true})}
function stat(label,value){const div=document.createElement('div');div.className='result-stat';const b=document.createElement('b');b.textContent=value;const span=document.createElement('span');span.textContent=label;div.append(b,span);return div}
function failureTip(s){
 if(s.endReason!=='domain'){const kind=s.lastDamage?.hazard?.kind;return {'rehearsal-light':'1 → 2 → 3 순서로 조명 안에 들어가 잠깐 머무르세요.','replay':'방금 지나온 기억 지점에서 다른 방향으로 벗어나세요.','encore-slash':'빠른 3타 뒤 마지막 4타까지 피하세요.','encore-finisher':'빠른 3타 뒤 긴 예고의 마지막 4타가 남아 있습니다.'}[kind]||(s.audition?.selected&&!s.audition.solved?'★ 진짜만 공격하고 ○ 대역은 피하세요.':'공격 예고를 보고 위험 범위 밖으로 이동하세요.');}
 const tips={'moving-light':'움직이는 민트색 조명의 중심을 끝까지 따라가세요.','mask-panels':'번호가 같은 발판에 도착할 때까지 이동하세요.','lens-corridors':'전환 예고가 뜨면 다음 민트색 통로로 이동하세요.','blade-waves':'다가오는 칼날의 민트색 빈틈으로 이동하세요.','chasing-slashes':'조준 고정마다 방향을 바꾸고 마지막 3방향 참격까지 피하세요.'};
 return tips[s.domainDeath?.domainType]||'무대 장악의 실제 칼날과 위험 범위 밖으로 이동하세요.';
}
function showResult(){
 updateExitControls();clearInput();
 const challenge=state.mode==='challenge',won=state.status==='stageclear'||state.status==='victory';
 const passed=challenge?Math.min(BOSSES.length,Math.max(0,state.stats.bossKills??state.stats.stagesCleared??0)):(won?1:0);
 const result=challenge?booth.finish(state,runMeta):null;
 const card=$('result-overlay').querySelector('.result-card');card.classList.toggle('practice-result',!challenge);
 $('result-kicker').textContent=auditionLabel(state.stage)+' · '+state.boss.name+(challenge?'':' · 연습');
 $('result-title').textContent=challenge&&passed>=BOSSES.length?(selected==='actor'?'최종 오디션 합격!':'최종 심사 완료!'):won?'오디션 통과!':'도전 종료';
 const values=[stat('통과 오디션',passed+' / '+(challenge?BOSSES.length:1)),stat('점수',Math.round(state.score).toLocaleString())];
 if(challenge)values.push(stat('현재 순위',result.ok&&Number.isInteger(result.rank)?result.rank+'위':'—'));
 $('result-stats').replaceChildren(...values);$('result-copy').textContent=won?'':failureTip(state);setHidden('result-copy',won);
 $('result-save-status').textContent=challenge&&!result.ok?result.copy:'';setHidden('result-save-status',!challenge||result.ok);
 const service=document.querySelector('.result-service');service.href=selected==='actor'?'https://yesulin.art/auditions':'https://yesulin.art/producer-service';service.querySelector('b').textContent=selected==='actor'?'오디션 보기 ↗':'제작사 서비스 ↗';
 $('result-action').textContent='재도전';$('back-lobby').textContent='홈';
 if(challenge&&passed>=BOSSES.length)updateScenes(state.stage,true);
 setHidden('result-overlay',false);$('result-action').focus({preventScroll:true});
 $('game-status').textContent=challenge?(result.ok?'오디션 기록을 저장했습니다.':result.copy):'연습 기록은 순위에 등록되지 않습니다.';
 $('live-status').textContent=$('result-title').textContent+' · '+passed+'개 오디션 통과 · '+Math.round(state.score)+'점';
}
function resultAction(){launch(practice?{stage:practiceStage,isPractice:true}:{});}
function openGuide(){returnFromModal=mode==='playing'&&!paused&&state?.status==='playing';if(returnFromModal)togglePause(true);$('guide-dialog').showModal();}
function closeGuide(){$('guide-dialog').close();if(returnFromModal)togglePause(false);returnFromModal=false;}
const patternDetails={
 ignis:['발밑에 조명이 켜지면 밝은 타원 밖으로 한 걸음 이동하세요.','긴 빛의 길이 나타납니다. 길의 진행 방향이 아닌 옆으로 피하세요.','세 개의 바닥 조명이 순서대로 터집니다. 켜진 조명 밖을 유지하세요.','안전한 민트색 조명의 중심을 계속 따라가세요.','1 → 2 → 3 순서로 조명 안에 들어가면 1.8초 반격 기회가 열립니다.'],
 mime:['리본이 뻗는 긴 선의 옆으로 피하세요.','점선 FAKE는 가짜입니다. HIT가 쓰인 진한 범위 밖으로 이동하세요.','두 리본이 교차합니다. 두 예고선을 모두 벗어난 빈 공간으로 움직이세요.','큰 번호와 같은 민트색 발판으로 이동해 “도착!”을 확인하세요.','★ 표시가 있는 진짜를 공격하세요. ○ 대역을 때리면 피해를 받고 실패합니다.'],
 gojo:['푸른 구체가 끌어당깁니다. 파란 범위 중심에서 멀어지세요.','프리즘 주변으로 붉은 충격파가 터집니다. 발사 전에 거리를 벌리세요.','공격 예고선이 처음에는 나를 따라옵니다. 조준 고정 신호가 뜨면 진행 방향의 옆으로 빠르게 이동하세요. 고정 후 0.5초 뒤 발사합니다.','전환 예고가 끝나기 전에 다음 민트색 통로로 이동하세요.','직전 이동 경로의 기억 지점이 차례로 공격되니 다른 방향으로 벗어나세요.'],
 sukuna:['참격이 겹치는 궤적을 확인하고 선 사이로 빠져나오세요.','가까운 거리를 강하게 베어냅니다. 칼날 예고 범위를 벗어나세요.','불꽃이 직선을 태우고 폭발합니다. 공격이 끝날 때까지 범위 밖을 유지하세요.','칼날 파도는 민트색 빈틈으로 이동하고, 추격 난무는 고정 신호마다 방향을 바꾸세요. 마지막 3방향 공격까지 피하면 반격 기회가 열립니다.','빠른 3타 뒤 긴 예고의 4타가 남아 있으니 마지막 참격까지 피하세요.']
};
let noteStage=0,noteWasPlaying=false;
function openBoss(index){noteStage=index;const b=BOSSES[index];noteWasPlaying=mode==='playing'&&!paused&&state?.status==='playing';if(noteWasPlaying)togglePause(true);$('boss-note-kicker').textContent=auditionLabel(index)+' · 보스 노트';$('boss-note-title').textContent=b.name+' · '+b.title;$('boss-note-quote').textContent='“'+b.quote+'”';$('boss-patterns').replaceChildren(...b.patterns.map((name,i)=>{const div=document.createElement('div'),num=document.createElement('span'),title=document.createElement('b'),p=document.createElement('p');num.textContent='0'+(i+1);title.textContent=name;p.textContent=patternDetails[b.id]?.[i]||b.tip;div.append(num,title,p);return div}));$('boss-note-tip').textContent=b.tip;$('boss-dialog').showModal();}
function closeBoss(){$('boss-dialog').close();if(noteWasPlaying)togglePause(false);noteWasPlaying=false;}

function enterAudition(e){
 e?.preventDefault();const raw=$('player-name').value.normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'').trim();
 if([...raw].length<2||[...raw].length>12||!/[\p{L}\p{N}]/u.test(raw)||/[<>\u0000-\u001f\u007f]/u.test(raw)){$('entry-error').textContent='닉네임을 2–12자로 입력해 주세요. 글자 또는 숫자를 포함해 주세요.';$('player-name').setAttribute('aria-invalid','true');$('player-name').focus();return;}
 const identity=normalizeIdentity({name:raw});if([...identity.name].length<2){$('entry-error').textContent='표시할 수 있는 닉네임을 2자 이상 입력해 주세요.';$('player-name').setAttribute('aria-invalid','true');$('player-name').focus();return;}$('player-name').value=identity.name;$('participant-name').textContent=identity.name;$('entry-error').textContent='';$('player-name').removeAttribute('aria-invalid');document.body.dataset.screen='casting';try{localStorage.setItem('yesulin-audition-profile-v6',JSON.stringify(identity));}catch{}booth.render();$('start-game').focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});
}
$('entry-form').addEventListener('submit',enterAudition);
$('change-name').onclick=()=>{document.body.dataset.screen='entry';$('player-name').focus();};
let rankingResume=false;
function openRanking(){rankingResume=mode==='playing'&&!paused&&state?.status==='playing';if(rankingResume)togglePause(true);booth.render();$('ranking-dialog').showModal();}
function closeRanking(){$('ranking-dialog').close();if(rankingResume)togglePause(false);rankingResume=false;}
document.querySelectorAll('[data-open-ranking]').forEach(button=>button.onclick=openRanking);
$('ranking-dialog').querySelector('.dialog-close').onclick=closeRanking;$('ranking-dialog').addEventListener('cancel',e=>{e.preventDefault();closeRanking()});
document.querySelectorAll('.cast-card').forEach(el=>el.addEventListener('click',()=>selectCharacter(el.dataset.character)));
document.querySelectorAll('.scene').forEach((el,i)=>{el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',auditionLabel(i)+' '+BOSSES[i].name+' 보스 노트와 연습');el.addEventListener('click',()=>openBoss(i));el.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();openBoss(i)}})});
$('start-game').onclick=prepareLaunch;$('practice-open').onclick=openPracticePicker;$('result-action').onclick=resultAction;
$('back-lobby').onclick=()=>lobby();
$('exit-game').onclick=requestExit;$('exit-fullscreen').onclick=requestExit;$('pause-home').onclick=requestExit;$('exit-continue').onclick=cancelExit;$('exit-confirm').onclick=confirmExit;
$('exit-dialog').addEventListener('cancel',e=>{e.preventDefault();cancelExit()});
$('pause-toggle').onclick=()=>togglePause();$('resume-game').onclick=()=>togglePause(false);
$('guide-open').onclick=openGuide;$('quick-guide').onclick=openGuide;
$('guide-dialog').querySelector('.dialog-close').onclick=closeGuide;$('guide-dialog').querySelector('.dialog-done').onclick=closeGuide;$('guide-dialog').addEventListener('cancel',e=>{e.preventDefault();closeGuide()});
$('boss-dialog').querySelector('.dialog-close').onclick=closeBoss;$('boss-dialog').addEventListener('cancel',e=>{e.preventDefault();closeBoss()});
function launchNotedBoss(){if(!$('player-name').value.trim()){$('boss-dialog').close();document.body.dataset.screen='entry';$('player-name').focus();return;}practiceStage=noteStage;noteWasPlaying=false;$('boss-dialog').close();launch({stage:practiceStage,isPractice:true});}
$('practice-boss').onclick=launchNotedBoss;
document.querySelectorAll('[data-practice-stage]').forEach(el=>el.onclick=()=>startPractice(+el.dataset.practiceStage));
$('practice-restart').onclick=()=>launch({stage:practiceStage,isPractice:true});
$('practice-select').onclick=()=>lobby({showPractice:true});
function updatePracticeUI(s){
 if(!s.practice||practiceViewKey===String(s.stage))return;practiceViewKey=String(s.stage);
 $('practice-phase').textContent=auditionLabel(s.stage)+' · 연습모드';
 $('practice-message').textContent=BOSSES[s.stage].name+' · QWER로 자유롭게 대결. 이 보스만 상대하고 종료해요.';
 $('practice-count').textContent='순위 미등록';
}

async function setSound(wanted){
 audioWanted=!!wanted;$('sound-enabled').checked=audioWanted;try{localStorage.setItem('yesulin-sound-enabled',String(audioWanted));}catch{}
 const enabled=await audio.setEnabled(audioWanted);$('sound-toggle').innerHTML=enabled?'♫':'♫<span class="off-slash">/</span>';$('sound-toggle').setAttribute('aria-label',enabled?'사운드 끄기':'사운드 켜기');$('sound-toggle').title=enabled?'사운드 끄기':'사운드 켜기';audio.pause(paused||mode!=='playing');return enabled;
}
$('sound-toggle').onclick=async()=>{const enabled=await setSound(!audio.enabled);if(enabled)audio.cue('start');toast(enabled?'사운드 ON · 보스별 오리지널 무대 장악 BGM':'사운드 OFF')};
$('sound-enabled').checked=audioWanted;$('sound-enabled').onchange=()=>{audioWanted=$('sound-enabled').checked;try{localStorage.setItem('yesulin-sound-enabled',String(audioWanted));}catch{}if(!audioWanted)void setSound(false);};
function updateCombatGuide(s){
 if(paused||s.status!=='playing')return;
 const h=s.hazards.find(h=>h.kind==='domain');let key='',message='';
 if(h){const guide=getDomainGuide(s,h);
  message=(s.cinematic?'컷신 뒤 회피 준비! ':'')+guide.instruction;key=s.boss.id+':'+message;
 }else{const guide=getPatternGuide(s);if(guide){key='pattern:'+guide.kind+':'+guide.instruction;message=guide.instruction;}else{const purple=s.hazards.find(h=>h.kind==='purple'&&!h.active);if(purple){key=purple.locked?'purple-locked':'purple-tracking';message=purple.locked?'조준 고정! 고정된 공격선의 옆으로 피하세요.':'조준이 나를 따라옵니다. 고정 신호가 뜨면 고정된 공격선의 옆으로 피하세요.';}}}
 if(key===combatGuideKey)return;
 if(key||combatGuideKey){$('game-status').textContent=message||'다시 액션! Q/W 공격 · E 강화 · R 궁극기 · Space 회피';if(message)$('live-status').textContent=message;}
 combatGuideKey=key;
}

$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game-shell').requestFullscreen();canvas.focus({preventScroll:true})}catch{toast('이 브라우저에서는 전체 화면을 지원하지 않습니다.')}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'전체 화면 닫기':'게임 전체 화면')});
window.addEventListener('keydown',e=>{
 if($('exit-dialog').open)return;
 if($('guide-dialog').open||$('boss-dialog').open||$('ranking-dialog').open)return;
 if(['SELECT','INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(e.code==='Enter'&&mode==='lobby'&&!e.repeat&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();prepareLaunch();return}
 if(mode!=='playing')return;
 if((e.code==='Escape'||e.code==='KeyP')&&!e.repeat){e.preventDefault();togglePause();return}
 const action=keyMap[e.code];if(action&&state?.status==='playing'){e.preventDefault();if(!paused&&!(state.cinematic?.remaining>0)){keys.add(action);if(!e.repeat)pressed.add(action)}}
});
window.addEventListener('keyup',e=>{const a=keyMap[e.code];if(a)keys.delete(a)});
window.addEventListener('blur',()=>{clearInput();if(mode==='playing'&&!paused)togglePause(true)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(mode==='playing'&&!paused)togglePause(true)}});
document.querySelectorAll('[data-input]').forEach(button=>{
 const action=button.dataset.input;button.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='playing'||paused||state?.status!=='playing'||state?.cinematic?.remaining>0)return;button.setPointerCapture(e.pointerId);touch.add(action);pressed.add(action)});
 const release=e=>{e.preventDefault();touch.delete(action)};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',()=>touch.delete(action));
});
let ariaTick=0;
function frame(now){
 const elapsed=Math.max(0,(now-lastTime)/1000),dt=Math.min(elapsed,.1);lastTime=now;renderTime+=dt;
 if(mode==='playing'&&state){
  if(!paused&&state.status==='playing'){if(state.cinematic?.remaining>0)clearInput();accumulator+=elapsed;while(accumulator>=1/60){const input={};for(const action of Object.values(keyMap))input[action]=edgeKeys.has(action)?pressed.has(action):keys.has(action)||touch.has(action)||(action==='attack'&&pressed.has(action));input.attackPressed=pressed.has('attack');if(state.cinematic?.remaining>0){clearInput();for(const k of Object.keys(input))input[k]=false;}(state.practice?stepPractice:step)(state,input,1/60);pressed.clear();accumulator-=1/60;if(state.status!=='playing'){accumulator=0;break;}}}
  audio.update(state,dt);renderer.render(state,renderTime);updateCombatGuide(state);updatePracticeUI(state);
  if(state.stage!==observedStage||state.round!==observedRound){observedStage=state.stage;observedRound=state.round;updateScenes(state.stage);}
  if(state.status!==previousStatus){previousStatus=state.status;if(state.status!=='playing')showResult()}
  ariaTick+=dt;if(ariaTick>.25){ariaTick=0;booth.setLiveRun(state.status==='playing'&&state.mode==='challenge'?{score:Math.round(state.score),bosses:state.stats.bossKills??state.stats.stagesCleared??0,name:runMeta?.name}:null);canvas.setAttribute('aria-label',(practice?'연습모드':state.mode==='challenge'?'무제한 보스 도전':'본 게임')+' · '+auditionLabel(state.stage)+' '+state.boss.name+' · '+CHARACTERS[state.player.character].name+' 고정 캐릭터'+' · Q/W 공격 E 강화 R 궁극기 · 버프 '+(state.player.buffTimer>0?'활성':'없음')+' · 체력 '+Math.ceil(state.player.hp)+' · 보스 체력 '+Math.ceil(state.boss.hp)+' · '+(state.mode==='challenge'?'시간 제한 없음 · 점수 '+Math.round(state.score)+' · 콤보 '+state.combo+' · JUST '+(state.stats.justHits||0)+' · ':'')+(paused?'일시정지':state.cinematic?.remaining>0?'컷신 '+state.cinematic.name:state.status));}
 }else renderer.render(null,renderTime,{lobby:true,selected});
 canvas.dataset.audioEnabled=String(audio.enabled);canvas.dataset.domainMusic=JSON.stringify(audio.getDomainMusicStatus());
 requestAnimationFrame(frame);
}
drawPortrait($('portrait-director'),'director');drawPortrait($('portrait-actor'),'actor');audio.pause(true);selectCharacter(selected);syncMode();$('player-name').focus({preventScroll:true});requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>audio.pause(true));
