import { defineConfig } from 'vitest/config';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import manifest from './manifest.config.ts';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  // ポップアップ以外の拡張機能ページ（タブで開く）
  build: { rollupOptions: { input: { collection: 'pages/collection.html', friends: 'pages/friends.html', settings: 'pages/settings.html' } } },
  server: { port: 5173, strictPort: true, hmr: { port: 5173 } },
  test: { include: ['tests/**/*.test.ts'] },
});
