import { useMemo, useState } from 'react';
import { findItem, itemsOfGenre, mimicItems, type ItemDef } from '../core/catalog';
import { CONTAINER_KINDS, CONTAINER_LABELS } from '../core/containers';
import { pxToMeters } from '../core/depth';
import { JOB_MIN_FINDS, diagnoseJob, sumGenreFinds } from '../core/job';
import { SHOWCASE_MAX, toggleShowcase } from '../core/profile';
import { dailyRows, weeklyRows, type StatsRow } from '../core/stats';
import type { DayStats } from '../core/state';
import { isoWeekId } from '../core/week';
import { CATALOG } from '../data';
import { saveProfile } from '../storage';
import { mount } from '../ui/mount';
import { GenreBar, ItemCard, JobBadge, Torch } from '../ui/parts';
import { useView } from '../ui/store';

type Tab = 'book' | 'showcase' | 'stats';

const SECRET_COLOR = '#c9a227';
const MIMIC_COLOR = '#b04a6a';
const genreColor = (id?: string) => CATALOG.genres.find((g) => g.id === id)?.color ?? SECRET_COLOR;
const colorOf = (item: ItemDef) => (item.mimic ? MIMIC_COLOR : item.areaId ? SECRET_COLOR : genreColor(item.genreId));

function weekDays(days: Record<string, DayStats>, now: number): DayStats[] {
  const thisWeek = isoWeekId(new Date(now));
  return Object.entries(days)
    .filter(([k]) => {
      const [y, m, d] = k.split('-').map(Number);
      return !!y && !!m && !!d && isoWeekId(new Date(y, m - 1, d)) === thisWeek;
    })
    .map(([, v]) => v);
}

