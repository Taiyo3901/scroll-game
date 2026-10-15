# 地底探検スクロールゲーム（仮称）

仕様は `docs/SPEC.md`。

## 開発

```
npm install
npm run build      # dist/ に拡張機能を出力
npm test           # 純粋関数の単体テスト（Vitest）
npm run dev        # 開発用（変更が自動で反映される。dist/ を読み込む）
```

## Chromeへの読み込み

1. `chrome://extensions` を開き、右上の「デベロッパーモード」をオンにする
2. 「パッケージ化されていない拡張機能を読み込む」で、`dist` フォルダを選ぶ
3. ビルドし直したら、拡張機能カードの更新ボタンを押し、開いているページを再読み込みする

## デバッグ表示のオン・オフ（Phase 3 のポップアップができるまで）

拡張機能カードの「service worker」を開いて DevTools のコンソールに入力する。

```js
chrome.storage.local.set({ settings: { debugOverlay: false } })  // オフ
chrome.storage.local.set({ settings: { debugOverlay: true } })   // オン
```

## 保存データの確認・リセット

service worker のコンソールで:

```js
(await chrome.storage.local.get('state')).state   // 確認
chrome.storage.local.clear()                      // 全消去
```
