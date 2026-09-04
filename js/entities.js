// Player, enemies, pickups and floating text.
window.RPG = window.RPG || {};

const DIR_VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // down, up, left, right

RPG.Entity = class {
  constructor(set, x, y) {
    this.set = set;
    this.x = x;
    this.y = y;
    this.dir = 0;
    this.anim = 'idle';
    this.frame = 0;
    this.ft = 0;
    this.animDone = false;
    this.hw = 5;      // half width of the feet collision box
    this.hTop = 6;    // box extends this far above the feet
    this.hBot = 2;    // ... and this far below
    this.kx = 0;      // knockback velocity
    this.ky = 0;
    this.alpha = 1;
    this.remove = false;
  }

  setAnim(name) {
    if (!this.set.has(name)) {
      if (name === 'run') name = 'walk';
      else if (name === 'attack') name = 'attack_normal';
      else if (name === 'walk' || name === 'hurt') name = 'idle';
    }
    if (this.anim !== name) {
      this.anim = name;
      this.frame = 0;
      this.ft = 0;
      this.animDone = false;
    }
  }

  animate(dt, loop) {
    const spd = RPG.ANIM_SPEED[this.anim] || 0.1;
    const n = this.set.frames(this.anim, this.dir);
    this.ft += dt;
    while (this.ft >= spd) {
      this.ft -= spd;
      this.frame++;
      if (this.frame >= n) {
        if (loop) this.frame = 0;
        else { this.frame = n - 1; this.animDone = true; this.ft = 0; break; }
      }
    }
  }

  progress() {
    const spd = RPG.ANIM_SPEED[this.anim] || 0.1;
    const n = this.set.frames(this.anim, this.dir);
    return (this.frame + this.ft / spd) / n;
  }

  tryMove(dx, dy, map) {
    if (dx) {
      const nx = this.x + dx;
      if (map.boxFree(nx - this.hw, this.y - this.hTop, nx + this.hw, this.y + this.hBot)) this.x = nx;
    }
    if (dy) {
      const ny = this.y + dy;
      if (map.boxFree(this.x - this.hw, ny - this.hTop, this.x + this.hw, ny + this.hBot)) this.y = ny;
    }
  }

  applyKnockback(dt, map) {
    if (!this.kx && !this.ky) return;
    this.tryMove(this.kx * dt, this.ky * dt, map);
    const f = Math.pow(0.001, dt);
    this.kx *= f;
    this.ky *= f;
    if (Math.abs(this.kx) + Math.abs(this.ky) < 4) this.kx = this.ky = 0;
  }

  faceToward(tx, ty) {
    const dx = tx - this.x, dy = ty - this.y;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  }

  facing() { return DIR_VEC[this.dir]; }

  draw(ctx) {
    if (this.alpha < 1) ctx.globalAlpha = this.alpha;
    this.set.draw(ctx, this.anim, this.dir, this.frame, this.x, this.y);
    if (this.alpha < 1) ctx.globalAlpha = 1;
  }
};

// ---------------------------------------------------------------- Player
RPG.MAX_LEVEL = 9;

