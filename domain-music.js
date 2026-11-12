/** Original recordings synthesized for this game, with no anime audio or melody. */
export const DOMAIN_MUSIC_TRACKS = Object.freeze({
  ignis: Object.freeze({src: new URL('./assets/domain-caden-original.wav?v=8', import.meta.url).href, volume: .55, playbackRate: .94, filterType: 'lowpass', filterHz: 1250, loop: true}),
  mime: Object.freeze({src: new URL('./assets/domain-prism-original.wav?v=8', import.meta.url).href, volume: .60, playbackRate: .86, filterType: 'bandpass', filterHz: 680, loop: true}),
  gojo: Object.freeze({src: new URL('./assets/domain-prism-original.wav?v=8', import.meta.url).href, volume: .66, loop: true}),
  sukuna: Object.freeze({src: new URL('./assets/domain-caden-original.wav?v=8', import.meta.url).href, volume: .72, loop: true}),
});

function track(value) {
  if (typeof value === 'string') value = {src: value};
  if (!value || typeof value.src !== 'string' || !value.src.trim()) return null;
  const src = value.src.trim();
  if (/^(?!https?:|blob:|data:|file:)[a-z][a-z\d+.-]*:/i.test(src)) return null;
  return {src, start: Math.max(0, Number(value.start) || 0),
    volume: Math.max(0, Math.min(1, Number.isFinite(value.volume) ? value.volume : .72)), loop: value.loop !== false,
    playbackRate: Math.max(.65, Math.min(1.35, Number(value.playbackRate) || 1)),
    filterType: ['lowpass','bandpass'].includes(value.filterType) ? value.filterType : null,
    filterHz: Math.max(100, Math.min(12000, Number(value.filterHz) || 1200))};
}

