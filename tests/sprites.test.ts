import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data';
import { SPRITE_PALETTE, SPRITE_SIZE, spriteRows, spriteSvg, spriteUri } from '../src/core/sprites';

describe('item sprites', () => {
  it('every item has a sprite, and there are no sprites for unknown items', async () => {
    const { SPRITE_IDS } = await import('../src/core/sprites');
    expect(new Set(SPRITE_IDS)).toEqual(new Set(CATALOG.items.map((i) => i.id)));
  });

  it('each is a square grid of known palette letters with enough pixels', () => {
    for (const item of CATALOG.items) {
      const rows = spriteRows(item.id)!;
      expect(rows, item.id).toHaveLength(SPRITE_SIZE);
      let filled = 0;
      for (const row of rows) {
        expect(row, item.id).toHaveLength(SPRITE_SIZE);
        for (const c of row) {
          if (c === '.') continue;
          expect(SPRITE_PALETTE[c], `${item.id}: '${c}'`).toBeDefined();
          filled++;
        }
      }
      expect(filled, item.id).toBeGreaterThan(25);
    }
  });

  it('is outlined: only transparent or outline pixels touch the edge of the grid', () => {
    for (const item of CATALOG.items) {
      const rows = spriteRows(item.id)!;
      for (let i = 0; i < SPRITE_SIZE; i++) {
        for (const [x, y] of [[i, 0], [i, SPRITE_SIZE - 1], [0, i], [SPRITE_SIZE - 1, i]] as const) {
          expect(['.', 'k'], `${item.id} (${x},${y})`).toContain(rows[y]![x]);
        }
      }
    }
  });

  it('palette colors are valid hex', () => {
    for (const v of Object.values(SPRITE_PALETTE)) expect(v).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('builds an svg and a data uri, and null for unknown ids', () => {
    expect(spriteSvg('film-scrap')).toMatch(/^<svg [^>]*viewBox="0 0 14 14"/);
    expect(spriteUri('film-scrap')).toMatch(/^data:image\/svg\+xml,/);
    expect(spriteUri('film-scrap')).toBe(spriteUri('film-scrap'));
    expect(spriteSvg('nope')).toBeNull();
    expect(spriteUri('nope')).toBeNull();
  });
});
