import { CONFIG } from '../config';
import { applyFind, applyScroll, type Env } from '../core/game';
import type { GameState } from '../core/state';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import { isContentMessage } from '../messages';
import { syncNow } from '../firebase/sync';
import { rulesFor } from '../rules';
import { loadSettings, loadState, saveState } from '../storage';

// ゲーム状態の正は chrome.storage.local。service worker はいつ止まってもよいように、
// メモリには何も持たず、更新のたびに「読む → 純粋関数で計算 → 書く」を行う。

const envFor = (demo: boolean): Env => ({ rules: rulesFor(demo), catalog: CATALOG, rng: Math.random });

// 同時に届いた更新が互いの書き込みを上書きしないよう、直列に処理する
let queue: Promise<void> = Promise.resolve();

/**
 * 状態を更新する。デモモードのときは、デモ用の状態とデモ用の規則（速い進み）で更新し、本番のデータには触れない。
 */
function update(f: (s: GameState, now: number, day: string, env: Env) => GameState): Promise<void> {
  queue = queue
    .then(async () => {
      const now = Date.now();
      const { demoMode } = await loadSettings();
      const next = f(await loadState(demoMode), now, localDayKey(new Date(now)), envFor(demoMode));
      await saveState(next, demoMode);
    })
    .catch((e) => console.error('update failed', e));
  return queue;
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isContentMessage(message)) return false;
  if (message.type === 'scroll-batch') {
    void update((s, _now, day, env) => applyScroll(s, { px: message.px }, day, env));
  } else {
    void update((s, now, day, env) => applyFind(s, message.genreId, now, day, env, message.container));
  }
  return false;
});

// 以前のバージョンが付けた、アイコンの深さの表示（バッジ）を消す。service worker が起動するたびに消すので、更新のあとも残らない
void chrome.action.setBadgeText({ text: '' });

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
  void update((s) => s); // 古い保存データを新しい形にそろえる
  void ensureSyncAlarm();
}
chrome.runtime.onInstalled.addListener(boot);
chrome.runtime.onStartup.addListener(boot);
