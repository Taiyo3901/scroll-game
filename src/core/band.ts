/**
 * 帯の背景の移り変わり。深さが BAND_STEP_M 進むごとに、背景の色合いと飾りが変わる。
 * BAND_VARIANTS 種類を使い切ると、最初に戻って、繰り返す（既定は 100m ごと、6種類で 600m ひと回り）。
 * 階層（見つかる品のレア度や入れ物の見た目）とは別のしくみ。
 */
export const BAND_STEP_M = 100;
/** 「視覚効果を減らす」設定のときの間隔。目まぐるしい切り替わりを避ける */
export const BAND_STEP_CALM_M = 200;
export const BAND_VARIANTS = 6;

/** 背景の変化の名前（0 から順に）。 */
export const BAND_VARIANT_NAMES = ['土と根', '水と苔', '坑道の梁', '水晶', '溶岩', '深い闇'] as const;

/** 変化ごとに、壁に重ねる色。はっきり違う色合いにする。 */
export const BAND_TINTS = ['#c8843a', '#2f7fe0', '#d2a62a', '#22c4d6', '#ee4a1f', '#8a45e0'] as const;

/** 深さ（m）から、背景の変化の番号（0〜BAND_VARIANTS-1）を求める。負の値・不正な値は 0。 */
export function bandVariant(depthM: number, stepM: number = BAND_STEP_M): number {
  if (!Number.isFinite(depthM) || depthM <= 0 || !Number.isFinite(stepM) || stepM <= 0) return 0;
  return Math.floor(depthM / stepM) % BAND_VARIANTS;
}

export interface BandPosition {
  /** いまの変化の番号 */
  index: number;
  /** 次の変化の番号（最後の次は、最初に戻る） */
  next: number;
  /** いまの変化から次の変化への進み具合 0 以上 1 未満。スクロールに合わせて、少しずつ変わる */
  fraction: number;
}

/** 深さ（m）から、背景の移り変わりの連続的な位置を求める。色や飾りを、滑らかに混ぜるのに使う。 */
export function bandPosition(depthM: number, stepM: number = BAND_STEP_M): BandPosition {
  if (!Number.isFinite(depthM) || depthM <= 0 || !Number.isFinite(stepM) || stepM <= 0) {
    return { index: 0, next: 1 % BAND_VARIANTS, fraction: 0 };
  }
  const pos = depthM / stepM;
  const whole = Math.floor(pos);
  return { index: whole % BAND_VARIANTS, next: (whole + 1) % BAND_VARIANTS, fraction: pos - whole };
}
