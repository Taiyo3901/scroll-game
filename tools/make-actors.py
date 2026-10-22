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
# 昔ながらの RPG（ドラクエやFFのような）の、頭が大きい2頭身の見た目。正面向きで、右手に持ち物、左手に盾を持つ。
# 頭 y=0〜9（帽子・髪が上）、胴 y=10〜14、脚 y=15〜19。体の中心は x=10（頭は x=5〜14）。

OX = 5  # 頭の左端

# 職業ごとの見た目。hair=髪の色、style=髪型、hat=かぶりもの、body/dark/trim=服の色、
# armor/robe/skirt=胴の形、back=背中のもの、hold=右手の持ち物、off=左手の盾
OUTFITS = {
    'default': dict(hair='H', style='short', body='t', dark='T', trim='b', pants='B'),
    '勇者': dict(hair='e', style='spiky', hat='circlet', body='u', dark='C', trim='y', pants='w', back='cape', hold='sword', off='shield', offc='u'),
    '戦士': dict(hair='b', style='short', hat='horned', body='r', dark='R', trim='y', pants='B', armor=True, hold='axe', off='shield', offc='r'),
    '騎士': dict(hair='H', style='short', hat='helm', body='l', dark='g', trim='y', pants='g', armor=True, hold='spear', off='shield', offc='w'),
    '賢者': dict(hair='w', style='short', hat='wizard', body='w', dark='l', trim='u', pants='l', robe=True, beard=True, hold='staff', orb='c'),
    '錬金術師': dict(hair='H', style='short', hat='goggles', body='a', dark='A', trim='w', pants='A', apron=True, hold='flask'),
    '斥候': dict(hair='H', style='short', hat='hood', hood='N', body='N', dark='A', trim='B', pants='A', mask=True, hold='dagger', back='cloak'),
    '踊り子': dict(hair='m', style='long', hat='flower', body='m', dark='M', trim='y', pants='M', skirt=True, hold='fan'),
    '遊び人': dict(hair='H', style='short', hat='jester', body='p', dark='P', trim='y', pants='P', hold='wand'),
    '商人': dict(hair='H', style='short', hat='turban', body='o', dark='b', trim='y', pants='B', back='pack', hold='bag'),
    '吟遊詩人': dict(hair='e', style='short', hat='feather', body='o', dark='b', trim='w', pants='B', hold='lute'),
    '旅人': dict(hair='H', style='short', hat='straw', body='n', dark='N', trim='t', pants='B', scarf='r', hold='stick', back='roll'),
    '放浪者': dict(hair='d', style='short', hat='hood', hood='d', body='g', dark='d', trim='b', pants='d', ragged=True, hold='stick', back='cloak'),
}


