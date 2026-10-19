import { describe, expect, it } from 'vitest';
import { dailyRows, toCsv, weeklyRows } from '../src/core/stats';
import { emptyDay, type DayStats } from '../src/core/state';
import { defaultProfile, normalizeProfile, toggleShowcase } from '../src/core/profile';

const day = (o: Partial<DayStats>): DayStats => ({ ...emptyDay(), ...o });

const days = {
  '2026-10-19': day({ mines: 3, points: 5, selfReturns: 1, scrollPx: 1000 }), // 月
  '2026-10-18': day({ mines: 2, points: 4, forcedReturns: 1, scrollPx: 500 }), // 日（前週）
  '2026-10-20': day({ mines: 1, points: 1, scrollPx: 200 }), // 火
};

describe('stats rows', () => {
  it('daily rows are sorted oldest first', () => {
    expect(dailyRows(days).map((r) => r.label)).toEqual(['2026-10-18', '2026-10-19', '2026-10-20']);
  });
  it('weekly rows group by ISO week (Monday start) and sum', () => {
    const w = weeklyRows(days);
    expect(w.map((r) => r.label)).toEqual(['2026-W42', '2026-W43']);
    expect(w[0]).toMatchObject({ mines: 2, points: 4, forcedReturns: 1, scrollPx: 500 });
    expect(w[1]).toMatchObject({ mines: 4, points: 6, selfReturns: 1, scrollPx: 1200 });
  });
  it('empty data gives no rows', () => {
    expect(dailyRows({})).toEqual([]);
    expect(weeklyRows({})).toEqual([]);
  });
});

describe('toCsv', () => {
  it('has a header and one line per row, CRLF separated', () => {
    const csv = toCsv(dailyRows(days));
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('期間,採掘回数,獲得ポイント,自分で戻った回数,強制帰還の回数,総スクロール距離(px),実距離(m)');
    expect(lines[2]).toBe('2026-10-19,3,5,1,0,1000,0.26');
  });
  it('quotes cells that need it', () => {
    const csv = toCsv([{ label: 'a,"b"', mines: 0, points: 0, selfReturns: 0, forcedReturns: 0, scrollPx: 0 }]);
    expect(csv).toContain('"a,""b"""');
  });
});

describe('showcase', () => {
  const col = { pebble: 2, quartz: 1, amber: 1, tooth: 1 };
  it('adds owned ores up to 3 and ignores the rest', () => {
    let p = defaultProfile();
    p = toggleShowcase(p, 'pebble', col);
    p = toggleShowcase(p, 'quartz', col);
    p = toggleShowcase(p, 'amber', col);
    p = toggleShowcase(p, 'tooth', col);
    expect(p.showcase).toEqual(['pebble', 'quartz', 'amber']);
  });
  it('removes an ore that is already displayed, then frees a slot', () => {
    let p = toggleShowcase(toggleShowcase(defaultProfile(), 'pebble', col), 'quartz', col);
    p = toggleShowcase(p, 'pebble', col);
    expect(p.showcase).toEqual(['quartz']);
  });
  it('cannot display an undiscovered ore', () => {
    expect(toggleShowcase(defaultProfile(), 'nope', col).showcase).toEqual([]);
  });
  it('normalize drops unowned, duplicate and excess ids and bad input', () => {
    const p = normalizeProfile({ showcase: ['pebble', 'pebble', 'zzz', 'quartz', 'amber', 'tooth'], onboarded: true }, col);
    expect(p.showcase).toEqual(['pebble', 'quartz', 'amber']);
    expect(p.onboarded).toBe(true);
    expect(normalizeProfile('x', col)).toEqual(defaultProfile());
  });
});
