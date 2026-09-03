// Mobile touch controls: floating joystick (left half), attack / run / journal buttons (right).
// Shown when the device has a coarse pointer or touch support.
window.RPG = window.RPG || {};

RPG.Touch = {
  install(game, ui, togglePause) {
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const root = document.getElementById('touch');
    if (!isTouch || !root) return false;
    root.classList.remove('hidden');
    document.body.classList.add('touch');

    const joy = document.getElementById('joy');
    const knob = document.getElementById('joy-knob');
    const RADIUS = 44;          // px the knob can travel
    const DEAD = 10;
    let joyId = null, ox = 0, oy = 0;

    const setDir = (dx, dy) => {
      const d = Math.hypot(dx, dy);
      const on = d > DEAD;
      const nx = on ? dx / d : 0, ny = on ? dy / d : 0;
      game.input.left = on && nx < -0.38;
      game.input.right = on && nx > 0.38;
      game.input.up = on && ny < -0.38;
      game.input.down = on && ny > 0.38;
      const k = Math.min(d, RADIUS);
      knob.style.transform = on ? 'translate(' + (nx * k) + 'px,' + (ny * k) + 'px)' : 'translate(0,0)';
    };
    const clearDir = () => {
      game.input.left = game.input.right = game.input.up = game.input.down = false;
      knob.style.transform = 'translate(0,0)';
    };

    // Joystick: any touch that starts on the left 55% of the screen (outside a button) grabs it.
    const zone = document.getElementById('joy-zone');
    zone.addEventListener('touchstart', (e) => {
      if (game.story.active) { game.story.advance(); game.input.action = true; e.preventDefault(); return; }
      if (joyId !== null) return;
      const t = e.changedTouches[0];
      joyId = t.identifier;
      ox = t.clientX; oy = t.clientY;
      joy.style.left = ox + 'px';
      joy.style.top = oy + 'px';
      joy.classList.add('active');
      setDir(0, 0);
      e.preventDefault();
    }, { passive: false });
    const joyMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        setDir(t.clientX - ox, t.clientY - oy);
        e.preventDefault();
      }
    };
    const joyEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        joyId = null;
        joy.classList.remove('active');
        clearDir();
      }
      game.input.action = false;
    };
    zone.addEventListener('touchmove', joyMove, { passive: false });
    zone.addEventListener('touchend', joyEnd);
    zone.addEventListener('touchcancel', joyEnd);

    // Buttons
    const bind = (id, down, up) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); el.classList.add('down'); down(); }, { passive: false });
      const release = (e) => { e.preventDefault(); el.classList.remove('down'); if (up) up(); };
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('touchcancel', release, { passive: false });
    };
    bind('tb-attack', () => {
      RPG.Audio.init(); RPG.Audio.resume();
      if (game.story.active) { game.story.advance(); game.input.action = true; return; }
      game.input.attackPressed = true;
      game.input.action = true;
    }, () => { game.input.action = false; });
    bind('tb-run', () => { game.input.run = !game.input.run; document.getElementById('tb-run').classList.toggle('latched', game.input.run); });
    bind('tb-menu', () => { togglePause(); });

    // Never let the page scroll or zoom under the game.
    document.addEventListener('touchmove', (e) => { if (e.target === game.canvas) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    return true;
  },
};
