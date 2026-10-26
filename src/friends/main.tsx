import { useCallback, useEffect, useMemo, useState } from 'react';
import { diagnoseJob } from '../core/job';
import { NICKNAME_MAX, formatFriendCode, type FriendRequest } from '../core/friends';
import { buildPublicFields, type ShareSettings } from '../core/publicProfile';
import { isoWeekId } from '../core/week';
import { CATALOG } from '../data';
import {
  FriendError,
  LIMITS,
  cancelRequest,
  changeNickname,
  createMyProfile,
  deleteMyAccount,
  getMyProfile,
  loadFriendsOverview,
  removeFriend,
  respondToRequest,
  sendFriendRequest,
  type FriendsOverview,
} from '../firebase/account';
import { NotConfiguredError } from '../firebase/app';
import { currentUser, signInWithGoogle, signOutAll } from '../firebase/auth';
import { isFirebaseConfigured } from '../firebase/config';
import { STEP_LABELS, stepOf } from '../firebase/step';
import { syncNow } from '../firebase/sync';
import { loadSync, saveSettings } from '../storage';
import { mount } from '../ui/mount';
import { Torch } from '../ui/parts';
import { Ranking } from './Ranking';
import { useView } from '../ui/store';

type Stage = 'loading' | 'unconfigured' | 'signed-out' | 'no-profile' | 'ready' | 'error';
type Tab = 'ranking' | 'friends';

/** 失敗の理由を、利用者向けの文にする。 */
function messageOf(e: unknown): string {
  if (e instanceof FriendError) return e.message;
  if (e instanceof NotConfiguredError) return 'Firebase が設定されていません。README の手順で設定してください。';
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code.includes('permission-denied')) {
    const step = stepOf(e);
    const where = step ? `（${STEP_LABELS[step]}で拒否されました）` : '';
    return `この操作は許可されていません${where}。ログインし直すか、Firestore のルールが最新か（README の手順 4）を確認してください。`;
  }
  if (code.includes('unavailable') || code.includes('network')) return '通信できませんでした。ネットワークを確認して、もう一度試してください。';
  if (e instanceof Error && /canceled|cancelled|did not approve|closed/i.test(e.message)) return 'ログインが取り消されました。';
  return `うまくいきませんでした。もう一度試してください。${code ? `（${code}）` : ''}`;
}

