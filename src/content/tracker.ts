import { CONFIG } from '../config';
import type { SpotPos } from '../core/mining';
import { downwardDelta, isWithinInputWindow } from '../core/scroll';
import type { ScrollBatchMessage } from '../messages';
import { sendToBackground } from './send';

export interface TrackerSnapshot {
  /** 最後のスクロール（向きや原因を問わない）からの経過ms。なければ Infinity */
  msSinceLastScroll: number;
  /** 最後の縦スクロールの時刻(performance.now)。まだなければ null。新しいスクロールがあったかの判定に使う */
  lastScrollAt: number | null;
  /** 今スクロールしている枠の中での位置 0（先頭）〜1（末尾）。帯の中の探索者の位置になる */
  progress: number;
  /** 今スクロールしている枠と位置（開けた場所の判定に使う。URLは含まれず、保存もしない） */
  spot: SpotPos;
  /** まだ service worker に送っていない距離 */
  pendingPx: number;
}

export interface Tracker {
  snapshot: () => TrackerSnapshot;
}

const USER_INPUT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;

/**
 * スクロール量の計測。ページ全体と、ページ内の枠(Gmailなど)の両方を拾う。
 * イベント内では足し算だけ行い、数秒ごとにまとめて送る。
 */
/** 枠の中でどこまで進んだか（0〜1）。スクロールできない枠は 0。 */
function progressOf(el: Element): number {
  const max = el.scrollHeight - el.clientHeight;
  return max > 0 ? Math.max(0, Math.min(1, el.scrollTop / max)) : 0;
}

export interface TrackerOptions {
  /** false を返す間（サイトごとの無効化など）は、スクロールを数えない */
  isEnabled?: () => boolean;
}

export function startTracker(opts: TrackerOptions = {}): Tracker {
  const lastTop = new WeakMap<Element, number>();
  const elementIds = new WeakMap<Element, number>();
  let nextElementId = 1;
  const idOf = (el: Element): number => {
    let id = elementIds.get(el);
    if (id === undefined) {
      id = nextElementId++;
      elementIds.set(el, id);
    }
    return id;
  };
  let lastInputAt: number | null = null;
  let pointerDown = false;
  let lastAnyScrollAt: number | null = null;
  let lastScroller: Element | null = null;
  let pendingPx = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const rootEl = (): Element => document.scrollingElement ?? document.documentElement;
  lastTop.set(rootEl(), rootEl().scrollTop);

  const markInput = () => {
    lastInputAt = performance.now();
  };
  for (const name of USER_INPUT_EVENTS) {
    document.addEventListener(name, markInput, { capture: true, passive: true });
  }
  // スクロールバーのドラッグ中は pointerdown から1秒以上経っても入力が続いているとみなす
  document.addEventListener(
    'pointerdown',
    () => {
      pointerDown = true;
    },
    { capture: true, passive: true },
  );
  const releasePointer = () => {
    pointerDown = false;
    markInput();
  };
  document.addEventListener('pointerup', releasePointer, { capture: true, passive: true });
  document.addEventListener('pointercancel', releasePointer, { capture: true, passive: true });

  const hasRecentInput = (now: number) =>
    pointerDown || isWithinInputWindow(lastInputAt, now, CONFIG.INPUT_GATE_SEC);

  const flush = () => {
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (pendingPx === 0) return;
    const msg: ScrollBatchMessage = { type: 'scroll-batch', px: pendingPx };
    pendingPx = 0;
    // 届かなかった分は、次の送信にまわす（拡張機能の再読み込み後などは捨てる）
    void sendToBackground(msg).then((ok) => {
      if (ok || !chrome.runtime?.id) return;
      pendingPx += msg.px;
      scheduleFlush();
    });
  };

  const scheduleFlush = () => {
    if (flushTimer === null) flushTimer = setTimeout(flush, CONFIG.BATCH_INTERVAL_SEC * 1000);
  };

  document.addEventListener(
    'scroll',
    (e) => {
      const t = e.target;
      const el = t instanceof Document ? rootEl() : t instanceof Element ? t : null;
      if (!el) return;

      const now = performance.now();
      const cur = el.scrollTop;
      const prev = lastTop.get(el);
      lastTop.set(el, cur);

      if (opts.isEnabled && !opts.isEnabled()) return; // 無効なサイトでは、距離も「最後のスクロール」も記録しない

      // 縦に動いていないスクロール（横に自動で流れるバナー、カルーセル等）は無視する。
      // これを「最後のスクロール」に含めると、物色の待ち時間が満たされなくなる。
      if (prev !== undefined && cur === prev) return;

      // 「最後のスクロール」は、縦に動いたものなら向きや原因を問わない
      lastAnyScrollAt = now;
      lastScroller = el;
      if (prev === undefined) return; // 初回は基準位置を覚えるだけ

      const delta = downwardDelta(prev, cur);
      if (delta === 0) return;
      if (!hasRecentInput(now)) return; // ジャンプや自動スクロールは数えない

      pendingPx += delta;

      scheduleFlush();
    },
    { capture: true, passive: true },
  );

  // 見えなくなる前に送り切る
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  return {
    snapshot: () => ({
      msSinceLastScroll: lastAnyScrollAt === null ? Infinity : performance.now() - lastAnyScrollAt,
      lastScrollAt: lastAnyScrollAt,
      progress: progressOf(lastScroller ?? rootEl()),
      spot: (() => {
        const el = lastScroller ?? rootEl();
        return { elementId: idOf(el), scrollTop: el.scrollTop, viewportH: window.innerHeight };
      })(),
      pendingPx,
    }),
  };
}
