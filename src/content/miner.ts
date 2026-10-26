import { CONFIG } from '../config';
import { areaAt } from '../core/catalog';
import { rollContainer, type ContainerKind } from '../core/containers';
import { classifyHost } from '../core/genre';
import { findsToday } from '../core/game';
import { evaluateConditions } from '../core/mining';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import type { FindCompleteMessage } from '../messages';
import { RULES } from '../rules';
import { sendToBackground } from './send';
import { getView } from './store';
import type { TrackerSnapshot } from './tracker';

/**
 * 帯の中の場面。
 * - walk: スクロール直後（探索者が歩く）
 * - idle: 止まっているが、まだ物色を始めない（待ち時間、非表示、上限など）
 * - search: 入れ物が現れて、物色中
 * - done: 見つけ終わった。次にスクロールするまで、入れ物は開いたまま
 */
export type Phase = 'walk' | 'idle' | 'search' | 'done';

export interface MinerSnapshot {
  phase: Phase;
  /** 物色の進み具合 0〜1 */
  gauge: number;
  /** 入れ物の種類（現れていないときは null） */
  container: ContainerKind | null;
  /** 入れ物の見た目を決める名前: 箱は部屋のID、それ以外は階層のID */
  skin: string;
}

const STALE_STEP_MS = 2000;

/**
 * 物色の進行。スクロールが止まって FIND_START_DELAY_SEC たつと入れ物が現れて物色が始まり、
 * FIND_DURATION_SEC で品が見つかる。途中でスクロールしたり条件を外れたら中断して入れ物は消える。
 * 品が見つかったら、次にスクロールするまで、その場ではもう見つからない（1回の立ち止まりで1つだけ）。
 * service worker に送るのは、部屋のIDと入れ物の種類だけ。ホスト名はここで部屋の判定に使うだけで、送らず、保存もしない。
 */
export class Miner {
  private startedAt: number | null = null;
  private lastStepAt = -Infinity;
  /** 入れ物（物色の開始時に決める） */
  private container: ContainerKind | null = null;
  private skin = '';
  /** 品を見つけたときの「最後のスクロール」の時刻。これが変わる（新しくスクロールする）まで、次は見つからない */
  private doneMark: { at: number | null } | null = null;
  private last: MinerSnapshot = {
    phase: 'idle',
    gauge: 0,
    container: null,
    skin: '',
  };

  get snapshot(): MinerSnapshot {
    return this.last;
  }

  /** 軽い間隔(約250ms)で呼ぶ。ページが見えていないときは呼ばなくてよい。 */
  step(now: number, snap: TrackerSnapshot): MinerSnapshot {
    const { state } = getView();
    const cfg = CONFIG;
    // タイマーが止まっていた（タブが隠れていた等）あとに、古い開始時刻で満タン扱いにしない
    if (now - this.lastStepAt > STALE_STEP_MS) this.startedAt = null;
    this.lastStepAt = now;

    // 新しくスクロールしたら、次の立ち止まりでまた探せる
    if (this.doneMark && snap.lastScrollAt !== this.doneMark.at) {
      this.doneMark = null;
      this.container = null;
    }
    const foundThisStop = this.doneMark !== null;

    const wasSearching = this.startedAt !== null;
    const delayMs = cfg.FIND_START_DELAY_SEC * 1000;
    const durationMs = cfg.FIND_DURATION_SEC * 1000;

    // 物色中は「始めてからスクロールしていない」ことを条件にする
    const msSinceScroll = wasSearching
      ? snap.msSinceLastScroll >= now - (this.startedAt as number)
        ? Infinity
        : -1
      : snap.msSinceLastScroll;

    const result = evaluateConditions({
      msSinceLastScroll: msSinceScroll,
      startDelayMs: wasSearching ? 0 : delayMs,
      visible: document.visibilityState === 'visible',
      findsToday: findsToday(state, localDayKey(new Date())),
      maxFindsPerDay: cfg.MAX_FINDS_PER_DAY,
      foundThisStop,
    });

    if (!result.ok) {
      if (this.startedAt !== null) this.container = null; // 中断。入れ物は消える
      this.startedAt = null;
    } else if (this.startedAt === null) {
      // 物色の開始: 入れ物を決める
      this.startedAt = now;
      this.container = rollContainer(RULES.containers, Math.random);
      const genreId = classifyHost(location.hostname, CATALOG.genres);
      this.skin =
        this.container === 'box' ? genreId : areaAt(CATALOG.areas, state.depthM).id;
    }

    let gauge = this.startedAt === null ? 0 : Math.min(1, (now - this.startedAt) / durationMs);

    if (this.startedAt !== null && now - this.startedAt >= durationMs && this.container) {
      const msg: FindCompleteMessage = {
        type: 'find-complete',
        genreId: classifyHost(location.hostname, CATALOG.genres),
        container: this.container,
      };
      this.startedAt = null;
      this.doneMark = { at: snap.lastScrollAt };
      gauge = 1;
      void sendToBackground(msg);
    }

    let phase: Phase;
    if (this.doneMark) phase = 'done';
    else if (this.startedAt !== null) phase = 'search';
    else phase = snap.msSinceLastScroll < delayMs ? 'walk' : 'idle';

    this.last = {
      phase,
      gauge,
      container: phase === 'search' || phase === 'done' ? this.container : null,
      skin: this.skin,
    };
    return this.last;
  }

  /** ページが切り替わったとき（同じタブの中での移動を含む）、進行中の状態を捨てる */
  resetPage(): void {
    this.doneMark = null;
    this.startedAt = null;
    this.container = null;
  }

  /** ページが見えなくなったときなど、進行中の物色を捨てる */
  reset(): void {
    this.startedAt = null;
    if (!this.doneMark) this.container = null;
  }
}
