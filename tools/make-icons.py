"""
拡張機能のアイコン（16/32/48/128px）を作る。`python tools/make-icons.py` で src/icons/ を作り直す。
絵は、開いた宝箱（actors.json の chest:cave の最後のコマ）を、ぼやけないよう整数倍に拡大したもの。
Pillow が必要（pip install pillow）。
"""
import json
import os

from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(os.path.join(root, 'src', 'data', 'actors.json'), encoding='utf-8'))
palette = data['palette']
rows = data['containers']['chest:cave'][2]
n = len(rows)

base = Image.new('RGBA', (n, n), (0, 0, 0, 0))
for y, row in enumerate(rows):
    for x, c in enumerate(row):
        if c != '.':
            h = palette[c].lstrip('#')
            base.putpixel((x, y), (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255))

out = os.path.join(root, 'src', 'icons')
os.makedirs(out, exist_ok=True)
for size in (16, 32, 48, 128):
    scale = max(1, size // n)
    img = base.resize((n * scale, n * scale), Image.NEAREST)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    canvas.save(os.path.join(out, f'icon{size}.png'))
print('icons ->', out)
