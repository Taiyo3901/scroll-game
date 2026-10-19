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

## 遊び方（Phase 3 時点）

デバッグ表示は既定でオフです（下の「デバッグ表示のオン・オフ」でオンにできます）。

- 下にスクロールすると探検が始まり、深度が増えます（地上で油が30以上あるとき）。
- 読み終えて手を止めると、1秒後に右端のゲージがたまり始め、約4秒で鉱石を掘り当てます。
- スクロールが止まっていれば、ほかの条件なしで掘れます（探検中・タブが表示中・1日の上限内のみ）。止まったままだと、約4秒ごとに続けて掘ります。
- ツールバーの拡張機能アイコンを押すとポップアップが開きます。**「地上に戻る」ボタン**で地上に戻り、バッグの鉱石が図鑑に登録されます。
- ポップアップの「図鑑を開く」から、図鑑・標本棚（3つまで）・記録（日ごと／週ごと、グラフ、CSV書き出し）を見られます。
- 初めてインストールしたときは、何を記録するかの説明画面が開きます。
- 5分スクロールしないと自動で地上に戻ります。油が0になると強制帰還で、バッグの鉱石の半分を失います。

## デバッグ表示のオン・オフ

拡張機能カードの「service worker」を開いて DevTools のコンソールに入力する。

```js
chrome.storage.local.set({ settings: { debugOverlay: false } })  // オフ
chrome.storage.local.set({ settings: { debugOverlay: true } })   // オン
chrome.storage.local.set({ settings: { effects: false } })       // 右端の演出をオフ
chrome.storage.local.set({ settings: { reserveSpace: false } })  // ページの右に余白を取らず、帯を重ねる
```

## 保存データの確認・リセット

service worker のコンソールで:

```js
(await chrome.storage.local.get('state')).state   // 確認
chrome.storage.local.clear()                      // 全消去
```
