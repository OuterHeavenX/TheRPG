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
      $('level-text').textContent = 'Lv ' + p.level;
      $('zone-text').textContent = game.zone.name;
      $('kills-text').textContent = p.kills + ' kills';
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
      $('victory-text').innerHTML = 'The Demon Lord has fallen!<br>Level ' + p.level + ' · ' + p.kills + ' kills';
      this.showScreen('victory');
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
    if (attackKeys.has(e.code)) { if (!e.repeat) game.input.attackPressed = true; e.preventDefault(); }
    RPG.Audio.init(); RPG.Audio.resume();
  });
  window.addEventListener('keyup', (e) => {
    if (keymap[e.code]) { game.input[keymap[e.code]] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', () => { for (const k in game.input) game.input[k] = false; });
  canvas.addEventListener('mousedown', (e) => {
    if (!game.running || game.paused) return;
    // face the click, then attack
    const p = game.player;
    const wx = e.clientX / game.scale, wy = e.clientY / game.scale;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    if (p.state === 'idle' || p.state === 'attack') {
      const dx = wx - cx, dy = wy - cy;
      if (Math.abs(dx) + Math.abs(dy) > 6 && p.state === 'idle') p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
    }
    game.input.attackPressed = true;
    RPG.Audio.init(); RPG.Audio.resume();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function togglePause() {
    if (!game.running || game.gameOver) return;
    game.paused = !game.paused;
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
  $('btn-again').onclick = () => { ui.showScreen(null); game.loadZone(game.zoneIndex, 'entry'); };
  for (const id of ['btn-quit', 'btn-quit2', 'btn-quit3']) {
    $(id).onclick = () => { game.running = false; game.paused = false; ui.showHud(false); ui.showBoss(null); showTitle(); };
  }

  function showTitle() {
    ui.showScreen('title');
    const save = RPG.Game.loadSave();
    $('btn-continue').classList.toggle('hidden', !save);
    if (save) $('btn-continue').textContent = 'Continue (Lv ' + save.level + ')';
  }

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
