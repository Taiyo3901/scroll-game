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

## 遊び方（ダンジョン探索版）

操作や管理は要りません。いつもどおりページを読むだけです。

- 下にスクロールすると、迷宮を降ります（深度が増え、深さで「階層」が変わります）。
- スクロールを止めて1秒たつと右端のゲージがたまり始め、約4秒で、いま見ているサイトにまつわる品が見つかります。
- 見つけた品は、そのまま図鑑に入ります（★1=1点、★2=3点、★3=10点）。
- サイトの種類（劇場・酒場・書庫・道具屋・工房・闘技場・音楽堂・宿場町・ギルド・未踏の地）で、見つかる品が変わります。種類はホスト名を端末の中で判定するだけで、ホスト名・URLは保存も送信もしません。
- 各階層に1つ、まれに見つかる「階層の秘宝」があります。
- ポップアップからは図鑑を開けます。図鑑には、職業診断（見つけた品の部屋の割合）、飾り棚（3つまで）、記録（日ごと・週ごと、グラフ、CSV書き出し）があります。
- 初めてインストールしたときは、何を記録するかの説明画面が開きます。
- 企画の詳細は `docs/CONCEPT-DUNGEON.md` を参照。

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
