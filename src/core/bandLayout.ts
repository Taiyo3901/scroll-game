/**
 * 帯の置き場所の設定: 左右どちら側か、幅(px)、上の余白(画面の高さに対する%)。
 * 保存された値が壊れていても、使える範囲に収める。
 */

export type BandSide = 'right' | 'left';

export interface BandLayout {
  side: BandSide;
  /** 帯の幅(px) */
  width: number;
  /** 帯の上の余白（画面の高さの%） */
  top: number;
}

export const BAND_WIDTH_MIN = 48;
export const BAND_WIDTH_MAX = 104;
export const BAND_WIDTH_STEP = 4;
export const BAND_WIDTH_DEFAULT = 56;
export const BAND_TOP_MIN = 0;
export const BAND_TOP_MAX = 30;
export const BAND_TOP_DEFAULT = 7;

export const defaultBandLayout = (): BandLayout => ({ side: 'right', width: BAND_WIDTH_DEFAULT, top: BAND_TOP_DEFAULT });

const clampInt = (raw: unknown, min: number, max: number, fallback: number): number => {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
};

export function normalizeBandLayout(raw: { side?: unknown; width?: unknown; top?: unknown }): BandLayout {
  return {
    side: raw.side === 'left' ? 'left' : 'right',
    width: clampInt(raw.width, BAND_WIDTH_MIN, BAND_WIDTH_MAX, BAND_WIDTH_DEFAULT),
    top: clampInt(raw.top, BAND_TOP_MIN, BAND_TOP_MAX, BAND_TOP_DEFAULT),
  };
}

/** 探索者の枠の最小の幅（探索者の絵が34px）。右の目盛りは6px、左の余白は、ふつう12px（狭いときは、最小4px） */
export const STAGE_WIDTH_PX = 38;
export const TRACK_OUTER_PX = 6;
const TRACK_INSET_PX = 12;

/** 探索者の枠（探索者・入れ物・ゲージが入る）の幅。帯が広いほど広がり、ゲージも長くなる。 */
export function stageWidth(width: number): number {
  return Math.max(STAGE_WIDTH_PX, width - TRACK_INSET_PX - TRACK_OUTER_PX);
}

/** 帯の左の余白 = 帯の幅 - 枠の幅 - 右の目盛り（最小4px） */
export function trackInset(width: number): number {
  return Math.max(4, width - stageWidth(width) - TRACK_OUTER_PX);
}
