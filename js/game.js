// Core game: zones (wilds, town, interiors), spawning, combat, story triggers, camera, rendering.
window.RPG = window.RPG || {};

const E = (key, name, hp, dmg, speed, xp, extra) => Object.assign(
  { key: 'enemies/' + key, name, hp, dmg, speed, xp, aggro: 90, reach: 18, atkCd: 1.1 }, extra || {});

// Enemy roster. Names follow VEILBOUND canon where a role exists (March Husk, Vein Sentry,
// Vein-Corrupted, The Archivist); the rest are TheRPG names for creatures of the waking Vein.
RPG.ENEMIES = {
  slime1: E('slime1', 'March Husk', 30, 5, 30, 6, { reach: 14 }),
  slime2: E('slime2', 'Pale Husk', 40, 7, 32, 9, { reach: 14 }),
  slime3: E('slime3', 'Blight Husk', 55, 9, 34, 12, { reach: 14 }),
  slime_monster1: E('slime_monster1', 'Husk Brood', 65, 10, 38, 14, { reach: 15 }),
  corrupted: E('slime_monster2', 'Vein-Corrupted', 110, 12, 42, 40, { reach: 16, aggro: 140, special: 'corrupted' }),
  slime_monster2: E('slime_monster2', 'Husk Brute', 140, 18, 40, 34, { reach: 15 }),
  slime_monster3: E('slime_monster3', 'Husk Mother', 180, 22, 42, 42, { reach: 16 }),
  goblin1: E('goblin1', 'Scavenger', 70, 10, 55, 16, { reach: 20 }),
  goblin2: E('goblin2', 'Scavenger Raider', 90, 13, 58, 22, { reach: 20 }),
  goblin3: E('goblin3', 'Scavenger Chief', 120, 16, 60, 30, { reach: 20 }),
  orc1: E('orc1', 'Hollow Brute', 150, 18, 50, 36, { reach: 22 }),
  orc2: E('orc2', 'Hollow Warrior', 190, 22, 52, 44, { reach: 22 }),
  orc3: E('orc3', 'Hollow Warlord', 240, 26, 55, 55, { reach: 22 }),
  lizardman1: E('lizardman1', 'Vein Sentry', 200, 24, 62, 50, { reach: 22, aggro: 110 }),
  lizardman2: E('lizardman2', 'Sentry Knight', 260, 28, 64, 62, { reach: 22, aggro: 110 }),
  lizardman3: E('lizardman3', 'Sentry Lord', 340, 34, 66, 80, { reach: 22, aggro: 110 }),
  vampire1: E('vampire1', 'Archive Warden', 320, 32, 70, 80, { reach: 22, aggro: 120 }),
  vampire2: E('vampire2', 'Warden Adept', 400, 38, 72, 100, { reach: 22, aggro: 120 }),
  vampire3: E('vampire3', 'Warden Prime', 500, 44, 74, 130, { reach: 22, aggro: 120 }),
  demon1: E('demon1', 'Vein Horror', 550, 46, 60, 150, { reach: 28, aggro: 140, big: true }),
  demon2: E('demon2', 'Vein Fiend', 700, 54, 62, 200, { reach: 28, aggro: 140, big: true }),
  demon3: E('demon3', 'The Archivist', 2600, 70, 58, 1200, { reach: 32, aggro: 400, atkCd: 0.9, big: true, boss: true }),
};

