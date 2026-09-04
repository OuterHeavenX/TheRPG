"""Greyhaven, laid out by hand.

This is the authored town: one grass, dirt streets and yards drawn with a single autotile,
a walled cobbled Market Row, fenced yards, and every building, stall, statue and tree placed
as a prop. Props are lifted from the CraftPix packs (their Tiled scenes and object sheets);
nothing is stamped as a whole scene any more.

Outputs
  assets/tilesets/town/Greyhaven.tmx     the map, editable in Tiled (tile layers + a "meta"
                                         object layer with entry/exit, doors, NPCs, objects)
  assets/maps/greyhaven/*                baked layers + collision + map.js for the game
  assets/maps/<room>_int/*               the six interiors

Usage:  python tools/design_greyhaven.py [--preview OUT_DIR]
        python tools/design_greyhaven.py --from-tmx   (bake a Greyhaven.tmx edited in Tiled)
"""
import os, sys, random, math, colorsys, json
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tmxlib as T
import build_greyhaven as B

ROOT = B.ROOT
TOWN = B.TOWN
OUT = B.OUT
HOME = os.path.join(TOWN, 'home')
MARKET = os.path.join(TOWN, 'market')
EXT = os.path.join(HOME, 'exterior.png')
DETAILS = os.path.join(HOME, 'ground_grass_details.png')
WALLS = os.path.join(MARKET, 'Walls_street.png')
OBJECTS = os.path.join(MARKET, 'Objects.png')
SINGLE = os.path.join(MARKET, 'Objects_single.png')
TMX_OUT = os.path.join(TOWN, 'Greyhaven.tmx')

W, H = 96, 60
rng = random.Random(2026)

# ------------------------------------------------------------------ brushes
def tile(lid, path=EXT):
    return (path, lid, 0, None)


def sheet_prop(path, c0, r0, c1, r1):
    """A rectangle of a tile sheet as a prop {(dx, dy): tile}, empty tiles skipped."""
    img = T.image(path)
    cols = img.width // 16
    out = {}
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            lid = r * cols + c
            if T.coverage((path, lid, 0, None)) > 0:
                out[(c - c0, r - r0)] = (path, lid, 0, None)
    return out


def scene_prop(tmx, layer_names, bbox=None, keep=None, origin=None):
    """The named layers of a Tiled scene as a prop: a list of sub-layers (kept separate so
    windows sit on walls and a statue layer's gaps don't punch holes), re-based to (0, 0)."""
    layers, _ = T.load_tmx(tmx)
    L = dict(layers)
    subs = []
    for n in layer_names:
        cells = {}
        for p, t in L.get(n, {}).items():
            if bbox and not (bbox[0] <= p[0] <= bbox[2] and bbox[1] <= p[1] <= bbox[3]):
                continue
            if keep and not keep(p, t):
                continue
            cells[p] = t
        if cells:
            subs.append(cells)
    allc = [p for c in subs for p in c]
    mx, my = origin if origin else (min(p[0] for p in allc), min(p[1] for p in allc))
    return [{(x - mx, y - my): t for (x, y), t in c.items()} for c in subs]


def has_water(t):
    """A shore tile: it shows some pond in it."""
    im = T.tile_image(t)
    blue = sum(1 for r, g, b, a in im.getdata() if a > 40 and b > r + 40 and b > g)
    return blue > 20


def recolor(src, dst, hue_to, hue_from=0.0, width=0.08, sat_min=0.35):
    """Copy a tileset shifting one hue band (the red roof) to another hue."""
    if os.path.exists(dst):
        return dst
    im = T.image(src).copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            d = min(abs(h - hue_from), 1 - abs(h - hue_from))
            if s >= sat_min and d <= width:
                r2, g2, b2 = colorsys.hsv_to_rgb(hue_to, s * 0.9, v)
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    im.save(dst)
    return dst


