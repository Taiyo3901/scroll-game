import { describe, expect, it } from 'vitest';
import { CONDITION_KEYS, evaluateConditions, findOpenedSpot, type MiningInput } from '../src/core/mining';

const good: MiningInput = {
  msSinceLastScroll: 1000,
  startDelayMs: 1000,
  visible: true,
  findsToday: 0,
  maxFindsPerDay: 300,
  foundThisStop: false,
  spotOpened: false,
};

describe('evaluateConditions', () => {
  it('passes when every condition holds (boundaries inclusive)', () => {
    const r = evaluateConditions(good);
    expect(r.ok).toBe(true);
    expect(CONDITION_KEYS.every((k) => r.checks[k])).toBe(true);
  });

  it('never scrolled counts as stopped', () => {
    expect(evaluateConditions({ ...good, msSinceLastScroll: Infinity }).checks.stopped).toBe(true);
  });

  const cases: [string, Partial<MiningInput>, (typeof CONDITION_KEYS)[number]][] = [
    ['scrolled just now', { msSinceLastScroll: 999 }, 'stopped'],
    ['tab hidden', { visible: false }, 'visible'],
    ['daily cap reached', { findsToday: 300 }, 'underDailyCap'],
    ['already found at this stop', { foundThisStop: true }, 'oncePerStop'],
    ['container already opened at this spot', { spotOpened: true }, 'newSpot'],
  ];
  for (const [name, patch, key] of cases) {
    it(`fails only "${key}" when ${name}`, () => {
      const r = evaluateConditions({ ...good, ...patch });
      expect(r.ok).toBe(false);
      expect(CONDITION_KEYS.filter((k) => !r.checks[k])).toEqual([key]);
    });
  }
});

describe('findOpenedSpot', () => {
  const at = (scrollTop: number, elementId = 1) => ({ elementId, scrollTop, viewportH: 1000 });
  const opened = [
    { elementId: 1, scrollTop: 500 },
    { elementId: 2, scrollTop: 100 },
  ];

  it('treats positions within about 30% of the viewport as the same spot', () => {
    expect(findOpenedSpot(opened, at(500))).toBe(opened[0]);
    expect(findOpenedSpot(opened, at(700))).toBe(opened[0]);
    expect(findOpenedSpot(opened, at(300))).toBe(opened[0]);
    expect(findOpenedSpot(opened, at(799))).toBe(opened[0]);
  });
  it('a position beyond that is a new spot (the boundary is exclusive)', () => {
    expect(findOpenedSpot(opened, at(800))).toBeUndefined();
    expect(findOpenedSpot(opened, at(200))).toBeUndefined();
    expect(findOpenedSpot(opened, at(0))).toBeUndefined();
  });
  it('is not affected by where the screen cuts: nearby positions on either side of any boundary agree', () => {
    for (const top of [499, 500, 501, 749, 751]) {
      expect(findOpenedSpot(opened, at(top)) !== undefined, String(top)).toBe(true);
    }
  });
  it('only compares within the same scrolling element', () => {
    expect(findOpenedSpot(opened, at(500, 3))).toBeUndefined();
    expect(findOpenedSpot(opened, at(110, 2))).toBe(opened[1]);
  });
  it('returns the nearest one when two are close', () => {
    const two = [
      { elementId: 1, scrollTop: 100 },
      { elementId: 1, scrollTop: 400 },
    ];
    expect(findOpenedSpot(two, at(300))).toBe(two[1]);
  });
  it('scales with the viewport height', () => {
    expect(findOpenedSpot(opened, { elementId: 1, scrollTop: 700, viewportH: 400 })).toBeUndefined();
    expect(findOpenedSpot(opened, { elementId: 1, scrollTop: 600, viewportH: 400 })).toBe(opened[0]);
  });
  it('is safe with no records, bad numbers and a zero-height viewport', () => {
    expect(findOpenedSpot([], at(0))).toBeUndefined();
    expect(findOpenedSpot(opened, { elementId: 1, scrollTop: Number.NaN, viewportH: 1000 })).toBeUndefined();
    expect(findOpenedSpot(opened, { elementId: 1, scrollTop: 500, viewportH: 0 })).toBe(opened[0]);
  });
});
