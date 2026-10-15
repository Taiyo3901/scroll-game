import { defineManifest } from '@crxjs/vite-plugin';
import { GAME_NAME } from './src/gameName.ts';

export default defineManifest({
  manifest_version: 3,
  name: GAME_NAME,
  version: '0.2.0',
  description: '下にスクロールして地面を掘り進み、読み終えて手を止めると鉱石が掘れるゲーム。',
  permissions: ['storage', 'alarms', 'idle'],
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
    default_title: `${GAME_NAME}: クリックで地上に戻る`,
  },
});
