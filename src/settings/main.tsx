import { useEffect, useRef, useState } from 'react';
import { createOverlay, type Overlay } from '../content/overlay/overlay';
import {
  BAND_TOP_MAX,
  BAND_TOP_MIN,
  BAND_WIDTH_MAX,
  BAND_WIDTH_MIN,
  BAND_WIDTH_STEP,
  defaultBandLayout,
} from '../core/bandLayout';
import { TIME_MODES, TIME_MODE_LABELS, normalizeTimeMode, timeLookFor, type TimeMode } from '../core/timeband';
import { addDisabledHost, removeDisabledHost } from '../core/hosts';
import { saveSettings } from '../storage';
import { mount } from '../ui/mount';
import { Torch } from '../ui/parts';
import { useView } from '../ui/store';

/**
 * 帯の見本。設定を変えると、実際の帯と同じ見た目が、すぐ変わる（位置・幅・上の余白・時間帯の演出・ページの余白）。
 * ページの代わりに、ダミーの文章を置く。ゲームの記録は使わない。
 */
function BandPreview(props: { side: 'right' | 'left'; width: number; top: number; time: TimeMode; reserve: boolean; enabled: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  const overlay = useRef<Overlay | null>(null);

  useEffect(() => {
    if (!holder.current) return;
    const o = createOverlay({ container: holder.current });
    overlay.current = o;
    o.setDepth(130, false);
    o.update({ roomId: 'other', phase: 'search', gauge: 0.5, container: 'chest', skin: 'cave', job: '勇者', progress: 0.3, demo: false });
    return () => {
      o.destroy();
      overlay.current = null;
    };
  }, []);

  useEffect(() => {
    overlay.current?.setLayout({ side: props.side, width: props.width, top: props.top });
    overlay.current?.setTime(timeLookFor(props.time, new Date()));
  }, [props.side, props.width, props.top, props.time]);

  // ページの余白: 余白を取る設定のときは、文章が、帯のぶん、反対側に寄る
  const pad = props.enabled && props.reserve ? props.width : 0;
  return (
    <div className="bp" aria-label="帯の見本">
      <div className="bp-view">
        <div className="bp-page" style={props.side === 'left' ? { paddingLeft: pad } : { paddingRight: pad }}>
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} className="bp-line" style={{ width: `${[92, 78, 96, 60, 88, 70, 94, 82, 55, 90, 66][i]}%` }} />
          ))}
        </div>
        <div ref={holder} className="bp-band" style={{ visibility: props.enabled ? 'visible' : 'hidden' }} />
      </div>
      <div className="bp-scroll" />
    </div>
  );
}

function Settings() {
  const { loaded, settings } = useView();
  const [host, setHost] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (!loaded) return <main className="page narrow" aria-busy="true" />;

  const add = () => {
    const r = addDisabledHost(settings.disabledHosts, host);
    if (!r.ok) return setNotice({ kind: 'error', text: r.reason });
    void saveSettings({ disabledHosts: r.hosts });
    setHost('');
    setNotice({ kind: 'ok', text: '登録しました。開いているページは、再読み込みすると反映されます。' });
  };

  return (
    <main className="page narrow">
      <header>
        <h1>
          <Torch />
          設定
          <Torch />
        </h1>
      </header>

      {notice && (
        <p className={`flash ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      <section className="card">
        <h2>ゲームを動かさないサイト</h2>
        <form
          className="form-row"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label>
            <span className="small muted">サイト名</span>
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="example.com" autoComplete="off" spellCheck={false} />
          </label>
          <button type="submit" className="primary" disabled={host.trim() === ''}>
            追加
          </button>
        </form>
        {settings.disabledHosts.length === 0 ? (
          <p className="muted">登録しているサイトはありません。</p>
        ) : (
          <ul className="people">
            {settings.disabledHosts.map((h) => (
              <li key={h}>
                <span className="who">{h}</span>
                <span className="acts">
                  <button type="button" onClick={() => void saveSettings({ disabledHosts: removeDisabledHost(settings.disabledHosts, h) })}>
                    解除
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>帯の位置と大きさ</h2>
        <BandPreview
          side={settings.bandSide}
          width={settings.bandWidth}
          top={settings.bandTop}
          time={settings.bandTime}
          reserve={settings.reserveSpace}
          enabled={settings.effects}
        />
        <div className="form-grid">
          <label>
            <span className="small muted">帯を置く側</span>
            <select value={settings.bandSide} disabled={!settings.effects} onChange={(e) => void saveSettings({ bandSide: e.target.value === 'left' ? 'left' : 'right' })}>
              <option value="right">右（スクロールバーのそば）</option>
              <option value="left">左</option>
            </select>
          </label>
          <label>
            <span className="small muted">幅: {settings.bandWidth}px</span>
            <input
              type="range"
              min={BAND_WIDTH_MIN}
              max={BAND_WIDTH_MAX}
              step={BAND_WIDTH_STEP}
              value={settings.bandWidth}
              disabled={!settings.effects}
              onChange={(e) => void saveSettings({ bandWidth: Number(e.target.value) })}
            />
          </label>
          <label>
            <span className="small muted">上の余白: 画面の高さの {settings.bandTop}%</span>
            <input
              type="range"
              min={BAND_TOP_MIN}
              max={BAND_TOP_MAX}
              step={1}
              value={settings.bandTop}
              disabled={!settings.effects}
              onChange={(e) => void saveSettings({ bandTop: Number(e.target.value) })}
            />
          </label>
          <label>
            <span className="small muted">時間帯の演出（朝の光・夕焼け・夜の暗さ）</span>
            <select value={settings.bandTime} disabled={!settings.effects} onChange={(e) => void saveSettings({ bandTime: normalizeTimeMode(e.target.value) })}>
              {TIME_MODES.map((m) => (
                <option key={m} value={m}>
                  {TIME_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={!settings.effects}
          onClick={() => {
            const d = defaultBandLayout();
            void saveSettings({ bandSide: d.side, bandWidth: d.width, bandTop: d.top, bandTime: 'auto' });
          }}
        >
          位置・大きさ・演出を、初期設定に戻す
        </button>
      </section>

      <section className="card">
        <h2>表示</h2>
        <label className="toggle">
          <input type="checkbox" checked={settings.effects} onChange={(e) => void saveSettings({ effects: e.target.checked })} />
          画面右端の帯を表示する
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.reserveSpace}
            disabled={!settings.effects}
            onChange={(e) => void saveSettings({ reserveSpace: e.target.checked })}
          />
          帯の幅ぶん、帯のある側のページに余白を取る（サイトと重ならないようにする）
        </label>
      </section>
    </main>
  );
}

mount(<Settings />);
