"""
ドット絵を描く共通の部品。12x12 のマスに図形で描き、まわりに自動で縁取り（k）を付けて 14x14 にする。
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
    'A': '#1f6e68',  # 暗い青緑
    'S': '#f1c9a0',  # 肌
    'H': '#4a3322',  # 髪（暗い茶）
    'x': '#120c08',  # 箱の中の暗がり
    'q': '#fff3b0',  # 光
    'V': '#b78cff',  # 明るい紫
    'e': '#e8c85a',  # 金髪
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


