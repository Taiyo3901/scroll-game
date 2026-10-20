"""
帯の中で動く絵（入れ物と、職業別の探索者）を作る。
`python tools/make-actors.py` で src/data/actors.json を作り直す。共通の部品は art.py。

- 入れ物: 壺(階層ごと) / 宝箱(階層ごと) / ミミック(階層ごと) / 箱(部屋ごと)。ふたの開き方を3コマ（ミミックは2コマ）で描く。
- 探索者: 職業ごとの見た目（22x22のマス。入れ物の14x14より細かい）。歩く(4コマ)・物色(2コマ)・立ち(1コマ)・喜ぶ(1コマ)。
"""
import json
import os

from art import PALETTE, Art

# ====================== 入れ物 ======================

# (本体, 影, ハイライト, 金具, 光)
CHEST_PAL = {
    'cave': ('b', 'B', 't', 'g', 'y'),
    'waterway': ('N', 'A', 'n', 'l', 'c'),
    'mine': ('B', 'x', 'b', 'Y', 'y'),
    'crystal': ('u', 'C', 'c', 'w', 'c'),
    'magma': ('R', 'x', 'r', 'o', 'o'),
    'abyss': ('P', 'x', 'p', 'V', 'V'),
}
# (本体, 影, ハイライト, ふち, 光)
POT_PAL = {
    'cave': ('o', 'b', 'y', 'T', 'y'),
    'waterway': ('g', 'd', 'l', 'N', 'c'),
    'mine': ('d', 'x', 'g', 'B', 'y'),
    'crystal': ('c', 'u', 'w', 'C', 'w'),
    'magma': ('R', 'x', 'r', 'o', 'o'),
    'abyss': ('P', 'x', 'p', 'V', 'V'),
}

MOTIFS = {
    'video': ['.ddd.', 'dw.wd', 'd.d.d', 'dw.wd', '.ddd.'],
    'sns': ['.mmm.', 'mmmmm', 'mmmmm', '.mmm.', 'mm...'],
    'news': ['wwwww', 'wdddw', 'wwwww', 'wdddw', 'wwwww'],
    'study': ['bbbbb', 'bwwwb', 'bwwwb', 'bwwwb', 'bbbbb'],
    'shop': ['.yyy.', 'yYYYy', 'yYyYy', 'yYYYy', '.yyy.'],
    'dev': ['d.d.d', '.ddd.', 'dd.dd', '.ddd.', 'd.d.d'],
    'game': ['....l', '...l.', 'l.l..', '.l...', 'bl...'],
    'music': ['..www', '..w..', '..w..', 'ww.w.', 'ww...'],
    'travel': ['.yyy.', 'y.r.y', 'y.w.y', 'y.w.y', '.yyy.'],
    'work': ['.rrr.', 'rRRRr', 'rRrRr', 'rRRRr', '.rrr.'],
    'other': ['.www.', 'w...w', '...w.', '..w..', '..w..'],
}

# 部屋ごとの箱: (形, 本体, 影, ハイライト, 金具)
BOX_STYLE = {
    'video': ('case', 'd', 'x', 'g', 'r'),
    'sns': ('barrel', 'o', 'b', 'y', 'B'),
    'news': ('crate', 'g', 'd', 'l', 'u'),
    'study': ('cabinet', 'p', 'P', 'V', 'y'),
    'shop': ('crate', 'b', 'B', 't', 'y'),
    'dev': ('case', 'a', 'A', 'c', 'y'),
    'game': ('crate', 'u', 'C', 'c', 'l'),
    'music': ('case', 'M', 'x', 'm', 'y'),
    'travel': ('crate', 'n', 'N', 't', 'B'),
    'work': ('case', 'b', 'B', 't', 'r'),
    'other': ('crate', 'b', 'B', 't', 'g'),
}

CONTAINERS = {}


