import { initialGameState, normalizeState, type GameState } from '../core/state';
import { SETTINGS_KEY, STATE_KEY, defaultSettings, loadSettings, loadState, normalizeSettings, type Settings } from '../storage';

export interface View {
  state: GameState;
  settings: Settings;
}

let view: View = { state: initialGameState(), settings: defaultSettings() };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export const getView = (): View => view;
export function onViewChange(f: () => void): void {
  listeners.add(f);
}

/** storage から最初の値を読み、以後の変更に追従する。 */
export async function initStore(): Promise<void> {
  const [state, settings] = await Promise.all([loadState(), loadSettings()]);
  view = { state, settings };
  emit();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let changed = false;
    if (changes[STATE_KEY]) {
      view = { ...view, state: normalizeState(changes[STATE_KEY].newValue) };
      changed = true;
    }
    if (changes[SETTINGS_KEY]) {
      view = { ...view, settings: normalizeSettings(changes[SETTINGS_KEY].newValue) };
      changed = true;
    }
    if (changed) emit();
  });
}
