import { CONFIG } from './config';
import type { Rules } from './core/game';

/** config.ts の値を、純粋関数に渡す形にまとめたもの */
export const RULES: Rules = {
  depthMultiplier: CONFIG.DEPTH_MULTIPLIER,
  maxFindsPerDay: CONFIG.MAX_FINDS_PER_DAY,
  minFindIntervalMs: CONFIG.FIND_DURATION_SEC * 500,
  rarityPoints: CONFIG.RARITY_POINTS,
  containers: {
    weights: CONFIG.CONTAINER_WEIGHTS,
    rarityMult: CONFIG.CONTAINER_RARITY_MULT,
    mimicInChest: CONFIG.MIMIC_IN_CHEST,
  },
};
