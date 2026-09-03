// Tiny procedural sound effects (no audio assets needed).
window.RPG = window.RPG || {};

RPG.Audio = {
  ctx: null,
  muted: false,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  tone(freq, dur, type, vol, slide, delay) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  noise(dur, vol, hp) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.05;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp || 1200;
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t0);
  },

  // ---- gameplay
  swing() { this.noise(0.14, 0.06, 2000); },
  hit() { this.tone(200, 0.09, 'square', 0.07, -120); this.noise(0.06, 0.04, 600); },
  hurt() { this.tone(120, 0.25, 'sawtooth', 0.09, -60); },
  enemyDie() { this.tone(300, 0.3, 'triangle', 0.08, -250); },
  enemyDown() { this.enemyDie(); },
  pickup() { this.tone(880, 0.08, 'sine', 0.06, 300); this.tone(1320, 0.12, 'sine', 0.05, 200); },
  portal() { this.tone(440, 0.4, 'sine', 0.07, 660); },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'square', 0.06, 0, i * 0.09));
  },
  playerDie() {
    [330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.08, -30, i * 0.18));
  },
  victory() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.25, 'square', 0.06, 0, i * 0.12));
  },

  // ---- story cues (names match the beat `cue` fields in js/story.js)
  blip() { this.tone(660, 0.06, 'square', 0.04); },
  interact() { this.tone(520, 0.08, 'triangle', 0.05, 120); },
  discover() { this.tone(392, 0.3, 'sine', 0.05, 0); this.tone(587, 0.35, 'sine', 0.045, 0, 0.12); },
  rest() { this.tone(262, 0.6, 'sine', 0.04); this.tone(330, 0.6, 'sine', 0.03, 0, 0.05); },
  resonance() {
    // the Axiom's cyan pulse: a bright fifth that blooms and fades
    this.tone(880, 0.5, 'sine', 0.05, 0);
    this.tone(1320, 0.55, 'sine', 0.035, 0, 0.03);
    this.tone(1760, 0.45, 'triangle', 0.02, -200, 0.06);
  },
  static() { this.noise(0.5, 0.05, 300); },
  bell() {
    // one bronze bell an octave below the town bell: inharmonic partials, long decay
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const partials = [[65.4, 0.11, 3.6], [98.1, 0.07, 3.0], [130.8, 0.09, 2.8], [196.2, 0.05, 2.2], [261.6, 0.04, 1.8], [392.4, 0.025, 1.2], [554, 0.015, 0.8]];
    for (const [f, v, d] of partials) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + d + 0.05);
    }
    this.noise(0.05, 0.05, 2500);
  },
};