RPG.Player = class extends RPG.Entity {
  constructor(level, xp) {
    super(new RPG.SpriteSet('characters/swordsman_lvl1'), 0, 0);
    this.level = level || 1;
    this.xp = xp || 0;
    this.kills = 0;
    this.applyLevel();
    this.hp = this.maxHp;
    this.state = 'idle';
    this.inv = 0;
    this.atkApplied = false;
  }

  applyLevel() {
    const L = this.level;
    this.maxHp = 80 + 20 * L;
    this.dmg = 8 + 4 * L;
    this.walkSpeed = 56 + L * 1.5;
    this.runSpeed = 96 + L * 2;
    this.reach = 26 + Math.min(L, 9);
    this.set = new RPG.SpriteSet('characters/swordsman_lvl' + Math.min(L, 9));
    this.attackAnim = this.set.has('attack') ? 'attack' : 'attack_normal';
  }

  // Level 9 is the end of the road and it is meant to be a long one: 80 * L^2.5 XP per level
  // (80, 452, 1247, 2560, 4472, 7056, 10373, 14482 -> about 40,000 XP in total).
  xpNeeded() { return this.level >= RPG.MAX_LEVEL ? Infinity : Math.round(80 * Math.pow(this.level, 2.5)); }

  gainXp(n, game) {
    if (this.level >= RPG.MAX_LEVEL) return;
    this.xp += n;
    while (this.level < RPG.MAX_LEVEL && this.xp >= this.xpNeeded()) {
      this.xp -= this.xpNeeded();
      this.level++;
      this.applyLevel();
      this.hp = this.maxHp;
      game.onLevelUp();
    }
    if (this.level >= RPG.MAX_LEVEL) this.xp = 0;
  }

  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  update(dt, game) {
    const input = game.input, map = game.map;
    if (this.state === 'dead') { this.animate(dt, false); return; }
    this.inv = Math.max(0, this.inv - dt);
    this.applyKnockback(dt, map);

    if (this.state === 'hurt') {
      this.animate(dt, false);
      if (this.animDone) { this.state = 'idle'; this.setAnim('idle'); }
      return;
    }
    if (this.state === 'attack') {
      this.animate(dt, false);
      if (!this.atkApplied && this.progress() >= 0.4) {
        this.atkApplied = true;
        game.playerStrike(this);
      }
      if (this.animDone) { this.state = 'idle'; this.setAnim('idle'); }
      return;
    }

    if (input.attackPressed) {
      input.attackPressed = false;
      this.state = 'attack';
      this.atkApplied = false;
      this.setAnim(this.attackAnim);
      RPG.Audio.swing();
      return;
    }

    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      const run = input.run;
      const sp = run ? this.runSpeed : this.walkSpeed;
      this.tryMove(mx * sp * dt, my * sp * dt, map);
      this.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 2 : 3) : (my < 0 ? 1 : 0);
      this.setAnim(run ? 'run' : 'walk');
    } else {
      this.setAnim('idle');
    }
    this.animate(dt, true);
  }

  takeDamage(n, fromX, fromY, game) {
    if (this.inv > 0 || this.state === 'dead') return false;
    this.hp -= n;
    this.inv = 0.8;
    const dx = this.x - fromX, dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.kx = dx / d * 90;
    this.ky = dy / d * 90;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.setAnim('death');
      game.onPlayerDeath();
    } else {
      this.state = 'hurt';
      this.setAnim('hurt');
      RPG.Audio.hurt();
    }
    return true;
  }

  draw(ctx) {
    this.alpha = (this.inv > 0 && this.state !== 'dead' && Math.floor(this.inv * 24) % 2 === 0) ? 0.45 : 1;
    super.draw(ctx);
  }
};

