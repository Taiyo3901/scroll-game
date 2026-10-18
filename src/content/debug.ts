import { CONFIG } from '../config';
import { pxToMeters } from '../core/depth';
import { currentOil, minesToday } from '../core/game';
import { CONDITION_KEYS, CONDITION_LABELS } from '../core/mining';
import { localDayKey } from '../core/week';
import { RULES } from '../rules';
import type { MinerSnapshot } from './miner';
import { getView } from './store';
import type { TrackerSnapshot } from './tracker';

const STYLE = `
:host { all: initial; }
.box {
  position: fixed; left: 8px; bottom: 8px; z-index: 2147483646;
  pointer-events: none; padding: 6px 8px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.72); color: #e8f5e9;
  font: 11px/1.45 ui-monospace, Consolas, "Yu Gothic UI", monospace; white-space: pre;
}
.skim { color: #ffb74d; }
`;

/** 開発用の小さなデバッグ表示（左下）。設定 debugOverlay でオン・オフ。 */
export interface DebugView {
  update(t: TrackerSnapshot, m: MinerSnapshot): void;
  setEnabled(on: boolean): void;
}

export function createDebug(): DebugView {
  let host: HTMLElement | null = null;
  let box: HTMLElement | null = null;

  const show = () => {
    if (host) return;
    host = document.createElement('div');
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    box = document.createElement('div');
    box.className = 'box';
    root.append(style, box);
    document.documentElement.append(host);
  };
  const hide = () => {
    host?.remove();
    host = null;
    box = null;
  };

  return {
    setEnabled: (on) => (on ? show() : hide()),
    update(t, m) {
      if (!box) return;
      const { state } = getView();
      const now = Date.now();
      const dayKey = localDayKey(new Date(now));
      const day = state.days[dayKey];
      const todayPx = (day?.scrollPx ?? 0) + (day?.skimPx ?? 0) + t.pendingPx + t.pendingSkimPx;
      const skimLine = t.skimming
        ? '流し読み: はい（深度に数えない）'
        : t.inCooldown
          ? `流し読み: いいえ（クールダウン残り ${t.cooldownRemainingSec.toFixed(1)}秒）`
          : '流し読み: いいえ';
      const oil = currentOil(state, now, RULES);
      const checks = CONDITION_KEYS.map(
        (k) => `${m.checks[k] ? '✓' : '✗'}${CONDITION_LABELS[k]}`,
      ).join(' ');

      box.className = t.skimming ? 'box skim' : 'box';
      box.textContent = [
        `平均速度(${CONFIG.SKIM_WINDOW_SEC}秒): ${t.speedPxPerSec.toFixed(0)} px/秒`,
        `窓内の合計: ${t.windowPx.toFixed(0)} / しきい値 ${t.thresholdPx.toFixed(0)} px`,
        skimLine,
        `今日の総スクロール: ${todayPx.toFixed(0)} px（実距離 ${pxToMeters(todayPx).toFixed(2)} m）`,
        `   うち流し読み: ${((day?.skimPx ?? 0) + t.pendingSkimPx).toFixed(0)} px`,
        `深度: ${state.depthM.toFixed(1)} m  ${state.mode === 'exploring' ? '探検中' : '地上'}`,
        `油: ${oil.toFixed(0)} / ${CONFIG.OIL_MAX}  バッグ: ${Object.values(state.bag).reduce((a, b) => a + b, 0)}個`,
        `採掘: ${m.mining ? `${Math.round(m.gauge * 100)}%` : '待機'}  今日 ${minesToday(state, dayKey)}/${CONFIG.MAX_MINES_PER_DAY}回`,
        `画面内の文字数(概算): ${m.visibleChars}（必要 ${CONFIG.MIN_VISIBLE_TEXT_CHARS}）  要素 ${m.textSeen} / 文字あり ${m.textWithText}`,
        `位置: ${m.spot}  このページで掘った場所: ${m.dugCount}`,
        `条件: ${checks}`,
      ].join('\n');
    },
  };
}
