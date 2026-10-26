/**
 * 帯の、時間帯による演出。端末の時刻だけを使い、保存も送信もしない。
 * 朝は暖かい光、昼は何も重ねず、夕方はオレンジ、夜は濃い青で暗くなり、松明が明るく燃える。
 * 時刻の間は、色をなめらかにつなぐ。
 */

export type TimeMode = 'auto' | 'dawn' | 'day' | 'dusk' | 'night' | 'off';
export const TIME_MODES: readonly TimeMode[] = ['auto', 'dawn', 'day', 'dusk', 'night', 'off'];
export const TIME_MODE_LABELS: Record<TimeMode, string> = {
  auto: '時刻に合わせる',
  dawn: '朝にする',
  day: '昼にする',
  dusk: '夕方にする',
  night: '夜にする',
  off: '演出なし',
};

export interface TimeLook {
  /** 重ねる色（0〜255） */
  rgb: [number, number, number];
  /** 重ねる濃さ 0〜1 */
  alpha: number;
  /** 松明の明るさ 0〜1（夜ほど明るい） */
  torch: number;
}

interface Key {
  hour: number;
  look: TimeLook;
}

const NIGHT: TimeLook = { rgb: [14, 24, 80], alpha: 0.45, torch: 1 };
const KEYS: Key[] = [
  { hour: 0, look: NIGHT },
  { hour: 4.5, look: NIGHT },
  { hour: 6, look: { rgb: [255, 170, 110], alpha: 0.22, torch: 0.45 } },
  { hour: 8, look: { rgb: [255, 235, 180], alpha: 0.1, torch: 0.1 } },
  { hour: 10, look: { rgb: [255, 255, 255], alpha: 0, torch: 0 } },
  { hour: 15, look: { rgb: [255, 255, 255], alpha: 0, torch: 0 } },
  { hour: 17, look: { rgb: [255, 190, 90], alpha: 0.14, torch: 0.15 } },
  { hour: 18.5, look: { rgb: [255, 110, 50], alpha: 0.3, torch: 0.5 } },
  { hour: 20, look: NIGHT },
  { hour: 24, look: NIGHT },
];

/** 時刻を固定する設定のときの、代表の時刻 */
const FIXED_HOUR: Record<Exclude<TimeMode, 'auto' | 'off'>, number> = { dawn: 6.5, day: 12, dusk: 18.5, night: 22 };

export function hourOf(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/** 時刻（0〜24）から、重ねる色と濃さを求める。24時間でひと回りする。不正な値は、昼（何も重ねない）。 */
export function timeLook(hour: number): TimeLook {
  if (!Number.isFinite(hour)) return { rgb: [255, 255, 255], alpha: 0, torch: 0 };
  const h = ((hour % 24) + 24) % 24;
  for (let i = 1; i < KEYS.length; i++) {
    const a = KEYS[i - 1] as Key;
    const b = KEYS[i] as Key;
    if (h <= b.hour) {
      const t = b.hour === a.hour ? 0 : (h - a.hour) / (b.hour - a.hour);
      const mix = (x: number, y: number) => x + (y - x) * t;
      return {
        rgb: [Math.round(mix(a.look.rgb[0], b.look.rgb[0])), Math.round(mix(a.look.rgb[1], b.look.rgb[1])), Math.round(mix(a.look.rgb[2], b.look.rgb[2]))],
        alpha: mix(a.look.alpha, b.look.alpha),
        torch: mix(a.look.torch, b.look.torch),
      };
    }
  }
  return NIGHT;
}

/** 設定と現在時刻から、いまの演出。off のときは null。 */
export function timeLookFor(mode: TimeMode, now: Date): TimeLook | null {
  if (mode === 'off') return null;
  return timeLook(mode === 'auto' ? hourOf(now) : FIXED_HOUR[mode]);
}

export function normalizeTimeMode(raw: unknown): TimeMode {
  return typeof raw === 'string' && (TIME_MODES as readonly string[]).includes(raw) ? (raw as TimeMode) : 'auto';
}
