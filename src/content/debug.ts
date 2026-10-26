import { CONFIG, configFor } from '../config';
import { pxToMeters } from '../core/depth';
import { areaAt, findGenre } from '../core/catalog';
import { classifyHost } from '../core/genre';
import { findsToday } from '../core/game';
import { CONDITION_KEYS, CONDITION_LABELS } from '../core/mining';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import type { MinerSnapshot } from './miner';
import { getView } from './store';
import type { TrackerSnapshot } from './tracker';

const STYLE = `
:host { all: initial; }
.box {
  position: fixed; right: var(--gap, ${CONFIG.OVERLAY_WIDTH_PX + 8}px); bottom: 8px; z-index: 2147483646;
  pointer-events: none; padding: 6px 8px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.72); color: #e8f5e9;
  font: 11px/1.45 ui-monospace, Consolas, "Yu Gothic UI", monospace; white-space: pre;
}
`;

/** 開発用の小さなデバッグ表示（右下。帯の左隣）。設定 debugOverlay でオン・オフ。 */
export interface DebugView {
  update(t: TrackerSnapshot, m: MinerSnapshot): void;
  setEnabled(on: boolean): void;
  /** 帯を置いている側と幅に合わせて、帯と重ならない場所へ動かす */
  setBand(side: 'right' | 'left', width: number): void;
}

export function createDebug(): DebugView {
  let host: HTMLElement | null = null;
  let box: HTMLElement | null = null;
  let band: { side: 'right' | 'left'; width: number } = { side: 'right', width: CONFIG.OVERLAY_WIDTH_PX };
  const applyBand = () => {
    if (!box) return;
    // 帯が右にあるときは、その左隣。帯が左にあるときは、右下
    box.style.setProperty('--gap', `${band.side === 'right' ? band.width + 8 : 8}px`);
  };

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
    applyBand();
  };
  const hide = () => {
    host?.remove();
    host = null;
    box = null;
  };

  return {
    setEnabled: (on) => (on ? show() : hide()),
    setBand(side, width) {
      band = { side, width };
      applyBand();
    },
    update(t, m) {
      if (!box) return;
      const { state, settings } = getView();
      const dayKey = localDayKey(new Date());
      const day = state.days[dayKey];
      const todayPx = (day?.scrollPx ?? 0) + t.pendingPx;
      const genre = findGenre(CATALOG, classifyHost(location.hostname, CATALOG.genres));
      const checks = CONDITION_KEYS.map((k) => `${m.checks[k] ? '✓' : '✗'}${CONDITION_LABELS[k]}`).join(' ');

      box.textContent = [
        `今日の総スクロール: ${todayPx.toFixed(0)} px（実距離 ${pxToMeters(todayPx).toFixed(2)} m）`,
        `深度: ${state.depthM.toFixed(1)} m  ${areaAt(CATALOG.areas, state.depthM).name}`,
        `この部屋: ${genre?.name ?? '-'}`,
        `場面: ${m.phase}  入れ物: ${m.container ?? '-'}(${m.skin || '-'})  ${Math.round(m.gauge * 100)}%  今日 ${findsToday(state, dayKey)}/${configFor(settings.demoMode).MAX_FINDS_PER_DAY}回${settings.demoMode ? '  [デモ]' : ''}`,
        `条件: ${checks}`,
      ].join('\n');
    },
  };
}
