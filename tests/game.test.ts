import { describe, expect, it } from 'vitest';
import { applyFind, applyScroll, findsToday, type Env, type Rules } from '../src/core/game';
import { drawItem, SECRET_CHANCE } from '../src/core/loot';
import { initialGameState, normalizeState, MAX_EVENTS, type GameState } from '../src/core/state';
import { areaAt, findItem } from '../src/core/catalog';
import { CATALOG } from '../src/data';

const RULES: Rules = {
  depthMultiplier: 30,
  maxFindsPerDay: 5,
  minFindIntervalMs: 2000,
  rarityPoints: { 1: 1, 2: 3, 3: 10 },
};
const env = (rng: () => number = () => 0.5): Env => ({ rules: RULES, catalog: CATALOG, rng });
const DAY = '2026-10-19';
const T0 = 1_000_000;

/** 乱数列を順に返す */
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[Math.min(i++, v.length - 1)] ?? 0;
};

describe('applyScroll', () => {
  it('adds depth (real meters x multiplier) and records the distance', () => {
    const s = applyScroll(initialGameState(), { px: 3779.52756 }, DAY, env()); // 1m real
    expect(s.depthM).toBeCloseTo(30, 3);
    expect(s.days[DAY]?.scrollPx).toBeCloseTo(3779.52756, 3);
  });
  it('ignores zero, negative and non-finite distances', () => {
    const s0 = initialGameState();
    expect(applyScroll(s0, { px: 0 }, DAY, env())).toBe(s0);
    expect(applyScroll(s0, { px: -5 }, DAY, env())).toBe(s0);
    expect(applyScroll(s0, { px: Number.NaN }, DAY, env())).toBe(s0);
  });
});

describe('applyFind', () => {
  it('adds the item straight to the collection, with points, room count and an event', () => {
    const s = applyFind(initialGameState(), 'video', T0, DAY, env(seq(0.5, 0)));
    const id = Object.keys(s.collection)[0]!;
    const item = findItem(CATALOG, id)!;
    expect(item.genreId).toBe('video');
    expect(s.collection[id]).toBe(1);
    expect(s.days[DAY]).toMatchObject({ finds: 1, points: RULES.rarityPoints[item.rarity], genreFinds: { video: 1 } });
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ kind: 'found', itemId: id, seq: 1 });
    expect(s.lastFindAt).toBe(T0);
  });

  it('an unknown or malicious room id counts as the fallback room', () => {
    for (const bad of ['nope', 42, null, undefined, '__proto__']) {
      const s = applyFind(initialGameState(), bad, T0, DAY, env(seq(0.5, 0)));
      expect(s.days[DAY]?.genreFinds).toEqual({ other: 1 });
      expect(Object.keys(s.collection).every((id) => findItem(CATALOG, id)?.genreId === 'other')).toBe(true);
    }
  });

  it('rejects a second report that comes too soon, accepts it once the interval has passed', () => {
    const a = applyFind(initialGameState(), 'dev', T0, DAY, env());
    expect(applyFind(a, 'dev', T0 + 1999, DAY, env())).toBe(a);
    expect(applyFind(a, 'dev', T0 + 2000, DAY, env())).not.toBe(a);
  });

  it('stops at the daily cap, and the next day starts fresh', () => {
    let s: GameState = initialGameState();
    for (let i = 0; i < 8; i++) s = applyFind(s, 'dev', T0 + i * 5000, DAY, env());
    expect(findsToday(s, DAY)).toBe(5);
    expect(applyFind(s, 'dev', T0 + 99_000, DAY, env())).toBe(s);
    expect(findsToday(applyFind(s, 'dev', T0 + 99_000, '2026-10-20', env()), '2026-10-20')).toBe(1);
  });

  it('keeps only the latest MAX_EVENTS events, with increasing seq', () => {
    let s: GameState = initialGameState();
    const big: Rules = { ...RULES, maxFindsPerDay: 99 };
    for (let i = 0; i < MAX_EVENTS + 3; i++) s = applyFind(s, 'dev', T0 + i * 5000, DAY, { ...env(), rules: big });
    expect(s.events).toHaveLength(MAX_EVENTS);
    expect(s.events[s.events.length - 1]!.seq).toBe(MAX_EVENTS + 3);
  });
});

