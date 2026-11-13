/** Original eight-bar synth-rock score. No external recording or borrowed melody. */
export const COMBAT_TEMPOS=Object.freeze({audition:136,finale:156,climax:172});
const hz=midi=>440*2**((midi-69)/12);
const ROOTS=[38,34,41,36,38,34,36,33];
const MELODY=[[74,77,81,79,77,74],[70,74,77,79,77,74],[77,81,84,81,79,77],[72,76,79,77,76,72],[81,79,77,74,77,79],[77,74,70,74,77,81],[79,77,76,72,76,79],[76,73,69,73,76,81]];
export function combatArrangement(state){return state?.boss?.id==='sukuna'?(state.boss.hp/state.boss.maxHp<=.42?'climax':'finale'):'audition';}
/** Pure score data also drives the offline sound preview and deterministic tests. */
export function combatScoreStep(mode,step){
 const speed=60/(COMBAT_TEMPOS[mode]||136)/4,i=step%16,bar=Math.floor(step/16)%8,root=ROOTS[bar],hard=mode!=='audition',climax=mode==='climax',out=[];
 const note=(midi,duration,volume=.06,type='triangle',pan=0,attack=.014,offset=0,end=null)=>out.push({kind:'note',frequency:hz(midi),duration,volume,type,pan,attack,offset,endFrequency:end?hz(end):hz(midi),sustain:duration>speed*5?.75:duration>speed*1.5?.55:.25});
 const drum=(duration,volume,frequency,type='bandpass',pan=0,offset=0)=>out.push({kind:'noise',duration,volume,frequency,type,pan,offset});
 if((hard?[0,3,6,8,10,14]:[0,6,10]).includes(i)){out.push({kind:'note',frequency:122,duration:.15,volume:.18,type:'sine',pan:0,attack:.005,offset:0,endFrequency:42});drum(.016,.035,2800,'highpass');}
 if(i===4||i===12){drum(.14,.095,1850,'bandpass',-.08);note(43,.11,.045,'triangle',0,.005,0,31);drum(.045,.04,4200,'highpass',.1,.016);}
 if(i%2===0||climax||hard&&[7,15].includes(i))drum(i===14&&hard?.105:.029,i%4===0?.033:.022,6200,'highpass',i%4<2?-.28:.28);
 if(hard&&bar%2===1&&[11,15].includes(i))drum(.038,.033,2100,'bandpass',.2);
 if([0,3,6,8,10,14].includes(i)){note(root+(i===6?7:i===14?12:0),speed*(i===0?2.4:1.35),.15,'triangle',-.03,.008);if(hard)note(root+12+(i===6?7:i===14?12:0),speed*.9,.022,'sawtooth',.06,.009);}
 if([0,6,10].includes(i)){for(const [n,d]of [0,3,7].entries())note(root+24+d,speed*(hard?1.6:2.1),hard?.035:.028,hard?'sawtooth':'triangle',n===0?-.4:n===2?.4:0,.02);}
 if(i===0){note(root+24,speed*11,.026,'sine',-.35,.16);note(root+31,speed*11,.022,'sine',.35,.16);}
 const mi=[0,3,6,8,11,14].indexOf(i);if(mi>=0){const m=MELODY[bar][mi];note(m,speed*(mi===5?2.6:1.8),hard?.115:.095,'triangle',.14,.023);note(m+12,speed*1.6,hard?.028:.024,'sine',-.18,.025,.012);}
 if(climax&&i%2===1)note(root+36+[0,7,12,15][Math.floor(i/2)%4],speed*.65,.022,'triangle',i%4===1?-.45:.45,.008);
 return out;
}
/** Schedules only a short lookahead. It owns music voices, separate from hit effects. */
export class CombatMusic {
 constructor({note,noise}={}){this.note=note;this.noise=noise;this.context=null;this.bus=null;this.mode='audition';this.desired='audition';this.step=0;this.nextTime=null;this.voices=new Set();this.state=null;this.epoch=null;this.playing=false;this.destroyed=false;}
 attach(context,bus){this.context=context;this.bus=bus;}
 remember(source){if(!source||source._gameAudioEnded)return;this.voices.add(source);const ended=source.onended;source.onended=(...args)=>{this.voices.delete(source);ended?.(...args);};}
 sync(state,{enabled=false,paused=false,domain=false}={}){
  const epoch=state?.practice?.epoch??null;if(this.state!==state||this.epoch!==epoch){this.reset();this.state=state;this.epoch=epoch;}
  const active=!!state&&state.status==='playing';if(this.destroyed||!enabled||paused||!active||this.context?.state!=='running'){this.stop();if(!active){this.step=0;this.mode=this.desired=combatArrangement(state);}return;}
  const c=this.context;this.desired=combatArrangement(state);if(this.nextTime===null){this.mode=this.desired;this.nextTime=c.currentTime+.035;}if(this.nextTime<c.currentTime-.2)this.nextTime=c.currentTime+.025;
  this.playing=true;let scheduled=0;
  while(this.nextTime<c.currentTime+.12&&scheduled++<4){if(this.step%16===0)this.mode=this.desired;const tick=60/COMBAT_TEMPOS[this.mode]/4;
   // Keep the musical clock through the takeover; the domain score owns the mix.
   if(!domain&&this.voices.size<40)for(const e of combatScoreStep(this.mode,this.step)){if(this.voices.size>=40)break;const when=this.nextTime+(e.offset||0),source=e.kind==='note'?this.note?.(e.frequency,when,e.duration,e.volume,e.type,this.bus,e.endFrequency,e.pan,e.attack,e.sustain):this.noise?.(when,e.duration,e.volume,e.frequency,e.type,this.bus,e.pan);this.remember(source);}
   this.step++;this.nextTime+=tick;
  }
 }
 stop(){this.playing=false;this.nextTime=null;for(const source of [...this.voices]){try{source.stop();}catch{}this.voices.delete(source);}}
 reset(){this.stop();this.step=0;this.mode=this.desired='audition';this.state=null;this.epoch=null;}
 status(){return{playing:this.playing,mode:this.mode,bpm:COMBAT_TEMPOS[this.mode],bar:Math.floor(this.step/16)%8+1,voices:this.voices.size};}
 destroy(){this.reset();this.destroyed=true;this.context=null;this.bus=null;}
}
