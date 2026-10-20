import { CONFIG } from '../config';
import { findItem } from '../core/catalog';
import { BAND_STEP_CALM_M, BAND_STEP_M, bandVariant } from '../core/band';
import { classifyHost } from '../core/genre';
import { isHostDisabled, isHostQuery, type HostReply } from '../core/hosts';
import { formatBadge } from '../core/format';
import { diagnoseJob, sumGenreFinds } from '../core/job';
import type { GameEvent } from '../core/state';
import { spriteUri } from '../core/sprites';
import { CATALOG } from '../data';
import { createDebug } from './debug';
import { Miner } from './miner';
import { createOverlay, openedContainerUri, type Overlay } from './overlay/overlay';
import { createSpaceReserver } from './overlay/reserve';
import { getView, initStore, onViewChange } from './store';
import { startTracker } from './tracker';

const TICK_MS = 250;
const EVENT_MAX_AGE_MS = 10_000;

function describeEvent(e: GameEvent): Parameters<Overlay['pop']>[0] | null {
  const item = findItem(CATALOG, e.itemId);
  if (!item) return null;
  const count = getView().state.collection[item.id] ?? 0;
  if (item.mimic) {
    return {
      text: 'ミミックだ！',
      sub: count <= 1 ? `${item.name}を手に入れた（新発見）` : `${item.name}を手に入れた`,
      tone: `r${item.rarity}` as 'r1' | 'r2' | 'r3',
      stars: item.rarity,
      iconUri: spriteUri(item.id) ?? undefined,
    };
  }
  return {
    text: item.name,
    tone: `r${item.rarity}` as 'r1' | 'r2' | 'r3',
    stars: item.rarity,
    iconUri: spriteUri(item.id) ?? undefined,
    sub: count <= 1 ? '新発見！ 図鑑に追加' : `図鑑 ${count}個目`,
  };
}

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
    // 帯と同じ幅の余白をページ側に取る（サイトと重ならないように）
    reserver.set(wantOverlay && getView().settings.reserveSpace, CONFIG.OVERLAY_WIDTH_PX);
    debug.setEnabled(getView().settings.debugOverlay);
  };

  // 同じタブの中でページが切り替わったら（ページの再読み込みなしの移動を含む）、帯の目印を消す。
  // 比べるのはメモリ上の値だけで、保存も送信もしない。
  let lastHref = location.href;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    const { state } = getView();

    if (overlay) {
      overlay.update({
        depthText: formatBadge(state.depthM),
        roomId: ROOM_ID,
        depthM: state.depthM,
        // 「視覚効果を減らす」設定のときは、切り替わりを、ゆるやかにする
        bandVariant: bandVariant(state.depthM, reducedMotion.matches ? BAND_STEP_CALM_M : BAND_STEP_M),
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
        const pop = describeEvent(e);
        const item = findItem(CATALOG, e.itemId);
        if (pop) overlay?.pop(pop);
        if (pop?.iconUri && item) overlay?.reveal(pop.iconUri, item.rarity);
        // 見つけた場所（ページ内の位置）に、開けた入れ物の目印を残す。メモリだけで、保存しない
        const box = miner.snapshot;
        const markUri = box.container ? openedContainerUri(box.container, box.skin) : null;
        if (item && markUri) overlay?.mark(tracker.snapshot().progress, markUri, item.rarity);
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
