import { describe, expect, it } from 'vitest';
import { CONDITION_KEYS, evaluateConditions, spotKey, type MiningInput } from '../src/core/mining';

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

describe('spotKey', () => {
  it('rounds the scroll position to viewport-height units', () => {
    expect(spotKey(1, 0, 800)).toBe('1:0');
    expect(spotKey(1, 399, 800)).toBe('1:0');
    expect(spotKey(1, 401, 800)).toBe('1:1');
    expect(spotKey(1, 1600, 800)).toBe('1:2');
  });
  it('differs by scrolling element and never includes a URL', () => {
    expect(spotKey(1, 0, 800)).not.toBe(spotKey(2, 0, 800));
    expect(spotKey(1, 0, 800)).toMatch(/^\d+:-?\d+$/);
  });
  it('is safe for zero height or a bad scrollTop', () => {
    expect(spotKey(1, 100, 0)).toBe('1:100');
    expect(spotKey(1, Number.NaN, 800)).toBe('1:0');
  });
});
