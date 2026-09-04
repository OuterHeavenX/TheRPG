// Greyhaven: townsfolk, their dialogue, and the things Kael can examine.
//
// Lines marked (canon) are reproduced from the VEILBOUND Greyhaven interactables; the rest is
// TheRPG connective writing that stays inside docs/CANON.md.
window.RPG = window.RPG || {};

(function () {
  const S = (speaker, text) => ({ speaker, text });

  // Each entry: first = lines the first time, again = lines afterwards (optional), after = a
  // variant once the Archivist is defeated. `then` runs after the lines (rest, heal...).
  RPG.TALK = {
    mira: {
      name: 'MIRA',
      first: [
        S('MIRA', "Bed's yours if you want it. Hearth's lit either way."),                          // canon
        S('KAEL', 'I am not staying.'),
        S('MIRA', "Then at least sit before you go. You went in dormant and came back humming. I can hear it from here."), // canon
        S('KAEL', "You can't hear anything."),                                                        // canon
        S('MIRA', 'I can hear the bell. It has no clapper and it rang at dawn.'),                    // canon
        S('MIRA', 'Whatever you woke, it is not finished waking.'),                                  // canon
      ],
      again: [S('MIRA', "Hearth's still lit. Use it before you go.")],                               // canon
      after: [
        S('MIRA', 'The bell has not rung since you left. I do not think that is good news.'),
        S('KAEL', 'It said welcome back.'),
        S('MIRA', 'You have never been there.'),
        S('KAEL', 'No.'),
      ],
    },
    hearth: {
      name: 'HEARTH',
      first: [
        S('', 'You sit. The hearth takes the cold out of the gauntlet, and the ache out of your shoulders.'), // canon
        S('MIRA', "Anyone who makes it back this far gets the fire. That's the whole rule."),          // canon
      ],
      again: [S('', 'You sit by the fire until the ache goes out of you.')],                          // canon
      rest: true,
    },
    healer: {
      name: 'HEALER',
      first: [
        S('HEALER', "That gauntlet. Fused, isn't it? Right through to the bone."),                    // canon
        S('KAEL', 'It came off a dead man. It stayed on.'),                                           // canon
        S('HEALER', "Then it's yours now, whatever it is. Half this town runs on things nobody can read."), // canon
        S('HEALER', 'Hold still.'),
      ],
      again: [S('HEALER', 'Hold still. This will not take long.')],
      heal: true,
    },
    speaker: {
      name: 'THE SPEAKER',
      first: [
        S('THE SPEAKER', 'Something under the March stopped moving. The whole town felt it stop.'),   // canon
        S('THE SPEAKER', 'Every lamp in Greyhaven flickered last night. All of them, the same moment.'), // canon
        S('THE SPEAKER', 'They say the ground opened past the second field.'),                       // canon
        S('THE SPEAKER', 'You look like a man who already knows that.'),                              // canon
      ],
      again: [S('THE SPEAKER', 'The ground opened past the second field. Everyone carrying a blade goes east eventually.')], // canon (adapted)
    },
    archivist: {
      name: 'ARCHIVIST',
      first: [
        S('ARCHIVIST', "There's a chamber past the second field. A relay of some kind. Sealed since before Greyhaven had a name."), // canon
        S('ARCHIVIST', 'I have mapped the approach twice and never once got inside.'),               // canon
        S('ARCHIVIST', 'If you can open it, I want to know what is written on the walls.'),          // canon
        S('KAEL', "If there's anything worth carrying, I'm carrying it."),                            // canon
        S('ARCHIVIST', 'Take all of it. Just remember the walls.'),                                   // canon
      ],
      again: [S('ARCHIVIST', 'East. Past the second field. The sealed door. Remember the walls.')],  // canon
      after: [
        S('ARCHIVIST', 'You opened it. What was written on the walls?'),
        S('KAEL', 'My name. Or something wearing it.'),
      ],
    },
    keeper1: {
      name: 'KEEPER',
      first: [
        S('KEEPER', 'The bell rang. With no clapper in it.'),                                         // canon
        S('KEEPER', "So either you fixed it, or you shouldn't have gone."),                           // canon
      ],
      again: [S('KEEPER', "You're the one with the metal arm.")],                                     // canon
    },
    keeper2: {
      name: 'KEEPER',
      first: [
        S('KEEPER', 'The lift shook. I felt it come up through the stall legs.'),                     // canon
        S('KEEPER', 'Ninety years of nothing and it picks today to move.'),                           // canon
      ],
      again: [S('KEEPER', "Careful round the lift. Children climb it. It's dead, but it's dead heavy.")], // canon
    },
    // ---- Market Row (market square pack). Smith and tapster lines are canon interactables.
    smith: {
      name: 'SMITH',
      first: [
        S('SMITH', 'Every dead relic on my bench twitched this morning. Ninety years of nothing, then a twitch.'), // canon
        S('KAEL', 'Then keep it off my bench.'),                                                    // canon (adapted)
        S('SMITH', "Your blade's fractured too. Conductor's split clean through the middle."),         // canon
        S('SMITH', "Bring me a whole conductor and I'll make it sing again. Won't be cheap."),        // canon
      ],
      again: [S('SMITH', "No conductor, no repair. I don't work miracles. Only metal.")],            // canon
    },
    tapster: {
      name: 'TAPSTER',
      first: [
        S('TAPSTER', "Relic hunter. You've got the walk for it."),                                    // canon
        S('TAPSTER', "Room's yours for nothing tonight. Don't argue with me."),                      // canon
        S('KAEL', 'I am not staying.'),
        S('TAPSTER', 'Nobody is, lately. Everyone carrying a blade goes east eventually.'),          // canon (adapted)
      ],
      again: [S('TAPSTER', 'Drink first. The March is not going anywhere.')],
    },
    baker: {
      name: 'BAKER',
      first: [
        S('BAKER', 'Take a loaf. You look like the bell woke you and never let you back to sleep.'),
        S('BAKER', 'It woke all of us. Three times, and nothing in the tower to ring it.'),
      ],
      again: [S('BAKER', 'Another loaf? Go on. Eat it before the March does.')],
      heal: true,
    },
    wren: {
      name: 'WREN',
      first: [
        S('WREN', 'Buy something or move along. Preferably both.'),                                   // canon
        S('WREN', 'If you find a bell-clapper out there, bring it back. Ours went missing and nobody will climb up to look.'), // canon
      ],
      again: [S('WREN', 'Dead since before my mother. Whole town grew up around the corpse of it.')], // canon
    },
    relicseller: {
      name: 'RELIC SELLER',
      first: [
        S('RELIC SELLER', 'Curios. Fragments. Nothing that works, which is the only reason I am allowed to sell them.'),
        S('RELIC SELLER', 'Yours works. Do not let the Speaker see it too closely.'),
      ],
      again: [S('RELIC SELLER', 'Half this town runs on things nobody can read.')],                  // canon (adapted)
    },
    lutist: { name: 'LUTE PLAYER', first: [S('', 'He is playing a melody in a minor key. You almost know it.')], again: [S('', 'The same melody. You almost know it.')] },
    flutist: { name: 'FLUTIST', first: [S('', 'She keeps time with the lute and does not look up from the pipe.')], again: [S('', 'She does not look up.')] },
    townsfolk1: { name: 'TOWNSMAN', first: [S('TOWNSMAN', 'The lamps flickered last night. All of them. Same moment.')], again: [S('TOWNSMAN', 'Same moment. Every lamp.')] },
    townsfolk2: { name: 'ELDER', first: [S('ELDER', 'The lift shook. Ninety years of nothing and it picks today to move.')], again: [S('ELDER', 'Dead heavy, that lift. Keep the children off it.')] },
    townsfolk3: { name: 'TOWNSWOMAN', first: [S('TOWNSWOMAN', 'They say the ground opened past the second field.'), S('TOWNSWOMAN', 'You look like a man who already knows that.')], again: [S('TOWNSWOMAN', 'East. Everyone with a blade goes east.')] },
    townsfolk4: { name: 'GIRL', first: [S('GIRL', 'Are you going to the lift? Do not climb it. Everyone says do not climb it.')], again: [S('GIRL', 'It is dead. But it is dead heavy.')] },
    innbed: {
      name: 'THE ROOM UPSTAIRS',
      first: [S('', 'A narrow bed under the eaves. You sleep, and for once nothing rings.')],
      again: [S('', 'You sleep. Nothing rings.')],
      rest: true,
    },
    bench: {
      name: 'THE BENCH',
      first: [S('', 'Dead relics, laid out in rows. Every one of them is turned slightly toward the door, as if they moved in the night.')],
      again: [S('', 'The relics on the bench are all turned toward the door.')],
      resonance: true,
    },
    maps: {
      name: 'THE MAPS',
      first: [S('', 'Two surveys of the same approach east of the second field. Both stop at the same sealed door.'),
              S('', 'In the margin, in a careful hand: the walls.')],
      again: [S('', 'Both surveys stop at the same door.')],
    },
    memorial: {
      name: 'THE MEMORIAL',
      first: [S('', 'A weathered stone by the square. Names, most of them family names the town still uses.'),
              S('', 'The dates are all the same year. The year of the Silence.')],
      again: [S('', 'The dates are all the same year.')],
    },
    liftdoor: {
      name: 'OLD LIFT STATION',
      first: [
        S('', 'A transit lift. Greyhaven grew up around its corpse and called it a foundation.'),      // canon
        S('LIFT', 'TRANSIT NODE — GREYHAVEN. STATUS: DORMANT.'),                                        // canon
        S('LIFT', 'INSUFFICIENT AUTHORITY. RETURN WHEN THE ARCHIVE ANSWERS.'),                          // canon
        S('KAEL', 'The whole town is built on this thing.'),                                            // canon
      ],
      again: [S('', 'Dead. Nothing in it answers.')],                                                   // canon
      after: [
        S('LIFT', 'TRANSIT NODE — GREYHAVEN. STILL DORMANT.'),                                          // canon
        S('KAEL', "Then we come back when it isn't."),                                                  // canon
      ],
      resonance: true,
    },
    vault: {
      name: 'THE UNDER-ROOM',
      first: [
        S('', 'Robed keepers kneel before the old machinery. They do not look up.'),
        S('', 'Something behind the lattice breathes in time with the Vein.'),
      ],
      again: [S('', 'The keepers do not look up.')],
      resonance: true,
    },
    well: {
      name: 'THE WELL',
      first: [S('', 'The rope is new. The stone is older than the town.'),
              S('', 'Far down, water moves against a current that should not be there.')],
      again: [S('', 'Water moves against a current that should not be there.')],
    },
  };

  RPG.Npc = class extends RPG.Entity {
    constructor(def) {
      super(new RPG.SpriteSet(def.sprite), def.x, def.y);
      this.id = def.id;
      this.dir = def.dir || 0;
      this.talk = RPG.TALK[def.id] || { name: def.id.toUpperCase(), first: [] };
      this.hw = 5; this.hTop = 5; this.hBot = 2;
      this.wander = this.set.has('walk') && !!def.wander;
      this.home = [def.x, def.y];
      this.timer = 1 + Math.random() * 3;
      this.state = 'idle';
      this.wx = this.wy = 0;
      this.setAnim('idle');
    }

    update(dt, game) {
      const p = game.player;
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < 36 && this.set.rows[0] !== this.set.rows[1]) {
        this.faceToward(p.x, p.y);
        this.state = 'idle';
        this.setAnim('idle');
      } else if (this.wander) {
        this.timer -= dt;
        if (this.state === 'wander') {
          this.tryMove(this.wx * dt, this.wy * dt, game.map);
          if (this.timer <= 0 || Math.hypot(this.x - this.home[0], this.y - this.home[1]) > 40) {
            this.state = 'idle'; this.timer = 1.5 + Math.random() * 3; this.setAnim('idle');
          }
        } else if (this.timer <= 0) {
          const a = Math.random() * Math.PI * 2;
          this.wx = Math.cos(a) * 22; this.wy = Math.sin(a) * 22;
          this.dir = Math.abs(this.wx) > Math.abs(this.wy) ? (this.wx < 0 ? 2 : 3) : (this.wy < 0 ? 1 : 0);
          this.state = 'wander'; this.timer = 0.8 + Math.random() * 1.2; this.setAnim('walk');
        }
      }
      this.animate(dt, true);
    }
  };
})();
