import {DomainMusic} from './domain-music.js';
import {CombatMusic} from './combat-music.js';

/** Original synth score, with optional supplied recordings. Sound starts by user action. */
export class GameAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.paused = false;
    this.destroyed = false;
    this.sources = new Set();
    this.sourceNodes = new Map();
    this.lastCue = new Map();
    this.lastState = null;
    this.snapshot = null;
    this.nextBeat = 0;
    this.beat = 0;
    this.stage = 0;
    this.fever = false;
    this.cinematicActive = false;
    this.duckUntil = 0;
    this.musicLevel = .9;
    this.domainMusic = new DomainMusic();
    this.combatMusic = new CombatMusic({note:(...args)=>this._note(...args),noise:(...args)=>this._noise(...args)});
    this.lastEffectId = 0;
    this.practiceEpoch = null;
    this.waveCueKeys = new Set();
    this.pursuitCueKeys = new Set();
    this.normalCueKeys = new Set();
    this.personalityCueKeys = new Set();
    this.maxCueKeys = new Set();
    this.finalCueKeys = new Set();
  }

  setDomainTracks(tracks) {
    const configured = this.domainMusic.configure(tracks);
    this.domainMusic.sync(this.lastState, {enabled: this.enabled, paused: this.paused});
    return configured;
  }

  getDomainMusicStatus() { return this.domainMusic.status(); }

  reset() {
    this._clearSources(); this.lastCue.clear(); this.lastEffectId = 0;
    this.practiceEpoch=null;this.waveCueKeys.clear();this.pursuitCueKeys.clear();this.normalCueKeys.clear();this.personalityCueKeys.clear();this.maxCueKeys.clear();this.finalCueKeys.clear();
    this._volume(this.enabled && !this.paused ? .43 : 0);
    this.domainMusic.reset(); this.combatMusic.reset(); this.lastState = null; this.snapshot = null;
    this.cinematicActive = false; this.duckUntil = 0; this._musicVolume();
  }

  async setEnabled(value) {
    if (this.destroyed) return false;
    if (!value) {
      this.enabled = false;
      this.combatMusic.stop();this._clearSources();
      this.domainMusic.sync(this.lastState, {enabled: false, paused: this.paused});
      this._volume(0);
      return false;
    }
    try {
      if (!this.context) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return false;
        this.context = new Context();
        const c = this.context;
        this.master = c.createGain();
        this.master.gain.value = 0;
        const limiter = c.createDynamicsCompressor();
        limiter.threshold.value = -19;
        limiter.knee.value = 14;
        limiter.ratio.value = 5;
        limiter.attack.value = .004;
        limiter.release.value = .18;
        this.master.connect(limiter);
        if (typeof c.createWaveShaper === 'function') {
          const safety = c.createWaveShaper(), curve = new Float32Array(4096);
          for (let i=0;i<curve.length;i++) { const x=i/(curve.length-1)*2-1; curve[i]=.92*Math.tanh(x/.92); }
          safety.curve=curve; safety.oversample='2x'; limiter.connect(safety).connect(c.destination);
        } else limiter.connect(c.destination);
        this.music = c.createGain();
        this.music.gain.value = .9;
        this.music.connect(this.master);
        this.fx = c.createGain();
        this.fx.gain.value = .65;
        this.fx.connect(this.master);
        this.domainMusic.attach(c, this.master);this.combatMusic.attach(c,this.music);
        this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') await this.context.resume();
      this.enabled = this.context.state === 'running';
      this.nextBeat = this.context.currentTime + .04;
      this._volume(this.enabled && !this.paused ? .43 : 0);
      this.domainMusic.sync(this.lastState, {enabled: this.enabled, paused: this.paused});
      return this.enabled;
    } catch {
      this.enabled = false;
      return false;
    }
  }

  _volume(value) {
    if (!this.master || !this.context) return;
    const t = this.context.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(value, t, .025);
  }

  _musicVolume() {
    if (!this.music || !this.context) return;
    const t = this.context.currentTime;
    const level = this.domainMusic.playing ? 0 : this.cinematicActive ? .09 : t < this.duckUntil ? .22 : .9;
    if (level === this.musicLevel) return;
    this.musicLevel = level;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(level, t, level < .9 ? .025 : .18);
  }

  _duck(duration = .55) {
    if (!this.context) return;
    this.duckUntil = Math.max(this.duckUntil, this.context.currentTime + duration);
    this._musicVolume();
  }

  _track(source, nodes, start, end) {
    this.sources.add(source);
    this.sourceNodes.set(source,nodes);
    source.onended = () => {
      source._gameAudioEnded=true;this.sources.delete(source);
      this.sourceNodes.delete(source);
      source.disconnect();
      for (const node of nodes) node.disconnect();
    };
    source.start(start);
    source.stop(end);
  }

  _clearSources() {
    for (const source of [...this.sources]) {
      const nodes=this.sourceNodes.get(source)||[];
      try { source.stop(); } catch {} source.disconnect();
      for(const node of nodes)node.disconnect();
    }
    this.sources.clear();this.sourceNodes.clear();
  }

  _note(frequency, time, duration, volume = .14, type = 'triangle', bus = this.fx, endFrequency = frequency, pan = 0, attack = .009, sustain = 0) {
    if (!this.context || this.sources.size >= 96) return;
    const c = this.context, osc = c.createOscillator(), gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    if (endFrequency !== frequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, Math.min(.26,volume)), time + Math.max(.004, Math.min(attack, duration * .75)));
    if(sustain>0)gain.gain.setValueAtTime(Math.max(.0002,Math.min(.26,volume)),time+Math.max(attack,Math.min(.85,sustain)*duration));
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    const nodes=[gain];osc.connect(gain);
    if(pan && typeof c.createStereoPanner==='function'){const panner=c.createStereoPanner();panner.pan.value=Math.max(-.75,Math.min(.75,pan));gain.connect(panner).connect(bus);nodes.push(panner);}else gain.connect(bus);
    this._track(osc, nodes, time, time + duration + .025);return osc;
  }

  _noise(time, duration, volume, frequency = 1000, type = 'bandpass', bus = this.fx, pan = 0) {
    if (!this.context || this.sources.size >= 96) return;
    const c = this.context, source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = this.noise;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = .7;
    gain.gain.setValueAtTime(Math.max(.0002, Math.min(.22,volume)), time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    const nodes=[filter,gain];source.connect(filter).connect(gain);
    if(pan && typeof c.createStereoPanner==='function'){const panner=c.createStereoPanner();panner.pan.value=Math.max(-.75,Math.min(.75,pan));gain.connect(panner).connect(bus);nodes.push(panner);}else gain.connect(bus);
    this._track(source, nodes, time, time + duration + .015);return source;
  }

  cue(name, meta = {}) {
    if (!this.enabled || this.paused || !this.context || this.context.state !== 'running') return;
    if (name === 'cinematic' && !['domain','bossIntro','playerUltimate'].includes(meta.kind)) return;
    const t = this.context.currentTime + .005 + Math.max(0,Math.min(.12,Number(meta.audioDelay)||0));
    const gap = name === 'impact' ? .055 : name === 'sword' || name === 'slate' ? .075 : name === 'hit' ? .075 : .12;
    const key=Number.isFinite(meta.eventId)?`${name}:${meta.eventId}`:name;
    if (t - (this.lastCue.get(key) ?? -Infinity) < gap) return;
    this.lastCue.set(key, t);if(this.lastCue.size>384)this.lastCue.delete(this.lastCue.keys().next().value);
    const pan=Number.isFinite(meta.pan)?meta.pan:Number.isFinite(meta.x)?Math.max(-.7,Math.min(.7,(meta.x-640)/800)):0;
    const note = (f, offset, d, v = .14, type = 'triangle', end = f) => this._note(f, t + offset, d, v, type, this.fx, end,pan);
    const noise = (time,duration,volume,frequency=1000,type='bandpass') => this._noise(time,duration,volume,frequency,type,this.fx,pan);
    const swell = (f,offset,d,v,type='triangle',end=f) => this._note(f,t+offset,d,v,type,this.fx,end,pan,d*.65);
    if (['director-skill','actor-skill','director-ultimate','actor-ultimate','cinematic','domain','finish','void','shrine','purple','fatal','ultimate-finisher'].includes(name)) this._duck(name === 'cinematic' ? .9 : .55);
    if (['final-track','final-lock','final-cross','pursuit-track','pursuit-lock','blade-prealert','max-focus','max-lock','moving-track','moving-lock','casting-track','seat-track','cap-track'].includes(name))this._duck(.38);
    if (name === 'cinematic' && meta.kind === 'bossIntro') {
      const boss=meta.bossId||meta.actorId, ignis=boss==='ignis', mime=boss==='mime';
      const duration=Math.max(1,Math.min(4.6,Number(meta.duration)||3.4)), low=ignis?65.41:mime?58.27:boss==='sukuna'?43.65:49;
      // An original orchestral swell, without a damage transient or borrowed tune.
      [1,2,3,4.06,6].forEach((ratio,i)=>swell(low*ratio,i*.055,duration-i*.07,i===0?.13:.042,i%2?'sawtooth':'triangle',low*ratio*1.025));
      note(low,0,.7,.085,'sine',low*.8);noise(t,.35,.03,620,'lowpass');
      if(ignis){
        // Footlights flare like a stage ignition, then brass opens the curtain.
        noise(t+.15,.52,.035,1200,'lowpass');
        [261.63,392,523.25].forEach((f,i)=>swell(f,.18+i*.065,duration-.4,.026,'triangle',f*1.035));
      }else if(mime){
        // Three dry mask taps answer a detuned glass resonance.
        [0,.22,.47].forEach((offset,i)=>{note(466.16+i*58.27,.16+offset,.18,.032,'sine',415.3+i*52);noise(t+.16+offset,.045,.018,1800+i*450);});
        swell(349.23,.2,duration-.2,.024,'sine',369.99);swell(372,.3,duration-.3,.018,'sine',349.23);
      }else if(boss==='max'){
        [293.66,349.23,440].forEach((f,i)=>swell(f,.15+i*.18,duration-.45,.024,'sine',f*.995));
        [0,.18,.4].forEach((d,i)=>{noise(t+.35+d,.028,.023,2100+i*450);note(1400-i*160,.36+d,.045,.018,'sine',900);});
      }else swell(440,.2,duration-.2,.025,'sine',560);
      this._duck(duration);
    } else if (name === 'cinematic' && meta.kind === 'playerUltimate') {
      const actor=meta.character==='actor'||meta.actorId==='actor', duration=Math.max(.4,Math.min(2,Number(meta.duration)||1.6));
      swell(actor?65.41:73.42,0,duration,.12,'sine',actor?98:110);
      swell(actor?262:220,.04,duration-.04,.055,'triangle',actor?622:466);
      swell(actor?829:587,.1,duration-.1,.032,'sine',actor?1244:880);
      noise(t,.2,.025,actor?3500:1500);this._duck(duration);
    } else if (name === 'cinematic') {
      const gojo = meta.actorId === 'gojo' || meta.bossId === 'gojo';
      const sukuna = meta.actorId === 'sukuna' || meta.bossId === 'sukuna';
      const ignis = meta.actorId === 'ignis' || meta.bossId === 'ignis';
      const mime = meta.actorId === 'mime' || meta.bossId === 'mime';
      const duration = Math.max(.35, Math.min(2.4, Number(meta.duration) || 1.1));
      const fundamental = gojo ? 49 : sukuna ? 43.65 : ignis ? 65.41 : mime ? 58.27 : 55;
      note(fundamental,0,duration,.17,'sine',fundamental*.7);
      note(fundamental*2,.035,duration*.85,.055,'triangle',fundamental*1.5);
      noise(t,.32,.065,sukuna?360:560,'lowpass');
      if (gojo) [783.99,1174.66].forEach((f,i)=>note(f,.1+i*.08,duration*.8,.024,'sine',f*.98));
      if (sukuna) [147,211,388].forEach((f,i)=>note(f,.07+i*.045,duration*.65,.04,'sine',f*.99));
      if (ignis) { note(130.81,.05,duration*.7,.035,'triangle',98); noise(t+.1,.3,.035,1400); }
      if (mime) [174.61,184.99].forEach((f,i)=>note(f,.06+i*.07,duration*.8,.035,'sine',f*1.03));
      if(meta.actorId==='max'||meta.bossId==='max'){[146.83,155.56,440].forEach((f,i)=>swell(f,.08+i*.07,duration*.8,.025,'sine',f*1.025));noise(t+.1,.17,.025,1900);}
    } else if(name==='max-focus'){
      note(880,0,.055,.027,'sine',1046);note(1046,.085,.05,.024,'sine',1174);noise(t,.09,.014,1800);
    } else if(name==='max-lock'){
      noise(t,.023,.08,2700);note(1760,.012,.09,.035,'sine',1320);
    } else if(name==='max-shutter'){
      noise(t,.035,.105,2200);note(190,0,.085,.05,'triangle',125);noise(t+.055,.04,.052,3100);note(987,.04,.08,.022,'sine',830);
    } else if(name==='max-recall'){
      swell(380,0,.26,.036,'triangle',1200);noise(t+.09,.12,.025,2300);note(1320,.22,.085,.024,'sine',1174);
    } else if(name==='max-return'){
      noise(t,.11,.067,1700);note(1174,0,.12,.026,'triangle',587);noise(t+.065,.028,.032,3500);
    } else if(name==='max-archive-warning'){
      swell(meta.index>=4?880:440,0,.38,.04,'triangle',meta.index>=4?220:660);[0,.12,.24].forEach(d=>noise(t+d,.025,.028,1200));
    } else if(name==='max-archive-close'){
      noise(t,.075,.10,950,'lowpass');note(110,0,.16,.08,'triangle',55);noise(t+.055,.055,.045,2100);
    } else if(name==='max-archive-lock'){
      note(1318,0,.065,.052,'sine');note(1568,.085,.09,.04,'sine');noise(t,.018,.045,3000);
    } else if(name==='max-archive-flash'){
      [0,.045,.09].forEach((d,i)=>{noise(t+d,.035,.075-i*.014,2200+i*650);note(1568-i*196,d,.08,.03,'sine',988);});note(82,0,.3,.075,'triangle',49);
    } else if(name==='max-finish'){
      note(587,0,.18,.03,'sine');note(880,.09,.25,.023,'sine');
    } else if (name === 'director-skill') {
      noise(t,.035,.2,2400);noise(t+.018,.05,.13,1200);
      note(130,0,.3,.23,'sine',38);note(260,.035,.18,.08,'triangle',92);
      noise(t+.04,.2,.12,730,'lowpass');
    } else if (name === 'actor-skill') {
      [0,.065,.13].forEach((offset,i)=>{
        note(740+i*110,offset,.16,.075,'triangle',180+i*40);
        noise(t+offset,.11,.085,3300+i*300,'highpass');
      });
    } else if (name === 'director-buff') {
      [392,493.88,587.33].forEach((f,i)=>note(f,i*.08,.3,.085,'sine'));
      note(196,0,.45,.065);noise(t,.06,.045,1900);
    } else if (name === 'actor-buff') {
      [261.63,392,523.25,783.99].forEach((f,i)=>note(f,i*.075,.32,.07,'sine',f*1.025));
      noise(t+.14,.28,.04,2800,'bandpass');
    } else if (name === 'director-ultimate' || name === 'actor-ultimate') {
      // Preparation only. Every damaging strike is driven by an impact event below.
      const actor=name==='actor-ultimate';
      swell(actor?196:146.83,0,.42,.05,'sine',actor?392:293.66);
    } else if (name === 'ultimate-hit') {
      const index=Math.max(1,Math.min(12,Number(meta.hitIndex||meta.strikeIndex)||1));
      const total=Math.max(2,Number(meta.hitCount||meta.totalHits)||12), progress=(index-1)/(total-1), actor=meta.character==='actor';
      const role=meta.performanceRole, body=role==='action'||role==='bombardment', bow=role==='bow';
      note((body?92:130)+index*5,0,body?.10:.065,.09+progress*.045,'sine',body?42:58);
      noise(t,bow?.065:.045,.065+progress*.04,body?950:actor?3100+index*70:1800+index*65,actor&&!body?'highpass':'bandpass');
      note((bow?1174:actor?900:430)+index*31,0,bow?.10:.048,.026+progress*.018,actor?'sine':'triangle',bow?784:actor?550:240);
    } else if (name === 'ultimate-finisher') {
      note(75,0,.56,.22,'sine',29);note(146.83,.005,.19,.09,'triangle',61.74);
      noise(t,.07,.17,meta.character==='actor'?2500:1400);noise(t+.012,.27,.085,580,'lowpass');
      note(meta.character==='actor'?1320:587,.008,.21,.045,'sine',meta.character==='actor'?659:294);
      this._duck(.7);
    } else if (name === 'actor-pierce') {
      // A single real piercing hit: taut bow resonance and a short bright edge.
      note(110,0,.12,.10,'sine',65);noise(t,.075,.10,3900,'highpass');
      note(1244,0,.14,.052,'sine',622);note(622,.012,.18,.03,'triangle',466);
    } else if (name === 'actor-breakthrough') {
      const heavy=meta.finisher===true;note(heavy?98:150,0,heavy?.23:.09,heavy?.16:.09,'sine',heavy?38:65);noise(t,.055,heavy?.12:.075,3200,'highpass');
      note(1568,.006,.13,heavy?.05:.032,'sine',784);if(heavy){note(392,.018,.25,.04,'triangle',294);this._duck(.24);}
    } else if (name === 'director-cue') {
      const count=Math.max(1,Math.min(3,Number(meta.count)||1));
      note([330,440,587.33][count-1],0,.085,.045,'triangle');
      if(count===3)note(880,.065,.15,.032,'sine');
    } else if (name === 'director-burst') {
      note(82.41,0,.34,.18,'sine',31);noise(t,.07,.12,1200);
      noise(t+.012,.21,.07,540,'lowpass');note(220,.01,.16,.04,'triangle',110);this._duck(.3);
    } else if (name === 'director-light') {
      note(784,0,.14,.045,'sine',1046.5);noise(t,.055,.045,2700);
      note(196,0,.10,.075,'triangle',98);
    } else if (name === 'director-sound') {
      note(123.47,0,.16,.11,'sine',49);noise(t,.11,.065,900,'lowpass');
      note(370,0,.12,.026,'triangle',185);
    } else if (name === 'actor-ready') {
      const f=meta.kind==='method-ready'?659.25:523.25;note(f,0,.12,.04,'sine');note(f*1.5,.06,.18,.032,'sine');
    } else if (name === 'crew-ready') {
      note(196,0,.12,.035,'triangle');note(392,.045,.16,.035,'sine');
    } else if (name === 'signature') {
      // Short original identity motif, never speech or a substitute for recorded voices.
      const actor=meta.character==='actor';
      [actor?392:293.66,actor?587.33:440].forEach((f,i)=>note(f,i*.065,.17,.035,'sine'));
    } else if (name === 'blade-prealert') {
      const vertical=meta.axis==='y', fromTop=Number(meta.normalY)>0;
      note(vertical?(fromTop?784:392):493.88,0,.13,.046,'triangle',vertical?(fromTop?659.25:523.25):622.25);
      note(98,.025,.18,.025,'sine',82.41);
    } else if (name === 'blade-release') {
      noise(t,.18,.075,2300,'highpass');note(740,0,.16,.028,'sine',246.94);
    } else if (name === 'blade-pass') {
      noise(t,.13,.052,3200,'highpass');note(880,0,.085,.017,'sine',440);
    } else if (name === 'pursuit-track') {
      // A short original rise announces a real tracking phase, without a hit transient.
      const cross=meta.cross===true||meta.crossing===true;
      swell(cross?164.81:146.83,0,.32,.028,'sine',cross?246.94:220);
      swell(cross?349.23:311.13,.025,.29,.022,'triangle',cross?493.88:415.3);
    } else if (name === 'pursuit-lock') {
      // Lock is deliberately brief and clearer than the moving-target cue.
      noise(t,.025,.055,2600,'highpass');note(1046.5,0,.075,.047,'sine',880);
      note(220,.018,.11,.026,'triangle',164.81);
    } else if (name === 'pursuit-release') {
      const cross=meta.cross===true||meta.crossing===true, follow=meta.followup===true;
      const index=Math.max(1,Math.min(8,Number(meta.shotIndex||meta.slashIndex||meta.strikeIndex||meta.index)||1));
      noise(t,cross?.19:.14,cross?.072:.065,2600+index*140,'highpass');
      note(cross?1046.5:follow?880:740,0,cross?.18:.13,.033,'sine',cross?261.63:220);
      if(cross)note(130.81,.012,.17,.032,'triangle',65.41);
    } else if (name === 'pursuit-pass') {
      noise(t,.095,.039,3900,'highpass');note(1174.66,0,.07,.014,'sine',587.33);
    } else if (name === 'cap-track') {
      // Fingernail on a ridged metal cap: small, bright preparation, never a hit cue.
      noise(t,.028,.026,4100,'highpass');note(988,0,.11,.026,'sine',740);
    } else if (name === 'cap-lock') {
      note(1320,0,.065,.037,'sine',988);noise(t,.02,.027,5200,'highpass');
    } else if (name === 'cap-release') {
      const i=Math.max(1,Math.min(3,Number(meta.index)||1));
      noise(t,.034,.065,3900+i*230,'highpass');note(1260+i*115,0,.13,.049,'sine',510+i*90);
      note(238+i*28,.007,.09,.045,'triangle',110);noise(t+.025,.105,.025,2600,'bandpass');
    } else if (name === 'casting-track') {
      note(196,0,.19,.035,'triangle',294);note(440,.06,.11,.025,'sine',523);
    } else if (name === 'casting-lock') {
      noise(t,.024,.05,1700);note(587,0,.075,.035,'triangle',440);
    } else if (name === 'casting-dash') {
      // Two shoe beats followed by a short air rush locate the moving body.
      [0,.065].forEach((o,i)=>{noise(t+o,.045,.045,540+i*190,'lowpass');note(95+i*24,o,.07,.045,'sine',48);});
      noise(t,.18,.04,2100,'highpass');note(294,0,.15,.024,'triangle',147);
    } else if (name === 'casting-stop') {
      noise(t,.19,.033,1400,'bandpass');note(110,0,.12,.032,'sine',73);
    } else if (name === 'seat-track') {
      note(783.99,0,.16,.035,'sine');note(587.33,.055,.17,.029,'sine');
    } else if (name === 'seat-lock') {
      note(1174.66,0,.09,.034,'sine',880);noise(t,.025,.026,3200);
    } else if (name === 'seat-close') {
      noise(t,.036,.067,1900);note(196,0,.15,.052,'triangle',98);
      note(784,.02,.11,.024,'sine',587.33);noise(t+.05,.1,.025,780,'lowpass');
    } else if (name === 'moving-track') {
      swell(164.81,0,.23,.027,'triangle',246.94);noise(t,.09,.018,3600,'highpass');
    } else if (name === 'moving-lock') {
      note(1318.5,0,.055,.035,'sine',988);noise(t,.022,.04,4400,'highpass');
    } else if (name === 'moving-dash') {
      const i=Math.max(1,Math.min(3,Number(meta.index)||1));
      noise(t,.14,.064,3200+i*260,'highpass');note(784+i*85,0,.13,.032,'sine',220);
      note(110,.008,.12,.032,'triangle',55);
    } else if (name === 'moving-followup') {
      noise(t,.043,.073,4700,'highpass');note(1568,0,.085,.035,'sine',784);
      noise(t+.028,.12,.027,2300);note(146.83,0,.09,.035,'sine',65.41);
    } else if (name === 'moving-stop') {
      noise(t,.11,.026,1500,'bandpass');note(98,0,.12,.032,'triangle',65.41);
    } else if (name === 'final-record') {
      // Dry footstep/film ticks mark recorded motion, without a damage transient.
      note(196,0,.12,.025,'triangle',294);noise(t,.032,.025,2500,'bandpass');
      note(783.99,.045,.12,.019,'sine',659.25);
    } else if (name === 'final-track') {
      swell(146.83,0,.23,.026,'triangle',311.13);noise(t,.09,.018,3500,'highpass');
    } else if (name === 'final-lock') {
      note(1396.91,0,.065,.04,'sine',1046.5);noise(t,.024,.04,4200,'highpass');
      note(220,.025,.09,.025,'triangle',164.81);
    } else if (name === 'final-cross') {
      // A crossing blade wall gets two restrained stereo sweeps, not a fake hit.
      noise(t,.15,.055,3100,'highpass');noise(t+.035,.14,.038,3900,'highpass');
      note(880,0,.14,.03,'sine',246.94);note(130.81,.012,.17,.027,'triangle',65.41);
    } else if (name === 'final-release') {
      const i=Math.max(1,Math.min(12,Number(meta.index)||1));
      noise(t,.12,.054,2900+i*90,'highpass');note(740+i*26,0,.12,.028,'sine',220);
    } else if (name === 'final-replay') {
      noise(t,.04,.06,3800,'highpass');note(164.81,0,.14,.046,'triangle',65.41);
      note(1174.66,.018,.1,.025,'sine',587.33);
    } else if (name === 'final-dash') {
      noise(t,.16,.06,3500,'highpass');note(1046.5,0,.15,.03,'sine',261.63);
      note(98,.008,.12,.035,'triangle',49);
    } else if (name === 'final-finish') {
      noise(t,.13,.025,1800,'bandpass');note(130.81,0,.2,.035,'triangle',65.41);
      note(523.25,.035,.16,.022,'sine',392);
    } else if (name === 'counter-open') {
      // A bright opening answers the dark takeover score; no false hit transient.
      [329.63,493.88,659.25].forEach((f,i)=>note(f,i*.045,.24,.044,'triangle'));
      noise(t,.16,.025,3600,'highpass');this._duck(.38);
    } else if (name === 'trial-light') {
      const n=Math.max(1,Math.min(3,Number(meta.index)||1));
      note([523.25,659.25,783.99][n-1],0,.16,.045,'sine');
      if(meta.success===false)note(146.83,0,.12,.035,'triangle',110);
    } else if (name === 'audition-pick') {
      if(meta.success){note(659.25,0,.14,.045,'sine');note(987.77,.045,.18,.034,'sine');}
      else{note(174.61,0,.18,.05,'triangle',110);noise(t,.06,.035,1600);}
    } else if (name === 'pattern-replay') {
      [0,.09,.18].forEach((o,i)=>note(440+i*110,o,.13,.032,'sine',220+i*55));
    } else if (name === 'pattern-encore') {
      noise(t,.08,.045,2300,'highpass');note(164.81,0,.22,.035,'triangle',82.41);
    } else if (name === 'ignite') {
      note(105,0,.25,.115,'sine',58);noise(t,.22,.09,950,'lowpass');
      noise(t+.06,.07,.04,2800);
    } else if (name === 'light-sweep') {
      note(220,0,.2,.09,'triangle',110);noise(t,.22,.07,1850,'bandpass');
    } else if (name === 'spark') {
      [0,.05,.11].forEach((offset,i)=>{noise(t+offset,.055,.045,2300+i*400);note(660+i*80,offset,.06,.022,'sine');});
    } else if (name === 'ribbon') {
      noise(t,.15,.075,2400,'highpass');note(520,0,.18,.07,'triangle',160);
      noise(t+.055,.12,.035,1500);
    } else if (name === 'mask') {
      note(165,0,.13,.12,'triangle',75);note(440,.015,.2,.035,'sine',415);
      noise(t,.09,.085,1250);
    } else if (name === 'feint') {
      noise(t,.09,.035,3400,'highpass');note(620,0,.06,.02,'sine',740);
    } else if (name === 'blue') {
      note(95,0,.35,.17,'sine',320);note(640,.03,.42,.075,'triangle',210);
      noise(t,.3,.08,1500,'bandpass');
    } else if (name === 'red') {
      note(290,0,.28,.2,'sine',46);note(80,.02,.35,.13);
      noise(t,.17,.13,1100);
    } else if (name === 'purple') {
      note(73.42,0,.65,.19,'sine',49);note(146.83,.02,.45,.09,'triangle',293.66);
      note(587.33,.1,.45,.065,'sine',880);noise(t,.5,.14,1800);
    } else if (name === 'slash') {
      noise(t,.14,.13,4100,'highpass');note(1300,0,.1,.075,'triangle',240);
    } else if (name === 'fire') {
      note(115,0,.45,.2,'sine',42);noise(t,.48,.16,800,'lowpass');
      for(let i=0;i<4;i++)noise(t+.06+i*.07,.1,.055,1700+i*300);
    } else if (name === 'void') {
      note(49,0,1.0,.16);note(97.99,.1,.95,.085,'sine',82.41);
      [1108.73,1661.22,2217.46].forEach((f,i)=>note(f,.12+i*.09,.75,.025,'sine',f*.97));
      noise(t,.7,.065,400,'lowpass');
    } else if (name === 'shrine') {
      [73.42,147,211,388,603].forEach((f,i)=>note(f,i*.025,1.05-i*.08,i===0?.17:.055,'sine',f*.997));
      noise(t+.06,.35,.1,850);note(43.65,.1,.85,.13);
    } else if (name === 'domain-hit') {
      // One heavy impact per real 40% hit; no extra hit sounds from overlapping blades.
      note(73.42,0,.38,.14,'sine',36.7);noise(t,.09,.12,1450);
      note(220,.025,.23,.055,'triangle',92);noise(t+.055,.13,.045,3400,'highpass');
      this._duck(.24);
    } else if (name === 'fatal') {
      note(82.41,0,.6,.18,'sine',28);note(146.83,.02,.65,.09,'triangle',65.41);
      noise(t,.32,.14,900);note(493.88,.2,.75,.04,'sine',246.94);
    } else if (name === 'slate') {
      const tier = Math.max(1, Math.min(4, Number(meta.comboIndex) || 1));
      noise(t,.025+tier*.005,.08+tier*.015,2200+tier*180);
      noise(t+.015,.035+tier*.006,.045+tier*.012,1150);
      note(520+tier*125,0,.035+tier*.008,.035+tier*.008,'triangle',260);
    } else if (name === 'sword') {
      const tier = Math.max(1, Math.min(4, Number(meta.comboIndex) || 1));
      noise(t,.055+tier*.02,.065+tier*.014,2400+tier*420,'highpass');
      note(580+tier*170,0,.055+tier*.018,.025+tier*.008,'triangle',170+tier*20);
    } else if (name === 'impact') {
      const tier=Math.max(1,Math.min(4,Number(meta.comboIndex)||1)), hit=Math.max(1,Math.min(3,Number(meta.hitIndex||meta.strikeIndex)||1));
      const heavy=meta.finisher===true||meta.kind==='finisher', actor=meta.character==='actor';
      note(164-tier*8+hit*4,0,heavy?.25:.075,.11+tier*.012,'sine',heavy?32:65);
      noise(t,actor?.043+hit*.008:.023+hit*.006,.075+tier*.01,actor?2800+hit*420:1750+hit*310,actor?'highpass':'bandpass');
      note((actor?1050:480)+tier*65+hit*75,.003,actor?.065:.04,.028+tier*.005,actor?'sine':'triangle',actor?440:230);
      if(heavy){this._duck(.18);note(49,.012,.27,.105);noise(t+.02,.1,.075,1100);}
    } else if (name === 'landing') {
      const power = Math.max(.3, Math.min(2.5, Number(meta.power) || 1));
      note(85,0,.14+power*.04,.07+power*.035,'sine',34);
      noise(t,.075+power*.025,.06+power*.025,570,'lowpass');
      noise(t+.02,.09,.025+power*.014,2200);
    } else if (name === 'perfect') {
      note(880,0,.075,.12);note(1174.66,.055,.13,.12);note(1760,.11,.15,.065,'sine');
    } else if (name === 'cheer' || name === 'fever') {
      const big=name==='fever';
      [440,554.37,659.25].forEach((f,i)=>note(f,i*.07,big?.4:.22,.08,'triangle',f*1.25));
      for(let i=0;i<(big?4:2);i++)noise(t+.1+i*.1,.07,.07,1400);
      if(big)note(110,0,.35,.17,'sine',55);
    } else if (name === 'domain') {
      note(61.74,0,.6,.2,'sine',41.2);note(123.47,.06,.45,.08,'triangle',82.41);
      [440,415.3,293.66].forEach((f,i)=>note(f,.08+i*.08,.22,.07,'sine'));
      noise(t,.4,.1,600,'lowpass');
    } else if (name === 'finish') {
      [293.66,369.99,440,587.33,739.99,880].forEach((f,i)=>note(f,i*.09,.44,.12));
      note(146.83,.3,.7,.17);note(220,.5,.55,.09);
      for(let i=0;i<5;i++)noise(t+.25+i*.12,.06,.065,1300);
    } else if (name === 'tick') {
      note(740,0,.06,.07,'sine');
    } else if (name === 'hit') {
      noise(t, .075, .16, 720);
      note(145, 0, .095, .18, 'triangle', 52);
    } else if (name === 'dodge') {
      noise(t, .15, .11, 3400, 'highpass');
      note(520, 0, .11, .04, 'sine', 155);
    } else if (name === 'boss') {
      note(73.42, 0, .45, .17, 'triangle', 65.41);
      note(146.83, .06, .38, .09, 'sine', 130.81);
      noise(t, .28, .08, 480, 'lowpass');
    } else if (name === 'clear' || name === 'start') {
      const tones = name === 'clear' ? [293.66, 369.99, 440, 587.33, 739.99] : [293.66, 440, 587.33];
      tones.forEach((f, i) => note(f, i * .09, .32, .115));
      if (name === 'clear') note(146.83, .3, .6, .16);
    } else if (name === 'dead') {
      [293.66, 261.63, 220, 146.83].forEach((f, i) => note(f, i * .14, .32, .12));
    }
  }

  update(state, dt) {
    if (this.destroyed) return;
    // Practice can replace a state or reset the same object. Both release scheduled tails.
    const epoch=state?.practice?.epoch??null;
    if(this.lastState && state && (this.lastState!==state||this.practiceEpoch!==epoch))this.reset();
    this.practiceEpoch=epoch;
    this.domainMusic.sync(state, {enabled:this.enabled,paused:this.paused});
    // Event IDs are observed while muted too; enabling sound never replays old hits.
    if (state?.player) {
      const p=state.player,stats=state.stats||{},b=state.boss,effects=state.effects||[];
      const cinematic=state.cinematic?.remaining>0?state.cinematic:null;
      this.cinematicActive=!!cinematic;
      const newState=this.lastState!==state, fresh=newState||this.stage!==state.stage, old=this.snapshot;
      if(newState)this.lastEffectId=0;
      const now={skills:stats.skills||0,buffs:stats.buffs||0,dodges:stats.dodges||0,ultimates:stats.ultimates||0,
        damage:stats.damageTaken||0,justHits:stats.justHits||0,justDodges:stats.justDodges||0,kills:stats.kills||0,
        active:!!b?.active,cueMarks:b?.cueMarks||0,status:state.status,character:p.character,fever:Number(state.fever)>0||state.fever===true,
        cinematic:cinematic?.id||0,activeHazard:Math.max(0,...(state.hazards||[]).filter(h=>h.active).map(h=>h.id)),
        activeKind:[...(state.hazards||[])].filter(h=>h.active).sort((a,b)=>b.id-a.id)[0]?.kind};
      const incoming=effects.filter(e=>e.id>this.lastEffectId).sort((a,b)=>a.id-b.id);
      if(cinematic && (fresh || now.cinematic!==(old?.cinematic||0)))this.cue('cinematic',{...cinematic,eventId:cinematic.id});
      if(!fresh&&old){
        if(now.ultimates>old.ultimates&&!cinematic)this.cue(now.character+'-ultimate');
        if(now.skills>old.skills)this.cue(now.character+'-skill');
        if(now.buffs>old.buffs)this.cue(now.character+'-buff');
        // One audible attack per actual strike, even if it hits several targets.
        // Repeated effects, decorative slashes, misses and zero damage never become hits.
        const strikes=new Map();
        for(const e of incoming)if(e.type==='impact'&&Number(e.damage)>0){
          const key=e.attackId?`${e.attackId}:${e.hitIndex||e.strikeIndex||1}:${e.kind}:${e.signature||e.source||''}:${e.cueIndex??e.staffType??''}`:`event:${e.id}`;
          if(!strikes.has(key)||e.finisher)strikes.set(key,e);
        }
        const hits=[...strikes.values()];
        // Normal engine frames contain <=3 strikes. Bound catch-up audio after a stalled frame.
        const audible=hits.length<=8?hits:[...hits.slice(0,7),hits.at(-1)];
        audible.forEach((e,i)=>{
          const source=e.signature||e.source;
          const name=e.kind==='ultimate'?(e.finisher?'ultimate-finisher':'ultimate-hit'):
            source==='adlib-arrow'?'actor-pierce':source==='method-strike'?'actor-breakthrough':
            source==='cue-detonation'?'director-burst':source==='staff'?(e.staffType==='sound'?'director-sound':'director-light'):'impact';
          const index=e.hitIndex||e.strikeIndex||1, base=Number.isFinite(e.x)?(e.x-640)/1000:0;
          this.cue(name,{...e,character:e.character||now.character,eventId:e.id,audioDelay:i*.014,
            pan:Math.max(-.65,Math.min(.65,base+(index%2?.13:-.13)))});
        });
        // The engine emits each real wave warning, launch and nearby pass once.
        // These are directional motion cues; they never imply player damage.
        const waveEvents=incoming.filter(e=>e.type==='bladeWave'&&['warning','launch','pass'].includes(e.kind));
        for(const [i,e] of waveEvents.slice(0,8).entries()){
          const waveKey=e.waveId!==undefined&&e.waveId!==null?`wave:${e.waveId}`:`event:${e.id}`;
          const key=`${e.kind}:${waveKey}`;if(this.waveCueKeys.has(key))continue;
          this.waveCueKeys.add(key);if(this.waveCueKeys.size>256)this.waveCueKeys.delete(this.waveCueKeys.values().next().value);
          const nx=Number.isFinite(e.normalX)?e.normalX:0, ny=Number.isFinite(e.normalY)?e.normalY:0;
          const name={warning:'blade-prealert',launch:'blade-release',pass:'blade-pass'}[e.kind];
          this.cue(name,{...e,eventId:e.id,axis:Math.abs(ny)>Math.abs(nx)?'y':'x',
            pan:Math.max(-.65,Math.min(.65,nx*(e.kind==='pass'?.38:-.6)))||0,audioDelay:i*.012});
        }
        // Chasing slashes report their own tracking/lock/release/nearby-pass milestones.
        // A slash ID is consumed even while muted, so enabling audio never replays it.
        const pursuitEvents=incoming.filter(e=>e.type==='pursuitSlash'&&['tracking','lock','launch','pass'].includes(e.kind));
        for(const [i,e] of pursuitEvents.slice(0,8).entries()){
          const slashKey=e.slashId!==undefined&&e.slashId!==null?`slash:${e.slashId}`:`event:${e.id}`;
          const key=`${e.kind}:${slashKey}`;if(this.pursuitCueKeys.has(key))continue;
          this.pursuitCueKeys.add(key);if(this.pursuitCueKeys.size>256)this.pursuitCueKeys.delete(this.pursuitCueKeys.values().next().value);
          const nx=Number.isFinite(e.normalX)?e.normalX:0, ny=Number.isFinite(e.normalY)?e.normalY:0;
          const name={tracking:'pursuit-track',lock:'pursuit-lock',launch:'pursuit-release',pass:'pursuit-pass'}[e.kind];
          this.cue(name,{...e,eventId:e.id,axis:Math.abs(ny)>Math.abs(nx)?'y':'x',
            pan:Math.max(-.65,Math.min(.65,nx*(e.kind==='pass'?.4:-.58)))||0,audioDelay:i*.012});
        }
        // Ordinary tracking attacks share the same readable lock/release vocabulary.
        // Initial multi-shot tracking is one cue; each actual lock and launch stays distinct.
        for(const [i,e] of incoming.filter(e=>e.type==='bossShot'&&['tracking','lock','launch'].includes(e.kind)).slice(0,12).entries()){
          const group=e.kind==='tracking'?`attack:${e.attackId??(e.bossId+':'+e.time)}`:`shot:${e.shotId??e.id}`;
          const key=`${state.stage}:${e.kind}:${group}`;if(this.normalCueKeys.has(key))continue;
          this.normalCueKeys.add(key);if(this.normalCueKeys.size>256)this.normalCueKeys.delete(this.normalCueKeys.values().next().value);
          const name=e.kind==='tracking'?(e.bossId==='mime'?'feint':'pursuit-track'):e.kind==='lock'?'pursuit-lock':e.bossId==='ignis'?'light-sweep':e.bossId==='mime'?'mask':'pursuit-release';
          this.cue(name,{...e,eventId:e.id,pan:Math.max(-.6,Math.min(.6,((Number(e.originX)||640)-640)/1000)),audioDelay:Math.min(.06,i*.008)});
        }
        // Personality attacks report real milestones. A release, footstep or frame snap
        // never manufactures a player-hit sound, and consumed cues never replay on unmute.
        const personalNames={ignis:{tracking:'cap-track',lock:'cap-lock',launch:'cap-release'},
          mime:{tracking:'casting-track',lock:'casting-lock',launch:'casting-dash',finish:'casting-stop'},
          gojo:{tracking:'seat-track',lock:'seat-lock',launch:'seat-close'},
          sukuna:{tracking:'moving-track',lock:'moving-lock',launch:'moving-dash',followup:'moving-followup',finish:'moving-stop'}};
        for(const [i,e] of incoming.filter(e=>e.type==='personalityShot').slice(0,12).entries()){
          const name=personalNames[e.bossId]?.[e.kind];if(!name)continue;
          const group=e.bossId==='ignis'&&e.kind==='tracking'?`attack:${e.attackId}`:`shot:${e.shotId??e.index??e.id}`;
          const key=`${state.stage}:${e.attackId}:${e.kind}:${group}`;if(this.personalityCueKeys.has(key))continue;
          this.personalityCueKeys.add(key);if(this.personalityCueKeys.size>256)this.personalityCueKeys.delete(this.personalityCueKeys.values().next().value);
          const origin=Number.isFinite(e.originX)?e.originX:Number.isFinite(e.x)?e.x:640;
          this.cue(name,{...e,eventId:e.id,pan:Math.max(-.62,Math.min(.62,(origin-640)/800)),audioDelay:Math.min(.06,i*.008)});
        }
        for(const [i,e] of incoming.filter(e=>e.type==='finalShot').slice(0,16).entries()){
          const name=e.kind==='tracking'?(e.patternKind==='retake'?'final-record':'final-track'):e.kind==='lock'?'final-lock':e.kind==='finish'?'final-finish':e.kind==='phase'?'final-cross':e.kind==='launch'?(e.shotKind==='final-dash'?'final-dash':e.shotKind==='final-projectile'?'final-release':e.shotKind==='final-trail'||e.patternKind==='retake'?'final-replay':e.patternKind==='cross-edit'?'final-cross':'final-release'):null;
          if(!name)continue;const key=`${state.stage}:${e.attackId}:${e.shotId??e.index}:${e.index}:${e.kind}`;if(this.finalCueKeys.has(key))continue;
          this.finalCueKeys.add(key);if(this.finalCueKeys.size>384)this.finalCueKeys.delete(this.finalCueKeys.values().next().value);
          const x=e.origin?.x??e.originX??e.x??640;this.cue(name,{...e,eventId:e.id,pan:Math.max(-.62,Math.min(.62,(x-640)/800)),audioDelay:Math.min(.07,i*.009)});
        }
        const maxNames={tracking:'max-focus',lock:'max-lock',launch:'max-shutter','return-warning':'max-recall',return:'max-return',finish:'max-finish','archive-warning':'max-archive-warning','archive-close':'max-archive-close','archive-lock':'max-archive-lock','archive-flash':'max-archive-flash'};
        for(const [i,e] of incoming.filter(e=>e.type==='maxShot').slice(0,12).entries()){
          const name=maxNames[e.kind];if(!name)continue;
          const key=`${state.stage}:${e.attackId}:${e.shotId}:${e.index}:${e.kind}`;if(this.maxCueKeys.has(key))continue;
          this.maxCueKeys.add(key);if(this.maxCueKeys.size>256)this.maxCueKeys.delete(this.maxCueKeys.values().next().value);
          this.cue(name,{...e,eventId:e.id,pan:Math.max(-.6,Math.min(.6,((Number.isFinite(e.x)?e.x:640)-640)/850)),audioDelay:Math.min(.06,i*.009)});
        }
        for(const e of incoming.filter(e=>['counterOpen','patternCue','rehearsalResult','auditionHit'].includes(e.type)).slice(0,6)){
          const name=e.type==='counterOpen'?'counter-open':e.type==='rehearsalResult'?'trial-light':
            e.type==='auditionHit'?'audition-pick':{rehearsal:'light-sweep',audition:'feint',replay:'pattern-replay',encore:'pattern-encore'}[e.kind];
          if(name)this.cue(name,{...e,eventId:e.id,pan:Math.max(-.6,Math.min(.6,((Number(e.x)||640)-640)/1000))});
        }
        // Readiness and short identity motifs are state signals, never damage sounds.
        const signals=incoming.filter(e=>e.type==='signature');
        for(const e of signals.slice(0,4)){
          if(e.kind==='cue-mark'&&e.count>=3&&old.cueMarks>=3)continue;
          const name=e.kind==='cue-mark'?'director-cue':e.kind==='crew-ready'?'crew-ready':
            ['adlib-ready','method-ready'].includes(e.kind)?'actor-ready':null;
          if(name)this.cue(name,{...e,eventId:e.id});
        }
        if(!signals.length){
          const line=incoming.find(e=>e.type==='dialogue'&&e.speaker==='player');
          if(line&&!cinematic)this.cue('signature',{character:line.character||line.actorId,eventId:line.id});
        }
        for(const e of incoming)if(e.type==='landing')this.cue('landing',{...e,eventId:e.id});
        const domain=incoming.find(e=>e.type==='domaincut'&&!e.fatal&&(state.hazards||[]).some(h=>h.kind==='domain'));
        if(domain)this.cue(b?.id==='gojo'?'void':b?.id==='sukuna'?'shrine':'domain',{bossId:b?.id,eventId:domain.id});
        if(now.activeHazard>old.activeHazard){const cue={blue:'blue',red:'red',purple:'purple',slash:'slash',cleave:'slash','fire-arrow':'fire','fire-burst':'fire',footlight:'ignite','light-sweep':'light-sweep','spark-spot':'spark','ribbon-thrust':'ribbon','ribbon-cross':'ribbon','mask-feint':'feint','mask-slam':'mask','replay':'pattern-replay','encore-slash':'slash','encore-finisher':'pursuit-release'}[now.activeKind];if(cue)this.cue(cue);}
        if(now.fever&&!old.fever)this.cue('fever');
        if(now.justHits>old.justHits||now.justDodges>old.justDodges)this.cue('perfect');
        if(now.kills>old.kills)this.cue('cheer');
        if(now.dodges>old.dodges)this.cue('dodge');
        if(now.damage>old.damage){const hit=incoming.find(e=>e.type==='domainHit');this.cue(hit?'domain-hit':'hit',hit?{eventId:hit.id}:{});}
        if(now.active&&!old.active&&!cinematic)this.cue('boss');
        if(now.status!==old.status){
          if(now.status==='gameover')this.cue(state.endReason==='domain'?'fatal':'dead');
          if(now.status==='stageclear'||now.status==='victory')this.cue('clear');
          if(now.status==='finished')this.cue('finish');
        }
      }
      this.lastEffectId=Math.max(this.lastEffectId,...effects.map(e=>e.id||0));
      this.lastState=state;this.snapshot=now;this.fever=now.fever;this.stage=state.stage;
    }else this.cinematicActive=false;
    this._musicVolume();
    this.combatMusic.sync(state,{enabled:this.enabled,paused:this.paused,domain:this.domainMusic.playing});
  }

  pause(value) {
    this.paused = !!value;
    if(this.paused){this.combatMusic.stop();this._clearSources();}
    this.domainMusic.sync(this.lastState, {enabled: this.enabled, paused: this.paused});
    this._volume(this.enabled && !this.paused ? .43 : 0);
    if (!this.paused && this.context) this.nextBeat = this.context.currentTime + .04;
  }

  destroy() {
    this.enabled = false;
    this.destroyed = true;
    this.domainMusic.destroy();this.combatMusic.destroy();
    this._clearSources();
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    this.context = null;
  }
}
