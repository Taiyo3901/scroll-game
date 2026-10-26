/**
 * Firestore の失敗が、どの操作で起きたかを、あとで分かるようにする。
 * 失敗したときに、操作の名前を、エラーに付けて、そのまま投げ直す（利用者向けの文に使う）。
 */
export type FirebaseStep = 'sync-write' | 'profile-read' | 'requests-read' | 'friends-read' | 'friends-update';

export const STEP_LABELS: Record<FirebaseStep, string> = {
  'sync-write': '自分のデータの送信',
  'profile-read': '自分のプロフィールの読み込み',
  'requests-read': '申請の読み込み',
  'friends-read': 'フレンドの読み込み',
  'friends-update': 'フレンド一覧の更新',
};

export async function inStep<T>(step: FirebaseStep, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (e) {
    if (typeof e === 'object' && e !== null && !('step' in e)) (e as { step?: FirebaseStep }).step = step;
    throw e;
  }
}

export const stepOf = (e: unknown): FirebaseStep | null =>
  typeof e === 'object' && e !== null && 'step' in e && typeof (e as { step: unknown }).step === 'string' ? ((e as { step: FirebaseStep }).step ?? null) : null;
