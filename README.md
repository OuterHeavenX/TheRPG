# TheRPG

A top-down pixel-art action RPG that runs in the browser. No build step, no dependencies:
open `index.html` or serve the folder with any static file server.

Fight your way through three hand-made zones, level your swordsman from a ragged
level-1 wanderer to a level-9 armored knight (the sprite changes as you level), and
slay the Demon Lord.

## Play

- **Move**: WASD or arrow keys · **Run**: Shift
- **Attack**: Space, J, K, Z, Enter, or click
- **Pause**: Esc

Progress (level, XP, zone) is saved automatically in the browser.

Run locally:

```bash
python -m http.server 8000
```

then visit http://localhost:8000. Opening `index.html` directly also works.

## Zones

| Zone | Enemies | Recommended level |
| --- | --- | --- |
| Verdant Glades | slimes, goblins | 1 |
| Whispering Forest | goblins, orcs, lizardmen, slime beasts | 3 |
| Cursed Lands | lizard lords, vampires, demons, **Demon Lord** (boss) | 6 |

Walk into the blue portal at the east edge of a zone to move on; the green portal takes
you back. In the Cursed Lands the portal stays locked until the Demon Lord is dead.

## Project layout

```
index.html          entry point
css/style.css       HUD and menu styling
js/audio.js         tiny procedural sound effects
js/assets.js        image loading + SpriteSet (sheet = 4 rows: down/up/left/right)
js/map.js           baked map loader + tile collision
js/entities.js      Player, Enemy AI, pickups, floating text
js/game.js          zones, enemy roster/stats, spawning, combat, camera, rendering
js/main.js          input, UI wiring, main loop
assets/characters/  swordsman_lvl1..9 sprite sheets
assets/enemies/     slime, goblin, orc, lizardman, vampire, demon sheets (3 tiers each)
assets/tilesets/    craftpix tilesets + the original Tiled (.tmx) maps
assets/maps/        baked maps (water frames, ground, over layer, collision) per zone
assets/sprites.js   sprite manifest (frame size, frames per row, feet anchor)
tools/bake_maps.py  Tiled .tmx -> baked PNG layers + collision grid + map.js
tools/sprite_manifest.py  scans the sprite sheets -> assets/sprites.js
```

To rebuild the generated data after editing a map or adding sprites (needs Python 3 + Pillow):

```bash
python tools/bake_maps.py
python tools/sprite_manifest.py
```

## Art credits and license

All character, enemy and tileset art is by [CraftPix.net](https://craftpix.net) and is used
under the [CraftPix file license](https://craftpix.net/file-licenses/). The art is included
here only as part of this game; it is not a redistribution of the asset packs. If you fork
this project, please respect that license (in particular, do not extract and re-share the
art on its own). Source files from the packs (PSD, Aseprite) are intentionally not included.

Game code is released under the MIT license (see `LICENSE`).
