import { initialGameState, normalizeState, type GameState } from '../core/state';
import {
  DEMO_STATE_KEY,
  SETTINGS_KEY,
  STATE_KEY,
  defaultSettings,
  loadSettings,
  loadState,
  normalizeSettings,
  type Settings,
} from '../storage';

export interface View {
  /** いま使っている状態（デモモードのときは、デモ用） */
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

/** storage から最初の値を読み、以後の変更に追従する。デモモードの切り替えにも追従する。 */
export async function initStore(): Promise<void> {
  const settings = await loadSettings();
  view = { state: await loadState(settings.demoMode), settings };
  emit();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const demoChanged = changes[SETTINGS_KEY] && normalizeSettings(changes[SETTINGS_KEY].newValue).demoMode !== view.settings.demoMode;
    if (changes[SETTINGS_KEY]) view = { ...view, settings: normalizeSettings(changes[SETTINGS_KEY].newValue) };

    if (demoChanged) {
      // 本番とデモで、使う状態が変わる
      void loadState(view.settings.demoMode).then((state) => {
        view = { ...view, state };
        emit();
      });
      return;
    }
    const key = view.settings.demoMode ? DEMO_STATE_KEY : STATE_KEY;
    if (changes[key]) view = { ...view, state: normalizeState(changes[key].newValue) };
    if (changes[SETTINGS_KEY] || changes[key]) emit();
  });
}
