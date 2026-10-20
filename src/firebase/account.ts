import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth/web-extension';
import { CONFIG } from '../config';
import {
  MAX_FRIENDS,
  checkNickname,
  generateFriendCode,
  normalizeFriendCode,
  planFriendReconcile,
  requestId,
  splitRequests,
  type FriendRequest,
  type RequestStatus,
  type RequestsView,
} from '../core/friends';
import { parseFriendDoc, type FriendData } from '../core/friendData';
import { buildPublicFields, limitsFor } from '../core/publicProfile';
import { CATALOG } from '../data';
import { loadProfile, loadSettings, loadState, saveAccount, type AccountCache } from '../storage';
import { db } from './app';
import { currentUser, signOutAll } from './auth';

/** 画面に出す、分かりやすい失敗の種類。 */
export type FriendErrorCode =
  | 'signed-out'
  | 'invalid-code'
  | 'not-found'
  | 'self'
  | 'already-friend'
  | 'already-sent'
  | 'too-many'
  | 'invalid-nickname'
  | 'code-collision';

export class FriendError extends Error {
  constructor(
    public readonly code: FriendErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FriendError';
  }
}

export const LIMITS = limitsFor(CONFIG.MAX_FINDS_PER_DAY, Math.max(...Object.values(CONFIG.RARITY_POINTS)));

const randomInt = (n: number): number => {
  // 偏りが出ないよう、32文字(2^5)に合わせて上位ビットを捨てる拒否サンプリング
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf);
  while ((buf[0] as number) >= limit);
  return (buf[0] as number) % n;
};

async function requireUid(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new FriendError('signed-out', 'ログインしていません。');
  return user.uid;
}

export interface MyProfile {
  uid: string;
  nickname: string;
  friendCode: string;
  friendUids: string[];
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** 自分の公開プロフィール。まだ作っていなければ null。ローカルの控えも更新する。 */
export async function getMyProfile(): Promise<MyProfile | null> {
  const uid = await requireUid();
  const snap = await getDoc(doc(db(), 'users', uid));
  if (!snap.exists()) {
    await saveAccount(null);
    return null;
  }
  const d = snap.data();
  const me: MyProfile = {
    uid,
    nickname: String(d.nickname ?? ''),
    friendCode: String(d.friendCode ?? ''),
    friendUids: strings(d.friendUids),
  };
  const cache: AccountCache = { uid, nickname: me.nickname, friendCode: me.friendCode };
  await saveAccount(cache);
  return me;
}

/** 初回ログイン時のプロフィール作成。ニックネームを決め、重ならないフレンドコードを発行する。 */
export async function createMyProfile(nicknameInput: string): Promise<MyProfile> {
  const uid = await requireUid();
  const check = checkNickname(nicknameInput);
  if (!check.ok) throw new FriendError('invalid-nickname', check.reason);

  const [state, profile, settings] = await Promise.all([loadState(), loadProfile(), loadSettings()]);
  const fields = buildPublicFields({ state, profile, share: settings.share, catalog: CATALOG, now: new Date(), limits: LIMITS });

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateFriendCode(randomInt);
    try {
      await runTransaction(db(), async (tx) => {
        const codeRef = doc(db(), 'friendCodes', code);
        if ((await tx.get(codeRef)).exists()) throw new FriendError('code-collision', 'コードが重なりました。');
        tx.set(codeRef, { uid });
        tx.set(doc(db(), 'users', uid), {
          nickname: check.nickname,
          friendCode: code,
          friendUids: [],
          weekly: fields.weekly,
          shared: fields.shared,
          ...(fields.collection ? { collection: fields.collection } : {}),
          ...(fields.showcase ? { showcase: fields.showcase } : {}),
          ...(fields.genreFinds ? { genreFinds: fields.genreFinds } : {}),
          updatedAt: serverTimestamp(),
        });
      });
      await saveAccount({ uid, nickname: check.nickname, friendCode: code });
      return { uid, nickname: check.nickname, friendCode: code, friendUids: [] };
    } catch (e) {
      if (e instanceof FriendError && e.code === 'code-collision') continue;
      throw e;
    }
  }
  throw new FriendError('code-collision', 'フレンドコードを発行できませんでした。もう一度試してください。');
}

