# TheRPG · a VEILBOUND story

A top-down pixel-art action RPG that runs in the browser. No build step, no dependencies:
open `index.html` or serve the folder with any static file server. Works on desktop and on
phones (touch controls appear automatically).

You play **Kael**, a masked relic hunter with a fractured Shardblade and the Axiom, an ancient
gauntlet fused to his forearm. The bell in Greyhaven has rung with no clapper in it, and the
Vein beneath the Hollow March is waking. Fight through three hand-made zones, level Kael from
a ragged wanderer to a fully armored knight (the sprite changes with every level), and find
out what waits at the bottom of the Sunken Archive.

## The story

The world, characters and opening are taken from the VEILBOUND canon
([OuterHeavenX/VEILBOUND](https://github.com/OuterHeavenX/VEILBOUND), `docs/CANON.md` and
`docs/OPENING.md`). Every line of the six-scene prologue is reproduced word for word:

1. **Remember My Face** — a dark room, Elara, the glitched memory, the broken-circle symbol.
2. **The Void** — Caldris and Serac: *"Without her face, he will never find the door."*
3. **The Forest Path** — Kael walks home; the five-image flash vision; *"Not again."*
4. **The Vein-Corrupted** — the creature guarding the road: *"I had a name."* Then the title drop.
5. **Hunter Hall** — Mira: *"You said two weeks."*
6. **The First Toll** — the clapperless bell rings three times, the relic breaks, and the
   objective becomes **FOLLOW THE BELL'S MEMORY**.

From there TheRPG adds its own connective scenes, written to stay inside what the canon
establishes: the arrival in the Hollow March (with the archivist's quest line *"East. Past the
second field. The sealed door. Remember the walls."*), the Axiom stirring at level 5, the
Eastern Descent into the Sunken Archive, and the Archivist, who names Kael a bound user and
ends the game with the canon beat: **WELCOME BACK.** Kael has never been there.

Open the **Journal** (Esc, or the menu button on touch) to re-read what Kael has remembered.
Scenes never replay once seen, even after a reload. Story text lives in `js/story.js`.

Placeholder art notes: the CraftPix swordsman stands in for Kael, the slime sheets for the
March Husks, the lizardmen for Vein Sentries, and the Demon Lord sprite for the Archivist,
which in canon is a spider-like guardian machine.

## Play

- **Move**: WASD or arrow keys · **Run**: Shift
- **Attack**: Space, J, K, Z, Enter, or click
- **Journal / pause**: Esc
- **Cutscenes**: Space or tap to advance a line, hold to skip the scene
- **Touch**: drag anywhere on the left half of the screen to move (floating joystick),
  the sword button attacks, RUN toggles running, the menu button opens the Journal

Progress (level, XP, zone) is saved automatically in the browser. Level 9 is the cap and it is
a long climb: each level costs 80 × level^2.5 XP (about 40,000 XP in all), so the level-9 armor
is something you earn over the whole journey rather than by the second zone.

Run locally:

```bash
python -m http.server 8000
```

then visit http://localhost:8000. Opening `index.html` directly also works.

## Zones

| Zone | What's there | Recommended level |
| --- | --- | --- |
| The Forest Path | March Husks, Scavengers, the **Vein-Corrupted** (guards the road) | 1 |
| **Greyhaven** | the town: Hunter Hall, the Clinic, the Old Lift Station, Market Row, fifteen townsfolk | — |
| Hollow March | Scavenger Chief, Hollow Brutes, Vein Sentries, Husk Brutes | 3 |
| The Sunken Archive | Sentry Lord, Archive Wardens, Vein Horrors, **The Archivist** (boss) | 6 |

Walk into the blue portal at the east edge of a zone to move on; the green portal takes
you back. A red portal is locked: the forest road opens once the Vein-Corrupted is dead,
Greyhaven's east road opens after the first toll, and the Archive ends with the Archivist.

## Greyhaven

Greyhaven is assembled by `tools/build_greyhaven.py` from four CraftPix packs (the main
character's home, the herbalist's hut, the ruined temple, the market square): each pack's authored
exterior scene is stamped onto a grass base and joined by auto-tiled dirt roads, a plaza and
the town well; trees, bushes and rocks are lifted from the home scene and scattered along the
edges. All three buildings are enterable (their interiors are baked as separate rooms):

- **Hunter Hall** (the home) — Mira, and the hearth where Kael can rest to heal and save.
- **The Clinic** (the herbalist's hut) — the healer, who mends Kael for free.
- **Old Lift Station** (the ruined temple) — the dormant transit node the town grew up around,
  with its Under-Room below.
- **Market Row** (the market square pack) — the walled square below the Hunter Hall: a smith,
  a tapster, a baker (free loaf heals you), Wren's fruit stall, a relic seller, two musicians
  and townsfolk who wander the cobbles. The well stands just outside its east wall.

Stand on the glowing doorstep to enter; step back onto the doormat inside to leave. Walk up to
a person or a marked object and press attack (or tap the sword) to talk or examine. The
townsfolk are the herbalist, cultist and explorer sprites from those packs, standing in for
Mira, the Speaker, Wren, the Archivist and the keepers of the Lift Station.

## Project layout

```
index.html          entry point
css/style.css       HUD and menu styling
js/audio.js         tiny procedural sound effects
js/assets.js        image loading + SpriteSet (sheet = 4 rows: down/up/left/right)
js/map.js           baked map loader + tile collision
js/entities.js      Player, Enemy AI, pickups, floating text
js/town.js          Greyhaven townsfolk (NPC entity) and their dialogue
js/story.js         VEILBOUND scenes, journal entries, cutscene runner + screen effects
js/game.js          zones, enemy roster/stats, spawning, combat, story triggers, rendering
js/touch.js         mobile touch controls (joystick + buttons)
js/main.js          input, UI wiring, main loop
assets/characters/  swordsman_lvl1..9 sprite sheets
assets/enemies/     slime, goblin, orc, lizardman, vampire, demon sheets (3 tiers each)
assets/tilesets/    craftpix tilesets + the original Tiled (.tmx) maps (town/ = the three location packs)
assets/npcs/        townsfolk sprite sheets (32px frames)
assets/maps/        baked maps (water frames, ground, over layer, collision) per zone
assets/sprites.js   sprite manifest (frame size, frames per row, feet anchor)
tools/tmxlib.py     shared Tiled reader / baker
tools/bake_maps.py  Tiled .tmx -> baked PNG layers + collision grid + map.js (wild zones)
tools/build_greyhaven.py  composes and bakes Greyhaven + its interiors
tools/sprite_manifest.py  scans the sprite sheets -> assets/sprites.js
```

To rebuild the generated data after editing a map or adding sprites (needs Python 3 + Pillow):

```bash
python tools/bake_maps.py
python tools/build_greyhaven.py
python tools/sprite_manifest.py
```

Sprite sheets are one row per facing. The swordsman and the town NPC packs are laid out
down / left / right / up, the enemy packs down / up / left / right; the manifest records the
row order per sheet so the game never has to guess.

## Art credits and license

All character, enemy and tileset art is by [CraftPix.net](https://craftpix.net) and is used
under the [CraftPix file license](https://craftpix.net/file-licenses/). The art is included
here only as part of this game; it is not a redistribution of the asset packs. If you fork
this project, please respect that license (in particular, do not extract and re-share the
art on its own). Source files from the packs (PSD, Aseprite) are intentionally not included.

Story, names and dialogue belong to VEILBOUND (OuterHeavenX). Game code is released under
the MIT license (see `LICENSE`).
