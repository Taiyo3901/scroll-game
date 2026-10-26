import { describe, expect, it } from 'vitest';
import {
  BAND_TOP_MAX,
  BAND_WIDTH_MAX,
  BAND_WIDTH_MIN,
  STAGE_WIDTH_PX,
  TRACK_OUTER_PX,
  defaultBandLayout,
  normalizeBandLayout,
  stageWidth,
  trackInset,
} from '../src/core/bandLayout';

describe('normalizeBandLayout', () => {
  it('keeps valid values', () => {
    expect(normalizeBandLayout({ side: 'left', width: 72, top: 12 })).toEqual({ side: 'left', width: 72, top: 12 });
  });
  it('falls back to the defaults for missing or broken values', () => {
    expect(normalizeBandLayout({})).toEqual(defaultBandLayout());
    expect(normalizeBandLayout({ side: 'top', width: 'wide', top: null })).toEqual(defaultBandLayout());
    expect(normalizeBandLayout({ width: Number.NaN, top: Infinity })).toEqual(defaultBandLayout());
  });
  it('clamps to the allowed range and rounds', () => {
    expect(normalizeBandLayout({ width: 10 }).width).toBe(BAND_WIDTH_MIN);
    expect(normalizeBandLayout({ width: 9999 }).width).toBe(BAND_WIDTH_MAX);
    expect(normalizeBandLayout({ width: 60.4 }).width).toBe(60);
    expect(normalizeBandLayout({ top: -5 }).top).toBe(0);
    expect(normalizeBandLayout({ top: 99 }).top).toBe(BAND_TOP_MAX);
  });
});

describe('stageWidth', () => {
  it('is the minimum on thin bands and grows with the band, so the gauge grows too', () => {
    expect(stageWidth(BAND_WIDTH_MIN)).toBe(STAGE_WIDTH_PX);
    expect(stageWidth(56)).toBe(STAGE_WIDTH_PX);
    expect(stageWidth(96)).toBe(78);
    for (let w = BAND_WIDTH_MIN; w < BAND_WIDTH_MAX; w += 4) expect(stageWidth(w + 4)).toBeGreaterThanOrEqual(stageWidth(w));
  });
  it('the stage always fits in the band', () => {
    for (let w = BAND_WIDTH_MIN; w <= BAND_WIDTH_MAX; w += 4) expect(trackInset(w) + stageWidth(w) + TRACK_OUTER_PX).toBe(w);
  });
});

describe('trackInset', () => {
  it('leaves room for the stage on every allowed width', () => {
    for (let w = BAND_WIDTH_MIN; w <= BAND_WIDTH_MAX; w += 4) {
      expect(trackInset(w) + STAGE_WIDTH_PX + TRACK_OUTER_PX).toBeLessThanOrEqual(Math.max(w, 4 + STAGE_WIDTH_PX + TRACK_OUTER_PX));
      expect(trackInset(w)).toBeGreaterThanOrEqual(4);
    }
  });
});
