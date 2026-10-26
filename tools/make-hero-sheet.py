"""
全職業の探索者の見た目を、1枚の画像（hero-sheet.png）にして、ルートに置く。
`python tools/make-hero-sheet.py`（Pillow が必要。日本語のフォントは、Windows の Meiryo を使う）
行ごとに職業、列は 立ち / 歩く(4コマ) / 物色(2コマ) / 喜ぶ。
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


cols = [('立ち', ('idle', 0))] + [(f'歩く{i + 1}', ('walk', i)) for i in range(4)] + [(f'物色{i + 1}', ('search', i)) for i in range(2)] + [('喜ぶ', ('cheer', 0))]
combo_names = [m for m in re.findall(r"'[a-z]+\+[a-z]+': '([^']+)'", open(os.path.join(root, 'src', 'core', 'jobCombos.ts'), encoding='utf-8').read())]
jobs = [j for j in data['heroes'] if j not in combo_names]
names = {'default': '診断前'}
head_h = 28
W = LABEL_W + SIZE * K * len(cols)
H = head_h + SIZE * K * len(jobs)
sheet = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(sheet)
f = font(15)
for c, (label, _) in enumerate(cols):
    d.text((LABEL_W + c * SIZE * K + 8, 5), label, fill=(235, 225, 205), font=f)
for r, job in enumerate(jobs):
    y0 = head_h + r * SIZE * K
    d.text((10, y0 + SIZE * K // 2 - 9), names.get(job, job), fill=(245, 215, 120), font=font(17))
    for c, (_, (pose, i)) in enumerate(cols):
        sheet.paste(render(unrle(data['heroes'][job][pose][i])), (LABEL_W + c * SIZE * K, y0))
out = os.path.join(root, 'hero-sheet.png')
sheet.save(out)
print(len(jobs), 'jobs ->', out)


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
out2 = os.path.join(root, 'hero-sheet-combos.png')
grid.save(out2)
print(len(combo_names), 'combination jobs ->', out2)
