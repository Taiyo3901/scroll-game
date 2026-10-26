import { useState } from 'react';
import { configFor } from '../config';
import {
  BAND_TOP_MAX,
  BAND_TOP_MIN,
  BAND_WIDTH_MAX,
  BAND_WIDTH_MIN,
  BAND_WIDTH_STEP,
  defaultBandLayout,
} from '../core/bandLayout';
import { TIME_MODES, TIME_MODE_LABELS, normalizeTimeMode } from '../core/timeband';
import { MAX_DISABLED_HOSTS, addDisabledHost, removeDisabledHost } from '../core/hosts';
import { clearDemoData, saveSettings } from '../storage';
import { mount } from '../ui/mount';
import { Torch } from '../ui/parts';
import { useView } from '../ui/store';

function Settings() {
  const { loaded, settings, state, demo } = useView();
  const [host, setHost] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (!loaded) return <main className="page narrow" aria-busy="true" />;

  const real = configFor(false);
  const demoCfg = configFor(true);

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
        <p className="small muted">
          登録したサイトでは、帯を出さず、スクロールも数えず、品も見つかりません。サブドメインも含みます（<code>example.com</code> を登録すると、<code>www.example.com</code> も無効です）。この一覧は、この端末にだけ保存し、外には送りません。
        </p>
        <form
          className="form-row"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label>
            <span className="small muted">サイト名（URL を貼ってもよい）</span>
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
        <p className="small muted">
          {settings.disabledHosts.length} / {MAX_DISABLED_HOSTS} 件。ポップアップの「このサイトでは、ゲームを動かさない」からも、登録できます。
        </p>
      </section>

      <section className="card">
        <h2>デモモード</h2>
        <p className="small muted">発表で、短い時間に見せるためのモードです。次のように変わります。</p>
        <ul className="small">
          <li>
            深さが {demoCfg.DEPTH_MULTIPLIER / real.DEPTH_MULTIPLIER} 倍の速さで進みます（階層が、すぐ変わります）。
          </li>
          <li>
            物色が {real.FIND_DURATION_SEC} 秒から {demoCfg.FIND_DURATION_SEC} 秒になります。
          </li>
          <li>宝箱とミミックが、出やすくなります。</li>
          <li>帯の上に「DEMO」と出ます。</li>
        </ul>
        <p>
          <strong>デモ中の記録は、本番のデータとは別に保存します。</strong>
          本番の図鑑やポイントは増えず、ランキングにも送りません。ランキングとフレンドの画面は、デモ中でも本番のデータです。
        </p>
        <label className="toggle">
          <input type="checkbox" checked={settings.demoMode} onChange={(e) => void saveSettings({ demoMode: e.target.checked })} />
          デモモードにする
        </label>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('デモ用の記録（深さ・図鑑・飾り棚）をすべて消して、最初からやり直します。本番のデータは消えません。よろしいですか？')) {
              void clearDemoData().then(() => setNotice({ kind: 'ok', text: 'デモのデータを消しました。' }));
            }
          }}
        >
          デモのデータを消して、最初から
        </button>
        {demo && <p className="small muted">いまのデモの深さ: {state.depthM.toFixed(0)} m</p>}
      </section>

      <section className="card">
        <h2>帯の位置と大きさ</h2>
        <p className="small muted">開いているページは、再読み込みしなくても、すぐに変わります。</p>
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
        <p className="small muted">「時刻に合わせる」は、この端末の時計を使います（朝 5〜10 時、昼 10〜16 時、夕方 16〜19 時、夜 19〜5 時。間はなめらかにつなぎます）。時刻は、保存も送信もしません。</p>
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
        <label className="toggle">
          <input type="checkbox" checked={settings.debugOverlay} onChange={(e) => void saveSettings({ debugOverlay: e.target.checked })} />
          デバッグ表示を出す（開発用）
        </label>
      </section>
    </main>
  );
}

mount(<Settings />);
