import type { ContentMessage } from '../messages';

const RETRY_DELAYS_MS = [300, 1000, 3000];

/**
 * service worker にメッセージを送る。service worker は止まっていることがあり、
 * 停止する瞬間に送ると「受け手がいない」で失敗するため、少し待って再送する。
 * 届いたら true。拡張機能が再読み込みされた等で送れなければ false（ページ側には何も投げない）。
 */
export async function sendToBackground(msg: ContentMessage): Promise<boolean> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await chrome.runtime.sendMessage(msg);
      return true;
    } catch (e) {
      if (!chrome.runtime?.id) return false; // extension context invalidated: 再送しても届かない
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) {
        console.debug('[scroll-game] message dropped after retries', msg.type, e);
        return false;
      }
      console.debug('[scroll-game] send failed, retrying', msg.type, attempt + 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return false;
}
