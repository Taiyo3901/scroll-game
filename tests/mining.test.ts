import { describe, expect, it } from 'vitest';
import { CONDITION_KEYS, evaluateConditions, type MiningInput } from '../src/core/mining';

const good: MiningInput = {
  exploring: true,
  msSinceLastScroll: 3000,
  startDelayMs: 3000,
  visible: true,
  minesToday: 0,
  maxMinesPerDay: 60,
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
    ['on the surface', { exploring: false }, 'exploring'],
    ['scrolled just now', { msSinceLastScroll: 2999 }, 'stopped'],
    ['tab hidden', { visible: false }, 'visible'],
    ['daily cap reached', { minesToday: 60 }, 'underDailyCap'],
  ];
  for (const [name, patch, key] of cases) {
    it(`fails only "${key}" when ${name}`, () => {
      const r = evaluateConditions({ ...good, ...patch });
      expect(r.ok).toBe(false);
      expect(CONDITION_KEYS.filter((k) => !r.checks[k])).toEqual([key]);
    });
  }
});
