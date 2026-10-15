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

## 遊び方（Phase 2 時点）

- 下にスクロールすると探検が始まり、深度が増えます（地上で油が30以上あるとき）。
- 読み終えて手を止めると、約3秒後に右端のゲージがたまり始め、8秒で鉱石を掘り当てます。
- 流し読み（10秒で1.5画面分より多くスクロール）では掘れません。止めて約15秒たつと再び掘れます。
- 掘った場所（同じ要素・同じ画面位置）では、そのページを開いている間は2回掘れません。
- **ツールバーの拡張機能アイコンをクリックすると地上に戻り**、バッグの鉱石が図鑑に登録されます（Phase 3 でポップアップのボタンに置き換わります）。
- 5分スクロールしないと自動で地上に戻ります。油が0になると強制帰還で、バッグの鉱石の半分を失います。
- 図鑑の中身は、いまは service worker のコンソールで確認します。

```js
(await chrome.storage.local.get('state')).state.collection
```

## デバッグ表示のオン・オフ（Phase 3 のポップアップができるまで）

拡張機能カードの「service worker」を開いて DevTools のコンソールに入力する。

```js
chrome.storage.local.set({ settings: { debugOverlay: false } })  // オフ
chrome.storage.local.set({ settings: { debugOverlay: true } })   // オン
chrome.storage.local.set({ settings: { effects: false } })       // 右端の演出をオフ
```

## 保存データの確認・リセット

service worker のコンソールで:

```js
(await chrome.storage.local.get('state')).state   // 確認
chrome.storage.local.clear()                      // 全消去
```
