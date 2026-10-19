import data from '../data/sprites.json';

/** ドットアイコンの1辺のマス数（縁取りを含む） */
export const SPRITE_SIZE = 14;

type SpriteData = { palette: Record<string, string>; sprites: Record<string, string[]> };
const { palette, sprites } = data as SpriteData;

const cache = new Map<string, string>();

/** 発見品のドットアイコンの SVG 文字列。未登録なら null。 */
export function spriteSvg(itemId: string): string | null {
  const rows = sprites[itemId];
  if (!rows) return null;
  // 同じ色のとなり合うマスは1つの矩形にまとめる
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x] as string;
      let end = x;
      while (end + 1 < row.length && row[end + 1] === c) end++;
      const fill = palette[c];
      if (c !== '.' && fill) rects += `<rect x="${x}" y="${y}" width="${end - x + 1}" height="1" fill="${fill}"/>`;
      x = end + 1;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}" shape-rendering="crispEdges">${rects}</svg>`;
}

/** <img src> や CSS に使える data URI。 */
export function spriteUri(itemId: string): string | null {
  const hit = cache.get(itemId);
  if (hit) return hit;
  const svg = spriteSvg(itemId);
  if (!svg) return null;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(itemId, uri);
  return uri;
}

export const SPRITE_PALETTE = palette;
export const SPRITE_IDS = Object.keys(sprites);
export const spriteRows = (itemId: string): string[] | undefined => sprites[itemId];
