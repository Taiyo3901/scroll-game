import { describe, expect, it } from 'vitest';
import { CONTAINER_KINDS, isContainerKind, rollContainer, type ContainerRules } from '../src/core/containers';

const rules: ContainerRules = {
  weights: { pot: 45, box: 40, chest: 15 },
  rarityMult: { pot: [1.2, 0.7, 0.3], box: [1, 1, 1], chest: [0.6, 1.5, 2.5] },
  mimicInChest: 0.12,
};

const seq = (...v: number[]) => {
  let i = 0;
  return () => v[Math.min(i++, v.length - 1)] ?? 0;
};

describe('rollContainer', () => {
  it('picks by weight: pot, then box, then chest', () => {
    expect(rollContainer(rules, seq(0.0))).toBe('pot');
    expect(rollContainer(rules, seq(0.44))).toBe('pot');
    expect(rollContainer(rules, seq(0.45))).toBe('box');
    expect(rollContainer(rules, seq(0.84))).toBe('box');
    expect(rollContainer(rules, seq(0.85, 0.99))).toBe('chest');
  });

  it('a chest turns out to be a mimic with the configured chance, and only chests do', () => {
    expect(rollContainer(rules, seq(0.9, 0.11))).toBe('mimic');
    expect(rollContainer(rules, seq(0.9, 0.12))).toBe('chest');
    expect(rollContainer(rules, seq(0.1, 0))).toBe('pot');
  });

  it('is about 1.8% mimic overall, and all four kinds appear', () => {
    let x = 7;
    const rng = () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const count: Record<string, number> = {};
    const N = 40000;
    for (let i = 0; i < N; i++) {
      const k = rollContainer(rules, rng);
      count[k] = (count[k] ?? 0) + 1;
    }
    for (const k of CONTAINER_KINDS) expect(count[k] ?? 0, k).toBeGreaterThan(0);
    expect((count.mimic ?? 0) / N).toBeGreaterThan(0.012);
    expect((count.mimic ?? 0) / N).toBeLessThan(0.025);
  });

  it('isContainerKind accepts only the four kinds', () => {
    for (const k of CONTAINER_KINDS) expect(isContainerKind(k)).toBe(true);
    for (const bad of ['', 'crate', 7, null, undefined, '__proto__']) expect(isContainerKind(bad)).toBe(false);
  });
});
