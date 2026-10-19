import { useEffect, useState } from 'react';
import { defaultProfile, type Profile } from '../core/profile';
import { initialGameState, type GameState } from '../core/state';
import {
  defaultSettings,
  loadProfile,
  loadSettings,
  loadState,
  PROFILE_KEY,
  SETTINGS_KEY,
  STATE_KEY,
  type Settings,
} from '../storage';

export interface View {
  loaded: boolean;
  state: GameState;
  settings: Settings;
  profile: Profile;
  /** 「今日」「今週」の判定に使う現在時刻(ms) */
  now: number;
}

/** chrome.storage.local の内容を読み、変わったら更新する。1秒ごとに now も進める。 */
export function useView(): View {
  const [v, setV] = useState<View>(() => ({
    loaded: false,
    state: initialGameState(),
    settings: defaultSettings(),
    profile: defaultProfile(),
    now: Date.now(),
  }));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [state, settings, profile] = await Promise.all([loadState(), loadSettings(), loadProfile()]);
      if (alive) setV((old) => ({ ...old, loaded: true, state, settings, profile, now: Date.now() }));
    };
    void load();
    const onChanged = (changes: Record<string, unknown>) => {
      if (STATE_KEY in changes || SETTINGS_KEY in changes || PROFILE_KEY in changes) void load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    const timer = setInterval(() => setV((old) => ({ ...old, now: Date.now() })), 1000);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChanged);
      clearInterval(timer);
    };
  }, []);

  return v;
}
