# <img src="images/icons/chip.png" width="28" height="28" align="absmiddle" alt=""> 開発メモ

[← README に戻る](../README.md)

## セットアップ

```bash
npm install
npm run build      # 型チェックのあと、dist/ に拡張機能を出力
npm test           # 単体テスト（Vitest）
npm run dev        # 開発用（変更が自動で反映される。dist/ を読み込む）
```

ビルドのあとは、`chrome://extensions` で拡張機能の更新ボタンを押し、開いているページを再読み込みします。`dist/` は、ダウンロードしてすぐ使えるように、コミットしています（ソースを変えたら、ビルドして、一緒にコミットしてください）。

## 構成

```text
.
├── src/
│   ├── core/         判定や計算の純粋な関数（すべてテストあり）
│   ├── content/      ページに挿入されるコード（スクロールの計測・物色・右端の帯）
│   ├── background/   service worker（状態の更新、15 分ごとの同期）
│   ├── popup/ collection/ friends/ settings/   画面の中身（React）
│   ├── firebase/     ログイン・フレンド・同期
│   ├── data/         階層・部屋・発見品・ドット絵（JSON）
│   └── config.ts     調整できる数値
├── pages/            画面の入り口（popup / collection / friends / settings の HTML）
├── firestore/        セキュリティルール（自動生成）
├── tools/            生成ツール（Python / Node）
├── tests/            単体テスト（Vitest）
├── docs/             ドキュメントと画像
└── dist/             ビルド済みの拡張機能（そのまま読み込める）
```

| 場所 | 内容 |
|---|---|
| `src/core/` | 深さ、抽選、入れ物、職業、ランキング、サイトの種類の判定など |
| `src/data/` | 階層（`areas.json`）、部屋とサイトの辞書（`genres.json`）、発見品（`items.json`）、ドット絵（`sprites.json`、`actors.json`） |

## 調整できる値

`src/config.ts` にまとめています。

| 値 | 意味 | 現在 |
|---|---|---|
| `DEPTH_MULTIPLIER` | 実際の距離(m)に掛ける倍率 | 100 |
| `FIND_START_DELAY_SEC` / `FIND_DURATION_SEC` | 止まってから入れ物が現れるまで / 物色の長さ | 1秒 / 4秒 |
| `MAX_FINDS_PER_DAY` | 1日の発見数の上限 | 300 |
| `RARITY_POINTS` | ★ごとのポイント | 1 / 3 / 10 |
| `CONTAINER_WEIGHTS` / `CONTAINER_RARITY_MULT` / `MIMIC_IN_CHEST` | 入れ物の出やすさ / レア度の倍率 / ミミックの確率 | 45・40・15 / 表のとおり / 12% |
| `SYNC_INTERVAL_MIN` | 同期の間隔 | 15分 |
| `OVERLAY_WIDTH_PX` | 帯の標準の幅（設定で、56〜104px に変えられる） | 56px |

背景が移り変わる間隔は、`src/core/band.ts` の `BAND_STEP_M`（100m）です。

## 生成ツール

```bash
python tools/make-sprites.py        # 発見品のアイコン → src/data/sprites.json
python tools/make-actors.py         # 入れ物と職業別の探索者 → src/data/actors.json
python tools/make-hero-sheet.py     # 全職業の見た目の一覧 → docs/images/（Pillow が必要）
python tools/make-readme-icons.py   # README のドット絵アイコン → docs/images/icons/（Pillow が必要）
python tools/make-icons.py          # 拡張機能のアイコン → src/icons/（Pillow が必要）
node   tools/make-rules.mjs         # セキュリティルール → firestore/firestore.rules
```

- 発見品や部屋を増やしたら、`firestore/firestore.rules` を作り直して、Firebase にも貼り直します（`tests/rules.test.ts` が、最新かどうかを確かめます）。
- ドット絵の共通の部品と、色の表は `tools/art.py` です。

## 保存データ

拡張機能カードの「service worker」を開いて、DevTools のコンソールで確認できます。

```js
(await chrome.storage.local.get('state')).state   // ゲームのデータ
chrome.storage.local.clear()                      // 全消去
```

キーは、`state`（ゲームの状態）、`profile`（飾り棚）、`settings`、`account`（ログイン中のアカウントの控え）、`sync`（最後に送った内容）です。
