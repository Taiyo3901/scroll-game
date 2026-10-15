import { describe, expect, it } from 'vitest';
import {
  advanceSkim,
  averageSpeedPxPerSec,
  initialSkimState,
  isInCooldown,
  windowTotalPx,
  type SkimConfig,
} from '../src/core/skim';

const cfg: SkimConfig = { windowSec: 10, screens: 1.5, cooldownSec: 5 };
const H = 800; // threshold = 1200px

describe('skim detection', () => {
  it('is not skimming for a slow reader', () => {
    let s = initialSkimState();
    for (let t = 0; t < 10000; t += 1000) s = advanceSkim(s, t, H, cfg, 100);
    expect(windowTotalPx(s)).toBe(1000);
    expect(s.skimming).toBe(false);
  });

  it('one quick screen after finishing a page is not skimming', () => {
    const s = advanceSkim(initialSkimState(), 0, H, cfg, 800);
    expect(s.skimming).toBe(false);
  });

  it('is skimming once the window total exceeds screens x height', () => {
    let s = initialSkimState();
    s = advanceSkim(s, 0, H, cfg, 700);
    s = advanceSkim(s, 2000, H, cfg, 600);
    expect(s.skimming).toBe(true);
  });

  it('exactly at the threshold is not skimming', () => {
    const s = advanceSkim(initialSkimState(), 0, H, cfg, 1200);
    expect(s.skimming).toBe(false);
  });

  it('old samples fall out of the window and the cooldown starts', () => {
    let s = initialSkimState();
    s = advanceSkim(s, 0, H, cfg, 1300);
    expect(s.skimming).toBe(true);
    s = advanceSkim(s, 10_500, H, cfg, 0);
    expect(s.skimming).toBe(false);
    expect(s.cooldownUntil).toBe(15_500);
    expect(isInCooldown(s, 12_000)).toBe(true);
    expect(isInCooldown(s, 15_500)).toBe(false);
  });

  it('is not in cooldown while still skimming or before ever skimming', () => {
    const fresh = initialSkimState();
    expect(isInCooldown(fresh, 0)).toBe(false);
    const s = advanceSkim(fresh, 0, H, cfg, 2000);
    expect(isInCooldown(s, 1000)).toBe(false);
  });

  it('falls back to a default height when the viewport height is invalid', () => {
    const s = advanceSkim(initialSkimState(), 0, 0, cfg, 100);
    expect(s.skimming).toBe(false);
  });

  it('average speed is window total / window length', () => {
    const s = advanceSkim(initialSkimState(), 0, H, cfg, 500);
    expect(averageSpeedPxPerSec(s, cfg)).toBe(50);
  });

  it('does not mutate the previous state', () => {
    const a = initialSkimState();
    advanceSkim(a, 0, H, cfg, 100);
    expect(a.samples).toHaveLength(0);
  });
});
