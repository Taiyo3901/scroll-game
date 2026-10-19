import { CONFIG } from './config';
import { normalizeProfile, type Profile } from './core/profile';
import { defaultShare, normalizeShare, type ShareSettings } from './core/publicProfile';
import { normalizeState, type GameState } from './core/state';
import { CATALOG } from './data';

export const STATE_KEY = 'state';
export const SETTINGS_KEY = 'settings';
export const PROFILE_KEY = 'profile';
export const ACCOUNT_KEY = 'account';
export const SYNC_KEY = 'sync';

export interface Settings {
  debugOverlay: boolean;
  /** 画面右端の演出 */
  effects: boolean;
  /** 帯の幅ぶんページの右に余白を取り、サイトと重ならないようにする */
  reserveSpace: boolean;
  /** フレンドに見せる範囲（初期設定は、すべて見せない） */
  share: ShareSettings;
}

export const defaultSettings = (): Settings => ({
  debugOverlay: CONFIG.DEBUG_OVERLAY_DEFAULT,
  effects: true,
  reserveSpace: true,
  share: defaultShare(),
});

const GENRE_IDS = CATALOG.genres.map((g) => g.id);

/** 保存された設定を、足りない項目を補って整える。 */
export function normalizeSettings(raw: unknown): Settings {
  const base = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Partial<Settings>;
  return { ...base, ...r, share: normalizeShare(r.share, GENRE_IDS) };
}

/** ログイン中のアカウントの控え（ローカル）。ニックネームとフレンドコードは、他の人にも見える公開の値。 */
export interface AccountCache {
  uid: string;
  nickname: string;
  friendCode: string;
}

/** 最後に Firestore へ送った内容（同じなら送り直さない）。 */
export interface SyncRecord {
  uid: string;
  json: string;
  at: number;
}

export async function loadState(): Promise<GameState> {
  const got = await chrome.storage.local.get(STATE_KEY);
  return normalizeState(got[STATE_KEY]);
}

export async function saveState(state: GameState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: state });
}

export async function loadSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(got[SETTINGS_KEY]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...(await loadSettings()), ...patch } });
}

/** 飾り棚と初回確認。飾り棚は図鑑にある発見品だけに整える。 */
export async function loadProfile(): Promise<Profile> {
  const got = await chrome.storage.local.get([PROFILE_KEY, STATE_KEY]);
  return normalizeProfile(got[PROFILE_KEY], normalizeState(got[STATE_KEY]).collection);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
}

export async function loadAccount(): Promise<AccountCache | null> {
  const got = await chrome.storage.local.get(ACCOUNT_KEY);
  const a = got[ACCOUNT_KEY] as Partial<AccountCache> | undefined;
  return a && typeof a.uid === 'string' && typeof a.nickname === 'string' && typeof a.friendCode === 'string'
    ? { uid: a.uid, nickname: a.nickname, friendCode: a.friendCode }
    : null;
}

export async function saveAccount(account: AccountCache | null): Promise<void> {
  if (account) await chrome.storage.local.set({ [ACCOUNT_KEY]: account });
  else await chrome.storage.local.remove([ACCOUNT_KEY, SYNC_KEY]);
}

export async function loadSync(): Promise<SyncRecord | null> {
  const got = await chrome.storage.local.get(SYNC_KEY);
  const s = got[SYNC_KEY] as Partial<SyncRecord> | undefined;
  return s && typeof s.uid === 'string' && typeof s.json === 'string' && typeof s.at === 'number'
    ? { uid: s.uid, json: s.json, at: s.at }
    : null;
}

export async function saveSync(record: SyncRecord): Promise<void> {
  await chrome.storage.local.set({ [SYNC_KEY]: record });
}
