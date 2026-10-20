import type { Catalog } from './catalog.ts';
import type { FriendData } from './friendData.ts';
import { diagnoseJob } from './job.ts';
import type { WeeklyTotals } from './publicProfile.ts';

/** ランキングの1行。順位の指標は「今週のポイント合計」だけ（深度やスクロール距離では付けない）。 */
export interface RankRow {
  uid: string;
  nickname: string;
  isMe: boolean;
  /** 同じポイントは同じ順位（1位, 1位, 3位 ...） */
  rank: number;
  points: number;
  finds: number;
  /** 図鑑で見つけた種類の数。フレンドが公開していなければ null */
  collectionCount: number | null;
  /** 職業。公開していない・まだ診断できないときは null */
  jobName: string | null;
  /** 図鑑・飾り棚・職業を公開している */
  shared: boolean;
  /** 上限を超える不自然な値が含まれていた（印を付ける） */
  suspicious: boolean;
  /** この週の集計がまだない（先週までの値しかない、または未送信） */
  noWeek: boolean;
}

export interface RankingMe {
  uid: string;
  nickname: string;
  weekly: WeeklyTotals;
  collectionCount: number;
  jobName: string | null;
}

/**
 * 自分とフレンドのランキングを作る。
 * 自分の分は、この端末の最新の値（送信を待たない）を使い、フレンドの分は、Firestore から受け取った値を使う。
 * フレンドの週が今週でなければ、今週はまだ 0 点として扱う。
 */
export function buildRanking(me: RankingMe, friends: FriendData[], weekId: string, catalog: Catalog): RankRow[] {
  const rows: Omit<RankRow, 'rank'>[] = [
    {
      uid: me.uid,
      nickname: me.nickname,
      isMe: true,
      points: me.weekly.weekId === weekId ? me.weekly.points : 0,
      finds: me.weekly.weekId === weekId ? me.weekly.finds : 0,
      collectionCount: me.collectionCount,
      jobName: me.jobName,
      shared: true,
      suspicious: false,
      noWeek: false,
    },
    ...friends.map((f) => {
      const thisWeek = f.weekly?.weekId === weekId;
      return {
        uid: f.uid,
        nickname: f.nickname,
        isMe: false,
        points: thisWeek ? (f.weekly?.points ?? 0) : 0,
        finds: thisWeek ? (f.weekly?.finds ?? 0) : 0,
        collectionCount: f.shared ? Object.keys(f.collection).length : null,
        jobName: f.shared ? (diagnoseJob(f.genreFinds, catalog.genres)?.name ?? null) : null,
        shared: f.shared,
        suspicious: f.suspicious,
        noWeek: !thisWeek,
      };
    }),
  ];

  rows.sort(
    (a, b) =>
      b.points - a.points || b.finds - a.finds || Number(b.isMe) - Number(a.isMe) || a.nickname.localeCompare(b.nickname, 'ja'),
  );

  const ranked: RankRow[] = [];
  rows.forEach((r, i) => {
    const prev = ranked[i - 1];
    ranked.push({ ...r, rank: prev && prev.points === r.points ? prev.rank : i + 1 });
  });
  return ranked;
}
