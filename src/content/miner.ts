import { CONFIG } from '../config';
import { classifyHost } from '../core/genre';
import { findsToday } from '../core/game';
import { evaluateConditions, type ConditionResult } from '../core/mining';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import type { FindCompleteMessage } from '../messages';
import { sendToBackground } from './send';
import { getView } from './store';
import type { TrackerSnapshot } from './tracker';

export interface MinerSnapshot {
  /** ゲージがたまっている最中 */
  mining: boolean;
  /** 0〜1 */
  gauge: number;
  checks: ConditionResult;
}

const STALE_STEP_MS = 2000;

/**
 * 発見ゲージ。スクロールが止まって FIND_START_DELAY_SEC たつとゲージがたまり始め、
 * FIND_DURATION_SEC で満タンになる。途中でスクロールしたり条件を外れたら中断してリセットする。
 * 満タンになったら、閲覧中のサイトの種類（部屋のID）だけを service worker に報告する。
 * ホスト名はここで部屋の判定に使うだけで、送らず、保存もしない。
 */
export class Miner {
  private startedAt: number | null = null;
  private lastStepAt = -Infinity;
  private last: MinerSnapshot = {
    mining: false,
    gauge: 0,
    checks: { stopped: false, visible: false, underDailyCap: true },
  };

  get snapshot(): MinerSnapshot {
    return this.last;
  }

  /** 軽い間隔(約250ms)で呼ぶ。ページが見えていないときは呼ばなくてよい。 */
  step(now: number, snap: TrackerSnapshot): MinerSnapshot {
    const { state } = getView();
    // タイマーが止まっていた（タブが隠れていた等）あとに、古い開始時刻で満タン扱いにしない
    if (now - this.lastStepAt > STALE_STEP_MS) this.startedAt = null;
    this.lastStepAt = now;
    const wasMining = this.startedAt !== null;
    const delayMs = CONFIG.FIND_START_DELAY_SEC * 1000;
    const durationMs = CONFIG.FIND_DURATION_SEC * 1000;

    // ゲージがたまっている間は「始めてからスクロールしていない」ことを条件にする
    const msSinceScroll = wasMining
      ? snap.msSinceLastScroll >= now - (this.startedAt as number)
        ? Infinity
        : -1
      : snap.msSinceLastScroll;

    const result = evaluateConditions({
      msSinceLastScroll: msSinceScroll,
      startDelayMs: wasMining ? 0 : delayMs,
      visible: document.visibilityState === 'visible',
      findsToday: findsToday(state, localDayKey(new Date())),
      maxFindsPerDay: CONFIG.MAX_FINDS_PER_DAY,
    });

    if (!result.ok) {
      this.startedAt = null; // 中断。ゲージはリセット
    } else if (this.startedAt === null) {
      this.startedAt = now;
    }

    let gauge = this.startedAt === null ? 0 : Math.min(1, (now - this.startedAt) / durationMs);
    let mining = this.startedAt !== null;

    if (this.startedAt !== null && now - this.startedAt >= durationMs) {
      this.startedAt = null;
      mining = false;
      gauge = 0;
      const msg: FindCompleteMessage = {
        type: 'find-complete',
        genreId: classifyHost(location.hostname, CATALOG.genres),
      };
      void sendToBackground(msg);
    }

    this.last = { mining, gauge, checks: result.checks };
    return this.last;
  }

  /** ページが見えなくなったときなど、進行中の発見を捨てる */
  reset(): void {
    this.startedAt = null;
  }
}
