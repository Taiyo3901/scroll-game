import type { Catalog } from './catalog.ts';
import type { PublicLimits, WeeklyTotals } from './publicProfile.ts';

/** アイコンの URL の長さの上限（Firestore のルールと同じ） */
export const PHOTO_URL_MAX = 512;

/** アイコンの URL は、https のものだけ使う。それ以外は捨てる */
export const safePhotoUrl = (raw: unknown): string | undefined =>
  typeof raw === 'string' && raw.length <= PHOTO_URL_MAX && /^https:\/\/[^\s]+$/.test(raw) ? raw : undefined;

/** フレンドの公開データ（Firestore から受け取ったものを、安全な形に整えたもの）。 */
export interface FriendData {
  uid: string;
  nickname: string;
  /** Google アカウントのアイコン（https の URL）。なければ未設定 */
  photoUrl?: string;
  weekly: WeeklyTotals | null;
  /** 図鑑などを見せる設定になっている */
  shared: boolean;
  collection: Record<string, number>;
  showcase: string[];
  genreFinds: Record<string, number>;
  /** 上限を超える不自然な値が含まれていた（表示上、印を付ける） */
  suspicious: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * 受け取った値を整える。知らない鉱石・部屋のID、数でない値は捨てる。
 * 上限を超える値は、上限に丸めたうえで suspicious を立てる（ルールをすり抜けた値への、念のための備え）。
 */
export function parseFriendDoc(uid: string, raw: unknown, limits: PublicLimits, catalog: Catalog): FriendData | null {
  if (!isRecord(raw) || typeof raw.nickname !== 'string') return null;
  let suspicious = false;
  const num = (v: unknown, max: number): number => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      suspicious = suspicious || v !== undefined;
      return 0;
    }
    if (v > max) suspicious = true;
    return Math.min(max, Math.floor(v));
  };

  let weekly: WeeklyTotals | null = null;
  if (isRecord(raw.weekly) && typeof raw.weekly.weekId === 'string' && /^\d{4}-W\d{2}$/.test(raw.weekly.weekId)) {
    weekly = {
      weekId: raw.weekly.weekId,
      points: num(raw.weekly.points, limits.maxPointsPerWeek),
      finds: num(raw.weekly.finds, limits.maxFindsPerWeek),
    };
  }

  const itemIds = new Set(catalog.items.map((i) => i.id));
  const genreIds = new Set(catalog.genres.map((g) => g.id));
  const collection: Record<string, number> = {};
  if (isRecord(raw.collection)) {
    for (const [id, n] of Object.entries(raw.collection)) {
      if (!itemIds.has(id)) continue;
      const v = num(n, limits.maxItemCount);
      if (v > 0) collection[id] = v;
    }
  }
  const genreFinds: Record<string, number> = {};
  if (isRecord(raw.genreFinds)) {
    for (const [g, n] of Object.entries(raw.genreFinds)) {
      if (!genreIds.has(g)) continue;
      const v = num(n, limits.maxGenreFinds);
      if (v > 0) genreFinds[g] = v;
    }
  }
  const showcase = Array.isArray(raw.showcase)
    ? [...new Set(raw.showcase.filter((id): id is string => typeof id === 'string' && itemIds.has(id)))].slice(0, 3)
    : [];

  return {
    uid,
    nickname: raw.nickname.slice(0, 64),
    ...(safePhotoUrl(raw.photoUrl) ? { photoUrl: safePhotoUrl(raw.photoUrl) } : {}),
    weekly,
    shared: raw.shared === true,
    collection,
    showcase,
    genreFinds,
    suspicious,
  };
}
