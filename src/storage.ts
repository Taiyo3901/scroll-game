import { CONFIG } from './config';
import { defaultBandLayout, normalizeBandLayout, type BandSide } from './core/bandLayout';
import { normalizeTimeMode, type TimeMode } from './core/timeband';
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
/** デモモードのデータは、本番のデータとは別のキーに保存する（本番のデータとランキングに混ざらないように） */
export const DEMO_STATE_KEY = 'demoState';
export const DEMO_PROFILE_KEY = 'demoProfile';

export const stateKeyFor = (demo: boolean): string => (demo ? DEMO_STATE_KEY : STATE_KEY);
export const profileKeyFor = (demo: boolean): string => (demo ? DEMO_PROFILE_KEY : PROFILE_KEY);

export interface Settings {
  debugOverlay: boolean;
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
  /** 発表用のデモモード。データは本番とは別に保存し、ランキングには送らない */
  demoMode: boolean;
}

export const defaultSettings = (): Settings => ({
  debugOverlay: CONFIG.DEBUG_OVERLAY_DEFAULT,
  effects: true,
  bandSide: defaultBandLayout().side,
  bandWidth: defaultBandLayout().width,
  bandTop: defaultBandLayout().top,
  bandTime: 'auto',
  reserveSpace: true,
  share: defaultShare(),
  disabledHosts: [],
  demoMode: false,
});

const GENRE_IDS = CATALOG.genres.map((g) => g.id);

/** 保存された設定を、足りない項目を補って整える。 */
export function normalizeSettings(raw: unknown): Settings {
  const base = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Partial<Settings>;
  const layout = normalizeBandLayout({ side: r.bandSide, width: r.bandWidth, top: r.bandTop });
  return {
    ...base,
    ...r,
    bandSide: layout.side,
    bandWidth: layout.width,
    bandTop: layout.top,
    bandTime: normalizeTimeMode(r.bandTime),
    share: normalizeShare(r.share, GENRE_IDS),
    disabledHosts: normalizeDisabledHosts(r.disabledHosts),
    // デモモードとデバッグ表示は、設定画面から外した。以前にオンにしていても、オフに戻す
    demoMode: false,
    debugOverlay: false,
  };
}

/** ログイン中のアカウントの控え（ローカル）。ニックネームとフレンドコードは、他の人にも見える公開の値。 */
export interface AccountCache {
  uid: string;
  nickname: string;
  friendCode: string;
  /** ログイン中の Google アカウントのアイコン。自分の画面に出すだけで、Firestore には送らない */
  photoUrl?: string;
}

/** アイコンの URL は、https のものだけ使う */
export const safePhotoUrl = (raw: unknown): string | undefined =>
  typeof raw === 'string' && raw.length <= 2048 && /^https:\/\//.test(raw) ? raw : undefined;

/** 最後に Firestore へ送った内容（同じなら送り直さない）。 */
export interface SyncRecord {
  uid: string;
  json: string;
  at: number;
}

/** ゲームの状態。demo が true ならデモ用（既定は本番）。 */
export async function loadState(demo = false): Promise<GameState> {
  const key = stateKeyFor(demo);
  const got = await chrome.storage.local.get(key);
  return normalizeState(got[key]);
}

export async function saveState(state: GameState, demo = false): Promise<void> {
  await chrome.storage.local.set({ [stateKeyFor(demo)]: state });
}

export async function loadSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(got[SETTINGS_KEY]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...(await loadSettings()), ...patch } });
}

/** 飾り棚と初回確認。飾り棚は図鑑にある発見品だけに整える。demo が true ならデモ用（既定は本番）。 */
export async function loadProfile(demo = false): Promise<Profile> {
  const pk = profileKeyFor(demo);
  const sk = stateKeyFor(demo);
  const got = await chrome.storage.local.get([pk, sk]);
  const profile = normalizeProfile(got[pk], normalizeState(got[sk]).collection);
  // 初回の説明画面の確認は、デモでも本番と同じ（確認済みなら、デモで再び出さない）
  if (demo) profile.onboarded = (await loadProfile(false)).onboarded;
  return profile;
}

export async function saveProfile(profile: Profile, demo = false): Promise<void> {
  await chrome.storage.local.set({ [profileKeyFor(demo)]: profile });
}

/** デモのデータ（状態と飾り棚）を消す。本番のデータには触れない。 */
export async function clearDemoData(): Promise<void> {
  await chrome.storage.local.remove([DEMO_STATE_KEY, DEMO_PROFILE_KEY]);
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
