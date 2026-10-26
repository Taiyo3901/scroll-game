import { defaultBandLayout, normalizeBandLayout, type BandSide } from './core/bandLayout';
import { normalizeTimeMode, type TimeMode } from './core/timeband';
import { safePhotoUrl } from './core/friendData';
import { normalizeProfile, type Profile } from './core/profile';
import { defaultShare, normalizeShare, type ShareSettings } from './core/publicProfile';
import { normalizeDisabledHosts } from './core/hosts';
import { normalizeState, type GameState } from './core/state';
import { CATALOG } from './data';

export const STATE_KEY = 'state';
export const SETTINGS_KEY = 'settings';
export const PROFILE_KEY = 'profile';
export const ACCOUNT_KEY = 'account';
export const SYNC_KEY = 'sync';

export interface Settings {
  /** 画面右端の演出 */
  effects: boolean;
  /** 帯を置く側（右 / 左） */
  bandSide: BandSide;
  /** 帯の幅(px) */
  bandWidth: number;
  /** 帯の上の余白（画面の高さの%） */
  bandTop: number;
  /** 時間帯の演出（時刻に合わせる / 朝 / 昼 / 夕方 / 夜 / なし） */
  bandTime: TimeMode;
  /** 帯の幅ぶんページの端に余白を取り、サイトと重ならないようにする */
  reserveSpace: boolean;
  /** フレンドに見せる範囲（初期設定は、すべて見せない） */
  share: ShareSettings;
  /** ゲームを動かさないサイト（自分で登録したホスト名。この端末にだけ保存し、外には送らない） */
  disabledHosts: string[];
}

export const defaultSettings = (): Settings => ({
  effects: true,
  bandSide: defaultBandLayout().side,
  bandWidth: defaultBandLayout().width,
  bandTop: defaultBandLayout().top,
  bandTime: 'auto',
  reserveSpace: true,
  share: defaultShare(),
  disabledHosts: [],
});

const GENRE_IDS = CATALOG.genres.map((g) => g.id);

/** 保存された設定を、足りない項目を補って整える。 */
export function normalizeSettings(raw: unknown): Settings {
  const base = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Partial<Settings>;
  const layout = normalizeBandLayout({ side: r.bandSide, width: r.bandWidth, top: r.bandTop });
  return {
    effects: typeof r.effects === 'boolean' ? r.effects : base.effects,
    reserveSpace: typeof r.reserveSpace === 'boolean' ? r.reserveSpace : base.reserveSpace,
    bandSide: layout.side,
    bandWidth: layout.width,
    bandTop: layout.top,
    bandTime: normalizeTimeMode(r.bandTime),
    share: normalizeShare(r.share, GENRE_IDS),
    disabledHosts: normalizeDisabledHosts(r.disabledHosts),
  };
}

/** ログイン中のアカウントの控え（ローカル）。ニックネームとフレンドコードは、他の人にも見える公開の値。 */
export interface AccountCache {
  uid: string;
  nickname: string;
  friendCode: string;
  /** ログイン中の Google アカウントのアイコン（フレンドにも見える） */
  photoUrl?: string;
}

export { safePhotoUrl };

/** 最後に Firestore へ送った内容（同じなら送り直さない）。 */
export interface SyncRecord {
  uid: string;
  json: string;
  at: number;
}

/** ゲームの状態 */
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

/** 飾り棚。図鑑にある発見品だけに整える。 */
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
    ? { uid: a.uid, nickname: a.nickname, friendCode: a.friendCode, ...(safePhotoUrl(a.photoUrl) ? { photoUrl: safePhotoUrl(a.photoUrl) } : {}) }
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
