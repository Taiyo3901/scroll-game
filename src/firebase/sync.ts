import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { safePhotoUrl } from '../core/friendData';
import { buildPublicFields } from '../core/publicProfile';
import { CATALOG } from '../data';
import { loadAccount, loadProfile, loadSettings, loadState, loadSync, saveSync } from '../storage';
import { LIMITS, getMyProfile } from './account';
import { db } from './app';
import { isFirebaseConfigured } from './config';
import { currentUser } from './auth';
import { inStep } from './step';

export type SyncResult = 'unconfigured' | 'signed-out' | 'no-profile' | 'unchanged' | 'synced';

/**
 * 集計結果を Firestore の自分のプロフィールに送る。ローカル（chrome.storage.local）が正で、
 * 前回と同じ内容なら送らない（無料枠を使いすぎないため）。force なら、同じ内容でも送る。
 * 送るのは、週の集計と、公開設定で許した図鑑・飾り棚・部屋の分布だけ。
 */
export async function syncNow(force = false): Promise<SyncResult> {
  if (!isFirebaseConfigured()) return 'unconfigured';
  const user = await currentUser();
  if (!user) return 'signed-out';

  let account = await loadAccount();
  if (!account || account.uid !== user.uid) {
    const me = await getMyProfile();
    if (!me) return 'no-profile';
    account = { uid: me.uid, nickname: me.nickname, friendCode: me.friendCode };
  }

  const [state, profile, settings, last] = await Promise.all([loadState(), loadProfile(), loadSettings(), loadSync()]);
  const fields = buildPublicFields({ state, profile, share: settings.share, catalog: CATALOG, now: new Date(), limits: LIMITS });
  const json = JSON.stringify({ ...fields, photoUrl: safePhotoUrl(user.photoURL) ?? null });
  if (!force && last && last.uid === user.uid && last.json === json) return 'unchanged';

  // 見せない設定にしたものは、Firestore 上からも消す
  await inStep('sync-write', () =>
    updateDoc(doc(db(), 'users', user.uid), {
      weekly: fields.weekly,
      shared: fields.shared,
      collection: fields.collection ?? deleteField(),
      showcase: fields.showcase ?? deleteField(),
      genreFinds: fields.genreFinds ?? deleteField(),
      photoUrl: safePhotoUrl(user.photoURL) ?? deleteField(),
      updatedAt: serverTimestamp(),
    }),
  );
  await saveSync({ uid: user.uid, json, at: Date.now() });
  return 'synced';
}
