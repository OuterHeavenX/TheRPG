"""Bake the craftpix Tiled maps into flat PNG layers + a collision grid for TheRPG.

Usage:  python tools/bake_maps.py [--preview OUT_DIR]
Outputs assets/maps/<zone>/{water_N.png, ground.png, over.png, map.json}
"""
import os, sys, json, base64, zlib, struct, xml.etree.ElementTree as ET
from collections import deque
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILE = 16
FLIPH, FLIPV, FLIPD = 0x80000000, 0x40000000, 0x20000000
WATER_FRAMES = 6
GROUND_MIN = 0.4   # min opaque coverage from ground layers to be walkable
OVER_MAX = 0.6     # object-layer coverage at or above this blocks the cell

ZONES = {
    'grassland': dict(tmx='Glades.tmx',
        water=['water background', 'water lighting', 'water lighting2', 'water lighting3'],
        over=['objects1', 'objects2', 'objects3'], bounds=None),
    'forest': dict(tmx='Forest.tmx',
        water=['water', 'water_details', 'water_details2'],
        over=['objects2', 'objects1', 'objects3'], bounds=None),
    'cursed': dict(tmx='Cursed_land.tmx',
        water=['water', 'water_detailazation', 'water_detailization2'],
        over=['Objects6', 'Objects', 'Objects4', 'Objects7', 'Objects8', 'Objects2', 'Objects3', 'Objects5'],
        bounds=(-38, 14, -1, 38)),
}


