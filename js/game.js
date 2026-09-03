// Core game: zones, spawning, combat resolution, camera, rendering, HUD.
window.RPG = window.RPG || {};

const E = (key, name, hp, dmg, speed, xp, extra) => Object.assign(
  { key: 'enemies/' + key, name, hp, dmg, speed, xp, aggro: 90, reach: 18, atkCd: 1.1 }, extra || {});

RPG.ENEMIES = {
  slime1: E('slime1', 'Slime', 30, 5, 30, 6, { reach: 14 }),
  slime2: E('slime2', 'Blue Slime', 40, 7, 32, 9, { reach: 14 }),
  slime3: E('slime3', 'Toxic Slime', 55, 9, 34, 12, { reach: 14 }),
  slime_monster1: E('slime_monster1', 'Slime Beast', 65, 10, 38, 14, { reach: 15 }),
  slime_monster2: E('slime_monster2', 'Slime Brute', 140, 18, 40, 34, { reach: 15 }),
  slime_monster3: E('slime_monster3', 'Slime King', 180, 22, 42, 42, { reach: 16 }),
  goblin1: E('goblin1', 'Goblin', 70, 10, 55, 16, { reach: 20 }),
  goblin2: E('goblin2', 'Goblin Raider', 90, 13, 58, 22, { reach: 20 }),
  goblin3: E('goblin3', 'Goblin Chief', 120, 16, 60, 30, { reach: 20 }),
  orc1: E('orc1', 'Orc', 150, 18, 50, 36, { reach: 22 }),
  orc2: E('orc2', 'Orc Warrior', 190, 22, 52, 44, { reach: 22 }),
  orc3: E('orc3', 'Orc Warlord', 240, 26, 55, 55, { reach: 22 }),
  lizardman1: E('lizardman1', 'Lizardman', 200, 24, 62, 50, { reach: 22, aggro: 110 }),
  lizardman2: E('lizardman2', 'Lizard Knight', 260, 28, 64, 62, { reach: 22, aggro: 110 }),
  lizardman3: E('lizardman3', 'Lizard Lord', 340, 34, 66, 80, { reach: 22, aggro: 110 }),
  vampire1: E('vampire1', 'Vampire', 320, 32, 70, 80, { reach: 22, aggro: 120 }),
  vampire2: E('vampire2', 'Vampire Noble', 400, 38, 72, 100, { reach: 22, aggro: 120 }),
  vampire3: E('vampire3', 'Vampire Count', 500, 44, 74, 130, { reach: 22, aggro: 120 }),
  demon1: E('demon1', 'Imp', 550, 46, 60, 150, { reach: 28, aggro: 140, big: true }),
  demon2: E('demon2', 'Demon', 700, 54, 62, 200, { reach: 28, aggro: 140, big: true }),
  demon3: E('demon3', 'Demon Lord', 2600, 70, 58, 1200, { reach: 32, aggro: 400, atkCd: 0.9, big: true, boss: true }),
};

RPG.ZONES = [
  { id: 'grassland', name: 'Verdant Glades', recommended: 1, count: 10, respawn: 7,
    roster: ['slime1', 'slime1', 'slime2', 'slime2', 'slime3', 'slime_monster1', 'goblin1', 'goblin1', 'goblin2'] },
  { id: 'forest', name: 'Whispering Forest', recommended: 3, count: 12, respawn: 6,
    roster: ['goblin3', 'orc1', 'orc1', 'orc2', 'orc3', 'lizardman1', 'lizardman1', 'lizardman2', 'slime_monster2', 'slime_monster3'] },
  { id: 'cursed', name: 'Cursed Lands', recommended: 6, count: 12, respawn: 6, boss: 'demon3',
    roster: ['lizardman3', 'vampire1', 'vampire1', 'vampire2', 'vampire2', 'vampire3', 'demon1', 'demon1', 'demon2'] },
];

RPG.SAVE_KEY = 'therpg-save-v1';

