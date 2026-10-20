import { describe, expect, it } from 'vitest';
import type { FriendData } from '../src/core/friendData';
import { buildRanking, type RankingMe } from '../src/core/ranking';
import { CATALOG } from '../src/data';

const WEEK = '2026-W43';
const me: RankingMe = {
  uid: 'me',
  nickname: 'わたし',
  weekly: { weekId: WEEK, points: 20, finds: 8 },
  collectionCount: 12,
  jobName: '賢者',
};
const friend = (o: Partial<FriendData> & { uid: string }): FriendData => ({
  nickname: o.uid,
  weekly: { weekId: WEEK, points: 0, finds: 0 },
  shared: false,
  collection: {},
  showcase: [],
  genreFinds: {},
  suspicious: false,
  ...o,
});

describe('buildRanking', () => {
  it('orders by this week\'s points, highest first, and numbers from 1', () => {
    const rows = buildRanking(
      me,
      [friend({ uid: 'a', weekly: { weekId: WEEK, points: 50, finds: 9 } }), friend({ uid: 'b', weekly: { weekId: WEEK, points: 5, finds: 2 } })],
      WEEK,
      CATALOG,
    );
    expect(rows.map((r) => [r.uid, r.rank])).toEqual([['a', 1], ['me', 2], ['b', 3]]);
  });

  it('same points share a rank, and the next rank skips (1, 1, 3)', () => {
    const rows = buildRanking(
      me,
      [friend({ uid: 'a', weekly: { weekId: WEEK, points: 20, finds: 3 } }), friend({ uid: 'b', weekly: { weekId: WEEK, points: 1, finds: 1 } })],
      WEEK,
      CATALOG,
    );
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('ties are ordered by finds, then me first, then name', () => {
    const rows = buildRanking(
      me,
      [
        friend({ uid: 'z', nickname: 'ざ', weekly: { weekId: WEEK, points: 20, finds: 8 } }),
        friend({ uid: 'a', nickname: 'あ', weekly: { weekId: WEEK, points: 20, finds: 8 } }),
        friend({ uid: 'k', nickname: 'か', weekly: { weekId: WEEK, points: 20, finds: 10 } }),
      ],
      WEEK,
      CATALOG,
    );
    expect(rows.map((r) => r.uid)).toEqual(['k', 'me', 'a', 'z']);
  });

  it("a friend whose last report is from another week counts as 0 this week and is marked", () => {
    const rows = buildRanking(
      me,
      [friend({ uid: 'old', weekly: { weekId: '2026-W42', points: 999, finds: 99 } }), friend({ uid: 'none', weekly: null })],
      WEEK,
      CATALOG,
    );
    const old = rows.find((r) => r.uid === 'old')!;
    expect(old).toMatchObject({ points: 0, finds: 0, noWeek: true });
    expect(rows.find((r) => r.uid === 'none')).toMatchObject({ points: 0, noWeek: true });
    expect(rows[0]?.uid).toBe('me');
  });

  it('shows collection count and job only for friends who share them', () => {
    const rows = buildRanking(
      me,
      [
        friend({ uid: 'open', shared: true, collection: { 'film-scrap': 1, 'worn-ticket': 1 }, genreFinds: { video: 8, dev: 2 } }),
        friend({ uid: 'closed', shared: false, collection: { 'film-scrap': 1 }, genreFinds: { video: 9 } }),
      ],
      WEEK,
      CATALOG,
    );
    expect(rows.find((r) => r.uid === 'open')).toMatchObject({ collectionCount: 2, jobName: '踊り子', shared: true });
    expect(rows.find((r) => r.uid === 'closed')).toMatchObject({ collectionCount: null, jobName: null, shared: false });
  });

  it('my row uses my own live values and is flagged', () => {
    const rows = buildRanking(me, [], WEEK, CATALOG);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ isMe: true, points: 20, finds: 8, collectionCount: 12, jobName: '賢者', rank: 1 });
  });

  it('carries the suspicious flag from the friend data', () => {
    const rows = buildRanking(me, [friend({ uid: 'x', suspicious: true })], WEEK, CATALOG);
    expect(rows.find((r) => r.uid === 'x')?.suspicious).toBe(true);
  });

  it('does not use depth or scroll distance (the row has no such field)', () => {
    const row = buildRanking(me, [], WEEK, CATALOG)[0]!;
    expect(Object.keys(row)).not.toContain('depthM');
    expect(Object.keys(row)).not.toContain('scrollPx');
  });
});
