import { describe, expect, it } from 'vitest';
import { drawOre } from '../src/core/loot';
import { CATALOG } from '../src/data';
import { oresOf } from '../src/core/strata';

const weights = { 1: 70, 2: 25, 3: 5 } as const;
const topsoil = oresOf(CATALOG, 'topsoil');

describe('drawOre', () => {
  it('picks by cumulative weight (70 / 25 / 5)', () => {
    expect(drawOre(topsoil, weights, () => 0)?.rarity).toBe(1);
    expect(drawOre(topsoil, weights, () => 0.6999)?.rarity).toBe(1);
    expect(drawOre(topsoil, weights, () => 0.7)?.rarity).toBe(2);
    expect(drawOre(topsoil, weights, () => 0.9499)?.rarity).toBe(2);
    expect(drawOre(topsoil, weights, () => 0.95)?.rarity).toBe(3);
    expect(drawOre(topsoil, weights, () => 0.999999)?.rarity).toBe(3);
  });

  it('empirical distribution is close to the weights', () => {
    let seed = 12345;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const counts = { 1: 0, 2: 0, 3: 0 };
    const n = 20000;
    for (let i = 0; i < n; i++) counts[drawOre(topsoil, weights, rng)!.rarity]++;
    expect(counts[1] / n).toBeGreaterThan(0.67);
    expect(counts[1] / n).toBeLessThan(0.73);
    expect(counts[3] / n).toBeGreaterThan(0.035);
    expect(counts[3] / n).toBeLessThan(0.065);
  });

  it('returns null for no candidates or all-zero weights', () => {
    expect(drawOre([], weights, () => 0.5)).toBeNull();
    expect(drawOre(topsoil, { 1: 0, 2: 0, 3: 0 }, () => 0.5)).toBeNull();
  });

  it('never returns a rarity with weight 0', () => {
    for (const r of [0, 0.3, 0.99]) {
      expect(drawOre(topsoil, { 1: 1, 2: 0, 3: 0 }, () => r)?.rarity).toBe(1);
    }
  });
});
