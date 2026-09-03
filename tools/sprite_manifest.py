"""Scan assets/characters and assets/enemies sprite sheets and write assets/sprites.js + sprites.json.

Every sheet is a grid of square frames (64px, or 128px for the demons) with one row per facing:
row 0 = down, 1 = up, 2 = left, 3 = right.  Frame counts per row are detected by looking for
non-empty cells, and a feet anchor is measured from the idle animation.

Usage:  python tools/sprite_manifest.py
"""
import os, json, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')


def scan():
    man = {}
    for d in sorted(glob.glob(os.path.join(ASSETS, 'characters', '*')) + glob.glob(os.path.join(ASSETS, 'enemies', '*'))):
        key = os.path.relpath(d, ASSETS).replace(os.sep, '/')
        entry = {}
        for f in sorted(os.listdir(d)):
            if not f.lower().endswith('.png'):
                continue
            im = Image.open(os.path.join(d, f)).convert('RGBA')
            fs = 128 if im.height >= 512 else 64
            rows, cols = im.height // fs, im.width // fs
            counts = []
            for r in range(rows):
                n = 0
                for c in range(cols):
                    if im.crop((c * fs, r * fs, c * fs + fs, r * fs + fs)).getbbox():
                        n = c + 1
                counts.append(n)
            entry[f[:-4]] = dict(fs=fs, rows=rows, cols=cols, frames=counts)
        idle = entry['idle']
        im = Image.open(os.path.join(d, 'idle.png')).convert('RGBA')
        fs = idle['fs']
        l = t = 10 ** 9
        r = b = -1
        for c in range(idle['frames'][0]):
            bb = im.crop((c * fs, 0, c * fs + fs, fs)).getbbox()
            if bb:
                l, t, r, b = min(l, bb[0]), min(t, bb[1]), max(r, bb[2]), max(b, bb[3])
        entry['anchor'] = [round((l + r) / 2), b - 3]
        entry['bbox'] = [l, t, r, b]
        man[key] = entry
        print('%-32s %s' % (key, ' '.join(a for a in entry if a not in ('anchor', 'bbox'))))
    return man


if __name__ == '__main__':
    man = scan()
    with open(os.path.join(ASSETS, 'sprites.json'), 'w') as fh:
        json.dump(man, fh)
    with open(os.path.join(ASSETS, 'sprites.js'), 'w') as fh:
        fh.write('window.RPG = window.RPG || {};\nRPG.SPRITES = ' + json.dumps(man) + ';\n')
    print('wrote assets/sprites.json and assets/sprites.js')
