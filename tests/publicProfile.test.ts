import { describe, expect, it } from 'vitest';
import { buildPublicFields, defaultShare, limitsFor, normalizeShare, weeklyTotals } from '../src/core/publicProfile';
import { defaultProfile } from '../src/core/profile';
import { emptyDay, initialGameState, type DayStats } from '../src/core/state';
import { CATALOG } from '../src/data';

const limits = limitsFor(300, 10);
const day = (o: Partial<DayStats>): DayStats => ({ ...emptyDay(), ...o });
const NOW = new Date(2026, 9, 21); // 2026-10-21 水曜 (W43)

const state = {
  ...initialGameState(),
  collection: { 'film-scrap': 2, 'worn-ticket': 1, 'rusty-gear': 3, 'secret-cave': 1, 'mimic-fang': 1 },
  days: {
    '2026-10-19': day({ finds: 4, points: 7, genreFinds: { video: 3, dev: 1 } }), // 月 (W43)
    '2026-10-20': day({ finds: 2, points: 3, genreFinds: { video: 2 } }), // 火 (W43)
    '2026-10-18': day({ finds: 9, points: 99, genreFinds: { dev: 9 } }), // 日 (W42)
  },
};

describe('weeklyTotals', () => {
  it('sums only the current ISO week (Monday start)', () => {
    expect(weeklyTotals(state.days, NOW)).toEqual({ weekId: '2026-W43', points: 10, finds: 6 });
  });
  it('is zero when nothing happened this week', () => {
    expect(weeklyTotals({}, NOW)).toEqual({ weekId: '2026-W43', points: 0, finds: 0 });
  });
});

describe('buildPublicFields', () => {
  const profile = { ...defaultProfile(), showcase: ['film-scrap', 'rusty-gear', 'secret-cave'] };

  it('with sharing off, sends only the weekly totals (ranking) and no collection, showcase or room mix', () => {
    const f = buildPublicFields({ state, profile, share: defaultShare(), catalog: CATALOG, now: NOW, limits });
    expect(f.weekly).toEqual({ weekId: '2026-W43', points: 10, finds: 6 });
    expect(f.shared).toBe(false);
    expect(f.collection).toBeUndefined();
    expect(f.showcase).toBeUndefined();
    expect(f.genreFinds).toBeUndefined();
  });

  it('with sharing on, sends the collection, showcase and all-time room mix', () => {
    const f = buildPublicFields({ state, profile, share: { enabled: true, hiddenGenres: [] }, catalog: CATALOG, now: NOW, limits });
    expect(f.shared).toBe(true);
    expect(f.collection).toEqual(state.collection);
    expect(f.showcase).toEqual(['film-scrap', 'rusty-gear', 'secret-cave']);
    expect(f.genreFinds).toEqual({ video: 5, dev: 10 });
  });

  it('hidden rooms disappear from the collection, the showcase and the room mix; secrets and mimic loot stay', () => {
    const f = buildPublicFields({ state, profile, share: { enabled: true, hiddenGenres: ['video'] }, catalog: CATALOG, now: NOW, limits });
    expect(f.collection).toEqual({ 'rusty-gear': 3, 'secret-cave': 1, 'mimic-fang': 1 });
    expect(f.collection).not.toHaveProperty('film-scrap');
    expect(f.showcase).toEqual(['rusty-gear', 'secret-cave']);
    expect(f.genreFinds).toEqual({ dev: 10 });
  });

  it('never includes anything that looks like a host name or URL', () => {
    const f = buildPublicFields({ state, profile, share: { enabled: true, hiddenGenres: [] }, catalog: CATALOG, now: NOW, limits });
    expect(JSON.stringify(f)).not.toMatch(/https?:|\.com|\.jp|www\./);
  });

  it('clamps absurd values to the limits the rules also enforce', () => {
    const wild = {
      ...state,
      collection: { 'film-scrap': 1e9 },
      days: { '2026-10-19': day({ finds: 1e9, points: 1e9, genreFinds: { video: 1e9 } }) },
    };
    const f = buildPublicFields({ state: wild, profile, share: { enabled: true, hiddenGenres: [] }, catalog: CATALOG, now: NOW, limits });
    expect(f.weekly.points).toBe(limits.maxPointsPerWeek);
    expect(f.weekly.finds).toBe(limits.maxFindsPerWeek);
    expect(f.collection?.['film-scrap']).toBe(limits.maxItemCount);
    expect(f.genreFinds?.video).toBe(limits.maxGenreFinds);
  });

  it('drops showcase entries that are not owned', () => {
    const f = buildPublicFields({
      state,
      profile: { ...defaultProfile(), showcase: ['legend-film-can'] },
      share: { enabled: true, hiddenGenres: [] },
      catalog: CATALOG,
      now: NOW,
      limits,
    });
    expect(f.showcase).toEqual([]);
  });
});

describe('normalizeShare', () => {
  const ids = CATALOG.genres.map((g) => g.id);
  it('defaults to sharing nothing', () => {
    expect(normalizeShare(undefined, ids)).toEqual({ enabled: false, hiddenGenres: [] });
    expect(normalizeShare('x', ids)).toEqual(defaultShare());
  });
  it('keeps valid hidden rooms, drops unknown or duplicate ones, and needs enabled === true', () => {
    expect(normalizeShare({ enabled: true, hiddenGenres: ['video', 'video', 'zzz', 7] }, ids)).toEqual({ enabled: true, hiddenGenres: ['video'] });
    expect(normalizeShare({ enabled: 'yes' }, ids).enabled).toBe(false);
  });
  it('limits scale with the daily cap', () => {
    expect(limits).toMatchObject({ maxFindsPerWeek: 2100, maxPointsPerWeek: 21000 });
  });
});
