import { defineManifest } from '@crxjs/vite-plugin';
import { GAME_NAME } from './src/gameName.ts';

export default defineManifest({
  manifest_version: 3,
  name: GAME_NAME,
  version: '0.4.0',
  description: '下にスクロールして迷宮を降り、手を止めると、見ているサイトにまつわる品が見つかるゲーム。',
  permissions: ['storage'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  action: {
    default_title: GAME_NAME,
    default_popup: 'popup.html',
  },
});
