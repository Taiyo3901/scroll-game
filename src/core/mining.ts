/** 調べる（発見）の開始条件。スクロールが止まっていれば発見できる。 */
export const CONDITION_KEYS = [
  'stopped', // 最後のスクロールから一定時間たっている
  'visible', // タブが表示中である
  'underDailyCap', // 今日の発見数が上限未満
  'oncePerStop', // この立ち止まりでは、まだ品を見つけていない
] as const;

export type ConditionKey = (typeof CONDITION_KEYS)[number];

export const CONDITION_LABELS: Record<ConditionKey, string> = {
  stopped: 'スクロール停止',
  visible: '表示中',
  underDailyCap: '今日の上限内',
  oncePerStop: '今回はまだ未発見',
};

export interface MiningInput {
  /** 最後のスクロール（向きや原因を問わない）からの経過ms。一度もなければ Infinity */
  msSinceLastScroll: number;
  startDelayMs: number;
  visible: boolean;
  findsToday: number;
  maxFindsPerDay: number;
  /** この立ち止まりで、すでに品を見つけた（次にスクロールするまで、もう見つからない） */
  foundThisStop: boolean;
}

export type ConditionResult = Record<ConditionKey, boolean>;

export function evaluateConditions(i: MiningInput): { ok: boolean; checks: ConditionResult } {
  const checks: ConditionResult = {
    stopped: i.msSinceLastScroll >= i.startDelayMs,
    visible: i.visible,
    underDailyCap: i.findsToday < i.maxFindsPerDay,
    oncePerStop: !i.foundThisStop,
  };
  return { ok: CONDITION_KEYS.every((k) => checks[k]), checks };
}
