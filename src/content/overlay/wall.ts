import { CONFIG } from '../../config';
import { SPRITE_PALETTE } from '../../core/sprites';

/** ドット絵1マスの大きさ(px)。帯の幅を、このマス数で描く。 */
export const CELL_PX = 2;
const W = CONFIG.OVERLAY_WIDTH_PX / CELL_PX;
export const WALL_TILE_PX = 200;
const H = WALL_TILE_PX / CELL_PX; // 100 マス

interface Theme {
  mortar: string;
  bricks: string[];
  light: string;
  dark: string;
}

/** 階層ごとの石壁の色。 */
const THEMES: Record<string, Theme> = {
  cave: { mortar: '#2b1f16', bricks: ['#6e5236', '#7a5a3a', '#65492f', '#836340'], light: '#9a7a52', dark: '#47331f' },
  waterway: { mortar: '#1f2a2a', bricks: ['#5d6a62', '#667369', '#56625b', '#6d7a70'], light: '#8a9a8e', dark: '#38423d' },
  mine: { mortar: '#241f1a', bricks: ['#62594b', '#6a604f', '#585040', '#70664f'], light: '#8c8168', dark: '#3a342a' },
  crystal: { mortar: '#16262c', bricks: ['#3f6670', '#477079', '#375c66', '#4d7a84'], light: '#7fb4be', dark: '#25414a' },
  magma: { mortar: '#1a0f0f', bricks: ['#4a3a3e', '#53424a', '#42323a', '#5a484e'], light: '#7a6068', dark: '#2a1c20' },
  abyss: { mortar: '#0d0a14', bricks: ['#2c2640', '#322b49', '#272138', '#383052'], light: '#4d4470', dark: '#171325' },
};