class Map:
    def __init__(self):
        self.layers = {}
        self.order = []

    def layer(self, name):
        if name not in self.layers:
            self.layers[name] = {}
            self.order.append(name)
        return self.layers[name]

    def put(self, name, x, y, t):
        if 0 <= x < W and 0 <= y < H:
            self.layer(name)[(x, y)] = t

    def place(self, name, prop, x, y, retint=None):
        subs = prop if isinstance(prop, list) else [prop]
        for i, cells in enumerate(subs):
            lname = name if i == 0 else '%s#%d' % (name, i)
            for (dx, dy), t in cells.items():
                if retint and t[0] == retint[0]:
                    t = (retint[1], t[1], t[2], t[3])
                self.put(lname, x + dx, y + dy, t)

    def as_layers(self):
        return [(n, self.layers[n]) for n in self.order]


def fence(m, x0, y0, x1, y1, gates=()):
    """Picket fence around (x0,y0)-(x1,y1); gates = list of x where the bottom rail opens (2 wide)."""
    for x in range(x0, x1 + 1):
        m.put('over_fence', x, y0, tile(46))
        m.put('over_fence', x, y1, tile(80))
    for y in range(y0, y1 + 1):
        m.put('over_fence', x0, y, tile(62))
        m.put('over_fence', x1, y, tile(64))
    m.put('over_fence', x0, y0, tile(45)); m.put('over_fence', x1, y0, tile(47))
    m.put('over_fence', x0, y1, tile(79)); m.put('over_fence', x1, y1, tile(81))
    for gx in gates:
        m.put('over_fence', gx, y1, tile(31)); m.put('over_fence', gx + 1, y1, tile(32))


def wall_north(m, x0, x1, y, gate):
    """Market Row's tall wall (top / face / base rows) with capped ends and a gate (gx0..gx1)."""
    gx0, gx1 = gate
    W_ = WALLS
    for x in range(x0, x1 + 1):
        if gx0 <= x <= gx1:
            continue
        top = rng.choice([43] * 8 + [230])
        face = 64
        base = rng.choice([85] * 3 + [120, 210, 121])
        if x == gx0 - 1: top, face, base = 44, 65, 86
        if x == gx1 + 1: top, face, base = 42, 63, 84
        m.put('over_wall', x, y, tile(top, W_)); m.put('over_wall', x, y + 1, tile(face, W_)); m.put('over_wall', x, y + 2, tile(base, W_))
    for x, ids in ((x0, (3, 8, 113, 134, 155)), (x1, (4, 9, 114, 135, 156))):
        for i, lid in enumerate(ids):
            m.put('over_wall', x, y + i, tile(lid, W_))


def wall_south(m, x0, x1, y, gate):
    """The low dark wall on the square's south side, with a gate."""
    gx0, gx1 = gate
    W_ = WALLS
    for x in range(x0, x1 + 1):
        if gx0 <= x <= gx1:
            continue
        a, b = 1, rng.choice([22] * 5 + [185, 183, 188, 184, 182])
        if x == x0: a, b = 203, 203
        if x == x0 + 1: a, b = 87, 184
        if x == x1: a, b = 186, 203
        if x == x1 - 1: a, b = 88, 22
        if x == gx0 - 1: a, b = 2, 23
        if x == gx1 + 1: a, b = 0, 21
        m.put('over_wall', x, y, tile(a, W_)); m.put('over_wall', x, y + 1, tile(b, W_))


def cobbles(m, cells, border):
    light = [327, 328, 329, 348, 349, 350, 369, 370, 371]
    frag = [i for i in range(330, 378) if 0.15 < T.coverage((WALLS, i, 0, None)) < 0.85]
    for (x, y) in cells:
        m.put('cobbles', x, y, tile(rng.choice([274] * 5 + [277] * 5 + [280] * 2 + light), WALLS))
        if rng.random() < 0.10:
            m.put('cobble_loose', x, y, tile(rng.choice(frag), WALLS))
    for (x, y) in border:
        if rng.random() < 0.45:
            m.put('cobble_loose', x, y, tile(rng.choice(frag), WALLS))


def plates_h(m, x0, x1, y):
    for x in range(x0, x1 + 1):
        m.put('paths', x, y, tile(rng.choice([179, 180, 181, 182])))
        m.put('paths', x, y + 1, tile(rng.choice([196, 197, 198, 199])))


def plates_v(m, x, y0, y1):
    for y in range(y0, y1 + 1):
        m.put('paths', x, y, tile(188)); m.put('paths', x + 1, y, tile(190))


