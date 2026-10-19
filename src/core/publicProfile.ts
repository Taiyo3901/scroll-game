import type { Catalog } from './catalog.ts';
import type { Profile } from './profile.ts';
import type { DayStats, GameState } from './state.ts';
import { isoWeekId } from './week.ts';

/** フレンドに見せる範囲（初期設定は、すべて見せない）。 */
export interface ShareSettings {
  /** 図鑑・飾り棚・部屋の分布を、フレンドに見せる */
  enabled: boolean;
  /** 見せない部屋のID。その部屋の発見品は図鑑から伏せ、分布にも含めない */
  hiddenGenres: string[];
}

export const defaultShare = (): ShareSettings => ({ enabled: false, hiddenGenres: [] });

export function normalizeShare(raw: unknown, genreIds: readonly string[]): ShareSettings {
  const base = defaultShare();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const hidden = Array.isArray(r.hiddenGenres)
    ? [...new Set(r.hiddenGenres.filter((g): g is string => typeof g === 'string' && genreIds.includes(g)))]
    : [];
  return { enabled: r.enabled === true, hiddenGenres: hidden };
}

/** 送る値の上限（Firestore のルールと同じ値を使う）。 */
export interface PublicLimits {
  maxPointsPerWeek: number;
  maxFindsPerWeek: number;
  maxItemCount: number;
  maxGenreFinds: number;
}

export function limitsFor(maxFindsPerDay: number, maxPointsPerFind: number): PublicLimits {
  return {
    maxFindsPerWeek: maxFindsPerDay * 7,
    maxPointsPerWeek: maxFindsPerDay * 7 * maxPointsPerFind,
    maxItemCount: 9999,
    maxGenreFinds: 99999,
  };
}

export interface WeeklyTotals {
  weekId: string;
  points: number;
  finds: number;
}

/** いまの週（月曜はじまりのISO週）の、ポイントと発見数。 */
export function weeklyTotals(days: Record<string, DayStats>, now: Date): WeeklyTotals {
  const weekId = isoWeekId(now);
  let points = 0;
  let finds = 0;
  for (const [key, d] of Object.entries(days)) {
    const [y, m, dd] = key.split('-').map(Number);
    if (!y || !m || !dd || isoWeekId(new Date(y, m - 1, dd)) !== weekId) continue;
    points += d.points;
    finds += d.finds;
  }
  return { weekId, points, finds };
}

/** Firestore の users/{uid} に送る、ニックネームとフレンドコード以外の値。値のないものは undefined（送るとき消す）。 */
export interface PublicFields {
  weekly: WeeklyTotals;
  shared: boolean;
  collection: Record<string, number> | undefined;
  showcase: string[] | undefined;
  genreFinds: Record<string, number> | undefined;
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.floor(Number.isFinite(n) ? n : 0)));

/**
 * フレンドに見せる値を組み立てる。
 * - 週の集計（ポイント・発見数）は、ランキングのために常に送る。
 * - 図鑑・飾り棚・部屋の分布は、share.enabled のときだけ送る。見せない部屋の発見品と分布は除く。
 * ホスト名・URL・ページの内容は、ここには入らない。
 */
export function buildPublicFields(input: {
  state: GameState;
  profile: Profile;
  share: ShareSettings;
  catalog: Catalog;
  now: Date;
  limits: PublicLimits;
}): PublicFields {
  const { state, profile, share, catalog, now, limits } = input;
  const w = weeklyTotals(state.days, now);
  const weekly: WeeklyTotals = {
    weekId: w.weekId,
    points: clamp(w.points, limits.maxPointsPerWeek),
    finds: clamp(w.finds, limits.maxFindsPerWeek),
  };
  if (!share.enabled) return { weekly, shared: false, collection: undefined, showcase: undefined, genreFinds: undefined };

  const hidden = new Set(share.hiddenGenres);
  const visible = new Set(
    catalog.items.filter((i) => !i.genreId || !hidden.has(i.genreId)).map((i) => i.id),
  );
  const collection: Record<string, number> = {};
  for (const [id, n] of Object.entries(state.collection)) {
    if (visible.has(id) && n > 0) collection[id] = clamp(n, limits.maxItemCount);
  }
  const genreFinds: Record<string, number> = {};
  for (const d of Object.values(state.days)) {
    for (const [g, n] of Object.entries(d.genreFinds)) {
      if (!hidden.has(g) && catalog.genres.some((x) => x.id === g)) genreFinds[g] = (genreFinds[g] ?? 0) + n;
    }
  }
  for (const g of Object.keys(genreFinds)) genreFinds[g] = clamp(genreFinds[g] ?? 0, limits.maxGenreFinds);
  return {
    weekly,
    shared: true,
    collection,
    showcase: profile.showcase.filter((id) => visible.has(id) && (collection[id] ?? 0) > 0),
    genreFinds,
  };
}
