/** content script → service worker: スクロール距離のまとめ送り */
export interface ScrollBatchMessage {
  type: 'scroll-batch';
  /** 深度に数えるスクロール距離(px) */
  px: number;
}

/** content script → service worker: 採掘ゲージが満タンになった。抽選は service worker が行う */
export interface MineCompleteMessage {
  type: 'mine-complete';
}

export type ContentMessage = ScrollBatchMessage | MineCompleteMessage;

export function isContentMessage(m: unknown): m is ContentMessage {
  if (typeof m !== 'object' || m === null) return false;
  const o = m as Record<string, unknown>;
  if (o.type === 'mine-complete') return true;
  return o.type === 'scroll-batch' && typeof o.px === 'number';
}

/** ポップアップ → service worker: 地上に戻る */
export interface ReturnMessage {
  type: 'return-to-surface';
}

export function isReturnMessage(m: unknown): m is ReturnMessage {
  return typeof m === 'object' && m !== null && (m as Record<string, unknown>).type === 'return-to-surface';
}