/** 位置を毎回同じにするための、種つきの疑似乱数。 */
function rng(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

type Rect = [x: number, y: number, w: number, h: number, fill: string];

/** タイルの縦の継ぎ目で絵が切れないよう、はみ出す分は反対側にも描く。 */
function wrapRects(x: number, y: number, w: number, h: number, fill: string): Rect[] {
  const out: Rect[] = [[x, y, w, h, fill]];
  if (y + h > H) out.push([x, y - H, w, h, fill]);
  if (y < 0) out.push([x, y + H, w, h, fill]);
  return out;
}

function decorate(areaId: string, rand: () => number, rects: Rect[]): void {
  const add = (x: number, y: number, w: number, h: number, fill: string) => rects.push(...wrapRects(x, y, w, h, fill));

  if (areaId === 'cave') {
    // 垂れ下がった木の根
    for (const x0 of [3, 12, 18]) {
      const y0 = Math.floor(rand() * 60);
      let x = x0;
      for (let y = y0; y < y0 + 22; y++) {
        add(x, y, 1, 1, y % 5 === 0 ? '#3a2814' : '#5a3d20');
        if (y % 4 === 3) x += rand() > 0.5 ? 1 : -1;
        x = Math.max(0, Math.min(W - 1, x));
      }
    }
  } else if (areaId === 'waterway') {
    // 苔と、したたる水
    for (let i = 0; i < 9; i++) {
      add(Math.floor(rand() * (W - 4)), Math.floor(rand() * H), 3 + Math.floor(rand() * 3), 1, '#4f8a4a');
    }
    for (const x of [5, 15]) {
      const y0 = Math.floor(rand() * 70);
      add(x, y0, 2, 18, '#3f78a8');
      add(x, y0, 1, 18, '#6fb0dc');
      add(x, y0 + 18, 2, 1, '#9fd4f0');
    }
  } else if (areaId === 'mine') {
    // 木の支柱と梁、釘
    add(0, 0, 3, H, '#5c3a1c');
    add(0, 0, 1, H, '#7a5028');
    add(2, 0, 1, H, '#3b2410');
    for (const y of [10, 60]) {
      add(0, y, W, 4, '#6a4424');
      add(0, y, W, 1, '#8a5c30');
      add(0, y + 3, W, 1, '#3b2410');
    }
    for (const y of [12, 62]) add(W - 4, y, 1, 1, '#c9ced6');
  } else if (areaId === 'crystal') {
    // 壁から生えた水晶
    for (let i = 0; i < 7; i++) {
      const x = 2 + Math.floor(rand() * (W - 6));
      const y = Math.floor(rand() * (H - 8));
      add(x + 1, y, 1, 1, '#e8fbff');
      add(x, y + 1, 3, 2, '#7fe3f5');
      add(x + 1, y + 1, 1, 2, '#e8fbff');
      add(x, y + 3, 3, 2, '#3fb3d4');
      add(x + 1, y + 5, 1, 1, '#2b86a8');
    }
  } else if (areaId === 'magma') {
    // 割れ目から漏れる赤い光
    for (let i = 0; i < 6; i++) {
      let x = 2 + Math.floor(rand() * (W - 4));
      let y = Math.floor(rand() * (H - 12));
      for (let j = 0; j < 10; j++) {
        add(x, y, 1, 1, j % 3 === 0 ? '#ffd24a' : '#ff6a2a');
        y += 1;
        if (j % 2 === 1) x += rand() > 0.5 ? 1 : -1;
        x = Math.max(0, Math.min(W - 1, x));
      }
    }
    for (let i = 0; i < 10; i++) add(Math.floor(rand() * W), Math.floor(rand() * H), 1, 1, '#ff9a3a');
  } else if (areaId === 'abyss') {
    // 暗闇でこちらを見ている目と、うっすらした割れ目
    for (let i = 0; i < 4; i++) {
      const x = 3 + Math.floor(rand() * (W - 9));
      const y = Math.floor(rand() * (H - 4));
      add(x, y, 2, 1, '#c07bff');
      add(x + 4, y, 2, 1, '#c07bff');
      add(x, y - 1, 2, 1, '#2c2145');
      add(x + 4, y - 1, 2, 1, '#2c2145');
    }
    for (let i = 0; i < 6; i++) add(Math.floor(rand() * W), Math.floor(rand() * H), 1, 2, '#4b3a7a');
  }
}

const cache = new Map<string, string>();

/** 階層の石壁のタイル（背景に敷く data URI）。レンガの積み方は全階層で共通。 */
export function wallUri(areaId: string): string {
  const hit = cache.get(areaId);
  if (hit) return hit;
  const theme = THEMES[areaId] ?? THEMES.cave!;
  const rand = rng(11 + areaId.length * 7);
  const rects: Rect[] = [[0, 0, W, H, theme.mortar]];

  const ROW = 5; // レンガ4マス + 目地1マス
  for (let row = 0; row < H / ROW; row++) {
    const y = row * ROW;
    const shift = row % 2 === 0 ? 0 : 5;
    for (let col = -1; col < Math.ceil(W / 11) + 1; col++) {
      const x = col * 11 + shift;
      const base = theme.bricks[Math.floor(rand() * theme.bricks.length)]!;
      const x0 = Math.max(0, x);
      const x1 = Math.min(W, x + 10);
      if (x1 <= x0) continue;
      rects.push([x0, y + 1, x1 - x0, 4, base]);
      rects.push([x0, y + 1, x1 - x0, 1, theme.light]); // 上の縁を明るく
      rects.push([x0, y + 4, x1 - x0, 1, theme.dark]); // 下の縁を暗く
      // 石のざらつき
      for (let n = 0; n < 2; n++) {
        const sx = x0 + Math.floor(rand() * Math.max(1, x1 - x0));
        rects.push([sx, y + 2 + Math.floor(rand() * 2), 1, 1, rand() > 0.5 ? theme.light : theme.dark]);
      }
    }
  }
  decorate(areaId, rand, rects);

  const body = rects.map(([x, y, w, h, f]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * CELL_PX}" height="${H * CELL_PX}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${body}</svg>`;
  const uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  cache.set(areaId, uri);
  return uri;
}

/** 12x12 のドット絵（ツルハシ）。色は発見品のドットと同じ表を使う。 */
const PICK_ROWS = [
  '............',
  '...llllll...',
  '..lllggggl..',
  '.ll...bb..ll',
  '.l....bb...l',
  '......yy....',
  '......bb....',
  '......bb....',
  '......bb....',
  '......bB....',
  '......BB....',
  '............',
];

function rowsToUri(rows: string[]): string {
  let rects = '';
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const fill = SPRITE_PALETTE[c];
      if (c !== '.' && fill) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
    }),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows[0]?.length ?? 12} ${rows.length}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PICK_URI = rowsToUri(PICK_ROWS);

/** 壁に掛ける松明（飾り）。炎は2コマを交互に見せる。 */
const TORCH_BODY = [
  '..........',
  '..........',
  '..........',
  '..........',
  '....BB....',
  '....bB....',
  '....bB....',
  '...yBBy...',
  '....bB....',
  '....bB....',
];
const FLAME_A = ['..........', '....o.....', '...ooo....', '...oyo....', '....y.....'];
const FLAME_B = ['....o.....', '...ooo....', '...oyo....', '....y.....', '..........'];

function torchLayer(rows: string[], yOffset: number): string {
  let out = '';
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const fill = SPRITE_PALETTE[c];
      if (c !== '.' && fill) out += `<rect x="${x}" y="${y + yOffset}" width="1" height="1" fill="${fill}"/>`;
    }),
  );
  return out;
}

/** 松明のSVG（インライン用）。クラス f1 / f2 を CSS で交互に切り替える。 */
export const TORCH_SVG =
  `<svg viewBox="0 0 10 10" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">` +
  torchLayer(TORCH_BODY, 0) +
  `<g class="f1">${torchLayer(FLAME_A, 0)}</g><g class="f2">${torchLayer(FLAME_B, 0)}</g></svg>`;
