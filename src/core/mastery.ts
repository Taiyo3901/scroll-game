/**
 * 図鑑の「なじみ具合」。同じ品を何度も見つけると、図鑑のカードの枠と印が変わる。
 * 数えるのは、図鑑の所持数だけ（新しく保存するものはない）。
 */

export interface MasteryTier {
  /** 0 = なし。1〜4 = 段階 */
  level: 0 | 1 | 2 | 3 | 4;
  name: string;
  /** この段階に必要な所持数 */
  need: number;
}

export const MASTERY_TIERS: readonly MasteryTier[] = [
  { level: 0, name: '', need: 0 },
  { level: 1, name: '見慣れた', need: 3 },
  { level: 2, name: '使い込んだ', need: 10 },
  { level: 3, name: '極めた', need: 30 },
  { level: 4, name: '伝説の', need: 100 },
];

/** 所持数から、いまの段階。 */
export function masteryOf(count: number): MasteryTier {
  const n = Number.isFinite(count) ? count : 0;
  let tier = MASTERY_TIERS[0] as MasteryTier;
  for (const t of MASTERY_TIERS) if (n >= t.need && t.level > 0) tier = t;
  return tier;
}

/** 次の段階（最後なら null）と、あと何個か。 */
export function nextMastery(count: number): { tier: MasteryTier; remaining: number } | null {
  const cur = masteryOf(count);
  const next = MASTERY_TIERS.find((t) => t.level === cur.level + 1);
  return next ? { tier: next, remaining: Math.max(0, next.need - (Number.isFinite(count) ? count : 0)) } : null;
}
