import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth/web-extension';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { FIREBASE_CONFIG, isFirebaseConfigured } from './config';

/** 設定がないときに投げる。画面側は、この種類のエラーを「未設定」の案内に変える。 */
export class NotConfiguredError extends Error {
  constructor() {
    super('Firebase が設定されていません');
    this.name = 'NotConfiguredError';
  }
}

function app(): FirebaseApp {
  if (!isFirebaseConfigured()) throw new NotConfiguredError();
  return getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
}

/** 拡張機能向けの Auth（firebase/auth/web-extension）。ログイン状態は IndexedDB に残り、service worker とページで共有される。 */
export const auth = (): Auth => getAuth(app());
export const db = (): Firestore => getFirestore(app());
