import { describe, expect, it } from 'vitest';
import { BAND_STEP_M, BAND_TINTS, BAND_VARIANTS, BAND_VARIANT_NAMES, bandVariant } from '../src/core/band';

const STEP = BAND_STEP_M;
const LOOP = BAND_STEP_M * BAND_VARIANTS;

describe('bandVariant', () => {
  it('changes every step (50 m), through 6 variants', () => {
    expect(BAND_STEP_M).toBe(50);
    expect(BAND_VARIANTS).toBe(6);
    const edges = [0, STEP - 0.1, STEP, 2 * STEP - 0.1, 2 * STEP, 3 * STEP - 1, 3 * STEP, 4 * STEP - 1, 4 * STEP, 5 * STEP - 1, 5 * STEP, LOOP - 0.1];
    expect(edges.map(bandVariant)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('loops back to the first after one full round (300 m)', () => {
    expect(bandVariant(LOOP)).toBe(0);
    expect(bandVariant(LOOP + STEP - 0.1)).toBe(0);
    expect(bandVariant(LOOP + STEP)).toBe(1);
    expect(bandVariant(LOOP * 2)).toBe(0);
  });
  it('repeats with a period of one full round for any depth', () => {
    for (const d of [0, 17, 50, 123.4, LOOP - 0.01]) expect(bandVariant(d + LOOP * 7)).toBe(bandVariant(d));
  });
  it('always returns a valid index, even for bad input', () => {
    for (const d of [-5, Number.NaN, Infinity, -Infinity, 1e12]) {
      const v = bandVariant(d);
      expect(Number.isInteger(v) && v >= 0 && v < BAND_VARIANTS, String(d)).toBe(true);
    }
    expect(bandVariant(-5)).toBe(0);
    expect(bandVariant(Number.NaN)).toBe(0);
  });
  it('has a name and a distinct colour for every variant', () => {
    expect(BAND_VARIANT_NAMES).toHaveLength(BAND_VARIANTS);
    expect(BAND_TINTS).toHaveLength(BAND_VARIANTS);
    expect(new Set(BAND_TINTS).size).toBe(BAND_VARIANTS);
    for (const c of BAND_TINTS) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
