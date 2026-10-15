/** content script → service worker */
export interface ScrollBatchMessage {
  type: 'scroll-batch';
  /** 深度に数えるスクロール距離(px) */
  px: number;
  /** 流し読みと判定された距離(px) */
  skimPx: number;
}

export type ContentMessage = ScrollBatchMessage;

export function isContentMessage(m: unknown): m is ContentMessage {
  if (typeof m !== 'object' || m === null) return false;
  const o = m as Record<string, unknown>;
  return o.type === 'scroll-batch' && typeof o.px === 'number' && typeof o.skimPx === 'number';
}
