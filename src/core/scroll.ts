/** 下方向の差分のみ返す。上方向・変化なし・不正値は0。 */
export function downwardDelta(prev: number, cur: number): number {
  const d = cur - prev;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

/** 直近のユーザー操作から windowSec 秒以内か。時計が巻き戻った場合は false。 */
export function isWithinInputWindow(
  lastInputAt: number | null,
  now: number,
  windowSec: number,
): boolean {
  if (lastInputAt === null) return false;
  const elapsed = now - lastInputAt;
  return elapsed >= 0 && elapsed <= windowSec * 1000;
}
