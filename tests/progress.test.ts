import { describe, expect, it } from 'vitest';
import { applyScrollBatch, initialGameState } from '../src/core/progress';

describe('applyScrollBatch', () => {
  it('adds depth and daily stats', () => {
    const s = applyScrollBatch(initialGameState(), { px: 96, skimPx: 0 }, '2026-10-14', 30);
    expect(s.depthM).toBeCloseTo(0.762, 6);
    expect(s.days['2026-10-14']).toEqual({ scrollPx: 96, skimPx: 0 });
  });
  it('skim distance is recorded as stats but never adds depth', () => {
    const s = applyScrollBatch(initialGameState(), { px: 0, skimPx: 5000 }, '2026-10-14', 30);
    expect(s.depthM).toBe(0);
    expect(s.days['2026-10-14']).toEqual({ scrollPx: 0, skimPx: 5000 });
  });
  it('accumulates across batches and days, without mutating input', () => {
    const a = initialGameState();
    const b = applyScrollBatch(a, { px: 100, skimPx: 10 }, '2026-10-14', 30);
    const c = applyScrollBatch(b, { px: 50, skimPx: 0 }, '2026-10-14', 30);
    const d = applyScrollBatch(c, { px: 10, skimPx: 0 }, '2026-10-15', 30);
    expect(a.days).toEqual({});
    expect(c.days['2026-10-14']).toEqual({ scrollPx: 150, skimPx: 10 });
    expect(d.days['2026-10-15']).toEqual({ scrollPx: 10, skimPx: 0 });
  });
  it('ignores negative or non-finite values', () => {
    const s = applyScrollBatch(initialGameState(), { px: -5, skimPx: Number.NaN }, '2026-10-14', 30);
    expect(s.depthM).toBe(0);
    expect(s.days['2026-10-14']).toEqual({ scrollPx: 0, skimPx: 0 });
  });
});
