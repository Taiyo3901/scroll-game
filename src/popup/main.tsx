import { useState } from 'react';
import { CONFIG } from '../config';
import { bagCount, currentOil, minesToday } from '../core/game';
import { findOre, stratumAt } from '../core/strata';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import { RULES } from '../rules';
import { saveSettings } from '../storage';
import { mount } from '../ui/mount';
import { Meter, RARITY_LABEL } from '../ui/parts';
import { useView } from '../ui/store';

function openPage(file: string): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL(file) });
  window.close();
}

function Popup() {
  const { loaded, state, settings, profile, now } = useView();
  const [returning, setReturning] = useState(false);
  if (!loaded) return <main className="popup-main" aria-busy="true" />;

  const stratum = stratumAt(CATALOG.strata, state.depthM);
  const oil = currentOil(state, now, RULES);
  const exploring = state.mode === 'exploring';
  const bag = Object.entries(state.bag)
    .map(([id, n]) => ({ ore: findOre(CATALOG, id), n }))
    .filter((x): x is { ore: NonNullable<typeof x.ore>; n: number } => x.ore !== undefined);

  const goSurface = async () => {
    setReturning(true);
    try {
      await chrome.runtime.sendMessage({ type: 'return-to-surface' });
    } finally {
      setReturning(false);
    }
  };

  return (
    <main className="popup-main">
      {!profile.onboarded && (
        <button type="button" className="notice" onClick={() => openPage('welcome.html')}>
          はじめに：何を記録するかを確認する
        </button>
      )}

      <section className="status" style={{ borderLeftColor: stratum.color }}>
        <div className="depth">
          {state.depthM.toFixed(1)}
          <small> m</small>
        </div>
        <div className="where">
          <span className="chip" style={{ background: stratum.color }}>
            {stratum.name}
          </span>
          <span className={`mode ${exploring ? 'on' : ''}`}>{exploring ? '探検中' : '地上'}</span>
        </div>
      </section>

      <Meter
        label="ランタンの油"
        ratio={oil / CONFIG.OIL_MAX}
        text={`${Math.floor(oil)} / ${CONFIG.OIL_MAX}`}
        tone={exploring && oil <= CONFIG.OIL_LOW_THRESHOLD ? 'low' : 'oil'}
      />
      {!exploring && oil < CONFIG.START_OIL_MIN && (
        <p className="hint">油が{CONFIG.START_OIL_MIN}以上たまると、スクロールで探検を再開できます。</p>
      )}

      <section>
        <h2>
          バッグ <small>{bagCount(state)}個</small>
        </h2>
        {bag.length === 0 ? (
          <p className="muted">まだ何も入っていません。</p>
        ) : (
          <ul className="bag">
            {bag.map(({ ore, n }) => (
              <li key={ore.id}>
                <span className={`stars r${ore.rarity}`}>{RARITY_LABEL[ore.rarity]}</span> {ore.name}
                <span className="n">×{n}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">
          今日の採掘 {minesToday(state, localDayKey(new Date(now)))} / {CONFIG.MAX_MINES_PER_DAY} 回
        </p>
      </section>

      <button type="button" className="primary" disabled={!exploring || returning} onClick={() => void goSurface()}>
        地上に戻る
      </button>
      <p className="muted small">戻ると、バッグの鉱石が図鑑に登録されます。</p>

      <nav className="links">
        <button type="button" onClick={() => openPage('collection.html')}>
          図鑑を開く
        </button>
        <button type="button" disabled title="準備中です">
          ランキング
        </button>
      </nav>

      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.effects}
          onChange={(e) => void saveSettings({ effects: e.target.checked })}
        />
        画面右端の演出を表示する
      </label>
    </main>
  );
}

mount(<Popup />);