// ---------------------------------------------------------------- Enemy
RPG.Enemy = class extends RPG.Entity {
  constructor(def, x, y) {
    super(new RPG.SpriteSet(def.key), x, y);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.state = 'idle';
    this.timer = Math.random() * 2;
    this.cd = Math.random();
    this.wx = 0;
    this.wy = 0;
    this.boss = !!def.boss;
    this.fade = 0;
    this.atkApplied = false;
    if (def.big) { this.hw = 7; this.hTop = 8; }
  }

  update(dt, game) {
    const p = game.player, map = game.map;
    if (this.state === 'dead') {
      this.animate(dt, false);
      if (this.animDone) {
        this.fade += dt;
        this.alpha = Math.max(0, 1 - this.fade / 1.2);
        if (this.fade >= 1.2) this.remove = true;
      }
      return;
    }
    this.cd = Math.max(0, this.cd - dt);
    this.applyKnockback(dt, map);

    if (this.state === 'hurt') {
      this.animate(dt, false);
      if (this.animDone) { this.state = 'chase'; this.setAnim('idle'); }
      return;
    }

    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const alive = p.state !== 'dead';

    if (this.state === 'attack') {
      this.animate(dt, false);
      if (!this.atkApplied && this.progress() >= 0.5) {
        this.atkApplied = true;
        if (alive && dist < this.def.reach + 10) game.enemyStrike(this);
      }
      if (this.animDone) { this.state = 'chase'; this.cd = this.def.atkCd; this.setAnim('idle'); }
      return;
    }

    if (alive && dist < this.def.aggro) this.state = 'chase';
    else if (this.state === 'chase' && (!alive || dist > this.def.aggro * 1.8)) { this.state = 'idle'; this.timer = 1; }

    if (this.state === 'chase') {
      if (dist < this.def.reach && this.cd <= 0) {
        this.state = 'attack';
        this.atkApplied = false;
        this.faceToward(p.x, p.y);
        this.setAnim('attack');
        this.animate(0, false);
      } else if (dist > this.def.reach * 0.75) {
        const sp = this.def.speed;
        this.tryMove(dx / dist * sp * dt, dy / dist * sp * dt, map);
        this.faceToward(p.x, p.y);
        this.setAnim(sp > 45 ? 'run' : 'walk');
      } else {
        this.faceToward(p.x, p.y);
        this.setAnim('idle');
      }
    } else {
      this.timer -= dt;
      if (this.state === 'wander') {
        this.tryMove(this.wx * dt, this.wy * dt, map);
        this.setAnim('walk');
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 1 + Math.random() * 2.5; }
      } else {
        this.setAnim('idle');
        if (this.timer <= 0) {
          this.state = 'wander';
          const a = Math.random() * Math.PI * 2;
          const sp = this.def.speed * 0.5;
          this.wx = Math.cos(a) * sp;
          this.wy = Math.sin(a) * sp;
          this.dir = Math.abs(this.wx) > Math.abs(this.wy) ? (this.wx < 0 ? 2 : 3) : (this.wy < 0 ? 1 : 0);
          this.timer = 0.8 + Math.random() * 1.6;
        }
      }
    }
    this.animate(dt, true);
  }

  takeDamage(n, fromX, fromY, game) {
    if (this.state === 'dead') return false;
    this.hp -= n;
    const dx = this.x - fromX, dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    const k = this.boss ? 25 : 80;
    this.kx = dx / d * k;
    this.ky = dy / d * k;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.setAnim('death');
      game.onEnemyKilled(this);
    } else if (!this.boss || Math.random() < 0.25) {
      this.state = 'hurt';
      this.setAnim('hurt');
    } else {
      this.state = 'chase';
    }
    return true;
  }

  draw(ctx) {
    super.draw(ctx);
    if (this.state !== 'dead' && this.hp < this.maxHp && !this.boss) {
      const w = 18, x = Math.round(this.x - w / 2), y = Math.round(this.y - this.set.anchor[1] + this.set.def.bbox[1] - 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 1, y - 1, w + 2, 4);
      ctx.fillStyle = '#e04848';
      ctx.fillRect(x, y, Math.round(w * this.hp / this.maxHp), 2);
    }
  }
};

// ---------------------------------------------------------------- Pickups & effects
RPG.Heart = class {
  constructor(x, y, big) { this.x = x; this.y = y; this.t = Math.random() * 6; this.big = !!big; this.remove = false; this.life = 40; }
  update(dt) { this.t += dt; this.life -= dt; if (this.life <= 0) this.remove = true; }
  draw(ctx) {
    const bob = Math.round(Math.sin(this.t * 4) * 1.5);
    const x = Math.round(this.x), y = Math.round(this.y) + bob - 6;
    const c = this.big ? '#ffd866' : '#ff4d6d';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - 3, Math.round(this.y) - 1, 6, 2);
    ctx.fillStyle = c;
    ctx.fillRect(x - 3, y - 3, 2, 2); ctx.fillRect(x + 1, y - 3, 2, 2);
    ctx.fillRect(x - 4, y - 2, 8, 2);
    ctx.fillRect(x - 3, y, 6, 1);
    ctx.fillRect(x - 2, y + 1, 4, 1);
    ctx.fillRect(x - 1, y + 2, 2, 1);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 3, y - 2, 1, 1);
  }
};

RPG.FloatText = class {
  constructor(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color || '#fff'; this.t = 0; this.remove = false; }
  update(dt) { this.t += dt; if (this.t > 0.9) this.remove = true; }
  draw(ctx) {
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.max(0, 1 - this.t / 0.9);
    const y = Math.round(this.y - 20 - this.t * 22);
    ctx.fillStyle = '#000';
    ctx.fillText(this.text, Math.round(this.x) + 1, y + 1);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, Math.round(this.x), y);
    ctx.globalAlpha = 1;
  }
};

RPG.Spark = class {
  constructor(x, y, color) { this.x = x; this.y = y; this.t = 0; this.color = color || '#fff'; this.remove = false; }
  update(dt) { this.t += dt; if (this.t > 0.25) this.remove = true; }
  draw(ctx) {
    const r = 2 + this.t * 30;
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 1 - this.t / 0.25;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y - 8, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
};
