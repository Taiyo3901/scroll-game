"""
発見品のドットアイコンを作る。`python tools/make-sprites.py` で src/data/sprites.json を作り直す。

絵は 12x12 のマスに図形で描き、まわりに自動で縁取り（k）を付けて 14x14 にする。
色は1文字で表し、PALETTE に対応表を置く（json にも書き出し、アプリ側はそれを使う）。
"""
import json
import math
import os

PALETTE = {
    'k': '#2a1f1a',  # 縁取り
    'w': '#f5f0e6',  # 白
    'l': '#c9ced6',  # 明るい銀
    'g': '#8e949e',  # 灰
    'd': '#565b66',  # 暗い灰
    'b': '#9a6232',  # 茶
    'B': '#5c3a1c',  # 暗い茶
    't': '#e0be7a',  # 羊皮紙
    'T': '#b8935a',  # 暗い羊皮紙
    'r': '#cf3e32',  # 赤
    'R': '#84221a',  # 暗い赤
    'o': '#ee8f3a',  # 橙
    'y': '#f6d44c',  # 黄・金
    'Y': '#b8870f',  # 暗い金
    'n': '#58b26c',  # 緑
    'N': '#2f6e45',  # 暗い緑
    'c': '#5cc3e8',  # 水色
    'C': '#2f6aa0',  # 暗い青
    'u': '#4f80dc',  # 青
    'p': '#8a63c4',  # 紫
    'P': '#4b3a7a',  # 暗い紫
    'm': '#de6aa6',  # 桃
    'M': '#8f3a6c',  # 暗い桃
    'a': '#3ab5a8',  # 青緑
}

N = 12


