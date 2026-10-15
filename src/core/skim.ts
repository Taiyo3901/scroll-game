export interface SkimConfig {
  windowSec: number;
  screens: number;
  cooldownSec: number;
}

export interface SkimSample {
  t: number;
  px: number;
}

export interface SkimState {
  samples: SkimSample[];
  skimming: boolean;
  /** この時刻(ms)までは流し読み後のクールダウン */
  cooldownUntil: number;
}

const FALLBACK_VIEWPORT_H = 800;

export function initialSkimState(): SkimState {
  return { samples: [], skimming: false, cooldownUntil: 0 };
}

/**
 * 時間を進め、必要ならスクロール量(px)を加えた新しい状態を返す。
 * 直近 windowSec 秒の合計が 画面の高さ × screens を超えたら流し読み状態。
 * 流し読み状態が終わった瞬間にクールダウンを始める。
 */
export function advanceSkim(
  state: SkimState,
  now: number,
  viewportH: number,
  cfg: SkimConfig,
  addedPx = 0,
): SkimState {
  const cutoff = now - cfg.windowSec * 1000;
  const samples = state.samples.filter((s) => s.t > cutoff);
  if (addedPx > 0) samples.push({ t: now, px: addedPx });

  const h = viewportH > 0 && Number.isFinite(viewportH) ? viewportH : FALLBACK_VIEWPORT_H;
  const total = samples.reduce((sum, s) => sum + s.px, 0);
  const skimming = total > h * cfg.screens;

  const cooldownUntil =
    state.skimming && !skimming ? now + cfg.cooldownSec * 1000 : state.cooldownUntil;

  return { samples, skimming, cooldownUntil };
}

export function isInCooldown(state: SkimState, now: number): boolean {
  return !state.skimming && now < state.cooldownUntil;
}

export function windowTotalPx(state: SkimState): number {
  return state.samples.reduce((sum, s) => sum + s.px, 0);
}

export function averageSpeedPxPerSec(state: SkimState, cfg: SkimConfig): number {
  return windowTotalPx(state) / cfg.windowSec;
}
