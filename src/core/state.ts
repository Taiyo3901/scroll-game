export interface DayStats {
  /** 深度に数えたスクロール距離(px) */
  scrollPx: number;
  /** 見つけた品の数 */
  finds: number;
  /** 獲得ポイントの合計 */
  points: number;
  /** 部屋ごとの発見数 */
  genreFinds: Record<string, number>;
}

export interface FoundEvent {
  seq: number;
  at: number;
  kind: 'found';
  itemId: string;
}

export type GameEvent = FoundEvent;

export interface GameState {
  version: 3;
  /** 累積深度(m) */
  depthM: number;
  /** 図鑑: 発見品ID → 所持数 */
  collection: Record<string, number>;
  /** ローカル日付キー(YYYY-MM-DD) → その日の統計 */
  days: Record<string, DayStats>;
  lastFindAt: number;
  /** 画面の演出用。新しいものが後ろ。最大 MAX_EVENTS 件 */
  events: GameEvent[];
}

export const MAX_EVENTS = 5;

export const emptyDay = (): DayStats => ({ scrollPx: 0, finds: 0, points: 0, genreFinds: {} });

export function initialGameState(): GameState {
  return { version: 3, depthM: 0, collection: {}, days: {}, lastFindAt: 0, events: [] };
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

/**
 * 保存データを読み込むときの整形。壊れた値を安全な形にする。
 * 旧版（鉱石の version 1・2）からは、深度とスクロール距離だけ引き継ぎ、図鑑は引き継がない。
 */
export function normalizeState(raw: unknown): GameState {
  const base = initialGameState();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const isCurrent = r.version === 3;

  const days: Record<string, DayStats> = {};
  if (typeof r.days === 'object' && r.days !== null) {
    for (const [k, v] of Object.entries(r.days)) {
      const d = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
      days[k] = {
        scrollPx: num(d.scrollPx, 0),
        finds: isCurrent ? num(d.finds, 0) : 0,
        points: isCurrent ? num(d.points, 0) : 0,
        genreFinds: isCurrent ? counts(d.genreFinds) : {},
      };
    }
  }

  return {
    ...base,
    depthM: Math.max(0, num(r.depthM, 0)),
    collection: isCurrent ? counts(r.collection) : {},
    days,
    lastFindAt: isCurrent ? num(r.lastFindAt, 0) : 0,
    events:
      isCurrent && Array.isArray(r.events)
        ? (r.events as GameEvent[]).filter((e) => e && e.kind === 'found').slice(-MAX_EVENTS)
        : [],
  };
}
