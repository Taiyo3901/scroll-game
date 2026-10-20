import { useEffect, useState } from 'react';
import { addDisabledHost, isHostDisabled, removeDisabledHost, type HostReply } from '../core/hosts';
import { CONFIG } from '../config';
import { areaAt, findItem } from '../core/catalog';
import { findsToday } from '../core/game';
import { JOB_MIN_FINDS, diagnoseJob, sumGenreFinds } from '../core/job';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import { saveSettings } from '../storage';
import { mount } from '../ui/mount';
import { ItemIcon, JobBadge, RARITY_LABEL } from '../ui/parts';
import { useView } from '../ui/store';

function openPage(file: string): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL(file) });
  window.close();
}

/**
 * 「このサイトで、ゲームを動かさない」の切り替え。いま開いているタブのサイト名は、そのタブの content script に尋ねる
 * （tabs 権限を増やさないため）。chrome:// など、content script が動かないページでは、使えない。
 */
function SiteToggle({ disabled }: { disabled: string[] }) {
  const [host, setHost] = useState<string | null | undefined>(undefined); // undefined: 確認中 / null: 使えないページ
  useEffect(() => {
    void (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id === undefined) return setHost(null);
        const reply = (await chrome.tabs.sendMessage(tab.id, { type: 'get-host' })) as HostReply | undefined;
        setHost(reply?.host ? reply.host : null);
      } catch {
        setHost(null);
      }
    })();
  }, []);

  if (host === undefined) return null;
  if (host === null) return <p className="muted small">このページでは、ゲームは動きません。</p>;

  const entry = disabled.find((d) => host === d || host.endsWith(`.${d}`));
  const off = isHostDisabled(host, disabled);
  return (
    <div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={off}
          onChange={(e) => {
            if (e.target.checked) {
              const r = addDisabledHost(disabled, host);
              if (r.ok) void saveSettings({ disabledHosts: r.hosts });
            } else if (entry) {
              void saveSettings({ disabledHosts: removeDisabledHost(disabled, entry) });
            }
          }}
        />
        このサイトでは、ゲームを動かさない
      </label>
      <p className="muted small">
        {host}
        {off && entry && entry !== host ? `（「${entry}」の登録によって、無効です）` : ''}
      </p>
    </div>
  );
}

function Popup() {
  const { loaded, state, settings, profile, now } = useView();
  const [effects, setEffects] = useState(true);
  useEffect(() => setEffects(settings.effects), [settings.effects]);
  if (!loaded) return <main className="popup-main" aria-busy="true" />;

  const area = areaAt(CATALOG.areas, state.depthM);
  const allFinds = sumGenreFinds(Object.values(state.days));
  const total = Object.values(allFinds).reduce((a, b) => a + b, 0);
  const found = CATALOG.items.filter((i) => (state.collection[i.id] ?? 0) > 0).length;
  const recent = [...state.events]
    .reverse()
    .map((e) => findItem(CATALOG, e.itemId))
    .filter((i) => i !== undefined)
    .slice(0, 3);

  return (
    <main className="popup-main">
      {settings.demoMode && (
        <button type="button" className="demo-banner" onClick={() => openPage('settings.html')}>
          デモモード中です（記録は本番に入りません）
        </button>
      )}
      {!profile.onboarded && (
        <button type="button" className="notice" onClick={() => openPage('welcome.html')}>
          はじめに：何を記録するかを確認する
        </button>
      )}

      <section className="status" style={{ borderLeftColor: area.color }}>
        <div className="depth">
          {state.depthM.toFixed(1)}
          <small> m</small>
        </div>
        <span className="chip" style={{ background: area.color }}>
          {area.name}
        </span>
      </section>

      <JobBadge
        job={diagnoseJob(allFinds, CATALOG.genres)}
        genres={CATALOG.genres}
        label="職業"
        need={Math.max(0, JOB_MIN_FINDS - total)}
      />

      <section>
        <h2>
          最近の発見 <small>今日 {findsToday(state, localDayKey(new Date(now)))}個</small>
        </h2>
        {recent.length === 0 ? (
          <p className="muted">ページをスクロールして止めると、品が見つかります。</p>
        ) : (
          <ul className="bag">
            {recent.map((item, i) => (
              <li key={`${item.id}-${i}`}>
                <ItemIcon itemId={item.id} found rarity={item.rarity} size="sm" />
                <span className={`stars r${item.rarity}`}>{RARITY_LABEL[item.rarity]}</span> {item.name}
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">
          図鑑 {found} / {CATALOG.items.length}　（1日の上限 {CONFIG.MAX_FINDS_PER_DAY}個）
        </p>
      </section>

      <nav className="links">
        <button type="button" onClick={() => openPage('collection.html')}>
          図鑑を開く
        </button>
        <button type="button" onClick={() => openPage('friends.html')}>
          ランキング
        </button>
        <button type="button" onClick={() => openPage('settings.html')}>
          設定
        </button>
      </nav>

      <SiteToggle disabled={settings.disabledHosts} />

      <label className="toggle">
        <input
          type="checkbox"
          checked={effects}
          onChange={(e) => {
            setEffects(e.target.checked); // 保存の完了を待たずに、チェックの見た目を切り替える
            void saveSettings({ effects: e.target.checked });
          }}
        />
        画面右端の演出を表示する
      </label>
    </main>
  );
}

mount(<Popup />);
