/**
 * ページの右側に帯の幅ぶんの余白を取り、ゲーム画面とサイトが重ならないようにする。
 * <html> の inline style を変えるだけで、サイトのCSSやDOMは書き換えない。
 * 余白を取った結果、新しく横方向のはみ出し（横スクロール）が出るサイトでは、
 * 別の方法を試し、それでも出るなら元に戻して、帯をページの上に重ねる。
 */

export type ReserveMode = 'none' | 'padding' | 'width';

const PROPS = ['padding-right', 'width'] as const;
type Prop = (typeof PROPS)[number];

interface Saved {
  value: string;
  priority: string;
}

const hasHorizontalOverflow = (): boolean => {
  const root = document.documentElement;
  return root.scrollWidth > root.clientWidth + 1;
};

export interface SpaceReserver {
  /** 余白を取る / 解除する。結果の方式を返す */
  set(on: boolean, px: number): ReserveMode;
  mode(): ReserveMode;
}

export function createSpaceReserver(): SpaceReserver {
  const root = document.documentElement;
  let mode: ReserveMode = 'none';
  let appliedPx = 0;
  let saved: Partial<Record<Prop, Saved>> = {};

  const save = (p: Prop) => {
    saved[p] = { value: root.style.getPropertyValue(p), priority: root.style.getPropertyPriority(p) };
  };
  const restoreAll = () => {
    for (const p of PROPS) {
      const s = saved[p];
      if (!s) continue;
      if (s.value) root.style.setProperty(p, s.value, s.priority);
      else root.style.removeProperty(p);
    }
    saved = {};
    mode = 'none';
    appliedPx = 0;
  };

  const apply = (px: number): ReserveMode => {
    const before = hasHorizontalOverflow();

    // margin ではなく padding を使う: margin: 0 auto の中央寄せを壊さず、空いた範囲の中で保てる
    save('padding-right');
    root.style.setProperty('padding-right', `${px}px`, 'important');
    if (before || !hasHorizontalOverflow()) return 'padding';
    restoreAll();

    save('width');
    root.style.setProperty('width', `calc(100% - ${px}px)`, 'important');
    if (!hasHorizontalOverflow()) return 'width';
    restoreAll();

    return 'none'; // どちらでも崩れるサイトでは、余白を取らず帯を重ねる
  };

  return {
    set(on, px) {
      if (!on) {
        if (mode !== 'none') restoreAll();
        return mode;
      }
      if (mode !== 'none' && appliedPx === px) return mode;
      if (mode !== 'none') restoreAll();
      mode = apply(px);
      appliedPx = mode === 'none' ? 0 : px;
      return mode;
    },
    mode: () => mode,
  };
}
