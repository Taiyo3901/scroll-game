import { pxToMeters } from './depth.ts';
import type { GenreDef } from './catalog.ts';
import type { DayStats } from './state.ts';
import { isoWeekId } from './week.ts';

/** 記録ページの1行（1日、または1週間ぶん）。 */
export interface StatsRow {
  /** 日付 (YYYY-MM-DD) または週ID (YYYY-Www) */
  label: string;
  finds: number;
  points: number;
  scrollPx: number;
  /** 部屋ごとの発見数 */
  genreFinds: Record<string, number>;
}

const rowOf = (label: string, d: DayStats): StatsRow => ({
  label,
  finds: d.finds,
  points: d.points,
  scrollPx: d.scrollPx,
  genreFinds: { ...d.genreFinds },
});

/** 日ごとの記録。古い順。 */
export function dailyRows(days: Record<string, DayStats>): StatsRow[] {
  return Object.keys(days)
    .sort()
    .map((k) => rowOf(k, days[k] as DayStats));
}

/** 週ごと（月曜はじまりのISO週）の記録。古い順。 */
export function weeklyRows(days: Record<string, DayStats>): StatsRow[] {
  const byWeek = new Map<string, StatsRow>();
  for (const [key, d] of Object.entries(days)) {
    const [y, m, dd] = key.split('-').map(Number);
    if (!y || !m || !dd) continue;
    const week = isoWeekId(new Date(y, m - 1, dd));
    const cur = byWeek.get(week);
    if (!cur) {
      byWeek.set(week, rowOf(week, d));
    } else {
      cur.finds += d.finds;
      cur.points += d.points;
      cur.scrollPx += d.scrollPx;
      for (const [g, n] of Object.entries(d.genreFinds)) cur.genreFinds[g] = (cur.genreFinds[g] ?? 0) + n;
    }
  }
  return [...byWeek.values()].sort((a, b) => a.label.localeCompare(b.label));
}

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV本文（先頭の BOM は付けない。Excel向けの BOM は書き出し側で足す）。部屋ごとの発見数も列にする。 */
export function toCsv(rows: StatsRow[], genres: GenreDef[]): string {
  const header = ['期間', '発見数', '獲得ポイント', '総スクロール距離(px)', '実距離(m)', ...genres.map((g) => g.name)];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.label,
        r.finds,
        r.points,
        Math.round(r.scrollPx),
        pxToMeters(r.scrollPx).toFixed(2),
        ...genres.map((g) => r.genreFinds[g.id] ?? 0),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}
