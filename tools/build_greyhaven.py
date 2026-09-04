"""Compose Greyhaven from the CraftPix town packs and bake it (plus its three interiors).

Scenes (assets/tilesets/town/*):
  home/Exterior.tmx            -> the Hunter Hall (Mira's), Kael's home in Greyhaven
  herbalist/Exterior.tmx       -> the Clinic, with its pond
  temple/Ruined_temple_exterior.tmx -> the Old Lift Station (pre-Greyhaven machinery)
and their interiors. The three exteriors are stamped onto a grass base from the home pack's
exterior tileset, joined by an auto-tiled dirt road and a cobbled plaza with the town well.

Usage:  python tools/build_greyhaven.py [--preview OUT_DIR]
"""
import os, sys, random
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tmxlib as T

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOWN = os.path.join(ROOT, 'assets', 'tilesets', 'town')
OUT = os.path.join(ROOT, 'assets', 'maps')
EXT = os.path.join(TOWN, 'home', 'exterior.png')      # home pack exterior tileset (17 columns)

W, H = 84, 42
random.seed(7)

# ---- exterior.png tile ids (see the id grid rendered during development)
GRASS = 308
GRASS_VARIANTS = [307, 309, 316, 317, 325, 290, 291, 292, 293, 295, 257]
DIRT = dict(C=359, N=342, S=376, W=358, E=360, NW=341, NE=343, SW=375, SE=377,
            iSE=344, iSW=345, iNE=361, iNW=362)
PLATE_TOP, PLATE_MID, PLATE_BOT = [179, 180, 181, 182], [196, 197, 198, 199], [213, 214, 215, 216]
WELL = [[582, 583], [599, 600], [616, 617]]

# ---- where each scene's local (0,0) lands on the town grid
STAMPS = [
    ('home', os.path.join(TOWN, 'home', 'Exterior.tmx'), 44, 10, ('Birds', 'cat')),
    ('herb', os.path.join(TOWN, 'herbalist', 'Exterior.tmx'), 16, 38, ('birds',)),
    ('temple', os.path.join(TOWN, 'temple', 'Ruined_temple_exterior.tmx'), 70, 16, ('Discoverers',)),
    # Market Row: the market square pack, its street openings lined up with the Hunter Hall road
    ('market', os.path.join(TOWN, 'market', 'Market_square.tmx'), 40, 28, ('NPC_street',)),
]
MARKET_OX, MARKET_OY = 40, 28
# door approach tiles (town coords) -> interior zone
DOORS = [
    dict(id='hall', zone='hall_int', label='Hunter Hall', cells=[(40, 13), (41, 13)]),
    dict(id='clinic', zone='clinic_int', label='The Clinic', cells=[(14, 24), (15, 24)]),
    dict(id='lift', zone='lift_int', label='Old Lift Station', cells=[(69, 13), (70, 13)]),
]
ROADS_H = [(0, 83, 34, 36)]                       # x0, x1, y0, y1 inclusive
ROADS_V = [(14, 15, 25, 33), (40, 41, 14, 17), (69, 70, 14, 33)]
PLAZA = (55, 59, 27, 31)          # packed dirt around the well, east of the market
WELL_AT = (56, 28)
ENTRY, EXIT = (1, 35), (82, 35)
def M(lx, ly):
    return (MARKET_OX + lx, MARKET_OY + ly)   # market-scene local tile -> town tile

NPCS = [
    dict(id='speaker', sprite='npcs/speaker', tile=M(-4, 0), dir=3, wander=True),
    dict(id='archivist', sprite='npcs/archivist', tile=(74, 14), dir=0),
    dict(id='keeper1', sprite='npcs/keeper1', tile=(64, 14), dir=3),
    dict(id='keeper2', sprite='npcs/keeper2', tile=(76, 11), dir=2),
    # Market Row stalls (positions follow the pack's own scene) and its people
    dict(id='baker', sprite='npcs/baker', tile=M(8, -6), dir=0),
    dict(id='smith', sprite='npcs/smith', tile=M(5, -1), dir=0),
    dict(id='tapster', sprite='npcs/tapster', tile=M(4, 3), dir=0),
    dict(id='lutist', sprite='npcs/lutist', tile=M(0, -1), dir=0),
    dict(id='flutist', sprite='npcs/flutist', tile=M(2, -1), dir=0),
    dict(id='wren', sprite='npcs/wren', tile=M(-7, -5), dir=0),
    dict(id='relicseller', sprite='npcs/relicseller', tile=M(9, 1), dir=0),
    dict(id='townsfolk1', sprite='npcs/townsfolk1', tile=M(-5, -4), dir=0, wander=True),
    dict(id='townsfolk2', sprite='npcs/townsfolk2', tile=M(6, -4), dir=2, wander=True),
    dict(id='townsfolk3', sprite='npcs/townsfolk3', tile=M(-3, 3), dir=3, wander=True),
    dict(id='townsfolk4', sprite='npcs/townsfolk4', tile=(20, 33), dir=0, wander=True),
]
OBJECTS = [dict(id='liftdoor', tile=(70, 12), radius=22), dict(id='well', tile=(57, 30), radius=20)]

