import { describe, expect, it } from 'vitest';
import {
  applyMine,
  applyScroll,
  checkAutoReturn,
  currentOil,
  returnToSurface,
  settleOil,
  type Env,
  type Rules,
} from '../src/core/game';
import { initialGameState, normalizeState, type GameState } from '../src/core/state';
import { CATALOG } from '../src/data';

const rules: Rules = {
  depthMultiplier: 30,
  oilMax: 100,
  oilPerMine: 10,
  oilPerMeter: 0.02,
  oilRecoverPerMin: 100 / 15,
  startOilMin: 30,
  maxMinesPerDay: 3,
  autoReturnMin: 5,
  miningMinIntervalMs: 4000,
  rarityWeights: { 1: 70, 2: 25, 3: 5 },
  rarityPoints: { 1: 1, 2: 3, 3: 10 },
};
const env = (rng: () => number = () => 0): Env => ({ rules, catalog: CATALOG, rng });
const DAY = '2026-10-15';
const T0 = 1_000_000_000_000;

const exploring = (patch: Partial<GameState> = {}): GameState => ({
  ...initialGameState(T0, 100),
  mode: 'exploring',
  ...patch,
});

describe('settleOil / currentOil', () => {
  it('recovers on the surface, capped at the max, and fills in 15 minutes', () => {
    const s = { ...initialGameState(T0, 100), oil: 0 };
    expect(currentOil(s, T0 + 7.5 * 60_000, rules)).toBeCloseTo(50, 5);
    expect(currentOil(s, T0 + 15 * 60_000, rules)).toBeCloseTo(100, 5);
    expect(currentOil(s, T0 + 999 * 60_000, rules)).toBe(100);
  });
  it('does not recover while exploring', () => {
    const s = exploring({ oil: 40 });
    expect(settleOil(s, T0 + 10 * 60_000, rules).oil).toBe(40);
  });
  it('ignores a clock that went backwards', () => {
    const s = { ...initialGameState(T0, 100), oil: 10 };
    expect(currentOil(s, T0 - 60_000, rules)).toBe(10);
  });
});

describe('applyScroll', () => {
  it('on the surface with enough oil: resumes exploring and counts the scroll', () => {
    const s = applyScroll(initialGameState(T0, 100), { px: 96, skimPx: 0 }, T0, DAY, env());
    expect(s.mode).toBe('exploring');
    expect(s.depthM).toBeCloseTo(0.762, 5);
    expect(s.days[DAY]?.scrollPx).toBe(96);
  });
  it('on the surface with too little oil: nothing happens to depth', () => {
    const s0 = { ...initialGameState(T0, 100), oil: 29 };
    const s = applyScroll(s0, { px: 960, skimPx: 0 }, T0, DAY, env());
    expect(s.mode).toBe('surface');
    expect(s.depthM).toBe(0);
  });
  it('resumes exactly at START_OIL_MIN', () => {
    const s0 = { ...initialGameState(T0, 100), oil: 30 };
    expect(applyScroll(s0, { px: 10, skimPx: 0 }, T0, DAY, env()).mode).toBe('exploring');
  });
  it('recovered oil counts toward the restart check', () => {
    const s0 = { ...initialGameState(T0, 100), oil: 0 };
    const later = T0 + 5 * 60_000; // about 33 oil
    expect(applyScroll(s0, { px: 10, skimPx: 0 }, later, DAY, env()).mode).toBe('exploring');
  });
  it('skimmed distance is stats only: no depth, no oil', () => {
    const s = applyScroll(exploring(), { px: 0, skimPx: 5000 }, T0, DAY, env());
    expect(s.depthM).toBe(0);
    expect(s.oil).toBe(100);
    expect(s.days[DAY]?.skimPx).toBe(5000);
  });
  it('distance costs oil by real meters', () => {
    // 96px/in -> 3780px = 1m real
    const s = applyScroll(exploring(), { px: 3779.52756, skimPx: 0 }, T0, DAY, env());
    expect(s.oil).toBeCloseTo(100 - 0.02, 4);
  });
  it('running out of oil by distance forces a return and loses half the bag', () => {
    const s0 = exploring({ oil: 0.001, bag: { pebble: 4 } });
    const s = applyScroll(s0, { px: 3780, skimPx: 0 }, T0, DAY, env());
    expect(s.mode).toBe('surface');
    expect(s.oil).toBe(0);
    expect(s.days[DAY]?.forcedReturns).toBe(1);
    expect(s.collection.pebble).toBe(2);
  });
  it('updates lastActivityAt and ignores empty batches', () => {
    const s0 = exploring({ lastActivityAt: 5 });
    expect(applyScroll(s0, { px: 10, skimPx: 0 }, T0, DAY, env()).lastActivityAt).toBe(T0);
    expect(applyScroll(s0, { px: 0, skimPx: 0 }, T0, DAY, env()).lastActivityAt).toBe(5);
    expect(applyScroll(s0, { px: -5, skimPx: Number.NaN }, T0, DAY, env()).depthM).toBe(0);
  });
});

