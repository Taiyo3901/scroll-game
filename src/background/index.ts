import { CONFIG } from '../config';
import { areaAt } from '../core/catalog';
import { applyFind, applyScroll, type Env } from '../core/game';
import { formatBadge } from '../core/format';
import type { GameState } from '../core/state';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import { isContentMessage } from '../messages';
import { syncNow } from '../firebase/sync';
import { RULES } from '../rules';
import { loadState, saveState } from '../storage';

// ゲーム状態の正は chrome.storage.local。service worker はいつ止まってもよいように、
// メモリには何も持たず、更新のたびに「読む → 純粋関数で計算 → 書く」を行う。

const env = (): Env => ({ rules: RULES, catalog: CATALOG, rng: Math.random });

async function refreshBadge(state: GameState): Promise<void> {
  await chrome.action.setBadgeText({ text: formatBadge(state.depthM) });
  // 背景色は階層の色（文字は白）
  await chrome.action.setBadgeBackgroundColor({ color: areaAt(CATALOG.areas, state.depthM).color });
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
    void update((s, _now, day) => applyScroll(s, { px: message.px }, day, env()));
  } else {
    void update((s, now, day) => applyFind(s, message.genreId, now, day, env(), message.container));
  }
  return false;
});

// 初めてインストールしたとき、何を記録するかの説明画面を開く
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') void chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
});

// フレンド機能: ログインしているときだけ、変化があれば15分ごとに集計結果を送る（未ログイン・未設定なら何もしない）
const SYNC_ALARM = 'sync';

async function ensureSyncAlarm(): Promise<void> {
  if (!(await chrome.alarms.get(SYNC_ALARM))) {
    await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: CONFIG.SYNC_INTERVAL_MIN });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SYNC_ALARM) return;
  syncNow().catch((e) => console.debug('[scroll-game] sync failed', e));
});

function boot(): void {
  void update((s) => s); // 古い保存データを新しい形にそろえ、バッジを更新する
  void ensureSyncAlarm();
}
chrome.runtime.onInstalled.addListener(boot);
chrome.runtime.onStartup.addListener(boot);