describe('drawItem', () => {
  const cave = areaAt(CATALOG.areas, 0);
  const abyss = areaAt(CATALOG.areas, 5000);

  it('returns the area secret when the secret roll hits (just under SECRET_CHANCE)', () => {
    expect(drawItem(CATALOG, 'video', cave, seq(SECRET_CHANCE - 0.001))?.id).toBe('secret-cave');
    expect(drawItem(CATALOG, 'video', abyss, seq(0))?.id).toBe('secret-abyss');
  });

  it('draws from the current room only when the secret roll misses', () => {
    const roll = seq(SECRET_CHANCE, 0.2, 0);
    expect(drawItem(CATALOG, 'shop', cave, roll)?.genreId).toBe('shop');
  });

  it('picks rarity by weight first, then evenly among the items of that rarity', () => {
    // 洞窟の重み 70/25/5 → 0.5*100=50 は★1、その中の先頭
    const a = drawItem(CATALOG, 'dev', cave, seq(0.99, 0.5, 0))!;
    expect(a.rarity).toBe(1);
    // 0.8*100=80 → ★2（70〜95）
    expect(drawItem(CATALOG, 'dev', cave, seq(0.99, 0.8, 0))!.rarity).toBe(2);
    // 0.97*100 → ★3
    expect(drawItem(CATALOG, 'dev', cave, seq(0.99, 0.97, 0))!.rarity).toBe(3);
  });

  it('3-star items are found more often in deeper areas (statistical, fixed seed)', () => {
    let x = 12345;
    const rng = () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const share = (area: typeof cave) => {
      let n3 = 0;
      for (let i = 0; i < 4000; i++) if (drawItem(CATALOG, 'dev', area, rng)!.rarity === 3) n3++;
      return n3 / 4000;
    };
    expect(share(abyss)).toBeGreaterThan(share(cave) + 0.1);
  });

  it('returns null for a room with no items', () => {
    expect(drawItem({ ...CATALOG, items: [] }, 'dev', cave, seq(0.99, 0.5))).toBeNull();
  });
});

describe('normalizeState', () => {
  it('keeps depth and scroll distance from an older (ore) save, but not the old collection', () => {
    const v2 = {
      version: 2,
      depthM: 12.5,
      mode: 'exploring',
      oil: 50,
      bag: { pebble: 2 },
      collection: { pebble: 3 },
      days: { [DAY]: { scrollPx: 100, mines: 4, points: 9, selfReturns: 1, forcedReturns: 0 } },
    };
    const s = normalizeState(v2);
    expect(s.version).toBe(3);
    expect(s.depthM).toBe(12.5);
    expect(s.collection).toEqual({});
    expect(s.days[DAY]).toEqual({ scrollPx: 100, finds: 0, points: 0, genreFinds: {} });
    expect(s).not.toHaveProperty('oil');
    expect(s).not.toHaveProperty('bag');
  });
  it('round-trips a current save and sanitizes bad values', () => {
    const cur = {
      version: 3,
      depthM: -5,
      collection: { a: 2, b: -1, c: 'x', d: 1.9 },
      days: { [DAY]: { scrollPx: 10, finds: 2, points: 3, genreFinds: { video: 2, bad: 'x' } } },
      lastFindAt: 7,
      events: [{ seq: 1, at: 1, kind: 'found', itemId: 'a' }, { kind: 'returned' }],
    };
    const s = normalizeState(cur);
    expect(s.depthM).toBe(0);
    expect(s.collection).toEqual({ a: 2, d: 1 });
    expect(s.days[DAY]).toEqual({ scrollPx: 10, finds: 2, points: 3, genreFinds: { video: 2 } });
    expect(s.events).toHaveLength(1);
    expect(normalizeState(null)).toEqual(initialGameState());
    expect(normalizeState('junk')).toEqual(initialGameState());
  });
});
