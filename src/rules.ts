import { CONFIG } from './config';
import type { Rules } from './core/game';

/** config.ts の値を、純粋関数に渡す形にまとめたもの */
export const RULES: Rules = {
  depthMultiplier: CONFIG.DEPTH_MULTIPLIER,
  oilMax: CONFIG.OIL_MAX,
  oilPerMine: CONFIG.OIL_PER_MINE,
  oilPerMeter: CONFIG.OIL_PER_METER,
  oilRecoverPerMin: CONFIG.OIL_RECOVER_PER_MIN,
  startOilMin: CONFIG.START_OIL_MIN,
  maxMinesPerDay: CONFIG.MAX_MINES_PER_DAY,
  autoReturnMin: CONFIG.AUTO_RETURN_MIN,
  miningMinIntervalMs: CONFIG.MINING_DURATION_SEC * 500,
  rarityWeights: CONFIG.RARITY_WEIGHTS,
  rarityPoints: CONFIG.RARITY_POINTS,
};
