import { CONFIG } from './config';
import { normalizeProfile, type Profile } from './core/profile';
import { normalizeState, type GameState } from './core/state';

export const STATE_KEY = 'state';
export const SETTINGS_KEY = 'settings';
export const RUNTIME_KEY = 'runtime';

export interface Settings {
  debugOverlay: boolean;
  /** 画面右端の演出 */
  effects: boolean;
  /** 帯の幅ぶんページの右に余白を取り、サイトと重ならないようにする */
  reserveSpace: boolean;
}

export const defaultSettings = (): Settings => ({
  debugOverlay: CONFIG.DEBUG_OVERLAY_DEFAULT,
  effects: true,
  reserveSpace: true,
});

/** 保存しない方がよい一時的な状態。service worker が chrome.idle から書き、content が読む。 */
export interface Runtime {
  idleState: 'active' | 'idle' | 'locked';
}

export const defaultRuntime = (): Runtime => ({ idleState: 'active' });

export async function loadState(): Promise<GameState> {
  const got = await chrome.storage.local.get(STATE_KEY);
  return normalizeState(got[STATE_KEY], Date.now(), CONFIG.OIL_MAX);
}

export async function saveState(state: GameState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: state });
}

export async function loadSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaultSettings(), ...(got[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function loadRuntime(): Promise<Runtime> {
  const got = await chrome.storage.local.get(RUNTIME_KEY);
  return { ...defaultRuntime(), ...(got[RUNTIME_KEY] as Partial<Runtime> | undefined) };
}

export const PROFILE_KEY = 'profile';

/** 標本棚と初回確認。標本棚は図鑑にある鉱石だけに整える。 */
export async function loadProfile(): Promise<Profile> {
  const got = await chrome.storage.local.get([PROFILE_KEY, STATE_KEY]);
  const state = normalizeState(got[STATE_KEY], Date.now(), CONFIG.OIL_MAX);
  return normalizeProfile(got[PROFILE_KEY], state.collection);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...(await loadSettings()), ...patch } });
}
