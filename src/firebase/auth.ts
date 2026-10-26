import { GoogleAuthProvider, signInWithCredential, signOut, type User } from 'firebase/auth/web-extension';
import { saveAccount } from '../storage';
import { auth } from './app';

/** chrome.identity で Google のアクセストークンを取る。interactive のとき、アカウント選択や同意の画面が出る。 */
async function googleToken(interactive: boolean): Promise<string> {
  const result = await chrome.identity.getAuthToken({ interactive });
  const token = typeof result === 'string' ? result : result?.token;
  if (!token) throw new Error('Google のトークンを取得できなかった');
  return token;
}

/** 現在ログイン中のユーザー（なければ null）。保存されたログイン状態の読み込みを待つ。 */
export async function currentUser(): Promise<User | null> {
  const a = auth();
  await a.authStateReady();
  return a.currentUser;
}

/** Google でログインする。トークンが古くて失敗したときは、キャッシュを捨てて1回だけやり直す。 */
export async function signInWithGoogle(): Promise<User> {
  const a = auth();
  let token = await googleToken(true);
  try {
    return (await signInWithCredential(a, GoogleAuthProvider.credential(null, token))).user;
  } catch (e) {
    await chrome.identity.removeCachedAuthToken({ token });
    token = await googleToken(true);
    try {
      return (await signInWithCredential(a, GoogleAuthProvider.credential(null, token))).user;
    } catch {
      throw e;
    }
  }
}

/** ログアウトする。Google のトークンのキャッシュも消し、ローカルのアカウントの控えも消す（ゲームのデータは消さない）。 */
export async function signOutAll(): Promise<void> {
  await signOut(auth());
  await chrome.identity.clearAllCachedAuthTokens();
  await saveAccount(null);
}
