import { itemsOfGenre, mimicItems, secretOf, type AreaDef, type Catalog, type ItemDef, type Rarity } from './catalog.ts';
import type { ContainerKind, ContainerRules, RealContainer } from './containers.ts';

/** 階層の秘宝が出る確率（系統に関係なく、1回の発見ごと。ミミックからは出ない） */
export const SECRET_CHANCE = 0.03;

/** ミミックの戦利品の、★1・★2・★3 の重み */
export const MIMIC_WEIGHTS: [number, number, number] = [55, 35, 10];

const NEUTRAL: [number, number, number] = [1, 1, 1];

/** 先にレア度を重みで決め、同じレア度の中からは等確率で選ぶ（品の数に確率が引きずられないように）。 */
function pickByRarity(pool: ItemDef[], weight: (r: Rarity) => number, rng: () => number): ItemDef | null {
  const rarities = ([1, 2, 3] as Rarity[]).filter((r) => pool.some((i) => i.rarity === r));
  const total = rarities.reduce((sum, r) => sum + Math.max(0, weight(r)), 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  let rarity = rarities[rarities.length - 1] as Rarity;
  for (const r of rarities) {
    roll -= Math.max(0, weight(r));
    if (roll < 0) {
      rarity = r;
      break;
    }
  }
  const same = pool.filter((i) => i.rarity === rarity);
  return same[Math.min(same.length - 1, Math.floor(rng() * same.length))] ?? null;
}

/**
 * 発見品を1つ抽選する。
 * - ミミックなら、戦利品の中から選ぶ。
 * - それ以外は、まず階層の秘宝を SECRET_CHANCE で判定し、外れたら、閲覧中の部屋の品から、
 *   階層ごとのレア度の重みに入れ物ごとの倍率を掛けて選ぶ。
 * rng は [0, 1) を返す関数。
 */
export function drawItem(
  catalog: Catalog,
  genreId: string,
  area: AreaDef,
  rng: () => number,
  container: ContainerKind = 'box',
  rules?: Pick<ContainerRules, 'rarityMult'>,
): ItemDef | null {
  if (container === 'mimic') return pickByRarity(mimicItems(catalog), (r) => MIMIC_WEIGHTS[r - 1] ?? 0, rng);

  const secret = secretOf(catalog, area.id);
  if (secret && rng() < SECRET_CHANCE) return secret;

  const mult = rules?.rarityMult[container as RealContainer] ?? NEUTRAL;
  return pickByRarity(
    itemsOfGenre(catalog, genreId),
    (r) => (area.weights[r - 1] ?? 0) * (mult[r - 1] ?? 1),
    rng,
  );
}
