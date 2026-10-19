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
  position: fixed; right: ${CONFIG.OVERLAY_WIDTH_PX + 30}px; bottom: 8px; z-index: 2147483646;
  pointer-events: none; padding: 6px 8px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.72); color: #e8f5e9;
  font: 11px/1.45 ui-monospace, Consolas, "Yu Gothic UI", monospace; white-space: pre;
}
`;

/** 開発用の小さなデバッグ表示（右下。帯の左隣）。設定 debugOverlay でオン・オフ。 */
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
      const todayPx = (day?.scrollPx ?? 0) + t.pendingPx;
      const oil = currentOil(state, now, RULES);
      const checks = CONDITION_KEYS.map(
        (k) => `${m.checks[k] ? '✓' : '✗'}${CONDITION_LABELS[k]}`,
      ).join(' ');

      box.textContent = [
        `今日の総スクロール: ${todayPx.toFixed(0)} px（実距離 ${pxToMeters(todayPx).toFixed(2)} m）`,
        `深度: ${state.depthM.toFixed(1)} m  ${state.mode === 'exploring' ? '探検中' : '地上'}`,
        `油: ${oil.toFixed(0)} / ${CONFIG.OIL_MAX}  バッグ: ${Object.values(state.bag).reduce((a, b) => a + b, 0)}個`,
        `採掘: ${m.mining ? `${Math.round(m.gauge * 100)}%` : '待機'}  今日 ${minesToday(state, dayKey)}/${CONFIG.MAX_MINES_PER_DAY}回`,
        `条件: ${checks}`,
      ].join('\n');
    },
  };
}
