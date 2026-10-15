import { describe, expect, it } from 'vitest';
import { downwardDelta, isWithinInputWindow } from '../src/core/scroll';

describe('downwardDelta', () => {
  it('counts only downward movement', () => {
    expect(downwardDelta(100, 160)).toBe(60);
    expect(downwardDelta(160, 100)).toBe(0);
    expect(downwardDelta(100, 100)).toBe(0);
  });
  it('ignores non-finite values', () => {
    expect(downwardDelta(0, Number.NaN)).toBe(0);
    expect(downwardDelta(0, Infinity)).toBe(0);
  });
});

describe('isWithinInputWindow', () => {
  it('is false when the user never interacted', () => {
    expect(isWithinInputWindow(null, 1000, 1)).toBe(false);
  });
  it('is true within the window, false after', () => {
    expect(isWithinInputWindow(1000, 1900, 1)).toBe(true);
    expect(isWithinInputWindow(1000, 1000, 1)).toBe(true);
    expect(isWithinInputWindow(1000, 2001, 1)).toBe(false);
  });
  it('treats a clock that went backwards as no input', () => {
    expect(isWithinInputWindow(5000, 4000, 1)).toBe(false);
  });
});