def chest(area, frame):
    main, dark, light, metal, glint = CHEST_PAL[area]
    a = Art()
    a.R(1, 6, 10, 10, main)
    a.R(1, 10, 10, 10, dark)
    a.R(2, 6, 2, 10, metal)
    a.R(9, 6, 9, 10, metal)
    if frame == 0:
        a.R(1, 3, 10, 5, main)
        a.R(2, 2, 9, 2, light)
        a.R(2, 3, 2, 5, metal)
        a.R(9, 3, 9, 5, metal)
        a.R(1, 5, 10, 5, dark)
        a.R(5, 5, 6, 7, 'y')
    elif frame == 1:
        a.R(2, 0, 9, 0, light)
        a.R(1, 1, 10, 3, main)
        a.R(2, 1, 2, 3, metal)
        a.R(9, 1, 9, 3, metal)
        a.R(1, 4, 10, 5, 'x')
        a.P(4, 4, glint)
        a.P(7, 5, 'q')
        a.P(6, 4, 'q')
    else:
        a.R(2, 0, 9, 3, dark)
        a.R(3, 1, 8, 2, main)
        a.R(1, 4, 10, 5, 'x')
        a.R(3, 4, 8, 4, 'q')
        a.P(2, 3, 'q')
        a.P(9, 2, 'q')
        a.P(5, 3, glint)
    return a


def mimic(area, frame):
    main, dark, light, metal, glint = CHEST_PAL[area]
    a = Art()
    if frame == 0:
        a.R(1, 6, 10, 10, main)
        a.R(1, 10, 10, 10, dark)
        a.R(2, 6, 2, 10, metal)
        a.R(9, 6, 9, 10, metal)
        a.R(2, 1, 9, 1, light)
        a.R(1, 2, 10, 4, main)
        a.R(1, 5, 10, 5, 'R')
        a.P(3, 3, 'y')
        a.P(8, 3, 'y')
        a.P(3, 3, 'r')
        a.P(8, 3, 'r')
        for x in (2, 4, 6, 8):
            a.P(x, 5, 'w')
        for x in (3, 5, 7, 9):
            a.P(x, 6, 'w')
    else:
        a.R(1, 7, 10, 10, main)
        a.R(1, 10, 10, 10, dark)
        a.R(2, 7, 2, 10, metal)
        a.R(9, 7, 9, 10, metal)
        a.R(2, 0, 9, 0, light)
        a.R(1, 1, 10, 2, main)
        a.P(3, 1, 'y')
        a.P(8, 1, 'y')
        a.R(1, 3, 10, 6, 'R')
        for x in (2, 5, 8):
            a.R(x, 3, x, 4, 'w')
        for x in (3, 6, 9):
            a.R(x, 5, x, 6, 'w')
        a.R(4, 5, 7, 6, 'm')
        a.P(5, 6, 'r')
    return a


def pot(area, frame):
    main, dark, light, rim, glint = POT_PAL[area]
    a = Art()
    a.E(5.5, 7.8, 4.6, 3.5, main)
    a.R(4, 3, 7, 4, main)
    a.R(2, 6, 9, 6, dark)
    a.P(2, 8, light)
    a.P(2, 9, light)
    a.R(1, 11, 10, 11, dark)
    if frame == 0:
        a.R(3, 2, 8, 2, rim)
        a.R(4, 1, 7, 1, dark)
        a.P(5, 0, light)
        a.P(6, 0, light)
    elif frame == 1:
        a.R(3, 2, 8, 2, rim)
        a.R(4, 3, 7, 3, 'x')
        a.R(6, 0, 11, 1, dark)
        a.P(5, 2, glint)
    else:
        a.R(3, 2, 8, 2, rim)
        a.R(4, 3, 7, 3, 'x')
        a.R(5, 1, 6, 1, 'q')
        a.P(4, 0, glint)
        a.P(7, 0, glint)
        a.R(8, 10, 11, 11, dark)
    return a


