import { CONFIG } from '../config';
import { minesToday } from '../core/game';
import { evaluateConditions, type ConditionResult } from '../core/mining';
import { localDayKey } from '../core/week';
import type { MineCompleteMessage } from '../messages';
import { sendToBackground } from './send';
import { getView } from './store';
import { estimateVisibleText, type TextEstimate } from './text';
import type { TrackerSnapshot } from './tracker';

export interface MinerSnapshot {
  mining: boolean;
  /** 0〜1 */
  gauge: number;
  checks: ConditionResult;
  visibleChars: number;
  /** 文字数の概算に使った要素の数（デバッグ用） */
  textSeen: number;
  textWithText: number;
  /** 今いる位置のキーと、このページで掘った場所の数（デバッグ用。URLは含まない） */
  spot: string;
  dugCount: number;
}

const TEXT_CHECK_INTERVAL_MS = 1000;
const STALE_STEP_MS = 2000;

/**
 * 採掘ゲージ（SPEC 4.4）。開始条件がそろうと MINING_DURATION_SEC かけてゲージがたまり、
 * 途中でスクロールしたり条件を外れたら中断してゲージをリセットする。
 * 満タンになったら service worker に報告する（抽選は service worker が行う）。
 * 「掘った場所」はこのページを開いている間のメモリだけに持つ。
 */
export class Miner {
  private startedAt: number | null = null;
  private readonly dug = new Set<string>();
  private text: TextEstimate = { chars: 0, seen: 0, withText: 0 };
  private charsAt = -Infinity;
  private lastStepAt = -Infinity;
  private last: MinerSnapshot = {
    mining: false,
    gauge: 0,
    checks: {
      exploring: false,
      delay: false,
      notSkimming: false,
      visibleFocus: false,
      idleActive: true,
      enoughText: false,
      newSpot: true,
      underDailyCap: true,
    },
    visibleChars: 0,
    textSeen: 0,
    textWithText: 0,
    spot: '-',
    dugCount: 0,
  };

  get snapshot(): MinerSnapshot {
    return this.last;
  }

  /** 軽い間隔(約250ms)で呼ぶ。ページが見えていないときは呼ばなくてよい。 */
  step(now: number, snap: TrackerSnapshot): MinerSnapshot {
    const { state, runtime } = getView();
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

    const base = {
      exploring: state.mode === 'exploring',
      msSinceLastScroll: msSinceScroll,
      startDelayMs: wasMining ? 0 : delayMs,
      skimming: snap.skimming,
      inCooldown: snap.inCooldown,
      visible: document.visibilityState === 'visible',
      focused: document.hasFocus(),
      idleActive: runtime.idleState === 'active',
      minChars: CONFIG.MIN_VISIBLE_TEXT_CHARS,
      spotDug: this.dug.has(snap.spotKey),
      minesToday: minesToday(state, localDayKey(new Date())),
      maxMinesPerDay: CONFIG.MAX_MINES_PER_DAY,
    };

    // 文字数の概算は少し重いので、ほかの条件がそろったときだけ、1秒に1回まで計算する
    let result = evaluateConditions({ ...base, visibleChars: this.text.chars });
    const othersOk = Object.entries(result.checks).every(([k, v]) => k === 'enoughText' || v);
    if (othersOk && now - this.charsAt >= TEXT_CHECK_INTERVAL_MS) {
      this.text = estimateVisibleText();
      this.charsAt = now;
      result = evaluateConditions({ ...base, visibleChars: this.text.chars });
    }

    if (!result.ok) {
      this.startedAt = null; // 中断。ゲージはリセット
    } else if (this.startedAt === null) {
      this.startedAt = now;
    }

    let gauge = this.startedAt === null ? 0 : Math.min(1, (now - this.startedAt) / durationMs);
    let mining = this.startedAt !== null;

    if (this.startedAt !== null && now - this.startedAt >= durationMs) {
      this.dug.add(snap.spotKey);
      this.startedAt = null;
      mining = false;
      gauge = 0;
      const spot = snap.spotKey;
      const msg: MineCompleteMessage = { type: 'mine-complete' };
      // 報告が届かなかったときは、その場所をまた掘れるようにする（鉱石が付かないまま消費しない）
      void sendToBackground(msg).then((ok) => {
        if (!ok) this.dug.delete(spot);
      });
    }

    this.last = {
      mining,
      gauge,
      checks: result.checks,
      visibleChars: this.text.chars,
      textSeen: this.text.seen,
      textWithText: this.text.withText,
      spot: snap.spotKey,
      dugCount: this.dug.size,
    };
    return this.last;
  }

  /** ページが見えなくなったときなど、進行中の採掘を捨てる */
  reset(): void {
    this.startedAt = null;
  }
}