// The journey west to east: the forest road home, Greyhaven, the Hollow March, the Sunken Archive.
RPG.ZONES = [
  { id: 'forest', name: 'The Forest Path', recommended: 1, count: 10, respawn: 7,
    roster: ['slime1', 'slime1', 'slime2', 'slime2', 'slime3', 'slime_monster1', 'goblin1', 'goblin1', 'goblin2'],
    guardian: 'corrupted', arrive: null },
  { id: 'greyhaven', name: 'Greyhaven', recommended: 1, count: 0, respawn: 0, roster: [], town: true,
    arrive: 'greyhaven', exitNeeds: 'prologue.toll', exitLocked: 'The road east waits. Mira first — the Hunter Hall is north of the plaza.' },
  { id: 'grassland', name: 'Hollow March', recommended: 3, count: 12, respawn: 6,
    roster: ['goblin3', 'orc1', 'orc1', 'orc2', 'orc3', 'lizardman1', 'lizardman1', 'lizardman2', 'slime_monster2', 'slime_monster3'],
    arrive: 'march' },
  { id: 'cursed', name: 'The Sunken Archive', recommended: 6, count: 12, respawn: 6, boss: 'demon3',
    roster: ['lizardman3', 'vampire1', 'vampire1', 'vampire2', 'vampire2', 'vampire3', 'demon1', 'demon1', 'demon2'],
    arrive: 'descent' },
];
// Rooms entered through doors in a town. Their arrival scenes fire once.
RPG.ROOMS = {
  hall_int: { arrive: ['hall', 'toll'] },
  clinic_int: {},
  lift_int: {},
};

RPG.SAVE_KEY = 'therpg-save-v3';