def box(room, frame):
    style, main, dark, light, accent = BOX_STYLE[room]
    motif = MOTIFS[room]
    a = Art()
    if style == 'barrel':
        a.E(5.5, 8, 4.8, 3.3, main)
        a.R(1, 7, 10, 7, accent)
        a.R(1, 10, 10, 10, accent)
        for x in (3, 5, 7):
            a.R(x, 5, x, 11, dark)
        for y, row in enumerate(motif):
            for x, c in enumerate(row):
                if c != '.':
                    a.P(4 + x, 6 + y if y < 4 else 10, c) if False else None
        if frame == 0:
            a.E(5.5, 4.5, 4.7, 1.5, light)
        elif frame == 1:
            a.E(5.5, 4.5, 4.4, 1.3, 'x')
            a.E(5.5, 2.2, 4.7, 1.3, light)
        else:
            a.E(5.5, 4.5, 4.4, 1.3, 'x')
            a.R(3, 4, 8, 4, 'q')
            a.E(10, 9, 1.2, 2, light)
        _motif(a, motif, 4, 6)
        return a
    if style == 'cabinet':
        a.R(1, 5, 10, 11, dark)
        a.R(0, 3, 11, 4, light)
        shelf = ['r', 'u', 'n', 'y', 'o', 'p']
        if frame == 0:
            a.R(2, 5, 9, 10, main)
            a.R(5, 5, 6, 10, dark)
            _motif(a, motif, 3, 5)
        else:
            for row in (5, 8):
                for i, x in enumerate(range(2, 10)):
                    a.R(x, row, x, row + 1, shelf[i % len(shelf)])
            if frame == 1:
                a.R(2, 5, 3, 10, main)
                a.R(8, 5, 9, 10, main)
            else:
                a.R(0, 5, 1, 10, main)
                a.R(10, 5, 11, 10, main)
                a.R(3, 4, 8, 4, 'q')
        return a
    # crate / case
    body = main
    a.R(0 if style == 'case' else 1, 6, 11 if style == 'case' else 10, 10, body)
    if style == 'crate':
        a.R(1, 8, 10, 8, dark)
        for x, y in ((1, 6), (10, 6), (1, 10), (10, 10)):
            a.P(x, y, accent)
    else:
        a.R(0, 10, 11, 10, dark)
        a.R(1, 7, 1, 9, accent)
        a.R(10, 7, 10, 9, accent)
    _motif(a, motif, 4, 6)
    if frame == 0:
        a.R(0, 3, 11, 5, main)
        a.R(0, 3, 11, 3, light)
        a.R(0, 5, 11, 5, dark)
        if style == 'case':
            a.R(5, 5, 6, 6, accent)
    elif frame == 1:
        a.R(0, 1, 11, 3, main)
        a.R(0, 1, 11, 1, light)
        a.R(0, 4, 11, 5, 'x')
        a.P(3, 4, 'q')
        a.P(8, 5, 'q')
    else:
        a.R(1, 0, 10, 2, dark)
        a.R(0, 3, 11, 5, 'x')
        a.R(3, 3, 8, 3, 'q')
        a.P(2, 2, 'q')
        a.P(9, 1, 'q')
    return a


def _motif(a, motif, x0, y0):
    for y, row in enumerate(motif):
        for x, c in enumerate(row):
            if c != '.':
                a.P(x0 + x, y0 + y, c)


for area in CHEST_PAL:
    CONTAINERS[f'chest:{area}'] = [chest(area, f).rows() for f in range(3)]
    CONTAINERS[f'mimic:{area}'] = [mimic(area, f).rows() for f in range(2)]
    CONTAINERS[f'pot:{area}'] = [pot(area, f).rows() for f in range(3)]
for room in BOX_STYLE:
    CONTAINERS[f'box:{room}'] = [box(room, f).rows() for f in range(3)]

# ====================== 探索者 ======================
# 20x20 のマスに描き、縁取りを付けて 22x22。入れ物（14x14）より、ドットが細かい。

OUTFITS = {
    'default': dict(body='b', dark='B', trim='Y', hat='none', hair='H'),
    '踊り子': dict(body='m', dark='M', trim='y', hat='flower', hair='M', skirt=True),
    '遊び人': dict(body='p', dark='P', trim='y', hat='jester', hair='H'),
    '斥候': dict(body='N', dark='A', trim='B', hat='hood', hood='N', mask=True),
    '賢者': dict(body='w', dark='l', trim='u', hat='wizard', hair='l', robe=True),
    '商人': dict(body='b', dark='B', trim='y', hat='cap', hair='H', pack=True),
    '錬金術師': dict(body='a', dark='A', trim='w', hat='goggles', hair='H', apron=True),
    '戦士': dict(body='r', dark='R', trim='l', hat='horns', hair='H', shield=True, pads=True),
    '吟遊詩人': dict(body='o', dark='b', trim='y', hat='feather', hair='H', lute=True),
    '旅人': dict(body='n', dark='N', trim='t', hat='straw', hair='H', roll=True),
    '騎士': dict(body='l', dark='g', trim='y', hat='helm', armor=True, pants='g'),
    '放浪者': dict(body='g', dark='d', trim='b', hat='hood', hood='d', ragged=True),
    '勇者': dict(body='u', dark='C', trim='w', hat='spiky', hair='e', cape=True),
}


