import { useEffect, useState } from 'react';
import { defaultProfile, type Profile } from '../core/profile';
import { initialGameState, type GameState } from '../core/state';
import {
  DEMO_PROFILE_KEY,
  DEMO_STATE_KEY,
  PROFILE_KEY,
  SETTINGS_KEY,
  STATE_KEY,
  defaultSettings,
  loadProfile,
  loadSettings,
  loadState,
  type Settings,
} from '../storage';

export interface View {
  loaded: boolean;
  /** いま使っている状態（デモモードのときは、デモ用。real を指定したときは、いつも本番） */
  state: GameState;
  settings: Settings;
  profile: Profile;
  /** 表示しているのが、デモ用のデータか */
  demo: boolean;
  /** 「今日」「今週」の判定に使う現在時刻(ms) */
  now: number;
}

/**
 * chrome.storage.local の内容を読み、変わったら更新する。1秒ごとに now も進める。
 * デモモードのときは、デモ用のデータを読む。ランキングのように、いつも本番のデータが必要な画面は、real を true にする。
 */
export function useView(opts: { real?: boolean } = {}): View {
  const real = opts.real === true;
  const [v, setV] = useState<View>(() => ({
    loaded: false,
    state: initialGameState(),
    settings: defaultSettings(),
    profile: defaultProfile(),
    demo: false,
    now: Date.now(),
  }));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const settings = await loadSettings();
      const demo = settings.demoMode && !real;
      const [state, profile] = await Promise.all([loadState(demo), loadProfile(demo)]);
      if (alive) setV((old) => ({ ...old, loaded: true, state, settings, profile, demo, now: Date.now() }));
    };
    void load();
    const keys = [STATE_KEY, DEMO_STATE_KEY, SETTINGS_KEY, PROFILE_KEY, DEMO_PROFILE_KEY];
    const onChanged = (changes: Record<string, unknown>) => {
      if (keys.some((k) => k in changes)) void load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    const timer = setInterval(() => setV((old) => ({ ...old, now: Date.now() })), 1000);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChanged);
      clearInterval(timer);
    };
  }, [real]);

  return v;
}
