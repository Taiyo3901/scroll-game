import { describe, expect, it } from 'vitest';
import { isoWeekId, localDayKey } from '../src/core/week';

const d = (y: number, m: number, day: number, h = 0, mi = 0) => new Date(y, m - 1, day, h, mi);

describe('isoWeekId', () => {
  it('Monday 00:00 starts a new week', () => {
    expect(isoWeekId(d(2026, 10, 11, 23, 59))).toBe('2026-W41');
    expect(isoWeekId(d(2026, 10, 12, 0, 0))).toBe('2026-W42');
  });
  it('a mid-week day', () => {
    expect(isoWeekId(d(2026, 10, 14))).toBe('2026-W42');
  });
  it('year boundaries follow ISO 8601', () => {
    expect(isoWeekId(d(2026, 1, 1))).toBe('2026-W01');
    expect(isoWeekId(d(2025, 12, 29))).toBe('2026-W01');
    expect(isoWeekId(d(2024, 12, 30))).toBe('2025-W01');
    expect(isoWeekId(d(2021, 1, 3))).toBe('2020-W53');
  });
});

describe('localDayKey', () => {
  it('uses local date, zero padded', () => {
    expect(localDayKey(d(2026, 3, 5, 23, 59))).toBe('2026-03-05');
    expect(localDayKey(d(2026, 3, 6, 0, 0))).toBe('2026-03-06');
  });
});