def rect(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def road_band(x0, x1, yfunc, width=3):
    out = set()
    for x in range(x0, x1 + 1):
        y = yfunc(x)
        for dy in range(width):
            out.add((x, y + dy))
    return out


def jitter(cells, p=0.18):
    """Rough up a mask's edge so autotiled dirt doesn't look drawn with a ruler."""
    extra = set()
    for (x, y) in cells:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in cells and rng.random() < p:
                extra.add(n)
    return cells | extra


# ------------------------------------------------------------------ props
def props():
    P = {}
    home = os.path.join(HOME, 'Exterior.tmx')
    P['house'] = scene_prop(home, ['House_wall', 'House_roof', 'windows1', 'windows2'])
    P['hut'] = scene_prop(os.path.join(TOWN, 'herbalist', 'Exterior.tmx'), ['House'])
    herb = os.path.join(TOWN, 'herbalist', 'Exterior.tmx')
    hl0 = dict(T.load_tmx(herb)[0])
    covered = {p for n, cells in hl0.items() if not n.lower().startswith('water') and n != 'water_lilis'
               for p, t in cells.items() if T.coverage(t) >= 0.97 and not has_water(t)}
    P['pond_water'] = scene_prop(herb, ['water', 'Water_details', 'Water_details2', 'water_lilis'], bbox=(-13, -16, 3, -8),
                                 keep=lambda p, t: p not in covered, origin=(-13, -16))
    P['pond_shore'] = scene_prop(herb, ['ground_grass'], bbox=(-13, -16, 3, -8), keep=lambda p, t: t[1] != 61, origin=(-13, -16))
    temple = os.path.join(TOWN, 'temple', 'Ruined_temple_exterior.tmx')
    P['temple'] = scene_prop(temple, ['House', 'House_platform', 'Columns', 'Statues', 'Bricks', 'Roof'])
    P['statue_l'] = scene_prop(temple, ['Statues'], bbox=(-9, -11, -5, -3), keep=lambda p, t: T.coverage(t) > 0)
    P['statue_r'] = scene_prop(temple, ['Statues'], bbox=(5, -11, 9, -3), keep=lambda p, t: T.coverage(t) > 0)
    P['well'] = {(0, 0): tile(579), (1, 0): tile(580), (0, 1): tile(596), (1, 1): tile(597), (0, 2): tile(613), (1, 2): tile(614)}
    P['crates'] = {(0, 0): tile(586), (0, 1): tile(603), (1, 1): tile(620)}
    O = OBJECTS
    P['weapon_tent'] = sheet_prop(O, 0, 1, 9, 8)
    P['blue_tent'] = sheet_prop(O, 16, 3, 25, 8)
    P['produce_stall'] = sheet_prop(O, 2, 9, 8, 14)
    P['produce_crates'] = sheet_prop(O, 11, 11, 16, 13)
    P['bread_stall'] = sheet_prop(O, 11, 16, 16, 19)
    P['cloth_table'] = sheet_prop(O, 18, 18, 21, 19)
    P['green_tent'] = sheet_prop(O, 1, 21, 6, 23)
    P['food_table'] = sheet_prop(O, 11, 22, 13, 23)
    P['food_table2'] = sheet_prop(O, 16, 22, 19, 23)
    P['relic_tent'] = sheet_prop(O, 2, 25, 9, 31)
    P['dark_tent'] = sheet_prop(O, 12, 25, 19, 30)
    P['cart'] = sheet_prop(O, 0, 32, 7, 35)
    P['crate_stack'] = sheet_prop(O, 26, 1, 29, 3)
    P['blue_chest'] = sheet_prop(O, 27, 16, 28, 17)
    P['banner'] = sheet_prop(O, 28, 6, 29, 8)
    P['armor_stand'] = sheet_prop(O, 24, 1, 25, 3)
    P['sacks'] = sheet_prop(O, 27, 9, 29, 10)
    P['barrels'] = sheet_prop(SINGLE, 7, 7, 8, 8)
    P['barrel'] = sheet_prop(SINGLE, 7, 7, 7, 8)
    # trees, bushes, rocks lifted from the scenes (one object per layer cluster)
    trees, small = [], []
    for path, names in [(home, ('Objects1', 'Objects2', 'Objects3', 'Objects4')),
                        (herb, ('Trees_rocks', 'Trees2', 'Trees3', 'Trees4', 'Trees5', 'Bushes', 'Bushes2')),
                        (temple, ('trees1', 'trees2', 'trees3', 'trees4', 'trees5', 'trees6'))]:
        for cl in B.object_clusters(path, names):
            if len(cl) >= 6:
                trees.append(cl)
            elif path != home:
                means = [B.tile_mean(t) for t in cl.values()]
                woody = sum(1 for r, g, b in means if r > g + 15)
                if woody < len(means) / 2:
                    small.append(cl)
    P['_trees'], P['_small'] = trees, small
    # flowers from the herbalist garden (overlay tiles only)
    hl, _ = T.load_tmx(herb)
    HL = dict(hl)
    P['_flowers'] = [t for t in list(HL['Flowers1'].values()) + list(HL['Flowers2'].values()) if T.coverage(t) < 0.9]
    return P


# ------------------------------------------------------------------ the town
META = dict(entry=None, exit=None, doors=[], npcs=[], objects=[])


def design():
    m = Map()
    P = props()
    red = os.path.join(HOME, 'house_details.png')
    blue = recolor(red, os.path.join(HOME, 'house_details_blue.png'), hue_to=0.58)
    green = recolor(red, os.path.join(HOME, 'house_details_green.png'), hue_to=0.30)
    slate = recolor(red, os.path.join(HOME, 'house_details_slate.png'), hue_to=0.66, sat_min=0.35)

    # -- grass
    for x in range(W):
        for y in range(H):
            m.put('ground', x, y, tile(308))
            r = rng.random()
            if r < 0.14:
                m.put('ground_detail', x, y, tile(rng.choice(B.GRASS_VARIANTS)))
    for _ in range(120):
        cx, cy = rng.randrange(W), rng.randrange(H)
        for dx in range(rng.randrange(1, 4)):
            for dy in range(rng.randrange(1, 3)):
                m.put('ground_spots', cx + dx, cy + dy, tile(rng.choice(B.SPOT_IDS), DETAILS))

    # -- streets and yards (one dirt mask, autotiled once)
    main_y = lambda x: 30 + int(round(1.2 * math.sin(x / 9.0) + 0.5 * math.sin(x / 3.7)))
    dirt = road_band(0, W - 1, main_y)                       # main street, west gate to east gate
    dirt |= rect(50, 15, 52, 21)                              # square's north gate up to the hall
    dirt |= rect(23, 33, 25, 39)                              # lane down to the Clinic
    dirt |= rect(67, 33, 69, 41)                              # lane down to the Archivist's house
    dirt |= rect(79, 14, 81, 29)                              # lane up to the Lift Station
    dirt |= rect(28, 26, 33, 29) | rect(64, 26, 69, 29)       # forecourts of the inn and the workshop
    dirt |= B.organic(rect(70, 3, 95, 18), rng, erode=1)      # the Lift Station's clearing
    dirt |= B.organic(rect(6, 36, 31, 52), rng, erode=1)      # the Clinic's garden ground and pond bank
    dirt |= B.organic(rect(60, 38, 76, 50), rng, erode=1)     # Archivist's yard
    dirt |= rect(43, 4, 56, 17)                               # Hunter Hall yard
    square = rect(38, 22, 60, 37)
    dirt |= rect(35, 24, 63, 38)                              # packed earth the cobbles wear into
    dirt -= square
    dirt = jitter(dirt, 0.12)
    dirt -= square
    for c, t in B.dirt_autotile(dirt).items():
        m.put('dirt', c[0], c[1], t)

    # -- Market Row: cobbles inside the walls, wearing into the streets at the open sides
    inner = rect(39, 25, 59, 35)
    cobbles(m, inner, {c for c in rect(36, 24, 62, 38) if c not in inner and c in dirt})
    wall_north(m, 38, 60, 22, gate=(50, 52))
    wall_south(m, 38, 60, 36, gate=(-5, -5))
    m.place('over_props', P['well'], 49, 28)
    META['objects'].append(dict(id='well', tile=(50, 30), radius=20))
    # stalls along the west and east sides, tables in the south-west corner
    m.place('over_props', P['bread_stall'], 40, 25)
    m.place('over_props', P['produce_crates'], 40, 31)
    m.place('over_props', P['relic_tent'], 52, 24)
    m.place('over_props', P['weapon_tent'], 39, 17) if False else None
    m.place('over_props', P['cloth_table'], 55, 31)
    m.place('over_props', P['green_tent'], 40, 33) if False else None
    m.place('over_props', P['food_table'], 41, 34) if False else None
    m.place('over_props', P['crate_stack'], 57, 25)
    m.place('over_props', P['sacks'], 46, 25)
    m.place('over_props', P['barrels'], 58, 34)
    m.place('over_props', P['banner'], 47, 23) if False else None
    npc = META['npcs'].append
    npc(dict(id='baker', sprite='npcs/baker', tile=(46, 27), dir=0))
    npc(dict(id='wren', sprite='npcs/wren', tile=(43, 30), dir=0))
    npc(dict(id='relicseller', sprite='npcs/relicseller', tile=(56, 31), dir=0))
    npc(dict(id='speaker', sprite='npcs/speaker', tile=(46, 32), dir=3, wander=True))
    npc(dict(id='lutist', sprite='npcs/lutist', tile=(52, 33), dir=0))
    npc(dict(id='flutist', sprite='npcs/flutist', tile=(54, 33), dir=0))
    npc(dict(id='townsfolk1', sprite='npcs/townsfolk1', tile=(45, 28), dir=0, wander=True))
    npc(dict(id='townsfolk2', sprite='npcs/townsfolk2', tile=(53, 28), dir=2, wander=True))
    npc(dict(id='townsfolk3', sprite='npcs/townsfolk3', tile=(49, 33), dir=3, wander=True))

    # -- Hunter Hall: fenced yard north of the square, plates path to the gate
    fence(m, 42, 3, 57, 18, gates=(51,))
    m.place('over_house', P['house'], 45, 5)
    plates_v(m, 51, 15, 17)
    META['doors'].append(dict(id='hall', zone='hall_int', label='Hunter Hall', cells=[(51, 14), (52, 14)]))
    m.place('over_props', P['crates'], 55, 12)
    for (x, y) in [(43, 5), (56, 15), (44, 16)]:
        m.place('over_props', rng.choice(P['_small']), x, y)

    # -- Wayfarer's Rest (blue roof) west of the square, on the street
    m.place('over_house', P['house'], 25, 16, retint=(red, blue))
    META['doors'].append(dict(id='inn', zone='inn_int', label="Wayfarer's Rest", cells=[(31, 25), (32, 25)]))
    plates_v(m, 31, 26, 28)
    m.place('over_props', P['barrels'], 22, 22)
    m.place('over_props', P['cart'], 15, 25)
    m.place('over_props', P['crate_stack'], 35, 21)

    # -- Relic Workshop (green roof) east of the square
    m.place('over_house', P['house'], 62, 16, retint=(red, green))
    META['doors'].append(dict(id='workshop', zone='workshop_int', label='Relic Workshop', cells=[(68, 25), (69, 25)]))
    plates_v(m, 68, 26, 28)
    m.place('over_props', P['armor_stand'], 73, 20)
    m.place('over_props', P['weapon_tent'], 72, 21) if False else None
    m.place('over_props', P['barrel'], 73, 24)
    m.place('over_props', P['crates'], 61, 24)

    # -- the Clinic (the hut) and its pond, south-west
    m.place('over_house', P['hut'], 17, 37)
    META['doors'].append(dict(id='clinic', zone='clinic_int', label='The Clinic', cells=[(22, 45), (23, 45)]))
    m.place('water', P['pond_water'], 8, 44)
    m.place('shore', P['pond_shore'], 8, 44)
    for _ in range(160):
        x, y = rng.randrange(7, 33), rng.randrange(37, 52)
        if (x, y) in dirt and not (17 <= x <= 28 and 37 <= y <= 45) and not (7 <= x <= 24 and 44 <= y <= 52):
            m.put('flowers', x, y, rng.choice(P['_flowers']))

    # -- Archivist's House (slate roof), south-east
    m.place('over_house', P['house'], 63, 39, retint=(red, slate))
    META['doors'].append(dict(id='archive', zone='archive_int', label="Archivist's House", cells=[(69, 48), (70, 48)]))
    m.place('over_props', P['blue_chest'], 74, 47)
    m.place('over_props', P['sacks'], 60, 47)

    # -- the Old Lift Station, north-east, on its clearing
    m.place('over_house', P['temple'], 76, 3)
    META['doors'].append(dict(id='lift', zone='lift_int', label='Old Lift Station', cells=[(85, 12), (86, 12)]))
    META['objects'].append(dict(id='liftdoor', tile=(86, 12), radius=22))
    npc(dict(id='keeper1', sprite='npcs/keeper1', tile=(78, 14), dir=3))
    npc(dict(id='keeper2', sprite='npcs/keeper2', tile=(92, 12), dir=2))
    npc(dict(id='townsfolk4', sprite='npcs/townsfolk4', tile=(82, 22), dir=0, wander=True))
    # memorial: a lone statue by the north gate of the square
    m.place('over_props', P['statue_l'], 33, 20)
    META['objects'].append(dict(id='memorial', tile=(35, 25), radius=18))

    # -- trees: a forest ring at the edges, and clumps between the districts
    occupied = set(dirt) | square | rect(42, 3, 57, 18) | rect(25, 16, 34, 27) | rect(62, 16, 71, 27) | rect(63, 39, 72, 49) \
        | rect(76, 3, 94, 14) | rect(17, 37, 28, 45) | rect(8, 44, 24, 52)
    for d in META['doors']:
        occupied |= set(d['cells'])
    placed = {}

    def free(cl, ox, oy, pad=1):
        for (x, y) in cl:
            px, py = x + ox, y + oy
            if not (0 <= px < W and 0 <= py < H):
                return False
            for dx in range(-pad, pad + 1):
                for dy in range(-pad, pad + 1):
                    if (px + dx, py + dy) in occupied or (px + dx, py + dy) in placed:
                        return False
        return True

    def scatter(x0, x1, y0, y1, count, pool, pad=1, tries=60):
        n = 0
        for _ in range(count * tries):
            if n >= count:
                break
            cl = rng.choice(pool)
            ox, oy = rng.randrange(x0, x1), rng.randrange(y0, y1)
            if free(cl, ox, oy, pad):
                for c, t in cl.items():
                    placed[(c[0] + ox, c[1] + oy)] = t
                n += 1
        return n

    scatter(0, W, 0, 4, 80, P['_trees'], pad=0)          # north edge
    scatter(0, W, 53, H, 80, P['_trees'], pad=0)         # south edge
    scatter(0, 4, 0, H, 40, P['_trees'], pad=0)          # west edge
    scatter(92, W, 0, H, 30, P['_trees'], pad=0)         # east edge
    scatter(4, 92, 4, 52, 34, P['_trees'], pad=1)        # clumps inside
    scatter(4, 92, 4, 52, 40, P['_small'], pad=1)        # bushes, rocks, stumps
    for c, t in placed.items():
        m.put('over_trees', c[0], c[1], t)

    wet = {c for n in m.order if classify(n) == 'water' for c, t in m.layers[n].items() if T.coverage(t) >= 0.5}
    for n in ('ground', 'ground_detail', 'ground_spots', 'dirt'):
        for c in wet:
            m.layers.get(n, {}).pop(c, None)

    META['entry'] = (1, main_y(1) + 1)
    META['exit'] = (94, main_y(94) + 1)
    return m


# ------------------------------------------------------------------ export / bake
def classify(name):
    n = name.lower().split('#')[0]
    if n.startswith('water'):
        return 'water'
    if n.startswith('over'):
        return 'over'
    return 'ground'


def write_tmx(m, path):
    images = []
    for name in m.order:
        for t in m.layers[name].values():
            if t[0] not in images:
                images.append(t[0])
    firstgid, gids = {}, 1
    tsx = []
    for img_path in images:
        img = T.image(img_path)
        cols, rows = img.width // 16, img.height // 16
        firstgid[img_path] = gids
        rel = os.path.relpath(img_path, os.path.dirname(path)).replace(os.sep, '/')
        tsx.append('<tileset firstgid="%d" name="%s" tilewidth="16" tileheight="16" tilecount="%d" columns="%d">'
                   '<image source="%s" width="%d" height="%d"/></tileset>'
                   % (gids, os.path.splitext(os.path.basename(img_path))[0], cols * rows, cols, rel, img.width, img.height))
        gids += cols * rows
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<map version="1.10" tiledversion="1.10.2" orientation="orthogonal" renderorder="right-down" width="%d" height="%d" tilewidth="16" tileheight="16" infinite="0" nextlayerid="%d" nextobjectid="1">'
           % (W, H, len(m.order) + 3)]
    out.extend(tsx)
    for i, name in enumerate(m.order):
        cells = m.layers[name]
        data = []
        for y in range(H):
            row = []
            for x in range(W):
                t = cells.get((x, y))
                row.append(str((firstgid[t[0]] + t[1]) | t[2]) if t else '0')
            data.append(','.join(row))
        out.append('<layer id="%d" name="%s" width="%d" height="%d"><data encoding="csv">\n%s\n</data></layer>'
                   % (i + 1, name, W, H, ',\n'.join(data)))
    objs = []
    oid = 1
    def obj(kind, name, x, y, w=16, h=16, props=None):
        nonlocal oid
        p = ''.join('<property name="%s" value="%s"/>' % (k, v) for k, v in (props or {}).items())
        objs.append('<object id="%d" name="%s" type="%s" x="%d" y="%d" width="%d" height="%d">%s</object>'
                    % (oid, name, kind, x, y, w, h, ('<properties>%s</properties>' % p) if p else ''))
        oid += 1
    obj('entry', 'entry', META['entry'][0] * 16, META['entry'][1] * 16)
    obj('exit', 'exit', META['exit'][0] * 16, META['exit'][1] * 16)
    for d in META['doors']:
        obj('door', d['id'], d['cells'][0][0] * 16, d['cells'][0][1] * 16, 16 * len(d['cells']), 16, dict(zone=d['zone'], label=d['label']))
    for n in META['npcs']:
        obj('npc', n['id'], n['tile'][0] * 16, n['tile'][1] * 16, props=dict(sprite=n['sprite'], dir=n['dir'], wander=int(bool(n.get('wander')))))
    for o in META['objects']:
        obj('object', o['id'], o['tile'][0] * 16, o['tile'][1] * 16, props=dict(radius=o['radius']))
    out.append('<objectgroup id="%d" name="meta">%s</objectgroup>' % (len(m.order) + 1, ''.join(objs)))
    out.append('</map>')
    with open(path, 'w', encoding='utf8') as fh:
        fh.write('\n'.join(out))


