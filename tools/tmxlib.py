"""Small Tiled (.tmx) reader + baker shared by bake_maps.py and build_greyhaven.py.

A loaded map is a list of layers; each layer is (name, cells) where cells maps (x, y) to a
Tile = (image, local_id, flips).  Keeping tiles as (image, id) pairs instead of global ids lets
scenes from different packs be composed into one map.
"""
import os, json, base64, zlib, struct, gzip
import xml.etree.ElementTree as ET
from collections import deque
from PIL import Image

TILE = 16
FLIPH, FLIPV, FLIPD = 0x80000000, 0x40000000, 0x20000000
_images = {}
_tiles = {}


def image(path):
    path = os.path.abspath(path)
    if path not in _images:
        _images[path] = Image.open(path).convert('RGBA')
    return _images[path]


def _decode(data, text):
    enc, comp = data.get('encoding'), data.get('compression')
    if enc == 'csv':
        return [int(v) for v in text.replace('\n', '').split(',') if v.strip()]
    b = base64.b64decode(text.strip())
    if comp == 'zlib':
        b = zlib.decompress(b)
    elif comp == 'gzip':
        b = gzip.decompress(b)
    return list(struct.unpack('<%dI' % (len(b) // 4), b))


def load_tmx(path, first_frame=True):
    """Return (layers, tilesets). Animated tiles resolve to their first frame."""
    td = os.path.dirname(os.path.abspath(path))
    root = ET.parse(path).getroot()
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
                             path=os.path.abspath(os.path.join(td, img.get('source'))), name=t.get('name')))
    tilesets.sort(key=lambda t: t['firstgid'])

    def resolve(gid, frame=0):
        raw = gid & ~(FLIPH | FLIPV | FLIPD)
        ts = None
        for t in tilesets:
            if raw >= t['firstgid']:
                ts = t
        lid = raw - ts['firstgid']
        if lid in ts['anim']:
            fr = ts['anim'][lid]
            lid = fr[frame % len(fr)]
        return (ts['path'], lid, gid & (FLIPH | FLIPV | FLIPD), ts['anim'].get(raw - ts['firstgid']))

    layers = []
    for L in root.findall('layer'):
        cells = {}
        data = L.find('data')
        chunks = data.findall('chunk')
        if chunks:
            for ch in chunks:
                cx, cy, cw = int(ch.get('x')), int(ch.get('y')), int(ch.get('width'))
                for i, v in enumerate(_decode(data, ch.text)):
                    if v:
                        cells[(cx + i % cw, cy + i // cw)] = resolve(v)
        else:
            w = int(L.get('width'))
            for i, v in enumerate(_decode(data, data.text)):
                if v:
                    cells[(i % w, i // w)] = resolve(v)
        layers.append((L.get('name'), cells))
    return layers, tilesets


def tile_image(tile, frame=0):
    """Tile = (image_path, local_id, flips, anim_frames_or_None) -> 16x16 RGBA."""
    path, lid, flips, anim = tile
    if anim and frame:
        lid = anim[frame % len(anim)]
    key = (path, lid, flips)
    if key in _tiles:
        return _tiles[key]
    img = image(path)
    cols = img.width // TILE
    c, r = lid % cols, lid // cols
    im = img.crop((c * TILE, r * TILE, c * TILE + TILE, r * TILE + TILE))
    if flips & FLIPD:
        im = im.transpose(Image.TRANSPOSE)
    if flips & FLIPH:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if flips & FLIPV:
        im = im.transpose(Image.FLIP_TOP_BOTTOM)
    _tiles[key] = im
    return im


_cov = {}


def coverage(tile):
    key = tile[:3]
    if key not in _cov:
        a = tile_image(tile).getchannel('A')
        _cov[key] = sum(1 for v in a.getdata() if v > 40) / (TILE * TILE)
    return _cov[key]


def extent(layers):
    pts = [p for _, cells in layers for p in cells]
    return min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)


def render(layers, names, W, H, frame=0, ox=0, oy=0):
    im = Image.new('RGBA', (W * TILE, H * TILE), (0, 0, 0, 0))
    for name, cells in layers:
        if names is not None and name not in names:
            continue
        for (x, y), tile in cells.items():
            x, y = x - ox, y - oy
            if 0 <= x < W and 0 <= y < H:
                im.alpha_composite(tile_image(tile, frame), (x * TILE, y * TILE))
    return im


def bake(out_dir, layers, W, H, water, over, ground_min=0.4, over_max=0.6, water_frames=6,
         ox=0, oy=0, force_walkable=(), force_solid=(), bounds_solid=True, base_layers=()):
    """Write water_N/ground/over PNGs and return (solid grid [y][x], largest component set)."""
    os.makedirs(out_dir, exist_ok=True)
    water, over = set(water), set(over)
    ground = set(n for n, _ in layers if n not in water and n not in over)
    for f in range(water_frames):
        render(layers, water, W, H, f, ox, oy).save(os.path.join(out_dir, 'water_%d.png' % f))
    render(layers, ground, W, H, 0, ox, oy).save(os.path.join(out_dir, 'ground.png'))
    render(layers, over, W, H, 0, ox, oy).save(os.path.join(out_dir, 'over.png'))

    gcov = [[0.0] * W for _ in range(H)]
    ocov = [[0.0] * W for _ in range(H)]
    wcov = [[0.0] * W for _ in range(H)]   # water fill
    scov = [[0.0] * W for _ in range(H)]   # scene ground (coasts, bridges) that may cover water
    base_layers = set(base_layers)
    for name, cells in layers:
        tgt = wcov if name in water else ocov if name in over else gcov
        for (x, y), tile in cells.items():
            x, y = x - ox, y - oy
            if 0 <= x < W and 0 <= y < H:
                c = coverage(tile)
                tgt[y][x] = max(tgt[y][x], c)
                if tgt is gcov and name not in base_layers:
                    scov[y][x] = max(scov[y][x], c)
    solid = [[not (gcov[y][x] >= ground_min and ocov[y][x] < over_max) or (wcov[y][x] >= 0.9 and scov[y][x] < 0.5)
              for x in range(W)] for y in range(H)]
    for (x, y) in force_walkable:
        solid[y][x] = False
    for (x, y) in force_solid:
        solid[y][x] = True

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
    comp = set(best)
    for y in range(H):
        for x in range(W):
            if (x, y) not in comp:
                solid[y][x] = True
    return solid, comp


def write_meta(out_dir, zone, meta):
    with open(os.path.join(out_dir, 'map.json'), 'w') as fh:
        json.dump(meta, fh)
    with open(os.path.join(out_dir, 'map.js'), 'w') as fh:
        fh.write('window.RPG = window.RPG || {};\nRPG.MAPS = RPG.MAPS || {};\nRPG.MAPS[%s] = %s;\n'
                 % (json.dumps(zone), json.dumps(meta)))


def solid_string(solid):
    return ''.join('1' if c else '0' for row in solid for c in row)