describe('applyMine', () => {
  it('draws an ore from the current stratum into the bag and spends oil', () => {
    const s = applyMine(exploring(), T0, DAY, env(() => 0));
    expect(s.bag.pebble).toBe(1);
    expect(s.oil).toBe(90);
    expect(s.days[DAY]?.mines).toBe(1);
    expect(s.events.at(-1)).toMatchObject({ kind: 'mined', oreId: 'pebble' });
  });
  it('uses the stratum for the current depth', () => {
    const s = applyMine(exploring({ depthM: 500 }), T0, DAY, env(() => 0.99));
    expect(s.bag['dinosaur-tooth']).toBe(1);
  });
  it('is ignored on the surface', () => {
    const s0 = initialGameState(T0, 100);
    expect(applyMine(s0, T0, DAY, env()).bag).toEqual({});
  });
  it('stops at MAX_MINES_PER_DAY', () => {
    let s = exploring();
    for (let i = 0; i < 5; i++) s = applyMine(s, T0 + i * 10_000, DAY, env());
    expect(s.days[DAY]?.mines).toBe(3);
  });
  it('the daily cap is per day', () => {
    let s = exploring();
    for (let i = 0; i < 3; i++) s = applyMine(s, T0 + i * 10_000, DAY, env());
    s = applyMine(s, T0 + 100_000, '2026-10-16', env());
    expect(s.days['2026-10-16']?.mines).toBe(1);
  });
  it('rejects reports that come faster than a mine can finish', () => {
    let s = applyMine(exploring(), T0, DAY, env());
    s = applyMine(s, T0 + 1000, DAY, env());
    expect(s.days[DAY]?.mines).toBe(1);
  });
  it('mining the last oil forces a return, and the new ore is part of the halving', () => {
    const s = applyMine(exploring({ oil: 10, bag: { pebble: 1 } }), T0, DAY, env(() => 0));
    expect(s.mode).toBe('surface');
    expect(s.oil).toBe(0);
    // bag was 2 items -> lose 1, register 1
    const total = Object.values(s.collection).reduce((a, b) => a + b, 0);
    expect(total).toBe(1);
    expect(s.events.at(-1)).toMatchObject({ kind: 'returned', how: 'forced', lost: 1 });
  });
});

