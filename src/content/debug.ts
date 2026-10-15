import { CONFIG } from '../config';
import { pxToMeters } from '../core/depth';
import { initialGameState, type GameState } from '../core/progress';
import { localDayKey } from '../core/week';
import { SETTINGS_KEY, STATE_KEY, defaultSettings, loadSettings, loadState } from '../storage';
import type { TrackerSnapshot } from './tracker';

const STYLE = `
:host { all: initial; }
.box {
  position: fixed; left: 8px; bottom: 8px; z-index: 2147483647;
  pointer-events: none; padding: 6px 8px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.72); color: #e8f5e9;
  font: 11px/1.45 ui-monospace, Consolas, monospace; white-space: pre;
}
.skim { color: #ffb74d; }
`;

/** 開発用の小さなデバッグ表示。設定 debugOverlay でオン・オフ。 */
export function mountDebug(getSnapshot: () => TrackerSnapshot): void {
  let enabled = defaultSettings().debugOverlay;
  let state: GameState = initialGameState();
  let host: HTMLElement | null = null;
  let box: HTMLElement | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const render = () => {
    if (!box || document.visibilityState !== 'visible') return;
    const s = getSnapshot();
    const day = state.days[localDayKey(new Date())] ?? { scrollPx: 0, skimPx: 0 };
    const todayPx = day.scrollPx + day.skimPx + s.pendingPx + s.pendingSkimPx;
    const skimLine = s.skimming
      ? '流し読み: はい（深度に数えない）'
      : s.cooldownRemainingSec > 0
        ? `流し読み: いいえ（クールダウン残り ${s.cooldownRemainingSec.toFixed(1)}秒）`
        : '流し読み: いいえ';
    box.className = s.skimming ? 'box skim' : 'box';
    box.textContent = [
      `平均速度(${CONFIG.SKIM_WINDOW_SEC}秒): ${s.speedPxPerSec.toFixed(0)} px/秒`,
      `窓内の合計: ${s.windowPx.toFixed(0)} / しきい値 ${s.thresholdPx.toFixed(0)} px`,
      skimLine,
      `今日の総スクロール: ${todayPx.toFixed(0)} px（実距離 ${pxToMeters(todayPx).toFixed(2)} m）`,
      `   うち流し読み: ${(day.skimPx + s.pendingSkimPx).toFixed(0)} px`,
      `深度: ${(state.depthM + 0).toFixed(1)} m（未送信 ${s.pendingPx.toFixed(0)} px）`,
    ].join('\n');
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
    timer = setInterval(render, CONFIG.DEBUG_REFRESH_MS);
    render();
  };

  const hide = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
    host?.remove();
    host = null;
    box = null;
  };

  const apply = () => (enabled ? show() : hide());

  void Promise.all([loadSettings(), loadState()])
    .then(([settings, loaded]) => {
      enabled = settings.debugOverlay;
      state = loaded;
      apply();
    })
    .catch(() => {});

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const st = changes[STATE_KEY]?.newValue as GameState | undefined;
    if (st) state = st;
    const se = changes[SETTINGS_KEY]?.newValue as { debugOverlay?: boolean } | undefined;
    if (se && typeof se.debugOverlay === 'boolean') {
      enabled = se.debugOverlay;
      apply();
    }
  });
}
