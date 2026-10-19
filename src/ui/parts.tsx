import type { GenreDef, ItemDef } from '../core/catalog';
import type { Job } from '../core/job';
import { spriteUri } from '../core/sprites';

/** 発見品のドットアイコン。未発見のときは黒いシルエットにする。 */
export function ItemIcon(props: {
  itemId: string;
  found: boolean;
  rarity: 1 | 2 | 3;
  fallbackColor?: string;
  size?: 'sm';
}) {
  const uri = spriteUri(props.itemId);
  const cls = ['icon', `r${props.rarity}`, props.found ? '' : 'silhouette', props.size ?? ''].join(' ').trim();
  return uri ? (
    <span className={cls} aria-hidden="true">
      <img src={uri} alt="" draggable={false} />
    </span>
  ) : (
    <span className={`${cls} fallback`} style={{ background: props.fallbackColor }} aria-hidden="true" />
  );
}

export const RARITY_LABEL: Record<1 | 2 | 3, string> = { 1: '★', 2: '★★', 3: '★★★' };

/** 発見品のカード。count が 0 ならシルエット（名前・解説は伏せる）。 */
export function ItemCard(props: {
  item: ItemDef;
  count: number;
  color: string;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const { item, count, color, selected, onClick, compact } = props;
  const found = count > 0;
  const cls = ['ore', `r${item.rarity}`, found ? 'found' : 'unknown', selected ? 'selected' : ''].join(' ');
  const body = (
    <>
      <ItemIcon itemId={item.id} found={found} rarity={item.rarity} fallbackColor={color} />
      <div className="ore-text">
        <div className="ore-name">
          <span className="stars">{RARITY_LABEL[item.rarity]}</span> {found ? item.name : '？？？'}
        </div>
        {found && <div className="ore-count">所持 {count}個</div>}
        {found && !compact && <p className="ore-desc">{item.description}</p>}
        {!found && !compact && <p className="ore-desc muted">まだ見つけていない品</p>}
      </div>
    </>
  );
  return onClick ? (
    <button type="button" className={cls} onClick={onClick} aria-pressed={selected}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** 職業の表示。発見数が少ないうちは、あと何個で診断できるかを出す。 */
export function JobBadge(props: { job: Job | null; genres: GenreDef[]; label: string; need: number }) {
  const { job, genres, label, need } = props;
  if (!job) {
    return (
      <div className="job muted">
        {label}: まだ診断できません（あと{need}個）
      </div>
    );
  }
  const g = genres.find((x) => x.id === job.genreId);
  return (
    <div className="job">
      <span className="job-label">{label}</span>
      <span className="chip" style={{ background: g?.color ?? '#b5651d' }}>
        {job.name}
      </span>
      <span className="muted small">{g ? `${g.name}で多く発見` : 'まんべんなく発見'}</span>
    </div>
  );
}

/** 部屋ごとの発見数の割合を、帯グラフにする。 */
export function GenreBar(props: { finds: Record<string, number>; genres: GenreDef[] }) {
  const total = Object.values(props.finds).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="muted small">発見すると、ここに分布が出ます。</p>;
  const parts = props.genres
    .map((g) => ({ g, n: props.finds[g.id] ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return (
    <div>
      <div className="genre-bar" role="img" aria-label="部屋ごとの発見数の割合">
        {parts.map(({ g, n }) => (
          <div key={g.id} style={{ width: `${(n / total) * 100}%`, background: g.color }} title={`${g.name}: ${n}`} />
        ))}
      </div>
      <ul className="legend">
        {parts.map(({ g, n }) => (
          <li key={g.id}>
            <span className="dot" style={{ background: g.color }} />
            {g.name} {Math.round((n / total) * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
