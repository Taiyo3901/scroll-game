import { pxToDepth, pxToMeters } from './depth';
import { drawOre } from './loot';
import {
  MAX_EVENTS,
  emptyDay,
  type DayStats,
  type GameEvent,
  type MinedEvent,
  type ReturnedEvent,
  type GameState,
} from './state';
import { findOre, oresOf, stratumAt, type Catalog, type Rarity } from './strata';

export interface Rules {
  depthMultiplier: number;
  oilMax: number;
  oilPerMine: number;
  /** 実際の距離1mあたりの油の消費量 */
  oilPerMeter: number;
  oilRecoverPerMin: number;
  /** 地上から探検を再開するのに必要な油 */
  startOilMin: number;
  maxMinesPerDay: number;
  autoReturnMin: number;
  /** この間隔(ms)より短い採掘完了の報告は受け付けない（連続送信対策） */
  miningMinIntervalMs: number;
  rarityWeights: Record<Rarity, number>;
  rarityPoints: Record<Rarity, number>;
}

export interface Env {
  rules: Rules;
  catalog: Catalog;
  /** [0, 1) の乱数。テストでは固定値を渡す */
  rng: () => number;
}

const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

function withDay(s: GameState, dayKey: string, f: (d: DayStats) => DayStats): GameState {
  return { ...s, days: { ...s.days, [dayKey]: f(s.days[dayKey] ?? emptyDay()) } };
}

type NewEvent = Omit<MinedEvent, 'seq'> | Omit<ReturnedEvent, 'seq'>;

function pushEvent(s: GameState, e: NewEvent): GameState {
  const seq = (s.events[s.events.length - 1]?.seq ?? 0) + 1;
  const events = [...s.events, { ...e, seq } as GameEvent].slice(-MAX_EVENTS);
  return { ...s, events };
}

/** 地上にいる間は経過時間ぶん油を回復する。探検中は変化しない。 */
export function settleOil(s: GameState, now: number, rules: Rules): GameState {
  if (s.mode !== 'surface') return { ...s, oilUpdatedAt: now };
  const minutes = Math.max(0, now - s.oilUpdatedAt) / 60_000;
  const oil = Math.min(rules.oilMax, s.oil + minutes * rules.oilRecoverPerMin);
  return { ...s, oil, oilUpdatedAt: now };
}

export const currentOil = (s: GameState, now: number, rules: Rules): number =>
  settleOil(s, now, rules).oil;

export function minesToday(s: GameState, dayKey: string): number {
  return s.days[dayKey]?.mines ?? 0;
}

function bagSize(bag: Record<string, number>): number {
  return Object.values(bag).reduce((a, b) => a + b, 0);
}

export function bagCount(s: GameState): number {
  return bagSize(s.bag);
}

/**
 * 地上に戻る。バッグの鉱石は図鑑に登録される。
 * 強制帰還(forced)ではバッグの半分（切り捨て）をランダムに失う。
 * 探検中でなければ何もしない。
 */
export function returnToSurface(
  s: GameState,
  how: 'manual' | 'auto' | 'forced',
  now: number,
  dayKey: string,
  env: Env,
): GameState {
  if (s.mode !== 'exploring') return s;

  const items: string[] = [];
  for (const [id, n] of Object.entries(s.bag)) for (let i = 0; i < n; i++) items.push(id);

  let lost = 0;
  if (how === 'forced') {
    lost = Math.floor(items.length / 2);
    // Fisher-Yates で並べ替え、先頭から lost 個を失う
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(env.rng() * (i + 1));
      const a = items[i] as string;
      items[i] = items[j] as string;
      items[j] = a;
    }
    items.splice(0, lost);
  }

  const collection = { ...s.collection };
  let points = 0;
  for (const id of items) {
    collection[id] = (collection[id] ?? 0) + 1;
    const ore = findOre(env.catalog, id);
    if (ore) points += env.rules.rarityPoints[ore.rarity] ?? 0;
  }

  let next: GameState = {
    ...s,
    mode: 'surface',
    bag: {},
    collection,
    oil: Math.max(0, s.oil),
    oilUpdatedAt: now,
  };
  next = withDay(next, dayKey, (d) => ({
    ...d,
    points: d.points + points,
    selfReturns: d.selfReturns + (how === 'forced' ? 0 : 1),
    forcedReturns: d.forcedReturns + (how === 'forced' ? 1 : 0),
  }));
  return pushEvent(next, {
    at: now,
    kind: 'returned',
    how,
    registered: items.length,
    lost,
    points,
  });
}

/** スクロール距離(content script からのまとめ送り)を反映する。 */
export function applyScroll(
  state: GameState,
  batch: { px: number; skimPx: number },
  now: number,
  dayKey: string,
  env: Env,
): GameState {
  const rules = env.rules;
  const px = clean(batch.px);
  const skimPx = clean(batch.skimPx);

  let s = settleOil(state, now, rules);
  if (px === 0 && skimPx === 0) return s;

  s = withDay(s, dayKey, (d) => ({ ...d, scrollPx: d.scrollPx + px, skimPx: d.skimPx + skimPx }));
  s = { ...s, lastActivityAt: now };

  if (s.mode === 'surface') {
    if (s.oil < rules.startOilMin) return s; // 油を補充中。何も起きない
    s = { ...s, mode: 'exploring' };
  }

  if (px > 0) {
    s = {
      ...s,
      depthM: s.depthM + pxToDepth(px, rules.depthMultiplier),
      oil: s.oil - rules.oilPerMeter * pxToMeters(px),
    };
    if (s.oil <= 0) s = returnToSurface(s, 'forced', now, dayKey, env);
  }
  return s;
}

/** 採掘完了の報告を反映する。条件を満たさない報告は無視する。 */
export function applyMine(state: GameState, now: number, dayKey: string, env: Env): GameState {
  const rules = env.rules;
  const s0 = settleOil(state, now, rules);
  if (s0.mode !== 'exploring') return s0;
  if (minesToday(s0, dayKey) >= rules.maxMinesPerDay) return s0;
  if (now - s0.lastMineAt < rules.miningMinIntervalMs) return s0;

  const stratum = stratumAt(env.catalog.strata, s0.depthM);
  const ore = drawOre(oresOf(env.catalog, stratum.id), rules.rarityWeights, env.rng);
  if (!ore) return s0;

  let s: GameState = {
    ...s0,
    bag: { ...s0.bag, [ore.id]: (s0.bag[ore.id] ?? 0) + 1 },
    oil: s0.oil - rules.oilPerMine,
    lastMineAt: now,
    lastActivityAt: now,
  };
  s = withDay(s, dayKey, (d) => ({ ...d, mines: d.mines + 1 }));
  s = pushEvent(s, { at: now, kind: 'mined', oreId: ore.id });
  if (s.oil <= 0) s = returnToSurface(s, 'forced', now, dayKey, env);
  return s;
}

/** AUTO_RETURN_MIN 分スクロールも採掘もなければ、自動で地上に戻る。 */
export function checkAutoReturn(
  state: GameState,
  now: number,
  dayKey: string,
  env: Env,
): GameState {
  if (state.mode !== 'exploring') return state;
  if (now - state.lastActivityAt < env.rules.autoReturnMin * 60_000) return state;
  return returnToSurface(state, 'auto', now, dayKey, env);
}
