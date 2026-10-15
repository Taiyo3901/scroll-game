import { capChars } from '../core/mining';

const COLS = 8;
const ROWS = 10;

function directTextLength(el: Element): number {
  let n = 0;
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) n += (node.nodeValue ?? '').replace(/\s+/g, '').length;
  }
  return n;
}

/**
 * 画面内の文字数の概算。画面上の格子点で elementFromPoint を呼び、見つかった要素の
 * 直下の文字数を、見えている面積に入りきる数を上限にして合計する。
 * 動画や画像だけの画面は 0 に近くなる。軽いので、必要なときだけ1秒に1回ほど呼ぶ。
 */
export function estimateVisibleChars(): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw <= 0 || vh <= 0) return 0;

  const seen = new Set<Element>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = document.elementFromPoint(((c + 0.5) / COLS) * vw, ((r + 0.5) / ROWS) * vh);
      if (el) seen.add(el);
    }
  }

  let total = 0;
  for (const el of seen) {
    const direct = directTextLength(el);
    if (direct === 0) continue;
    const rect = el.getBoundingClientRect();
    const w = Math.min(rect.right, vw) - Math.max(rect.left, 0);
    const h = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    if (w <= 0 || h <= 0) continue;
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    total += capChars(direct, w * h, fontSize);
  }
  return total;
}
