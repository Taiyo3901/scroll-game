import { pxToDepth } from './depth.ts';
import { areaAt, isGenreId, OTHER_GENRE, type Catalog, type Rarity } from './catalog.ts';
import { isContainerKind, type ContainerKind, type ContainerRules } from './containers.ts';
import { drawItem } from './loot.ts';
import { MAX_EVENTS, emptyDay, type DayStats, type GameEvent, type GameState } from './state.ts';

export interface Rules {
  depthMultiplier: number;
  maxFindsPerDay: number;
  /** この間隔(ms)より短い発見の報告は受け付けない（連続送信対策） */
  minFindIntervalMs: number;
  rarityPoints: Record<Rarity, number>;
  containers: ContainerRules;
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

function pushEvent(s: GameState, e: Omit<GameEvent, 'seq'>): GameState {
  const seq = (s.events[s.events.length - 1]?.seq ?? 0) + 1;
  return { ...s, events: [...s.events, { ...e, seq }].slice(-MAX_EVENTS) };
}

export function findsToday(s: GameState, dayKey: string): number {
  return s.days[dayKey]?.finds ?? 0;
}

/** スクロール距離(content script からのまとめ送り)を反映する。 */
export function applyScroll(state: GameState, batch: { px: number }, dayKey: string, env: Env): GameState {
  const px = clean(batch.px);
  if (px === 0) return state;
  const s = withDay(state, dayKey, (d) => ({ ...d, scrollPx: d.scrollPx + px }));
  return { ...s, depthM: s.depthM + pxToDepth(px, env.rules.depthMultiplier) };
}

/**
 * 発見の報告を反映する。上限を超えた報告や、間隔が短すぎる報告は無視する。
 * genreId が不明な値のときは「未踏の地」、container が不明な値のときは「箱」として扱う。
 * 見つけた品は、そのまま図鑑に入る。
 */
export function applyFind(
  state: GameState,
  genreId: unknown,
  now: number,
  dayKey: string,
  env: Env,
  container: unknown = 'box',
): GameState {
  const { rules, catalog } = env;
  if (findsToday(state, dayKey) >= rules.maxFindsPerDay) return state;
  if (now - state.lastFindAt < rules.minFindIntervalMs) return state;

  const genre = isGenreId(catalog, genreId) ? genreId : OTHER_GENRE;
  const kind: ContainerKind = isContainerKind(container) ? container : 'box';
  const item = drawItem(catalog, genre, areaAt(catalog.areas, state.depthM), env.rng, kind, rules.containers);
  if (!item) return state;

  const points = rules.rarityPoints[item.rarity] ?? 0;
  let s: GameState = {
    ...state,
    collection: { ...state.collection, [item.id]: (state.collection[item.id] ?? 0) + 1 },
    lastFindAt: now,
  };
  s = withDay(s, dayKey, (d) => ({
    ...d,
    finds: d.finds + 1,
    points: d.points + points,
    // 階層の秘宝は部屋に属さないので、閲覧中の部屋で数える
    genreFinds: { ...d.genreFinds, [genre]: (d.genreFinds[genre] ?? 0) + 1 },
    containers: { ...d.containers, [kind]: (d.containers[kind] ?? 0) + 1 },
  }));
  return pushEvent(s, { at: now, kind: 'found', itemId: item.id });
}
