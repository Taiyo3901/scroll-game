import { useMemo, useState } from 'react';
import { SHOWCASE_MAX, toggleShowcase } from '../core/profile';
import { dailyRows, toCsv, weeklyRows, type StatsRow } from '../core/stats';
import { findOre, oresOf } from '../core/strata';
import { pxToMeters } from '../core/depth';
import { CATALOG } from '../data';
import { saveProfile } from '../storage';
import { mount } from '../ui/mount';
import { OreCard } from '../ui/parts';
import { useView } from '../ui/store';

type Tab = 'book' | 'showcase' | 'stats';

const colorOf = (stratumId: string) => CATALOG.strata.find((s) => s.id === stratumId)?.color ?? '#888';

function Book({ collection }: { collection: Record<string, number> }) {
  const found = CATALOG.ores.filter((o) => (collection[o.id] ?? 0) > 0).length;
  return (
    <>
      <p className="lead">
        発見 <strong>{found}</strong> / {CATALOG.ores.length}
      </p>
      {CATALOG.strata.map((s) => {
        const ores = oresOf(CATALOG, s.id);
        const n = ores.filter((o) => (collection[o.id] ?? 0) > 0).length;
        return (
          <section key={s.id} className="stratum" style={{ borderLeftColor: s.color }}>
            <h2>
              <span className="chip" style={{ background: s.color }}>
                {s.name}
              </span>
              <small>
                {s.startDepthM}m〜　{n} / {ores.length}
              </small>
            </h2>
            <div className="ore-grid">
              {ores.map((o) => (
                <OreCard key={o.id} ore={o} count={collection[o.id] ?? 0} color={s.color} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function Showcase(props: { collection: Record<string, number>; showcase: string[]; onToggle: (id: string) => void }) {
  const owned = CATALOG.ores.filter((o) => (props.collection[o.id] ?? 0) > 0);
  const slots = Array.from({ length: SHOWCASE_MAX }, (_, i) => props.showcase[i]);
  return (
    <>
      <p className="lead">お気に入りの鉱石を{SHOWCASE_MAX}つまで飾れます。（フレンド機能を入れると、フレンドから見られるようになります）</p>
      <div className="shelf" aria-label="標本棚">
        {slots.map((id, i) => {
          const ore = id ? findOre(CATALOG, id) : undefined;
          return (
            <div key={i} className={`slot ${ore ? 'filled' : ''}`}>
              {ore ? (
                <OreCard ore={ore} count={props.collection[ore.id] ?? 0} color={colorOf(ore.stratumId)} compact />
              ) : (
                <span className="muted">空き</span>
              )}
            </div>
          );
        })}
      </div>
      <h2>飾る鉱石を選ぶ</h2>
      {owned.length === 0 ? (
        <p className="muted">鉱石を掘って地上に戻ると、ここから選べます。</p>
      ) : (
        <div className="ore-grid">
          {owned.map((o) => {
            const on = props.showcase.includes(o.id);
            return (
              <OreCard
                key={o.id}
                ore={o}
                count={props.collection[o.id] ?? 0}
                color={colorOf(o.stratumId)}
                selected={on}
                compact
                onClick={() => props.onToggle(o.id)}
              />
            );
          })}
        </div>
      )}
      <p className="muted small">もう一度押すと外せます。{props.showcase.length >= SHOWCASE_MAX && 'いっぱいのときは、先に1つ外してください。'}</p>
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
          <th>採掘</th>
          <th>ポイント</th>
          <th>自分で戻った</th>
          <th>強制帰還</th>
          <th>スクロール(m)</th>
        </tr>
      </thead>
      <tbody>
        {[...rows].reverse().map((r) => (
          <tr key={r.label}>
            <td>{r.label}</td>
            <td>{r.mines}</td>
            <td>{r.points}</td>
            <td>{r.selfReturns}</td>
            <td>{r.forcedReturns}</td>
            <td>{pxToMeters(r.scrollPx).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function download(name: string, csv: string): void {
  // Excel で文字化けしないよう BOM を付ける
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Stats({ days }: { days: Parameters<typeof dailyRows>[0] }) {
  const [unit, setUnit] = useState<'day' | 'week'>('day');
  const rows = useMemo(() => (unit === 'day' ? dailyRows(days) : weeklyRows(days)), [days, unit]);
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
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => download(`scroll-game-${unit === 'day' ? 'daily' : 'weekly'}.csv`, toCsv(rows))}
        >
          CSVで書き出す
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="muted">まだ記録がありません。スクロールして掘ると、ここに推移が出ます。</p>
      ) : (
        <>
          <div className="charts">
            <BarChart rows={rows} pick={(r) => r.mines} label="採掘回数" />
            <BarChart rows={rows} pick={(r) => r.points} label="獲得ポイント" />
            <BarChart rows={rows} pick={(r) => pxToMeters(r.scrollPx)} label="スクロール距離(m)" />
          </div>
          <StatsTable rows={rows} />
        </>
      )}
      <p className="muted small">URL・ページのタイトル・本文は記録していません。ここにあるのは回数と距離だけです。</p>
    </>
  );
}

function Collection() {
  const { loaded, state, profile } = useView();
  const [tab, setTab] = useState<Tab>('book');
  if (!loaded) return <main aria-busy="true" />;

  const tabs: [Tab, string][] = [
    ['book', '図鑑'],
    ['showcase', '標本棚'],
    ['stats', '記録'],
  ];
  return (
    <main className="page">
      <header>
        <h1>図鑑</h1>
        <div role="tablist" className="tabs">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </header>
      {tab === 'book' && <Book collection={state.collection} />}
      {tab === 'showcase' && (
        <Showcase
          collection={state.collection}
          showcase={profile.showcase}
          onToggle={(id) => void saveProfile(toggleShowcase(profile, id, state.collection))}
        />
      )}
      {tab === 'stats' && <Stats days={state.days} />}
    </main>
  );
}

mount(<Collection />);