def _held(a, kind, hx, hy, o):
    """右手の持ち物。hx は持つ手の x、hy は握りの y（上へ伸びる）"""
    if kind == 'sword':
        a.R(hx, hy - 9, hx, hy - 2, 'l')
        a.P(hx, hy - 10, 'w')
        a.R(hx + 1, hy - 8, hx + 1, hy - 3, 'g')
        a.R(hx - 1, hy - 1, hx + 1, hy - 1, 'Y')
        a.P(hx, hy, 'B')
    elif kind == 'axe':
        a.R(hx, hy - 9, hx, hy, 'B')
        a.R(hx + 1, hy - 9, hx + 2, hy - 5, 'l')
        a.R(hx + 3, hy - 8, hx + 3, hy - 6, 'w')
        a.R(hx - 1, hy - 9, hx - 1, hy - 6, 'g')
    elif kind == 'spear':
        a.R(hx, hy - 11, hx, hy + 1, 'B')
        a.R(hx, hy - 14, hx, hy - 12, 'l')
        a.P(hx, hy - 15, 'w')
        a.R(hx - 1, hy - 12, hx + 1, hy - 12, 'r')
    elif kind == 'staff':
        a.R(hx, hy - 10, hx, hy + 1, 'B')
        a.R(hx - 1, hy - 13, hx + 1, hy - 11, o.get('orb', 'c'))
        a.P(hx - 1, hy - 13, 'q')
        a.R(hx - 1, hy - 10, hx + 1, hy - 10, 'Y')
    elif kind == 'flask':
        a.R(hx - 1, hy - 4, hx + 1, hy - 1, 'n')
        a.P(hx - 1, hy - 4, 'w')
        a.R(hx, hy - 6, hx, hy - 5, 'w')
        a.P(hx, hy - 7, 'B')
    elif kind == 'dagger':
        a.R(hx, hy - 6, hx, hy - 2, 'l')
        a.P(hx, hy - 7, 'w')
        a.R(hx - 1, hy - 1, hx + 1, hy - 1, 'Y')
        a.P(hx, hy, 'B')
    elif kind == 'fan':
        a.D(hx + 1, hy - 3, 2.4, 'm')
        a.D(hx + 1, hy - 3, 1.0, 'y')
        a.R(hx, hy - 1, hx, hy, 'B')
    elif kind == 'wand':
        a.R(hx, hy - 6, hx, hy, 'B')
        a.R(hx - 1, hy - 9, hx + 1, hy - 7, 'y')
        a.P(hx, hy - 10, 'y')
        a.P(hx - 2, hy - 8, 'y')
        a.P(hx + 2, hy - 8, 'y')
    elif kind == 'bag':
        a.R(hx - 1, hy - 4, hx + 1, hy - 1, 'b')
        a.R(hx - 1, hy - 5, hx + 1, hy - 5, 'B')
        a.P(hx, hy - 3, 'y')
    elif kind == 'stick':
        a.R(hx, hy - 10, hx, hy + 1, 'B')
        a.P(hx, hy - 11, 'b')
    elif kind == 'lute':
        a.D(hx - 3, hy - 1, 2.6, 'b')
        a.D(hx - 3, hy - 1, 1.0, 'B')
        a.L(hx - 2, hy - 3, hx + 2, hy - 9, 'B')
        a.R(hx + 2, hy - 10, hx + 3, hy - 9, 'y')


