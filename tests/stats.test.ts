import { describe, expect, it } from 'vitest';
import { dailyRows, toCsv, weeklyRows } from '../src/core/stats';
import { emptyDay, type DayStats } from '../src/core/state';
import { defaultProfile, normalizeProfile, toggleShowcase } from '../src/core/profile';
import { CATALOG } from '../src/data';

const day = (o: Partial<DayStats>): DayStats => ({ ...emptyDay(), ...o });

const days = {
  '2026-10-19': day({ finds: 3, points: 5, scrollPx: 1000, genreFinds: { video: 2, dev: 1 }, containers: { pot: 2, chest: 1 } }), // 月
  '2026-10-18': day({ finds: 2, points: 4, scrollPx: 500, genreFinds: { video: 2 }, containers: { box: 2 } }), // 日（前週）
  '2026-10-20': day({ finds: 1, points: 1, scrollPx: 200, genreFinds: { dev: 1 }, containers: { pot: 1 } }), // 火
};

describe('stats rows', () => {
  it('daily rows are sorted oldest first', () => {
    expect(dailyRows(days).map((r) => r.label)).toEqual(['2026-10-18', '2026-10-19', '2026-10-20']);
  });
  it('weekly rows group by ISO week (Monday start), sum, and merge room counts', () => {
    const w = weeklyRows(days);
    expect(w.map((r) => r.label)).toEqual(['2026-W42', '2026-W43']);
    expect(w[0]).toMatchObject({ finds: 2, points: 4, scrollPx: 500, genreFinds: { video: 2 } });
    expect(w[1]).toMatchObject({ finds: 4, points: 6, scrollPx: 1200, genreFinds: { video: 2, dev: 2 }, containers: { pot: 3, chest: 1 } });
  });
  it('does not mutate the source days when merging weeks', () => {
    weeklyRows(days);
    expect(days['2026-10-19'].genreFinds).toEqual({ video: 2, dev: 1 });
  });
  it('empty data gives no rows', () => {
    expect(dailyRows({})).toEqual([]);
    expect(weeklyRows({})).toEqual([]);
  });
});

describe('toCsv', () => {
  const csv = toCsv(dailyRows(days), CATALOG.genres);
  const lines = csv.trim().split('\r\n');
  it('has a header (with one column per room) and one line per row, CRLF separated', () => {
    expect(lines).toHaveLength(4);
    const head = lines[0]!.split(',');
    expect(head.slice(0, 5)).toEqual(['期間', '発見数', '獲得ポイント', '総スクロール距離(px)', '実距離(m)']);
    expect(head.slice(5, 9)).toEqual(['壺', '箱', '宝箱', 'ミミック']);
    expect(head.slice(9)).toEqual(CATALOG.genres.map((g) => g.name));
  });
  it('writes room counts in the matching columns', () => {
    const head = lines[0]!.split(',');
    const row = lines[2]!.split(','); // 2026-10-19
    expect(row.slice(0, 5)).toEqual(['2026-10-19', '3', '5', '1000', '0.26']);
    expect(row[head.indexOf('壺')]).toBe('2');
    expect(row[head.indexOf('宝箱')]).toBe('1');
    expect(row[head.indexOf('劇場')]).toBe('2');
    expect(row[head.indexOf('工房')]).toBe('1');
    expect(row[head.indexOf('酒場')]).toBe('0');
  });
  it('quotes cells that need it', () => {
    const q = toCsv([{ label: 'a,"b"', finds: 0, points: 0, scrollPx: 0, genreFinds: {}, containers: {} }], []);
    expect(q).toContain('"a,""b"""');
  });
});

describe('showcase', () => {
  const col = { 'old-pouch': 2, 'cracked-urn': 1, 'mystery-key': 1, 'guardian-ring': 1 };
  it('adds owned items up to 3 and ignores the rest', () => {
    let p = defaultProfile();
    for (const id of ['old-pouch', 'cracked-urn', 'mystery-key', 'guardian-ring']) p = toggleShowcase(p, id, col);
    expect(p.showcase).toEqual(['old-pouch', 'cracked-urn', 'mystery-key']);
  });
  it('removes an item that is already displayed, then frees a slot', () => {
    let p = toggleShowcase(toggleShowcase(defaultProfile(), 'old-pouch', col), 'cracked-urn', col);
    p = toggleShowcase(p, 'old-pouch', col);
    expect(p.showcase).toEqual(['cracked-urn']);
  });
  it('cannot display an undiscovered item', () => {
    expect(toggleShowcase(defaultProfile(), 'nope', col).showcase).toEqual([]);
  });
  it('normalize drops unowned, duplicate and excess ids and bad input', () => {
    const p = normalizeProfile(
      { showcase: ['old-pouch', 'old-pouch', 'zzz', 'cracked-urn', 'mystery-key', 'guardian-ring'], onboarded: true },
      col,
    );
    expect(p.showcase).toEqual(['old-pouch', 'cracked-urn', 'mystery-key']);
    expect(p.onboarded).toBe(true);
    expect(normalizeProfile('x', col)).toEqual(defaultProfile());
  });
});