INTERIORS = {
    'hall_int': dict(tmx=os.path.join(TOWN, 'home', 'Interior1.tmx'), label='Hunter Hall',
                     entry_local=(-9, 3), door='hall',
                     npcs=[dict(id='mira', sprite='npcs/mira', local=(-2, 4), dir=2)], objects=[dict(id='hearth', local=(-6, -2), radius=24)]),
    'clinic_int': dict(tmx=os.path.join(TOWN, 'herbalist', 'Interior.tmx'), label='The Clinic',
                       entry_local=(-11, 1), door='clinic',
                       npcs=[dict(id='healer', sprite='npcs/healer', local=(2, 1), dir=2)], objects=[]),
    'lift_int': dict(tmx=os.path.join(TOWN, 'temple', 'Ruined_temple_interior.tmx'), label='Lift Station — Under-Room',
                     entry_local=None, door='lift', npcs=[], objects=[dict(id='vault', local=(0, -3), radius=28)]),
}


def tile(lid, path=EXT):
    return (path, lid, 0, None)


def is_over(name):
    n = name.split('/', 1)[-1].lower()
    return n.startswith(('objects', 'trees', 'bush', 'house', 'fence', 'windows', 'roof', 'statues',
                         'columns', 'bricks', 'grass_top', 'well', 'walls', 'boxes', 'tent'))


def is_water(name):
    n = name.split('/', 1)[-1].lower()
    return 'water' in n


def dirt_autotile(mask):
    """mask: set of (x, y) road cells -> {(x, y): tile}."""
    out = {}
    for (x, y) in mask:
        n, s, w, e = (x, y - 1) in mask, (x, y + 1) in mask, (x - 1, y) in mask, (x + 1, y) in mask
        if n and s and w and e:
            ne, nw, se, sw = (x + 1, y - 1) in mask, (x - 1, y - 1) in mask, (x + 1, y + 1) in mask, (x - 1, y + 1) in mask
            k = 'C'
            if not se: k = 'iSE'
            elif not sw: k = 'iSW'
            elif not ne: k = 'iNE'
            elif not nw: k = 'iNW'
        elif not n and not w and s and e: k = 'NW'
        elif not n and not e and s and w: k = 'NE'
        elif not s and not w and n and e: k = 'SW'
        elif not s and not e and n and w: k = 'SE'
        elif not n and s: k = 'N'
        elif not s and n: k = 'S'
        elif not w and e: k = 'W'
        elif not e and w: k = 'E'
        else: k = 'C'
        out[(x, y)] = tile(DIRT[k])
    return out


def build_town():
    layers = []
    base = {(x, y): tile(GRASS) for x in range(W) for y in range(H)}
    layers.append(('base', base))
    detail = {}
    for x in range(W):
        for y in range(H):
            if random.random() < 0.07:
                detail[(x, y)] = tile(random.choice(GRASS_VARIANTS))
    layers.append(('grass_detail', detail))

    # scenes
    for sid, path, ox, oy, skip in STAMPS:
        sl, _ = T.load_tmx(path)
        for name, cells in sl:
            if name in skip:
                continue
            layers.append((sid + '/' + name, {(x + ox, y + oy): t for (x, y), t in cells.items()}))

    # roads (drawn over the stamps' grass so they join the yards)
    mask = set()
    for x0, x1, y0, y1 in ROADS_H:
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                mask.add((x, y))
    for x0, x1, y0, y1 in ROADS_V:
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                mask.add((x, y))
    x0, x1, y0, y1 = PLAZA
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            mask.add((x, y))
    market = next(l for l in layers if l[0] == 'market/street')[1]
    mask = {c for c in mask if c not in market}     # the square keeps its cobbles
    layers.append(('road', dirt_autotile(mask)))

    # a few cobble plates on the packed dirt of the plaza, plus the well
    plaza = {}
    for x in range(x0 + 1, x1):
        for y in range(y0 + 1, y1):
            if (x * 7 + y * 5) % 3 == 0:
                plaza[(x, y)] = tile(PLATE_MID[(x + y) % 4])
    layers.append(('plaza', plaza))

    # scatter trees, bushes and rocks lifted from the home scene onto the open grass
    scatter_objects(layers, mask)
    well = {}
    for r, row in enumerate(WELL):
        for c, lid in enumerate(row):
            well[(WELL_AT[0] + c, WELL_AT[1] + r)] = tile(lid)
    layers.append(('well', well))
    return layers, mask


