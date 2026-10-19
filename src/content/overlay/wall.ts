import { CONFIG } from '../../config';
import { SPRITE_PALETTE } from '../../core/sprites';

/** ドット絵1マスの大きさ(px)。帯の幅を、このマス数で描く。 */
export const CELL_PX = 2;
const W = CONFIG.OVERLAY_WIDTH_PX / CELL_PX;
export const WALL_TILE_PX = 200;
const H = WALL_TILE_PX / CELL_PX; // 100 マス

type Style = 'brick' | 'planks' | 'stripes' | 'tiles';

interface Theme {
  style: Style;
  /** 目地・すき間の色 */
  mortar: string;
  /** 面の色（ランダムに選ぶ） */
  faces: string[];
  light: string;
  dark: string;
}

/**
 * 閲覧しているサイトの種類（部屋）ごとの壁。レンガ・板・カーテン・タイルのどれかを土台にして、
 * 部屋らしい飾りを重ねる。キーは部屋のID。
 */
const THEMES: Record<string, Theme> = {
  other: { style: 'brick', mortar: '#2b1f16', faces: ['#6e5236', '#7a5a3a', '#65492f', '#836340'], light: '#9a7a52', dark: '#47331f' },
  video: { style: 'stripes', mortar: '#2a0d14', faces: ['#7a1f2b', '#651825'], light: '#a83a4a', dark: '#430f19' },
  sns: { style: 'planks', mortar: '#2b1a0c', faces: ['#8a5a2e', '#7a4e26', '#94642f'], light: '#b7803f', dark: '#563316' },
  news: { style: 'tiles', mortar: '#6e6a58', faces: ['#c9c2ad', '#bdb69f', '#d3ccb7'], light: '#ece6d3', dark: '#a09983' },
  study: { style: 'planks', mortar: '#1f140c', faces: ['#4a3426', '#523a2a', '#432e21'], light: '#6e5240', dark: '#2c1d14' },
  shop: { style: 'brick', mortar: '#3a2a18', faces: ['#b58a52', '#c19660', '#a98049'], light: '#dcb27c', dark: '#7c5a30' },
  dev: { style: 'tiles', mortar: '#10181c', faces: ['#2f4650', '#34505b', '#2a3f48'], light: '#5b8594', dark: '#1d2d34' },
  game: { style: 'brick', mortar: '#4a3d28', faces: ['#a8946a', '#b39f74', '#9d895f'], light: '#d2bf90', dark: '#76653f' },
  music: { style: 'stripes', mortar: '#1c0f2a', faces: ['#4b2a6b', '#3d2058'], light: '#7a52a0', dark: '#2a1640' },
  travel: { style: 'brick', mortar: '#26301e', faces: ['#6a7a5a', '#73836a', '#617052'], light: '#98aa86', dark: '#3f4b34' },
  work: { style: 'planks', mortar: '#26160a', faces: ['#6a4426', '#5c3a1f', '#744c2b'], light: '#946238', dark: '#3d2410' },
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

/** 土台（レンガ・板・カーテン・タイル）を描く。 */
function drawBase(theme: Theme, rand: () => number, rects: Rect[]): void {
  const face = () => theme.faces[Math.floor(rand() * theme.faces.length)]!;
  const speck = (x0: number, x1: number, y: number) => {
    const sx = x0 + Math.floor(rand() * Math.max(1, x1 - x0));
    rects.push([sx, y, 1, 1, rand() > 0.5 ? theme.light : theme.dark]);
  };

  if (theme.style === 'brick') {
    const ROW = 5; // レンガ4マス + 目地1マス
    for (let row = 0; row < H / ROW; row++) {
      const y = row * ROW;
      const shift = row % 2 === 0 ? 0 : 5;
      for (let col = -1; col < Math.ceil(W / 11) + 1; col++) {
        const x = col * 11 + shift;
        const x0 = Math.max(0, x);
        const x1 = Math.min(W, x + 10);
        if (x1 <= x0) continue;
        rects.push([x0, y + 1, x1 - x0, 4, face()]);
        rects.push([x0, y + 1, x1 - x0, 1, theme.light]);
        rects.push([x0, y + 4, x1 - x0, 1, theme.dark]);
        speck(x0, x1, y + 2 + Math.floor(rand() * 2));
        speck(x0, x1, y + 2 + Math.floor(rand() * 2));
      }
    }
  } else if (theme.style === 'planks') {
    const ROW = 5; // 板4マス + すき間1マス（100マスに収まる）
    for (let row = 0; row < H / ROW; row++) {
      const y = row * ROW;
      const joint = 4 + Math.floor(rand() * (W - 8)); // 板のつなぎ目
      rects.push([0, y + 1, joint, 4, face()]);
      rects.push([joint + 1, y + 1, W - joint - 1, 4, face()]);
      rects.push([0, y + 1, W, 1, theme.light]);
      rects.push([0, y + 4, W, 1, theme.dark]);
      for (let n = 0; n < 3; n++) speck(0, W, y + 2 + Math.floor(rand() * 2)); // 木目
    }
  } else if (theme.style === 'stripes') {
    // たて縞のカーテン。ひだの中央を明るく、境目を暗くする
    const BAND = 6;
    for (let x = 0; x < W; x += BAND) {
      const w = Math.min(BAND, W - x);
      rects.push([x, 0, w, H, theme.faces[(x / BAND) % theme.faces.length]!]);
      rects.push([x + 2, 0, 2, H, theme.light]);
      rects.push([x, 0, 1, H, theme.dark]);
    }
    for (let i = 0; i < 20; i++) speck(0, W, Math.floor(rand() * H));
  } else {
    // 正方形のタイル（6マス + 目地1マス）
    const SZ = 6;
    rects.push([0, 0, W, H, theme.mortar]);
    for (let y = 0; y < H; y += SZ + 1) {
      for (let x = 0; x < W; x += SZ + 1) {
        const w = Math.min(SZ, W - x);
        const h = Math.min(SZ, H - y);
        rects.push([x, y, w, h, face()]);
        rects.push([x, y, w, 1, theme.light]);
        rects.push([x, y + h - 1, w, 1, theme.dark]);
        speck(x, x + w, y + 2 + Math.floor(rand() * 2));
      }
    }
  }
}

/** 部屋らしい飾り。 */
function decorate(roomId: string, rand: () => number, rects: Rect[]): void {
  const add = (x: number, y: number, w: number, h: number, fill: string) => rects.push(...wrapRects(x, y, w, h, fill));

  if (roomId === 'video') {
    // 金の房飾りと、スポットライトの光
    for (const y of [8, 58]) {
      for (let x = 1; x < W; x += 6) {
        add(x, y, 1, 4, '#e0b84a');
        add(x - 1, y + 4, 3, 1, '#b8870f');
      }
    }
    for (let i = 0; i < 5; i++) add(Math.floor(rand() * W), Math.floor(rand() * H), 1, 1, '#ffe8a0');
  } else if (roomId === 'sns') {
    // ジョッキと、ランタンの灯り
    for (const [x, y] of [[4, 14], [20, 44], [8, 74]] as const) {
      add(x, y, 4, 5, '#f6d44c');
      add(x, y + 1, 4, 1, '#ffffff');
      add(x + 4, y + 1, 1, 3, '#b8870f');
      add(x, y + 5, 4, 1, '#b8870f');
    }
    for (let i = 0; i < 8; i++) add(Math.floor(rand() * W), Math.floor(rand() * H), 1, 1, '#ffb347');
  } else if (roomId === 'news') {
    // 紙面の文字の行と、見出し
    for (let y = 3; y < H; y += 7) {
      const len = 8 + Math.floor(rand() * 14);
      add(2 + Math.floor(rand() * 4), y, len, 1, '#6e6a58');
      add(2, y + 2, 5 + Math.floor(rand() * 10), 1, '#8d8872');
    }
    for (const y of [20, 62]) add(3, y, 22, 2, '#3b3a30');
  } else if (roomId === 'study') {
    // 本棚: 棚板と、色とりどりの背表紙
    const spines = ['#cf3e32', '#4f80dc', '#58b26c', '#f6d44c', '#8a63c4', '#ee8f3a', '#de6aa6'];
    for (const base of [10, 36, 62, 88]) {
      add(0, base, W, 2, '#6e4a28');
      let x = 0;
      while (x < W) {
        const w = 2 + Math.floor(rand() * 2);
        const h = 6 + Math.floor(rand() * 3);
        const c = spines[Math.floor(rand() * spines.length)]!;
        add(x, base - h, Math.min(w, W - x), h, c);
        add(x, base - h, 1, h, '#f5f0e6');
        x += w + (rand() > 0.7 ? 1 : 0);
      }
    }
  } else if (roomId === 'shop') {
    // 日よけの縞模様と、コインのきらめき
    for (const y of [12, 62]) {
      for (let x = 0; x < W; x += 4) {
        add(x, y, 2, 5, '#cf3e32');
        add(x + 2, y, 2, 5, '#f5f0e6');
      }
      add(0, y + 5, W, 1, '#7a1f17');
    }
    for (let i = 0; i < 6; i++) add(Math.floor(rand() * W), Math.floor(rand() * H), 2, 2, '#f6d44c');
  } else if (roomId === 'dev') {
    // 回路の配線と、リベット
    for (let i = 0; i < 9; i++) {
      let x = 1 + Math.floor(rand() * (W - 2));
      const y = Math.floor(rand() * (H - 14));
      for (let j = 0; j < 12; j++) {
        add(x, y + j, 1, 1, '#4fd18b');
        if (j % 4 === 3) x += rand() > 0.5 ? 1 : -1;
        x = Math.max(0, Math.min(W - 1, x));
      }
      add(x, y + 12, 2, 2, '#9df2c4');
    }
    for (let y = 3; y < H; y += 21) for (const x of [1, W - 2]) add(x, y, 1, 1, '#c9ced6');
  } else if (roomId === 'game') {
    // 闘技場の青い旗と、金の紋章
    for (const [x, y] of [[4, 8], [20, 50]] as const) {
      add(x, y, 6, 16, '#3b66c4');
      add(x, y, 1, 16, '#2a4a94');
      add(x + 2, y + 5, 2, 4, '#f6d44c');
      add(x + 1, y + 6, 4, 2, '#f6d44c');
      add(x, y + 16, 2, 2, '#3b66c4');
      add(x + 4, y + 16, 2, 2, '#3b66c4');
    }
  } else if (roomId === 'music') {
    // 音符
    for (const [x, y] of [[5, 12], [18, 40], [8, 70], [22, 88]] as const) {
      add(x + 2, y, 1, 7, '#f0a8d0');
      add(x, y + 6, 3, 2, '#f0a8d0');
      add(x + 2, y, 3, 1, '#f0a8d0');
    }
    for (let i = 0; i < 10; i++) add(Math.floor(rand() * W), Math.floor(rand() * H), 1, 1, '#d9b3ff');
  } else if (roomId === 'travel') {
    // 道しるべの点線と、道標
    for (let y = 2; y < H; y += 6) add(Math.floor(W / 2) - 1 + (y % 12 === 2 ? 0 : 1), y, 2, 3, '#f6d44c');
    for (const y of [20, 70]) {
      add(1, y, 1, 10, '#5c3a1c');
      add(2, y + 1, 10, 4, '#b8935a');
      add(2, y + 1, 10, 1, '#e0be7a');
      add(11, y + 2, 2, 2, '#b8935a');
    }
  } else if (roomId === 'work') {
    // ギルドの旗と、貼り紙
    for (const [x, y] of [[3, 10], [21, 56]] as const) {
      add(x, y, 6, 14, '#a8281d');
      add(x + 1, y + 3, 4, 4, '#f6d44c');
      add(x + 2, y + 4, 2, 2, '#a8281d');
      add(x, y + 14, 3, 2, '#a8281d');
    }
    for (const [x, y] of [[14, 30], [7, 76], [22, 90]] as const) {
      add(x, y, 5, 6, '#f5f0e6');
      add(x + 1, y + 2, 3, 1, '#8e949e');
      add(x + 1, y + 4, 2, 1, '#8e949e');
      add(x + 2, y - 1, 1, 1, '#cf3e32');
    }
  } else {
    // 未踏の地: 木の根と、苔
    for (const x0 of [4, 14, 24]) {
      const y0 = Math.floor(rand() * 60);
      let x = x0;
      for (let y = y0; y < y0 + 22; y++) {
        add(x, y, 1, 1, y % 5 === 0 ? '#3a2814' : '#5a3d20');
        if (y % 4 === 3) x += rand() > 0.5 ? 1 : -1;
        x = Math.max(0, Math.min(W - 1, x));
      }
    }
    for (let i = 0; i < 6; i++) add(Math.floor(rand() * (W - 4)), Math.floor(rand() * H), 3 + Math.floor(rand() * 3), 1, '#4f8a4a');
  }
}

const cache = new Map<string, string>();

/**
 * 部屋（閲覧中のサイトの種類）の壁のタイル。背景に敷く CSS の url(...) 文字列。
 * 知らない部屋のIDは「未踏の地」の壁にする。
 */
export function wallUri(roomId: string): string {
  const key = roomId in THEMES ? roomId : 'other';
  const hit = cache.get(key);
  if (hit) return hit;
  const theme = THEMES[key]!;
  const rand = rng(11 + key.length * 7 + key.charCodeAt(0));
  const rects: Rect[] = [[0, 0, W, H, theme.mortar]];
  drawBase(theme, rand, rects);
  decorate(key, rand, rects);

  const body = rects.map(([x, y, w, h, f]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * CELL_PX}" height="${H * CELL_PX}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${body}</svg>`;
  const uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  cache.set(key, uri);
  return uri;
}

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
