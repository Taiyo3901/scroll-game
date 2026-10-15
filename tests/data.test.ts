import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data';
import { oresOf, stratumAt } from '../src/core/strata';

describe('data/strata.json and ores.json', () => {
  it('strata are sorted by depth, start at 0, with unique ids and colors', () => {
    const { strata } = CATALOG;
    expect(strata[0]?.startDepthM).toBe(0);
    for (let i = 1; i < strata.length; i++) {
      expect(strata[i]!.startDepthM).toBeGreaterThan(strata[i - 1]!.startDepthM);
    }
    expect(new Set(strata.map((s) => s.id)).size).toBe(strata.length);
    for (const s of strata) expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('every stratum has exactly one ore of each rarity 1-3', () => {
    for (const s of CATALOG.strata) {
      const rarities = oresOf(CATALOG, s.id)
        .map((o) => o.rarity)
        .sort();
      expect(rarities, s.name).toEqual([1, 2, 3]);
    }
  });

  it('ore ids are unique, every ore points to a real stratum, and has a description', () => {
    const ids = CATALOG.ores.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    const strataIds = new Set(CATALOG.strata.map((s) => s.id));
    for (const o of CATALOG.ores) {
      expect(strataIds.has(o.stratumId), o.id).toBe(true);
      expect(o.name.length).toBeGreaterThan(0);
      // 解説文は2〜3文
      const sentences = o.description.split('。').filter((x) => x.length > 0);
      expect(sentences.length, o.id).toBeGreaterThanOrEqual(2);
      expect(sentences.length, o.id).toBeLessThanOrEqual(3);
    }
  });

  it('matches the SPEC table: 18 ores in 6 strata', () => {
    expect(CATALOG.strata).toHaveLength(6);
    expect(CATALOG.ores).toHaveLength(18);
  });
});

describe('stratumAt', () => {
  const { strata } = CATALOG;
  it('uses the boundary depth as the start of the next stratum', () => {
    expect(stratumAt(strata, 0).id).toBe('topsoil');
    expect(stratumAt(strata, 49.9).id).toBe('topsoil');
    expect(stratumAt(strata, 50).id).toBe('quaternary');
    expect(stratumAt(strata, 1499).id).toBe('jurassic');
    expect(stratumAt(strata, 1500).id).toBe('paleozoic');
    expect(stratumAt(strata, 99999).id).toBe('paleozoic');
  });
  it('treats negative / NaN depth as the surface layer', () => {
    expect(stratumAt(strata, -5).id).toBe('topsoil');
    expect(stratumAt(strata, Number.NaN).id).toBe('topsoil');
  });
});