def read_tmx_meta(path):
    root = ET.parse(path).getroot()
    meta = dict(entry=None, exit=None, doors=[], npcs=[], objects=[])
    for og in root.findall('objectgroup'):
        for o in og.findall('object'):
            kind, name = o.get('type'), o.get('name')
            x, y = int(float(o.get('x'))) // 16, int(float(o.get('y'))) // 16
            props = {p.get('name'): p.get('value') for p in o.findall('properties/property')}
            if kind == 'entry': meta['entry'] = (x, y)
            elif kind == 'exit': meta['exit'] = (x, y)
            elif kind == 'door':
                w = int(float(o.get('width', 16))) // 16
                meta['doors'].append(dict(id=name, zone=props['zone'], label=props.get('label', name), cells=[(x + i, y) for i in range(max(1, w))]))
            elif kind == 'npc':
                meta['npcs'].append(dict(id=name, sprite=props['sprite'], tile=(x, y), dir=int(props.get('dir', 0)), wander=props.get('wander') == '1'))
            elif kind == 'object':
                meta['objects'].append(dict(id=name, tile=(x, y), radius=int(props.get('radius', 20))))
    return meta


def bake_town(layers, meta, preview_dir):
    water = [n for n, _ in layers if classify(n) == 'water']
    over = [n for n, _ in layers if classify(n) == 'over']
    out_dir = os.path.join(OUT, 'greyhaven')
    force_walk = [c for d in meta['doors'] for c in d['cells']] + [meta['entry'], meta['exit']]
    solid, comp = T.bake(out_dir, layers, W, H, water, over, force_walkable=force_walk,
                         base_layers=('ground', 'ground_detail', 'ground_spots', 'dirt', 'cobbles', 'cobble_loose', 'paths', 'flowers'))
    for c in force_walk:
        assert c in comp, 'door/entry %s is not reachable' % (c,)
    npcs = []
    for n in meta['npcs']:
        t = B.nearest(comp, *n['tile'])
        npcs.append(dict(id=n['id'], sprite=n['sprite'], x=t[0] * 16 + 8, y=t[1] * 16 + 12, dir=n['dir'], wander=bool(n.get('wander'))))
    objects = [dict(id=o['id'], x=o['tile'][0] * 16 + 8, y=o['tile'][1] * 16 + 8, radius=o['radius']) for o in meta['objects']]
    data = dict(zone='greyhaven', kind='town', w=W, h=H, tile=16, waterFrames=6, solid=T.solid_string(solid),
                entry=list(meta['entry']), exit=list(meta['exit']), walkable=len(comp), doors=meta['doors'], npcs=npcs, objects=objects)
    T.write_meta(out_dir, 'greyhaven', data)
    print('greyhaven: %dx%d walkable=%d npcs=%d doors=%d' % (W, H, len(comp), len(npcs), len(meta['doors'])))
    if preview_dir:
        B.preview(out_dir, solid, data, os.path.join(preview_dir, 'collision_greyhaven.png'))


