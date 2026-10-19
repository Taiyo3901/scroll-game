import { CONFIG } from './config';
import { normalizeProfile, type Profile } from './core/profile';
import { normalizeState, type GameState } from './core/state';

export const STATE_KEY = 'state';
export const SETTINGS_KEY = 'settings';
export const PROFILE_KEY = 'profile';

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

export async function loadState(): Promise<GameState> {
  const got = await chrome.storage.local.get(STATE_KEY);
  return normalizeState(got[STATE_KEY]);
}

export async function saveState(state: GameState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: state });
}

export async function loadSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaultSettings(), ...(got[SETTINGS_KEY] as Partial<Settings> | undefined) };
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
