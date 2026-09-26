/**
 * Jungle Ambience — a generative, endlessly-looping jungle music engine for
 * the Canopy Hunter expedition, built on the Web Audio API (no audio assets).
 *
 * Layers:
 *  - Canopy bed: looped brown noise through a slowly-breathing lowpass filter.
 *  - Drums: soft hand-drum groove (membrane thump + rim click) at 84 BPM.
 *  - Shaker: highpassed noise ticks riding the offbeats.
 *  - Bass: sparse, slow-attack triangle notes from A minor pentatonic.
 *  - Birds: random FM chirps, stereo-panned.
 *  - Insects: occasional high shimmering trill.
 *
 * All functions are SSR-safe no-ops when Web Audio is unavailable.
 */

const MUTE_KEY = "arboreal_jungle_muted_v1";
const FADE_S = 1.6;

/* A minor pentatonic, low register — the "jungle" tonality. */
const BASS_NOTES = [55, 65.41, 73.42, 82.41, 98, 110]; // A1 C2 D2 E2 G2 A2

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  timer: number;
  nextNoteTime: number;
  step: number;
  birdTimer: number;
  insectTimer: number;
  bassBar: number;
}

let engine: Engine | null = null;
let muted = false;

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

/** Loopable brown-noise buffer (2s) shared by the canopy bed and shaker. */
function brownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buffer;
}

function startCanopyBed(ctx: AudioContext, master: GainNode, noise: AudioBuffer) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 320;
  filter.Q.value = 0.4;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.05;
  // Slow "breathing" of the canopy: filter sweeps + gentle swells.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.11;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 0.02;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(bedGain.gain);
  src.connect(filter);
  filter.connect(bedGain);
  bedGain.connect(master);
  src.start();
  lfo.start();
  lfo2.start();
}

/** Soft hand-drum membrane: sine pitch-drop + a breath of noise. */
function drumHit(ctx: AudioContext, out: AudioNode, t: number, pitch: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitch * 1.6, t);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + 0.16);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + 0.32);
}

/** Rim click: short bandpassed noise snap. */
function rimClick(ctx: AudioContext, out: AudioNode, t: number, gain: number, noise: AudioBuffer) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 1.7;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1900;
  bp.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 1.2);
  src.stop(t + 0.1);
}

/** Shaker tick: very short highpassed noise. */
function shakerTick(ctx: AudioContext, out: AudioNode, t: number, gain: number, noise: AudioBuffer) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 2.2;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 1.2);
  src.stop(t + 0.08);
}

/** Slow-attack bass note from the pentatonic set. */
function bassNote(ctx: AudioContext, out: AudioNode, t: number, freq: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  osc.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + 2.8);
}

/** One bird call: a quick run of 2–4 FM chirps, panned somewhere in the canopy. */
function birdCall(ctx: AudioContext, out: AudioNode, t: number) {
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  pan.connect(g);
  g.connect(out);
  const chirps = 2 + Math.floor(Math.random() * 3);
  const base = 2400 + Math.random() * 1400;
  for (let i = 0; i < chirps; i += 1) {
    const ct = t + i * (0.09 + Math.random() * 0.05);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const peak = base * (0.9 + Math.random() * 0.35);
    osc.frequency.setValueAtTime(peak * 0.82, ct);
    osc.frequency.exponentialRampToValueAtTime(peak, ct + 0.035);
    osc.frequency.exponentialRampToValueAtTime(peak * 0.86, ct + 0.07);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0, ct);
    cg.gain.linearRampToValueAtTime(1, ct + 0.012);
    cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.085);
    osc.connect(cg);
    cg.connect(pan);
    osc.start(ct);
    osc.stop(ct + 0.1);
  }
}