describe('returnToSurface', () => {
  it('manual return registers everything and scores points', () => {
    const s0 = exploring({ bag: { pebble: 2, pottery: 1, 'old-coin': 1 } });
    const s = returnToSurface(s0, 'manual', T0, DAY, env());
    expect(s.mode).toBe('surface');
    expect(s.bag).toEqual({});
    expect(s.collection).toEqual({ pebble: 2, pottery: 1, 'old-coin': 1 });
    expect(s.days[DAY]).toMatchObject({ points: 2 * 1 + 3 + 10, selfReturns: 1, forcedReturns: 0 });
  });
  it('auto return counts as a self return', () => {
    const s = returnToSurface(exploring({ bag: { pebble: 1 } }), 'auto', T0, DAY, env());
    expect(s.days[DAY]?.selfReturns).toBe(1);
  });
  it('forced return loses floor(n/2) randomly chosen, never more', () => {
    const bag = { pebble: 3, pottery: 2 }; // 5 items -> lose 2
    for (const r of [0, 0.3, 0.7, 0.99]) {
      const s = returnToSurface(exploring({ bag }), 'forced', T0, DAY, env(() => r));
      const kept = Object.values(s.collection).reduce((a, b) => a + b, 0);
      expect(kept).toBe(3);
      expect(s.days[DAY]?.forcedReturns).toBe(1);
      expect(s.days[DAY]?.selfReturns).toBe(0);
    }
  });
  it('forced return with one item loses nothing (floor(1/2) = 0)', () => {
    const s = returnToSurface(exploring({ bag: { pebble: 1 } }), 'forced', T0, DAY, env());
    expect(s.collection.pebble).toBe(1);
  });
  it('different random draws can lose different items', () => {
    const a = returnToSurface(exploring({ bag: { pebble: 1, pottery: 1 } }), 'forced', T0, DAY, env(() => 0));
    const b = returnToSurface(exploring({ bag: { pebble: 1, pottery: 1 } }), 'forced', T0, DAY, env(() => 0.99));
    expect(Object.keys(a.collection)).not.toEqual(Object.keys(b.collection));
  });
  it('does nothing when already on the surface', () => {
    const s0 = initialGameState(T0, 100);
    expect(returnToSurface(s0, 'manual', T0, DAY, env())).toBe(s0);
  });
  it('does not mutate the previous state', () => {
    const s0 = exploring({ bag: { pebble: 2 } });
    returnToSurface(s0, 'forced', T0, DAY, env());
    expect(s0.bag).toEqual({ pebble: 2 });
    expect(s0.mode).toBe('exploring');
  });
});

describe('checkAutoReturn', () => {
  it('returns after AUTO_RETURN_MIN without activity, not before', () => {
    const s0 = exploring({ lastActivityAt: T0, bag: { pebble: 1 } });
    expect(checkAutoReturn(s0, T0 + 4.9 * 60_000, DAY, env()).mode).toBe('exploring');
    const s = checkAutoReturn(s0, T0 + 5 * 60_000, DAY, env());
    expect(s.mode).toBe('surface');
    expect(s.collection.pebble).toBe(1);
  });
  it('does nothing on the surface', () => {
    const s0 = initialGameState(T0, 100);
    expect(checkAutoReturn(s0, T0 + 99 * 60_000, DAY, env())).toBe(s0);
  });
});

describe('normalizeState', () => {
  it('upgrades a Phase 1 (version 1) save, keeping depth and stats', () => {
    const v1 = { version: 1, depthM: 12.5, days: { [DAY]: { scrollPx: 100, skimPx: 20 } } };
    const s = normalizeState(v1, T0, 100);
    expect(s.version).toBe(2);
    expect(s.depthM).toBe(12.5);
    expect(s.mode).toBe('surface');
    expect(s.oil).toBe(100);
    expect(s.days[DAY]).toEqual({ scrollPx: 100, skimPx: 20, mines: 0, points: 0, selfReturns: 0, forcedReturns: 0 });
  });
  it('survives garbage', () => {
    for (const bad of [null, undefined, 5, 'x', [], { depthM: 'a', bag: { x: -1, y: 'z' }, oil: 9999 }]) {
      const s = normalizeState(bad, T0, 100);
      expect(s.version).toBe(2);
      expect(Number.isFinite(s.depthM)).toBe(true);
      expect(s.oil).toBeLessThanOrEqual(100);
      expect(s.bag).toEqual({});
    }
  });
});
