import { mountDebug } from './debug';
import { startTracker } from './tracker';

// トップフレームでのみ動かす。何が起きてもページ側にエラーを投げない。
try {
  if (window.top === window) {
    const tracker = startTracker();
    mountDebug(tracker.snapshot);
  }
} catch (e) {
  console.debug('[scroll-game] content script disabled on this page', e);
}
