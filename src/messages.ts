/** content script → service worker: スクロール距離のまとめ送り */
export interface ScrollBatchMessage {
  type: 'scroll-batch';
  /** 深度に数えるスクロール距離(px) */
  px: number;
}

/**
 * content script → service worker: ゲージが満タンになった。抽選は service worker が行う。
 * genreId は閲覧中のサイトの種類（部屋のID）だけ。ホスト名・URL・タイトルは含めない。
 */
export interface FindCompleteMessage {
  type: 'find-complete';
  genreId: string;
}

export type ContentMessage = ScrollBatchMessage | FindCompleteMessage;

export function isContentMessage(m: unknown): m is ContentMessage {
  if (typeof m !== 'object' || m === null) return false;
  const o = m as Record<string, unknown>;
  if (o.type === 'find-complete') return typeof o.genreId === 'string' && o.genreId.length <= 32;
  return o.type === 'scroll-batch' && typeof o.px === 'number';
}
