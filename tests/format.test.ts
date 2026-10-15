import { describe, expect, it } from 'vitest';
import { formatBadge } from '../src/core/format';

describe('formatBadge', () => {
  it('shows meters under 1000', () => {
    expect(formatBadge(0)).toBe('0m');
    expect(formatBadge(320.9)).toBe('320m');
    expect(formatBadge(999.9)).toBe('999m');
  });
  it('shows k with one decimal from 1000', () => {
    expect(formatBadge(1000)).toBe('1.0k');
    expect(formatBadge(1234)).toBe('1.2k');
  });
  it('drops the decimal from 10k and caps at 999k', () => {
    expect(formatBadge(12_345)).toBe('12k');
    expect(formatBadge(5_000_000)).toBe('999k');
  });
  it('is safe for bad input', () => {
    expect(formatBadge(Number.NaN)).toBe('0m');
    expect(formatBadge(-5)).toBe('0m');
  });
});
