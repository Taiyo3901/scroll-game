import { describe, expect, it } from 'vitest';
import { BAND_STEP_CALM_M, BAND_STEP_M, BAND_TINTS, BAND_VARIANTS, bandPosition } from '../src/core/band';

const STEP = BAND_STEP_M;
const LOOP = BAND_STEP_M * BAND_VARIANTS;
const index = (d: number, step?: number) => bandPosition(d, step).index;

describe('band variants', () => {
  it('changes every step (100 m), through 6 variants', () => {
    expect(BAND_STEP_M).toBe(100);
    expect(BAND_VARIANTS).toBe(6);
    const edges = [0, STEP - 0.1, STEP, 2 * STEP - 0.1, 2 * STEP, 3 * STEP - 1, 3 * STEP, 4 * STEP - 1, 4 * STEP, 5 * STEP - 1, 5 * STEP, LOOP - 0.1];
    expect(edges.map((d) => index(d))).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('loops back to the first after one full round', () => {
    expect(index(LOOP)).toBe(0);
    expect(index(LOOP + STEP - 0.1)).toBe(0);
    expect(index(LOOP + STEP)).toBe(1);
    expect(index(LOOP * 2)).toBe(0);
  });
  it('repeats with a period of one full round for any depth', () => {
    for (const d of [0, 17, 50, 123.4, LOOP - 0.01]) expect(index(d + LOOP * 7)).toBe(index(d));
  });
  it('a calmer step can be used for reduced-motion settings, and bad steps fall back to the first variant', () => {
    expect(BAND_STEP_CALM_M).toBeGreaterThan(BAND_STEP_M);
    expect(index(BAND_STEP_CALM_M - 1, BAND_STEP_CALM_M)).toBe(0);
    expect(index(BAND_STEP_CALM_M, BAND_STEP_CALM_M)).toBe(1);
    expect(index(100, 0)).toBe(0);
    expect(index(100, -5)).toBe(0);
    expect(index(100, Number.NaN)).toBe(0);
  });
  it('has a distinct colour for every variant', () => {
    expect(BAND_TINTS).toHaveLength(BAND_VARIANTS);
    expect(new Set(BAND_TINTS).size).toBe(BAND_VARIANTS);
    for (const c of BAND_TINTS) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('bandPosition', () => {
  it('moves smoothly: the fraction grows with depth and wraps to the next variant', () => {
    expect(bandPosition(0)).toEqual({ index: 0, next: 1, fraction: 0 });
    const half = bandPosition(BAND_STEP_M * 0.5);
    expect(half.index).toBe(0);
    expect(half.next).toBe(1);
    expect(half.fraction).toBeCloseTo(0.5, 10);
    const next = bandPosition(BAND_STEP_M * 1.25);
    expect(next.index).toBe(1);
    expect(next.next).toBe(2);
    expect(next.fraction).toBeCloseTo(0.25, 10);
  });
  it('the last variant blends into the first', () => {
    const last = bandPosition(BAND_STEP_M * (BAND_VARIANTS - 1) + 0.3 * BAND_STEP_M);
    expect(last.index).toBe(BAND_VARIANTS - 1);
    expect(last.next).toBe(0);
  });
  it('the fraction is always in [0, 1) and indices are valid, even for bad input', () => {
    for (const d of [-3, Number.NaN, Infinity, -Infinity, 0.0001, 1e9 + 0.5, 1e12]) {
      const p = bandPosition(d);
      expect(p.fraction >= 0 && p.fraction < 1, String(d)).toBe(true);
      expect(p.index >= 0 && p.index < BAND_VARIANTS && p.next >= 0 && p.next < BAND_VARIANTS, String(d)).toBe(true);
    }
    expect(bandPosition(5, 0).fraction).toBe(0);
  });
  it('a calmer step stretches the same movement over more depth', () => {
    expect(bandPosition(BAND_STEP_CALM_M * 0.5, BAND_STEP_CALM_M).fraction).toBeCloseTo(0.5, 10);
  });
});
