/**
 * 帯の背景の移り変わり。深さが BAND_STEP_M 進むごとに、背景の色合いと飾りが変わる。
 * BAND_VARIANTS 種類を使い切ると、最初に戻って、繰り返す（既定は 25m ごと、6種類で 150m ひと回り）。
 * 階層（見つかる品のレア度や入れ物の見た目）とは別のしくみ。
 */
export const BAND_STEP_M = 25;
export const BAND_VARIANTS = 6;

/** 背景の変化の名前（0 から順に）。 */
export const BAND_VARIANT_NAMES = ['土と根', '水と苔', '坑道の梁', '水晶', '溶岩', '深い闇'] as const;

/** 変化ごとに、壁に重ねる色。はっきり違う色合いにする。 */
export const BAND_TINTS = ['#c8843a', '#2f7fe0', '#d2a62a', '#22c4d6', '#ee4a1f', '#8a45e0'] as const;

/** 深さ（m）から、背景の変化の番号（0〜BAND_VARIANTS-1）を求める。負の値・不正な値は 0。 */
export function bandVariant(depthM: number): number {
  if (!Number.isFinite(depthM) || depthM <= 0) return 0;
  return Math.floor(depthM / BAND_STEP_M) % BAND_VARIANTS;
}
