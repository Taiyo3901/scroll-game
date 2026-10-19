import { CONFIG } from '../config';
import { minesToday } from '../core/game';
import { evaluateConditions, type ConditionResult } from '../core/mining';
import { localDayKey } from '../core/week';
import type { MineCompleteMessage } from '../messages';
import { sendToBackground } from './send';
import { getView } from './store';
import type { TrackerSnapshot } from './tracker';

export interface MinerSnapshot {
  mining: boolean;
  /** 0〜1 */
  gauge: number;
  checks: ConditionResult;
}

const STALE_STEP_MS = 2000;

/**
 * 採掘ゲージ。スクロールが止まって MINING_START_DELAY_SEC たつとゲージがたまり始め、
 * MINING_DURATION_SEC で満タンになる。途中でスクロールしたり条件を外れたら中断してリセットする。
 * 満タンになったら service worker に報告する（抽選は service worker が行う）。
 */
export class Miner {
  private startedAt: number | null = null;
  private lastStepAt = -Infinity;
  private last: MinerSnapshot = {
    mining: false,
    gauge: 0,
    checks: { exploring: false, stopped: false, visible: false, underDailyCap: true },
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
    const delayMs = CONFIG.MINING_START_DELAY_SEC * 1000;
    const durationMs = CONFIG.MINING_DURATION_SEC * 1000;

    // 採掘中は「始めてからスクロールしていない」ことを条件にする
    const msSinceScroll = wasMining
      ? snap.msSinceLastScroll >= now - (this.startedAt as number)
        ? Infinity
        : -1
      : snap.msSinceLastScroll;

    const result = evaluateConditions({
      exploring: state.mode === 'exploring',
      msSinceLastScroll: msSinceScroll,
      startDelayMs: wasMining ? 0 : delayMs,
      visible: document.visibilityState === 'visible',
      minesToday: minesToday(state, localDayKey(new Date())),
      maxMinesPerDay: CONFIG.MAX_MINES_PER_DAY,
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
      const msg: MineCompleteMessage = { type: 'mine-complete' };
      void sendToBackground(msg);
    }

    this.last = { mining, gauge, checks: result.checks };
    return this.last;
  }

  /** ページが見えなくなったときなど、進行中の採掘を捨てる */
  reset(): void {
    this.startedAt = null;
  }
}
