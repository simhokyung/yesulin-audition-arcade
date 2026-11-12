/** A single-boss practice duel uses production challenge HP, damage and patterns.
 * Only the opponent changes. There is no ranking, time limit or automatic next act.
 */
import {createGame,startStage,step,BOSSES} from './engine.js';
export function createPractice({character='director',stage=0}={}){
 stage=Math.max(0,Math.min(BOSSES.length-1,stage|0));
 const s=createGame({mode:'challenge',character:character==='actor'?'actor':'director'});
 startStage(s,stage,{retry:true,entrance:true});s.mode='practice';s.duration=0;s.timeLeft=null;
 s.practice={kind:'duel',stage,character:s.player.character,phase:'attempt',attempts:1,successes:0,epoch:1,message:'본 도전과 같은 보스입니다. Q/W/E/R과 회피를 자유롭게 연습하세요.'};
 return s;
}
export function stepPractice(s,input={},dt=1/60){
 if(s.status==='playing')step(s,input,dt);
 if(s.practice&&s.status==='victory'){s.practice.successes=1;s.practice.message='이 보스 연습 완료! 다시 도전하거나 다른 보스를 선택하세요.';}
 return s;
}
