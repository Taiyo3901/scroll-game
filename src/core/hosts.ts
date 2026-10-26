/** サイトごとの無効化に使う、サイト名（ホスト名）の整形と照合。登録した一覧は、この端末にだけ保存し、外には送らない。 */
export const MAX_DISABLED_HOSTS = 200;

const HOST_PATTERN = /^(?=.{1,253}$)([a-z0-9-]{1,63})(\.[a-z0-9-]{1,63})*$/;

/**
 * 入力（サイト名、または URL）から、ホスト名だけを取り出して整える。正しくなければ null。
 * 例: "https://WWW.Example.com:8080/path?q=1" → "www.example.com"
 */
export function normalizeHost(input: string): string | null {
  let s = input.normalize('NFKC').trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // https:// など
  s = s.replace(/^[^@/]*@/, ''); // user@
  s = s.split(/[/?#]/)[0] ?? '';
  s = s.replace(/:\d+$/, '').replace(/\.$/, ''); // ポート、末尾の点
  if (s.startsWith('*.')) s = s.slice(2); // *.example.com も example.com として扱う
  return HOST_PATTERN.test(s) && !s.startsWith('-') && !s.includes('..') ? s : null;
}

/** host が、無効にしたサイトか。登録したサイト名と同じ、またはそのサブドメインなら無効（"example.com" は "www.example.com" も含む）。 */
export function isHostDisabled(host: string, disabled: readonly string[]): boolean {
  const h = host.trim().toLowerCase().replace(/\.$/, '');
  if (!h) return false;
  return disabled.some((d) => h === d || h.endsWith(`.${d}`));
}

/** 保存された一覧を、正しい形に整える（重複・不正な値を除き、上限までにする）。 */
export function normalizeDisabledHosts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    const h = typeof v === 'string' ? normalizeHost(v) : null;
    if (h && !out.includes(h)) out.push(h);
    if (out.length >= MAX_DISABLED_HOSTS) break;
  }
  return out;
}

export type AddHostResult = { ok: true; hosts: string[] } | { ok: false; reason: string };

/** 一覧にサイトを足す。 */
export function addDisabledHost(list: readonly string[], input: string): AddHostResult {
  const h = normalizeHost(input);
  if (!h) return { ok: false, reason: 'サイト名を読み取れない。例: example.com' };
  if (list.includes(h)) return { ok: false, reason: '登録済み。' };
  if (list.length >= MAX_DISABLED_HOSTS) return { ok: false, reason: `登録は${MAX_DISABLED_HOSTS}件まで。` };
  return { ok: true, hosts: [...list, h] };
}

export const removeDisabledHost = (list: readonly string[], host: string): string[] => list.filter((h) => h !== host);

/** ポップアップが、いま開いているタブの content script にサイト名を尋ねるメッセージ。 */
export interface HostQuery {
  type: 'get-host';
}
export interface HostReply {
  host: string;
}

export const isHostQuery = (m: unknown): m is HostQuery =>
  typeof m === 'object' && m !== null && (m as Record<string, unknown>).type === 'get-host';