def object_clusters(scene_path, layer_names):
    """Connected groups of tiles in the scene's object layers = individual trees, bushes, rocks."""
    sl, _ = T.load_tmx(scene_path)
    clusters = []
    for name, cells in sl:            # cluster each layer on its own: the packs keep one object per layer
        if name not in layer_names:
            continue
        seen = set()
        for start in cells:
            if start in seen:
                continue
            group, stack = {}, [start]
            seen.add(start)
            while stack:
                c = stack.pop()
                group[c] = cells[c]
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        n = (c[0] + dx, c[1] + dy)
                        if n in cells and n not in seen:
                            seen.add(n)
                            stack.append(n)
            if 2 <= len(group) <= 24:
                mx, my = min(p[0] for p in group), min(p[1] for p in group)
                clusters.append({(x - mx, y - my): t for (x, y), t in group.items()})
    return clusters


def scatter_objects(layers, road_mask):
    clusters = []
    for path, names, weight in [
        (STAMPS[0][1], ('Objects1', 'Objects2', 'Objects3', 'Objects4'), 1),
        (STAMPS[1][1], ('Trees_rocks', 'Trees2', 'Trees3', 'Trees4', 'Trees5', 'Bushes', 'Bushes2'), 3),
        (STAMPS[2][1], ('trees1', 'trees2', 'trees3', 'trees4', 'trees5', 'trees6'), 2),
    ]:
        for cl in object_clusters(path, names):
            clusters.extend([cl] * weight)
    if not clusters:
        return
    big = [c for c in clusters if len(c) >= 6] or clusters      # trees, mostly
    occupied = set(road_mask)
    for name, cells in layers:
        if name.count('/') and is_over(name):
            occupied.update(cells)
        if name.startswith(('herb/', 'home/', 'temple/', 'market/')):
            occupied.update(cells)      # keep the authored scenes untouched
    for d in DOORS:
        occupied.update(d['cells'])
    rng = random.Random(11)
    placed = {}
    def free(cl, ox, oy):
        for (x, y) in cl:
            px, py = x + ox, y + oy
            if not (0 <= px < W and 0 <= py < H):
                return False
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if (px + dx, py + dy) in occupied or (px + dx, py + dy) in placed:
                        return False
        return True
    # dense band along the south and north edges, sparse in the middle
    targets = [(0, W, 37, H, 60), (0, W, 0, 3, 24), (0, W, 3, 37, 26)]
    for x0, x1, y0, y1, count in targets:
        n = 0
        for _ in range(count * 40):
            if n >= count:
                break
            cl = rng.choice(big if rng.random() < 0.7 else clusters)
            ox, oy = rng.randrange(x0, x1), rng.randrange(y0, y1)
            if free(cl, ox, oy):
                for (x, y), t in cl.items():
                    placed[(x + ox, y + oy)] = t
                n += 1
    layers.append(('objects_scatter', placed))


def nearest(comp, tx, ty):
    return min(comp, key=lambda p: (p[0] - tx) ** 2 + (p[1] - ty) ** 2)


def bake_town(preview_dir):
    layers, mask = build_town()
    water = [n for n, _ in layers if is_water(n)]
    over = [n for n, _ in layers if is_over(n)]
    out_dir = os.path.join(OUT, 'greyhaven')
    force_walk = [c for d in DOORS for c in d['cells']] + [ENTRY, EXIT]
    force_solid = [(WELL_AT[0] + c, WELL_AT[1] + r) for r in (1, 2) for c in (0, 1)]
    solid, comp = T.bake(out_dir, layers, W, H, water, over, force_walkable=force_walk, force_solid=force_solid)
    for c in force_walk:
        assert c in comp, 'door/entry %s is not reachable' % (c,)
    npcs = []
    for n in NPCS:
        t = nearest(comp, *n['tile'])
        npcs.append(dict(id=n['id'], sprite=n['sprite'], x=t[0] * 16 + 8, y=t[1] * 16 + 12, dir=n['dir'], wander=bool(n.get('wander'))))
    objects = [dict(id=o['id'], x=o['tile'][0] * 16 + 8, y=o['tile'][1] * 16 + 8, radius=o['radius']) for o in OBJECTS]
    doors = [dict(id=d['id'], zone=d['zone'], label=d['label'], cells=d['cells']) for d in DOORS]
    meta = dict(zone='greyhaven', kind='town', w=W, h=H, tile=16, waterFrames=6, solid=T.solid_string(solid),
                entry=list(ENTRY), exit=list(EXIT), walkable=len(comp), doors=doors, npcs=npcs, objects=objects)
    T.write_meta(out_dir, 'greyhaven', meta)
    print('greyhaven: %dx%d walkable=%d npcs=%d doors=%d' % (W, H, len(comp), len(npcs), len(doors)))
    if preview_dir:
        preview(out_dir, solid, meta, os.path.join(preview_dir, 'collision_greyhaven.png'))


