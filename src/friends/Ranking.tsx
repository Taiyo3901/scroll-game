import { useMemo, useState } from 'react';
import { diagnoseJob, sumGenreFinds } from '../core/job';
import type { FriendData } from '../core/friendData';
import { buildRanking, type RankRow } from '../core/ranking';
import { weeklyTotals } from '../core/publicProfile';
import type { GameState } from '../core/state';
import { isoWeekId } from '../core/week';
import { CATALOG } from '../data';
import type { FriendsOverview } from '../firebase/account';
import { GenreBar, ItemCard, JobBadge } from '../ui/parts';

const SECRET_COLOR = '#c9a227';
const MIMIC_COLOR = '#b04a6a';
const itemColor = (genreId?: string, areaId?: string, mimic?: boolean) =>
  mimic ? MIMIC_COLOR : areaId ? SECRET_COLOR : (CATALOG.genres.find((g) => g.id === genreId)?.color ?? SECRET_COLOR);

/** 順位の表示。1〜3位は、目立たせる。 */
function RankBadge({ rank }: { rank: number }) {
  return <span className={`rank r${rank <= 3 ? rank : 'n'}`}>{rank}位</span>;
}

function FriendDetail({ friend, row }: { friend: FriendData; row: RankRow }) {
  const job = friend.shared ? diagnoseJob(friend.genreFinds, CATALOG.genres) : null;
  const found = Object.keys(friend.collection).length;
  const shelf = friend.showcase
    .map((id) => CATALOG.items.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => i !== undefined);

  return (
    <section className="card" aria-label={`${friend.nickname} さんの詳細`}>
      <h2>
        {friend.nickname}
        {friend.suspicious && (
          <span className="warn" title="上限を超える不自然な値が含まれています">
            ⚠
          </span>
        )}
        <small>
          <RankBadge rank={row.rank} />
        </small>
      </h2>

      <h2>今週の記録</h2>
      {row.noWeek ? (
        <p className="muted">今週のデータは、まだ届いていません。</p>
      ) : (
        <p>
          <strong className="big">{row.points}</strong> 点　/　{row.finds}個発見
        </p>
      )}

      {!friend.shared ? (
        <p className="muted">この人は、図鑑・飾り棚・職業を公開していません。</p>
      ) : (
        <>
          <h2>職業</h2>
          <JobBadge job={job} genres={CATALOG.genres} label="診断" need={0} />

          <h2>よく見つけた部屋</h2>
          <GenreBar finds={friend.genreFinds} genres={CATALOG.genres} />

          <h2>
            図鑑 <small>公開分で {found} 種類</small>
          </h2>

          <h2>飾り棚</h2>
          {shelf.length === 0 ? (
            <p className="muted">飾っている品はありません。</p>
          ) : (
            <div className="item-grid">
              {shelf.map((i) => (
                <ItemCard key={i.id} item={i} count={friend.collection[i.id] ?? 1} color={itemColor(i.genreId, i.areaId, i.mimic)} compact />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/**
 * ランキング（自分とフレンドの今週のポイント）。順位の指標は、今週のポイントだけ。
 * フレンドを選ぶと、公開されている範囲の詳細を見られる。
 */
export function Ranking(props: { overview: FriendsOverview; state: GameState; busy: boolean; onReload: () => void }) {
  const { overview, state, busy, onReload } = props;
  const [selected, setSelected] = useState<string | null>(null);
  const week = isoWeekId(new Date());

  const rows = useMemo(() => {
    const owned = CATALOG.items.filter((i) => (state.collection[i.id] ?? 0) > 0).length;
    return buildRanking(
      {
        uid: overview.me.uid,
        nickname: overview.me.nickname,
        weekly: weeklyTotals(state.days, new Date()),
        collectionCount: owned,
        jobName: diagnoseJob(sumGenreFinds(Object.values(state.days)), CATALOG.genres)?.name ?? null,
      },
      overview.friends,
      week,
      CATALOG,
    );
  }, [overview, state, week]);

  const chosen = overview.friends.find((f) => f.uid === selected);
  const chosenRow = rows.find((r) => r.uid === selected);

  return (
    <>
      <section className="card">
        <h2>
          今週のランキング <small>{week}（月曜0時から）</small>
        </h2>
        <table className="ranking">
          <thead>
            <tr>
              <th>順位</th>
              <th>名前</th>
              <th>ポイント</th>
              <th>発見数</th>
              <th>図鑑</th>
              <th>職業</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.uid}
                className={[r.isMe ? 'me' : '', r.uid === selected ? 'sel' : '', r.isMe ? '' : 'pick'].join(' ').trim()}
                onClick={r.isMe ? undefined : () => setSelected(r.uid === selected ? null : r.uid)}
              >
                <td>
                  <RankBadge rank={r.rank} />
                </td>
                <td className="name">
                  {r.isMe ? (
                    <>
                      {r.nickname} <small className="muted">（あなた）</small>
                    </>
                  ) : (
                    <button type="button" className="linkish" onClick={() => setSelected(r.uid === selected ? null : r.uid)} aria-pressed={r.uid === selected}>
                      {r.nickname}
                    </button>
                  )}
                  {r.suspicious && (
                    <span className="warn" title="上限を超える不自然な値が含まれています">
                      {' '}
                      ⚠
                    </span>
                  )}
                </td>
                <td>{r.points}</td>
                <td>{r.finds}</td>
                <td>{r.collectionCount === null ? <span className="muted">非公開</span> : `${r.collectionCount}/${CATALOG.items.length}`}</td>
                <td>{r.jobName ?? <span className="muted">{r.shared ? '—' : '非公開'}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {overview.friends.length === 0 && <p className="muted">まだフレンドがいません。</p>}
        <button type="button" disabled={busy} onClick={onReload}>
          最新の状態に更新
        </button>
      </section>

      {chosen && chosenRow ? (
        <FriendDetail friend={chosen} row={chosenRow} />
      ) : null}
    </>
  );
}
