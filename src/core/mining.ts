/** 調べる（発見）の開始条件。スクロールが止まっていれば発見できる。 */
export const CONDITION_KEYS = [
  'stopped', // 最後のスクロールから一定時間たっている
  'visible', // タブが表示中である
  'underDailyCap', // 今日の発見数が上限未満
  'oncePerStop', // この立ち止まりでは、まだ品を見つけていない
  'newSpot', // この場所（画面位置）では、まだ入れ物を開けていない
] as const;

export type ConditionKey = (typeof CONDITION_KEYS)[number];

export const CONDITION_LABELS: Record<ConditionKey, string> = {
  stopped: 'スクロール停止',
  visible: '表示中',
  underDailyCap: '今日の上限内',
  oncePerStop: '今回はまだ未発見',
  newSpot: '未開封の場所',
};

export interface MiningInput {
  /** 最後のスクロール（向きや原因を問わない）からの経過ms。一度もなければ Infinity */
  msSinceLastScroll: number;
  startDelayMs: number;
  visible: boolean;
  findsToday: number;
  maxFindsPerDay: number;
  /** この立ち止まりで、すでに品を見つけた（次にスクロールするまで、もう見つからない） */
  foundThisStop: boolean;
  /** この場所では、すでに入れ物を開けた（このページを開いている間だけの記録） */
  spotOpened: boolean;
}

export type ConditionResult = Record<ConditionKey, boolean>;

export function evaluateConditions(i: MiningInput): { ok: boolean; checks: ConditionResult } {
  const checks: ConditionResult = {
    stopped: i.msSinceLastScroll >= i.startDelayMs,
    visible: i.visible,
    underDailyCap: i.findsToday < i.maxFindsPerDay,
    oncePerStop: !i.foundThisStop,
    newSpot: !i.spotOpened,
  };
  return { ok: CONDITION_KEYS.every((k) => checks[k]), checks };
}

/** いまスクロールしている位置（開けた場所の判定に使う）。URLは含まない。 */
export interface SpotPos {
  /** スクロールしている枠（ページ全体、またはページ内の枠）を区別する番号 */
  elementId: number;
  scrollTop: number;
  /** 画面の高さ */
  viewportH: number;
}

export interface OpenedSpot {
  elementId: number;
  scrollTop: number;
}

/**
 * 開けた場所から、この距離（画面の高さに対する割合）より近い位置は、同じ場所として扱う。
 * 画面の約3割。少し動いただけなら同じ場所、読み進めて別の部分に来たら新しい場所になる。
 */
export const SPOT_RADIUS_VIEWPORTS = 0.3;
/** 覚えておく開けた場所の数の上限（メモリを使いすぎないため） */
export const MAX_OPENED_SPOTS = 300;

const finite = (n: number) => (Number.isFinite(n) ? n : 0);

/**
 * pos の近くに、開けた場所があれば、いちばん近いものを返す（なければ undefined）。
 * 同じ枠の中だけを比べる。この記録は、そのページを開いている間のメモリだけに置き、保存も送信もしない。
 */
export function findOpenedSpot<T extends OpenedSpot>(opened: readonly T[], pos: SpotPos): T | undefined {
  const radius = Math.max(1, finite(pos.viewportH)) * SPOT_RADIUS_VIEWPORTS;
  const top = finite(pos.scrollTop);
  let best: T | undefined;
  let bestDist = Infinity;
  for (const o of opened) {
    if (o.elementId !== pos.elementId) continue;
    const d = Math.abs(finite(o.scrollTop) - top);
    if (d < radius && d < bestDist) {
      best = o;
      bestDist = d;
    }
  }
  return best;
}
