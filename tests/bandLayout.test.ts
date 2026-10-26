import { describe, expect, it } from 'vitest';
import {
  BAND_TOP_MAX,
  BAND_WIDTH_MAX,
  BAND_WIDTH_MIN,
  STAGE_WIDTH_PX,
  TRACK_OUTER_PX,
  defaultBandLayout,
  normalizeBandLayout,
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

describe('stage size', () => {
  it('the stage and gauge keep their normal size however wide the band is; the extra width goes to the left margin', () => {
    expect(trackInset(BAND_WIDTH_MIN)).toBeGreaterThanOrEqual(12);
    expect(trackInset(56)).toBe(12);
    expect(trackInset(96)).toBe(52);
    for (let w = BAND_WIDTH_MIN; w <= BAND_WIDTH_MAX; w += 4) expect(trackInset(w) + STAGE_WIDTH_PX + TRACK_OUTER_PX).toBe(w);
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
