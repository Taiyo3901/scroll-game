const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** ローカル時刻の日付キー (YYYY-MM-DD)。日の区切りはローカル0時。 */
export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ローカル時刻のISO週ID (例: 2026-W42)。週は月曜0時区切り。 */
export function isoWeekId(d: Date): string {
  // ローカルの年月日だけを使い、UTC上の同じ日付として扱う（DSTの影響を避ける）
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayOfWeek = (date.getUTCDay() + 6) % 7; // 月曜=0
  date.setUTCDate(date.getUTCDate() - dayOfWeek + 3); // その週の木曜
  const weekYear = date.getUTCFullYear();
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(weekYear, 0, 1)) / 86_400_000);
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${weekYear}-W${pad(week)}`;
}
