export type Rarity = 1 | 2 | 3;

export interface StratumDef {
  id: string;
  name: string;
  /** この地層が始まる深度(m)。配列は浅い順に並べる */
  startDepthM: number;
  /** 画面右端の帯に使う色 */
  color: string;
}

export interface OreDef {
  id: string;
  stratumId: string;
  rarity: Rarity;
  name: string;
  description: string;
}

export interface Catalog {
  strata: StratumDef[];
  ores: OreDef[];
}

/** 深度に対応する地層。浅い順の配列で、深度以下で最後の開始深度をもつもの。 */
export function stratumAt(strata: StratumDef[], depthM: number): StratumDef {
  const first = strata[0];
  if (!first) throw new Error('strata is empty');
  const d = Number.isFinite(depthM) && depthM > 0 ? depthM : 0;
  let found = first;
  for (const s of strata) {
    if (s.startDepthM <= d) found = s;
    else break;
  }
  return found;
}

export function oresOf(catalog: Catalog, stratumId: string): OreDef[] {
  return catalog.ores.filter((o) => o.stratumId === stratumId);
}

export function findOre(catalog: Catalog, oreId: string): OreDef | undefined {
  return catalog.ores.find((o) => o.id === oreId);
}
