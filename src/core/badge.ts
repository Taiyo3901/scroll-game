import type { GameState } from './state';

export type BadgeKind = 'surface' | 'exploring' | 'lowOil';

export const BADGE_COLORS: Record<BadgeKind, string> = {
  surface: '#607d8b',
  exploring: '#3b7a57',
  lowOil: '#e65100',
};

/** 地上 / 探検中 / 油切れ間近 で背景色を変える。oil は currentOil で計算した現在値。 */
export function badgeKind(s: GameState, oil: number, lowOilThreshold: number): BadgeKind {
  if (s.mode === 'surface') return 'surface';
  return oil <= lowOilThreshold ? 'lowOil' : 'exploring';
}
