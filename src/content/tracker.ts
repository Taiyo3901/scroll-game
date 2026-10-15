import { CONFIG } from '../config';
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
  cooldownRemainingSec: number;
  /** まだ service worker に送っていない距離 */
  pendingPx: number;
  pendingSkimPx: number;
}

const USER_INPUT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;

/**
 * スクロール量の計測。ページ全体と、ページ内の枠(Gmailなど)の両方を拾う。
 * イベント内では足し算だけ行い、数秒ごとにまとめて送る。
 */
export function startTracker(): { snapshot: () => TrackerSnapshot } {
  const lastTop = new WeakMap<Element, number>();
  let lastInputAt: number | null = null;
  let pointerDown = false;
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
    const msg: ScrollBatchMessage = { type: 'scroll-batch', px: pendingPx, skimPx: pendingSkimPx };
    pendingPx = 0;
    pendingSkimPx = 0;
    try {
      // 拡張機能の再読み込み後など、送れないことがある。ページ側には何も投げない
      void chrome.runtime.sendMessage(msg).catch(() => {});
    } catch {
      /* extension context invalidated */
    }
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

      const cur = el.scrollTop;
      const prev = lastTop.get(el);
      lastTop.set(el, cur);
      if (prev === undefined) return; // 初回は基準位置を覚えるだけ

      const delta = downwardDelta(prev, cur);
      if (delta === 0) return;

      const now = performance.now();
      if (!hasRecentInput(now)) return; // ジャンプや自動スクロールは数えない

      skim = advanceSkim(skim, now, window.innerHeight, skimCfg, delta);
      if (skim.skimming) pendingSkimPx += delta;
      else pendingPx += delta;
      scheduleFlush();
      scheduleTick();
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
      return {
        speedPxPerSec: averageSpeedPxPerSec(s, skimCfg),
        windowPx: windowTotalPx(s),
        thresholdPx: window.innerHeight * CONFIG.SKIM_SCREENS,
        skimming: s.skimming,
        cooldownRemainingSec: isInCooldown(s, now) ? (s.cooldownUntil - now) / 1000 : 0,
        pendingPx,
        pendingSkimPx,
      };
    },
  };
}
