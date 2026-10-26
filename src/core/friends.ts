/** フレンドコードの文字。見間違えやすい 0/O、1/I/l を使わない（32文字）。 */
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const FRIEND_CODE_LENGTH = 8;
export const NICKNAME_MAX = 16;
export const MAX_FRIENDS = 100;

const CODE_PATTERN = new RegExp(`^[${FRIEND_CODE_ALPHABET}]{${FRIEND_CODE_LENGTH}}$`);

/** 8文字のフレンドコードを作る。randomInt(n) は 0 以上 n 未満の整数を返す（本番は crypto を使う）。 */
export function generateFriendCode(randomInt: (n: number) => number): string {
  let code = '';
  for (let i = 0; i < FRIEND_CODE_LENGTH; i++) code += FRIEND_CODE_ALPHABET[randomInt(FRIEND_CODE_ALPHABET.length)] ?? 'A';
  return code;
}

/** 入力されたコードを整える（空白・ハイフンを除き、大文字にする）。正しい形でなければ null。 */
export function normalizeFriendCode(input: string): string | null {
  const code = input.normalize('NFKC').replace(/[\s\-_]/g, '').toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** 表示用の 4文字-4文字。 */
export function formatFriendCode(code: string): string {
  return code.length === FRIEND_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export type NicknameCheck = { ok: true; nickname: string } | { ok: false; reason: string };

/** ニックネームの検査。前後の空白を除き、1〜NICKNAME_MAX 文字（絵文字なども1文字として数える）。 */
export function checkNickname(input: string): NicknameCheck {
  const nickname = input.normalize('NFKC').trim().replace(/\s+/g, ' ');
  const length = [...nickname].length;
  if (length === 0) return { ok: false, reason: 'ニックネームを入力すること。' };
  if (length > NICKNAME_MAX) return { ok: false, reason: `ニックネームは${NICKNAME_MAX}文字まで。` };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/.test(nickname)) {
    return { ok: false, reason: '使用できない文字を含む。' };
  }
  return { ok: true, nickname };
}

/** フレンド申請のドキュメントID。送信者ごと・相手ごとに1つに決まる（重複して作れない）。 */
export const requestId = (fromUid: string, toUid: string): string => `${fromUid}_${toUid}`;

export type RequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  status: RequestStatus;
  fromNickname: string;
}

export interface RequestsView {
  /** 自分に届いた、まだ返事をしていない申請 */
  incoming: FriendRequest[];
  /** 自分が送った、返事待ちの申請 */
  outgoing: FriendRequest[];
  /** 自分が送って、断られた申請（片づけられる） */
  declined: FriendRequest[];
}

/** 申請の一覧を、画面に出す3つに分ける。 */
export function splitRequests(me: string, all: FriendRequest[]): RequestsView {
  return {
    incoming: all.filter((r) => r.toUid === me && r.status === 'pending'),
    outgoing: all.filter((r) => r.fromUid === me && r.status === 'pending'),
    declined: all.filter((r) => r.fromUid === me && r.status === 'declined'),
  };
}

/**
 * 自分の friendUids の整理で、何をするかを決める。
 * - 承認済みの申請があるのに、まだ friendUids にない相手 → 追加する（受け取る側の承認を、送った側が反映する）
 * - friendUids にいるが、相手のデータが読めず、承認済みの申請も残っていない相手 → 解除されたので、取り除く
 */
export function planFriendReconcile(
  friendUids: string[],
  me: string,
  requests: FriendRequest[],
  readable: ReadonlySet<string>,
): { add: string[]; remove: string[] } {
  const accepted = requests.filter((r) => r.status === 'accepted');
  const acceptedWith = new Set(accepted.map((r) => (r.fromUid === me ? r.toUid : r.fromUid)));
  const have = new Set(friendUids);
  const add = [...acceptedWith].filter((u) => !have.has(u) && have.size + 1 <= MAX_FRIENDS);
  const remove = friendUids.filter((u) => !readable.has(u) && !acceptedWith.has(u));
  return { add, remove };
}
