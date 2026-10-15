import type { OreDef, Rarity } from './strata';

/** レア度の重みで鉱石を1つ抽選する。rng は [0, 1) を返す関数。候補が空なら null。 */
export function drawOre(
  ores: OreDef[],
  weights: Record<Rarity, number>,
  rng: () => number,
): OreDef | null {
  const w = (o: OreDef) => Math.max(0, weights[o.rarity] ?? 0);
  const total = ores.reduce((sum, o) => sum + w(o), 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const o of ores) {
    r -= w(o);
    if (r < 0) return o;
  }
  return ores[ores.length - 1] ?? null;
}
