import { OTHER_GENRE, type GenreDef } from './catalog.ts';

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** ホスト名が、ローカル・社内・IP直指定など「部屋に分けない」ものか。 */
function isPrivateHost(host: string): boolean {
  if (!host.includes('.')) return true; // localhost、社内の単名ホスト
  if (host.includes(':') || IPV4.test(host)) return true; // IPv6 / IPv4
  return /\.(local|localhost|internal|lan|home|corp|intranet)$/.test(host);
}

/**
 * ホスト名から部屋のIDを決める。ドメインの末尾一致で照合する（`m.youtube.com` は `youtube.com`）。
 * 辞書にないもの、ローカル・社内ホストは「未踏の地」。ホスト名はここで使うだけで、戻り値には含めない。
 */
export function classifyHost(hostname: string, genres: GenreDef[]): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!host || isPrivateHost(host)) return OTHER_GENRE;
  for (const g of genres) {
    for (const d of g.domains) {
      if (host === d || host.endsWith(`.${d}`)) return g.id;
    }
  }
  return OTHER_GENRE;
}
