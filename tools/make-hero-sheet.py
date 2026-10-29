"""
組み合わせの職業（45種類）の見た目を、1枚の画像（docs/images/hero-sheet-combos.png）にする。
`python tools/make-hero-sheet.py`（Pillow が必要。日本語のフォントは、Windows の Meiryo を使う）
"""
import json
import os
import re

from PIL import Image, ImageDraw, ImageFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(os.path.join(root, 'src', 'data', 'actors.json'), encoding='utf-8'))
pal = data['palette']


def unrle(s):
    import re

    return [re.sub(r'(\D)(\d+)', lambda m: m.group(1) * int(m.group(2)), row) for row in s.split('/')]

K = 4  # 1マスを何pxで描くか
SIZE = 34
LABEL_W = 130
BG = (58, 50, 70)


def render(rows):
    im = Image.new('RGB', (SIZE * K, SIZE * K), BG)
    px = im.load()
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == '.':
                continue
            h = pal[c].lstrip('#')
            rgb = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
            for dy in range(K):
                for dx in range(K):
                    px[x * K + dx, y * K + dy] = rgb
    return im


def font(size):
    for name in ('meiryo.ttc', 'YuGothM.ttc', 'msgothic.ttc'):
        try:
            return ImageFont.truetype(os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', name), size)
        except OSError:
            continue
    return ImageFont.load_default()


combo_names = [m for m in re.findall(r"'[a-z]+\+[a-z]+': '([^']+)'", open(os.path.join(root, 'src', 'core', 'jobCombos.ts'), encoding='utf-8').read())]
names = {'default': '診断前'}


# 組み合わせの職業（45種類）は、立ち姿だけを、格子状に並べる
CELL_W = SIZE * K + 16
cols_n = 9
rows_n = (len(combo_names) + cols_n - 1) // cols_n
grid = Image.new('RGB', (CELL_W * cols_n, rows_n * (SIZE * K + 30) + 8), BG)
gd = ImageDraw.Draw(grid)
gf = font(14)
for n, job in enumerate(combo_names):
    cx, cy = (n % cols_n) * CELL_W, (n // cols_n) * (SIZE * K + 30) + 4
    grid.paste(render(unrle(data['heroes'][job]['idle'][0])), (cx + 8, cy))
    w = gd.textlength(job, font=gf)
    gd.text((cx + (CELL_W - w) / 2, cy + SIZE * K + 4), job, fill=(245, 215, 120), font=gf)
out2 = os.path.join(root, 'docs', 'images', 'hero-sheet-combos.png')
grid.save(out2)
print(len(combo_names), 'combination jobs ->', out2)
