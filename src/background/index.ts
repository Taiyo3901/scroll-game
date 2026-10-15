import { CONFIG } from '../config';
import { applyScrollBatch } from '../core/progress';
import { formatBadge } from '../core/format';
import { localDayKey } from '../core/week';
import { isContentMessage } from '../messages';
import { loadState, saveState } from '../storage';

// ゲーム状態の正は chrome.storage.local。service worker はいつ止まってもよいように、
// メモリには何も持たず、受け取るたびに読み書きする（バッチ受信は数秒に1回）。

const BADGE_COLOR = '#3b7a57';

async function refreshBadge(): Promise<void> {
  const state = await loadState();
  await chrome.action.setBadgeText({ text: formatBadge(state.depthM) });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
}

// 同時に届いたバッチが互いの書き込みを上書きしないよう、直列に処理する
let queue: Promise<void> = Promise.resolve();

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isContentMessage(message)) return false;
  queue = queue
    .then(async () => {
      const state = await loadState();
      const next = applyScrollBatch(
        state,
        { px: message.px, skimPx: message.skimPx },
        localDayKey(new Date()),
        CONFIG.DEPTH_MULTIPLIER,
      );
      await saveState(next);
      await refreshBadge();
    })
    .catch((e) => console.error('scroll-batch failed', e));
  return false;
});

chrome.runtime.onInstalled.addListener(() => void refreshBadge());
chrome.runtime.onStartup.addListener(() => void refreshBadge());
