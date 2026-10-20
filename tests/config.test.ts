import { describe, expect, it } from 'vitest';
import { configFor } from '../src/config';
import { rulesFor } from '../src/rules';

describe('demo mode config', () => {
  it('the normal config is unchanged by the existence of demo mode', () => {
    expect(configFor(false).DEPTH_MULTIPLIER).toBe(30);
    expect(configFor(false).FIND_DURATION_SEC).toBe(4);
    expect(configFor(false).MAX_FINDS_PER_DAY).toBe(300);
    expect(configFor(false).MIMIC_IN_CHEST).toBe(0.12);
  });
  it('demo mode is much faster and shows chests and mimics more often', () => {
    const d = configFor(true);
    expect(d.DEPTH_MULTIPLIER).toBeGreaterThan(configFor(false).DEPTH_MULTIPLIER);
    expect(d.FIND_DURATION_SEC).toBeLessThan(configFor(false).FIND_DURATION_SEC);
    expect(d.MIMIC_IN_CHEST).toBeGreaterThan(configFor(false).MIMIC_IN_CHEST);
    expect(d.CONTAINER_WEIGHTS.chest).toBeGreaterThan(configFor(false).CONTAINER_WEIGHTS.chest);
  });
  it('switching does not mutate either config', () => {
    configFor(true);
    expect(configFor(false).DEPTH_MULTIPLIER).toBe(30);
  });
  it('rules follow the config: demo is faster and keeps the minimum find interval at half the gauge time', () => {
    expect(rulesFor(false).minFindIntervalMs).toBe(2000);
    expect(rulesFor(true).minFindIntervalMs).toBe(1000);
    expect(rulesFor(true).depthMultiplier).toBe(600);
  });
});
