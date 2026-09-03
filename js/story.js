// VEILBOUND story: scenes, dialogue and the cutscene runner.
//
// Every line in the PROLOGUE scenes (memory, void, vision, creature, hall, toll) is reproduced
// word for word from the VEILBOUND opening blueprint (docs/OPENING.md in OuterHeavenX/VEILBOUND).
// Scenes marked "TheRPG" below are new connective writing for this game and stay inside what
// docs/CANON.md establishes.
window.RPG = window.RPG || {};

(function () {
  const S = (speaker, text) => ({ speaker, text });
  const U = (speaker, text) => ({ speaker, text, unseen: true }); // deliberately unseen speaker

  RPG.SCENES = {
    // ------------------------------------------------ SCENE 1 — "Remember My Face" (verbatim)
    memory: { id: 'prologue.memory', title: 'Remember my face', beats: [
      { fx: { black: 1, letterbox: 1 }, wait: 1.6 },
      { fx: { black: 1, veins: 0.12 }, cue: 'discover', wait: 1.1 },
      { say: [U('ELARA', 'Kael, look at me.')] },
      { fx: { black: 1, glitch: 0.5, veins: 0.34 }, cue: 'interact', wait: 0.5 },
      { say: [S('YOUNG KAEL', 'I am looking.'), U('ELARA', 'No matter what happens, remember my face.')] },
      { fx: { glitch: 0.78 }, wait: 0.4 },
      { say: [S('YOUNG KAEL', 'Why are you crying?'),
              U('ELARA', 'Because I have to ask you to be brave before you should have to be.')] },
      { fx: { shake: 1, glitch: 0.6, veins: 0.5 }, cue: 'hit', wait: 0.55 },
      { fx: { shake: 0.9 }, cue: 'hit', wait: 0.45 },
      { say: [U('ELARA', 'When the bell rings, follow my voice.'),
              S('YOUNG KAEL', 'Where are you going?'),
              U('ELARA', 'Somewhere quiet.'),
              S('YOUNG KAEL', 'Will you come back?'),
              U('ELARA', 'I will find a way to reach you.')] },
      { fx: { black: 1, glitch: 1, symbol: 1, flash: 0.8 }, cue: 'resonance', wait: 0.9 },
      { fx: { symbol: 0, glitch: 0.2, static: 0.9, veins: 0 }, wait: 0.7 },
      { fx: { black: 1, glitch: 0, static: 0 }, wait: 0.6 },
      { say: [S('YOUNG KAEL', 'Mother?')] },
      { fx: { black: 1, letterbox: 1 }, wait: 1.2 },
    ] },

    // ------------------------------------------------ SCENE 2 — The Void (verbatim)
    void: { id: 'prologue.void', title: 'The void', beats: [
      { fx: { black: 1, letterbox: 1, static: 0.85 }, cue: 'static', wait: 1.4 },
      { say: [U('UNKNOWN VOICE', 'Memory removal complete.'),
              U('CALDRIS', 'Not complete. Something remains.'),
              U('SERAC', 'The child?'),
              U('CALDRIS', 'Leave him. Without her face, he will never find the door.')] },
      { fx: { static: 0.2 }, wait: 0.8 },
      { fx: { black: 1, static: 0, letterbox: 1 }, wait: 1.0 },
      { location: 'THE FOREST PATH', sub: 'Hollow March · four months out', objective: 'Reach Greyhaven', wait: 0.2 },
      { fx: { black: 0, letterbox: 0 }, cue: 'rest', wait: 1.4 },
    ] },

    // ------------------------------------------------ SCENE 3 — The Flash Vision (verbatim)
    vision: { id: 'prologue.vision', title: 'The flash vision', beats: [
      { fx: { letterbox: 1, flash: 0.85, invert: 0.5 }, cue: 'resonance', wait: 0.32 },
      { fx: { invert: 0, flash: 0.7, veins: 0.5 }, wait: 0.26 },
      { say: [S('VISION', 'A town burning, orange against the rain.')] },
      { fx: { flash: 0.7, invert: 0.35 }, wait: 0.24 },
      { say: [S('VISION', 'A girl standing under a giant silent bell.')] },
      { fx: { flash: 0.7, glitch: 0.5 }, wait: 0.24 },
      { say: [S('VISION', 'A woman locked in a glass cage.')] },
      { fx: { flash: 0.7, glitch: 0.8, veins: 0.85 }, wait: 0.24 },
      { say: [S('VISION', 'A mother wired into a machine beneath the ground.')] },
      { fx: { flash: 0.7, glitch: 0.3, veins: 0.4 }, wait: 0.24 },
      { say: [S('VISION', 'An overgrown headstone in the mud.')] },
      { fx: { flash: 0.9, glitch: 0, veins: 0, invert: 0.6 }, cue: 'hurt', wait: 0.3 },
      { fx: { letterbox: 0, invert: 0 }, wait: 0.35 },
      { say: [S('KAEL', 'Not again.')] },
    ] },

    // ------------------------------------------------ SCENE 4 — The creature (verbatim)
    creature: { id: 'prologue.creature', title: 'I had a name', beats: [
      { fx: { letterbox: 1, veins: 0.5 }, cue: 'enemyDown', wait: 0.5 },
      { say: [S('CREATURE', 'I had a name.'), S('KAEL', 'What did you say?')] },
      { fx: { letterbox: 0, veins: 0 }, objective: 'Reach Greyhaven — the way east is open', wait: 0.5 },
    ] },

    // ------------------------------------------------ SCENE 4b — Title drop
    title: { id: 'prologue.title', title: 'Greyhaven at dusk', beats: [
      { fx: { letterbox: 1 }, wait: 1.1 },
      { fx: { black: 0.35 }, cue: 'rest', wait: 1.5 },
      { titleCard: true, wait: 3.4 },
      { titleCard: false, fx: { black: 1 }, wait: 1.0 },
    ] },

    // ------------------------------------------------ SCENE 5 — Hunter Hall (verbatim)
    hall: { id: 'prologue.hall', title: 'Hunter Hall', beats: [
      { location: 'GREYHAVEN — HUNTER HALL', sub: 'Mira kept the hall. She expected him back in two weeks.', fx: { black: 0.92, letterbox: 1 }, cue: 'blip', wait: 2.2 },
      { say: [S('KAEL', 'Good to see you too.'),
              S('MIRA', 'You said two weeks.'),
              S('KAEL', 'It became complicated.'),
              S('MIRA', 'Four months is not complicated. Four months is a new season.'),
              S('MIRA', 'You are hurt.'),
              S('KAEL', 'I am fine.'),
              S('MIRA', 'You are a terrible liar.'),
              S('KAEL', 'Only with you.')] },
      { wait: 0.5 },
    ] },

    // ------------------------------------------------ SCENE 6 — The First Toll (verbatim)
    toll: { id: 'prologue.toll', title: 'The first toll', beats: [
      { fx: { letterbox: 1, shake: 1, invert: 0.9 }, cue: 'bell', wait: 0.6 },
      { fx: { invert: 0 }, wait: 0.5 },
      { say: [U('ELARA', 'Kael.')] },
      { fx: { shake: 0.9, invert: 0.7, glitch: 0.45, black: 0.4 }, cue: 'bell', wait: 0.7 },
      { fx: { invert: 0 }, wait: 0.4 },
      { say: [U('ELARA', 'Do not let them make the world quiet again.')] },
      { fx: { glitch: 0, black: 0.4 }, wait: 0.4 },
      { fx: { shake: 0.7, flash: 0.4 }, cue: 'hit', wait: 0.5 },
      { fx: { symbol: 0.9, veins: 0.4 }, cue: 'discover', wait: 0.8 },
      { say: [S('MIRA', 'Please tell me relics normally do that.'), S('KAEL', 'They do not.')] },
      { fx: { symbol: 0.5, black: 0.85 }, wait: 0.6 },
      { fx: { shake: 1, black: 0.95, symbol: 0, veins: 1 }, cue: 'bell', wait: 1.5 },
      { fx: { black: 1, veins: 1, letterbox: 1 }, objective: "Follow the bell's memory", wait: 1.0 },
    ] },

    // ------------------------------------------------ TheRPG — arrival in the Hollow March
    march: { id: 'march.arrive', title: 'Hollow March', beats: [
      { location: 'HOLLOW MARCH', sub: 'East of Greyhaven · the second field', fx: { black: 1, letterbox: 1 }, wait: 1.6 },
      { fx: { black: 0, veins: 0.3, letterbox: 0 }, cue: 'rest', wait: 0.8 },
      { fx: { veins: 0 }, objective: 'East. Past the second field. The sealed door. Remember the walls.', wait: 0.4 },
    ] },

    // ------------------------------------------------ TheRPG — the Axiom stirs
    axiom: { id: 'axiom.stirs', title: 'The Axiom stirs', beats: [
      { fx: { letterbox: 1, flash: 0.5 }, cue: 'resonance', wait: 0.4 },
      { say: [S('', 'The gauntlet fused to your forearm is warm. It has been dormant for years.'),
              S('', 'The stones set into it were green this morning. They are turning blue.')] },
      { fx: { letterbox: 0 }, wait: 0.3 },
    ] },

    // ------------------------------------------------ TheRPG — the Eastern Descent
    descent: { id: 'archive.enter', title: 'The Sunken Archive', beats: [
      { location: 'SUNKEN ARCHIVE — EASTERN DESCENT', sub: 'Sealed since before Greyhaven had a name', fx: { black: 1, letterbox: 1 }, wait: 1.8 },
      { fx: { black: 0, veins: 0.5, letterbox: 0 }, cue: 'resonance', wait: 0.8 },
      { say: [S('', 'The Vein runs red under every stone here, and it is moving.'),
              S('', 'Something at the bottom of the Archive has noticed you.')] },
      { fx: { veins: 0 }, objective: 'Find what is written on the walls', wait: 0.3 },
    ] },

    // ------------------------------------------------ TheRPG — the Archivist wakes
    archivist: { id: 'archive.archivist', title: 'The Archivist', beats: [
      { fx: { letterbox: 1, shake: 0.6, invert: 0.4 }, cue: 'static', wait: 0.6 },
      { fx: { invert: 0 }, wait: 0.3 },
      { say: [S('THE ARCHIVIST', 'BOUND USER DETECTED.'),
              S('THE ARCHIVIST', 'AUTHORITY: INSUFFICIENT.'),
              S('KAEL', 'Then I will take it.')] },
      { fx: { letterbox: 0 }, objective: 'Defeat the Archivist', wait: 0.3 },
    ] },

    // ------------------------------------------------ TheRPG — WELCOME BACK. (canon beat)
    welcome: { id: 'archive.welcome', title: 'Welcome back', beats: [
      { fx: { letterbox: 1, shake: 0.8, veins: 0.6 }, cue: 'enemyDown', wait: 1.2 },
      { fx: { shake: 0, flash: 0.5, symbol: 0.8 }, cue: 'resonance', wait: 0.8 },
      { say: [S('THE ARCHIVIST', 'AXIOM LINEAGE... RECOGNIZED.'),
              S('THE ARCHIVIST', 'BOUND USER. RECORD FOUND.'),
              S('THE ARCHIVIST', 'WELCOME BACK.'),
              S('KAEL', 'I have never been here.')] },
      { fx: { symbol: 0.3, black: 0.9, veins: 1 }, cue: 'bell', wait: 1.4 },
      { location: 'THE VEIN IS WAKING', sub: 'VEILBOUND continues in Greyhaven', fx: { black: 1, veins: 0 }, objective: 'Return to Greyhaven', wait: 2.6 },
      { fx: { black: 0, letterbox: 0 }, wait: 0.6 },
    ] },
  };

  // Journal entries shown in the pause menu once a scene has been seen.
  RPG.JOURNAL = [
    ['prologue.memory', 'A dark room. A woman asked you to remember her face. You cannot.'],
    ['prologue.void', 'Two voices in the void. "Without her face, he will never find the door."'],
    ['prologue.vision', 'Five images in the rain: a burning town, a silent bell, a glass cage, a machine, a headstone.'],
    ['prologue.creature', 'The corrupted thing on the forest path said it had a name.'],
    ['prologue.hall', 'Mira kept the Hunter Hall. You were four months late. She read the injuries before you admitted them.'],
    ['prologue.toll', 'The Greyhaven bell rang with no clapper in it. Three times. The relic broke. Her voice said: follow.'],
    ['march.arrive', 'The Hollow March: pale grass over buried ruins. Past the second field, a sealed door nobody has opened.'],
    ['axiom.stirs', 'The Axiom is waking. Its stones are turning from green to blue.'],
    ['archive.enter', 'The Sunken Archive answered. The Vein runs red beneath it, and it is moving.'],
    ['archive.archivist', 'The guardian of the Archive named you a bound user with insufficient authority.'],
    ['archive.welcome', 'The Archivist recognised the Axiom lineage and said: WELCOME BACK. You have never been here.'],
  ];

  // ------------------------------------------------------------------ the runner
  RPG.Story = class {
    constructor(game, ui) {
      this.game = game;
      this.ui = ui;
      this.active = false;
      this.fx = {};
      this.target = {};
      for (const k of ['black', 'letterbox', 'glitch', 'veins', 'static', 'flash', 'invert', 'symbol']) { this.fx[k] = 0; this.target[k] = 0; }
      this.queue = [];
      this.lines = [];
      this.lineIdx = 0;
      this.typed = 0;
      this.lineAge = 0;
      this.wait = 0;
      this.hold = 0;
      this.time = 0;
      this.onDone = null;
      this.veinPaths = this.makeVeins();
      this.glitchSeed = 0;
    }

    // Play one scene or a list of scenes back to back.
    play(scenes, onDone) {
      if (!Array.isArray(scenes)) scenes = [scenes];
      this.queue = [];
      for (const sc of scenes) {
        this.game.flags[sc.id] = true;
        for (const b of sc.beats) this.queue.push(b);
      }
      this.onDone = onDone || null;
      this.active = true;
      this.lines = [];
      this.wait = 0;
      this.hold = 0;
      this.ui.showDialog(false);
      this.nextBeat();
    }

    nextBeat() {
      if (!this.queue.length) return this.finish();
      const b = this.queue.shift();
      if (b.fx) for (const k in b.fx) {
        if (k === 'shake') this.game.shake = Math.max(this.game.shake, b.fx.shake * 0.45);
        else if (k === 'flash') this.fx.flash = Math.max(this.fx.flash, b.fx.flash);
        else this.target[k] = b.fx[k];
      }
      if (b.cue && RPG.Audio[b.cue]) RPG.Audio[b.cue]();
      if (b.location) this.ui.location(b.location, b.sub || '');
      if (b.objective) this.game.setObjective(b.objective);
      if (b.titleCard !== undefined) this.ui.titleCard(b.titleCard);
      if (b.then) b.then();
      if (b.say) {
        this.lines = b.say;
        this.lineIdx = 0;
        this.showLine();
        this.wait = 0;
      } else {
        this.wait = b.wait || 0;
      }
    }

    showLine() {
      const l = this.lines[this.lineIdx];
      this.typed = 0;
      this.lineAge = 0;
      this.ui.showDialog(true, l.speaker, '', l.unseen);
    }

    // Space / click / Enter while a scene runs.
    advance() {
      if (!this.active || !this.lines.length) return;
      if (this.lineAge < 0.42) return; // each line holds briefly before it can be dismissed
      const l = this.lines[this.lineIdx];
      if (this.typed < l.text.length) { this.typed = l.text.length; this.ui.dialogText(l.text); return; }
      this.lineIdx++;
      if (this.lineIdx >= this.lines.length) {
        this.lines = [];
        this.ui.showDialog(false);
        this.nextBeat();
      } else {
        this.showLine();
      }
    }

    // Hold the action control to skip the remaining beats of the scene.
    skip() {
      if (!this.active) return;
      for (const b of this.queue) {
        if (b.fx) for (const k in b.fx) if (k !== 'shake' && k !== 'flash') this.target[k] = b.fx[k];
        if (b.objective) this.game.setObjective(b.objective);
        if (b.titleCard !== undefined) this.ui.titleCard(b.titleCard);
        if (b.then) b.then();
      }
      this.queue = [];
      this.lines = [];
      for (const k in this.target) this.fx[k] = this.target[k];
      this.ui.showDialog(false);
      this.ui.titleCard(false);
      this.finish();
    }

    finish() {
      this.active = false;
      this.ui.showDialog(false);
      this.ui.skipProgress(0);
      const cb = this.onDone;
      this.onDone = null;
      if (cb) cb();
    }

    update(dt, holdingAction) {
      this.time += dt;
      // ease effects toward their targets
      for (const k in this.target) {
        const t = this.target[k];
        this.fx[k] += (t - this.fx[k]) * Math.min(1, dt * (k === 'black' ? 5 : 9));
        if (Math.abs(this.fx[k] - t) < 0.005) this.fx[k] = t;
      }
      this.fx.flash = Math.max(0, this.fx.flash - dt * 2.4);
      if (!this.active) return;

      if (this.lines.length) {
        const l = this.lines[this.lineIdx];
        this.lineAge += dt;
        if (this.typed < l.text.length) {
          this.typed = Math.min(l.text.length, this.typed + dt * 38);
          this.ui.dialogText(l.text.slice(0, Math.floor(this.typed)));
        }
      } else {
        this.wait -= dt;
        if (this.wait <= 0) this.nextBeat();
      }

      if (holdingAction) {
        this.hold += dt;
        this.ui.skipProgress(Math.min(1, this.hold / 0.9));
        if (this.hold >= 0.9) { this.hold = 0; this.skip(); }
      } else if (this.hold > 0) {
        this.hold = 0;
        this.ui.skipProgress(0);
      }
    }

    makeVeins() {
      const paths = [];
      for (let i = 0; i < 9; i++) {
        const pts = [];
        let x = Math.random(), y = 1.05;
        pts.push([x, y]);
        while (y > -0.05) {
          y -= 0.05 + Math.random() * 0.08;
          x += (Math.random() - 0.5) * 0.12;
          pts.push([x, y]);
        }
        paths.push({ pts, phase: Math.random() * 6.28, width: 1 + Math.random() * 1.5 });
      }
      return paths;
    }

    // Draw the overlay in screen space (after the world, before the DOM HUD).
    draw(ctx, w, h) {
      const f = this.fx;
      if (f.invert > 0.01) {
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = 'rgba(255,255,255,' + f.invert + ')';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (f.black > 0.01) {
        ctx.fillStyle = 'rgba(4,2,6,' + f.black + ')';
        ctx.fillRect(0, 0, w, h);
      }
      if (f.veins > 0.01) {
        ctx.lineCap = 'round';
        for (const p of this.veinPaths) {
          const pulse = 0.55 + 0.45 * Math.sin(this.time * 2.2 + p.phase);
          ctx.strokeStyle = 'rgba(220,40,40,' + (f.veins * pulse * 0.85) + ')';
          ctx.lineWidth = p.width;
          ctx.beginPath();
          p.pts.forEach(([x, y], i) => { const px = x * w, py = y * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
          ctx.stroke();
        }
      }
      if (f.glitch > 0.01) {
        const n = Math.floor(f.glitch * 18);
        const seed = Math.floor(this.time * 14);
        for (let i = 0; i < n; i++) {
          const r = this.rand(seed * 31 + i * 7);
          const bw = 6 + r * 40, bh = 3 + this.rand(seed + i * 13) * 14;
          const bx = this.rand(seed * 3 + i) * w, by = this.rand(seed * 5 + i * 11) * h;
          ctx.fillStyle = this.rand(seed + i) > 0.5 ? 'rgba(15,15,20,' + f.glitch + ')' : 'rgba(120,120,130,' + f.glitch * 0.8 + ')';
          ctx.fillRect(Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh));
        }
      }
      if (f.static > 0.01) {
        const seed = Math.floor(this.time * 30);
        const n = Math.floor(f.static * w * h / 40);
        ctx.fillStyle = 'rgba(200,200,210,' + f.static * 0.55 + ')';
        for (let i = 0; i < n; i++) {
          ctx.fillRect(Math.floor(this.rand(seed + i * 2) * w), Math.floor(this.rand(seed * 7 + i * 3) * h), 1, 1);
        }
        ctx.fillStyle = 'rgba(0,0,0,' + f.static * 0.35 + ')';
        for (let y = (seed % 3); y < h; y += 3) ctx.fillRect(0, y, w, 1);
      }
      if (f.symbol > 0.01) {
        const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.16;
        ctx.strokeStyle = 'rgba(210,255,250,' + f.symbol + ')';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(79,214,200,' + f.symbol + ')';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0.35, 2.75); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r, 3.55, 5.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy + r * 0.55); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      if (f.flash > 0.01) {
        ctx.fillStyle = 'rgba(255,255,255,' + f.flash + ')';
        ctx.fillRect(0, 0, w, h);
      }
      if (f.letterbox > 0.01) {
        const bar = Math.round(h * 0.12 * f.letterbox);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, bar);
        ctx.fillRect(0, h - bar, w, bar);
      }
    }

    rand(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  };
})();
