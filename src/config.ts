/**
 * 調整が必要な数値はすべてここに集める。
 * 値は暫定。実際に遊んでから決め直す（SPEC 12章）。
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

  // --- 調べる（発見） ---
  /** スクロールが止まってから、ゲージがたまり始めるまで */
  FIND_START_DELAY_SEC: 1,
  /** ゲージが満タンになるまで */
  FIND_DURATION_SEC: 4,
  /** 1日の発見数の上限（ランキングの不正値を見分ける基準。普通に遊んで届かない数） */
  MAX_FINDS_PER_DAY: 300,

  // --- 発見品 ---
  RARITY_POINTS: { 1: 1, 2: 3, 3: 10 } as Record<1 | 2 | 3, number>,

  // --- 画面右端の演出 ---
  /** 帯の幅(px)。ページ側にも同じ幅の余白を取る */
  OVERLAY_WIDTH_PX: 44,

  // --- デバッグ表示 ---
  DEBUG_OVERLAY_DEFAULT: false,
};

/** デモモードで上書きする値（短時間で見せるため） */
const DEMO_OVERRIDES: Partial<typeof BASE> = {
  DEPTH_MULTIPLIER: 600,
  FIND_START_DELAY_SEC: 1,
  FIND_DURATION_SEC: 2,
};

export const CONFIG = { ...BASE, ...(DEMO_MODE ? DEMO_OVERRIDES : {}) };
