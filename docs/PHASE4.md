# Phase 4：ログインとフレンド（設計メモ）

## ログイン

- `chrome.identity.getAuthToken`（Chrome 105 以上）で Google のアクセストークンを取り、`GoogleAuthProvider.credential(null, token)` を `signInWithCredential` に渡す。
- Firebase Auth は `firebase/auth/web-extension` から読み込む（Web SDK v10.8 以上。外部コードは読み込まない）。ログイン状態は IndexedDB に残り、service worker と拡張機能のページで共有される。
- 拡張機能のIDは、manifest の `key`（公開鍵）で固定する。OAuth クライアントIDは「Chrome 拡張機能」の種類で、このIDに結び付けて作る。

## Firestore

| パス | 内容 | 誰が読める / 書ける |
|---|---|---|
| `users/{uid}` | `nickname`、`friendCode`、`friendUids`、`weekly`（`weekId`、`points`、`finds`）、`shared`、（公開時のみ）`collection`・`showcase`・`genreFinds`、`updatedAt` | 本人と、**お互いの `friendUids` に入っている人**だけが読める。一覧は取れない。書けるのは本人だけ |
| `friendCodes/{code}` | `{ uid }` | ログイン中なら1件ずつ読める（一覧は不可）。最初のプロフィール作成と同時にだけ、自分の分を1つ作れる |
| `friendRequests/{fromUid}_{toUid}` | `fromUid`、`toUid`、`status`、`fromNickname`、`createdAt` | 当事者だけが読める。作れるのは送る人。返事（`status` の変更）ができるのは受ける人。削除は当事者のどちらでも |

### 承認の流れ（両側の承認）

1. 送る人が相手のコードで `friendCodes` を引き、`friendRequests/{自分}_{相手}` を `pending` で作る。
2. 受ける人が `accepted` にして、**自分の** `friendUids` に相手を足す（ルール: 承認済みの申請がある相手を、1人ずつだけ足せる）。
3. 送る人は、次に画面を開いたとき（または同期のとき）、承認済みの申請を見つけて、**自分の** `friendUids` に相手を足す。
4. 読めるのは、お互いが相手を `friendUids` に持っているときだけ。片方だけでは読めない。
5. 解除: 自分の `friendUids` から外し、2人の申請を消す。相手側は、読めなくなり、承認済みの申請も残っていないので、次に画面を開いたときに自分の一覧から外す。

### 値の検査

`firestore.rules` は `tools/make-rules.mjs` が、データ（発見品・部屋のID）と設定（1日の発見数の上限など）から作る。週のポイントと発見数の上限は、1日の上限（300）から計算する（ポイント 21000 / 発見 2100）。発見品ごとの所持数は、IDごとに 0〜9999 を検査する。

## 送る内容（プライバシー）

- 常に送る: ニックネーム、フレンドコード、フレンドの一覧、今週のポイントと発見数。
- 公開設定を「見せる」にしたときだけ送る: 図鑑（発見品ごとの所持数）、飾り棚、部屋ごとの発見数（職業の元）。「見せない部屋」を選ぶと、その部屋の発見品と発見数は送らない。
- 送らない: ホスト名、URL、ページのタイトルや本文。
- 同期のタイミング: 変化があるときだけ、15分ごと（`chrome.alarms`）と、フレンド画面から「今すぐ送る」、公開設定を変えたとき。

## 未検証・今後

- Firestore のルールは、Firebase Local Emulator（Java が必要）でのテストを Phase 6 で行う。それまでは、ルールの文面を確認するテスト（`tests/rules.test.ts`）と、手元の Firebase での動作確認が頼り。
- ランキングと、フレンドの詳細は Phase 5（下記）。

# Phase 5：ランキング

- ページは `friends.html`（ポップアップの「ランキング」から）。タブは「ランキング」と「フレンド・アカウント」。
- 順位の指標は、今週のポイントの合計だけ（`src/core/ranking.ts`）。同点は同順位（1位, 1位, 3位）で、並びは発見数、自分、名前の順。深度やスクロール距離では順位を付けない。
- 自分の行は、この端末の最新の値（送信を待たない）。フレンドの行は、Firestore の値。フレンドの最終報告が今週でなければ、今週は 0 点として「今週はまだ」と出す。
- フレンドを選ぶと、公開されている範囲の詳細（今週の記録、職業、よく見つけた部屋、図鑑の種類数、飾り棚）を見られる。公開していない人は「非公開」。上限を超える不自然な値には ⚠ を付ける。
- 図鑑比べは、作らない（方針）。
