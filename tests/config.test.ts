import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { RULES } from '../src/rules';

describe('config and rules', () => {
  it('has the agreed play values', () => {
    expect(CONFIG.DEPTH_MULTIPLIER).toBe(100);
    expect(CONFIG.FIND_DURATION_SEC).toBe(4);
    expect(CONFIG.MAX_FINDS_PER_DAY).toBe(300);
    expect(CONFIG.MIMIC_IN_CHEST).toBe(0.12);
  });
  it('rules follow the config; the minimum find interval is half the gauge time', () => {
    expect(RULES.depthMultiplier).toBe(100);
    expect(RULES.maxFindsPerDay).toBe(300);
    expect(RULES.minFindIntervalMs).toBe(2000);
  });
});
