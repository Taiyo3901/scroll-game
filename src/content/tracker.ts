import { CONFIG } from '../config';
import { spotKey } from '../core/mining';
import { downwardDelta, isWithinInputWindow } from '../core/scroll';
import {
  advanceSkim,
  averageSpeedPxPerSec,
  initialSkimState,
  isInCooldown,
  windowTotalPx,
  type SkimConfig,
  type SkimState,
} from '../core/skim';
import type { ScrollBatchMessage } from '../messages';
import { sendToBackground } from './send';

const skimCfg: SkimConfig = {
  windowSec: CONFIG.SKIM_WINDOW_SEC,
  screens: CONFIG.SKIM_SCREENS,
  cooldownSec: CONFIG.SKIM_COOLDOWN_SEC,
};

export interface TrackerSnapshot {
  speedPxPerSec: number;
  windowPx: number;
  thresholdPx: number;
  skimming: boolean;
  inCooldown: boolean;
  cooldownRemainingSec: number;
  /** 最後のスクロール（向きや原因を問わない）からの経過ms。なければ Infinity */
  msSinceLastScroll: number;
  /** 今スクロールしている要素と、画面の高さ単位で丸めた位置（掘った場所の記録に使う。URLは含まない） */
  spotKey: string;
  /** まだ service worker に送っていない距離 */
  pendingPx: number;
  pendingSkimPx: number;
}

export interface Tracker {
  snapshot: () => TrackerSnapshot;
}

export interface TrackerOptions {
  /** true を返す間は、数えたスクロールをすぐ送る（地上からの再開を素早く反映するため） */
  flushImmediately?: () => boolean;
}

const USER_INPUT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
const IMMEDIATE_FLUSH_MIN_GAP_MS = 1000;

/**
 * スクロール量の計測。ページ全体と、ページ内の枠(Gmailなど)の両方を拾う。
 * イベント内では足し算だけ行い、数秒ごとにまとめて送る。
 */
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
  let lastFlushAt = -Infinity;
  let skim: SkimState = initialSkimState();
  let pendingPx = 0;
  let pendingSkimPx = 0;
  let tickTimer: ReturnType<typeof setTimeout> | null = null;
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
    if (pendingPx === 0 && pendingSkimPx === 0) return;
    lastFlushAt = performance.now();
    const msg: ScrollBatchMessage = { type: 'scroll-batch', px: pendingPx, skimPx: pendingSkimPx };
    pendingPx = 0;
    pendingSkimPx = 0;
    // 届かなかった分は、次の送信にまわす（拡張機能の再読み込み後などは捨てる）
    void sendToBackground(msg).then((ok) => {
      if (ok || !chrome.runtime?.id) return;
      pendingPx += msg.px;
      pendingSkimPx += msg.skimPx;
      scheduleFlush();
    });
  };

  const scheduleFlush = () => {
    if (flushTimer === null) flushTimer = setTimeout(flush, CONFIG.BATCH_INTERVAL_SEC * 1000);
  };

  // スクロールが止まっていても、窓から古い分が抜けて流し読みが終わるように時間を進める
  const scheduleTick = () => {
    if (tickTimer !== null) return;
    tickTimer = setTimeout(() => {
      tickTimer = null;
      const now = performance.now();
      skim = advanceSkim(skim, now, window.innerHeight, skimCfg);
      if (skim.samples.length > 0 || skim.skimming || isInCooldown(skim, now)) scheduleTick();
    }, 1000);
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

      // 縦に動いていないスクロール（横に自動で流れるバナー、カルーセル等）は無視する。
      // これを「最後のスクロール」に含めると、採掘の待ち時間が満たされなくなる。
      if (prev !== undefined && cur === prev) return;

      // 採掘の「最後のスクロール」は、縦に動いたものなら向きや原因を問わない
      lastAnyScrollAt = now;
      lastScroller = el;
      if (prev === undefined) return; // 初回は基準位置を覚えるだけ

      const delta = downwardDelta(prev, cur);
      if (delta === 0) return;
      if (!hasRecentInput(now)) return; // ジャンプや自動スクロールは数えない

      skim = advanceSkim(skim, now, window.innerHeight, skimCfg, delta);
      if (skim.skimming) pendingSkimPx += delta;
      else pendingPx += delta;
      scheduleTick();

      if (opts.flushImmediately?.() && now - lastFlushAt >= IMMEDIATE_FLUSH_MIN_GAP_MS) flush();
      else scheduleFlush();
    },
    { capture: true, passive: true },
  );

  // 見えなくなる前に送り切る
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  return {
    snapshot: () => {
      const now = performance.now();
      const s = advanceSkim(skim, now, window.innerHeight, skimCfg);
      const scroller = lastScroller ?? rootEl();
      return {
        speedPxPerSec: averageSpeedPxPerSec(s, skimCfg),
        windowPx: windowTotalPx(s),
        thresholdPx: window.innerHeight * CONFIG.SKIM_SCREENS,
        skimming: s.skimming,
        inCooldown: isInCooldown(s, now),
        cooldownRemainingSec: isInCooldown(s, now) ? (s.cooldownUntil - now) / 1000 : 0,
        msSinceLastScroll: lastAnyScrollAt === null ? Infinity : now - lastAnyScrollAt,
        spotKey: spotKey(idOf(scroller), scroller.scrollTop, window.innerHeight),
        pendingPx,
        pendingSkimPx,
      };
    },
  };
}