def hero(job, pose, t):
    o = OUTFITS[job]
    a = Art(20)
    walk = pose == 'walk'
    # 歩くと、足をついた瞬間(0,2)に、体が1つ沈む。物色中は、かがむ
    u = 1 if ((walk and t % 2 == 0) or pose == 'search') else 0
    x = OX
    body, dark, trim = o['body'], o['dark'], o['trim']
    hair = o['hair']
    pants = o['pants']
    cheer = pose == 'cheer'

    # ---- 背中のもの
    back = o.get('back')
    if back == 'cape':
        a.R(x - 1, 10 + u, x + 10, 18, 'r')
        a.R(x - 1, 10 + u, x - 1, 18, 'R')
        a.R(x - 1, 18, x + 10, 18, 'R')
    elif back == 'cloak':
        c = o.get('hood', 'N')
        a.R(x - 1, 10 + u, x + 10, 17, c)
    elif back == 'pack':
        a.R(x - 4, 9 + u, x, 16 + u, 'b')
        a.R(x - 4, 9 + u, x - 4, 16 + u, 'B')
        a.R(x - 4, 9 + u, x, 9 + u, 'B')
        a.R(x - 3, 11 + u, x - 1, 12 + u, 'y')
    elif back == 'roll':
        a.R(x - 3, 8 + u, x - 1, 14 + u, 't')
        a.R(x - 3, 10 + u, x - 1, 10 + u, 'B')
        a.R(x - 3, 13 + u, x - 1, 13 + u, 'B')

    # ---- 脚（ローブ・スカートのときは裾）。歩くときは、片足を交互に上げる
    lift_l, lift_r = (0, 0)
    if walk:
        lift_l, lift_r = {0: (0, 1), 1: (0, 0), 2: (1, 0), 3: (0, 0)}[t]
    if o.get('robe'):
        a.R(x, 15 + u, x + 9, 19, body)
        a.R(x + 8, 16 + u, x + 9, 19, dark)
        a.R(x, 19, x + 9, 19, dark)
        a.R(x + 4, 15 + u, x + 5, 19, trim)
        if walk and t in (0, 2):
            a.R(x + (1 if t == 0 else 6), 19, x + (3 if t == 0 else 8), 19, 'B')
    else:
        for lx, lift in ((x + 1, lift_l), (x + 6, lift_r)):
            bottom = 19 - lift
            a.R(lx, 15 + u, lx + 2, bottom, pants)
            a.R(lx, bottom - 1, lx + 2, bottom, 'B')
        if o.get('skirt'):
            a.R(x - 1, 14 + u, x + 10, 17, body)
            a.R(x - 1, 17, x + 10, 17, trim)
            a.R(x + 8, 14 + u, x + 10, 17, dark)
            for sx in (x + 1, x + 4, x + 7):
                a.P(sx, 16, trim)

    # ---- 胴
    a.R(x + 1, 10 + u, x + 8, 14 + u, body)
    a.R(x + 7, 11 + u, x + 8, 14 + u, dark)
    a.R(x + 3, 10 + u, x + 6, 10 + u, trim)
    a.R(x + 1, 14 + u, x + 8, 14 + u, trim)
    a.R(x + 4, 14 + u, x + 5, 14 + u, 'y')
    if o.get('apron'):
        a.R(x + 2, 11 + u, x + 6, 14 + u, 'w')
        a.R(x + 2, 11 + u, x + 2, 14 + u, 'l')
        a.P(x + 4, 12 + u, 'c')
    if o.get('armor'):
        a.R(x + 1, 11 + u, x + 8, 13 + u, 'l')
        a.R(x + 7, 11 + u, x + 8, 13 + u, 'g')
        a.R(x + 4, 11 + u, x + 5, 13 + u, body if body != 'l' else 'y')
        a.R(x + 1, 11 + u, x + 8, 11 + u, 'w')
    if o.get('ragged'):
        for dx in (1, 4, 7):
            a.P(x + dx, 14 + u, '.')
        a.R(x + 2, 12 + u, x + 3, 13 + u, 'b')
    if o.get('scarf'):
        a.R(x + 1, 10 + u, x + 8, 10 + u, o['scarf'])
        a.R(x + 7, 11 + u, x + 8, 13 + u, o['scarf'])

    # ---- 腕
    sleeve = 'l' if o.get('armor') else body
    if cheer:
        for ax in (x - 1, x + 9):
            a.R(ax, 6 + u, ax + 1, 11 + u, sleeve)
            a.R(ax, 5 + u, ax + 1, 5 + u, 'S')
    else:
        swing_l = swing_r = 0
        if walk:
            swing_l, swing_r = {0: (0, -1), 1: (0, 0), 2: (-1, 0), 3: (0, 0)}[t]
        a.R(x - 1, 11 + u + swing_l, x, 14 + u + swing_l, sleeve)
        a.R(x - 1, 15 + u + swing_l, x, 15 + u + swing_l, 'S')
        if pose == 'search':
            a.R(x + 9, 7 + u, x + 10, 11 + u, sleeve)
            a.R(x + 10, 5 + u, x + 11, 6 + u, 'S')
        else:
            a.R(x + 9, 11 + u + swing_r, x + 10, 14 + u + swing_r, sleeve)
            a.R(x + 9, 15 + u + swing_r, x + 10, 15 + u + swing_r, 'S')
    if o.get('armor'):
        a.R(x - 1, 10 + u, x, 11 + u, 'g')
        a.R(x + 9, 10 + u, x + 10, 11 + u, 'g')

    # ---- 持ち物
    if o.get('off') == 'shield' and not cheer:
        sc = o.get('offc', 'u')
        a.R(x - 4, 11 + u, x - 1, 16 + u, sc)
        a.R(x - 3, 17 + u, x - 2, 17 + u, sc)
        a.R(x - 4, 11 + u, x - 4, 16 + u, 'l')
        a.R(x - 4, 11 + u, x - 1, 11 + u, 'l')
        a.R(x - 3, 13 + u, x - 2, 14 + u, 'y')
    hold = o.get('hold')
    if hold and pose != 'search':
        _held(a, hold, x + 11, 6 if cheer else 15 + u, o)

    # ---- 頭（顔）。顔全体は描かない: 髪や帽子の影に隠れて、小さな目だけが見える（口や鼻、ほおは描かない）
    a.R(x + 1, 3 + u, x + 8, 9 + u, 'T')
    a.R(x, 5 + u, x, 8 + u, 'T')
    a.R(x + 9, 5 + u, x + 9, 8 + u, 'T')
    a.R(x + 1, 6 + u, x + 8, 9 + u, 'S')  # 目より下だけが、明るい肌
    a.R(x + 1, 6 + u, x + 8, 6 + u, 'T')
    for ex in (2, 6):
        a.R(x + ex, 6 + u, x + ex + 1, 6 + u, 'k')
        a.P(x + ex + 1, 6 + u, 'w') if pose == 'cheer' else None
    # 口もとは、襟（えり）で隠す
    a.R(x + 1, 8 + u, x + 8, 9 + u, body)
    a.R(x + 1, 8 + u, x + 8, 8 + u, dark)

    # ---- 髪
    h = o.get('hat')
    st = o['style']
    if h not in ('helm', 'hood', 'turban', 'wizard', 'jester', 'straw', 'horned'):
        a.R(x + 1, 1 + u, x + 8, 2 + u, hair)
        a.R(x, 2 + u, x + 9, 4 + u, hair)
        a.R(x, 5 + u, x, 6 + u, hair)
        a.R(x + 9, 5 + u, x + 9, 6 + u, hair)
        if st == 'spiky':
            for sx in (1, 3, 4, 5, 6, 8):
                a.P(x + sx, 0 + u, hair)
        if st == 'long':
            a.R(x - 1, 3 + u, x, 12 + u, hair)
            a.R(x + 9, 3 + u, x + 10, 12 + u, hair)
            a.R(x - 1, 12 + u, x, 12 + u, 'M')
        if hair in ('e', 'w'):
            a.R(x + 7, 2 + u, x + 8, 2 + u, 'q')
    if o.get('beard'):
        a.R(x + 2, 8 + u, x + 7, 10 + u, 'w')
        a.R(x + 4, 8 + u, x + 5, 8 + u, 'R')
        a.R(x + 3, 11 + u, x + 6, 12 + u, 'w')

    # ---- 帽子・かぶりもの
    if h == 'circlet':
        a.R(x, 3 + u, x + 9, 3 + u, 'y')
        a.R(x + 4, 2 + u, x + 5, 2 + u, 'c')
    elif h == 'flower':
        a.R(x + 6, 0 + u, x + 8, 2 + u, 'r')
        a.P(x + 7, 1 + u, 'y')
        a.R(x - 1, 4 + u, x, 5 + u, 'y')
    elif h == 'goggles':
        a.R(x, 3 + u, x + 9, 3 + u, 'd')
        a.R(x + 1, 1 + u, x + 3, 2 + u, 'c')
        a.R(x + 6, 1 + u, x + 8, 2 + u, 'c')
        a.P(x + 1, 1 + u, 'w')
        a.P(x + 6, 1 + u, 'w')
    elif h == 'hood':
        hd = o['hood']
        a.R(x, 1 + u, x + 9, 3 + u, hd)
        a.R(x + 1, 0 + u, x + 8, 0 + u, hd)
        a.R(x - 1, 3 + u, x, 9 + u, hd)
        a.R(x + 9, 3 + u, x + 10, 9 + u, hd)
        a.R(x + 1, 4 + u, x + 8, 4 + u, hd)
        if o.get('mask'):
            a.R(x + 1, 8 + u, x + 8, 9 + u, 'd')
    elif h == 'wizard':
        a.R(x - 2, 2 + u, x + 11, 3 + u, 'P')
        a.R(x + 1, 1 + u, x + 8, 1 + u, 'P')
        a.R(x + 3, 0 + u, x + 7, 0 + u, 'P')
        a.R(x + 1, 3 + u, x + 8, 3 + u, 'p')
        a.P(x + 5, 1 + u, 'y')
        a.R(x, 4 + u, x, 7 + u, hair)
        a.R(x + 9, 4 + u, x + 9, 7 + u, hair)
    elif h == 'turban':
        a.R(x, 1 + u, x + 9, 4 + u, 'w')
        a.R(x + 1, 0 + u, x + 8, 0 + u, 'w')
        a.R(x, 4 + u, x + 9, 4 + u, 'l')
        a.R(x + 4, 1 + u, x + 5, 2 + u, 'r')
        a.P(x + 4, 1 + u, 'y')
    elif h == 'feather':
        a.R(x - 1, 3 + u, x + 10, 3 + u, 'R')
        a.R(x + 1, 1 + u, x + 8, 2 + u, 'R')
        a.R(x + 7, 0 + u, x + 10, 0 + u, 'w')
        a.R(x + 8, 1 + u, x + 10, 1 + u, 'l')
        a.R(x + 6, 2 + u, x + 7, 2 + u, 'y')
    elif h == 'straw':
        a.R(x - 3, 3 + u, x + 12, 3 + u, 't')
        a.R(x - 2, 4 + u, x - 1, 4 + u, 'T')
        a.R(x + 10, 4 + u, x + 11, 4 + u, 'T')
        a.R(x + 1, 0 + u, x + 8, 2 + u, 't')
        a.R(x + 1, 2 + u, x + 8, 2 + u, 'r')
    elif h == 'horned':
        a.R(x, 1 + u, x + 9, 3 + u, 'l')
        a.R(x + 1, 0 + u, x + 8, 0 + u, 'l')
        a.R(x + 1, 3 + u, x + 8, 3 + u, 'g')
        a.R(x - 2, 0 + u, x - 1, 3 + u, 'w')
        a.P(x - 2, 0 + u, 'l')
        a.R(x + 10, 0 + u, x + 11, 3 + u, 'w')
        a.P(x + 11, 0 + u, 'l')
        a.R(x, 4 + u, x, 6 + u, 'g')
        a.R(x + 9, 4 + u, x + 9, 6 + u, 'g')
    elif h == 'helm':
        a.R(x, 1 + u, x + 9, 5 + u, 'l')
        a.R(x + 1, 0 + u, x + 8, 0 + u, 'w')
        a.R(x, 1 + u, x + 9, 1 + u, 'w')
        a.R(x + 8, 2 + u, x + 9, 6 + u, 'g')
        a.R(x + 1, 5 + u, x + 8, 5 + u, 'd')
        a.R(x + 4, 0 + u, x + 5, 1 + u, 'r')
        a.R(x, 6 + u, x, 8 + u, 'g')
        a.R(x + 9, 7 + u, x + 9, 8 + u, 'g')
    elif h == 'jester':
        a.R(x, 2 + u, x + 9, 3 + u, 'p')
        a.R(x + 5, 2 + u, x + 9, 3 + u, 'y')
        a.R(x - 2, 0 + u, x + 1, 1 + u, 'p')
        a.R(x - 3, 1 + u, x - 3, 2 + u, 'p')
        a.P(x - 3, 3 + u, 'y')
        a.R(x + 8, 0 + u, x + 11, 1 + u, 'y')
        a.P(x + 11, 2 + u, 'y')
        a.R(x + 2, 1 + u, x + 7, 1 + u, 'p')
        a.R(x, 4 + u, x, 5 + u, hair)
        a.R(x + 9, 4 + u, x + 9, 5 + u, hair)
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
