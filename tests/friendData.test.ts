import { describe, expect, it } from 'vitest';
import { parseFriendDoc } from '../src/core/friendData';
import { limitsFor } from '../src/core/publicProfile';
import { CATALOG } from '../src/data';

const limits = limitsFor(300, 10);
const parse = (raw: unknown) => parseFriendDoc('u1', raw, limits, CATALOG);

describe('parseFriendDoc', () => {
  it('reads a normal shared profile', () => {
    const f = parse({
      nickname: 'たろう',
      shared: true,
      weekly: { weekId: '2026-W43', points: 10, finds: 6 },
      collection: { 'film-scrap': 2 },
      showcase: ['film-scrap'],
      genreFinds: { video: 5 },
    })!;
    expect(f).toMatchObject({ uid: 'u1', nickname: 'たろう', shared: true, suspicious: false });
    expect(f.weekly).toEqual({ weekId: '2026-W43', points: 10, finds: 6 });
    expect(f.collection).toEqual({ 'film-scrap': 2 });
    expect(f.showcase).toEqual(['film-scrap']);
    expect(f.genreFinds).toEqual({ video: 5 });
  });

  it('a profile that shares nothing has empty collection, showcase and room mix', () => {
    const f = parse({ nickname: 'a', shared: false, weekly: { weekId: '2026-W43', points: 1, finds: 1 } })!;
    expect(f.shared).toBe(false);
    expect(f.collection).toEqual({});
    expect(f.showcase).toEqual([]);
    expect(f.genreFinds).toEqual({});
    expect(f.suspicious).toBe(false);
  });

  it('returns null for something that is not a profile', () => {
    for (const bad of [null, undefined, 'x', 5, [], {}, { nickname: 3 }]) expect(parse(bad), JSON.stringify(bad)).toBeNull();
  });

  it('drops unknown items, unknown rooms and non-numbers', () => {
    const f = parse({
      nickname: 'a',
      collection: { 'film-scrap': 1, nope: 5, 'rusty-gear': 'x' },
      genreFinds: { video: 2, zzz: 9 },
      showcase: ['film-scrap', 'nope', 3, 'film-scrap'],
    })!;
    expect(f.collection).toEqual({ 'film-scrap': 1 });
    expect(f.genreFinds).toEqual({ video: 2 });
    expect(f.showcase).toEqual(['film-scrap']);
  });

  it('flags and clamps values over the limits', () => {
    const f = parse({ nickname: 'a', weekly: { weekId: '2026-W43', points: 99999999, finds: 5 } })!;
    expect(f.weekly?.points).toBe(limits.maxPointsPerWeek);
    expect(f.suspicious).toBe(true);
  });

  it('ignores a weekly entry with a bad week id, and caps the showcase at 3', () => {
    const f = parse({
      nickname: 'a',
      weekly: { weekId: 'abc', points: 1, finds: 1 },
      showcase: ['film-scrap', 'worn-ticket', 'rusty-gear', 'old-pouch'],
    })!;
    expect(f.weekly).toBeNull();
    expect(f.showcase).toHaveLength(3);
  });

  it('truncates a very long nickname', () => {
    expect(parse({ nickname: 'a'.repeat(500) })!.nickname).toHaveLength(64);
  });
});
