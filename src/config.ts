/**
 * 調整が必要な数値はすべてここに集める。
 * 値は暫定。Phase 1 のデバッグ表示で実測してから決め直す（SPEC 12章）。
 */

/** true で発表向けのデモ設定に切り替わる（Phase 6 で実行時に切替できるようにする） */
export const DEMO_MODE = false;

const BASE = {
  // --- 深度 ---
  /** 実際の距離(m)に掛ける倍率。1000px ≒ 0.26m */
  DEPTH_MULTIPLIER: 30,

  // --- スクロール計測 ---
  /** ユーザー操作からこの秒数以内のスクロールだけ数える */
  INPUT_GATE_SEC: 1,
  /** content script から service worker へ距離をまとめて送る間隔 */
  BATCH_INTERVAL_SEC: 5,

  // --- 採掘（Phase 2 で使用） ---
  MINING_START_DELAY_SEC: 1,
  MINING_DURATION_SEC: 4,
  MAX_MINES_PER_DAY: 60,

  // --- 油と帰還（Phase 2 で使用） ---
  OIL_MAX: 100,
  OIL_PER_MINE: 10,
  /** 実際の距離1mあたりの消費量 */
  OIL_PER_METER: 0.02,
  AUTO_RETURN_MIN: 5,
  /** 約15分で満タン */
  OIL_RECOVER_PER_MIN: 100 / 15,
  START_OIL_MIN: 30,
  /** chrome.idle の検出間隔(秒)。最小値は15 */
  IDLE_DETECTION_SEC: 60,

  // --- 鉱石（Phase 2 で使用） ---
  RARITY_WEIGHTS: { 1: 70, 2: 25, 3: 5 } as Record<1 | 2 | 3, number>,
  RARITY_POINTS: { 1: 1, 2: 3, 3: 10 } as Record<1 | 2 | 3, number>,

  /** この値以下になるとバッジを警告色にし、右端の明かりをちらつかせる */
  OIL_LOW_THRESHOLD: 20,

  // --- 画面右端の演出 ---
  /** 帯の幅(px)。ページ側にも同じ幅の余白を取る */
  OVERLAY_WIDTH_PX: 44,

  // --- デバッグ表示 ---
  DEBUG_OVERLAY_DEFAULT: false,
  DEBUG_REFRESH_MS: 500,
};

/** デモモードで上書きする値（短時間で見せるため） */
const DEMO_OVERRIDES: Partial<typeof BASE> = {
  DEPTH_MULTIPLIER: 600,
  MINING_START_DELAY_SEC: 1,
  MINING_DURATION_SEC: 3,
};

export const CONFIG = { ...BASE, ...(DEMO_MODE ? DEMO_OVERRIDES : {}) };
