import { OVERLAY_CSS } from './styles';

export interface OverlayView {
  depthText: string;
  strataName: string;
  strataColor: string;
  /** 0〜1 */
  oilRatio: number;
  oilLow: boolean;
  /** 地上にいる（ツルハシを暗くする） */
  surface: boolean;
  mining: boolean;
  /** 0〜1 */
  gauge: number;
  /** 流し読み状態（ツルハシが空振りする） */
  skimming: boolean;
  /** 地上で油が足りず、探検を再開できない */
  refilling: boolean;
}

export interface PopSpec {
  text: string;
  sub?: string;
  /** レア度 1〜3 の鉱石、または一般のお知らせ / 警告 */
  tone: 'r1' | 'r2' | 'r3' | 'info' | 'warn';
  stars?: number;
}

export interface Overlay {
  update(v: OverlayView): void;
  pop(p: PopSpec): void;
  /** 縦スクロールバーの幅だけ内側に寄せる */
  setScrollbarWidth(px: number): void;
  destroy(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
};

/**
 * 画面右端の細い帯。Shadow DOM で包み、pointer-events: none でページの操作を邪魔しない。
 * 値が変わったところだけを書き換える。
 */
export function createOverlay(): Overlay {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = OVERLAY_CSS;

  const band = el('div', 'band');
  const depth = el('div', 'depth');
  const strataName = el('div', 'strata-name');
  const mid = el('div', 'mid');
  const pick = el('span', 'pick');
  pick.textContent = '⛏';
  const gauge = el('div', 'gauge');
  const gaugeFill = el('div', 'gauge-fill');
  gauge.append(gaugeFill);
  const status = el('div', 'status');
  mid.append(pick, gauge, status);
  const oil = el('div', 'oil');
  const oilFill = el('div', 'oil-fill');
  oil.append(oilFill);
  band.append(depth, strataName, mid, oil);
  const pops = el('div', 'pops');
  root.append(style, band, pops);
  document.documentElement.append(host);

  const cache: Record<string, string> = {};
  const set = (key: string, value: string, apply: () => void) => {
    if (cache[key] === value) return;
    cache[key] = value;
    apply();
  };

  return {
    update(v) {
      set('depth', v.depthText, () => (depth.textContent = v.depthText));
      set('strata', v.strataName + v.strataColor, () => {
        strataName.textContent = v.strataName;
        band.style.setProperty('--strata', v.strataColor);
      });
      set('gauge', v.gauge.toFixed(3), () => (gaugeFill.style.transform = `scaleY(${v.gauge})`));
      set('oil', v.oilRatio.toFixed(3), () => (oilFill.style.transform = `scaleY(${v.oilRatio})`));
      set('oilLow', String(v.oilLow), () => oil.classList.toggle('low', v.oilLow));
      const pickState = v.mining ? 'mining' : v.skimming ? 'whiff' : v.surface ? 'idle' : 'active';
      set('pick', pickState, () => {
        pick.className = `pick ${pickState === 'idle' ? '' : 'active'} ${
          pickState === 'mining' || pickState === 'whiff' ? pickState : ''
        }`.trim();
      });
      const statusText = v.refilling ? '油を補充中' : v.skimming ? '流し読み中' : '';
      set('status', statusText, () => (status.textContent = statusText));
    },

    pop(p) {
      const e = el('div', `pop ${p.tone}`);
      if (p.stars) {
        const stars = el('span', 'stars');
        stars.textContent = '★'.repeat(p.stars) + ' ';
        e.append(stars);
      }
      e.append(document.createTextNode(p.text));
      if (p.sub) {
        const sub = el('span', 'sub');
        sub.textContent = p.sub;
        e.append(sub);
      }
      e.addEventListener('animationend', (ev) => {
        // r3 は枠の拡大アニメーションも持つので、本体のアニメーション終了だけで消す
        if (ev.target === e && /^pop/.test((ev as AnimationEvent).animationName)) e.remove();
      });
      // 同時に出すと重なるので、前のものは消す
      pops.replaceChildren(e);
    },

    setScrollbarWidth(px) {
      set('sb', String(px), () => {
        band.style.setProperty('--sb', `${px}px`);
        pops.style.setProperty('--sb', `${px}px`);
      });
    },

    destroy() {
      host.remove();
    },
  };
}
