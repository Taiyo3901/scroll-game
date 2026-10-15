import { CONFIG } from '../config';
import { formatBadge } from '../core/format';
import { currentOil } from '../core/game';
import { findOre, stratumAt } from '../core/strata';
import type { GameEvent } from '../core/state';
import { CATALOG } from '../data';
import { RULES } from '../rules';
import { createDebug } from './debug';
import { Miner } from './miner';
import { createOverlay, type Overlay } from './overlay/overlay';
import { createSpaceReserver } from './overlay/reserve';
import { getView, initStore, onViewChange } from './store';
import { startTracker } from './tracker';

const TICK_MS = 250;
const EVENT_MAX_AGE_MS = 10_000;

function describeEvent(e: GameEvent): Parameters<Overlay['pop']>[0] | null {
  if (e.kind === 'mined') {
    const ore = findOre(CATALOG, e.oreId);
    if (!ore) return null;
    return { text: ore.name, tone: `r${ore.rarity}` as 'r1' | 'r2' | 'r3', stars: ore.rarity };
  }
  if (e.how === 'forced') {
    return {
      tone: 'warn',
      text: '油が切れた！',
      sub: `鉱石を${e.lost}個失い、${e.registered}個を持ち帰った`,
    };
  }
  return {
    tone: 'info',
    text: e.how === 'auto' ? '地上に戻りました（自動）' : '地上に戻りました',
    sub: `鉱石${e.registered}個を図鑑に登録（+${e.points}点）`,
  };
}

function main(): void {
  const tracker = startTracker({
    // 地上にいる間は、スクロールをすぐ送って探検の再開を素早く反映する
    flushImmediately: () => getView().state.mode === 'surface',
  });
  const miner = new Miner();
  const debug = createDebug();
  const reserver = createSpaceReserver();
  let overlay: Overlay | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSeenSeq = -1;

  const syncOverlay = () => {
    const wantOverlay = getView().settings.effects;
    if (wantOverlay && !overlay) overlay = createOverlay();
    if (!wantOverlay && overlay) {
      overlay.destroy();
      overlay = null;
    }
    // 帯と同じ幅の余白をページ側に取る（サイトと重ならないように）
    reserver.set(wantOverlay && getView().settings.reserveSpace, CONFIG.OVERLAY_WIDTH_PX);
    debug.setEnabled(getView().settings.debugOverlay);
  };

  const tick = () => {
    const now = performance.now();
    const t = tracker.snapshot();
    const m = miner.step(now, t);
    const { state } = getView();

    if (overlay) {
      const oil = currentOil(state, Date.now(), RULES);
      const refilling =
        state.mode === 'surface' && oil < CONFIG.START_OIL_MIN && t.msSinceLastScroll < 4000;
      overlay.setScrollbarWidth(Math.max(0, window.innerWidth - document.documentElement.clientWidth));
      overlay.update({
        depthText: formatBadge(state.depthM),
        strataName: stratumAt(CATALOG.strata, state.depthM).name,
        strataColor: stratumAt(CATALOG.strata, state.depthM).color,
        oilRatio: Math.max(0, Math.min(1, oil / CONFIG.OIL_MAX)),
        oilLow: state.mode === 'exploring' && oil <= CONFIG.OIL_LOW_THRESHOLD,
        surface: state.mode === 'surface',
        mining: m.mining,
        gauge: m.gauge,
        skimming: t.skimming && state.mode === 'exploring',
        refilling,
      });
    }
    debug.update(t, m);
  };

  // 新しい出来事（鉱石を掘り当てた、地上に戻った）を演出する。ページを開いた時点の古いものは出さない。
  const showNewEvents = () => {
    const { events } = getView().state;
    const now = Date.now();
    for (const e of events) {
      if (e.seq <= lastSeenSeq) continue;
      if (now - e.at < EVENT_MAX_AGE_MS && document.visibilityState === 'visible') {
        const pop = describeEvent(e);
        if (pop) overlay?.pop(pop);
      }
    }
    lastSeenSeq = events[events.length - 1]?.seq ?? lastSeenSeq;
  };

  // ページが見えている間だけ動かす
  const syncTimer = () => {
    if (document.visibilityState === 'visible') {
      if (timer === null) timer = setInterval(tick, TICK_MS);
    } else {
      if (timer !== null) clearInterval(timer);
      timer = null;
      miner.reset();
    }
  };
  document.addEventListener('visibilitychange', syncTimer);

  onViewChange(() => {
    syncOverlay();
    showNewEvents();
  });
  void initStore().then(() => {
    lastSeenSeq = getView().state.events[getView().state.events.length - 1]?.seq ?? 0;
    syncOverlay();
    syncTimer();
  });
}

// トップフレームでのみ動かす。何が起きてもページ側にエラーを投げない。
try {
  if (window.top === window) main();
} catch (e) {
  console.debug('[scroll-game] content script disabled on this page', e);
}
