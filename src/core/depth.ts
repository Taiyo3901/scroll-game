/** CSSの1px = 1/96インチ = 25.4/96 mm */
export const MM_PER_CSS_PX = 25.4 / 96;

export function pxToMeters(px: number): number {
  return (px * MM_PER_CSS_PX) / 1000;
}

/** ゲーム内の深度(m) = 実際の距離(m) × DEPTH_MULTIPLIER */
export function pxToDepth(px: number, multiplier: number): number {
  return pxToMeters(px) * multiplier;
}
