// Bootstrap: input, UI wiring, main loop.
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');

  const ui = {
    showHud(on) { $('hud').classList.toggle('hidden', !on); },
    banner(title, sub) {
      const b = $('banner');
      b.innerHTML = title + (sub ? '<small>' + sub + '</small>' : '');
      b.classList.remove('hidden');
      b.style.animation = 'none';
      void b.offsetWidth; // restart the CSS animation
      b.style.animation = '';
      clearTimeout(this._bt);
      this._bt = setTimeout(() => b.classList.add('hidden'), 3200);
    },
    location(title, sub) {
      const b = $('location');
      $('location-title').textContent = title;
      $('location-sub').textContent = sub || '';
      b.classList.remove('hidden');
      b.style.animation = 'none';
      void b.offsetWidth;
      b.style.animation = '';
      clearTimeout(this._lt);
      this._lt = setTimeout(() => b.classList.add('hidden'), 4200);
    },
    titleCard(on) { $('titlecard').classList.toggle('hidden', !on); },
    setObjective(text) { $('objective-text').textContent = text || ''; },
    showDialog(on, speaker, text, unseen) {
      const d = $('dialog');
      d.classList.toggle('hidden', !on);
      if (!on) return;
      $('dlg-speaker').textContent = speaker || '';
      $('dlg-speaker').classList.toggle('hidden', !speaker);
      $('dlg-speaker').classList.toggle('unseen', !!unseen);
      $('dlg-text').textContent = text || '';
    },
    dialogText(text) { $('dlg-text').textContent = text; },
    skipProgress(p) {
      const s = $('skip');
      s.classList.toggle('hidden', p <= 0);
      $('skip-fill').style.width = Math.round(p * 100) + '%';
    },
    showBoss(boss) {
      this.boss = boss;
      $('boss-bar').classList.toggle('hidden', !boss);
      if (boss) $('boss-name').textContent = boss.def.name;
    },
    updateHud(game) {
      const p = game.player;
      $('hp-fill').style.width = (100 * p.hp / p.maxHp) + '%';
      $('hp-text').textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
      $('xp-fill').style.width = (100 * p.xp / p.xpNeeded()) + '%';
      $('xp-text').textContent = p.xp + ' / ' + p.xpNeeded();
      $('level-text').textContent = 'KAEL · Lv ' + p.level;
      $('zone-text').textContent = game.zone.name;
      $('kills-text').textContent = p.kills + ' kills';
      $('hud').classList.toggle('dimmed', game.story.active);
      if (this.boss) {
        $('boss-fill').style.width = (100 * this.boss.hp / this.boss.maxHp) + '%';
        if (this.boss.remove || this.boss.state === 'dead') {
          const done = this.boss; setTimeout(() => { if (this.boss === done) this.showBoss(null); }, 1500);
          this.boss = null;
        }
      }
    },
    showScreen(id) {
      for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
      if (id) $(id).classList.remove('hidden');
    },
    showGameOver(p) {
      $('gameover-text').textContent = 'Level ' + p.level + ' · ' + p.kills + ' kills. Your progress is kept.';
      this.showScreen('gameover');
    },
    showVictory(p) {
      $('victory-text').innerHTML = 'The Archivist is silent. The Vein is not.<br>Level ' + p.level + ' · ' + p.kills + ' kills';
      this.showScreen('victory');
    },
    renderJournal(game) {
      const list = $('journal-list');
      list.innerHTML = '';
      let n = 0;
      for (const [id, text] of RPG.JOURNAL) {
        if (!game.flags[id]) continue;
        const li = document.createElement('li');
        li.textContent = text;
        list.appendChild(li);
        n++;
      }
      $('journal-objective').textContent = game.objective || '';
      $('journal-empty').classList.toggle('hidden', n > 0);
    },
  };

  const game = new RPG.Game(canvas, ui);
  window.game = game;

  // ---------------- input
  const keymap = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
  };
  const attackKeys = new Set(['Space', 'KeyJ', 'KeyK', 'Enter', 'KeyZ']);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { togglePause(); e.preventDefault(); return; }
    if (keymap[e.code]) { game.input[keymap[e.code]] = true; e.preventDefault(); }
    if (attackKeys.has(e.code)) {
      if (game.story.active) { if (!e.repeat) game.story.advance(); game.input.action = true; }
      else if (!e.repeat) game.input.attackPressed = true;
      e.preventDefault();
    }
    RPG.Audio.init(); RPG.Audio.resume();
  });
  window.addEventListener('keyup', (e) => {
    if (keymap[e.code]) { game.input[keymap[e.code]] = false; e.preventDefault(); }
    if (attackKeys.has(e.code)) game.input.action = false;
  });
  window.addEventListener('blur', () => { for (const k in game.input) game.input[k] = false; });
  canvas.addEventListener('mousedown', (e) => {
    RPG.Audio.init(); RPG.Audio.resume();
    if (!game.running || game.paused) return;
    if (game.story.active) { game.story.advance(); game.input.action = true; return; }
    const p = game.player;
    const wx = e.clientX / game.scale, wy = e.clientY / game.scale;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    if (p.state === 'idle') {
      const dx = wx - cx, dy = wy - cy;
      if (Math.abs(dx) + Math.abs(dy) > 6) p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
    }
    game.input.attackPressed = true;
  });
  window.addEventListener('mouseup', () => { game.input.action = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  $('dialog').addEventListener('mousedown', (e) => { e.preventDefault(); game.story.advance(); game.input.action = true; });

  function togglePause() {
    if (!game.running || game.gameOver) return;
    game.paused = !game.paused;
    if (game.paused) ui.renderJournal(game);
    ui.showScreen(game.paused ? 'pause' : null);
  }

  // ---------------- buttons
  function start(save) {
    RPG.Audio.init(); RPG.Audio.resume();
    ui.showScreen(null);
    game.newGame(save);
  }
  $('btn-new').onclick = () => start(null);
  $('btn-continue').onclick = () => start(RPG.Game.loadSave());
  $('btn-resume').onclick = () => togglePause();
  $('btn-retry').onclick = () => { ui.showScreen(null); game.retry(); };
  $('btn-again').onclick = () => { ui.showScreen(null); game.loadZone(game.zoneIndex, 'entry', true); ui.banner(game.zone.name, 'The Vein is waking. Keep exploring.'); };
  for (const id of ['btn-quit', 'btn-quit2', 'btn-quit3']) {
    $(id).onclick = () => {
      game.running = false; game.paused = false;
      game.story.active = false; game.story.target.black = 0; game.story.fx.black = 0; game.story.target.letterbox = 0;
      ui.showDialog(false); ui.titleCard(false); ui.showHud(false); ui.showBoss(null); showTitle();
    };
  }

  function showTitle() {
    ui.showScreen('title');
    const save = RPG.Game.loadSave();
    $('btn-continue').classList.toggle('hidden', !save);
    if (save) $('btn-continue').textContent = 'Continue (Lv ' + save.level + ')';
  }

  RPG.Touch.install(game, ui, togglePause);

  // ---------------- loading + loop
  RPG.Assets.preloadAll();
  $('btn-new').disabled = true;
  $('btn-continue').disabled = true;
  showTitle();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!RPG.Assets.ready()) {
      const pct = Math.round(RPG.Assets.progress() * 100);
      $('loading-fill').style.width = pct + '%';
      $('loading-text').textContent = 'Loading ' + pct + '%';
    } else if ($('btn-new').disabled) {
      $('btn-new').disabled = false;
      $('btn-continue').disabled = false;
      $('loading').classList.add('hidden');
    }
    game.update(dt);
    game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