def decode(data, text):
    enc, comp = data.get('encoding'), data.get('compression')
    if enc == 'csv':
        return [int(v) for v in text.replace('\n', '').split(',') if v.strip()]
    b = base64.b64decode(text.strip())
    if comp == 'zlib':
        b = zlib.decompress(b)
    elif comp == 'gzip':
        import gzip
        b = gzip.decompress(b)
    return list(struct.unpack('<%dI' % (len(b) // 4), b))


def load_map(zone, cfg):
    td = os.path.join(ROOT, 'assets', 'tilesets', zone, 'tiled')
    root = ET.parse(os.path.join(td, cfg['tmx'])).getroot()
    tilesets = []
    for ts in root.findall('tileset'):
        fg = int(ts.get('firstgid'))
        t = ET.parse(os.path.join(td, ts.get('source'))).getroot() if ts.get('source') else ts
        img = t.find('image')
        anim = {}
        for tile in t.findall('tile'):
            a = tile.find('animation')
            if a is not None:
                anim[int(tile.get('id'))] = [int(f.get('tileid')) for f in a.findall('frame')]
        tilesets.append(dict(firstgid=fg, columns=int(t.get('columns')), anim=anim,
                             image=Image.open(os.path.join(td, img.get('source'))).convert('RGBA')))
    tilesets.sort(key=lambda t: t['firstgid'])
    layers = []
    for L in root.findall('layer'):
        cells = {}
        data = L.find('data')
        for ch in data.findall('chunk'):
            cx, cy, cw, chh = [int(ch.get(k)) for k in ('x', 'y', 'width', 'height')]
            for i, v in enumerate(decode(data, ch.text)):
                if v:
                    cells[(cx + i % cw, cy + i // cw)] = v
        layers.append((L.get('name'), cells))
    return tilesets, layers


_cache = {}


def tile_img(tilesets, gid, frame=0):
    key = (id(tilesets), gid, frame)
    if key in _cache:
        return _cache[key]
    raw = gid & ~(FLIPH | FLIPV | FLIPD)
    ts = None
    for t in tilesets:
        if raw >= t['firstgid']:
            ts = t
    lid = raw - ts['firstgid']
    if lid in ts['anim']:
        fr = ts['anim'][lid]
        lid = fr[frame % len(fr)]
    c, r = lid % ts['columns'], lid // ts['columns']
    im = ts['image'].crop((c * TILE, r * TILE, c * TILE + TILE, r * TILE + TILE))
    if gid & FLIPD:
        im = im.transpose(Image.TRANSPOSE)
    if gid & FLIPH:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if gid & FLIPV:
        im = im.transpose(Image.FLIP_TOP_BOTTOM)
    _cache[key] = im
    return im


def coverage(im):
    a = im.getchannel('A')
    return sum(1 for v in a.getdata() if v > 40) / (TILE * TILE)


def bake(zone, cfg, preview_dir=None):
    tilesets, layers = load_map(zone, cfg)
    if cfg['bounds']:
        minx, miny, maxx, maxy = cfg['bounds']
    else:
        # bounds come from the ground/water layers only, so tree canopies hanging past the
        # edge of the terrain don't add empty black margins to the baked map
        skip = set(cfg['over'])
        pts = [p for name, cells in layers if name not in skip for p in cells]
        minx, miny = min(p[0] for p in pts), min(p[1] for p in pts)
        maxx, maxy = max(p[0] for p in pts), max(p[1] for p in pts)
    W, H = maxx - minx + 1, maxy - miny + 1
    out_dir = os.path.join(ROOT, 'assets', 'maps', zone)
    os.makedirs(out_dir, exist_ok=True)

    def render(names, frame=0):
        im = Image.new('RGBA', (W * TILE, H * TILE), (0, 0, 0, 0))
        for name, cells in layers:
            if name not in names:
                continue
            for (x, y), gid in cells.items():
                if minx <= x <= maxx and miny <= y <= maxy:
                    im.alpha_composite(tile_img(tilesets, gid, frame), ((x - minx) * TILE, (y - miny) * TILE))
        return im

    water = set(cfg['water'])
    over = set(cfg['over'])
    ground = set(n for n, _ in layers if n not in water and n not in over)
    for f in range(WATER_FRAMES):
        render(water, f).save(os.path.join(out_dir, 'water_%d.png' % f))
    render(ground).save(os.path.join(out_dir, 'ground.png'))
    render(over).save(os.path.join(out_dir, 'over.png'))

    # collision: walkable if enough ground under the cell and not too much object on top
    gcov = [[0.0] * W for _ in range(H)]
    ocov = [[0.0] * W for _ in range(H)]
    for name, cells in layers:
        if name in water:
            continue
        tgt = ocov if name in over else gcov
        for (x, y), gid in cells.items():
            if minx <= x <= maxx and miny <= y <= maxy:
                tgt[y - miny][x - minx] = max(tgt[y - miny][x - minx], coverage(tile_img(tilesets, gid)))
    solid = [[not (gcov[y][x] >= GROUND_MIN and ocov[y][x] < OVER_MAX) for x in range(W)] for y in range(H)]

    # keep only the largest connected walkable component
    seen = [[False] * W for _ in range(H)]
    best = []
    for sy in range(H):
        for sx in range(W):
            if solid[sy][sx] or seen[sy][sx]:
                continue
            comp = []
            q = deque([(sx, sy)])
            seen[sy][sx] = True
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and not solid[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(comp) > len(best):
                best = comp
    comp_set = set(best)
    for y in range(H):
        for x in range(W):
            if (x, y) not in comp_set:
                solid[y][x] = True

    # entry/exit: "open" cells (3x3 walkable neighbourhood) near the west / east edge, mid-height
    def is_open(p):
        return all((p[0] + dx, p[1] + dy) in comp_set for dx in (-1, 0, 1) for dy in (-1, 0, 1))

    open_cells = [p for p in best if is_open(p)] or best
    entry = min(open_cells, key=lambda p: p[0] * 3 + abs(p[1] - H / 2))
    exit_ = min(open_cells, key=lambda p: (W - 1 - p[0]) * 3 + abs(p[1] - H / 2))
    meta = dict(zone=zone, w=W, h=H, tile=TILE, waterFrames=WATER_FRAMES,
                solid=''.join('1' if solid[y][x] else '0' for y in range(H) for x in range(W)),
                entry=list(entry), exit=list(exit_), walkable=len(best))
    with open(os.path.join(out_dir, 'map.json'), 'w') as fh:
        json.dump(meta, fh)
    # JS twin so the game works from file:// without fetch()
    with open(os.path.join(out_dir, 'map.js'), 'w') as fh:
        fh.write('window.RPG = window.RPG || {};\nRPG.MAPS = RPG.MAPS || {};\nRPG.MAPS[%s] = %s;\n'
                 % (json.dumps(zone), json.dumps(meta)))
    print('%s: %dx%d tiles, walkable=%d, entry=%s, exit=%s' % (zone, W, H, len(best), entry, exit_))

    if preview_dir:
        prev = render(water)
        prev.alpha_composite(render(ground))
        prev.alpha_composite(render(over))
        ov = Image.new('RGBA', prev.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        for y in range(H):
            for x in range(W):
                if solid[y][x]:
                    d.rectangle([x * TILE, y * TILE, x * TILE + 15, y * TILE + 15], fill=(255, 0, 0, 90))
        d.rectangle([entry[0] * TILE, entry[1] * TILE, entry[0] * TILE + 15, entry[1] * TILE + 15], fill=(0, 255, 0, 220))
        d.rectangle([exit_[0] * TILE, exit_[1] * TILE, exit_[0] * TILE + 15, exit_[1] * TILE + 15], fill=(0, 0, 255, 220))
        prev.alpha_composite(ov)
        prev.save(os.path.join(preview_dir, 'collision_%s.png' % zone))


if __name__ == '__main__':
    pd = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    for zone, cfg in ZONES.items():
        bake(zone, cfg, pd)
