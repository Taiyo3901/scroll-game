"""
帯の中で動く絵（入れ物と、職業別の探索者）を作る。
`python tools/make-actors.py` で src/data/actors.json を作り直す。共通の部品は art.py。

- 入れ物: 壺(階層ごと) / 宝箱(階層ごと) / ミミック(階層ごと) / 箱(部屋ごと)。ふたの開き方を3コマ（ミミックは2コマ）で描く。
- 探索者: 職業ごとの見た目（34x34のマス。入れ物の14x14より細かい）。歩く(4コマ)・物色(2コマ)・立ち(1コマ)・喜ぶ(1コマ)。
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
# 32x32 のマスに描き、縁取りを付けて 34x34。入れ物（14x14）より、ずっとドットが細かい。
# 昔ながらの RPG（ドラクエやFFのような）の、頭が大きい2頭身の見た目。正面向きで、右手に持ち物、左手に盾を持つ。
# 顔は全体を描かず、髪や帽子の影に隠れた目だけを描く。
# 頭 y=3〜15（帽子・髪が上）、胴 y=16〜23、脚 y=24〜31。体の中心は x=16（頭は x=9〜22）。

OX = 8  # 頭の左端（頭の幅は16）

# 髪の色ごとの (明るい色, 暗い色)
HAIR_SHADE = {
    'H': ('b', 'B'),
    'e': ('q', 'Y'),
    'w': ('w', 'g'),
    'm': ('w', 'M'),
    'd': ('g', 'k'),
    'b': ('o', 'B'),
}

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


def _shade(a, x0, y0, x1, y1, c, d=None, l=None):
    """面を塗り、右と下に影、上と左に光を入れる"""
    a.R(x0, y0, x1, y1, c)
    if d:
        a.R(x1, y0 + 1, x1, y1, d)
        a.R(x0 + 1, y1, x1, y1, d)
    if l:
        a.R(x0, y0, x1 - 1, y0, l)
        a.R(x0, y0 + 1, x0, y1 - 1, l)


def _held(a, kind, hx, hy, o):
    """右手の持ち物。hx は持つ手の x、hy は握りの y（上へ伸びる）"""
    if kind == 'sword':
        a.R(hx, hy - 15, hx + 1, hy - 4, 'l')
        a.R(hx + 1, hy - 14, hx + 1, hy - 4, 'g')
        a.R(hx, hy - 15, hx, hy - 5, 'w')
        a.R(hx, hy - 17, hx + 1, hy - 16, 'w')
        a.P(hx, hy - 18, 'w')
        a.R(hx - 2, hy - 3, hx + 3, hy - 3, 'Y')
        a.R(hx - 2, hy - 3, hx - 2, hy - 2, 'y')
        a.R(hx + 3, hy - 3, hx + 3, hy - 2, 'y')
        a.R(hx, hy - 2, hx + 1, hy, 'B')
        a.P(hx, hy + 1, 'y')
    elif kind == 'axe':
        a.R(hx, hy - 14, hx + 1, hy + 1, 'B')
        a.R(hx + 1, hy - 14, hx + 1, hy + 1, 'b')
        a.R(hx + 2, hy - 15, hx + 5, hy - 8, 'l')
        a.R(hx + 5, hy - 14, hx + 6, hy - 9, 'w')
        a.R(hx + 2, hy - 9, hx + 4, hy - 8, 'g')
        a.R(hx - 2, hy - 14, hx - 1, hy - 10, 'g')
        a.R(hx - 3, hy - 13, hx - 3, hy - 11, 'l')
        a.R(hx, hy - 4, hx + 1, hy - 3, 'd')
    elif kind == 'spear':
        a.R(hx, hy - 18, hx + 1, hy + 2, 'B')
        a.R(hx + 1, hy - 18, hx + 1, hy + 2, 'b')
        a.R(hx, hy - 23, hx + 1, hy - 19, 'l')
        a.R(hx, hy - 23, hx, hy - 20, 'w')
        a.P(hx, hy - 24, 'w')
        a.R(hx - 2, hy - 18, hx + 3, hy - 17, 'r')
        a.R(hx - 2, hy - 16, hx + 3, hy - 16, 'R')
    elif kind == 'staff':
        a.R(hx, hy - 16, hx + 1, hy + 2, 'B')
        a.R(hx + 1, hy - 16, hx + 1, hy + 2, 'b')
        orb = o.get('orb', 'c')
        a.D(hx + 0.5, hy - 20, 3.2, orb)
        a.D(hx + 0.5, hy - 20, 1.4, 'w')
        a.R(hx - 2, hy - 16, hx + 3, hy - 16, 'Y')
        a.R(hx - 3, hy - 21, hx - 3, hy - 19, 'Y')
        a.R(hx + 4, hy - 21, hx + 4, hy - 19, 'Y')
    elif kind == 'flask':
        a.R(hx - 2, hy - 7, hx + 3, hy - 1, 'n')
        a.R(hx - 1, hy - 8, hx + 2, hy - 8, 'n')
        a.R(hx - 2, hy - 3, hx + 3, hy - 1, 'N')
        a.R(hx - 1, hy - 7, hx - 1, hy - 5, 'w')
        a.R(hx, hy - 11, hx + 1, hy - 9, 'l')
        a.R(hx - 1, hy - 12, hx + 2, hy - 12, 'b')
        a.P(hx + 1, hy - 14, 'q')
        a.P(hx, hy - 13, 'q')
    elif kind == 'dagger':
        a.R(hx, hy - 10, hx + 1, hy - 4, 'l')
        a.R(hx, hy - 10, hx, hy - 5, 'w')
        a.R(hx, hy - 12, hx + 1, hy - 11, 'w')
        a.R(hx - 2, hy - 3, hx + 3, hy - 3, 'Y')
        a.R(hx, hy - 2, hx + 1, hy, 'B')
    elif kind == 'fan':
        a.D(hx + 1.5, hy - 6, 5, 'm')
        a.D(hx + 1.5, hy - 6, 3, 'w')
        a.D(hx + 1.5, hy - 6, 1.2, 'y')
        a.R(hx + 1, hy - 2, hx + 2, hy + 1, 'B')
        a.R(hx - 3, hy - 6, hx + 6, hy - 6, 'M')
    elif kind == 'wand':
        a.R(hx, hy - 12, hx + 1, hy + 1, 'B')
        a.R(hx - 2, hy - 17, hx + 3, hy - 13, 'y')
        a.R(hx - 1, hy - 18, hx + 2, hy - 18, 'y')
        a.R(hx - 3, hy - 16, hx + 4, hy - 15, 'y')
        a.R(hx, hy - 20, hx + 1, hy - 19, 'q')
        a.R(hx - 1, hy - 16, hx, hy - 15, 'q')
    elif kind == 'bag':
        a.E(hx + 0.5, hy - 4, 3.6, 3.4, 'b')
        a.R(hx - 2, hy - 8, hx + 3, hy - 7, 'B')
        a.R(hx - 1, hy - 9, hx + 2, hy - 9, 'T')
        a.R(hx, hy - 5, hx + 1, hy - 3, 'y')
        a.R(hx + 2, hy - 6, hx + 3, hy - 3, 'B')
    elif kind == 'stick':
        a.R(hx, hy - 17, hx + 1, hy + 2, 'B')
        a.R(hx + 1, hy - 17, hx + 1, hy + 2, 'b')
        a.R(hx - 1, hy - 19, hx + 2, hy - 18, 'b')
        a.R(hx - 1, hy - 16, hx + 2, hy - 15, 'T')
    elif kind == 'lute':
        a.D(hx - 4, hy - 2, 5, 'b')
        a.D(hx - 4, hy - 2, 2, 'B')
        a.D(hx - 5, hy - 4, 1, 'T')
        a.L(hx - 2, hy - 6, hx + 5, hy - 16, 'B', 2)
        a.R(hx + 4, hy - 19, hx + 6, hy - 16, 'y')
        a.P(hx + 7, hy - 18, 'Y')
        a.R(hx - 6, hy - 2, hx - 2, hy - 2, 'Y')


def hero(job, pose, t):
    o = OUTFITS[job]
    a = Art(32)
    walk = pose == 'walk'
    # 歩くと、足をついた瞬間(0,2)に、体が1つ沈む。物色中は、かがむ
    u = 2 if pose == 'search' else (1 if (walk and t % 2 == 0) else 0)
    x = OX
    body, dark, trim = o['body'], o['dark'], o['trim']
    hair = o['hair']
    hl, hd = HAIR_SHADE.get(hair, ('w', 'k'))
    pants = o['pants']
    cheer = pose == 'cheer'

    # ---- 背中のもの
    back = o.get('back')
    if back == 'cape':
        a.R(x - 2, 17 + u, x + 17, 30, 'r')
        a.R(x - 2, 17 + u, x - 1, 30, 'R')
        a.R(x + 16, 17 + u, x + 17, 30, 'R')
        a.R(x - 2, 29, x + 17, 30, 'R')
        for fx in (x + 2, x + 6, x + 10, x + 13):
            a.R(fx, 22, fx, 29, 'R')
    elif back == 'cloak':
        c = o.get('hood', 'N')
        a.R(x - 1, 17 + u, x + 16, 29, c)
        a.R(x - 1, 27, x + 16, 29, 'k')
        for fx in (x + 1, x + 5, x + 10, x + 14):
            a.R(fx, 24, fx, 29, 'k')
    elif back == 'pack':
        _shade(a, x - 7, 15 + u, x + 1, 27 + u, 'b', 'B', 't')
        a.R(x - 7, 15 + u, x + 1, 17 + u, 'B')
        a.R(x - 6, 20 + u, x - 1, 22 + u, 'y')
        a.R(x - 5, 21 + u, x - 2, 21 + u, 'Y')
        a.R(x - 7, 24 + u, x + 1, 24 + u, 'B')
        a.R(x - 8, 18 + u, x - 8, 25 + u, 'g')
    elif back == 'roll':
        _shade(a, x - 5, 13 + u, x - 1, 23 + u, 't', 'T', 'w')
        a.R(x - 5, 16 + u, x - 1, 16 + u, 'B')
        a.R(x - 5, 21 + u, x - 1, 21 + u, 'B')
        a.R(x - 4, 12 + u, x - 2, 12 + u, 'T')

    # ---- 脚（ローブ・スカートのときは裾）。歩くときは、片足を交互に上げる
    lift_l, lift_r = (0, 0)
    if walk:
        lift_l, lift_r = {0: (0, 2), 1: (0, 0), 2: (2, 0), 3: (0, 0)}[t]
    if o.get('robe'):
        _shade(a, x + 1, 23 + u, x + 14, 31, body, dark, None)
        a.R(x + 1, 30, x + 14, 31, dark)
        a.R(x + 7, 23 + u, x + 8, 31, trim)
        a.R(x + 6, 29, x + 9, 29, 'y')
        for fx in (x + 3, x + 11):
            a.R(fx, 26, fx, 30, dark)
        if walk and t in (0, 2):
            a.R(x + (3 if t == 0 else 10), 31, x + (6 if t == 0 else 13), 31, 'B')
    else:
        for lx, lift in ((x + 3, lift_l), (x + 9, lift_r)):
            bottom = 31 - lift
            a.R(lx, 24 + u, lx + 3, bottom, pants)
            a.R(lx + 3, 24 + u, lx + 3, bottom, dark if pants != dark else 'k')
            a.R(lx, bottom - 3, lx + 3, bottom, 'B')
            a.R(lx, bottom - 3, lx + 3, bottom - 3, 'b')
            a.R(lx, bottom, lx + 3, bottom, 'k')
        if o.get('skirt'):
            a.R(x - 1, 22 + u, x + 16, 28, body)
            a.R(x - 1, 27, x + 16, 28, trim)
            a.R(x + 13, 23 + u, x + 16, 28, dark)
            for sx in (x + 1, x + 4, x + 7, x + 10, x + 13):
                a.R(sx, 24, sx, 26, dark)
                a.P(sx, 28, 'w')

    # ---- 胴
    _shade(a, x + 2, 16 + u, x + 13, 23 + u, body, dark, None)
    a.R(x + 2, 16 + u, x + 13, 16 + u, trim)
    a.R(x + 6, 17 + u, x + 9, 17 + u, trim)
    a.R(x + 2, 22 + u, x + 13, 23 + u, 'B')
    a.R(x + 2, 22 + u, x + 13, 22 + u, 'b')
    a.R(x + 7, 22 + u, x + 8, 23 + u, 'y')
    a.R(x + 3, 18 + u, x + 3, 21 + u, dark)
    if o.get('apron'):
        a.R(x + 4, 17 + u, x + 11, 23 + u, 'w')
        a.R(x + 4, 17 + u, x + 4, 23 + u, 'l')
        a.R(x + 11, 18 + u, x + 11, 23 + u, 'l')
        a.R(x + 6, 19 + u, x + 9, 20 + u, 'c')
        a.R(x + 7, 19 + u, x + 8, 19 + u, 'w')
        a.R(x + 7, 22 + u, x + 8, 22 + u, 'y')
    if o.get('armor'):
        a.R(x + 2, 17 + u, x + 13, 21 + u, 'l')
        a.R(x + 12, 17 + u, x + 13, 21 + u, 'g')
        a.R(x + 2, 17 + u, x + 13, 17 + u, 'w')
        a.R(x + 6, 18 + u, x + 9, 21 + u, body if body != 'l' else 'y')
        a.R(x + 7, 18 + u, x + 8, 20 + u, 'y')
        a.R(x + 3, 19 + u, x + 5, 19 + u, 'g')
        a.R(x + 10, 19 + u, x + 12, 19 + u, 'g')
        a.R(x + 3, 24 + u, x + 12, 25 + u, 'g')
        a.R(x + 3, 24 + u, x + 12, 24 + u, 'l')
    if o.get('ragged'):
        for dx in (3, 6, 9, 12):
            a.R(x + dx, 23 + u, x + dx, 23 + u, '.')
        a.R(x + 4, 19 + u, x + 6, 21 + u, 'b')
        a.R(x + 10, 18 + u, x + 11, 20 + u, 'g')
    if o.get('scarf'):
        a.R(x + 2, 16 + u, x + 13, 17 + u, o['scarf'])
        a.R(x + 11, 18 + u, x + 13, 22 + u, o['scarf'])
        a.R(x + 11, 22 + u, x + 13, 22 + u, 'R')

    # ---- 腕
    sleeve = 'l' if o.get('armor') else body
    if cheer:
        for ax in (x, x + 14):
            a.R(ax, 9 + u, ax + 1, 17 + u, sleeve)
            a.R(ax + 1, 9 + u, ax + 1, 17 + u, dark)
            a.R(ax, 7 + u, ax + 1, 8 + u, 'S')
    else:
        swing_l = swing_r = 0
        if walk:
            swing_l, swing_r = {0: (0, -2), 1: (0, 0), 2: (-2, 0), 3: (0, 0)}[t]
        a.R(x, 17 + u + swing_l, x + 1, 22 + u + swing_l, sleeve)
        a.R(x, 21 + u + swing_l, x + 1, 21 + u + swing_l, trim)
        a.R(x, 23 + u + swing_l, x + 1, 24 + u + swing_l, 'S')
        if pose == 'search':
            a.R(x + 14, 11 + u, x + 15, 17 + u, sleeve)
            a.R(x + 15, 11 + u, x + 15, 17 + u, dark)
            a.R(x + 15, 8 + u, x + 17, 10 + u, 'S')
        else:
            a.R(x + 14, 17 + u + swing_r, x + 15, 22 + u + swing_r, sleeve)
            a.R(x + 15, 17 + u + swing_r, x + 15, 22 + u + swing_r, dark)
            a.R(x + 14, 21 + u + swing_r, x + 15, 21 + u + swing_r, trim)
            a.R(x + 14, 23 + u + swing_r, x + 15, 24 + u + swing_r, 'S')
    if o.get('armor'):
        a.R(x - 1, 15 + u, x + 3, 18 + u, 'g')
        a.R(x - 1, 15 + u, x + 3, 15 + u, 'l')
        a.R(x + 12, 15 + u, x + 16, 18 + u, 'g')
        a.R(x + 12, 15 + u, x + 16, 15 + u, 'l')

    # ---- 持ち物
    if o.get('off') == 'shield' and not cheer:
        sc = o.get('offc', 'u')
        a.R(x - 7, 17 + u, x - 1, 25 + u, sc)
        a.R(x - 6, 26 + u, x - 2, 27 + u, sc)
        a.R(x - 5, 28 + u, x - 3, 28 + u, sc)
        a.R(x - 7, 17 + u, x - 7, 25 + u, 'l')
        a.R(x - 7, 17 + u, x - 1, 17 + u, 'l')
        a.R(x - 2, 18 + u, x - 1, 26 + u, 'k') if False else None
        a.R(x - 5, 20 + u, x - 3, 24 + u, 'y')
        a.R(x - 4, 21 + u, x - 4, 23 + u, sc)
    hold = o.get('hold')
    if hold and pose != 'search':
        _held(a, hold, x + 16, 13 if cheer else 23 + u, o)

    # ---- 頭。顔全体は描かない: 髪や帽子の影と、襟で隠して、小さな目だけが見える
    rows = ((3, 4, 11), (4, 2, 13), (5, 1, 14), (6, 1, 14), (7, 1, 14), (8, 1, 14), (9, 1, 14), (10, 1, 14),
            (11, 1, 14), (12, 1, 14), (13, 1, 14), (14, 2, 13), (15, 4, 11))
    for ry, rx0, rx1 in rows:
        a.R(x + rx0, ry + u, x + rx1, ry + u, 'S')
    a.R(x + 13, 6 + u, x + 14, 14 + u, 'T')
    a.R(x + 1, 8 + u, x + 14, 10 + u, 'T')  # 前髪の影
    for ex in (4, 10):
        a.R(x + ex, 10 + u, x + ex + 1, 12 + u, 'k')
        a.P(x + ex, 10 + u, 'w')
    a.R(x + 2, 13 + u, x + 13, 15 + u, body)  # 口もとは、襟で隠す
    a.R(x + 2, 13 + u, x + 13, 13 + u, dark)
    a.R(x + 4, 15 + u, x + 11, 15 + u, trim)

    # ---- 髪
    h = o.get('hat')
    st = o['style']
    if h not in ('helm', 'hood', 'turban', 'wizard', 'jester', 'straw', 'horned'):
        for ry, rx0, rx1 in rows[:6]:
            a.R(x + rx0, ry + u, x + rx1, ry + u, hair)
        a.R(x + 1, 9 + u, x + 2, 12 + u, hair)
        a.R(x + 13, 9 + u, x + 14, 12 + u, hair)
        a.R(x + 3, 9 + u, x + 5, 9 + u, hair)
        a.R(x + 10, 9 + u, x + 12, 9 + u, hair)
        a.R(x + 6, 8 + u, x + 9, 8 + u, hair)
        a.R(x + 4, 4 + u, x + 8, 4 + u, hl)
        a.R(x + 3, 5 + u, x + 5, 5 + u, hl)
        a.R(x + 11, 7 + u, x + 13, 8 + u, hd)
        a.R(x + 1, 8 + u, x + 3, 8 + u, hd)
        for sx in (x + 6, x + 9, x + 12):
            a.R(sx, 5 + u, sx, 7 + u, hd)
        if st == 'spiky':
            for sx in (3, 5, 7, 9, 11):
                a.R(x + sx, 2 + u, x + sx + 1, 3 + u, hair)
            a.R(x + 6, 1 + u, x + 9, 1 + u, hair)
            a.R(x + 4, 1 + u, x + 4, 1 + u, hair)
            a.R(x + 11, 1 + u, x + 11, 1 + u, hair)
            a.R(x + 7, 0 + u, x + 8, 0 + u, hair)
        if st == 'long':
            a.R(x - 1, 6 + u, x + 2, 21 + u, hair)
            a.R(x + 13, 6 + u, x + 16, 21 + u, hair)
            a.R(x - 1, 6 + u, x - 1, 21 + u, hd)
            a.R(x + 16, 6 + u, x + 16, 21 + u, hd)
            a.R(x - 1, 20 + u, x + 2, 21 + u, 'M')
            a.R(x + 13, 20 + u, x + 16, 21 + u, 'M')
    if o.get('beard'):
        a.R(x + 3, 13 + u, x + 12, 15 + u, 'w')
        a.R(x + 4, 16 + u, x + 11, 19 + u, 'w')
        a.R(x + 6, 20 + u, x + 9, 22 + u, 'w')
        a.R(x + 11, 14 + u, x + 12, 19 + u, 'l')
        a.R(x + 7, 13 + u, x + 8, 13 + u, 'l')
        a.R(x + 5, 17 + u, x + 5, 18 + u, 'l')

    # ---- 帽子・かぶりもの
    if h == 'circlet':
        a.R(x + 1, 6 + u, x + 14, 7 + u, 'y')
        a.R(x + 1, 7 + u, x + 14, 7 + u, 'Y')
        a.R(x + 6, 4 + u, x + 9, 7 + u, 'y')
        a.R(x + 7, 5 + u, x + 8, 6 + u, 'c')
        a.P(x + 7, 5 + u, 'w')
    elif h == 'flower':
        a.R(x + 10, 1 + u, x + 14, 5 + u, 'r')
        a.R(x + 11, 0 + u, x + 13, 0 + u, 'r')
        a.R(x + 11, 2 + u, x + 13, 4 + u, 'y')
        a.R(x + 12, 3 + u, x + 12, 3 + u, 'Y')
        a.R(x + 14, 3 + u, x + 15, 5 + u, 'R')
        a.R(x - 1, 8 + u, x + 1, 10 + u, 'y')
        a.P(x, 9 + u, 'Y')
    elif h == 'goggles':
        a.R(x + 1, 7 + u, x + 14, 8 + u, 'd')
        a.R(x + 2, 3 + u, x + 6, 7 + u, 'g')
        a.R(x + 9, 3 + u, x + 13, 7 + u, 'g')
        a.R(x + 3, 4 + u, x + 5, 6 + u, 'c')
        a.R(x + 10, 4 + u, x + 12, 6 + u, 'c')
        a.R(x + 3, 4 + u, x + 3, 5 + u, 'w')
        a.R(x + 10, 4 + u, x + 10, 5 + u, 'w')
        a.R(x + 7, 5 + u, x + 8, 5 + u, 'g')
    elif h == 'hood':
        hd_ = o['hood']
        for ry, rx0, rx1 in rows[:6]:
            a.R(x + rx0 - 1, ry + u - 1, x + rx1 + 1, ry + u, hd_)
        a.R(x + 3, 1 + u, x + 12, 1 + u, hd_)
        a.R(x + 1, 6 + u, x + 3, 15 + u, hd_)
        a.R(x + 12, 6 + u, x + 14, 15 + u, hd_)
        a.R(x - 1, 8 + u, x + 1, 15 + u, hd_)
        a.R(x + 14, 8 + u, x + 16, 15 + u, hd_)
        a.R(x + 3, 8 + u, x + 12, 9 + u, hd_)
        a.R(x + 3, 9 + u, x + 12, 9 + u, 'k')
        a.R(x + 4, 4 + u, x + 6, 4 + u, 'g') if hd_ == 'd' else a.R(x + 4, 4 + u, x + 6, 4 + u, 'n')
        if o.get('mask'):
            a.R(x + 3, 13 + u, x + 12, 15 + u, 'd')
            a.R(x + 3, 13 + u, x + 12, 13 + u, 'g')
    elif h == 'wizard':
        a.R(x - 3, 5 + u, x + 18, 7 + u, 'P')
        a.R(x - 3, 5 + u, x + 18, 5 + u, 'p')
        a.R(x + 2, 3 + u, x + 13, 4 + u, 'P')
        a.R(x + 4, 1 + u, x + 11, 2 + u, 'P')
        a.R(x + 6, 0 + u, x + 10, 0 + u, 'P')
        a.R(x + 2, 4 + u, x + 13, 4 + u, 'y')
        a.R(x + 7, 2 + u, x + 8, 3 + u, 'y')
        a.R(x + 11, 1 + u, x + 12, 3 + u, 'p')
        a.R(x + 1, 8 + u, x + 2, 11 + u, 'w')
        a.R(x + 13, 8 + u, x + 14, 11 + u, 'w')
    elif h == 'turban':
        a.R(x, 2 + u, x + 15, 7 + u, 'w')
        a.R(x + 2, 1 + u, x + 13, 1 + u, 'w')
        a.R(x + 4, 0 + u, x + 11, 0 + u, 'w')
        a.R(x, 7 + u, x + 15, 8 + u, 'l')
        for dx in (3, 7, 11):
            a.R(x + dx, 2 + u, x + dx + 2, 3 + u, 'l')
        a.R(x + 6, 3 + u, x + 9, 6 + u, 'r')
        a.R(x + 7, 4 + u, x + 8, 5 + u, 'y')
        a.R(x + 14, 8 + u, x + 15, 12 + u, 'l')
    elif h == 'feather':
        a.R(x - 2, 5 + u, x + 17, 7 + u, 'R')
        a.R(x - 2, 5 + u, x + 17, 5 + u, 'r')
        a.R(x + 2, 2 + u, x + 13, 4 + u, 'R')
        a.R(x + 4, 1 + u, x + 11, 1 + u, 'R')
        a.R(x + 2, 4 + u, x + 13, 4 + u, 'y')
        a.R(x + 11, 0 + u, x + 17, 1 + u, 'w')
        a.R(x + 12, 2 + u, x + 17, 3 + u, 'l')
        a.R(x + 15, 0 + u, x + 17, 0 + u, 'l')
        a.R(x + 10, 3 + u, x + 12, 4 + u, 'Y')
    elif h == 'straw':
        a.R(x - 5, 6 + u, x + 20, 7 + u, 't')
        a.R(x - 4, 8 + u, x - 2, 8 + u, 'T')
        a.R(x + 17, 8 + u, x + 19, 8 + u, 'T')
        a.R(x - 4, 7 + u, x + 19, 7 + u, 'T')
        a.R(x + 2, 1 + u, x + 13, 5 + u, 't')
        a.R(x + 3, 0 + u, x + 12, 0 + u, 't')
        a.R(x + 2, 5 + u, x + 13, 5 + u, 'r')
        a.R(x + 12, 1 + u, x + 13, 4 + u, 'T')
        for dx in (4, 8):
            a.R(x + dx, 1 + u, x + dx, 3 + u, 'T')
    elif h == 'horned':
        for ry, rx0, rx1 in rows[:6]:
            a.R(x + rx0, ry + u, x + rx1, ry + u, 'l')
        a.R(x + 1, 6 + u, x + 14, 7 + u, 'g')
        a.R(x + 4, 4 + u, x + 8, 4 + u, 'w')
        a.R(x + 1, 8 + u, x + 2, 12 + u, 'g')
        a.R(x + 13, 8 + u, x + 14, 12 + u, 'g')
        a.R(x + 7, 5 + u, x + 8, 8 + u, 'd')
        a.R(x - 3, 1 + u, x - 1, 6 + u, 'w')
        a.R(x - 4, 0 + u, x - 3, 2 + u, 'l')
        a.R(x - 1, 5 + u, x + 1, 6 + u, 'g')
        a.R(x + 16, 1 + u, x + 18, 6 + u, 'w')
        a.R(x + 18, 0 + u, x + 19, 2 + u, 'l')
        a.R(x + 14, 5 + u, x + 16, 6 + u, 'g')
    elif h == 'helm':
        for ry, rx0, rx1 in rows[:7]:
            a.R(x + rx0 - 1, ry + u - 1, x + rx1 + 1, ry + u, 'l')
        a.R(x + 3, 1 + u, x + 12, 1 + u, 'w')
        a.R(x + 12, 3 + u, x + 15, 12 + u, 'g')
        a.R(x + 1, 7 + u, x + 14, 8 + u, 'd')
        a.R(x + 1, 9 + u, x + 14, 9 + u, 'g')
        a.R(x + 7, 0 + u, x + 8, 7 + u, 'r')
        a.R(x + 6, 0 + u, x + 9, 1 + u, 'r')
        a.R(x + 7, 8 + u, x + 8, 15 + u, 'g')
        a.R(x, 9 + u, x + 1, 14 + u, 'g')
        a.R(x + 14, 9 + u, x + 15, 14 + u, 'd')
        for hx_ in (3, 5, 10, 12):
            a.P(x + hx_, 9 + u, 'k')
    elif h == 'jester':
        a.R(x + 1, 4 + u, x + 14, 7 + u, 'p')
        a.R(x + 8, 4 + u, x + 14, 7 + u, 'y')
        a.R(x + 3, 3 + u, x + 12, 3 + u, 'p')
        a.R(x - 3, 1 + u, x + 3, 3 + u, 'p')
        a.R(x - 5, 3 + u, x - 3, 6 + u, 'p')
        a.R(x - 6, 6 + u, x - 4, 8 + u, 'y')
        a.R(x + 12, 0 + u, x + 17, 2 + u, 'y')
        a.R(x + 16, 2 + u, x + 18, 5 + u, 'y')
        a.R(x + 17, 5 + u, x + 19, 7 + u, 'p')
        a.R(x + 1, 6 + u, x + 14, 7 + u, 'y') if False else None
        a.R(x + 1, 8 + u, x + 2, 11 + u, hair)
        a.R(x + 13, 8 + u, x + 14, 11 + u, hair)
        a.R(x + 3, 8 + u, x + 12, 8 + u, hair)
        a.R(x + 6, 4 + u, x + 6, 7 + u, 'P')
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