function FriendsPage() {
  // ランキングとフレンドは、デモモード中でも、いつも本番のデータで動く
  const { loaded, state, profile, settings } = useView({ real: true });
  const [stage, setStage] = useState<Stage>('loading');
  const [overview, setOverview] = useState<FriendsOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('ranking');

  const say = (kind: 'ok' | 'error', text: string) => setNotice({ kind, text });

  const refresh = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      setStage('unconfigured');
      return;
    }
    try {
      const user = await currentUser();
      if (!user) {
        setStage('signed-out');
        return;
      }
      const o = await loadFriendsOverview();
      if (!o) {
        setStage('no-profile');
        return;
      }
      setOverview(o);
      setNickname(o.me.nickname);
      setStage('ready');
      setLastSync((await loadSync())?.at ?? null);
    } catch (e) {
      // 通信の失敗などで読み込めなかっただけなら、ログアウト扱いにしない（前の内容が残っていれば、それを見せたままにする）
      say('error', messageOf(e));
      setStage((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 操作を実行して、結果を表示し、画面を読み込み直す。 */
  const run = async (task: () => Promise<string | void>) => {
    setBusy(true);
    setNotice(null);
    try {
      const ok = await task();
      if (ok) say('ok', ok);
    } catch (e) {
      say('error', messageOf(e));
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const login = () =>
    run(async () => {
      await signInWithGoogle();
      const me = await getMyProfile();
      if (me) await syncNow(true);
    });

  const saveShare = (share: ShareSettings) =>
    run(async () => {
      await saveSettings({ share });
      await syncNow(true); // 見せない設定にしたものを、すぐ Firestore から消す
      return '公開設定を保存しました。';
    });

  const week = isoWeekId(new Date());
  const preview = useMemo(
    () => buildPublicFields({ state, profile, share: settings.share, catalog: CATALOG, now: new Date(), limits: LIMITS }),
    [state, profile, settings.share],
  );

  if (!loaded || stage === 'loading') return <main className="page narrow" aria-busy="true" />;

  return (
    <main className="page narrow">
      <header>
        <h1>
          <Torch />
          ランキング・フレンド
          <Torch />
        </h1>
      </header>

      {notice && (
        <p className={`flash ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      {stage === 'unconfigured' && (
        <section className="card">
          <h2>この拡張機能では、フレンド機能がまだ使えません</h2>
          <p>Firebase の設定がありません。README の「フレンド機能の準備」の手順で、設定してからビルドし直してください。</p>
        </section>
      )}

      {stage === 'error' && (
        <section className="card">
          <h2>読み込めませんでした</h2>
          <p>ログインはしたままです。通信を確認して、もう一度試してください。</p>
          <button type="button" className="primary" disabled={busy} onClick={() => void run(async () => undefined)}>
            もう一度読み込む
          </button>
          <button type="button" disabled={busy} onClick={() => void run(async () => void (await signOutAll()))}>
            ログアウトする
          </button>
        </section>
      )}

      {stage === 'signed-out' && (
        <section className="card">
          <h2>ログイン</h2>
          <p>Googleアカウントでログインします。他の人に見えるのはニックネームだけで、名前・メールアドレス・アイコンは見えません。</p>
          <p className="small muted">
            Firebase に送るのは、ニックネーム、フレンドコード、フレンドの一覧、今週のポイントと発見数、そして公開設定で許したもの（図鑑・飾り棚・部屋の分布）だけです。見たページのURL・サイト名・本文は送りません。
          </p>
          <button type="button" className="primary" disabled={busy} onClick={() => void login()}>
            Googleでログイン
          </button>
        </section>
      )}

      {stage === 'no-profile' && (
        <section className="card">
          <h2>ニックネームを決める</h2>
          <p>フレンドに見える名前です（{NICKNAME_MAX}文字まで）。あとで変えられます。</p>
          <form
            className="form-row"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await createMyProfile(nickname);
                await syncNow(true);
                return 'プロフィールを作りました。';
              });
            }}
          >
            <label>
              <span className="small muted">ニックネーム</span>
              <input value={nickname} maxLength={NICKNAME_MAX * 2} onChange={(e) => setNickname(e.target.value)} autoFocus />
            </label>
            <button type="submit" className="primary" disabled={busy}>
              決定する
            </button>
          </form>
          <button type="button" disabled={busy} onClick={() => void run(async () => void (await signOutAll()))}>
            やめてログアウトする
          </button>
        </section>
      )}

      {stage === 'ready' && overview && (
        <>
          <div role="tablist" className="tabs sub-tabs">
            {(
              [
                ['ranking', 'ランキング'],
                ['friends', 'フレンド・アカウント'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'ranking' && <Ranking overview={overview} state={state} busy={busy} onReload={() => void run(async () => void (await syncNow()))} />}

          {tab === 'friends' && (
          <>
          <section className="card">
            <h2>あなたのフレンドコード</h2>
            <p className="code">{formatFriendCode(overview.me.friendCode)}</p>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard
                  .writeText(formatFriendCode(overview.me.friendCode))
                  .then(() => say('ok', 'コードをコピーしました。フレンドに伝えてください。'))
              }
            >
              コピーする
            </button>

            <h2>ニックネーム</h2>
            <form
              className="form-row"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await changeNickname(nickname);
                  return 'ニックネームを変えました。';
                });
              }}
            >
              <input aria-label="ニックネーム" value={nickname} maxLength={NICKNAME_MAX * 2} onChange={(e) => setNickname(e.target.value)} />
              <button type="submit" disabled={busy || nickname === overview.me.nickname}>
                変更
              </button>
            </form>
          </section>

          <section className="card">
            <h2>フレンドに見せる範囲</h2>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.share.enabled}
                disabled={busy}
                onChange={(e) => void saveShare({ ...settings.share, enabled: e.target.checked })}
              />
              図鑑・飾り棚・部屋の分布（職業）をフレンドに見せる
            </label>
            {settings.share.enabled && (
              <fieldset className="hide-list">
                <legend className="small muted">見せない部屋</legend>
                {CATALOG.genres.map((g) => (
                  <label key={g.id} className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.share.hiddenGenres.includes(g.id)}
                      disabled={busy}
                      onChange={(e) =>
                        void saveShare({
                          ...settings.share,
                          hiddenGenres: e.target.checked
                            ? [...settings.share.hiddenGenres, g.id]
                            : settings.share.hiddenGenres.filter((x) => x !== g.id),
                        })
                      }
                    />
                    {g.name}
                  </label>
                ))}
              </fieldset>
            )}
            <h2>フレンドからは、こう見えます</h2>
            <ul className="preview">
              <li>
                ニックネーム: <strong>{overview.me.nickname}</strong>
              </li>
              <li>
                今週（{week}）: {preview.weekly.points}点・{preview.weekly.finds}個発見
              </li>
              {preview.shared ? (
                <>
                  <li>図鑑: {Object.keys(preview.collection ?? {}).length} 種類の発見品</li>
                  <li>飾り棚: {preview.showcase?.length ?? 0} 個</li>
                  <li>
                    職業:{' '}
                    {diagnoseJob(preview.genreFinds ?? {}, CATALOG.genres)?.name ?? 'まだ診断されません'}
                  </li>
                </>
              ) : (
                <li className="muted">図鑑・飾り棚・職業は、見えません。</li>
              )}
            </ul>
          </section>

          <section className="card">
            <h2>フレンド申請</h2>
            <form
              className="form-row"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const r = await sendFriendRequest(code);
                  setCode('');
                  return r === 'accepted' ? '相手からの申請を承認しました。フレンドになりました。' : '申請を送りました。相手の承認を待ちます。';
                });
              }}
            >
              <label>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" aria-label="相手のフレンドコード" autoComplete="off" spellCheck={false} />
              </label>
              <button type="submit" className="primary" disabled={busy || code.trim() === ''}>
                申請する
              </button>
            </form>

            {overview.requests.incoming.length > 0 && (
              <>
                <h2>届いた申請</h2>
                <ul className="people">
                  {overview.requests.incoming.map((r: FriendRequest) => (
                    <li key={r.id}>
                      <span className="who">{r.fromNickname || '（名前なし）'}</span>
                      <span className="acts">
                        <button type="button" className="primary" disabled={busy} onClick={() => void run(async () => (await respondToRequest(r, true), '承認しました。'))}>
                          承認
                        </button>
                        <button type="button" disabled={busy} onClick={() => void run(async () => (await respondToRequest(r, false), '断りました。'))}>
                          断る
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {overview.requests.outgoing.length + overview.requests.declined.length > 0 && (
              <>
                <h2>送った申請</h2>
                <ul className="people">
                  {[...overview.requests.outgoing, ...overview.requests.declined].map((r) => (
                    <li key={r.id}>
                      <span className="who muted">{r.status === 'declined' ? '断られました' : '返事を待っています'}</span>
                      <span className="acts">
                        <button type="button" disabled={busy} onClick={() => void run(async () => (await cancelRequest(r), '片づけました。'))}>
                          {r.status === 'declined' ? '片づける' : '取り消す'}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card">
            <h2>
              フレンド <small>{overview.friends.length}人</small>
            </h2>
            {overview.waiting > 0 && <p className="small muted">相手側の反映を待っている人が{overview.waiting}人います。少ししてから、開き直してください。</p>}
            {overview.friends.length === 0 ? (
              <p className="muted">まだフレンドがいません。</p>
            ) : (
              <ul className="people">
                {overview.friends.map((f) => (
                  <li key={f.uid}>
                    <span className="who">
                      {f.nickname}
                      {f.suspicious && (
                        <span className="warn" title="上限を超える不自然な値が含まれています">
                          {' '}
                          ⚠
                        </span>
                      )}
                      <small className="muted">
                        {f.weekly?.weekId === week && `　今週 ${f.weekly.points}点`}
                      </small>
                    </span>
                    <span className="acts">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`${f.nickname} さんとのフレンドを解除します。よろしいですか？`)) {
                            void run(async () => (await removeFriend(f.uid), 'フレンドを解除しました。'));
                          }
                        }}
                      >
                        解除
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>同期とアカウント</h2>
            <p className="small muted">{lastSync ? `最後に送った時刻: ${new Date(lastSync).toLocaleString('ja-JP')}` : 'まだ送っていません。'}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(async () => ((await syncNow(true)) === 'synced' ? '送りました。' : '送る内容がありませんでした。'))}
            >
              今すぐ送る
            </button>
            <button type="button" disabled={busy} onClick={() => void run(async () => void (await signOutAll()))}>
              ログアウト
            </button>
            <h2>アカウントの削除</h2>
            <p className="small muted">
              Firebase 上のあなたのデータ（ニックネーム、フレンドコード、フレンドの一覧、申請、送った集計）をすべて消します。この端末のゲームのデータ（図鑑など）は消えません。
            </p>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm('アカウントを削除します。フレンドの関係も消え、元に戻せません。よろしいですか？')) {
                  void run(async () => (await deleteMyAccount(), 'アカウントを削除しました。'));
                }
              }}
            >
              アカウントを削除する
            </button>
          </section>
          </>
          )}
        </>
      )}
    </main>
  );
}

mount(<FriendsPage />);
