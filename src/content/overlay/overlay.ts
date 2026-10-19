import { ACTOR_SIZE, containerFrameUri, heroSheet, type HeroPose } from '../../core/actors';
import type { ContainerKind } from '../../core/containers';
import type { Phase } from '../miner';
import { OVERLAY_CSS, TILE_HEIGHT_PX } from './styles';
import { TORCH_SVG, wallUri } from './wall';

export interface OverlayView {
  depthText: string;
  /** 階層のID（帯の色合いに使う） */
  areaId: string;
  /** 閲覧中のサイトの種類（部屋）のID。壁の絵を選ぶ */
  roomId: string;
  /** 背景の岩肌を流す量に使う（m） */
  depthM: number;
  strataName: string;
  strataColor: string;
  /** 今日見つけた数 */
  todayFinds: number;
  /** 場面: 歩く / 立ち止まり / 物色中 / 見つけ終わった */
  phase: Phase;
  /** 物色の進み具合 0〜1 */
  gauge: number;
  /** 現れている入れ物（なければ null）と、その見た目を決める名前 */
  container: ContainerKind | null;
  skin: string;
  /** 探索者の見た目を決める職業名（診断前は 'default'） */
  job: string;
}

export interface PopSpec {
  text: string;
  sub?: string;
  /** レア度 1〜3 の品、または一般のお知らせ / 警告 */
  tone: 'r1' | 'r2' | 'r3' | 'info' | 'warn';
  stars?: number;
  /** 発見品のドットアイコン（data URI） */
  iconUri?: string;
}

export interface Overlay {
  update(v: OverlayView): void;
  pop(p: PopSpec): void;
  /** 入れ物から品が跳び出す演出 */
  reveal(iconUri: string, rarity: 1 | 2 | 3): void;
  destroy(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
};

const CELL = 2;

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
  const strataName = el('div', 'strata-name');
  const mid = el('div', 'mid');
  const stage = el('div', 'stage');
  const cont = el('div', 'cont');
  const contImg = document.createElement('img');
  contImg.alt = '';
  cont.append(contImg);
  const hero = el('div', 'hero');
  stage.append(cont, hero);
  const gauge = el('div', 'gauge panel');
  const gaugeInner = el('div', 'gauge-inner');
  const gaugeFill = el('div', 'gauge-fill');
  gaugeInner.append(gaugeFill);
  gauge.append(gaugeInner);
  mid.append(stage, gauge);
  const today = el('div', 'today panel');
  const col = el('div', 'col');
  col.append(depth, strataName, mid, today);
  const rock = el('div', 'rock');
  const shade = el('div', 'shade');
  const tint = el('div', 'tint');
  const glow = el('div', 'glow');
  band.append(rock, tint, shade, glow);
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

  /** 探索者の姿勢。物色中は入れ物をあさり、ミミックだったときは見つけたあとも身構えたまま。 */
  const poseOf = (v: OverlayView): HeroPose => {
    if (v.phase === 'walk') return 'walk';
    if (v.phase === 'search') return 'search';
    if (v.phase === 'done') return v.container === 'mimic' ? 'idle' : 'cheer';
    return 'idle';
  };

  return {
    update(v) {
      set('depth', v.depthText, () => (depth.textContent = v.depthText));
      set('strata', v.areaId + v.strataName, () => {
        strataName.textContent = v.strataName;
        band.style.setProperty('--area', v.strataColor); // 階層は、壁にかぶせる色で表す
      });
      set('room', v.roomId, () => band.style.setProperty('--wall', wallUri(v.roomId)));
      // 深く進むほど石壁が上へ流れる（1mあたり3px。タイル1枚ぶんでひと回り）
      const shift = Math.floor(v.depthM * 3) % TILE_HEIGHT_PX;
      set('rock', String(shift), () => (rock.style.transform = `translateY(${-shift}px)`));

      // 探索者
      const pose = poseOf(v);
      set('hero', `${v.job}|${pose}`, () => {
        const sheet = heroSheet(v.job, pose);
        hero.style.backgroundImage = `url("${sheet.uri}")`;
        hero.style.backgroundSize = `${sheet.frames * ACTOR_SIZE * CELL}px ${ACTOR_SIZE * CELL}px`;
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
      set('gauge', g.toFixed(3), () => (gaugeFill.style.transform = `scaleX(${g})`));
      const glowOpacity = (0.25 + 0.6 * g).toFixed(2);
      set('glow', glowOpacity, () => (glow.style.opacity = glowOpacity));
      set('today', String(v.todayFinds), () => (today.textContent = `今日\n${v.todayFinds}`));
    },

    reveal(iconUri, rarity) {
      const fly = el('img', `fly r${rarity}`);
      fly.src = iconUri;
      fly.alt = '';
      fly.addEventListener('animationend', () => fly.remove());
      stage.append(fly);
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
