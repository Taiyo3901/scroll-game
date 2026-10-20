import { configFor } from './config';
import type { Rules } from './core/game';

/** config.ts の値を、純粋関数に渡す形にまとめたもの。demo が true ならデモ用の値。 */
export function rulesFor(demo: boolean): Rules {
  const c = configFor(demo);
  return {
    depthMultiplier: c.DEPTH_MULTIPLIER,
    maxFindsPerDay: c.MAX_FINDS_PER_DAY,
    minFindIntervalMs: c.FIND_DURATION_SEC * 500,
    rarityPoints: c.RARITY_POINTS,
    containers: {
      weights: c.CONTAINER_WEIGHTS,
      rarityMult: c.CONTAINER_RARITY_MULT,
      mimicInChest: c.MIMIC_IN_CHEST,
    },
  };
}

/** 本番の規則 */
export const RULES: Rules = rulesFor(false);
