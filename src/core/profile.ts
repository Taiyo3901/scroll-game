/** 飾り棚に飾れる品の数 */
export const SHOWCASE_MAX = 3;

/** ユーザーが決めて残しておく設定的なデータ（ゲーム状態とは別に保存する）。 */
export interface Profile {
  version: 1;
  /** 飾り棚に飾る発見品ID（最大 SHOWCASE_MAX 個、重複なし） */
  showcase: string[];
  /** 初回の説明画面を確認した */
  onboarded: boolean;
}

export const defaultProfile = (): Profile => ({ version: 1, showcase: [], onboarded: false });

/** 保存データを読み込むときの整形。壊れた値や、図鑑にない品は取り除く。 */
export function normalizeProfile(raw: unknown, collection: Record<string, number>): Profile {
  const base = defaultProfile();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const showcase: string[] = [];
  if (Array.isArray(r.showcase)) {
    for (const id of r.showcase) {
      if (typeof id === 'string' && (collection[id] ?? 0) > 0 && !showcase.includes(id)) showcase.push(id);
      if (showcase.length >= SHOWCASE_MAX) break;
    }
  }
  return { ...base, showcase, onboarded: r.onboarded === true };
}

/** 飾り棚への飾る/外すの切り替え。図鑑にない品、上限超えは変えない。 */
export function toggleShowcase(
  p: Profile,
  itemId: string,
  collection: Record<string, number>,
): Profile {
  if (p.showcase.includes(itemId)) return { ...p, showcase: p.showcase.filter((id) => id !== itemId) };
  if ((collection[itemId] ?? 0) <= 0) return p;
  if (p.showcase.length >= SHOWCASE_MAX) return p;
  return { ...p, showcase: [...p.showcase, itemId] };
}