/** Decoded recordings share the Web Audio master, so mute and pause are immediate. */
export class DomainMusic {
  constructor(tracks = DOMAIN_MUSIC_TRACKS) {
    this.context = null; this.bus = null; this.segment = null; this.voice = null;
    this.buffers = new Map(); this.pending = new Map(); this.errors = new Map(); this.decoded = new Set();
    this.enabled = false; this.paused = false; this.destroyed = false; this.revision = 0;
    this.configure(tracks);
  }
  get playing() { return !!this.voice; }
  configure(tracks = {}) {
    this.stop(); this.revision++;
    for (const controller of this.pending.values()) controller.abort();
    this.pending.clear(); this.buffers.clear(); this.errors.clear(); this.decoded.clear();
    this.tracks = Object.fromEntries(['ignis','mime','gojo','sukuna'].map(id => [id, track(tracks[id])]));
    return {...this.tracks};
  }
  attach(context, bus) { this.context = context; this.bus = bus; }
  async load(config) {
    if (!config || !this.context || this.destroyed) return null;
    if (this.buffers.has(config.src)) return this.buffers.get(config.src);
    const revision = this.revision, context = this.context, controller = new AbortController();
    this.pending.set(config.src, controller);
    const promise = (async () => {
      try {
        const response = await fetch(config.src, {signal: controller.signal});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('Invalid audio duration');
        if (revision !== this.revision || this.destroyed) return null;
        this.decoded.add(config.src);
        return buffer;
      } catch (error) {
        if (revision === this.revision && error?.name !== 'AbortError') this.errors.set(config.src, error?.message || 'Audio load failed');
        return null;
      } finally {
        if (this.pending.get(config.src) === controller) this.pending.delete(config.src);
      }
    })();
    this.buffers.set(config.src, promise);
    return promise;
  }
  sync(state, {enabled = false, paused = false} = {}) {
    const frozen = paused || !!(state?.cinematic?.remaining > 0 && state.cinematic.kind !== 'domain');
    this.enabled = enabled; this.paused = frozen;
    if (this.destroyed) return;
    const hazard = state?.status === 'playing' && state.hazards?.find(h => h.kind === 'domain' && h.life > 0);
    const cinematic = state?.status === 'playing' && state.cinematic?.kind === 'domain' && state.cinematic.remaining > 0 ? state.cinematic : null;
    const bossId = cinematic?.bossId || cinematic?.actorId || state?.boss?.id;
    const key = hazard?.id ?? cinematic?.id;
    if (!hazard && !cinematic) this.reset();
    else if (!this.segment || this.segment.state !== state || this.segment.key !== key || this.segment.bossId !== bossId || this.segment.practiceEpoch !== (state?.practice?.epoch ?? null)) {
      this.stop(); this.segment = {state, key, bossId, practiceEpoch:state?.practice?.epoch ?? null, elapsed:0, lastTime:Number(state.runTime)||0, frozen};
    }
    if (this.segment) {
      const now=Number(state.runTime)||0;
      if(!this.segment.frozen)this.segment.elapsed+=Math.max(0,now-this.segment.lastTime);
      this.segment.lastTime=now;this.segment.frozen=frozen;
    }
    if (!enabled || frozen || this.context?.state !== 'running') { this.stop(); return; }
    // Preload only after the user explicitly enables sound; no remote requests by default.
    for (const config of Object.values(this.tracks)) if (config) void this.load(config);
    const segment = this.segment, config = this.tracks[segment?.bossId];
    if (!segment || !config) { this.stop(); return; }
    if (this.errors.has(config.src)) return;
    if (this.voice || this.starting === segment) return;
    const revision = this.revision;
    this.starting = segment;
    void this.load(config).then(buffer => {
      if (this.starting === segment) this.starting = null;
      if (!buffer || this.destroyed || revision !== this.revision || this.segment !== segment ||
          !this.enabled || this.paused || this.context?.state !== 'running' || this.voice) return;
      const elapsed = Math.max(0,segment.elapsed) * config.playbackRate;
      const start = Math.min(config.start, Math.max(0, buffer.duration - .001));
      if (!config.loop && start + elapsed >= buffer.duration) return;
      const offset = config.loop ? start + elapsed % (buffer.duration - start) : start + elapsed;
      const source = this.context.createBufferSource(), gain = this.context.createGain();
      source.buffer = buffer; source.loop = config.loop; source.playbackRate.value = config.playbackRate;
      if (config.loop) { source.loopStart = start; source.loopEnd = buffer.duration; }
      gain.gain.value = config.volume;
      const nodes = [gain];
      if (config.filterType) {
        const filter = this.context.createBiquadFilter(); filter.type = config.filterType;
        filter.frequency.value = config.filterHz; filter.Q.value = .65;
        source.connect(filter).connect(gain).connect(this.bus); nodes.push(filter);
      } else source.connect(gain).connect(this.bus);
      const voice = {source, nodes}; this.voice = voice;
      source.onended = () => { source.disconnect(); for (const node of nodes) node.disconnect(); if (this.voice === voice) this.voice = null; };
      try { source.start(0, offset); } catch { this.stop(); }
    });
  }
  stop() {
    this.starting = null;
    const voice = this.voice; this.voice = null;
    if (voice) { try { voice.source.stop(); } catch {} voice.source.disconnect(); for (const node of voice.nodes) node.disconnect(); }
  }
  reset() { this.stop(); this.segment = null; }
  status() {
    const bossId = this.segment?.bossId || null, src = this.tracks[bossId]?.src || null;
    return {playing: this.playing, bossId, decoded: !!src && this.decoded.has(src), src,
      error: src ? this.errors.get(src) || null : null,
      ready: Object.fromEntries(Object.entries(this.tracks).map(([id, config]) => [id, !!config && this.decoded.has(config.src)]))};
  }
  destroy() {
    this.reset(); this.destroyed = true; this.revision++;
    for (const controller of this.pending.values()) controller.abort();
    this.pending.clear(); this.buffers.clear(); this.decoded.clear(); this.context = null; this.bus = null;
  }
}
