import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data';
import { areaAt, itemsOfGenre, OTHER_GENRE, secretOf } from '../src/core/catalog';

describe('data/areas.json', () => {
  it('are sorted by depth, start at 0, with unique ids, valid colors and positive weights', () => {
    const { areas } = CATALOG;
    expect(areas[0]?.startDepthM).toBe(0);
    for (let i = 1; i < areas.length; i++) {
      expect(areas[i]!.startDepthM).toBeGreaterThan(areas[i - 1]!.startDepthM);
    }
    expect(new Set(areas.map((a) => a.id)).size).toBe(areas.length);
    for (const a of areas) {
      expect(a.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(a.weights.every((w) => w > 0)).toBe(true);
    }
  });

  it('deeper areas never make 3-star items rarer', () => {
    const w3 = CATALOG.areas.map((a) => a.weights[2] / a.weights.reduce((x, y) => x + y, 0));
    for (let i = 1; i < w3.length; i++) expect(w3[i]!).toBeGreaterThanOrEqual(w3[i - 1]!);
  });

  it('areaAt picks the deepest area whose start is not past the depth', () => {
    expect(areaAt(CATALOG.areas, 0).id).toBe('cave');
    expect(areaAt(CATALOG.areas, 49.9).id).toBe('cave');
    expect(areaAt(CATALOG.areas, 50).id).toBe('waterway');
    expect(areaAt(CATALOG.areas, 99999).id).toBe('abyss');
    expect(areaAt(CATALOG.areas, Number.NaN).id).toBe('cave');
  });
});

describe('data/genres.json (rooms)', () => {
  it('has unique ids and names, a job and a color each, and includes the fallback room', () => {
    const { genres } = CATALOG;
    expect(new Set(genres.map((g) => g.id)).size).toBe(genres.length);
    expect(new Set(genres.map((g) => g.name)).size).toBe(genres.length);
    expect(new Set(genres.map((g) => g.job)).size).toBe(genres.length);
    for (const g of genres) {
      expect(g.job.length).toBeGreaterThan(0);
      expect(g.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(genres.some((g) => g.id === OTHER_GENRE)).toBe(true);
  });

  it('the dictionary has no duplicate domains, and only lowercase hosts', () => {
    const all = CATALOG.genres.flatMap((g) => g.domains);
    expect(new Set(all).size).toBe(all.length);
    for (const d of all) expect(d).toBe(d.toLowerCase());
  });

  it('the fallback room has no domains of its own', () => {
    expect(CATALOG.genres.find((g) => g.id === OTHER_GENRE)?.domains).toEqual([]);
  });
});

describe('data/items.json', () => {
  it('every room has exactly three 1-star, two 2-star and one 3-star items', () => {
    for (const g of CATALOG.genres) {
      const r = itemsOfGenre(CATALOG, g.id).map((i) => i.rarity).sort();
      expect(r, g.name).toEqual([1, 1, 1, 2, 2, 3]);
    }
  });

  it('every area has exactly one secret item', () => {
    for (const a of CATALOG.areas) {
      expect(CATALOG.items.filter((i) => i.areaId === a.id)).toHaveLength(1);
      expect(secretOf(CATALOG, a.id)).toBeDefined();
    }
  });

  it('ids are unique, each item belongs to exactly one of a room, an area or the mimic loot, and has text', () => {
    const ids = CATALOG.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const genreIds = new Set(CATALOG.genres.map((g) => g.id));
    const areaIds = new Set(CATALOG.areas.map((a) => a.id));
    for (const i of CATALOG.items) {
      expect([i.genreId, i.areaId, i.mimic].filter(Boolean), i.id).toHaveLength(1);
      if (i.genreId) expect(genreIds.has(i.genreId), i.id).toBe(true);
      if (i.areaId) expect(areaIds.has(i.areaId), i.id).toBe(true);
      expect(i.name.length).toBeGreaterThan(0);
      expect(i.description.length).toBeGreaterThan(15);
    }
    const names = CATALOG.items.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('the total matches the design (11 rooms x 6 + 6 secrets + 4 mimic loot)', () => {
    expect(CATALOG.items).toHaveLength(CATALOG.genres.length * 6 + CATALOG.areas.length + 4);
  });

  it('mimic loot has a mix of rarities and is not tied to a room or an area', () => {
    const loot = CATALOG.items.filter((i) => i.mimic);
    expect(loot).toHaveLength(4);
    expect(new Set(loot.map((i) => i.rarity))).toEqual(new Set([1, 2, 3]));
    for (const i of loot) expect(i.genreId ?? i.areaId).toBeUndefined();
  });
});
