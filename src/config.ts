/**
 * 調整が必要な数値はすべてここに集める。
 * 値は暫定。実際に遊んでから決め直す（SPEC 12章）。
 */

const BASE = {
  // --- 深度 ---
  /** 実際の距離(m)に掛ける倍率。1000px ≒ 0.26m なので、1000px のスクロールで約 26m 進む */
  DEPTH_MULTIPLIER: 100,

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

  // --- 入れ物（立ち止まると1つ現れる。1回の立ち止まりで見つかる品は1つだけ） ---
  /** 入れ物の出やすさ。平均すると、レア度の出方がほぼ変わらないように倍率を決めている */
  CONTAINER_WEIGHTS: { pot: 45, box: 40, chest: 15 } as Record<'pot' | 'box' | 'chest', number>,
  /** ★1・★2・★3 の重みに掛ける倍率 */
  CONTAINER_RARITY_MULT: {
    pot: [1.2, 0.7, 0.3],
    box: [1, 1, 1],
    chest: [0.6, 1.5, 2.5],
  } as Record<'pot' | 'box' | 'chest', [number, number, number]>,
  /** 宝箱が、実はミミックだった確率 */
  MIMIC_IN_CHEST: 0.12,

  // --- フレンド・同期（Phase 4） ---
  /** Firestore へ、変化があれば送る間隔（分）。無料枠を使いすぎないように */
  SYNC_INTERVAL_MIN: 15,

  // --- 画面右端の演出 ---
  /** 帯の幅(px)。ページ側にも同じ幅の余白を取る */
  OVERLAY_WIDTH_PX: 64,

  // --- デバッグ表示 ---
  DEBUG_OVERLAY_DEFAULT: false,
};

/**
 * デモモードで上書きする値（発表で、短い時間に見せるため）。
 * 深度は20倍の速さで進み、物色は2秒、宝箱とミミックが出やすい。
 * デモ中のデータは、本番のデータとは別の場所に保存し、ランキングにも送らない。
 */
const DEMO_OVERRIDES: Partial<typeof BASE> = {
  DEPTH_MULTIPLIER: 2000,
  FIND_START_DELAY_SEC: 1,
  FIND_DURATION_SEC: 2,
  MAX_FINDS_PER_DAY: 9999,
  CONTAINER_WEIGHTS: { pot: 25, box: 30, chest: 45 },
  MIMIC_IN_CHEST: 0.3,
};

export type Config = typeof BASE;

/** 設定値。demo が true ならデモ用の値で上書きする（実行中に切り替えられる）。 */
export function configFor(demo: boolean): Config {
  return demo ? { ...BASE, ...DEMO_OVERRIDES } : BASE;
}

/** 本番の設定値 */
export const CONFIG: Config = configFor(false);
