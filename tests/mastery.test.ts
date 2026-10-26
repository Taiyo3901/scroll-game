import { describe, expect, it } from 'vitest';
import { MASTERY_TIERS, masteryOf, nextMastery } from '../src/core/mastery';

describe('masteryOf', () => {
  it('rises with the number of finds', () => {
    expect(masteryOf(0).level).toBe(0);
    expect(masteryOf(2).level).toBe(0);
    expect(masteryOf(3).level).toBe(1);
    expect(masteryOf(9).level).toBe(1);
    expect(masteryOf(10).level).toBe(2);
    expect(masteryOf(30).level).toBe(3);
    expect(masteryOf(99).level).toBe(3);
    expect(masteryOf(100).level).toBe(4);
    expect(masteryOf(100000).level).toBe(4);
  });
  it('tiers are ordered and named', () => {
    for (let i = 1; i < MASTERY_TIERS.length; i++) {
      const t = MASTERY_TIERS[i]!;
      expect(t.need).toBeGreaterThan(MASTERY_TIERS[i - 1]!.need);
      expect(t.name.length).toBeGreaterThan(0);
    }
  });
  it('treats bad values as none', () => {
    expect(masteryOf(Number.NaN).level).toBe(0);
    expect(masteryOf(-5).level).toBe(0);
  });
});

describe('nextMastery', () => {
  it('says how many more finds are needed', () => {
    expect(nextMastery(1)).toMatchObject({ remaining: 2, tier: { level: 1 } });
    expect(nextMastery(3)).toMatchObject({ remaining: 7, tier: { level: 2 } });
    expect(nextMastery(100)).toBeNull();
  });
});
