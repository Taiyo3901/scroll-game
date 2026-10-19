"""
帯の中で動く絵（入れ物と、職業別の探索者）を作る。
`python tools/make-actors.py` で src/data/actors.json を作り直す。共通の部品は art.py。

- 入れ物: 壺(階層ごと) / 宝箱(階層ごと) / ミミック(階層ごと) / 箱(部屋ごと)。ふたの開き方を3コマ（ミミックは2コマ）で描く。
- 探索者: 職業ごとの見た目。歩く(4コマ)・物色(2コマ)・立ち(1コマ)・喜ぶ(1コマ)。
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

# 職業ごとの見た目: 服, 差し色, 帽子の種類
OUTFITS = {
    'default': dict(body='b', trim='B', hat='hair'),
    '踊り子': dict(body='m', trim='y', hat='flower'),
    '遊び人': dict(body='p', trim='y', hat='jester'),
    '斥候': dict(body='N', trim='n', hat='hood', hood='N'),
    '賢者': dict(body='w', trim='u', hat='wizard', robe=True),
    '商人': dict(body='b', trim='Y', hat='cap', pack=True),
    '錬金術師': dict(body='a', trim='w', hat='goggles'),
    '戦士': dict(body='r', trim='l', hat='horns'),
    '吟遊詩人': dict(body='o', trim='R', hat='feather'),
    '旅人': dict(body='n', trim='t', hat='straw'),
    '騎士': dict(body='l', trim='d', hat='helm', robe=False),
    '放浪者': dict(body='g', trim='d', hat='hood', hood='d'),
    '勇者': dict(body='u', trim='w', hat='spiky', cape=True),
}


def hero(job, pose, t):
    o = OUTFITS[job]
    a = Art()
    # 姿勢ごとの位置
    lean = 1 if pose == 'search' else 0
    bob = -1 if (pose == 'walk' and t % 2 == 1) else 0
    x0 = 4 + lean
    y = bob

    # 後ろに付くもの（マント、荷物）
    if o.get('cape'):
        a.R(x0 - 1, 6 + y, x0 - 1, 10 + y, 'r')
    if o.get('pack'):
        a.R(x0 - 2, 6 + y, x0 - 1, 9 + y, 'B')

    # 脚
    if pose == 'walk':
        legs = {0: (0, 3), 1: (1, 2), 2: (0, 3), 3: (1, 2)}[t]
    elif pose == 'search':
        legs = (0, 3)
    else:
        legs = (1, 2)
    leg_col = 'd' if o['body'] in ('w', 'l') else 'B'
    if o.get('robe'):
        a.R(x0, 10, x0 + 3, 11, o['body'])
    else:
        a.R(x0 + legs[0], 10 + y, x0 + legs[0], 11, leg_col)
        a.R(x0 + legs[1], 10 + y, x0 + legs[1], 11, leg_col)
    # 胴
    a.R(x0, 6 + y, x0 + 3, 9 + y, o['body'])
    a.R(x0, 9 + y, x0 + 3, 9 + y, o['trim'])
    a.P(x0 + 1, 7 + y, o['trim'])
    # 頭
    a.R(x0, 3 + y, x0 + 3, 5 + y, 'S')
    a.P(x0 + 2, 4 + y, 'k')
    if o['hat'] != 'hood':
        a.R(x0, 2 + y, x0 + 3, 2 + y, 'H')

    # 帽子・髪
    h = o['hat']
    hx = x0
    if h == 'flower':
        a.R(hx - 1, 3 + y, hx - 1, 6 + y, 'H')
        a.P(hx + 1, 1 + y, 'r')
        a.P(hx + 2, 1 + y, 'y')
    elif h == 'jester':
        a.R(hx, 2 + y, hx + 3, 2 + y, 'p')
        a.P(hx - 1, 1 + y, 'y')
        a.P(hx - 1, 0 + y, 'p')
        a.P(hx + 4, 1 + y, 'y')
        a.P(hx + 4, 0 + y, 'p')
    elif h == 'hood':
        a.R(hx - 1, 2 + y, hx + 3, 2 + y, o['hood'])
        a.R(hx - 1, 3 + y, hx - 1, 5 + y, o['hood'])
        a.R(hx, 1 + y, hx + 2, 1 + y, o['hood'])
    elif h == 'wizard':
        a.R(hx, 2 + y, hx + 3, 2 + y, 'P')
        a.R(hx + 1, 1 + y, hx + 2, 1 + y, 'P')
        a.P(hx + 1, 0 + y, 'P')
        a.P(hx + 1, 1 + y, 'y')
    elif h == 'cap':
        a.R(hx, 2 + y, hx + 3, 2 + y, 'Y')
        a.R(hx + 1, 1 + y, hx + 2, 1 + y, 'Y')
    elif h == 'goggles':
        a.R(hx, 2 + y, hx + 3, 2 + y, 'd')
        a.P(hx, 1 + y, 'c')
        a.P(hx + 1, 1 + y, 'c')
        a.P(hx + 2, 1 + y, 'c')
    elif h == 'horns':
        a.R(hx, 2 + y, hx + 3, 2 + y, 'l')
        a.R(hx, 1 + y, hx + 3, 1 + y, 'l')
        a.P(hx - 1, 0 + y, 'w')
        a.P(hx + 4, 0 + y, 'w')
    elif h == 'feather':
        a.R(hx, 2 + y, hx + 3, 2 + y, 'R')
        a.R(hx + 1, 1 + y, hx + 2, 1 + y, 'R')
        a.P(hx + 3, 0 + y, 'w')
        a.P(hx + 4, 0 + y, 'w')
    elif h == 'straw':
        a.R(hx - 1, 2 + y, hx + 4, 2 + y, 't')
        a.R(hx, 1 + y, hx + 3, 1 + y, 't')
    elif h == 'helm':
        a.R(hx, 1 + y, hx + 3, 2 + y, 'l')
        a.R(hx, 3 + y, hx + 3, 3 + y, 'l')
        a.R(hx + 1, 4 + y, hx + 3, 4 + y, 'd')
        a.P(hx + 1, 0 + y, 'r')
        a.P(hx + 2, 0 + y, 'r')
    elif h == 'spiky':
        a.R(hx, 2 + y, hx + 3, 2 + y, 'e')
        a.P(hx, 1 + y, 'e')
        a.P(hx + 2, 1 + y, 'e')
        a.P(hx + 3, 0 + y, 'e')
        a.R(hx, 3 + y, hx + 3, 3 + y, 'r')

    # 腕
    if pose == 'walk':
        swing = (0, 1) if t in (0, 3) else (1, 0)
        a.P(x0 - 1, 7 + y + swing[0], 'S')
        a.P(x0 + 4, 7 + y + swing[1], 'S')
    elif pose == 'search':
        if t == 0:
            a.P(x0 + 4, 7 + y, 'S')
            a.P(x0 + 5, 6 + y, 'S')
        else:
            a.P(x0 + 4, 6 + y, 'S')
            a.P(x0 + 5, 5 + y, 'S')
        a.P(x0 - 1, 8 + y, 'S')
    elif pose == 'cheer':
        a.P(x0 - 1, 6 + y, 'S')
        a.P(x0 - 1, 5 + y, 'S')
        a.P(x0 + 4, 6 + y, 'S')
        a.P(x0 + 4, 5 + y, 'S')
        a.P(x0 + 5, 2 + y, 'y')
        a.P(x0 - 2, 2 + y, 'y')
    else:
        a.P(x0 - 1, 8 + y, 'S')
        a.P(x0 + 4, 8 + y, 'S')
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
