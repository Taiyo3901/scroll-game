import type { GenreDef } from './catalog.ts';
import type { DayStats } from './state.ts';

export interface Job {
  /** 職業名 */
  name: string;
  /** 決め手になった部屋（勇者のときは null） */
  genreId: string | null;
  /** 集計した発見数 */
  total: number;
}

/** 4割以上を占める部屋があれば、その部屋の職業。なければ勇者（万能）。 */
export const JOB_SHARE = 0.4;
export const ALL_ROUNDER = '勇者';
/** この数に満たないうちは診断しない（偏りと呼べないため） */
export const JOB_MIN_FINDS = 5;

/** 部屋ごとの発見数の合計。 */
export function sumGenreFinds(days: DayStats[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of days) for (const [g, n] of Object.entries(d.genreFinds)) out[g] = (out[g] ?? 0) + n;
  return out;
}

/** 職業診断。発見数が少ないうちは null。 */
export function diagnoseJob(genreFinds: Record<string, number>, genres: GenreDef[]): Job | null {
  const total = Object.values(genreFinds).reduce((a, b) => a + b, 0);
  if (total < JOB_MIN_FINDS) return null;

  let top: GenreDef | undefined;
  let topN = 0;
  for (const g of genres) {
    const n = genreFinds[g.id] ?? 0;
    if (n > topN) {
      top = g;
      topN = n;
    }
  }
  if (top && topN / total >= JOB_SHARE) return { name: top.job, genreId: top.id, total };
  return { name: ALL_ROUNDER, genreId: null, total };
}
