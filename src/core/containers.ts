/** 立ち止まったときに現れる入れ物。種類で、見つかる品のレア度の出方が変わる。 */
export const CONTAINER_KINDS = ['pot', 'box', 'chest', 'mimic'] as const;
export type ContainerKind = (typeof CONTAINER_KINDS)[number];

export const CONTAINER_LABELS: Record<ContainerKind, string> = {
  pot: '壺',
  box: '箱',
  chest: '宝箱',
  mimic: 'ミミック',
};

/** ミミックは宝箱に化けているので、抽選の対象は壺・箱・宝箱の3つ。 */
export type RealContainer = 'pot' | 'box' | 'chest';

export interface ContainerRules {
  /** 出やすさの重み */
  weights: Record<RealContainer, number>;
  /** ★1・★2・★3 の重みに掛ける倍率 */
  rarityMult: Record<RealContainer, [number, number, number]>;
  /** 宝箱が、実はミミックだった確率 */
  mimicInChest: number;
}

export function isContainerKind(v: unknown): v is ContainerKind {
  return typeof v === 'string' && (CONTAINER_KINDS as readonly string[]).includes(v);
}

/** 入れ物を1つ決める。rng は [0, 1) を返す関数。 */
export function rollContainer(rules: ContainerRules, rng: () => number): ContainerKind {
  const kinds = Object.keys(rules.weights) as RealContainer[];
  const total = kinds.reduce((s, k) => s + rules.weights[k], 0);
  let r = rng() * total;
  let kind: RealContainer = kinds[kinds.length - 1] as RealContainer;
  for (const k of kinds) {
    r -= rules.weights[k];
    if (r < 0) {
      kind = k;
      break;
    }
  }
  if (kind === 'chest' && rng() < rules.mimicInChest) return 'mimic';
  return kind;
}
