/** 採掘の開始条件（SPEC 4.4）。キーは仕様の番号と対応する。 */
export const CONDITION_KEYS = [
  'exploring', // 1 探検中である
  'delay', // 2 最後のスクロールから一定時間たっている
  'notSkimming', // 3 流し読み状態でなく、クールダウン中でもない
  'visibleFocus', // 4 タブが表示中で、ウィンドウが前面にある
  'idleActive', // 5 chrome.idle が active
  'enoughText', // 6 画面内にある程度の文字がある
  'newSpot', // 7 その画面位置でまだ掘っていない
  'underDailyCap', // 8 今日の採掘回数が上限未満
] as const;

export type ConditionKey = (typeof CONDITION_KEYS)[number];

export const CONDITION_LABELS: Record<ConditionKey, string> = {
  exploring: '探検中',
  delay: 'スクロール後の待ち',
  notSkimming: '流し読みでない',
  visibleFocus: '表示中・前面',
  idleActive: '離席していない',
  enoughText: '文字が十分ある',
  newSpot: '未採掘の位置',
  underDailyCap: '今日の上限内',
};

export interface MiningInput {
  exploring: boolean;
  /** 最後のスクロール（向きや原因を問わない）からの経過ms。一度もなければ Infinity */
  msSinceLastScroll: number;
  startDelayMs: number;
  skimming: boolean;
  inCooldown: boolean;
  visible: boolean;
  focused: boolean;
  idleActive: boolean;
  visibleChars: number;
  minChars: number;
  spotDug: boolean;
  minesToday: number;
  maxMinesPerDay: number;
}

export type ConditionResult = Record<ConditionKey, boolean>;

export function evaluateConditions(i: MiningInput): { ok: boolean; checks: ConditionResult } {
  const checks: ConditionResult = {
    exploring: i.exploring,
    delay: i.msSinceLastScroll >= i.startDelayMs,
    notSkimming: !i.skimming && !i.inCooldown,
    visibleFocus: i.visible && i.focused,
    idleActive: i.idleActive,
    enoughText: i.visibleChars >= i.minChars,
    newSpot: !i.spotDug,
    underDailyCap: i.minesToday < i.maxMinesPerDay,
  };
  return { ok: CONDITION_KEYS.every((k) => checks[k]), checks };
}

/**
 * 「掘った場所」のキー: スクロールしている要素と、スクロール位置を画面の高さ単位で
 * 丸めた値の組。URLは含めない。
 */
export function spotKey(elementId: number, scrollTop: number, viewportH: number): string {
  const h = viewportH > 0 ? viewportH : 1;
  const slot = Number.isFinite(scrollTop) ? Math.round(scrollTop / h) : 0;
  return `${elementId}:${slot}`;
}

/** 要素の文字数の概算。見えている面積に入りきる文字数を上限にする（半分しか見えていない段落など）。 */
export function capChars(directChars: number, visibleAreaPx: number, fontSizePx: number): number {
  if (directChars <= 0 || visibleAreaPx <= 0) return 0;
  const fs = fontSizePx > 0 ? fontSizePx : 16;
  const maxByArea = visibleAreaPx / (fs * fs * 0.5);
  return Math.min(directChars, Math.floor(maxByArea));
}
