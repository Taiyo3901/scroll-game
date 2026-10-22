"""
全職業の探索者の見た目を、1枚の画像（hero-sheet.png）にして、ルートに置く。
`python tools/make-hero-sheet.py`（Pillow が必要。日本語のフォントは、Windows の Meiryo を使う）
行ごとに職業、列は 立ち / 歩く(4コマ) / 物色(2コマ) / 喜ぶ。
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(os.path.join(root, 'src', 'data', 'actors.json'), encoding='utf-8'))
pal = data['palette']
K = 5  # 1マスを何pxで描くか
SIZE = 22
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
jobs = list(data['heroes'])
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
        sheet.paste(render(data['heroes'][job][pose][i]), (LABEL_W + c * SIZE * K, y0))
out = os.path.join(root, 'hero-sheet.png')
sheet.save(out)
print(len(jobs), 'jobs ->', out)
