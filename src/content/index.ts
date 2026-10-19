import { CONFIG } from '../config';
import { areaAt, findItem } from '../core/catalog';
import { formatBadge } from '../core/format';
import { findsToday } from '../core/game';
import { diagnoseJob, sumGenreFinds } from '../core/job';
import type { GameEvent } from '../core/state';
import { localDayKey } from '../core/week';
import { spriteUri } from '../core/sprites';
import { CATALOG } from '../data';
import { createDebug } from './debug';
import { Miner } from './miner';
import { createOverlay, type Overlay } from './overlay/overlay';
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

function main(): void {
  const tracker = startTracker();
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
      const area = areaAt(CATALOG.areas, state.depthM);
      overlay.update({
        depthText: formatBadge(state.depthM),
        areaId: area.id,
        depthM: state.depthM,
        strataName: area.name,
        strataColor: area.color,
        todayFinds: findsToday(state, localDayKey(new Date())),
        phase: m.phase,
        gauge: m.gauge,
        container: m.container,
        skin: m.skin,
        job: currentJob(),
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
