/** content script → service worker: スクロール距離のまとめ送り */
export interface ScrollBatchMessage {
  type: 'scroll-batch';
  /** 深度に数えるスクロール距離(px) */
  px: number;
  /** 流し読みと判定された距離(px) */
  skimPx: number;
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
  return o.type === 'scroll-batch' && typeof o.px === 'number' && typeof o.skimPx === 'number';
}