export async function changeNickname(nicknameInput: string): Promise<void> {
  const uid = await requireUid();
  const check = checkNickname(nicknameInput);
  if (!check.ok) throw new FriendError('invalid-nickname', check.reason);
  await updateDoc(doc(db(), 'users', uid), { nickname: check.nickname, updatedAt: serverTimestamp() });
  await getMyProfile();
}

const toRequest = (id: string, d: Record<string, unknown>): FriendRequest | null => {
  const status = d.status;
  if (typeof d.fromUid !== 'string' || typeof d.toUid !== 'string') return null;
  if (status !== 'pending' && status !== 'accepted' && status !== 'declined') return null;
  return { id, fromUid: d.fromUid, toUid: d.toUid, status: status as RequestStatus, fromNickname: String(d.fromNickname ?? '') };
};

async function loadRequests(uid: string): Promise<FriendRequest[]> {
  const col = collection(db(), 'friendRequests');
  const [incoming, outgoing] = await Promise.all([
    getDocs(query(col, where('toUid', '==', uid))),
    getDocs(query(col, where('fromUid', '==', uid))),
  ]);
  const out: FriendRequest[] = [];
  for (const s of [...incoming.docs, ...outgoing.docs]) {
    const r = toRequest(s.id, s.data());
    if (r) out.push(r);
  }
  return out;
}

export interface FriendsOverview {
  me: MyProfile;
  requests: RequestsView;
  /** お互いに承認済みで、データを読めるフレンド */
  friends: FriendData[];
  /** 承認は済んだが、相手側の反映を待っている人の数 */
  waiting: number;
}

/**
 * フレンド画面の内容を読み込む。あわせて、友達リストの整理をする。
 * - 自分が送った申請が承認されていたら、自分の friendUids に相手を足す（承認は、送る側と受ける側が、それぞれ自分のデータに反映する）。
 * - 相手に解除されて読めなくなった人は、自分の friendUids から外す。
 */
export async function loadFriendsOverview(): Promise<FriendsOverview | null> {
  const uid = await requireUid();
  const me = await getMyProfile();
  if (!me) return null;
  const all = await loadRequests(uid);

  const read = async (friendUids: string[]) => {
    const readable = new Set<string>();
    const data: FriendData[] = [];
    await Promise.all(
      friendUids.map(async (f) => {
        try {
          const snap = await getDoc(doc(db(), 'users', f));
          const parsed = snap.exists() ? parseFriendDoc(f, snap.data(), LIMITS, CATALOG) : null;
          if (parsed) {
            readable.add(f);
            data.push(parsed);
          }
        } catch (e) {
          // 「読めない」と言えるのは、権限がないときだけ（まだ相手側が反映していない、または解除された）。
          // 通信の失敗などは、読めないのではなく「分からない」ので、友達を外す判断に使わず、読み込み全体を失敗にする。
          const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
          if (!code.includes('permission-denied') && !code.includes('not-found')) throw e;
        }
      }),
    );
    return { readable, data };
  };

  let { readable, data } = await read(me.friendUids);
  const plan = planFriendReconcile(me.friendUids, uid, all, readable);
  let friendUids = me.friendUids;
  if (plan.add.length > 0 || plan.remove.length > 0) {
    const ref = doc(db(), 'users', uid);
    const added: string[] = [];
    for (const a of plan.add) {
      try {
        await updateDoc(ref, { friendUids: arrayUnion(a) }); // ルール上、1人ずつ足す
        added.push(a);
      } catch {
        // 相手が申請を取り消した直後などで、足せないことがある。この人だけ見送り、次の機会にやり直す
      }
    }
    if (plan.remove.length > 0) await updateDoc(ref, { friendUids: arrayRemove(...plan.remove) });
    friendUids = [...me.friendUids.filter((u) => !plan.remove.includes(u)), ...added];
    ({ readable, data } = await read(friendUids));
  }
  return {
    me: { ...me, friendUids },
    requests: splitRequests(uid, all),
    friends: data.sort((a, b) => a.nickname.localeCompare(b.nickname, 'ja')),
    waiting: friendUids.filter((u) => !readable.has(u)).length,
  };
}