def hero(job, pose, t):
    o = OUTFITS[job]
    a = Art(20)
    walk = pose == 'walk'
    bob = -1 if (walk and t % 2 == 1) else 0
    lean = 1 if pose == 'search' else 0
    x = 6 + lean
    y = bob
    body, dark, trim = o['body'], o['dark'], o['trim']
    hair = o.get('hair', 'H')
    pants = o.get('pants', 'B')

    # ---- 後ろにあるもの（マント・荷物・リュート）
    if o.get('cape'):
        a.R(x - 3, 10 + y, x, 18, 'r')
        a.R(x - 3, 10 + y, x - 3, 18, 'R')
        a.R(x - 2, 17, x, 18, 'R')
    if o.get('pack'):
        a.R(x - 4, 10 + y, x - 1, 16 + y, 'B')
        a.R(x - 4, 10 + y, x - 4, 16 + y, 'b')
        a.R(x - 3, 11 + y, x - 2, 11 + y, 'y')
    if o.get('lute'):
        a.R(x - 4, 12 + y, x - 2, 17 + y, 'b')
        a.R(x - 3, 14 + y, x - 3, 15 + y, 'B')
        a.R(x - 3, 8 + y, x - 3, 11 + y, 'B')
    if o.get('roll'):
        a.R(x - 3, 9 + y, x - 1, 15 + y, 't')
        a.R(x - 3, 11 + y, x - 1, 11 + y, 'B')
        a.R(x - 3, 14 + y, x - 1, 14 + y, 'B')

    # ---- 脚（ローブ・スカートのときは裾）
    if o.get('robe'):
        a.R(x - 1, 15 + y, x + 8, 19, body)
        a.R(x + 6, 16 + y, x + 8, 19, dark)
        a.R(x - 1, 19, x + 8, 19, dark)
        a.R(x + 2, 15 + y, x + 5, 19, 'u')
        if walk and t in (0, 2):
            a.R(x - 1 if t == 0 else x + 6, 19, x + 1 if t == 0 else x + 8, 19, 'B')
    else:
        if walk:
            lo, ro = {0: (-1, 1), 1: (0, 0), 2: (1, -1), 3: (0, 0)}[t]
        elif pose == 'search':
            lo, ro = -1, 1
        else:
            lo, ro = 0, 0
        top = 18 if o.get('skirt') else 16 + y
        for lx in (x + 1 + lo, x + 5 + ro):
            a.R(lx, top, lx + 1, 19, pants)
            a.R(lx, 18, lx + 2, 19, 'B')
        if o.get('skirt'):
            a.R(x - 1, 15 + y, x + 8, 17, body)
            a.R(x - 1, 17, x + 8, 17, trim)
            a.R(x + 6, 15 + y, x + 8, 17, dark)

    # ---- 胴
    a.R(x, 10 + y, x + 7, 14 + y, body)
    a.R(x + 6, 11 + y, x + 7, 14 + y, dark)
    a.R(x + 2, 10 + y, x + 5, 10 + y, trim)
    a.R(x, 15 + y, x + 7, 15 + y, trim)
    a.R(x + 3, 15 + y, x + 4, 15 + y, 'y' if trim != 'y' else 'Y')
    if o.get('apron'):
        a.R(x + 1, 11 + y, x + 5, 15 + y, 'w')
        a.R(x + 1, 11 + y, x + 1, 15 + y, 'l')
        a.P(x + 3, 13 + y, 'c')
    if o.get('armor'):
        a.R(x + 1, 11 + y, x + 6, 13 + y, 'w')
        a.R(x + 3, 11 + y, x + 4, 14 + y, trim)
    if o.get('pads'):
        a.R(x - 1, 10 + y, x, 11 + y, 'g')
        a.R(x + 7, 10 + y, x + 8, 11 + y, 'g')
    if o.get('ragged'):
        for dx in (1, 3, 6):
            a.P(x + dx, 14 + y, '.')
        a.R(x + 1, 12 + y, x + 2, 13 + y, 'b')
    if o.get('robe'):
        a.R(x + 3, 11 + y, x + 4, 14 + y, trim)

    # ---- 腕
    sleeve = o.get('sleeve', body)
    if walk:
        dl, dr = {0: (0, -1), 1: (0, 0), 2: (-1, 0), 3: (0, 0)}[t]
    else:
        dl = dr = 0
    if pose == 'cheer':
        for ax in (x - 2, x + 8):
            a.R(ax, 6 + y, ax + 1, 10 + y, sleeve)
            a.R(ax, 4 + y, ax + 1, 5 + y, 'S')
    else:
        a.R(x - 2, 11 + y + dl, x - 1, 14 + y + dl, sleeve)
        a.R(x - 2, 15 + y + dl, x - 1, 15 + y + dl, 'S')
        if pose == 'search':
            a.R(x + 8, 8 + y, x + 9, 12 + y, sleeve)
            a.R(x + 9, 6 + y, x + 10, 7 + y, 'S')
        else:
            a.R(x + 8, 11 + y + dr, x + 9, 14 + y + dr, sleeve)
            a.R(x + 8, 15 + y + dr, x + 9, 15 + y + dr, 'S')
    if o.get('shield'):
        a.D(x - 3, 13 + y + dl, 2.6, 'l')
        a.D(x - 3, 13 + y + dl, 1.2, 'r')

    # ---- 頭（顔）
    a.R(x, 3 + y, x + 7, 9 + y, 'S')
    a.R(x + 7, 4 + y, x + 7, 9 + y, 'T')  # 顔の影（右）
    for ex in (2, 3, 5, 6):
        a.P(x + ex, 6 + y, 'k')
    a.P(x + 1, 8 + y, 'm')
    a.P(x + 6, 8 + y, 'm')
    if pose == 'cheer':
        a.R(x + 3, 8 + y, x + 5, 8 + y, 'R')
    else:
        a.P(x + 4, 8 + y, 'R')

    # ---- 髪・帽子
    h = o['hat']
    if h in ('none', 'goggles', 'feather', 'cap', 'horns'):
        a.R(x, 2 + y, x + 7, 3 + y, hair)
        a.R(x, 4 + y, x, 6 + y, hair)
        a.R(x + 1, 4 + y, x + 3, 4 + y, hair)
    if h == 'flower':
        a.R(x, 2 + y, x + 7, 3 + y, hair)
        a.R(x - 1, 3 + y, x, 11 + y, hair)
        a.R(x + 1, 4 + y, x + 3, 4 + y, hair)
        a.R(x + 5, 1 + y, x + 6, 2 + y, 'r')
        a.P(x + 5, 1 + y, 'y')
        a.R(x - 2, 6 + y, x - 1, 7 + y, 'y')
    elif h == 'jester':
        a.R(x, 2 + y, x + 7, 3 + y, 'p')
        a.R(x, 4 + y, x, 4 + y, 'p')
        a.R(x - 1, 0 + y, x + 1, 1 + y, 'y')
        a.P(x - 2, 0 + y, 'y')
        a.R(x + 6, 0 + y, x + 8, 1 + y, 'p')
        a.P(x + 9, 0 + y, 'y')
        a.R(x, 3 + y, x + 7, 3 + y, 'y')
    elif h == 'hood':
        hd = o['hood']
        a.R(x - 1, 1 + y, x + 8, 2 + y, hd)
        a.R(x, 0 + y, x + 7, 0 + y, hd)
        a.R(x - 1, 3 + y, x, 9 + y, hd)
        a.R(x + 7, 3 + y, x + 8, 9 + y, hd)
        a.R(x + 1, 3 + y, x + 6, 3 + y, hd)
        if o.get('mask'):
            a.R(x + 1, 8 + y, x + 6, 9 + y, 'd')
    elif h == 'wizard':
        a.R(x, 3 + y, x + 7, 3 + y, hair)
        a.R(x - 2, 2 + y, x + 9, 2 + y, 'P')
        a.R(x + 1, 1 + y, x + 6, 1 + y, 'P')
        a.R(x + 2, 0 + y, x + 5, 0 + y, 'P')
        a.P(x + 3, 1 + y, 'y')
        a.P(x + 4, 0 + y, 'y')
        a.R(x, 4 + y, x, 6 + y, hair)
        a.R(x + 1, 8 + y, x + 6, 9 + y, hair)  # ひげ
    elif h == 'cap':
        a.R(x - 1, 2 + y, x + 7, 3 + y, 'Y')
        a.R(x + 1, 1 + y, x + 6, 1 + y, 'Y')
        a.R(x + 5, 3 + y, x + 9, 3 + y, 'y')
    elif h == 'goggles':
        a.R(x, 3 + y, x + 7, 3 + y, 'd')
        a.R(x + 1, 1 + y, x + 3, 2 + y, 'c')
        a.R(x + 4, 1 + y, x + 6, 2 + y, 'c')
        a.P(x + 1, 1 + y, 'w')
        a.P(x + 4, 1 + y, 'w')
    elif h == 'horns':
        a.R(x - 1, 1 + y, x + 8, 3 + y, 'l')
        a.R(x - 1, 3 + y, x - 1, 6 + y, 'l')
        a.R(x - 3, 0 + y, x - 2, 2 + y, 'w')
        a.R(x + 9, 0 + y, x + 10, 2 + y, 'w')
        a.R(x + 3, 4 + y, x + 4, 5 + y, 'g')
        a.R(x, 1 + y, x + 7, 1 + y, 'w')
    elif h == 'feather':
        a.R(x - 1, 1 + y, x + 8, 3 + y, 'R')
        a.R(x, 0 + y, x + 7, 0 + y, 'R')
        a.R(x + 5, 3 + y, x + 9, 3 + y, 'R')
        a.R(x + 8, 0 + y, x + 9, 2 + y, 'w')
        a.P(x + 9, 0 + y, 'l')
        a.P(x + 10, 1 + y, 'w')
    elif h == 'straw':
        a.R(x, 3 + y, x + 7, 3 + y, hair)
        a.R(x - 3, 2 + y, x + 10, 2 + y, 't')
        a.R(x + 1, 0 + y, x + 6, 1 + y, 't')
        a.R(x + 1, 1 + y, x + 6, 1 + y, 'B')
        a.R(x - 2, 3 + y, x - 1, 3 + y, 'T')
        a.R(x + 8, 3 + y, x + 9, 3 + y, 'T')
    elif h == 'helm':
        a.R(x - 1, 1 + y, x + 8, 9 + y, 'l')
        a.R(x - 1, 1 + y, x + 8, 1 + y, 'w')
        a.R(x + 2, 5 + y, x + 8, 5 + y, 'd')
        a.R(x + 2, 6 + y, x + 8, 6 + y, 'g')
        a.P(x + 5, 8 + y, 'd')
        a.P(x + 6, 8 + y, 'd')
        a.R(x + 7, 2 + y, x + 8, 9 + y, 'g')
        a.R(x + 1, 0 + y, x + 6, 0 + y, 'r')
        a.R(x - 1, 0 + y, x + 1, 1 + y, 'r')
    elif h == 'spiky':
        a.R(x, 2 + y, x + 7, 3 + y, hair)
        a.R(x, 4 + y, x, 6 + y, hair)
        for dx in (0, 2, 4, 6):
            a.P(x + dx, 1 + y, hair)
        a.P(x + 3, 0 + y, hair)
        a.P(x + 6, 0 + y, hair)
        a.R(x, 4 + y, x + 7, 4 + y, 'r')
        a.R(x - 2, 4 + y, x - 1, 6 + y, 'r')
    return a


HEROES = {}
for job in OUTFITS:
    HEROES[job] = {
        'walk': [hero(job, 'walk', t).rows() for t in range(4)],
        'search': [hero(job, 'search', t).rows() for t in range(2)],
        'idle': [hero(job, 'idle', 0).rows()],
        'cheer': [hero(job, 'cheer', 0).rows()],
    }

if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, 'src', 'data', 'actors.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'palette': PALETTE, 'containers': CONTAINERS, 'heroes': HEROES}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(len(CONTAINERS), 'containers,', len(HEROES), 'heroes ->', path)
