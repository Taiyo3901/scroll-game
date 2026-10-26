import { useState } from 'react';
import type { GenreDef, ItemDef } from '../core/catalog';
import type { Job } from '../core/job';
import { TORCH_SVG } from '../content/overlay/wall';
import { masteryOf } from '../core/mastery';
import { spriteUri } from '../core/sprites';

/** ログイン中のアカウントのアイコン。画像が読めないときは、ニックネームの頭文字を出す。 */
export function Avatar(props: { url?: string; name: string; size?: number }) {
  const size = props.size ?? 32;
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.5) };
  return props.url && !failed ? (
    <img className="avatar-img" style={style} src={props.url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  ) : (
    <span className="avatar-img avatar-fallback" style={style} aria-hidden="true">
      {[...props.name][0] ?? '?'}
    </span>
  );
}

/** 見出しの横に置く松明（飾り）。SVG は自前の固定文字列。 */
export function Torch() {
  return <span className="torch-deco" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TORCH_SVG }} />;
}

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
  const mastery = masteryOf(count);
  const cls = ['item', `r${item.rarity}`, found ? 'found' : 'unknown', mastery.level > 0 ? `m${mastery.level}` : '', selected ? 'selected' : '']
    .filter(Boolean)
    .join(' ');
  const body = (
    <>
      <ItemIcon itemId={item.id} found={found} rarity={item.rarity} fallbackColor={color} />
      <div className="item-text">
        <div className="item-name">
          <span className="stars">{RARITY_LABEL[item.rarity]}</span> {found ? item.name : '？？？'}
        </div>
        {found && (
          <div className="item-count">
            所持 {count}個
            {mastery.level > 0 && <span className={`mastery m${mastery.level}`}>{mastery.name}</span>}
          </div>
        )}
        {found && !compact && <p className="item-desc">{item.description}</p>}
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
        {label}: 未診断（あと{need}個）
      </div>
    );
  }
  const g = genres.find((x) => x.id === job.genreId);
  const g2 = genres.find((x) => x.id === job.genreId2);
  // 組み合わせの職業は、2つの部屋の色を、半分ずつ使う
  const bg = g && g2 ? `linear-gradient(90deg, ${g.color} 50%, ${g2.color} 50%)` : (g?.color ?? '#b5651d');
  const note = g && g2 ? `${g.name}と${g2.name}で多く発見` : g ? `${g.name}で多く発見` : 'まんべんなく発見';
  return (
    <div className="job">
      <span className="job-label">{label}</span>
      <span className="chip" style={{ background: bg }}>
        {job.name}
      </span>
      <span className="muted small">{note}</span>
    </div>
  );
}

/** 部屋ごとの発見数の割合を、帯グラフにする。 */
export function GenreBar(props: { finds: Record<string, number>; genres: GenreDef[] }) {
  const total = Object.values(props.finds).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
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
