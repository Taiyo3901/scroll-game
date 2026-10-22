import { HERO_SIZE, containerFrameUri, heroSheet, type HeroPose } from '../../core/actors';
import type { ContainerKind } from '../../core/containers';
import type { Phase } from '../miner';
import { OVERLAY_CSS, TILE_HEIGHT_PX } from './styles';
import { BAND_STEP_CALM_M, BAND_STEP_M, BAND_TINTS, bandPosition } from '../../core/band';
import { formatBadge } from '../../core/format';
import { TORCH_SVG, decoUri, wallUri } from './wall';

export interface OverlayView {
  /** 閲覧中のサイトの種類（部屋）のID。壁の絵を選ぶ */
  roomId: string;
  /** 場面: 歩く / 立ち止まり / 物色中 / 見つけ終わった */
  phase: Phase;
  /** 物色の進み具合 0〜1 */
  gauge: number;
  /** 現れている入れ物（なければ null）と、その見た目を決める名前 */
  container: ContainerKind | null;
  skin: string;
  /** 探索者の見た目を決める職業名（診断前は 'default'） */
  job: string;
  /** ページ（スクロールしている枠）の中での位置 0〜1。帯の中の探索者の高さになる */
  progress: number;
  /** デモモード（帯の上に「DEMO」を出す） */
  demo: boolean;
}