function Book(props: { collection: Record<string, number>; days: Record<string, DayStats>; now: number }) {
  const { collection, days, now } = props;
  const found = CATALOG.items.filter((i) => (collection[i.id] ?? 0) > 0).length;
  const all = sumGenreFinds(Object.values(days));
  const week = sumGenreFinds(weekDays(days, now));
  const sum = (f: Record<string, number>) => Object.values(f).reduce((a, b) => a + b, 0);
  const secrets = CATALOG.items.filter((i) => i.areaId);
  const mimics = mimicItems(CATALOG);

  return (
    <>
      <p className="lead">
        発見 <strong>{found}</strong> / {CATALOG.items.length}
      </p>

      <section className="card">
        <h2>あなたの職業</h2>
        <JobBadge job={diagnoseJob(all, CATALOG.genres)} genres={CATALOG.genres} label="これまで" need={Math.max(0, JOB_MIN_FINDS - sum(all))} />
        <JobBadge job={diagnoseJob(week, CATALOG.genres)} genres={CATALOG.genres} label="今週" need={Math.max(0, JOB_MIN_FINDS - sum(week))} />
        <h2>どの部屋でよく見つけたか</h2>
        <GenreBar finds={all} genres={CATALOG.genres} />
      </section>

      {CATALOG.genres.map((g) => {
        const items = itemsOfGenre(CATALOG, g.id);
        const n = items.filter((i) => (collection[i.id] ?? 0) > 0).length;
        return (
          <section key={g.id} className="stratum" style={{ borderLeftColor: g.color }}>
            <h2>
              <span className="chip" style={{ background: g.color }}>
                {g.name}
              </span>
              <small>
                {g.about}　{n} / {items.length}
              </small>
            </h2>
            <div className="item-grid">
              {items.map((i) => (
                <ItemCard key={i.id} item={i} count={collection[i.id] ?? 0} color={g.color} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="stratum" style={{ borderLeftColor: SECRET_COLOR }}>
        <h2>
          <span className="chip" style={{ background: SECRET_COLOR }}>
            階層の秘宝
          </span>
          <small>各階層で、まれに見つかる</small>
        </h2>
        <div className="item-grid">
          {secrets.map((i) => (
            <ItemCard key={i.id} item={i} count={collection[i.id] ?? 0} color={SECRET_COLOR} />
          ))}
        </div>
      </section>

      <section className="stratum" style={{ borderLeftColor: MIMIC_COLOR }}>
        <h2>
          <span className="chip" style={{ background: MIMIC_COLOR }}>
            ミミックの戦利品
          </span>
          <small>宝箱に化けた魔物から、まれに手に入る</small>
        </h2>
        <div className="item-grid">
          {mimics.map((i) => (
            <ItemCard key={i.id} item={i} count={collection[i.id] ?? 0} color={MIMIC_COLOR} />
          ))}
        </div>
      </section>
    </>
  );
}

function Showcase(props: { collection: Record<string, number>; showcase: string[]; onToggle: (id: string) => void }) {
  const owned = CATALOG.items.filter((i) => (props.collection[i.id] ?? 0) > 0);
  const slots = Array.from({ length: SHOWCASE_MAX }, (_, i) => props.showcase[i]);
  return (
    <>
      <div className="shelf" aria-label="飾り棚">
        {slots.map((id, i) => {
          const item = id ? findItem(CATALOG, id) : undefined;
          return (
            <div key={i} className={`slot ${item ? 'filled' : ''}`}>
              {item ? (
                <ItemCard item={item} count={props.collection[item.id] ?? 0} color={colorOf(item)} compact />
              ) : (
                <span className="muted">空き</span>
              )}
            </div>
          );
        })}
      </div>
      <h2>飾る品を選ぶ</h2>
      {owned.length > 0 && (
        <div className="item-grid">
          {owned.map((i) => (
            <ItemCard
              key={i.id}
              item={i}
              count={props.collection[i.id] ?? 0}
              color={colorOf(i)}
              selected={props.showcase.includes(i.id)}
              compact
              onClick={() => props.onToggle(i.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function BarChart({ rows, pick, label }: { rows: StatsRow[]; pick: (r: StatsRow) => number; label: string }) {
  const max = Math.max(1, ...rows.map(pick));
  return (
    <figure className="chart">
      <figcaption>{label}</figcaption>
      <div className="bars">
        {rows.map((r) => (
          <div key={r.label} className="bar" title={`${r.label}: ${pick(r)}`}>
            <div className="bar-fill" style={{ height: `${(pick(r) / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="bar-axis">
        <span>{rows[0]?.label}</span>
        <span>{rows[rows.length - 1]?.label}</span>
      </div>
    </figure>
  );
}

function StatsTable({ rows }: { rows: StatsRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>期間</th>
          <th>発見数</th>
          <th>ポイント</th>
          <th>スクロール(m)</th>
        </tr>
      </thead>
      <tbody>
        {[...rows].reverse().map((r) => (
          <tr key={r.label}>
            <td>{r.label}</td>
            <td>{r.finds}</td>
            <td>{r.points}</td>
            <td>{pxToMeters(r.scrollPx).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stats({ days }: { days: Record<string, DayStats> }) {
  const [unit, setUnit] = useState<'day' | 'week'>('day');
  const rows = useMemo(() => (unit === 'day' ? dailyRows(days) : weeklyRows(days)), [days, unit]);
  const boxes = useMemo(() => {
    const total: Record<string, number> = {};
    for (const d of Object.values(days)) for (const [k, n] of Object.entries(d.containers)) total[k] = (total[k] ?? 0) + n;
    return total;
  }, [days]);
  return (
    <>
      <div className="row">
        <div role="group" aria-label="集計の単位" className="seg">
          <button type="button" aria-pressed={unit === 'day'} onClick={() => setUnit('day')}>
            日ごと
          </button>
          <button type="button" aria-pressed={unit === 'week'} onClick={() => setUnit('week')}>
            週ごと
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="muted">記録なし</p>
      ) : (
        <>
          <div className="charts">
            <BarChart rows={rows} pick={(r) => r.finds} label="発見数" />
            <BarChart rows={rows} pick={(r) => r.points} label="獲得ポイント" />
            <BarChart rows={rows} pick={(r) => pxToMeters(r.scrollPx)} label="スクロール距離(m)" />
          </div>
          <ul className="legend" aria-label="開けた入れ物の合計">
            {CONTAINER_KINDS.map((k) => (
              <li key={k}>
                {CONTAINER_LABELS[k]} {boxes[k] ?? 0}個
              </li>
            ))}
          </ul>
          <StatsTable rows={rows} />
        </>
      )}
    </>
  );
}

function Collection() {
  const { loaded, state, profile, now, demo } = useView();
  const [tab, setTab] = useState<Tab>('book');
  if (!loaded) return <main aria-busy="true" />;

  const tabs: [Tab, string][] = [
    ['book', 'アイテム図鑑'],
    ['showcase', '飾り棚'],
    ['stats', '記録'],
  ];
  return (
    <main className="page">
      <header>
        <h1>
          <Torch />
          図鑑
          <Torch />
        </h1>
        <div role="tablist" className="tabs">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </header>
      {tab === 'book' && <Book collection={state.collection} days={state.days} now={now} />}
      {tab === 'showcase' && (
        <Showcase
          collection={state.collection}
          showcase={profile.showcase}
          onToggle={(id) => void saveProfile(toggleShowcase(profile, id, state.collection), demo)}
        />
      )}
      {tab === 'stats' && <Stats days={state.days} />}
    </main>
  );
}

mount(<Collection />);
