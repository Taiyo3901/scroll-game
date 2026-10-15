import { CONFIG } from '../config';
import { initialGameState, normalizeState, type GameState } from '../core/state';
import {
  RUNTIME_KEY,
  SETTINGS_KEY,
  STATE_KEY,
  defaultRuntime,
  defaultSettings,
  loadRuntime,
  loadSettings,
  loadState,
  type Runtime,
  type Settings,
} from '../storage';

export interface View {
  state: GameState;
  settings: Settings;
  runtime: Runtime;
}

let view: View = {
  state: initialGameState(Date.now(), CONFIG.OIL_MAX),
  settings: defaultSettings(),
  runtime: defaultRuntime(),
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export const getView = (): View => view;
export function onViewChange(f: () => void): void {
  listeners.add(f);
}

/** storage から最初の値を読み、以後の変更に追従する。 */
export async function initStore(): Promise<void> {
  const [state, settings, runtime] = await Promise.all([loadState(), loadSettings(), loadRuntime()]);
  view = { state, settings, runtime };
  emit();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let changed = false;
    if (changes[STATE_KEY]) {
      view = {
        ...view,
        state: normalizeState(changes[STATE_KEY].newValue, Date.now(), CONFIG.OIL_MAX),
      };
      changed = true;
    }
    if (changes[SETTINGS_KEY]) {
      view = {
        ...view,
        settings: { ...defaultSettings(), ...(changes[SETTINGS_KEY].newValue as Partial<Settings>) },
      };
      changed = true;
    }
    if (changes[RUNTIME_KEY]) {
      view = {
        ...view,
        runtime: { ...defaultRuntime(), ...(changes[RUNTIME_KEY].newValue as Partial<Runtime>) },
      };
      changed = true;
    }
    if (changed) emit();
  });
}
