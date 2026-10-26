import data from '../data/actors.json';

/** 帯の中で動く絵（入れ物と探索者）。絵の元データは tools/make-actors.py が作る。 */
type Pose = 'walk' | 'search' | 'idle' | 'cheer';
/** 保存は、同じ文字が続く部分をまとめた形（tools/make-actors.py の rle）。1コマは「行/行/行」で、続く文字は「文字+個数」 */
type PackedData = {
  palette: Record<string, string>;
  containers: Record<string, string[]>;
  heroes: Record<string, Record<Pose, string[]>>;
};
const packed = data as PackedData;

/** 1コマの絵を、行ごとの文字列に戻す */
export function unpackFrame(s: string): string[] {
  return s.split('/').map((row) => row.replace(/(\D)(\d+)/g, (_, c: string, n: string) => c.repeat(Number(n))));
}

const { palette } = packed;
const unpackAll = (frames: string[]): string[][] => frames.map(unpackFrame);
const containers: Record<string, string[][]> = Object.fromEntries(Object.entries(packed.containers).map(([k, v]) => [k, unpackAll(v)]));
const heroes: Record<string, Record<Pose, string[][]>> = Object.fromEntries(
  Object.entries(packed.heroes).map(([job, poses]) => [
    job,
    Object.fromEntries(Object.entries(poses).map(([pose, frames]) => [pose, unpackAll(frames)])) as Record<Pose, string[][]>,
  ]),
);

/** 入れ物の絵の1辺のマス数（縁取りを含む）。探索者は、もっと細かい */
export const CONTAINER_SIZE = 14;
export const HERO_SIZE = 34;
export type HeroPose = Pose;

function rects(rows: string[], xOffset: number): string {
  let out = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x] as string;
      let end = x;
      while (end + 1 < row.length && row[end + 1] === c) end++;
      const fill = palette[c];
      if (c !== '.' && fill) out += `<rect x="${x + xOffset}" y="${y}" width="${end - x + 1}" height="1" fill="${fill}"/>`;
      x = end + 1;
    }
  });
  return out;
}

/** いくつかの絵を横につないだ1枚の絵（data URI）。アニメーションは CSS の steps で切り替える。 */
function sheetUri(frames: string[][], size: number): string {
  const w = size * frames.length;
  const body = frames.map((rows, i) => rects(rows, i * size)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${size}" shape-rendering="crispEdges">${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const cache = new Map<string, string | null>();
const cached = (key: string, make: () => string | null): string | null => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) ?? null;
};

/** 入れ物の絵のコマ数 */
export function containerFrameCount(key: string): number {
  return containers[key]?.length ?? 0;
}

/** 入れ物の1コマ。key は "chest:cave" や "box:video" の形。なければ null。 */
export function containerFrameUri(key: string, frame: number): string | null {
  return cached(`c|${key}|${frame}`, () => {
    const rows = containers[key]?.[frame];
    return rows ? sheetUri([rows], CONTAINER_SIZE) : null;
  });
}

/** 探索者の動き（コマを横につないだ絵）と、そのコマ数。職業が未登録なら標準の見た目。 */
export function heroSheet(job: string, pose: Pose): { uri: string; frames: number } {
  const frames = (heroes[job] ?? heroes.default)![pose];
  const uri = cached(`h|${heroes[job] ? job : 'default'}|${pose}`, () => sheetUri(frames, HERO_SIZE)) as string;
  return { uri, frames: frames.length };
}

export const ACTOR_CONTAINER_KEYS = Object.keys(containers);
export const ACTOR_HERO_JOBS = Object.keys(heroes);
export const ACTOR_PALETTE = palette;
export const containerFrames = (key: string): string[][] | undefined => containers[key];
export const heroFrames = (job: string, pose: Pose): string[][] | undefined => heroes[job]?.[pose];