def bake_interior(zone, cfg, preview_dir):
    layers, _ = T.load_tmx(cfg['tmx'])
    minx, miny, maxx, maxy = T.extent(layers)
    w, h = maxx - minx + 1, maxy - miny + 1
    # Floor layers are ground. The packs also paint floor tiles into their wall layers, so any
    # tile that occurs in a floor layer (or is a crack decal) is treated as floor wherever it
    # appears; the rest of a wall/furniture layer stays "over" and blocks movement.
    floor_keys = set()
    for name, cells in layers:
        n = name.lower()
        if n.startswith(('floor', 'tile layer')) or 'carpet' in n:
            floor_keys.update(t[:2] for t in cells.values())
    split = []
    ground, over = [], []
    for name, cells in layers:
        n = name.lower()
        if n.startswith(('floor', 'tile layer')) or 'carpet' in n:
            split.append((name, cells))
            ground.append(name)
            continue
        floor_part = {p: t for p, t in cells.items() if t[:2] in floor_keys or 'crack' in os.path.basename(t[0]).lower()}
        wall_part = {p: t for p, t in cells.items() if p not in floor_part}
        if floor_part:
            split.append((name + '#floor', floor_part))
            ground.append(name + '#floor')
        if wall_part:
            split.append((name, wall_part))
            over.append(name)
    layers = split
    out_dir = os.path.join(OUT, zone)
    solid, comp = T.bake(out_dir, layers, w, h, [], over, ox=minx, oy=miny, water_frames=1)
    if cfg['entry_local']:
        entry = nearest(comp, cfg['entry_local'][0] - minx, cfg['entry_local'][1] - miny)
    else:  # bottom-centre opening
        entry = max(comp, key=lambda p: (p[1], -abs(p[0] - w / 2)))
    npcs = []
    for n in cfg['npcs']:
        t = nearest(comp, n['local'][0] - minx, n['local'][1] - miny)
        npcs.append(dict(id=n['id'], sprite=n['sprite'], x=t[0] * 16 + 8, y=t[1] * 16 + 12, dir=n['dir']))
    objects = [dict(id=o['id'], x=(o['local'][0] - minx) * 16 + 8, y=(o['local'][1] - miny) * 16 + 8, radius=o['radius']) for o in cfg['objects']]
    door = next(d for d in DOORS if d['id'] == cfg['door'])
    meta = dict(zone=zone, kind='interior', label=cfg['label'], w=w, h=h, tile=16, waterFrames=1,
                solid=T.solid_string(solid), entry=list(entry), exit=list(entry), walkable=len(comp),
                npcs=npcs, objects=objects, exitTo=dict(zone='greyhaven', cell=door['cells'][0]))
    T.write_meta(out_dir, zone, meta)
    print('%s: %dx%d walkable=%d entry=%s' % (zone, w, h, len(comp), entry))
    if preview_dir:
        preview(out_dir, solid, meta, os.path.join(preview_dir, 'collision_%s.png' % zone))


def preview(out_dir, solid, meta, path):
    im = Image.open(os.path.join(out_dir, 'water_0.png')).convert('RGBA')
    im.alpha_composite(Image.open(os.path.join(out_dir, 'ground.png')).convert('RGBA'))
    im.alpha_composite(Image.open(os.path.join(out_dir, 'over.png')).convert('RGBA'))
    bg = Image.new('RGBA', im.size, (20, 20, 30, 255))
    bg.alpha_composite(im)
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for y in range(meta['h']):
        for x in range(meta['w']):
            if solid[y][x]:
                d.rectangle([x * 16, y * 16, x * 16 + 15, y * 16 + 15], fill=(255, 0, 0, 70))
    for n in meta.get('npcs', []):
        d.rectangle([n['x'] - 6, n['y'] - 12, n['x'] + 6, n['y']], outline=(0, 255, 255, 255), width=2)
    for dr in meta.get('doors', []):
        for (x, y) in dr['cells']:
            d.rectangle([x * 16, y * 16, x * 16 + 15, y * 16 + 15], fill=(255, 220, 0, 160))
    e = meta['entry']
    d.rectangle([e[0] * 16, e[1] * 16, e[0] * 16 + 15, e[1] * 16 + 15], fill=(0, 255, 0, 220))
    x = meta['exit']
    d.rectangle([x[0] * 16, x[1] * 16, x[0] * 16 + 15, x[1] * 16 + 15], fill=(0, 0, 255, 220))
    bg.alpha_composite(ov)
    bg.save(path)


if __name__ == '__main__':
    pd = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    bake_town(pd)
    for zone, cfg in INTERIORS.items():
        bake_interior(zone, cfg, pd)
