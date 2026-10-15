import { describe, expect, it } from 'vitest';
import { pxToMeters, pxToDepth } from '../src/core/depth';

describe('depth', () => {
  it('96 CSS px is 1 inch = 25.4mm', () => {
    expect(pxToMeters(96)).toBeCloseTo(0.0254, 6);
  });
  it('applies the multiplier to the real distance', () => {
    expect(pxToDepth(96, 30)).toBeCloseTo(0.762, 6);
  });
  it('zero in, zero out', () => {
    expect(pxToDepth(0, 30)).toBe(0);
  });
});
