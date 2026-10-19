import { CONFIG } from '../config';
import { BADGE_COLORS, badgeKind } from '../core/badge';
import { applyMine, applyScroll, checkAutoReturn, currentOil, returnToSurface, type Env } from '../core/game';
import { formatBadge } from '../core/format';
import type { GameState } from '../core/state';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import { isContentMessage } from '../messages';
import { RULES } from '../rules';
import { RUNTIME_KEY, loadState, saveState, type Runtime } from '../storage';

// ゲーム状態の正は chrome.storage.local。service worker はいつ止まってもよいように、
// メモリには何も持たず、更新のたびに「読む → 純粋関数で計算 → 書く」を行う。

const env = (): Env => ({ rules: RULES, catalog: CATALOG, rng: Math.random });
const TICK_ALARM = 'tick';

async function refreshBadge(state?: GameState): Promise<void> {
  const s = state ?? (await loadState());
  const oil = currentOil(s, Date.now(), RULES);
  const kind = badgeKind(s, oil, CONFIG.OIL_LOW_THRESHOLD);
  await chrome.action.setBadgeText({ text: formatBadge(s.depthM) });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[kind] });
}

// 同時に届いた更新が互いの書き込みを上書きしないよう、直列に処理する
let queue: Promise<void> = Promise.resolve();

function update(f: (s: GameState, now: number, day: string) => GameState): Promise<void> {
  queue = queue
    .then(async () => {
      const now = Date.now();
      const next = f(await loadState(), now, localDayKey(new Date(now)));
      await saveState(next);
      await refreshBadge(next);
    })
    .catch((e) => console.error('update failed', e));
  return queue;
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isContentMessage(message)) return false;
  if (message.type === 'scroll-batch') {
    void update((s, now, day) =>
      applyScroll(s, { px: message.px }, now, day, env()),
    );
  } else {
    void update((s, now, day) => applyMine(s, now, day, env()));
  }
  return false;
});

/** ツールバーのアイコンを押すと地上に戻る（Phase 3 でポップアップのボタンに置き換える） */
chrome.action.onClicked.addListener(() => {
  void update((s, now, day) => returnToSurface(s, 'manual', now, day, env()));
});

// 1分ごと: 自動帰還の判定、油の回復を反映、バッジ更新
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== TICK_ALARM) return;
  void update((s, now, day) => checkAutoReturn(s, now, day, env()));
});

async function ensureAlarm(): Promise<void> {
  if (!(await chrome.alarms.get(TICK_ALARM))) {
    await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  }
}

async function writeIdle(idleState: Runtime['idleState']): Promise<void> {
  await chrome.storage.local.set({ [RUNTIME_KEY]: { idleState } satisfies Runtime });
}

chrome.idle.setDetectionInterval(CONFIG.IDLE_DETECTION_SEC);
chrome.idle.onStateChanged.addListener((s) => void writeIdle(s));

function boot(): void {
  void ensureAlarm();
  void chrome.idle.queryState(CONFIG.IDLE_DETECTION_SEC).then(writeIdle);
  void update((s) => s); // 古い保存データを新しい形にそろえ、バッジを更新する
}
chrome.runtime.onInstalled.addListener(boot);
chrome.runtime.onStartup.addListener(boot);
