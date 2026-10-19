import { OVERLAY_CSS, TILE_HEIGHT_PX } from './styles';
import { PICK_URI, TORCH_SVG, wallUri } from './wall';

export interface OverlayView {
  depthText: string;
  /** 階層のID（石壁の絵を選ぶ） */
  areaId: string;
  /** 背景の岩肌を流す量に使う（m） */
  depthM: number;
  strataName: string;
  strataColor: string;
  /** 今日見つけた数 */
  todayFinds: number;
  /** ゲージがたまっている最中（ツルハシが動く） */
  mining: boolean;
  /** 0〜1 */
  gauge: number;
}

export interface PopSpec {
  text: string;
  sub?: string;
  /** レア度 1〜3 の鉱石、または一般のお知らせ / 警告 */
  tone: 'r1' | 'r2' | 'r3' | 'info' | 'warn';
  stars?: number;
  /** 発見品のドットアイコン（data URI） */
  iconUri?: string;
}

export interface Overlay {
  update(v: OverlayView): void;
  pop(p: PopSpec): void;
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
  const depth = el('div', 'depth panel');
  const strataName = el('div', 'strata-name');
  const mid = el('div', 'mid');
  const pick = el('span', 'pick');
  const pickImg = document.createElement('img');
  pickImg.src = PICK_URI;
  pickImg.alt = '';
  pick.append(pickImg);
  const gauge = el('div', 'gauge panel');
  const gaugeInner = el('div', 'gauge-inner');
  const gaugeFill = el('div', 'gauge-fill');
  gaugeInner.append(gaugeFill);
  gauge.append(gaugeInner);
  mid.append(pick, gauge);
  const today = el('div', 'today panel');
  const col = el('div', 'col');
  col.append(depth, strataName, mid, today);
  const rock = el('div', 'rock');
  const shade = el('div', 'shade');
  const glow = el('div', 'glow');
  band.append(rock, shade, glow);
  for (const pos of ['t1', 't2']) {
    // 壁の松明（飾り）。SVG は自前の固定文字列で、ページの内容は入らない
    const torch = el('div', `torch ${pos}`);
    const halo = el('div', 'halo');
    const holder = el('div', 'flame');
    holder.innerHTML = TORCH_SVG;
    torch.append(halo, holder);
    band.append(torch);
  }
  band.append(col);
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
      set('strata', v.areaId + v.strataName, () => {
        strataName.textContent = v.strataName;
        band.style.setProperty('--wall', wallUri(v.areaId));
      });
      // 深く進むほど石壁が上へ流れる（1mあたり3px。タイル1枚ぶんでひと回り）
      const shift = Math.floor(v.depthM * 3) % TILE_HEIGHT_PX;
      set('rock', String(shift), () => (rock.style.transform = `translateY(${-shift}px)`));
      // ゲージがたまるほど、ツルハシの周りが明るくなる
      const glowOpacity = (0.25 + 0.6 * v.gauge).toFixed(2);
      set('glow', glowOpacity, () => (glow.style.opacity = glowOpacity));
      set('gauge', v.gauge.toFixed(3), () => (gaugeFill.style.transform = `scaleY(${v.gauge})`));
      set('pick', String(v.mining), () => (pick.className = v.mining ? 'pick mining' : 'pick'));
      set('today', String(v.todayFinds), () => (today.textContent = `今日\n${v.todayFinds}`));
    },

    pop(p) {
      const e = el('div', `pop ${p.tone}`);
      if (p.iconUri) {
        const ico = el('span', 'ico');
        const img = document.createElement('img');
        img.src = p.iconUri;
        img.alt = '';
        ico.append(img);
        e.append(ico);
      }
      const text = el('span', 'txt');
      if (p.stars) {
        const stars = el('span', 'stars');
        stars.textContent = '★'.repeat(p.stars) + ' ';
        text.append(stars);
      }
      text.append(document.createTextNode(p.text));
      if (p.sub) {
        const sub = el('span', 'sub');
        sub.textContent = p.sub;
        text.append(sub);
      }
      e.append(text);
      e.addEventListener('animationend', (ev) => {
        // r3 は枠の拡大アニメーションも持つので、本体のアニメーション終了だけで消す
        if (ev.target === e && /^pop/.test((ev as AnimationEvent).animationName)) e.remove();
      });
      // 同時に出すと重なるので、前のものは消す
      pops.replaceChildren(e);
    },

    destroy() {
      host.remove();
    },
  };
}
