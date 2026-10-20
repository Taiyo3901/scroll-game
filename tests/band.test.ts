import { describe, expect, it } from 'vitest';
import { BAND_STEP_M, BAND_TINTS, BAND_VARIANTS, BAND_VARIANT_NAMES, bandVariant } from '../src/core/band';

describe('bandVariant', () => {
  it('changes every 50 m, through 6 variants', () => {
    expect(BAND_STEP_M).toBe(50);
    expect(BAND_VARIANTS).toBe(6);
    expect([0, 49.9, 50, 99.9, 100, 149, 150, 199, 200, 249, 250, 299.9].map(bandVariant)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('loops back to the first after 300 m', () => {
    expect(bandVariant(300)).toBe(0);
    expect(bandVariant(349.9)).toBe(0);
    expect(bandVariant(350)).toBe(1);
    expect(bandVariant(600)).toBe(0);
    expect(bandVariant(1500)).toBe(0);
    expect(bandVariant(1550)).toBe(1);
  });
  it('repeats with a period of 300 m for any depth', () => {
    for (const d of [0, 17, 50, 123.4, 299.99]) expect(bandVariant(d + 300 * 7)).toBe(bandVariant(d));
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
