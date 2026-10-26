export type Rarity = 1 | 2 | 3;

/** 階層（深度で決まる）。景色と、レア度の出やすさを変える。 */
export interface AreaDef {
  id: string;
  name: string;
  /** この階層が始まる深度(m)。配列は浅い順に並べる */
  startDepthM: number;
  /** 画面右端の帯とバッジに使う色 */
  color: string;
  /** ★1・★2・★3 の抽選の重み */
  weights: [number, number, number];
}

/** 部屋（サイトの系統）。閲覧中のサイトの種類で、見つかる品が変わる。 */
export interface GenreDef {
  id: string;
  name: string;
  /** 職業診断でこの部屋に対応する職業 */
  job: string;
  /** 図鑑や分布グラフで使う色 */
  color: string;
  about: string;
  /** この系統にするドメイン（末尾一致）。端末の中だけで使い、保存も送信もしない */
  domains: string[];
}

export interface ItemDef {
  id: string;
  /** 通常の発見品が属する部屋。階層の秘宝は持たない */
  genreId?: string;
  /** 階層の秘宝が出る階層 */
  areaId?: string;
  /** ミミックの戦利品（宝箱に化けた魔物から、まれに出る） */
  mimic?: boolean;
  rarity: Rarity;
  name: string;
  description: string;
}

export interface Catalog {
  areas: AreaDef[];
  genres: GenreDef[];
  items: ItemDef[];
}

/** 迷宮のどの部屋にも当てはまらないときの部屋 */
export const OTHER_GENRE = 'other';

/** 深度に対応する階層。浅い順の配列で、深度以下で最後の開始深度をもつもの。 */
export function areaAt(areas: AreaDef[], depthM: number): AreaDef {
  const first = areas[0];
  if (!first) throw new Error('areas is empty');
  const d = Number.isFinite(depthM) && depthM > 0 ? depthM : 0;
  let found = first;
  for (const a of areas) {
    if (a.startDepthM <= d) found = a;
    else break;
  }
  return found;
}

export const itemsOfGenre = (c: Catalog, genreId: string): ItemDef[] =>
  c.items.filter((i) => i.genreId === genreId);

export const mimicItems = (c: Catalog): ItemDef[] => c.items.filter((i) => i.mimic);

export const secretOf = (c: Catalog, areaId: string): ItemDef | undefined =>
  c.items.find((i) => i.areaId === areaId);

export const findItem = (c: Catalog, itemId: string): ItemDef | undefined =>
  c.items.find((i) => i.id === itemId);

export const isGenreId = (c: Catalog, genreId: unknown): genreId is string =>
  typeof genreId === 'string' && c.genres.some((g) => g.id === genreId);
