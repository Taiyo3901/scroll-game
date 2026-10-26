import { describe, expect, it } from 'vitest';
import { TIME_MODES, hourOf, normalizeTimeMode, timeLook, timeLookFor } from '../src/core/timeband';

describe('timeLook', () => {
  it('shows nothing at midday and is darkest at night with bright torches', () => {
    expect(timeLook(12).alpha).toBe(0);
    const night = timeLook(23);
    expect(night.alpha).toBeGreaterThan(0.3);
    expect(night.torch).toBe(1);
    expect(timeLook(3).alpha).toBe(night.alpha);
  });
  it('warms up at dawn and dusk', () => {
    const dawn = timeLook(6);
    expect(dawn.rgb[0]).toBeGreaterThan(dawn.rgb[2]);
    const dusk = timeLook(18.5);
    expect(dusk.rgb[0]).toBeGreaterThan(dusk.rgb[2]);
    expect(dusk.alpha).toBeGreaterThan(timeLook(12).alpha);
  });
  it('is continuous: neighbouring minutes differ only a little', () => {
    for (let m = 0; m < 24 * 60; m++) {
      const a = timeLook(m / 60);
      const b = timeLook((m + 1) / 60);
      expect(Math.abs(a.alpha - b.alpha)).toBeLessThan(0.02);
      expect(Math.abs(a.torch - b.torch)).toBeLessThan(0.05);
    }
  });
  it('wraps around the day and survives bad input', () => {
    expect(timeLook(25)).toEqual(timeLook(1));
    expect(timeLook(-2)).toEqual(timeLook(22));
    expect(timeLook(Number.NaN).alpha).toBe(0);
  });
});

describe('timeLookFor', () => {
  it('follows the clock in auto mode and is fixed in the other modes', () => {
    expect(timeLookFor('auto', new Date(2026, 0, 1, 12, 0))?.alpha).toBe(0);
    expect(timeLookFor('auto', new Date(2026, 0, 1, 23, 0))?.alpha).toBeGreaterThan(0.3);
    expect(timeLookFor('night', new Date(2026, 0, 1, 12, 0))?.alpha).toBeGreaterThan(0.3);
    expect(timeLookFor('day', new Date(2026, 0, 1, 23, 0))?.alpha).toBe(0);
    expect(timeLookFor('dusk', new Date())?.rgb[0]).toBeGreaterThan(200);
    expect(timeLookFor('off', new Date())).toBeNull();
  });
  it('hourOf includes minutes', () => {
    expect(hourOf(new Date(2026, 0, 1, 7, 30))).toBe(7.5);
  });
});

describe('normalizeTimeMode', () => {
  it('accepts known modes and falls back to auto', () => {
    for (const m of TIME_MODES) expect(normalizeTimeMode(m)).toBe(m);
    expect(normalizeTimeMode('x')).toBe('auto');
    expect(normalizeTimeMode(undefined)).toBe('auto');
    expect(normalizeTimeMode(3)).toBe('auto');
  });
});
