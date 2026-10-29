"""
README に使うドット絵のアイコンを、ゲームの絵から切り出して docs/images/icons/ に書き出す。
`python tools/make-readme-icons.py`（Pillow が必要）

- 発見品のアイコン（14マス）と、入れ物（14マス）は、2倍の 28px で出す。
- 探索者（34マス）は、2倍の 68px で出す。
どれも整数倍で書き出すので、README の中で、拡大・縮小せずに、くっきり見える。
"""
import json
import os
import re

from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(root, 'docs', 'images', 'icons')
os.makedirs(out_dir, exist_ok=True)

sprites = json.load(open(os.path.join(root, 'src', 'data', 'sprites.json'), encoding='utf-8'))
actors = json.load(open(os.path.join(root, 'src', 'data', 'actors.json'), encoding='utf-8'))


def unrle(s):
    return [re.sub(r'(\D)(\d+)', lambda m: m.group(1) * int(m.group(2)), row) for row in s.split('/')]


def draw(rows, palette, scale):
    n = len(rows)
    im = Image.new('RGBA', (n * scale, n * scale), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == '.' or c not in palette:
                continue
            h = palette[c].lstrip('#')
            rgba = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
            for dy in range(scale):
                for dx in range(scale):
                    px[x * scale + dx, y * scale + dy] = rgba
    return im


def save(name, im):
    im.save(os.path.join(out_dir, name + '.png'))


# 発見品のアイコン: 見出しや表の飾り
ITEMS = {
    'compass': 'true-compass',      # すぐに使う
    'sword': 'polished-sword',      # 遊び方
    'tome': 'sage-tome',            # 職業
    'torch': 'broken-torch',        # 右端の帯
    'screen': 'screen-scrap',       # 画面
    'medal': 'victor-medal',        # なじみ具合
    'key': 'mystery-key',           # プライバシー
    'gear': 'rusty-gear',           # 設定
    'feather': 'carrier-feather',   # フレンド
    'pen': 'red-pen',               # 困ったとき
    'chip': 'circuit-chip',         # 開発者向け
    'pouch': 'old-pouch',
}
for name, item in ITEMS.items():
    save(name, draw([r for r in sprites['sprites'][item]], sprites['palette'], 2))

# 入れ物: 壺・箱・宝箱・ミミック
cont = actors['containers']
palette = actors['palette']
for name, key, frame in [('pot', 'pot:cave', 0), ('chest', 'chest:cave', 0), ('chest-open', 'chest:cave', 2), ('mimic', 'mimic:cave', 0)]:
    save(name, draw(unrle(cont[key][frame]), palette, 2))

# 部屋ごとの箱（部屋のしるし）
ROOMS = ['video', 'sns', 'news', 'study', 'shop', 'dev', 'game', 'music', 'travel', 'work', 'other']
for room in ROOMS:
    save('room-' + room, draw(unrle(cont['box:' + room][0]), palette, 2))

# 探索者（立ち姿）: 部屋の職業と、勇者・診断前（ファイル名は、URL で扱いやすい英字にする）
HEROES = {
    'default': 'default', '勇者': 'hero', '戦士': 'warrior', '騎士': 'knight', '賢者': 'sage', '錬金術師': 'alchemist',
    '斥候': 'scout', '踊り子': 'dancer', '遊び人': 'jester', '商人': 'merchant', '吟遊詩人': 'bard', '旅人': 'traveler', '放浪者': 'wanderer',
}
for job, name in HEROES.items():
    save('hero-' + name, draw(unrle(actors['heroes'][job]['idle'][0]), palette, 2))

# 大きい版（4倍。56px）: README の特長のカードに使う
for name, item in {'tome': 'sage-tome', 'torch': 'broken-torch', 'feather': 'carrier-feather', 'key': 'mystery-key'}.items():
    save(name + '-l', draw([r for r in sprites['sprites'][item]], sprites['palette'], 4))
save('chest-l', draw(unrle(cont['chest:cave'][0]), palette, 4))
save('room-video-l', draw(unrle(cont['box:video'][0]), palette, 4))

print(len(os.listdir(out_dir)), 'icons ->', out_dir)
