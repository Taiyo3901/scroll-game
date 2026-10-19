import type { OreDef } from '../core/strata';

export const RARITY_LABEL: Record<1 | 2 | 3, string> = { 1: '★', 2: '★★', 3: '★★★' };

/** 鉱石のカード。discovered が false ならシルエット（名前・解説は伏せる）。 */
export function OreCard(props: {
  ore: OreDef;
  count: number;
  color: string;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const { ore, count, color, selected, onClick, compact } = props;
  const found = count > 0;
  const cls = ['ore', `r${ore.rarity}`, found ? 'found' : 'unknown', selected ? 'selected' : ''].join(' ');
  const body = (
    <>
      <div className="gem" style={found ? { background: color } : undefined} aria-hidden="true">
        {found ? ore.name.slice(0, 1) : '？'}
      </div>
      <div className="ore-text">
        <div className="ore-name">
          <span className="stars">{RARITY_LABEL[ore.rarity]}</span> {found ? ore.name : '？？？'}
        </div>
        {found && <div className="ore-count">所持 {count}個</div>}
        {found && !compact && <p className="ore-desc">{ore.description}</p>}
        {!found && !compact && <p className="ore-desc muted">まだ見つけていない鉱石</p>}
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

export function Meter(props: { label: string; ratio: number; text: string; tone?: 'oil' | 'low' }) {
  const pct = Math.max(0, Math.min(1, props.ratio)) * 100;
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{props.label}</span>
        <span>{props.text}</span>
      </div>
      <div className="meter-track" role="meter" aria-label={props.label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`meter-fill ${props.tone ?? ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