RPG.Game = class {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.ui = ui;
    this.input = { up: false, down: false, left: false, right: false, run: false, attackPressed: false, action: false };
    this.scale = 3;
    this.running = false;
    this.paused = false;
    this.time = 0;
    this.shake = 0;
    this.flags = {};
    this.objective = '';
    this.story = new RPG.Story(this, ui);
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
    const lvl = save ? Math.max(1, Math.min(RPG.MAX_LEVEL, save.level || 1)) : 1;
    this.player = new RPG.Player(lvl, save && lvl < RPG.MAX_LEVEL ? save.xp || 0 : 0);
    this.player.kills = save ? save.kills || 0 : 0;
    this.zoneIndex = save ? Math.min(save.zone || 0, RPG.ZONES.length - 1) : 0;
    this.bossDefeated = !!(save && save.bossDefeated);
    this.flags = (save && save.flags) || {};
    this.objective = (save && save.objective) || 'Reach Greyhaven';
    this.running = true;
    this.paused = false;
    this.gameOver = false;
    this.ui.showHud(true);
    this.ui.setObjective(this.objective);
    if (!save) {
      this.story.target.black = 1;
      this.story.fx.black = 1;
      this.loadZone(0, 'entry', true);
      this.story.play([RPG.SCENES.memory, RPG.SCENES.void]);
    } else {
      this.loadZone(this.zoneIndex, 'entry', false);
    }
  }

  // Shared setup for wild zones, the town and interiors.
  enterMap(id, spawnTile, dir) {
    this.map = new RPG.GameMap(id);
    this.enemies = [];
    this.npcs = [];
    this.pickups = [];
    this.fx = [];
    this.boss = null;
    this.guardian = null;
    const p = this.player;
    const spawn = this.map.tileCenter(spawnTile);
    p.x = spawn[0]; p.y = spawn[1];
    p.state = 'idle'; p.setAnim('idle'); p.kx = p.ky = 0; p.dir = dir;
    this.portalLock = true;
    for (const n of this.map.npcs) this.npcs.push(new RPG.Npc(n));
    this.ui.showBoss(null);
  }

  loadZone(index, at, silent) {
    this.zoneIndex = index;
    this.zone = RPG.ZONES[index];
    this.room = null;
    this.enterMap(this.zone.id, at === 'exit' ? RPG.MAPS[this.zone.id].exit : RPG.MAPS[this.zone.id].entry, at === 'exit' ? 2 : 3);
    const map = this.map;
    this.respawnTimer = this.zone.respawn;
    this.exitPortal = map.tileCenter(map.exit);
    this.entryPortal = index > 0 ? map.tileCenter(map.entry) : null;
    for (let i = 0; i < this.zone.count; i++) this.spawnEnemy(true);

    if (this.zone.boss && !this.bossDefeated) {
      const near = map.nearestWalkable(this.exitPortal[0] - 40, this.exitPortal[1]);
      this.boss = new RPG.Enemy(RPG.ENEMIES[this.zone.boss], near[0], near[1]);
      this.boss.dir = 2;
      this.enemies.push(this.boss);
    }
    if (this.zone.guardian && !this.flags['prologue.creature']) {
      const near = map.nearestWalkable(this.exitPortal[0] - 36, this.exitPortal[1] + 8);
      this.guardian = new RPG.Enemy(RPG.ENEMIES[this.zone.guardian], near[0], near[1]);
      this.guardian.dir = 2;
      this.enemies.push(this.guardian);
    }
    this.ui.showBoss(this.boss);
    this.save();
    if (silent) return;
    const arrive = this.zone.arrive && !this.flags[RPG.SCENES[this.zone.arrive].id] ? RPG.SCENES[this.zone.arrive] : null;
    if (arrive) this.story.play(arrive);
    else this.ui.banner(this.zone.name, this.zone.town ? 'Talk to people with Space / the sword button' : 'Recommended level ' + this.zone.recommended);
  }

  enterRoom(id) {
    RPG.Audio.interact();
    this.room = Object.assign({ id }, RPG.ROOMS[id] || {});
    this.enterMap(id, RPG.MAPS[id].entry, 3);
    this.exitPortal = null;
    this.entryPortal = this.map.tileCenter(this.map.entry);
    this.ui.location(RPG.MAPS[id].label || id, '');
    const scenes = (this.room.arrive || []).map((k) => RPG.SCENES[k]).filter((s) => !this.flags[s.id]);
    if (scenes.length) this.story.play(scenes);
  }

  leaveRoom() {
    RPG.Audio.interact();
    const back = this.map.exitTo;
    const town = RPG.ZONES.findIndex((z) => z.id === back.zone);
    this.zone = RPG.ZONES[town];
    this.zoneIndex = town;
    this.room = null;
    this.enterMap(back.zone, back.cell, 0);
    // step just below the door so it doesn't retrigger
    this.player.y += 10;
    const map = this.map;
    this.respawnTimer = 1e9;
    this.exitPortal = map.tileCenter(map.exit);
    this.entryPortal = town > 0 ? map.tileCenter(map.entry) : null;
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

  setObjective(text) {
    this.objective = text;
    this.ui.setObjective(text);
  }

  save() {
    try {
      localStorage.setItem(RPG.SAVE_KEY, JSON.stringify({
        level: this.player.level, xp: this.player.xp, zone: this.zoneIndex,
        kills: this.player.kills, bossDefeated: this.bossDefeated,
        flags: this.flags, objective: this.objective,
      }));
    } catch (e) { /* storage unavailable */ }
  }

  static loadSave() {
    try { return JSON.parse(localStorage.getItem(RPG.SAVE_KEY)); } catch (e) { return null; }
  }

  // ------------------------------------------------------------ talking & examining
  interact() {
    const p = this.player;
    let best = null, bd = 30;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < bd) { bd = d; best = { kind: 'npc', obj: n, id: n.id }; }
    }
    for (const o of this.map.objects) {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < o.radius && d < bd + 8) { bd = d; best = { kind: 'object', obj: o, id: o.id }; }
    }
    if (!best) return false;
    const talk = RPG.TALK[best.id];
    if (!talk) return false;
    if (best.kind === 'npc') { best.obj.faceToward(p.x, p.y); p.faceToward(best.obj.x, best.obj.y); }
    const flag = 'talk.' + best.id;
    let lines = talk.first;
    if (this.bossDefeated && talk.after) lines = this.flags[flag + '.after'] ? talk.again || talk.after : talk.after;
    else if (this.flags[flag] && talk.again) lines = talk.again;
    const beats = [];
    if (talk.resonance) beats.push({ fx: { flash: 0.35 }, cue: 'resonance', wait: 0.2 });
    beats.push({ say: lines });
    if (talk.rest) beats.push({ then: () => { p.hp = p.maxHp; this.flags['rested'] = true; RPG.Audio.rest(); this.save(); this.fx.push(new RPG.FloatText(p.x, p.y - 22, 'RESTED', '#7bff8a')); }, wait: 0.2 });
    if (talk.heal) beats.push({ then: () => { p.hp = p.maxHp; RPG.Audio.pickup(); this.fx.push(new RPG.FloatText(p.x, p.y - 22, 'HEALED', '#7bff8a')); }, wait: 0.2 });
    this.story.play({ id: flag + (this.bossDefeated && talk.after ? '.after' : ''), beats });
    return true;
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
      setTimeout(() => this.story.play(RPG.SCENES.welcome, () => this.victory()), 1500);
    } else if (e.def.special === 'corrupted') {
      this.pickups.push(new RPG.Heart(e.x, e.y, true));
      setTimeout(() => this.story.play(RPG.SCENES.creature), 900);
    } else if (Math.random() < 0.22) {
      this.pickups.push(new RPG.Heart(e.x, e.y, false));
    }
    this.save();
  }

  onLevelUp() {
    const p = this.player;
    RPG.Audio.levelUp();
    this.fx.push(new RPG.FloatText(p.x, p.y - 30, 'LEVEL UP!', '#ffd866'));
    this.ui.banner('Level ' + p.level, 'HP ' + p.maxHp + ' · Shardblade ' + p.dmg);
    if (p.level >= 5 && !this.flags['axiom.stirs']) setTimeout(() => this.story.play(RPG.SCENES.axiom), 1200);
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
    this.loadZone(this.zoneIndex, 'entry', true);
    this.ui.banner(this.zone.name, 'The hearth takes the ache out of you. Try again.');
  }

  victory() {
    RPG.Audio.victory();
    this.save();
    this.ui.showVictory(this.player);
  }

  // Portal gates: the forest is held by the Vein-Corrupted, Greyhaven by the first toll,
  // the Archive by the Archivist.
  exitOpen() {
    if (this.room || this.zoneIndex >= RPG.ZONES.length - 1) return false;
    if (this.guardian && this.guardian.state !== 'dead') return false;
    if (this.zone.exitNeeds && !this.flags[this.zone.exitNeeds]) return false;
    return true;
  }

  goToZone(index, at) {
    RPG.Audio.portal();
    this.loadZone(index, at, false);
  }

  // ------------------------------------------------------------ update
  update(dt) {
    if (!this.running || this.paused) return;
    if (this.story.active) {
      this.story.update(dt, this.input.action);
      this.input.attackPressed = false;
      this.shake = Math.max(0, this.shake - dt);
      this.ui.updateHud(this);
      return;
    }
    this.story.update(dt, false);
    this.time += dt;
    const p = this.player, map = this.map;
    const peaceful = !!(this.zone.town || this.room);

    if (peaceful && this.input.attackPressed) {
      this.input.attackPressed = false;
      if (!this.interact()) RPG.Audio.blip();
    }
    p.update(dt, this);
    for (const n of this.npcs) n.update(dt, this);

    for (const e of this.enemies) e.update(dt, this);
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

    if (!peaceful) {
      const alive = this.enemies.filter((e) => e.state !== 'dead' && !e.boss && !e.def.special).length;
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawnTimer = this.zone.respawn;
        if (alive < this.zone.count) this.spawnEnemy(false);
      }
    }

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

    // story triggers
    if (p.state !== 'dead' && !this.room) {
      if (this.zone.id === 'forest' && !this.flags['prologue.vision'] && p.x > map.pw * 0.45) {
        this.story.play(RPG.SCENES.vision);
      }
      if (this.boss && this.boss.state !== 'dead' && !this.flags['archive.archivist'] &&
          Math.hypot(this.boss.x - p.x, this.boss.y - p.y) < 130) {
        this.story.play(RPG.SCENES.archivist);
      }
    }

    // doors, portals
    if (p.state !== 'dead' && !this.story.active) {
      const tx = Math.floor(p.x / map.tile), ty = Math.floor(p.y / map.tile);
      const nearExit = this.exitPortal && Math.hypot(p.x - this.exitPortal[0], p.y - this.exitPortal[1]) < 10;
      const nearEntry = this.entryPortal && Math.hypot(p.x - this.entryPortal[0], p.y - this.entryPortal[1]) < 10;
      const door = map.doors.find((d) => d.cells.some((c) => c[0] === tx && c[1] === ty));
      if (this.portalLock && !nearExit && !nearEntry && !door) this.portalLock = false;
      if (!this.portalLock) {
        if (this.room && nearEntry) this.leaveRoom();
        else if (door) this.enterRoom(door.zone);
        else if (nearExit) {
          if (this.exitOpen()) this.goToZone(this.zoneIndex + 1, 'entry');
          else if (this.zone.exitLocked && !this.lockedHint) { this.lockedHint = true; this.ui.banner('The way is barred', this.zone.exitLocked); setTimeout(() => { this.lockedHint = false; }, 4000); }
        } else if (nearEntry && !this.room) this.goToZone(this.zoneIndex - 1, 'exit');
      }
    }

    this.shake = Math.max(0, this.shake - dt);
    this.ui.updateHud(this);
  }

  // ------------------------------------------------------------ render
  render() {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    ctx.fillStyle = this.room ? '#120c0c' : '#0b0b12';
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
    const vx0 = Math.max(0, camX), vy0 = Math.max(0, camY);
    const vx1 = Math.min(map.pw, camX + cw), vy1 = Math.min(map.ph, camY + ch);
    const vw = vx1 - vx0, vh = vy1 - vy0;
    if (vw > 0 && vh > 0) {
      const water = map.water[Math.floor(this.time / 0.15) % map.water.length];
      this.blit(water, vx0, vy0, vw, vh);
      this.blit(map.ground, vx0, vy0, vw, vh);
    }

    if (this.exitPortal) this.drawPortal(this.exitPortal, this.exitOpen() ? '#4ec9ff' : (this.zoneIndex === RPG.ZONES.length - 1 ? '#b23bff' : '#ff4d4d'));
    if (this.entryPortal) this.drawPortal(this.entryPortal, '#7bff8a');
    for (const d of map.doors) this.drawDoor(d);
    for (const h of this.pickups) h.draw(ctx);

    const ents = this.enemies.concat(this.npcs, [p]).sort((a, b) => a.y - b.y);
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

    // talk prompt
    if ((this.zone.town || this.room) && !this.story.active) {
      const near = this.npcs.find((n) => Math.hypot(n.x - p.x, n.y - p.y) < 30) ||
        map.objects.find((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.radius);
      if (near) {
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const label = near.talk ? near.talk.name : (RPG.TALK[near.id] || { name: near.id }).name;
        const y = Math.round(near.y - (near.set ? near.set.anchor[1] - near.set.def.bbox[1] : 14) - 8);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(Math.round(near.x) - label.length * 3.5 - 3, y - 8, label.length * 7 + 6, 11);
        ctx.fillStyle = '#4fd6c8';
        ctx.fillText(label, Math.round(near.x), y);
      }
    }

    for (const f of this.fx) f.draw(ctx);
    ctx.restore();

    if (this.zone.id === 'cursed' && !this.room) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.35, cw / 2, ch / 2, ch * 0.9);
      g.addColorStop(0, 'rgba(20,0,0,0)');
      g.addColorStop(1, 'rgba(20,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
    }
    this.story.draw(ctx, cw, ch);
  }

  blit(img, x, y, w, h) {
    if (!img.complete || !img.naturalWidth) return;
    this.ctx.drawImage(img, x, y, w, h, x, y, w, h);
  }

  drawDoor(d) {
    const ctx = this.ctx, t = this.map.tile;
    const pulse = 0.4 + Math.sin(this.time * 3) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd866';
    for (const [x, y] of d.cells) ctx.fillRect(x * t + 2, y * t + t - 3, t - 4, 2);
    ctx.globalAlpha = 1;
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
