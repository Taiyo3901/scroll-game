import { useEffect, useState } from 'react';
import { addDisabledHost, isHostDisabled, removeDisabledHost, type HostReply } from '../core/hosts';
import { areaAt, findItem } from '../core/catalog';
import { findsToday } from '../core/game';
import { JOB_MIN_FINDS, diagnoseJob, sumGenreFinds } from '../core/job';
import { localDayKey } from '../core/week';
import { CATALOG } from '../data';
import { saveSettings } from '../storage';
import { mount } from '../ui/mount';
import { Avatar, ItemIcon, JobBadge, RARITY_LABEL } from '../ui/parts';
import { useAccount, useView } from '../ui/store';

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
  if (host === null) return null;

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
  const { loaded, state, settings, now } = useView();
  const account = useAccount();
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
          <p className="muted">まだありません。</p>
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
          図鑑 {found} / {CATALOG.items.length}
        </p>
      </section>

      <nav className="links">
        <button type="button" onClick={() => openPage('collection.html')}>
          図鑑を開く
        </button>
        <button type="button" onClick={() => openPage('friends.html')}>
          ランキング
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

      <div className="popup-foot">
        {account ? (
          <button type="button" className="avatar-btn" onClick={() => openPage('friends.html')} aria-label={`${account.nickname}（ランキング・フレンドを開く）`} title={account.nickname}>
            <Avatar url={account.photoUrl} name={account.nickname} size={30} />
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="gear" onClick={() => openPage('settings.html')} aria-label="設定を開く" title="設定">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </div>
    </main>
  );
}

mount(<Popup />);
