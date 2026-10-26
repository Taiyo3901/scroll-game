/**
 * Firestore のセキュリティルール（firestore.rules）を作る。
 * 発見品・部屋のID、1日の発見数の上限、ポイント、フレンドコードの文字、フレンドの上限は、
 * アプリ側と食い違わないよう、データと設定ファイルから読み取って埋め込む。
 *
 *   node tools/make-rules.mjs            firestore.rules を作り直す
 *   node tools/make-rules.mjs --stdout   標準出力に出す（テスト用）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const items = JSON.parse(read('src/data/items.json'));
const genres = JSON.parse(read('src/data/genres.json'));
const config = read('src/config.ts');
const friends = read('src/core/friends.ts');
const friendData = read('src/core/friendData.ts');

const pick = (src, re, what) => {
  const m = src.match(re);
  if (!m) throw new Error(`${what} を読み取れません`);
  return m[1];
};

const MAX_FINDS_PER_DAY = Number(pick(config, /MAX_FINDS_PER_DAY:\s*(\d+)/, 'MAX_FINDS_PER_DAY'));
const rarity = pick(config, /RARITY_POINTS:\s*\{([^}]*)\}/, 'RARITY_POINTS');
const MAX_POINTS_PER_FIND = Math.max(...[...rarity.matchAll(/:\s*(\d+)/g)].map((m) => Number(m[1])));
const ALPHABET = pick(friends, /FRIEND_CODE_ALPHABET\s*=\s*'([^']+)'/, 'FRIEND_CODE_ALPHABET');
const CODE_LENGTH = Number(pick(friends, /FRIEND_CODE_LENGTH\s*=\s*(\d+)/, 'FRIEND_CODE_LENGTH'));
const PHOTO_URL_MAX = Number(pick(friendData, /PHOTO_URL_MAX\s*=\s*(\d+)/, 'PHOTO_URL_MAX'));
const MAX_FRIENDS = Number(pick(friends, /MAX_FRIENDS\s*=\s*(\d+)/, 'MAX_FRIENDS'));

const MAX_FINDS_PER_WEEK = MAX_FINDS_PER_DAY * 7;
const MAX_POINTS_PER_WEEK = MAX_FINDS_PER_WEEK * MAX_POINTS_PER_FIND;
const MAX_ITEM_COUNT = 9999;
const MAX_GENRE_FINDS = 99999;

const list = (xs) => `[${xs.map((x) => `'${x}'`).join(', ')}]`;
const intIn = (expr, max) => `${expr} is int && ${expr} >= 0 && ${expr} <= ${max}`;
const perKey = (field, ids, max) =>
  ids.map((id) => `      (!('${id}' in ${field}) || (${intIn(`${field}['${id}']`, max)}))`).join(' &&\n');

const itemIds = items.map((i) => i.id);
const genreIds = genres.map((g) => g.id);
const codeRegex = `^[${ALPHABET}]{${CODE_LENGTH}}$`;

export function buildRules() {
  return `// 自動生成: tools/make-rules.mjs（直接編集しない。データや設定を変えたら作り直す）
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }
    function userPath(uid) { return /databases/$(database)/documents/users/$(uid); }
    function requestPath(id) { return /databases/$(database)/documents/friendRequests/$(id); }

    // ---- 値の検査（上限は、1日の発見数の上限 ${MAX_FINDS_PER_DAY} から計算） ----
    function validNickname(n) { return n is string && n.size() >= 1 && n.size() <= 64; }

    function validWeekly(w) {
      return w is map &&
        w.keys().hasOnly(['weekId', 'points', 'finds']) &&
        w.keys().hasAll(['weekId', 'points', 'finds']) &&
        w.weekId is string && w.weekId.matches('^[0-9]{4}-W[0-9]{2}$') &&
        ${intIn('w.points', MAX_POINTS_PER_WEEK)} &&
        ${intIn('w.finds', MAX_FINDS_PER_WEEK)};
    }

    // 図鑑: 発見品ごとの所持数
    function validCollection(c) {
      return c is map && c.size() <= ${itemIds.length} &&
        c.keys().hasOnly(${list(itemIds)}) &&
${perKey('c', itemIds, MAX_ITEM_COUNT)};
    }

    // 部屋ごとの発見数
    function validGenreFinds(g) {
      return g is map && g.size() <= ${genreIds.length} &&
        g.keys().hasOnly(${list(genreIds)}) &&
${perKey('g', genreIds, MAX_GENRE_FINDS)};
    }

    // Google アカウントのアイコン: https の URL だけ（長さの上限つき）
    function validPhotoUrl(u) { return u is string && u.size() <= ${PHOTO_URL_MAX} && u.matches('^https://[^ ]+$'); }

    function validUser(d) {
      return d.keys().hasOnly(['nickname', 'friendCode', 'friendUids', 'weekly', 'shared', 'collection', 'showcase', 'genreFinds', 'photoUrl', 'updatedAt']) &&
        d.keys().hasAll(['nickname', 'friendCode', 'friendUids', 'weekly', 'shared', 'updatedAt']) &&
        validNickname(d.nickname) &&
        d.friendCode is string && d.friendCode.matches('${codeRegex}') &&
        d.friendUids is list && d.friendUids.size() <= ${MAX_FRIENDS} &&
        validWeekly(d.weekly) &&
        d.shared is bool &&
        (!('collection' in d) || validCollection(d.collection)) &&
        (!('showcase' in d) || (d.showcase is list && d.showcase.size() <= 3)) &&
        (!('genreFinds' in d) || validGenreFinds(d.genreFinds)) &&
        (!('photoUrl' in d) || validPhotoUrl(d.photoUrl)) &&
        d.updatedAt is timestamp;
    }

    // 2人のあいだに、承認済みの申請がある（どちらの向きでも）
    function acceptedBetween(a, b) {
      return (exists(requestPath(a + '_' + b)) && get(requestPath(a + '_' + b)).data.status == 'accepted') ||
             (exists(requestPath(b + '_' + a)) && get(requestPath(b + '_' + a)).data.status == 'accepted');
    }

    // friendUids の変更: そのまま / 減らす / 承認済みの相手を1人だけ足す
    function friendUidsChangeOk(uid) {
      let before = resource.data.friendUids;
      let after = request.resource.data.friendUids;
      return after == before ||
        before.hasAll(after) ||
        (after.size() == before.size() + 1 && after.hasAll(before) && acceptedBetween(uid, after.removeAll(before)[0]));
    }

    // ---- 公開プロフィール ----
    match /users/{uid} {
      // 本人と、お互いに friendUids に入っている人だけが読める。一覧は取れない。
      allow get: if signedIn() && (
        request.auth.uid == uid ||
        (request.auth.uid in resource.data.friendUids &&
         uid in get(userPath(request.auth.uid)).data.friendUids)
      );
      allow list: if false;

      // 作るとき: 自分の分だけ。フレンドコードは、同時に作る friendCodes と対応していること。
      allow create: if isOwner(uid) &&
        validUser(request.resource.data) &&
        request.resource.data.friendUids.size() == 0 &&
        getAfter(/databases/$(database)/documents/friendCodes/$(request.resource.data.friendCode)).data.uid == uid;

      // 更新: 自分の分だけ。フレンドコードは変えられない。
      allow update: if isOwner(uid) &&
        validUser(request.resource.data) &&
        request.resource.data.friendCode == resource.data.friendCode &&
        friendUidsChangeOk(uid);

      allow delete: if isOwner(uid);
    }

    // ---- フレンドコード → ユーザー ----
    match /friendCodes/{code} {
      // コードを指定して1件ずつ読める。一覧は取れない。
      allow get: if signedIn();
      allow list: if false;
      // プロフィールを最初に作るときだけ、自分のコードを1つ作れる（増やせない）
      allow create: if signedIn() &&
        code.matches('${codeRegex}') &&
        request.resource.data.keys().hasOnly(['uid']) &&
        request.resource.data.uid == request.auth.uid &&
        !exists(userPath(request.auth.uid));
      allow update: if false;
      allow delete: if signedIn() && resource.data.uid == request.auth.uid;
    }

    // ---- フレンド申請（IDは「送る人_受ける人」で、同じ向きの申請は1つだけ） ----
    match /friendRequests/{id} {
      allow get, list: if signedIn() &&
        (resource.data.fromUid == request.auth.uid || resource.data.toUid == request.auth.uid);

      allow create: if signedIn() &&
        request.resource.data.keys().hasOnly(['fromUid', 'toUid', 'status', 'fromNickname', 'createdAt']) &&
        request.resource.data.keys().hasAll(['fromUid', 'toUid', 'status', 'fromNickname', 'createdAt']) &&
        request.resource.data.fromUid == request.auth.uid &&
        request.resource.data.toUid is string &&
        request.resource.data.toUid.size() <= 128 &&
        request.resource.data.toUid != request.auth.uid &&
        id == request.auth.uid + '_' + request.resource.data.toUid &&
        request.resource.data.status == 'pending' &&
        validNickname(request.resource.data.fromNickname) &&
        request.resource.data.createdAt == request.time &&
        exists(userPath(request.auth.uid));

      // 返事ができるのは、受け取った人だけ。変えられるのは status だけ。
      allow update: if signedIn() &&
        resource.data.toUid == request.auth.uid &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']) &&
        request.resource.data.status in ['accepted', 'declined'];

      // 取り消し・片づけは、当事者のどちらでもできる
      allow delete: if signedIn() &&
        (resource.data.fromUid == request.auth.uid || resource.data.toUid == request.auth.uid);
    }
  }
}
`;
}

if (process.argv.includes('--stdout')) {
  process.stdout.write(buildRules());
} else {
  writeFileSync(join(root, 'firestore.rules'), buildRules(), 'utf8');
  console.log('firestore.rules を作りました（発見品', itemIds.length, '・部屋', genreIds.length, '）');
}
