/** 採掘の開始条件。スクロールが止まっていれば掘る（流し読み・文字量・場所の判定はしない）。 */
export const CONDITION_KEYS = [
  'exploring', // 探検中である
  'stopped', // 最後のスクロールから一定時間たっている
  'visible', // タブが表示中である
  'underDailyCap', // 今日の採掘回数が上限未満
] as const;

export type ConditionKey = (typeof CONDITION_KEYS)[number];

export const CONDITION_LABELS: Record<ConditionKey, string> = {
  exploring: '探検中',
  stopped: 'スクロール停止',
  visible: '表示中',
  underDailyCap: '今日の上限内',
};

export interface MiningInput {
  exploring: boolean;
  /** 最後のスクロール（向きや原因を問わない）からの経過ms。一度もなければ Infinity */
  msSinceLastScroll: number;
  startDelayMs: number;
  visible: boolean;
  minesToday: number;
  maxMinesPerDay: number;
}

export type ConditionResult = Record<ConditionKey, boolean>;

export function evaluateConditions(i: MiningInput): { ok: boolean; checks: ConditionResult } {
  const checks: ConditionResult = {
    exploring: i.exploring,
    stopped: i.msSinceLastScroll >= i.startDelayMs,
    visible: i.visible,
    underDailyCap: i.minesToday < i.maxMinesPerDay,
  };
  return { ok: CONDITION_KEYS.every((k) => checks[k]), checks };
}
