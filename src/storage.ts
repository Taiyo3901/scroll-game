import { CONFIG } from './config';
import { initialGameState, type GameState } from './core/progress';

export const STATE_KEY = 'state';
export const SETTINGS_KEY = 'settings';

export interface Settings {
  debugOverlay: boolean;
}

export const defaultSettings = (): Settings => ({
  debugOverlay: CONFIG.DEBUG_OVERLAY_DEFAULT,
});

export async function loadState(): Promise<GameState> {
  const got = await chrome.storage.local.get(STATE_KEY);
  const s = got[STATE_KEY] as GameState | undefined;
  return s && s.version === 1 ? s : initialGameState();
}

export async function saveState(state: GameState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: state });
}

export async function loadSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaultSettings(), ...(got[SETTINGS_KEY] as Partial<Settings> | undefined) };
}
