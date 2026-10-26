import { defineManifest } from '@crxjs/vite-plugin';
import { loadEnv } from 'vite';
import { GAME_NAME } from './src/gameName.ts';

/**
 * 拡張機能の公開鍵。これを manifest に入れると、どこで読み込んでも拡張機能のIDが同じになる
 * （ID: bbobbhlfhcagdknjegkibkekcbnaiagm）。Google の OAuth クライアントIDは、このIDに結び付けて作る。
 * 公開鍵なので、リポジトリに含めてよい。
 */
export const EXTENSION_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3EDLcIPw1KZQZnZh9WtyDg94H+cGBm+kSyvot3vFFmZeQ+GmiVUxmVAhAiPzWM8uiuZC1VMMsVATIlW/ysAf8w7qvpXQdvYs5DxYDRIwps035zZ5q7sUEdbwrj5PJBP0i35oCYaHlnjqoadmc2iKNpPWU+VphEQWR6Nn1Bn2IOD38WhIL8M7AfQr5ptObQOj3J8KnVpr0ZOt3EXlTaqcHS9c1pN2mDBCb8gt8vrhirycVkRtCT6CPLgKZDBmje7niazv8FKgOY1XkSsgYRrezGRzwUd+Gkh445e8C+5N5XOaMdC6VlPVrc3iDt7MYdatzO/97LCnMG2NpsoLmlv3xQIDAQAB';

export default defineManifest(({ mode }) => {
  // .env の VITE_OAUTH_CLIENT_ID。ないときは oauth2 を付けない（ログインだけが使えず、ゲームは遊べる）
  const oauthClientId = loadEnv(mode, process.cwd(), 'VITE_').VITE_OAUTH_CLIENT_ID ?? '';

  return {
    manifest_version: 3,
    name: GAME_NAME,
    version: '0.6.0',
    key: EXTENSION_KEY,
    description:
      'スクロールで迷宮を降り、立ち止まって入れ物を物色すると、見ているサイトの種類にまつわる品が見つかる。いつものブラウジングにプラスαの探索ゲーム。',
    icons: {
      16: 'src/icons/icon16.png',
      32: 'src/icons/icon32.png',
      48: 'src/icons/icon48.png',
      128: 'src/icons/icon128.png',
    },
    // storage: ゲームのデータの保存 / alarms: フレンド機能の同期（15分ごと） / identity: Google ログイン
    permissions: ['storage', 'alarms', 'identity'],
    ...(oauthClientId
      ? { oauth2: { client_id: oauthClientId, scopes: ['openid', 'email', 'profile'] } }
      : {}),
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
      default_popup: 'pages/popup.html',
      default_icon: {
        16: 'src/icons/icon16.png',
        32: 'src/icons/icon32.png',
      },
    },
  };
});