/** Distant insect shimmer: high sine with tremolo, fading in and out. */
function insectTrill(ctx: AudioContext, out: AudioNode, t: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 5100 + Math.random() * 900;
  const trem = ctx.createOscillator();
  trem.frequency.value = 28 + Math.random() * 10;
  const tremGain = ctx.createGain();
  tremGain.gain.value = 0.5;
  const depth = ctx.createGain();
  depth.gain.value = 0.5;
  trem.connect(tremGain);
  tremGain.connect(depth.gain);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.016, t + 0.7);
  g.gain.linearRampToValueAtTime(0, t + 2.2);
  osc.connect(depth);
  depth.connect(g);
  g.connect(out);
  osc.start(t);
  trem.start(t);
  osc.stop(t + 2.4);
  trem.stop(t + 2.4);
}

/* 84 BPM groove on an 8th-note grid. 1 = hit. */
const DRUM_PATTERN = [1, 0, 0, 1, 0, 0, 1, 0];
const RIM_PATTERN = [0, 0, 1, 0, 0, 1, 0, 1];

function scheduleStep(e: Engine, noise: AudioBuffer, musicBus: GainNode) {
  const { ctx } = e;
  const t = e.nextNoteTime;
  const step = e.step % 8;
  if (DRUM_PATTERN[step]) drumHit(ctx, musicBus, t, 105, 0.5);
  if (RIM_PATTERN[step]) rimClick(ctx, musicBus, t, 0.16, noise);
  // Shaker rides every offbeat 8th.
  if (step % 2 === 1) shakerTick(ctx, musicBus, t, step === 7 ? 0.1 : 0.07, noise);
  // Bass: one long note every two bars, wandering the pentatonic.
  if (e.step % 16 === 0) {
    const note = BASS_NOTES[Math.floor(Math.random() * BASS_NOTES.length)];
    bassNote(ctx, musicBus, t, note);
  }
  e.step += 1;
  e.nextNoteTime += 60 / 84 / 2; // 8th notes at 84 BPM
}

function tick(e: Engine, noise: AudioBuffer, musicBus: GainNode) {
  // Schedule drum/bass up to 0.6s ahead.
  while (e.nextNoteTime < e.ctx.currentTime + 0.6) {
    scheduleStep(e, noise, musicBus);
  }
  // Ambient events on their own clocks.
  if (e.ctx.currentTime >= e.birdTimer) {
    birdCall(e.ctx, musicBus, e.ctx.currentTime + 0.05);
    e.birdTimer = e.ctx.currentTime + 3.5 + Math.random() * 6;
  }
  if (e.ctx.currentTime >= e.insectTimer) {
    insectTrill(e.ctx, musicBus, e.ctx.currentTime + 0.05);
    e.insectTimer = e.ctx.currentTime + 9 + Math.random() * 14;
  }
}

function buildEngine(): Engine | null {
  const ctx = audioContext();
  if (!ctx) return null;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.9;
  musicBus.connect(master);
  const noise = brownNoiseBuffer(ctx);
  startCanopyBed(ctx, master, noise);
  const e: Engine = {
    ctx,
    master,
    timer: 0,
    nextNoteTime: ctx.currentTime + 0.1,
    step: 0,
    birdTimer: ctx.currentTime + 2,
    insectTimer: ctx.currentTime + 6,
    bassBar: 0,
  };
  e.timer = window.setInterval(() => tick(e, noise, musicBus), 180);
  return e;
}

/**
 * Start (or resume) the jungle music. Safe to call from a click handler —
 * creating/resuming inside the user gesture satisfies autoplay policies.
 */
export function startJungleMusic(): void {
  if (typeof window === "undefined") return;
  if (muted) return;
  if (!engine) {
    muted = readMuted();
    if (muted) return;
    engine = buildEngine();
    if (!engine) return;
  }
  const { ctx, master } = engine;
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(0.85, t, FADE_S / 3);
}

/** Fade the music out and suspend the context. The engine is kept warm. */
export function stopJungleMusic(): void {
  if (!engine) return;
  const { ctx, master } = engine;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(0, t, FADE_S / 3);
  window.setTimeout(() => {
    if (engine && engine.master.gain.value < 0.02) void engine.ctx.suspend();
  }, FADE_S * 1000 + 200);
}

export function setJungleMuted(next: boolean): void {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {}
  if (next) stopJungleMusic();
}

export function isJungleMuted(): boolean {
  if (typeof window !== "undefined") muted = readMuted();
  return muted;
}
