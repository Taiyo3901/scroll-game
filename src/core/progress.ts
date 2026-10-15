import { pxToDepth } from './depth';

export interface DayStats {
  /** 深度に数えたスクロール距離(px) */
  scrollPx: number;
  /** 流し読みと判定された距離(px)。深度には数えない */
  skimPx: number;
}

export interface GameState {
  version: 1;
  /** 累積深度(m)。探検ごとにリセットしない */
  depthM: number;
  /** ローカル日付キー(YYYY-MM-DD) → その日の統計 */
  days: Record<string, DayStats>;
}

export interface ScrollBatch {
  px: number;
  skimPx: number;
}

export function initialGameState(): GameState {
  return { version: 1, depthM: 0, days: {} };
}

const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function applyScrollBatch(
  state: GameState,
  batch: ScrollBatch,
  dayKey: string,
  depthMultiplier: number,
): GameState {
  const px = clean(batch.px);
  const skimPx = clean(batch.skimPx);
  const prev = state.days[dayKey] ?? { scrollPx: 0, skimPx: 0 };
  return {
    ...state,
    depthM: state.depthM + pxToDepth(px, depthMultiplier),
    days: {
      ...state.days,
      [dayKey]: { scrollPx: prev.scrollPx + px, skimPx: prev.skimPx + skimPx },
    },
  };
}