class Art:
    def __init__(self):
        self.g = [['.'] * N for _ in range(N)]

    def P(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < N and 0 <= y < N:
            self.g[y][x] = c

    def R(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.P(x, y, c)

    def L(self, x0, y0, x1, y1, c, t=1):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n
            y = y0 + (y1 - y0) * i / n
            self.P(x, y, c)
            if t >= 2:
                self.P(x + 1, y, c)
            if t >= 3:
                self.P(x, y + 1, c)

    def D(self, cx, cy, r, c):
        for y in range(N):
            for x in range(N):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3:
                    self.P(x, y, c)

    def E(self, cx, cy, rx, ry, c):
        for y in range(N):
            for x in range(N):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05:
                    self.P(x, y, c)

    def ring(self, cx, cy, r0, r1, c):
        for y in range(N):
            for x in range(N):
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if r0 * r0 < d2 <= r1 * r1 + 0.3:
                    self.P(x, y, c)

    def cut(self, pred):
        for y in range(N):
            for x in range(N):
                if pred(x, y):
                    self.g[y][x] = '.'

    def rows(self):
        """縁取りを付けた 14x14 の文字列。"""
        big = [['.'] * (N + 2) for _ in range(N + 2)]
        for y in range(N):
            for x in range(N):
                big[y + 1][x + 1] = self.g[y][x]
        out = [row[:] for row in big]
        for y in range(N + 2):
            for x in range(N + 2):
                if big[y][x] != '.':
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < N + 2 and 0 <= ny < N + 2 and big[ny][nx] != '.':
                        out[y][x] = 'k'
                        break
        return [''.join(r) for r in out]


SPRITES = {}


def sprite(item_id):
    def deco(f):
        a = Art()
        f(a)
        SPRITES[item_id] = a.rows()
        return f
    return deco


# ---------- 共通の部品 ----------
def feather(a, main, shade, spine='B'):
    # 斜めの羽根: 軸に沿って幅をもたせる
    pts = [(2, 9), (3, 8), (4, 7), (5, 6), (6, 5), (7, 4), (8, 3), (9, 2)]
    for i, (x, y) in enumerate(pts):
        spread = [0, 1, 2, 2, 2, 2, 1, 0][i]
        for s in range(1, spread + 1):
            a.P(x + s, y + s * 0 + 0, main)
            a.P(x - 0, y - s, main)
        a.P(x, y, spine)
    for (x, y) in [(5, 8), (6, 7), (7, 6), (8, 5)]:
        a.P(x, y, shade)
    a.L(1, 10, 3, 8, spine)


def crown(a, body, band, gem1, gem2):
    a.R(1, 5, 10, 9, body)
    for x in (1, 5, 6, 10):
        a.R(x, 2, x, 4, body)
    for x in (2, 3, 4, 7, 8, 9):
        a.P(x, 4 if x in (3, 8) else 5, body)
    a.R(1, 9, 10, 9, band)
    a.P(3, 7, gem1)
    a.P(5, 7, gem2)
    a.P(6, 7, gem2)
    a.P(8, 7, gem1)
    a.P(1, 2, gem2)
    a.P(10, 2, gem2)


def book(a, cover, spine, page, mark):
    a.R(1, 1, 9, 10, cover)
    a.R(1, 1, 2, 10, spine)
    a.R(10, 2, 10, 9, page)
    a.R(3, 10, 9, 10, spine)
    a.R(8, 1, 8, 10, spine)
    a.D(5.5, 5.5, 1.5, mark)


def scroll(a, paper, edge, line):
    a.R(2, 1, 9, 10, paper)
    a.R(1, 0, 10, 1, edge)
    a.R(1, 10, 10, 11, edge)
    for y in (3, 5, 7):
        a.R(3, y, 8, y, line)


# ---------- 劇場 ----------
@sprite('film-scrap')
def _(a):
    a.R(0, 3, 11, 8, 'd')
    for x in (1, 3, 5, 7, 9):
        a.P(x, 4, 'w')
        a.P(x, 7, 'w')
    a.R(1, 5, 2, 6, 'c')
    a.R(4, 5, 5, 6, 'y')
    a.R(7, 5, 8, 6, 'o')
    a.R(10, 5, 10, 6, 'g')


@sprite('worn-ticket')
def _(a):
    a.R(1, 3, 10, 8, 't')
    a.P(1, 5, '.')
    a.P(10, 5, '.')
    for y in range(3, 9, 2):
        a.P(7, y, 'T')
    a.R(2, 4, 5, 4, 'T')
    a.R(2, 6, 4, 6, 'T')
    a.P(9, 7, 'r')
    a.P(9, 4, 'r')


@sprite('lens-shard')
def _(a):
    a.D(5.5, 5.5, 4.3, 'c')
    a.cut(lambda x, y: x + y >= 15)
    a.cut(lambda x, y: x - y >= 7)
    for x, y in ((3, 3), (4, 3), (3, 4)):
        a.P(x, y, 'w')
    for x in range(2, 9):
        a.P(x, 8, 'u')
    a.P(2, 7, 'u')


@sprite('screen-scrap')
def _(a):
    a.R(1, 2, 10, 9, 'w')
    a.R(1, 9, 10, 9, 'l')
    a.R(3, 4, 8, 7, 'l')
    a.P(4, 6, 'g')
    a.P(5, 5, 'g')
    a.P(6, 6, 'g')
    a.P(7, 5, 'y')
    for x, y in ((10, 2), (10, 3), (9, 9), (10, 9), (10, 8), (1, 2)):
        a.P(x, y, '.')


@sprite('glowing-projector')
def _(a):
    a.D(3.5, 2.5, 1.8, 'g')
    a.D(6.5, 2.5, 1.8, 'g')
    a.R(1, 4, 7, 9, 'd')
    a.R(2, 5, 6, 8, 'g')
    a.R(8, 5, 9, 8, 'l')
    a.R(10, 6, 11, 7, 'y')
    a.P(11, 4, 'y')
    a.P(11, 9, 'y')
    a.R(2, 10, 6, 10, 'd')


@sprite('legend-film-can')
def _(a):
    a.R(1, 4, 10, 9, 'g')
    a.E(5.5, 4, 5, 1.7, 'l')
    a.E(5.5, 9, 5, 1.5, 'g')
    a.R(1, 6, 10, 7, 'y')
    a.R(2, 5, 2, 8, 'd')
    a.R(9, 10, 11, 11, 'b')
    for x, y in ((0, 1), (11, 2), (5, 0)):
        a.P(x, y, 'w')


# ---------- 酒場 ----------
@sprite('bubble-shell')
def _(a):
    a.D(5.5, 6.5, 5, 'm')
    a.cut(lambda x, y: y > 9)
    a.R(4, 9, 7, 10, 'M')
    a.L(6, 9, 2, 4, 'M')
    a.L(6, 9, 6, 2, 'M')
    a.L(6, 9, 9, 4, 'M')
    a.P(3, 3, 'w')
    a.P(4, 2, 'w')


@sprite('message-slip')
def _(a):
    a.R(2, 1, 9, 10, 'w')
    a.R(3, 3, 8, 3, 'g')
    a.R(3, 5, 7, 5, 'g')
    a.R(3, 7, 6, 7, 'g')
    a.P(7, 8, 'r')
    a.P(8, 8, 'r')
    a.P(9, 10, '.')
    a.P(8, 10, '.')
    a.P(9, 9, 'l')


@sprite('faded-flag')
def _(a):
    a.R(2, 0, 2, 11, 'B')
    a.R(3, 1, 10, 6, 'o')
    a.R(3, 3, 10, 4, 'y')
    a.P(10, 1, '.')
    a.P(10, 6, '.')
    a.P(7, 2, 'w')
    a.P(8, 5, 'w')


@sprite('speaking-tube')
def _(a):
    for x in range(2, 10):
        half = 1 + (x - 2) * 0.45
        a.R(x, int(round(5.5 - half)), x, int(round(5.5 + half)), 'y')
    a.R(9, 1, 9, 10, 'Y')
    a.R(0, 5, 1, 6, 'Y')
    for x in range(3, 8):
        a.P(x, int(round(5.5 - (1 + (x - 2) * 0.45))) + 1, 'w')


@sprite('resonant-bell')
def _(a):
    a.D(5.5, 5.5, 3.5, 'y')
    a.R(1, 7, 10, 8, 'y')
    a.R(2, 9, 9, 9, 'Y')
    a.D(5.5, 10.5, 1, 'Y')
    a.R(5, 0, 6, 1, 'Y')
    a.R(4, 3, 4, 6, 'w')
    for x, y in ((0, 4), (11, 4), (0, 7), (11, 7)):
        a.P(x, y, 'c')


@sprite('crowd-horn')
def _(a):
    for x in range(3, 12):
        half = 1 + (x - 3) * 0.4
        a.R(x, int(round(5.5 - half)), x, int(round(5.5 + half)), 'r')
    a.R(7, 1, 8, 10, 'w')
    a.R(11, 1, 11, 10, 'R')
    a.R(1, 5, 2, 9, 'B')
    a.R(2, 5, 3, 6, 'd')
    a.P(0, 2, 'y')
    a.P(1, 1, 'y')


# ---------- 情報屋 ----------
@sprite('type-piece')
def _(a):
    a.R(3, 1, 8, 10, 'g')
    a.R(4, 2, 7, 4, 'w')
    a.R(4, 2, 7, 2, 'd')
    a.R(5, 3, 6, 4, 'd')
    a.R(8, 1, 8, 10, 'd')
    a.R(3, 10, 8, 10, 'd')


@sprite('old-newspaper')
def _(a):
    a.R(1, 1, 10, 10, 't')
    a.R(2, 2, 9, 3, 'd')
    for y in (5, 6, 8):
        a.R(2, y, 5, y, 'T')
    a.R(7, 5, 9, 8, 'g')
    a.P(10, 10, '.')
    a.P(9, 10, '.')
    a.P(10, 9, '.')


@sprite('ink-pot')
def _(a):
    a.D(5.5, 7.5, 3.6, 'P')
    a.R(4, 4, 7, 5, 'P')
    a.R(4, 2, 7, 3, 'B')
    a.R(3, 6, 3, 9, 'u')
    a.L(8, 0, 10, 4, 'w')
    a.P(9, 2, 'l')


@sprite('extra-edition')
def _(a):
    a.R(1, 3, 10, 9, 'w')
    for y in (4, 8):
        a.R(1, y, 10, y, 'l')
    a.R(1, 6, 10, 6, 'B')
    a.R(5, 2, 6, 10, 'B')
    a.R(2, 5, 3, 5, 'd')


@sprite('red-pen')
def _(a):
    a.L(3, 8, 10, 1, 'r', 2)
    a.L(4, 8, 10, 2, 'R')
    a.L(1, 10, 3, 8, 'd')
    a.P(1, 10, 'k')
    a.P(9, 1, 'o')


@sprite('front-page-plate')
def _(a):
    a.R(1, 2, 10, 9, 'l')
    for x in range(1, 11):
        a.P(x, 2, 'Y')
        a.P(x, 9, 'Y')
    for y in range(2, 10):
        a.P(1, y, 'Y')
        a.P(10, y, 'Y')
    a.R(2, 3, 9, 4, 'd')
    a.R(2, 6, 5, 7, 'd')
    a.R(7, 6, 9, 7, 'd')
    a.P(9, 0, 'y')
    a.P(11, 1, 'y')


# ---------- 書庫 ----------
@sprite('parchment-scrap')
def _(a):
    a.R(1, 2, 10, 9, 't')
    a.R(1, 2, 1, 9, 'T')
    for y in (4, 5, 7):
        a.R(3, y, 8, y, 'T')
    a.R(3, 6, 6, 6, 'b')
    for x, y in ((10, 2), (9, 2), (10, 9), (10, 8), (1, 9)):
        a.P(x, y, '.')


@sprite('worn-chalk')
def _(a):
    a.L(2, 9, 8, 3, 'w', 2)
    a.L(2, 10, 8, 4, 'l')
    a.P(1, 10, 'l')
    a.P(0, 11, 'l')
    a.P(10, 2, 'l')
    a.P(3, 11, 'g')


@sprite('old-bookmark')
def _(a):
    a.R(4, 0, 7, 8, 'r')
    a.P(5, 8, '.')
    a.P(6, 8, '.')
    a.R(4, 8, 4, 9, 'r')
    a.R(7, 8, 7, 9, 'r')
    a.R(5, 9, 6, 11, 'y')
    a.R(5, 1, 5, 6, 'o')


@sprite('annotated-codex')
def _(a):
    book(a, 'b', 'B', 'w', 'y')
    a.R(7, 0, 9, 2, 'm')


@sprite('star-chart-copy')
def _(a):
    a.R(1, 1, 10, 10, 'C')
    a.R(0, 0, 0, 11, 'B')
    a.R(11, 0, 11, 11, 'B')
    for x, y in ((3, 3), (6, 5), (8, 2), (4, 8), (9, 8)):
        a.P(x, y, 'y')
    a.L(3, 3, 6, 5, 'c')
    a.L(6, 5, 8, 2, 'c')
    a.P(2, 6, 'w')
    a.P(7, 9, 'w')


@sprite('sage-tome')
def _(a):
    book(a, 'P', 'p', 'w', 'y')
    a.R(3, 5, 8, 6, 'y')
    a.P(5, 5, 'P')
    a.P(6, 6, 'P')
    for x, y in ((0, 0), (11, 0), (0, 11), (11, 11)):
        a.P(x, y, 'w')


# ---------- 道具屋 ----------
@sprite('old-price-tag')
def _(a):
    a.R(2, 3, 9, 10, 't')
    a.P(2, 3, '.')
    a.P(9, 3, '.')
    a.P(5, 4, 'k')
    a.R(4, 6, 7, 6, 'd')
    a.R(4, 8, 6, 8, 'd')
    a.L(5, 0, 5, 3, 'B')


@sprite('chipped-coin')
def _(a):
    a.D(5.5, 5.5, 4.6, 'b')
    a.D(5.5, 5.5, 3.6, 'o')
    a.D(5.5, 5.5, 1.5, 'b')
    a.cut(lambda x, y: x >= 9 and y <= 3)
    a.P(3, 3, 'y')
    a.P(4, 2, 'y')


@sprite('wheelless-cart')
def _(a):
    a.R(1, 3, 10, 7, 'b')
    a.R(1, 5, 10, 5, 'B')
    a.R(3, 3, 3, 7, 'B')
    a.R(7, 3, 7, 7, 'B')
    a.L(10, 3, 11, 0, 'B')
    a.D(3, 9, 1.7, 'd')
    a.R(8, 8, 8, 9, 'g')


@sprite('magic-purse')
def _(a):
    a.D(5.5, 7, 4, 'p')
    a.R(4, 2, 7, 3, 'p')
    a.R(3, 3, 8, 3, 'y')
    a.P(4, 6, 'w')
    for x, y in ((1, 1), (10, 2), (9, 0), (0, 8)):
        a.P(x, y, 'y')


@sprite('appraiser-scales')
def _(a):
    a.R(5, 1, 6, 10, 'Y')
    a.R(1, 2, 10, 3, 'Y')
    a.R(0, 5, 3, 6, 'y')
    a.R(8, 5, 11, 6, 'y')
    a.R(1, 4, 1, 4, 'Y')
    a.R(10, 4, 10, 4, 'Y')
    a.R(3, 10, 8, 11, 'Y')


@sprite('gold-seal')
def _(a):
    a.R(4, 0, 7, 3, 'B')
    a.R(3, 4, 8, 5, 'Y')
    a.R(2, 6, 9, 10, 'y')
    a.R(5, 7, 6, 9, 'Y')
    a.R(4, 8, 7, 8, 'Y')
    a.P(2, 6, 'w')
    a.P(11, 1, 'w')
    a.P(0, 3, 'w')


# ---------- 工房 ----------
@sprite('rusty-gear')
def _(a):
    a.D(5.5, 5.5, 3.6, 'b')
    for x, y in ((5, 0), (6, 0), (5, 11), (6, 11), (0, 5), (0, 6), (11, 5), (11, 6),
                 (2, 2), (9, 2), (2, 9), (9, 9), (1, 1), (10, 1), (1, 10), (10, 10)):
        a.P(x, y, 'b')
    a.D(5.5, 5.5, 1.5, '.')
    for x, y in ((3, 3), (8, 4), (4, 8), (7, 7)):
        a.P(x, y, 'o')


@sprite('circuit-chip')
def _(a):
    a.R(1, 1, 10, 10, 'N')
    a.L(1, 3, 4, 3, 'n')
    a.L(7, 8, 10, 8, 'n')
    a.L(3, 3, 3, 6, 'n')
    a.L(8, 5, 8, 8, 'n')
    a.R(4, 4, 7, 7, 'd')
    a.R(5, 5, 6, 6, 'g')
    for x, y in ((2, 1), (9, 10), (1, 8), (10, 3)):
        a.P(x, y, 'y')


@sprite('screw-vial')
def _(a):
    a.R(3, 3, 8, 10, 'c')
    a.R(4, 1, 7, 2, 'g')
    a.R(4, 0, 7, 0, 'B')
    a.R(4, 4, 4, 9, 'w')
    for x, y in ((5, 8), (7, 7), (6, 9), (5, 6), (7, 9)):
        a.P(x, y, 'g')
    a.P(6, 8, 'd')


@sprite('automaton-arm')
def _(a):
    a.R(0, 3, 4, 5, 'g')
    a.D(5.5, 4, 1.4, 'y')
    a.R(5, 5, 7, 9, 'g')
    a.R(6, 9, 10, 10, 'l')
    for x in (7, 9, 10):
        a.P(x, 11, 'l')
    a.P(1, 4, 'd')
    a.P(3, 4, 'd')
    a.P(6, 7, 'd')


@sprite('cipher-plate')
def _(a):
    a.R(1, 1, 10, 10, 'g')
    for x, y in ((1, 1), (10, 1), (1, 10), (10, 10)):
        a.P(x, y, 'l')
    for x0, y0 in ((2, 2), (6, 2), (2, 6), (6, 6)):
        a.R(x0, y0, x0 + 1, y0, 'y')
        a.R(x0, y0, x0, y0 + 2, 'y')
        a.P(x0 + 2, y0 + 2, 'y')
    a.R(4, 5, 5, 5, 'd')
    a.R(8, 5, 9, 5, 'd')


@sprite('perpetual-blueprint')
def _(a):
    a.R(1, 1, 10, 10, 'C')
    for v in (4, 7):
        a.R(v, 1, v, 10, 'u')
        a.R(1, v, 10, v, 'u')
    a.D(5.5, 5.5, 3.2, 'w')
    a.D(5.5, 5.5, 2, 'C')
    a.D(5.5, 5.5, 0.8, 'w')


# ---------- 闘技場 ----------
@sprite('loaded-dice')
def _(a):
    a.R(1, 2, 9, 10, 'w')
    a.R(10, 3, 10, 10, 'l')
    a.R(2, 10, 10, 10, 'g')
    for x, y in ((3, 4), (7, 4), (5, 6), (3, 8), (7, 8)):
        a.P(x, y, 'R')
    a.P(1, 2, '.')


@sprite('wooden-piece')
def _(a):
    a.D(5.5, 3, 2, 'b')
    a.R(4, 5, 7, 5, 'b')
    a.R(4, 6, 7, 7, 'b')
    a.R(3, 8, 8, 8, 'b')
    a.R(2, 9, 9, 10, 'B')
    a.P(5, 2, 't')
    a.R(4, 6, 4, 7, 't')


@sprite('rusty-buckler')
def _(a):
    a.D(5.5, 5.5, 5, 'd')
    a.D(5.5, 5.5, 4, 'g')
    a.D(5.5, 5.5, 1.8, 'b')
    for x, y in ((2, 4), (3, 8), (8, 3), (8, 8)):
        a.P(x, y, 'o')
    for x, y in ((5, 1), (1, 5), (10, 5), (5, 10)):
        a.P(x, y, 'b')


@sprite('victor-medal')
def _(a):
    a.R(4, 0, 7, 3, 'r')
    a.R(5, 0, 5, 3, 'w')
    a.D(5.5, 7, 3.6, 'y')
    a.D(5.5, 7, 2.2, 'Y')
    a.P(5, 6, 'w')
    a.P(6, 7, 'y')
    a.P(5, 8, 'y')


@sprite('polished-sword')
def _(a):
    a.L(4, 7, 10, 1, 't', 2)
    a.L(4, 8, 10, 2, 'T')
    a.L(1, 10, 3, 8, 'b', 2)
    a.L(2, 6, 6, 10, 'B')
    a.P(10, 0, 'w')


@sprite('champion-crown')
def _(a):
    crown(a, 'y', 'Y', 'r', 'c')
    a.P(0, 0, 'w')
    a.P(11, 1, 'w')


# ---------- 音楽堂 ----------
@sprite('record-shard')
def _(a):
    a.D(5.5, 5.5, 5, 'd')
    a.cut(lambda x, y: x + y >= 15)
    a.ring(5.5, 5.5, 2.5, 3.6, 'g')
    a.D(5.5, 5.5, 1.5, 'r')
    a.P(3, 3, 'g')


@sprite('broken-lute')
def _(a):
    a.D(4.5, 7, 3.6, 'b')
    a.L(6, 5, 10, 1, 'B', 2)
    a.D(4.5, 7, 1, 'B')
    a.L(4, 3, 6, 5, 'w')
    a.P(10, 0, 'y')
    a.P(11, 1, 'y')
    a.R(3, 5, 3, 6, 't')


@sprite('score-scrap')
def _(a):
    a.R(1, 2, 10, 9, 't')
    for y in (3, 5, 7):
        a.R(2, y, 9, y, 'd')
    for x, y in ((3, 6), (6, 4), (8, 6)):
        a.P(x, y, 'k')
        a.P(x + 1, y - 2, 'k')
        a.P(x + 1, y - 1, 'k')
    for x, y in ((10, 2), (10, 9), (1, 9)):
        a.P(x, y, '.')


@sprite('unending-flute')
def _(a):
    a.L(1, 10, 10, 1, 't', 2)
    a.L(1, 11, 10, 2, 'T')
    for x, y in ((4, 7), (6, 5), (8, 3)):
        a.P(x, y, 'B')
    for x, y in ((9, 5), (10, 6), (3, 2), (2, 1)):
        a.P(x, y, 'c')


@sprite('silver-harp')
def _(a):
    a.R(1, 1, 9, 2, 'l')
    a.R(9, 1, 10, 10, 'l')
    a.L(1, 2, 9, 10, 'g')
    for x in (2, 4, 6, 8):
        a.R(x, 3 + (x - 2) // 2, x, 9, 'w')
    a.R(1, 10, 10, 10, 'l')


@sprite('divine-score')
def _(a):
    scroll(a, 'w', 'y', 'd')
    for x, y in ((3, 4), (6, 6), (8, 4)):
        a.P(x, y, 'Y')
        a.P(x + 1, y - 1, 'Y')
    for x, y in ((0, 5), (11, 4), (5, 0)):
        a.P(x, y, 'c')


# ---------- 宿場町 ----------
@sprite('worn-ticket-stub')
def _(a):
    a.R(1, 2, 10, 9, 'w')
    a.R(1, 2, 10, 3, 'u')
    a.R(2, 5, 6, 5, 'd')
    a.R(2, 7, 4, 7, 'd')
    a.R(1, 9, 10, 9, 'g')
    a.L(7, 6, 9, 6, 'r')
    a.P(9, 5, 'r')
    a.P(9, 7, 'r')


@sprite('map-corner')
def _(a):
    a.R(1, 1, 10, 10, 't')
    a.R(1, 1, 5, 4, 'c')
    a.R(6, 6, 10, 10, 'n')
    a.L(3, 6, 8, 8, 'r')
    a.P(9, 8, 'r')
    a.P(3, 5, 'r')
    for x, y in ((10, 1), (1, 10), (10, 2)):
        a.P(x, y, '.')


@sprite('worn-sole')
def _(a):
    a.E(5.5, 3.5, 3, 2.6, 'B')
    a.R(4, 5, 7, 7, 'B')
    a.E(5.5, 8.8, 2.4, 2.2, 'B')
    a.R(3, 3, 8, 3, 'b')
    a.R(4, 6, 7, 6, 'b')
    a.P(5, 9, '.')
    a.P(6, 9, '.')


@sprite('true-compass')
def _(a):
    a.D(5.5, 5.5, 5, 'Y')
    a.D(5.5, 5.5, 4, 'w')
    a.R(5, 2, 6, 5, 'r')
    a.R(5, 6, 6, 9, 'g')
    a.P(5, 5, 'k')
    a.P(5, 0, 'y')
    a.P(6, 0, 'y')


@sprite('traveler-cloak')
def _(a):
    a.R(3, 1, 8, 2, 'N')
    for y in range(3, 11):
        grow = int((y - 3) * 0.4)
        a.R(3 - grow, y, 8 + grow, y, 'n' if y % 2 else 'N')
    a.P(5, 3, 'y')
    a.P(6, 3, 'y')
    a.R(5, 5, 6, 10, 'N')


@sprite('worlds-end-map')
def _(a):
    a.R(1, 2, 10, 9, 't')
    a.R(0, 1, 0, 10, 'Y')
    a.R(11, 1, 11, 10, 'Y')
    a.R(2, 3, 5, 6, 'c')
    a.R(6, 3, 9, 5, 'n')
    for x in range(2, 10, 2):
        a.P(x, 8, 'r')
    a.P(7, 7, 'y')
    a.P(5, 0, 'y')
    a.P(10, 0, 'w')


# ---------- ギルド ----------
@sprite('wax-seal')
def _(a):
    a.D(5.5, 5.5, 4.2, 'r')
    for x, y in ((1, 3), (10, 7), (3, 10), (9, 2)):
        a.P(x, y, 'r')
    a.D(5.5, 5.5, 2.6, 'R')
    a.R(5, 3, 6, 8, 'r')
    a.R(3, 5, 8, 6, 'r')
    a.P(3, 3, 'o')


@sprite('postmark')
def _(a):
    a.ring(4.5, 5.5, 2.8, 4.2, 'd')
    a.R(2, 5, 7, 5, 'd')
    a.R(3, 3, 6, 3, 'd')
    a.R(3, 8, 6, 8, 'd')
    for y in (3, 5, 7):
        a.P(9, y, 'd')
        a.P(10, y + 1, 'd')
        a.P(11, y, 'd')


@sprite('dry-pen')
def _(a):
    feather(a, 'w', 'l')
    a.P(1, 10, 'd')


@sprite('carrier-feather')
def _(a):
    feather(a, 'l', 'g')
    a.P(8, 3, 'w')


@sprite('scroll-case')
def _(a):
    a.R(3, 1, 8, 10, 'b')
    a.R(3, 1, 8, 2, 'y')
    a.R(3, 9, 8, 10, 'y')
    a.R(3, 5, 8, 6, 'r')
    a.R(4, 3, 4, 8, 't')
    a.R(4, 0, 7, 0, 'w')


@sprite('royal-decree')
def _(a):
    scroll(a, 'w', 't', 'g')
    a.R(4, 3, 7, 3, 'y')
    a.P(4, 2, 'y')
    a.P(5, 1, 'y')
    a.P(6, 2, 'y')
    a.P(7, 1, 'y')
    a.D(5.5, 8, 1.4, 'r')


# ---------- 未踏の地 ----------
@sprite('old-pouch')
def _(a):
    a.D(5.5, 7, 4, 'b')
    a.R(4, 2, 7, 3, 'b')
    a.R(3, 3, 8, 3, 'B')
    a.R(4, 6, 7, 8, 't')
    a.P(2, 1, 'B')
    a.P(9, 1, 'B')


@sprite('broken-torch')
def _(a):
    a.R(5, 5, 6, 11, 'b')
    a.R(4, 2, 7, 5, 'd')
    a.cut(lambda x, y: y == 2 and x in (4, 6))
    a.P(5, 3, 'o')
    a.P(6, 4, 'o')
    a.P(5, 0, 'l')
    a.P(6, 1, 'l')
    a.P(3, 6, 'b')


@sprite('cracked-urn')
def _(a):
    a.E(5.5, 7, 4, 3.6, 'o')
    a.R(4, 2, 7, 3, 'b')
    a.R(3, 1, 8, 1, 'T')
    a.R(2, 6, 9, 6, 'B')
    a.L(6, 3, 4, 6, 'k')
    a.L(4, 6, 6, 9, 'k')
    a.P(3, 5, 'y')


@sprite('adventurer-diary')
def _(a):
    book(a, 'b', 'B', 'w', 'y')
    a.R(1, 5, 9, 6, 'B')
    a.P(7, 5, 'y')
    a.R(8, 9, 9, 11, 'r')


@sprite('mystery-key')
def _(a):
    a.ring(3.5, 3.5, 1.2, 3, 'y')
    a.L(5, 5, 10, 10, 'y', 2)
    a.P(8, 10, 'y')
    a.P(9, 8, 'y')
    a.P(10, 11, 'y')
    a.P(0, 0, 'c')
    a.P(11, 3, 'c')


@sprite('guardian-ring')
def _(a):
    a.ring(5.5, 6.5, 2.4, 4.4, 'y')
    a.D(5.5, 2, 1.6, 'c')
    a.P(5, 1, 'w')
    for x, y in ((0, 0), (11, 0), (0, 5), (11, 5)):
        a.P(x, y, 'w')


# ---------- 階層の秘宝 ----------
@sprite('secret-cave')
def _(a):
    a.L(2, 0, 5, 3, 'l')
    a.L(9, 0, 6, 3, 'l')
    a.D(5.5, 7, 3.8, 'y')
    a.D(5.5, 7, 2.8, 'n')
    a.R(5, 6, 6, 9, 'N')
    a.P(4, 6, 'N')
    a.P(7, 5, 'N')
    a.P(4, 5, 'w')


@sprite('secret-waterway')
def _(a):
    a.E(5.5, 5.5, 4.2, 5, 'c')
    a.cut(lambda x, y: y > 9)
    for y in (3, 5, 7):
        a.R(3, y, 8, y, 'u')
    a.R(5, 2, 6, 9, 'C')
    a.P(3, 2, 'w')
    a.P(4, 2, 'w')
    a.P(2, 4, 'w')


@sprite('secret-mine')
def _(a):
    a.R(5, 3, 6, 11, 'b')
    a.R(5, 3, 6, 4, 'y')
    a.R(1, 2, 10, 3, 'l')
    a.P(1, 4, 'l')
    a.P(10, 4, 'l')
    a.P(0, 3, 'g')
    a.P(11, 3, 'g')
    a.R(3, 1, 8, 1, 'l')


@sprite('secret-crystal')
def _(a):
    cols = ['m', 'm', 'y', 'n', 'c', 'u', 'p', 'p']
    shape = [(5, 6), (4, 7), (3, 8), (2, 9), (2, 9), (3, 8), (4, 7), (5, 6)]
    for i, (x0, x1) in enumerate(shape):
        a.R(x0, i + 2, x1, i + 2, cols[i])
    a.R(5, 1, 6, 1, 'w')
    a.P(4, 3, 'w')
    a.P(3, 5, 'w')
    a.P(0, 6, 'w')
    a.P(11, 3, 'w')


@sprite('secret-magma')
def _(a):
    a.D(3.5, 4, 2.6, 'r')
    a.D(8.5, 4, 2.6, 'r')
    for i in range(0, 6):
        a.R(1 + i, 5 + i, 10 - i, 5 + i, 'r')
    a.D(5.5, 6, 2, 'o')
    a.D(5.5, 6.5, 1, 'y')
    a.P(5, 0, 'o')
    a.P(6, 1, 'y')


@sprite('secret-abyss')
def _(a):
    crown(a, 'P', 'd', 'm', 'p')
    a.P(2, 1, 'p')
    a.P(9, 1, 'p')
    a.P(0, 6, 'p')
    a.P(11, 6, 'p')


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, 'src', 'data', 'sprites.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'palette': PALETTE, 'sprites': SPRITES}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(len(SPRITES), 'sprites ->', path)
