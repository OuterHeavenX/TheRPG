// Pre-baked zone maps (see tools/bake_maps.py): water frames, ground, over layer, collision grid.
window.RPG = window.RPG || {};

RPG.GameMap = class {
  constructor(id) {
    const m = RPG.MAPS[id];
    if (!m) throw new Error('Unknown map ' + id);
    this.id = id;
    this.w = m.w;
    this.h = m.h;
    this.tile = m.tile || 16;
    this.pw = this.w * this.tile;
    this.ph = this.h * this.tile;
    this.solid = m.solid;
    this.entry = m.entry;
    this.exit = m.exit;
    this.kind = m.kind || 'wild';
    this.label = m.label || '';
    this.doors = m.doors || [];
    this.npcs = m.npcs || [];
    this.objects = m.objects || [];
    this.exitTo = m.exitTo || null;
    this.water = [];
    for (let i = 0; i < m.waterFrames; i++) this.water.push(RPG.Assets.img('assets/maps/' + id + '/water_' + i + '.png'));
    this.ground = RPG.Assets.img('assets/maps/' + id + '/ground.png');
    this.over = RPG.Assets.img('assets/maps/' + id + '/over.png');
    this.walkable = [];
    for (let i = 0; i < m.solid.length; i++) {
      if (m.solid[i] === '0') this.walkable.push([i % this.w, Math.floor(i / this.w)]);
    }
  }

  isSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    return this.solid.charCodeAt(ty * this.w + tx) === 49; // '1'
  }

  // True when the axis-aligned box (world px) touches no solid tile.
  boxFree(x0, y0, x1, y1) {
    const t = this.tile;
    const tx0 = Math.floor(x0 / t), tx1 = Math.floor(x1 / t);
    const ty0 = Math.floor(y0 / t), ty1 = Math.floor(y1 / t);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) if (this.isSolid(tx, ty)) return false;
    }
    return true;
  }

  tileCenter(t) { return [t[0] * this.tile + this.tile / 2, t[1] * this.tile + this.tile / 2]; }

  randomWalkable() {
    const t = this.walkable[Math.floor(Math.random() * this.walkable.length)];
    return this.tileCenter(t);
  }

  // Nearest walkable tile center to a world position.
  nearestWalkable(px, py) {
    let best = null, bd = Infinity;
    for (const t of this.walkable) {
      const c = this.tileCenter(t);
      const d = (c[0] - px) ** 2 + (c[1] - py) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
};