/** フレンドコードで申請する。相手がすでに自分に申請していたら、その申請を承認する。 */
export async function sendFriendRequest(codeInput: string): Promise<'sent' | 'accepted'> {
  const uid = await requireUid();
  const code = normalizeFriendCode(codeInput);
  if (!code) throw new FriendError('invalid-code', 'フレンドコードは、英数字8文字です（0・O・1・I は使いません）。');

  const me = await getMyProfile();
  if (!me) throw new FriendError('signed-out', '先にニックネームを決めてください。');
  const codeSnap = await getDoc(doc(db(), 'friendCodes', code));
  if (!codeSnap.exists()) throw new FriendError('not-found', 'そのフレンドコードは見つかりませんでした。');
  const toUid = String(codeSnap.data().uid ?? '');
  if (!toUid) throw new FriendError('not-found', 'そのフレンドコードは見つかりませんでした。');
  if (toUid === uid) throw new FriendError('self', '自分のコードには申請できません。');
  if (me.friendUids.includes(toUid)) throw new FriendError('already-friend', 'すでにフレンドです。');
  if (me.friendUids.length >= MAX_FRIENDS) throw new FriendError('too-many', `フレンドは${MAX_FRIENDS}人までです。`);

  const all = await loadRequests(uid);
  const reverse = all.find((r) => r.fromUid === toUid && r.toUid === uid && r.status === 'pending');
  if (reverse) {
    await respondToRequest(reverse, true);
    return 'accepted';
  }
  const existing = all.find((r) => r.fromUid === uid && r.toUid === toUid);
  if (existing?.status === 'pending') throw new FriendError('already-sent', 'すでに申請しています。返事を待ってください。');
  if (existing) await deleteDoc(doc(db(), 'friendRequests', existing.id)); // 断られた申請を片づけてから、改めて申請する

  await writeBatch(db())
    .set(doc(db(), 'friendRequests', requestId(uid, toUid)), {
      fromUid: uid,
      toUid,
      status: 'pending',
      fromNickname: me.nickname,
      createdAt: serverTimestamp(),
    })
    .commit();
  return 'sent';
}

/** 届いた申請に返事をする。承認すると、自分の friendUids に相手が入る（相手側は、次に画面を開いたときに反映する）。 */
export async function respondToRequest(req: FriendRequest, accept: boolean): Promise<void> {
  const uid = await requireUid();
  if (req.toUid !== uid) throw new FriendError('signed-out', 'この申請には返事できません。');
  const reqRef = doc(db(), 'friendRequests', req.id);
  if (!accept) {
    await updateDoc(reqRef, { status: 'declined' });
    return;
  }
  await updateDoc(reqRef, { status: 'accepted' });
  await updateDoc(doc(db(), 'users', uid), { friendUids: arrayUnion(req.fromUid) });
}

/** 自分が送った申請を取り消す（返事待ち・断られたもの、どちらも）。 */
export async function cancelRequest(req: FriendRequest): Promise<void> {
  const uid = await requireUid();
  if (req.fromUid !== uid) return;
  await deleteDoc(doc(db(), 'friendRequests', req.id));
}

/** フレンドを解除する。自分の一覧から外し、2人のあいだの申請も消す。 */
export async function removeFriend(friendUid: string): Promise<void> {
  const uid = await requireUid();
  await updateDoc(doc(db(), 'users', uid), { friendUids: arrayRemove(friendUid) });
  for (const id of [requestId(uid, friendUid), requestId(friendUid, uid)]) {
    try {
      await deleteDoc(doc(db(), 'friendRequests', id));
    } catch {
      // その向きの申請がない
    }
  }
}

/**
 * アカウントを削除する。Firestore 上の自分のデータ（プロフィール、フレンドコード、申請）を消し、ログイン情報も消す。
 * ゲームのデータ（この端末の図鑑など）は消さない。
 */
export async function deleteMyAccount(): Promise<void> {
  const user = await currentUser();
  if (!user) throw new FriendError('signed-out', 'ログインしていません。');
  const uid = user.uid;
  const me = await getMyProfile();
  const requests = await loadRequests(uid);

  const batch = writeBatch(db());
  for (const r of requests) batch.delete(doc(db(), 'friendRequests', r.id));
  if (me?.friendCode) batch.delete(doc(db(), 'friendCodes', me.friendCode));
  batch.delete(doc(db(), 'users', uid));
  await batch.commit();

  try {
    await deleteUser(user);
  } catch {
    // 長くログインしたままだと、削除に再ログインを求められることがある。Firestore のデータは消えているので、ログアウトだけして終える。
  }
  await signOutAll();
}
