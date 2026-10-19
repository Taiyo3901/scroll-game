import { pxToMeters } from './depth.ts';
import type { DayStats } from './state.ts';
import { isoWeekId } from './week.ts';

/** 記録ページの1行（1日、または1週間ぶん）。 */
export interface StatsRow {
  /** 日付 (YYYY-MM-DD) または週ID (YYYY-Www) */
  label: string;
  mines: number;
  points: number;
  selfReturns: number;
  forcedReturns: number;
  scrollPx: number;
}

const rowOf = (label: string, d: DayStats): StatsRow => ({
  label,
  mines: d.mines,
  points: d.points,
  selfReturns: d.selfReturns,
  forcedReturns: d.forcedReturns,
  scrollPx: d.scrollPx,
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
      cur.mines += d.mines;
      cur.points += d.points;
      cur.selfReturns += d.selfReturns;
      cur.forcedReturns += d.forcedReturns;
      cur.scrollPx += d.scrollPx;
    }
  }
  return [...byWeek.values()].sort((a, b) => a.label.localeCompare(b.label));
}

const HEADER = ['期間', '採掘回数', '獲得ポイント', '自分で戻った回数', '強制帰還の回数', '総スクロール距離(px)', '実距離(m)'];

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV本文（先頭の BOM は付けない。Excel向けの BOM は書き出し側で足す）。 */
export function toCsv(rows: StatsRow[]): string {
  const lines = [HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.label,
        r.mines,
        r.points,
        r.selfReturns,
        r.forcedReturns,
        Math.round(r.scrollPx),
        pxToMeters(r.scrollPx).toFixed(2),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}
