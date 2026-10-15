export type Mode = 'surface' | 'exploring';

export interface DayStats {
  /** 深度に数えたスクロール距離(px) */
  scrollPx: number;
  /** 流し読みと判定された距離(px)。深度には数えない */
  skimPx: number;
  mines: number;
  /** 地上に戻って図鑑に登録した鉱石のポイント合計 */
  points: number;
  selfReturns: number;
  forcedReturns: number;
}

export interface MinedEvent {
  seq: number;
  at: number;
  kind: 'mined';
  oreId: string;
}

export interface ReturnedEvent {
  seq: number;
  at: number;
  kind: 'returned';
  how: 'manual' | 'auto' | 'forced';
  registered: number;
  lost: number;
  points: number;
}

export type GameEvent = MinedEvent | ReturnedEvent;

export interface GameState {
  version: 2;
  /** 累積深度(m)。探検ごとにリセットしない */
  depthM: number;
  mode: Mode;
  /** oilUpdatedAt 時点の油の量。地上にいる間は時間とともに回復する（currentOil で計算） */
  oil: number;
  oilUpdatedAt: number;
  /** バッグ: 鉱石ID → 個数 */
  bag: Record<string, number>;
  /** 図鑑: 鉱石ID → 所持数 */
  collection: Record<string, number>;
  /** ローカル日付キー(YYYY-MM-DD) → その日の統計 */
  days: Record<string, DayStats>;
  /** 最後にスクロールまたは採掘した時刻(ms)。自動帰還の判定に使う */
  lastActivityAt: number;
  lastMineAt: number;
  /** 画面の演出用。新しいものが後ろ。最大 MAX_EVENTS 件 */
  events: GameEvent[];
}

export const MAX_EVENTS = 5;

export const emptyDay = (): DayStats => ({
  scrollPx: 0,
  skimPx: 0,
  mines: 0,
  points: 0,
  selfReturns: 0,
  forcedReturns: 0,
});

export function initialGameState(now: number, oilMax: number): GameState {
  return {
    version: 2,
    depthM: 0,
    mode: 'surface',
    oil: oilMax,
    oilUpdatedAt: now,
    bag: {},
    collection: {},
    days: {},
    lastActivityAt: now,
    lastMineAt: 0,
    events: [],
  };
}

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

function counts(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof v !== 'object' || v === null) return out;
  for (const [k, n] of Object.entries(v)) {
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
  }
  return out;
}

/** 保存データを読み込むとき、古い版（Phase 1 の version 1）や壊れた値を安全な形にする。 */
export function normalizeState(raw: unknown, now: number, oilMax: number): GameState {
  const base = initialGameState(now, oilMax);
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Record<string, unknown>;

  const days: Record<string, DayStats> = {};
  if (typeof r.days === 'object' && r.days !== null) {
    for (const [k, v] of Object.entries(r.days)) {
      const d = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
      days[k] = {
        scrollPx: num(d.scrollPx, 0),
        skimPx: num(d.skimPx, 0),
        mines: num(d.mines, 0),
        points: num(d.points, 0),
        selfReturns: num(d.selfReturns, 0),
        forcedReturns: num(d.forcedReturns, 0),
      };
    }
  }

  return {
    ...base,
    depthM: Math.max(0, num(r.depthM, 0)),
    mode: r.mode === 'exploring' ? 'exploring' : 'surface',
    oil: Math.min(oilMax, Math.max(0, num(r.oil, oilMax))),
    oilUpdatedAt: num(r.oilUpdatedAt, now),
    bag: counts(r.bag),
    collection: counts(r.collection),
    days,
    lastActivityAt: num(r.lastActivityAt, now),
    lastMineAt: num(r.lastMineAt, 0),
    events: Array.isArray(r.events) ? (r.events as GameEvent[]).slice(-MAX_EVENTS) : [],
  };
}