export interface Overlay {
  update(v: OverlayView): void;
  /**
   * 深さに合わせて、背景（壁の流れ、色、飾り）と深度の数字を更新する。スクロールのたびに呼べるよう、軽くしてある。
   * calm が true（視覚効果を減らす設定）のときは、間隔を広げ、混ぜずに切り替える。
   */
  setDepth(depthM: number, calm: boolean): void;
  /** 入れ物から品が跳び出す演出 */
  reveal(iconUri: string, rarity: 1 | 2 | 3): void;
  /** 品を見つけた場所（ページ内の位置）に、開けた入れ物の目印を残す。このページを開いている間だけ（保存しない） */
  mark(progress: number, iconUri: string, rarity: 1 | 2 | 3): void;
  /** 目印をすべて消す（ページが切り替わったとき） */
  clearMarks(): void;
  destroy(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
};

/** 探索者のドット絵1マスの大きさ(px)。22マス x 1.5px = 33px（入れ物は 14マス x 2px = 28px で、CSS 側で決める） */
const HERO_CELL = 1.5;
/** ゲージの目盛りの数 */
const GAUGE_CELLS = 6;
/** 帯に残す目印の数の上限 */
const MAX_MARKS = 40;

/** 物色の進み具合から、入れ物の何コマ目を見せるか。ミミックは、最後に正体を現す。 */
function containerSprite(kind: ContainerKind, skin: string, phase: Phase, gauge: number): string | null {
  const step = (frames: number) => (phase === 'done' ? frames - 1 : gauge < 0.34 ? 0 : gauge < 0.67 ? 1 : 2);
  if (kind === 'mimic') {
    if (phase === 'done') return containerFrameUri(`mimic:${skin}`, 1);
    if (gauge >= 0.8) return containerFrameUri(`mimic:${skin}`, 0);
    return containerFrameUri(`chest:${skin}`, gauge < 0.4 ? 0 : 1);
  }
  return containerFrameUri(`${kind}:${skin}`, Math.min(step(3), 2));
}

/** 開けた入れ物の絵（目印用）。 */
export function openedContainerUri(kind: ContainerKind, skin: string): string | null {
  return containerSprite(kind, skin, 'done', 1);
}

/**
 * 画面右端の帯。Shadow DOM で包み、pointer-events: none でページの操作を邪魔しない。
 * 値が変わったところだけを書き換える。
 */
export function createOverlay(): Overlay {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = OVERLAY_CSS;

  const band = el('div', 'band');
  const depth = el('div', 'depth panel');
  const demoTag = el('div', 'demo-tag');
  demoTag.textContent = 'DEMO';
  const track = el('div', 'track');
  const ruler = el('div', 'ruler');
  const marks = el('div', 'marks');
  const stage = el('div', 'stage');
  const scene = el('div', 'scene');
  const cont = el('div', 'cont');
  const contImg = document.createElement('img');
  contImg.alt = '';
  cont.append(contImg);
  const hero = el('div', 'hero');
  scene.append(cont, hero);
  const gauge = el('div', 'gauge panel');
  const gaugeInner = el('div', 'gauge-inner');
  const gaugeCells = Array.from({ length: GAUGE_CELLS }, () => el('div', 'cell'));
  gaugeInner.append(...gaugeCells);
  gauge.append(gaugeInner);
  stage.append(scene, gauge);
  track.append(ruler, marks, stage);
  const col = el('div', 'col');
  col.append(demoTag, depth);
  const rock = el('div', 'rock');
  const decoA = el('div', 'deco');
  const decoB = el('div', 'deco');
  const shade = el('div', 'shade');
  const tint = el('div', 'tint');
  const glow = el('div', 'glow');
  band.append(rock, tint, decoA, decoB, shade, glow);
  for (const pos of ['t1', 't2']) {
    // 壁の松明（飾り）。SVG は自前の固定文字列で、ページの内容は入らない
    const torch = el('div', `torch ${pos}`);
    const halo = el('div', 'halo');
    const holder = el('div', 'flame');
    holder.innerHTML = TORCH_SVG;
    torch.append(halo, holder);
    band.append(torch);
  }
  band.append(track, col);
  root.append(style, band);
  document.documentElement.append(host);

  const cache: Record<string, string> = {};
  const set = (key: string, value: string, apply: () => void) => {
    if (cache[key] === value) return;
    cache[key] = value;
    apply();
  };

  // 帯の長さ（探索者が動ける高さ）。大きさが変わったときだけ測り直す
  const STAGE_H = 79;
  const MARK_H = 18;
  let trackH = 0;
  let progress = 0;
  const placed: { el: HTMLElement; p: number }[] = [];
  const yOf = (p: number, h: number) => Math.round(Math.max(0, trackH - h) * Math.max(0, Math.min(1, p)));
  const layout = () => {
    stage.style.transform = `translateY(${yOf(progress, STAGE_H)}px)`;
    for (const m of placed) m.el.style.transform = `translateY(${yOf(m.p, MARK_H)}px)`;
  };
  const resizer = new ResizeObserver(() => {
    trackH = track.clientHeight;
    layout();
  });
  resizer.observe(track);

  /** 探索者の姿勢。物色中は入れ物をあさり、ミミックだったときは見つけたあとも身構えたまま。 */
  const poseOf = (v: OverlayView): HeroPose => {
    if (v.phase === 'walk') return 'walk';
    if (v.phase === 'search') return 'search';
    if (v.phase === 'done') return v.container === 'mimic' ? 'idle' : 'cheer';
    return 'idle';
  };

  return {
    update(v) {
      set('demo', String(v.demo), () => demoTag.classList.toggle('on', v.demo));
      set('room', v.roomId, () => band.style.setProperty('--wall', wallUri(v.roomId)));

      // 探索者は、ページの読み進み具合に合わせて、帯を上から下へ進む
      if (Math.abs(v.progress - progress) > 0.001) {
        progress = v.progress;
        stage.style.transform = `translateY(${yOf(progress, STAGE_H)}px)`;
      }

      // 探索者
      const pose = poseOf(v);
      set('hero', `${v.job}|${pose}`, () => {
        const sheet = heroSheet(v.job, pose);
        hero.style.backgroundImage = `url("${sheet.uri}")`;
        hero.style.backgroundSize = `${sheet.frames * HERO_SIZE * HERO_CELL}px ${HERO_SIZE * HERO_CELL}px`;
        hero.className = `hero ${pose}`;
      });
      set('shake', String(v.phase === 'done' && v.container === 'mimic'), () =>
        hero.classList.toggle('scared', v.phase === 'done' && v.container === 'mimic'),
      );

      // 入れ物
      const sprite = v.container ? containerSprite(v.container, v.skin, v.phase, v.gauge) : null;
      set('cont', sprite ?? '', () => {
        if (sprite) contImg.src = sprite;
      });
      const shown = v.container !== null && sprite !== null;
      set('contShown', String(shown), () => {
        cont.classList.toggle('on', shown);
        if (shown) {
          // 現れるたびに、ぽんと出る動きをやり直す
          cont.classList.remove('enter');
          void cont.offsetWidth;
          cont.classList.add('enter');
        }
      });
      set('contPhase', `${v.phase}|${v.container}`, () => {
        cont.classList.toggle('searching', v.phase === 'search');
        cont.classList.toggle('mimic-reveal', v.container === 'mimic' && (v.phase === 'done' || v.gauge >= 0.8));
      });

      // 物色の進み具合と、まわりの明るさ
      const g = v.phase === 'search' ? v.gauge : 0;
      // 目盛りは、固定の6つ。進み具合に合わせて、左から点く
      const lit = g <= 0 ? 0 : Math.min(GAUGE_CELLS, Math.ceil(g * GAUGE_CELLS));
      set('gauge', String(lit), () => gaugeCells.forEach((c, i) => c.classList.toggle('on', i < lit)));
      const glowOpacity = (0.25 + 0.6 * g).toFixed(2);
      set('glow', glowOpacity, () => (glow.style.opacity = glowOpacity));
    },

    setDepth(depthM, calm) {
      const d = Math.max(0, Number.isFinite(depthM) ? depthM : 0);
      const text = formatBadge(d);
      set('depth', text, () => (depth.textContent = text));

      // 背景は、深さに合わせて、少しずつ変わる（いまの変化と、次の変化を、混ぜ合わせる）
      const pos = bandPosition(d, calm ? BAND_STEP_CALM_M : BAND_STEP_M);
      const frac = calm ? 0 : Math.round(pos.fraction * 64) / 64; // 細かすぎる更新を避ける
      set('decoA', String(pos.index), () => decoA.style.setProperty('--deco', decoUri(pos.index)));
      set('decoB', String(pos.next), () => decoB.style.setProperty('--deco', decoUri(pos.next)));
      set('mix', `${pos.index}|${frac}`, () => {
        const a = BAND_TINTS[pos.index] ?? BAND_TINTS[0];
        const b = BAND_TINTS[pos.next] ?? BAND_TINTS[0];
        band.style.setProperty('--area', `color-mix(in srgb, ${a} ${(1 - frac) * 100}%, ${b} ${frac * 100}%)`);
        decoA.style.opacity = String(1 - frac);
        decoB.style.opacity = String(frac);
      });

      // 深く進むほど石壁が上へ流れる（1mあたり3px。タイル1枚ぶんでひと回り）
      const shift = Math.floor(d * 3) % TILE_HEIGHT_PX;
      set('rock', String(shift), () => {
        rock.style.transform = `translateY(${-shift}px)`;
        decoA.style.transform = `translateY(${-shift}px)`;
        decoB.style.transform = `translateY(${-shift}px)`;
      });
    },

    clearMarks() {
      for (const m of placed.splice(0)) m.el.remove();
    },

    mark(p, iconUri, rarity) {
      const m = el('div', `mark r${rarity}`);
      const img = document.createElement('img');
      img.src = iconUri;
      img.alt = '';
      m.append(img);
      marks.append(m);
      placed.push({ el: m, p });
      while (placed.length > MAX_MARKS) placed.shift()?.el.remove();
      m.style.transform = `translateY(${yOf(p, MARK_H)}px)`;
    },

    reveal(iconUri, rarity) {
      const fly = el('img', `fly r${rarity}`);
      fly.src = iconUri;
      fly.alt = '';
      fly.addEventListener('animationend', () => fly.remove());
      stage.append(fly);
    },

    destroy() {
      resizer.disconnect();
      host.remove();
    },
  };
}
