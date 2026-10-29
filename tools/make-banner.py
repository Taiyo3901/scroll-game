"""
README の飾り（バナーと区切り線）を、ゲームのドット絵から作る。
`python tools/make-banner.py`（Pillow が必要。日本語のフォントは、Windows の Meiryo を使う）
- docs/images/banner.png: 迷宮の壁を背景に、探索者と入れ物、松明、題名を並べた横長の画像
- docs/images/divider.png: 節の区切りに使う、入れ物と品を並べた細い画像
"""
import json
import os
import random
import re

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(root, 'docs', 'images')
sprites = json.load(open(os.path.join(root, 'src', 'data', 'sprites.json'), encoding='utf-8'))
actors = json.load(open(os.path.join(root, 'src', 'data', 'actors.json'), encoding='utf-8'))
palette = actors['palette']
random.seed(7)


def unrle(s):
    return [re.sub(r'(\D)(\d+)', lambda m: m.group(1) * int(m.group(2)), row) for row in s.split('/')]


def draw_rows(rows, pal, scale):
    n = len(rows)
    im = Image.new('RGBA', (n * scale, n * scale), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == '.' or c not in pal:
                continue
            h = pal[c].lstrip('#')
            rgba = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
            for dy in range(scale):
                for dx in range(scale):
                    px[x * scale + dx, y * scale + dy] = rgba
    return im


def hero(job, scale):
    return draw_rows(unrle(actors['heroes'][job]['idle'][0]), palette, scale)


def container(key, frame, scale):
    return draw_rows(unrle(actors['containers'][key][frame]), palette, scale)


def item(item_id, scale):
    return draw_rows(sprites['sprites'][item_id], sprites['palette'], scale)


def font(size, bold=False):
    names = ('meiryob.ttc', 'YuGothB.ttc') if bold else ('meiryo.ttc', 'YuGothM.ttc')
    for name in names:
        try:
            return ImageFont.truetype(os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', name), size)
        except OSError:
            continue
    return ImageFont.load_default()


def wall(w, h):
    """暗いレンガの壁"""
    im = Image.new('RGB', (w, h), (22, 16, 12))
    d = ImageDraw.Draw(im)
    bh, bw = 24, 56
    tones = [(48, 35, 25), (54, 39, 28), (43, 31, 22), (58, 42, 30), (40, 29, 21)]
    for row in range(h // bh + 1):
        off = (bw // 2) if row % 2 else 0
        for col in range(-1, w // bw + 2):
            x0, y0 = col * bw + off, row * bh
            c = random.choice(tones)
            d.rectangle([x0 + 2, y0 + 2, x0 + bw - 2, y0 + bh - 2], fill=c)
            d.rectangle([x0 + 2, y0 + 2, x0 + bw - 2, y0 + 4], fill=tuple(min(255, v + 10) for v in c))
            d.rectangle([x0 + 2, y0 + bh - 5, x0 + bw - 2, y0 + bh - 2], fill=tuple(max(0, v - 9) for v in c))
    return im


def glow(size, center, radius, color, strength):
    layer = Image.new('RGB', size, (0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(radius, 0, -4):
        t = (1 - i / radius) ** 2
        c = tuple(int(v * strength * t) for v in color)
        d.ellipse([center[0] - i, center[1] - i, center[0] + i, center[1] + i], fill=c)
    return layer.filter(ImageFilter.GaussianBlur(10))


def banner():
    W, H = 1280, 320
    im = wall(W, H)

    # 上と下を暗くして、通路の中のように見せる
    shade = Image.new('L', (W, H), 0)
    sd = ImageDraw.Draw(shade)
    for y in range(H):
        t = abs(y - H / 2) / (H / 2)
        sd.line([(0, y), (W, y)], fill=int(150 * t ** 2.2))
    im = Image.composite(Image.new('RGB', (W, H), (10, 7, 5)), im, shade)

    # 松明のあかり
    torches = [(60, 120), (W - 60, 120), (640, 60)]
    for cx, cy in torches:
        im = ImageChops.add(im, glow((W, H), (cx, cy), 180, (255, 150, 50), 0.55))

    # 松明
    for cx, cy in torches:
        t = item('broken-torch', 6)
        im.paste(t, (cx - t.width // 2, cy - t.height // 2), t)

    # 題名（ドット絵のように、小さく描いてから整数倍に拡大する）
    scale = 3
    title = Image.new('L', (W // scale, 70), 0)
    td = ImageDraw.Draw(title)
    td.fontmode = '1'
    td.text((0, 6), '迷宮スクロール', font=font(32, True), fill=255)
    bbox = title.getbbox() or (0, 0, 1, 1)
    title = title.crop((bbox[0], bbox[1], bbox[2], bbox[3]))
    big = title.resize((title.width * scale, title.height * scale), Image.NEAREST)
    tx, ty = 120, 78
    shadow = Image.new('RGB', big.size, (24, 14, 8))
    gold = Image.new('RGB', big.size, (246, 212, 76))
    im.paste(shadow, (tx + 6, ty + 6), big)
    im.paste(gold, (tx, ty), big)

    sub = Image.new('L', (W // 2, 20), 0)
    sd2 = ImageDraw.Draw(sub)
    sd2.fontmode = '1'
    sd2.text((0, 0), 'スクロールで降りて、立ち止まって、拾う。', font=font(12), fill=255)
    bb = sub.getbbox() or (0, 0, 1, 1)
    sub = sub.crop(bb).resize(((bb[2] - bb[0]) * 2, (bb[3] - bb[1]) * 2), Image.NEAREST)
    im.paste(Image.new('RGB', sub.size, (236, 224, 200)), (tx + 4, ty + big.height + 28), sub)

    # 探索者の行列（右側）
    crew = ['戦士', '賢者', '勇者', '踊り子', '斥候']
    sc = 4
    x = 806
    floor = 262
    for i, job in enumerate(crew):
        h = hero(job, sc)
        y = floor - h.height + (4 if i % 2 else 0)
        sh = Image.new('RGBA', h.size, (0, 0, 0, 0))
        im.paste(h, (x, y), h)
        x += 74
    # 足もとの入れ物
    for key, frame, px_ in [('pot:cave', 0, 716), ('chest:cave', 2, 1226)]:
        c = container(key, frame, 3)
        im.paste(c, (px_, floor - c.height + 4), c)

    # 床
    d = ImageDraw.Draw(im)
    d.rectangle([0, floor + 4, W, H], fill=(18, 13, 10))
    d.line([(0, floor + 4), (W, floor + 4)], fill=(90, 66, 44), width=3)
    return im


def divider():
    W, H = 960, 40
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    icons = ['rusty-gear', 'true-compass', 'polished-sword', 'sage-tome', 'mystery-key', 'victor-medal', 'carrier-feather']
    glyphs = [item(i, 2) for i in icons]
    pot = container('pot:cave', 0, 2)
    chest = container('chest:cave', 0, 2)
    seq = [glyphs[0], glyphs[1], pot, glyphs[2], glyphs[3], chest, glyphs[4], glyphs[5], glyphs[6]]
    n = len(seq)
    step = W // (n + 1)
    mid = H // 2
    d.line([(20, mid), (W - 20, mid)], fill=(120, 96, 64, 255), width=2)
    for k, g in enumerate(seq):
        cx = step * (k + 1)
        d.rectangle([cx - 22, 0, cx + 22, H], fill=(0, 0, 0, 0))
        # 線を、絵の左右で切る
        d.line([(cx - 22, mid), (cx + 22, mid)], fill=(0, 0, 0, 0), width=2)
        im.paste(g, (cx - g.width // 2, mid - g.height // 2), g)
    # 透明に抜いた線を、ごく薄く戻す
    return im


if __name__ == '__main__':
    banner().save(os.path.join(out_dir, 'banner.png'), optimize=True)
    divider().save(os.path.join(out_dir, 'divider.png'), optimize=True)
    print('banner.png, divider.png ->', out_dir)
