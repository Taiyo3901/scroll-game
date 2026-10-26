import type { GenreDef } from './catalog.ts';
import { comboJobName } from './jobCombos.ts';
import type { DayStats } from './state.ts';

export interface Job {
  /** 職業名 */
  name: string;
  /** 決め手になった部屋（いちばん多い部屋。勇者のときは null） */
  genreId: string | null;
  /** 組み合わせの職業のときの、2つ目の部屋（それ以外は null） */
  genreId2: string | null;
  /** 集計した発見数 */
  total: number;
}

/** 4割以上を占める部屋があれば、その部屋の職業。なければ勇者（万能）。 */
export const JOB_SHARE = 0.4;
/** 上位2つの部屋が、それぞれこの割合以上を占めると、組み合わせの職業（単独の職業より優先する） */
export const COMBO_SHARE = 0.3;
export const ALL_ROUNDER = '勇者';
/** この数に満たないうちは診断しない（偏りと呼べないため） */
export const JOB_MIN_FINDS = 5;
/** 組み合わせに入れない部屋（どのサイトでもない部屋） */
const NO_COMBO_ROOM = 'other';

/** 部屋ごとの発見数の合計。 */
export function sumGenreFinds(days: DayStats[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of days) for (const [g, n] of Object.entries(d.genreFinds)) out[g] = (out[g] ?? 0) + n;
  return out;
}

/**
 * 職業診断。発見数が少ないうちは null。
 * 上位2つの部屋がそれぞれ3割以上なら、組み合わせの職業。そうでなく、1つの部屋が4割以上なら、その部屋の職業。
 * どちらでもなければ、勇者。
 */
export function diagnoseJob(genreFinds: Record<string, number>, genres: GenreDef[]): Job | null {
  const total = Object.values(genreFinds).reduce((a, b) => a + b, 0);
  if (total < JOB_MIN_FINDS) return null;

  // 多い順（同数なら、部屋の並び順）
  const ranked = genres
    .map((g, order) => ({ g, order, n: genreFinds[g.id] ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.order - b.order);
  const first = ranked[0];
  const second = ranked[1];

  if (first && second && first.g.id !== NO_COMBO_ROOM && second.g.id !== NO_COMBO_ROOM && second.n / total >= COMBO_SHARE) {
    const [a, b] = first.order < second.order ? [first, second] : [second, first];
    const name = comboJobName(a.g.id, b.g.id);
    if (name) return { name, genreId: first.g.id, genreId2: second.g.id, total };
  }
  if (first && first.n / total >= JOB_SHARE) return { name: first.g.job, genreId: first.g.id, genreId2: null, total };
  return { name: ALL_ROUNDER, genreId: null, genreId2: null, total };
}