RPG.Game = class {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.ui = ui;
    this.input = { up: false, down: false, left: false, right: false, run: false, attackPressed: false };
    this.scale = 3;
    this.running = false;
    this.paused = false;
    this.time = 0;
    this.shake = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.scale = window.innerWidth < 900 ? 2 : 3;
    this.canvas.width = Math.ceil(window.innerWidth / this.scale);
    this.canvas.height = Math.ceil(window.innerHeight / this.scale);
    this.ctx.imageSmoothingEnabled = false;
  }

  // ------------------------------------------------------------ lifecycle
  newGame(save) {
    this.player = new RPG.Player(save ? save.level : 1, save ? save.xp : 0);
    this.player.kills = save ? save.kills || 0 : 0;
    this.zoneIndex = save ? Math.min(save.zone || 0, RPG.ZONES.length - 1) : 0;
    this.bossDefeated = !!(save && save.bossDefeated);
    this.loadZone(this.zoneIndex, 'entry');
    this.running = true;
    this.paused = false;
    this.gameOver = false;
    this.ui.showHud(true);
  }

  loadZone(index, at) {
    this.zoneIndex = index;
    this.zone = RPG.ZONES[index];
    this.map = new RPG.GameMap(this.zone.id);
    this.enemies = [];
    this.pickups = [];
    this.fx = [];
    this.boss = null;
    this.respawnTimer = this.zone.respawn;
    const p = this.player;
    const spawn = this.map.tileCenter(at === 'exit' ? this.map.exit : this.map.entry);
    p.x = spawn[0]; p.y = spawn[1];
    p.state = 'idle'; p.setAnim('idle'); p.kx = p.ky = 0;
    p.dir = at === 'exit' ? 2 : 3;
    this.portalLock = true;
    this.exitPortal = this.map.tileCenter(this.map.exit);
    this.entryPortal = index > 0 ? this.map.tileCenter(this.map.entry) : null;
    for (let i = 0; i < this.zone.count; i++) this.spawnEnemy(true);
    if (this.zone.boss && !this.bossDefeated) {
      const near = this.map.nearestWalkable(this.exitPortal[0] - 40, this.exitPortal[1]);
      this.boss = new RPG.Enemy(RPG.ENEMIES[this.zone.boss], near[0], near[1]);
      this.boss.dir = 2;
      this.enemies.push(this.boss);
    }
    this.ui.banner(this.zone.name, 'Recommended level ' + this.zone.recommended +
      (this.zone.boss ? ' · the Demon Lord awaits' : ''));
    this.ui.showBoss(this.boss);
    this.save();
  }

  spawnEnemy(initial) {
    const p = this.player;
    for (let tries = 0; tries < 40; tries++) {
      const c = this.map.randomWalkable();
      const d = Math.hypot(c[0] - p.x, c[1] - p.y);
      if (d < (initial ? 110 : 160)) continue;
      if (Math.hypot(c[0] - this.exitPortal[0], c[1] - this.exitPortal[1]) < 48) continue;
      if (this.enemies.some((e) => Math.hypot(e.x - c[0], e.y - c[1]) < 24)) continue;
      const id = this.zone.roster[Math.floor(Math.random() * this.zone.roster.length)];
      this.enemies.push(new RPG.Enemy(RPG.ENEMIES[id], c[0], c[1]));
      return;
    }
  }

  save() {
    try {
      localStorage.setItem(RPG.SAVE_KEY, JSON.stringify({
        level: this.player.level, xp: this.player.xp, zone: this.zoneIndex,
        kills: this.player.kills, bossDefeated: this.bossDefeated,
      }));
    } catch (e) { /* storage unavailable */ }
  }

  static loadSave() {
    try { return JSON.parse(localStorage.getItem(RPG.SAVE_KEY)); } catch (e) { return null; }
  }

  // ------------------------------------------------------------ combat callbacks
  playerStrike(p) {
    const [fx, fy] = p.facing();
    let hits = 0;
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const reach = p.reach + (e.def.big ? 8 : 0);
      if (d > reach) continue;
      const dot = (dx * fx + dy * fy) / d;
      if (dot < 0.2 && d > 12) continue;
      const crit = Math.random() < 0.12;
      const dmg = Math.round(p.dmg * (0.9 + Math.random() * 0.25) * (crit ? 1.8 : 1));
      e.takeDamage(dmg, p.x, p.y, this);
      this.fx.push(new RPG.FloatText(e.x, e.y - 18, String(dmg), crit ? '#ffd866' : '#fff'));
      this.fx.push(new RPG.Spark(e.x, e.y, crit ? '#ffd866' : '#fff'));
      hits++;
    }
    if (hits) { RPG.Audio.hit(); this.shake = Math.max(this.shake, 0.08); }
  }

  enemyStrike(e) {
    const p = this.player;
    const dmg = Math.round(e.def.dmg * (0.85 + Math.random() * 0.3));
    if (p.takeDamage(dmg, e.x, e.y, this)) {
      this.fx.push(new RPG.FloatText(p.x, p.y - 22, '-' + dmg, '#ff6a6a'));
      this.shake = Math.max(this.shake, e.boss ? 0.3 : 0.15);
    }
  }

  onEnemyKilled(e) {
    const p = this.player;
    p.kills++;
    RPG.Audio.enemyDie();
    this.fx.push(new RPG.FloatText(e.x, e.y - 26, '+' + e.def.xp + ' XP', '#4ec9ff'));
    p.gainXp(e.def.xp, this);
    if (e.boss) {
      this.bossDefeated = true;
      this.pickups.push(new RPG.Heart(e.x, e.y, true));
      setTimeout(() => this.victory(), 1800);
    } else if (Math.random() < 0.22) {
      this.pickups.push(new RPG.Heart(e.x, e.y, false));
    }
    this.save();
  }

  onLevelUp() {
    const p = this.player;
    RPG.Audio.levelUp();
    this.fx.push(new RPG.FloatText(p.x, p.y - 30, 'LEVEL UP!', '#ffd866'));
    this.ui.banner('Level ' + p.level + '!', 'HP ' + p.maxHp + ' · Attack ' + p.dmg);
    this.save();
  }

  onPlayerDeath() {
    RPG.Audio.playerDie();
    this.gameOver = true;
    setTimeout(() => { if (this.gameOver) this.ui.showGameOver(this.player); }, 1600);
  }

  retry() {
    this.gameOver = false;
    this.player.hp = this.player.maxHp;
    this.loadZone(this.zoneIndex, 'entry');
  }

  victory() {
    RPG.Audio.victory();
    this.save();
    this.ui.showVictory(this.player);
  }

  // ------------------------------------------------------------ update
  update(dt) {
    if (!this.running || this.paused) return;
    this.time += dt;
    const p = this.player, map = this.map;
    p.update(dt, this);

    for (const e of this.enemies) e.update(dt, this);
    // gentle separation so enemies don't stack on one pixel
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.state === 'dead') continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.state === 'dead') continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 12) {
          const push = (12 - d) * 0.5;
          a.tryMove(-dx / d * push, -dy / d * push, map);
          b.tryMove(dx / d * push, dy / d * push, map);
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.remove);

    // respawns
    const alive = this.enemies.filter((e) => e.state !== 'dead' && !e.boss).length;
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawnTimer = this.zone.respawn;
      if (alive < this.zone.count) this.spawnEnemy(false);
    }

    // pickups
    for (const h of this.pickups) {
      h.update(dt);
      if (p.state !== 'dead' && Math.hypot(h.x - p.x, h.y - p.y) < 11) {
        h.remove = true;
        const amt = Math.round(p.maxHp * (h.big ? 1 : 0.3));
        p.heal(amt);
        RPG.Audio.pickup();
        this.fx.push(new RPG.FloatText(p.x, p.y - 22, '+' + amt, '#7bff8a'));
      }
    }
    this.pickups = this.pickups.filter((h) => !h.remove);

    for (const f of this.fx) f.update(dt);
    this.fx = this.fx.filter((f) => !f.remove);

    // portals
    if (p.state !== 'dead') {
      const nearExit = Math.hypot(p.x - this.exitPortal[0], p.y - this.exitPortal[1]) < 10;
      const nearEntry = this.entryPortal && Math.hypot(p.x - this.entryPortal[0], p.y - this.entryPortal[1]) < 10;
      if (this.portalLock && !nearExit && !nearEntry) this.portalLock = false;
      if (!this.portalLock) {
        if (nearExit && this.zoneIndex < RPG.ZONES.length - 1 && (!this.boss || this.boss.state === 'dead')) {
          RPG.Audio.portal();
          this.loadZone(this.zoneIndex + 1, 'entry');
        } else if (nearEntry) {
          RPG.Audio.portal();
          this.loadZone(this.zoneIndex - 1, 'exit');
        }
      }
    }

    this.shake = Math.max(0, this.shake - dt);
    this.ui.updateHud(this);
  }

  // ------------------------------------------------------------ render
  render() {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(0, 0, cw, ch);
    if (!this.running) return;
    const map = this.map, p = this.player;

    let camX = p.x - cw / 2, camY = p.y - ch / 2;
    camX = map.pw <= cw ? (map.pw - cw) / 2 : Math.max(0, Math.min(map.pw - cw, camX));
    camY = map.ph <= ch ? (map.ph - ch) / 2 : Math.max(0, Math.min(map.ph - ch, camY));
    if (this.shake > 0) {
      camX += (Math.random() - 0.5) * 4 * Math.min(1, this.shake * 6);
      camY += (Math.random() - 0.5) * 4 * Math.min(1, this.shake * 6);
    }
    camX = Math.round(camX); camY = Math.round(camY);

    ctx.save();
    ctx.translate(-camX, -camY);

    // visible world rectangle
    const vx0 = Math.max(0, camX), vy0 = Math.max(0, camY);
    const vx1 = Math.min(map.pw, camX + cw), vy1 = Math.min(map.ph, camY + ch);
    const vw = vx1 - vx0, vh = vy1 - vy0;
    if (vw > 0 && vh > 0) {
      const water = map.water[Math.floor(this.time / 0.15) % map.water.length];
      this.blit(water, vx0, vy0, vw, vh);
      this.blit(map.ground, vx0, vy0, vw, vh);
    }

    this.drawPortal(this.exitPortal, this.zoneIndex < RPG.ZONES.length - 1 && (!this.boss || this.boss.state === 'dead') ? '#4ec9ff' : '#b23bff');
    if (this.entryPortal) this.drawPortal(this.entryPortal, '#7bff8a');
    for (const h of this.pickups) h.draw(ctx);

    // entities interleaved with the over layer, row by row (simple y-sorting)
    const ents = this.enemies.concat([p]).sort((a, b) => a.y - b.y);
    const t = map.tile;
    const r0 = Math.max(0, Math.floor(vy0 / t)), r1 = Math.min(map.h - 1, Math.floor((vy1 - 1) / t));
    let ei = 0;
    while (ei < ents.length && ents[ei].y < r0 * t) ents[ei++].draw(ctx);
    for (let r = r0; r <= r1; r++) {
      const rowBottom = (r + 1) * t;
      while (ei < ents.length && ents[ei].y < rowBottom) ents[ei++].draw(ctx);
      if (vw > 0 && map.over.complete && map.over.naturalWidth) {
        ctx.drawImage(map.over, vx0, r * t, vw, t, vx0, r * t, vw, t);
      }
    }
    while (ei < ents.length) ents[ei++].draw(ctx);

    for (const f of this.fx) f.draw(ctx);
    ctx.restore();

    // darken edges slightly in the cursed lands
    if (this.zone.id === 'cursed') {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.35, cw / 2, ch / 2, ch * 0.9);
      g.addColorStop(0, 'rgba(20,0,0,0)');
      g.addColorStop(1, 'rgba(20,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  blit(img, x, y, w, h) {
    if (!img.complete || !img.naturalWidth) return;
    this.ctx.drawImage(img, x, y, w, h, x, y, w, h);
  }

  drawPortal(pos, color) {
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(this.time * 4) * 0.5;
    ctx.save();
    ctx.translate(pos[0], pos[1]);
    ctx.globalAlpha = 0.35 + pulse * 0.3;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 10 + pulse * 2, 5.5 + pulse, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = this.time * 2 + i * Math.PI / 2;
      ctx.fillRect(Math.round(Math.cos(a) * 8), Math.round(Math.sin(a) * 4 - 6 - pulse * 4), 1, 1);
    }
    ctx.restore();
  }
};
