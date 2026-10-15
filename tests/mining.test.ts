import { describe, expect, it } from 'vitest';
import {
  CONDITION_KEYS,
  capChars,
  evaluateConditions,
  spotKey,
  type MiningInput,
} from '../src/core/mining';

const good: MiningInput = {
  exploring: true,
  msSinceLastScroll: 3000,
  startDelayMs: 3000,
  skimming: false,
  inCooldown: false,
  visible: true,
  focused: true,
  idleActive: true,
  visibleChars: 200,
  minChars: 200,
  spotDug: false,
  minesToday: 0,
  maxMinesPerDay: 60,
};

describe('evaluateConditions', () => {
  it('passes when every condition holds (boundaries inclusive)', () => {
    const r = evaluateConditions(good);
    expect(r.ok).toBe(true);
    expect(CONDITION_KEYS.every((k) => r.checks[k])).toBe(true);
  });

  const cases: [string, Partial<MiningInput>, (typeof CONDITION_KEYS)[number]][] = [
    ['on the surface', { exploring: false }, 'exploring'],
    ['scrolled just now', { msSinceLastScroll: 2999 }, 'delay'],
    ['never scrolled counts as waited', { msSinceLastScroll: Infinity }, 'delay'],
    ['skimming', { skimming: true }, 'notSkimming'],
    ['skim cooldown', { inCooldown: true }, 'notSkimming'],
    ['tab hidden', { visible: false }, 'visibleFocus'],
    ['window not focused', { focused: false }, 'visibleFocus'],
    ['user is away', { idleActive: false }, 'idleActive'],
    ['image/video-only screen', { visibleChars: 199 }, 'enoughText'],
    ['spot already dug', { spotDug: true }, 'newSpot'],
    ['daily cap reached', { minesToday: 60 }, 'underDailyCap'],
  ];
  for (const [name, patch, key] of cases) {
    it(`fails only "${key}" when ${name}`, () => {
      const r = evaluateConditions({ ...good, ...patch });
      if (name.startsWith('never')) {
        expect(r.checks.delay).toBe(true);
        return;
      }
      expect(r.ok).toBe(false);
      expect(r.checks[key]).toBe(false);
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
  it('is safe for zero height or bad scrollTop', () => {
    expect(spotKey(1, 100, 0)).toBe('1:100');
    expect(spotKey(1, Number.NaN, 800)).toBe('1:0');
  });
});

describe('capChars', () => {
  it('limits the count to what fits in the visible area', () => {
    // 16px font: 1 char ~ 128px^2 -> a 1280px^2 area holds ~10 chars
    expect(capChars(1000, 1280, 16)).toBe(10);
    expect(capChars(5, 1_000_000, 16)).toBe(5);
  });
  it('is 0 without text or visible area', () => {
    expect(capChars(0, 1000, 16)).toBe(0);
    expect(capChars(100, 0, 16)).toBe(0);
  });
  it('falls back to 16px for a bad font size', () => {
    expect(capChars(1000, 1280, 0)).toBe(10);
  });
});
