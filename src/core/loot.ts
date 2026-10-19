import { itemsOfGenre, secretOf, type AreaDef, type Catalog, type ItemDef, type Rarity } from './catalog.ts';

/** 階層の秘宝が出る確率（系統に関係なく、1回の発見ごと） */
export const SECRET_CHANCE = 0.03;

/**
 * 発見品を1つ抽選する。まず階層の秘宝を SECRET_CHANCE で判定し、外れたら、
 * 閲覧中の部屋の品から、階層ごとのレア度の重みで選ぶ。rng は [0, 1) を返す関数。
 */
export function drawItem(
  catalog: Catalog,
  genreId: string,
  area: AreaDef,
  rng: () => number,
): ItemDef | null {
  const secret = secretOf(catalog, area.id);
  if (secret && rng() < SECRET_CHANCE) return secret;

  const pool = itemsOfGenre(catalog, genreId);
  // 先にレア度を重みで決め、同じレア度の中からは等確率で選ぶ（品の数に確率が引きずられないように）
  const rarities = ([1, 2, 3] as Rarity[]).filter((r) => pool.some((i) => i.rarity === r));
  const w = (r: Rarity) => Math.max(0, area.weights[r - 1] ?? 0);
  const total = rarities.reduce((sum, r) => sum + w(r), 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  let rarity = rarities[rarities.length - 1] as Rarity;
  for (const r of rarities) {
    roll -= w(r);
    if (roll < 0) {
      rarity = r;
      break;
    }
  }
  const same = pool.filter((i) => i.rarity === rarity);
  return same[Math.min(same.length - 1, Math.floor(rng() * same.length))] ?? null;
}
