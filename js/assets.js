// Image loading and sprite-sheet helpers.
window.RPG = window.RPG || {};

RPG.ANIM_SPEED = {
  idle: 0.12, walk: 0.1, run: 0.075, attack: 0.065, attack_normal: 0.065,
  run_attack: 0.075, walk_attack: 0.09, hurt: 0.06, death: 0.11,
};

RPG.Assets = {
  images: {},
  pending: 0,
  loaded: 0,

  img(src) {
    let im = this.images[src];
    if (!im) {
      im = new Image();
      this.pending++;
      im.onload = () => { this.loaded++; };
      im.onerror = () => { this.loaded++; console.warn('Missing image:', src); };
      im.src = src;
      this.images[src] = im;
    }
    return im;
  },

  ready() { return this.loaded >= this.pending; },
  progress() { return this.pending ? this.loaded / this.pending : 1; },

  preloadAll() {
    for (const key in RPG.SPRITES) {
      const def = RPG.SPRITES[key];
      for (const anim in def) if (def[anim] && def[anim].fs) this.img('assets/' + key + '/' + anim + '.png');
    }
    for (const z in RPG.MAPS) {
      const m = RPG.MAPS[z];
      for (let i = 0; i < m.waterFrames; i++) this.img('assets/maps/' + z + '/water_' + i + '.png');
      this.img('assets/maps/' + z + '/ground.png');
      this.img('assets/maps/' + z + '/over.png');
    }
  },
};

// A character's set of animation sheets. Rows: 0 down, 1 up, 2 left, 3 right.
RPG.SpriteSet = class {
  constructor(key) {
    this.key = key;
    this.def = RPG.SPRITES[key];
    if (!this.def) throw new Error('Unknown sprite set ' + key);
    this.anchor = this.def.anchor || [32, 44];
    this.rows = this.def.rows || [0, 1, 2, 3]; // sheet row for each facing: down, up, left, right
    this.imgs = {};
  }

  has(anim) {
    const a = this.def[anim];
    return !!(a && a.fs && a.frames.some((n) => n > 0));
  }

  frames(anim, dir) {
    const a = this.def[anim];
    if (!a) return 1;
    return a.frames[this.rows[dir]] || a.frames[0] || 1;
  }

  image(anim) {
    return this.imgs[anim] || (this.imgs[anim] = RPG.Assets.img('assets/' + this.key + '/' + anim + '.png'));
  }

  draw(ctx, anim, dir, frame, x, y) {
    const a = this.def[anim];
    if (!a) return;
    const img = this.image(anim);
    if (!img.complete || !img.naturalWidth) return;
    const fs = a.fs;
    const n = this.frames(anim, dir);
    frame = Math.max(0, Math.min(frame, n - 1));
    ctx.drawImage(img, frame * fs, this.rows[dir] * fs, fs, fs,
      Math.round(x - this.anchor[0]), Math.round(y - this.anchor[1]), fs, fs);
  }
};