INTERIORS = {
    'hall_int': dict(tmx=os.path.join(TOWN, 'home', 'Interior1.tmx'), label='Hunter Hall', entry_local=(-9, 3), door='hall',
                     npcs=[dict(id='mira', sprite='npcs/mira', local=(-2, 4), dir=2)], objects=[dict(id='hearth', local=(-6, -2), radius=24)]),
    'inn_int': dict(tmx=os.path.join(TOWN, 'home', 'Interior1.tmx'), label="Wayfarer's Rest", entry_local=(-9, 3), door='inn',
                    npcs=[dict(id='tapster', sprite='npcs/tapster', local=(-2, 4), dir=2)], objects=[dict(id='innbed', local=(-7, -4), radius=22)]),
    'workshop_int': dict(tmx=os.path.join(TOWN, 'home', 'Interior1.tmx'), label='Relic Workshop', entry_local=(-9, 3), door='workshop',
                         npcs=[dict(id='smith', sprite='npcs/smith', local=(-2, 4), dir=2)], objects=[dict(id='bench', local=(4, -3), radius=22)]),
    'archive_int': dict(tmx=os.path.join(TOWN, 'home', 'Interior1.tmx'), label="Archivist's House", entry_local=(-9, 3), door='archive',
                        npcs=[dict(id='archivist', sprite='npcs/archivist', local=(-3, 3), dir=0)], objects=[dict(id='maps', local=(4, -3), radius=22)]),
    'clinic_int': dict(tmx=os.path.join(TOWN, 'herbalist', 'Interior.tmx'), label='The Clinic', entry_local=(-11, 1), door='clinic',
                       npcs=[dict(id='healer', sprite='npcs/healer', local=(2, 1), dir=2)], objects=[]),
    'lift_int': dict(tmx=os.path.join(TOWN, 'temple', 'Ruined_temple_interior.tmx'), label='Lift Station — Under-Room', entry_local=None, door='lift',
                     npcs=[], objects=[dict(id='vault', local=(0, -3), radius=28)]),
}


if __name__ == '__main__':
    pd = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    if '--from-tmx' in sys.argv:
        layers, _ = T.load_tmx(TMX_OUT)
        meta = read_tmx_meta(TMX_OUT)
    else:
        m = design()
        write_tmx(m, TMX_OUT)
        layers, meta = m.as_layers(), META
    bake_town(layers, meta, pd)
    B.DOORS = meta['doors']
    for zone, cfg in INTERIORS.items():
        B.bake_interior(zone, cfg, pd)
