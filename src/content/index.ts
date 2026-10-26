import { findItem } from '../core/catalog';
import { pxToDepth } from '../core/depth';
import { classifyHost } from '../core/genre';
import { isHostDisabled, isHostQuery, type HostReply } from '../core/hosts';
import { rulesFor } from '../rules';
import { diagnoseJob, sumGenreFinds } from '../core/job';
import { spriteUri } from '../core/sprites';
import { CATALOG } from '../data';
import { createDebug } from './debug';
import { Miner } from './miner';
import { createOverlay, openedContainerUri, type Overlay } from './overlay/overlay';
import { createSpaceReserver } from './overlay/reserve';
import { timeLookFor } from '../core/timeband';
import { getView, initStore, onViewChange } from './store';
import { startTracker } from './tracker';

const TICK_MS = 250;
const EVENT_MAX_AGE_MS = 10_000;

/** 診断した職業（探索者の見た目になる）。保存データが変わったときだけ計算し直す。 */
let jobCache: { state: unknown; job: string } | null = null;
function currentJob(): string {
  const { state } = getView();
  if (jobCache?.state !== state) {
    const job = diagnoseJob(sumGenreFinds(Object.values(state.days)), CATALOG.genres);
    jobCache = { state, job: job?.name ?? 'default' };
  }
  return jobCache.job;
}

/** このタブのサイトの種類（部屋）。ホスト名はここで判定に使うだけで、保存も送信もしない。 */
const ROOM_ID = classifyHost(location.hostname, CATALOG.genres);

function main(): void {
  /** このサイトは、自分で「ゲームを動かさない」と登録したサイトか（ホスト名はここで照合するだけで、送らない） */
  const isDisabledHere = () => isHostDisabled(location.hostname, getView().settings.disabledHosts);
  const tracker = startTracker({ isEnabled: () => !isDisabledHere() });
  const miner = new Miner();
  const debug = createDebug();
  const reserver = createSpaceReserver();
  let overlay: Overlay | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSeenSeq = -1;

  const syncOverlay = () => {
    const wantOverlay = getView().settings.effects && !isDisabledHere();
    if (wantOverlay && !overlay) overlay = createOverlay();
    if (!wantOverlay && overlay) {
      overlay.destroy();
      overlay = null;
    }
    const { bandSide, bandWidth, bandTop, reserveSpace, debugOverlay } = getView().settings;
    overlay?.setLayout({ side: bandSide, width: bandWidth, top: bandTop });
    // 帯と同じ幅の余白を、帯を置いた側のページに取る（サイトと重ならないように）
    reserver.set(wantOverlay && reserveSpace, bandWidth, bandSide);
    debug.setBand(bandSide, bandWidth);
    debug.setEnabled(debugOverlay);
  };

  // 同じタブの中でページが切り替わったら（ページの再読み込みなしの移動を含む）、帯の目印を消す。
  // 比べるのはメモリ上の値だけで、保存も送信もしない。
  let lastHref = location.href;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * いまの深さ。保存された深度に、まだ反映されていないスクロール量（送る前のもの、送ったが反映待ちのもの）を足して、
   * スクロールした分が、すぐ帯に出るようにする。
   */
  const liveDepth = (): number => {
    const { state, settings } = getView();
    const extra = pxToDepth(tracker.snapshot().unconfirmedPx, rulesFor(settings.demoMode).depthMultiplier);
    return state.depthM + extra;
  };

  // スクロールのたびに、背景（壁の流れ・色・飾り）を、次の描画に合わせて更新する（動いている間だけ）
  let depthFrame = 0;
  const scheduleDepth = () => {
    if (depthFrame !== 0 || !overlay || isDisabledHere()) return;
    depthFrame = requestAnimationFrame(() => {
      depthFrame = 0;
      overlay?.setDepth(liveDepth(), reducedMotion.matches);
    });
  };
  document.addEventListener('scroll', scheduleDepth, { capture: true, passive: true });

  const tick = () => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      miner.resetPage();
      overlay?.clearMarks();
    }
    if (isDisabledHere()) {
      miner.reset();
      return;
    }
    const now = performance.now();
    const t = tracker.snapshot();
    const m = miner.step(now, t);

    if (overlay) {
      overlay.setDepth(liveDepth(), reducedMotion.matches);
      overlay.setTime(timeLookFor(getView().settings.bandTime, new Date()));
      overlay.update({
        roomId: ROOM_ID,
        phase: m.phase,
        gauge: m.gauge,
        container: m.container,
        skin: m.skin,
        job: currentJob(),
        progress: t.progress,
        demo: getView().settings.demoMode,
      });
    }
    debug.update(t, m);
  };

  // 新しい出来事（品を見つけた）を演出する。ページを開いた時点の古いものは出さない。
  const showNewEvents = () => {
    const { events } = getView().state;
    const now = Date.now();
    for (const e of events) {
      if (e.seq <= lastSeenSeq) continue;
      if (now - e.at < EVENT_MAX_AGE_MS && document.visibilityState === 'visible') {
        const item = findItem(CATALOG, e.itemId);
        const icon = item ? spriteUri(item.id) : null;
        if (item && icon) overlay?.reveal(icon, item.rarity); // 品は、入れ物から跳び出すだけ（名前などの説明は出さない）
        // 見つけた場所（ページ内の位置）に、開けた入れ物の目印を残す。メモリだけで、保存しない
        const box = miner.snapshot;
        const markUri = box.container ? openedContainerUri(box.container, box.skin) : null;
        if (item && markUri) overlay?.mark(markUri, item.rarity);
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

  // ポップアップが、いま開いているタブのサイト名を尋ねる（「このサイトで無効にする」のため）。拡張機能自身からの問い合わせにだけ答える。
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!isHostQuery(message) || sender.id !== chrome.runtime.id) return false;
    const reply: HostReply = { host: location.hostname };
    sendResponse(reply);
    return false;
  });

  let lastStateDepth = -1;
  onViewChange(() => {
    // 保存された深度が更新されたら、送った分が反映されたので、反映待ちを数え直す
    if (getView().state.depthM !== lastStateDepth) {
      lastStateDepth = getView().state.depthM;
      tracker.confirmFlushed();
    }
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
