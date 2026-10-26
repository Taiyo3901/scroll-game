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
import { Avatar, Torch } from '../ui/parts';
import { Ranking } from './Ranking';
import { useAccount, useView } from '../ui/store';

type Stage = 'loading' | 'unconfigured' | 'signed-out' | 'no-profile' | 'ready' | 'error';
type Tab = 'ranking' | 'friends';

/** 失敗の理由を、利用者向けの文にする。 */
function messageOf(e: unknown): string {
  if (e instanceof FriendError) return e.message;
  if (e instanceof NotConfiguredError) return 'Firebase が未設定。README の手順で設定すること。';
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code.includes('permission-denied')) {
    const step = stepOf(e);
    const where = step ? `（${STEP_LABELS[step]}）` : '';
    return `操作が拒否された${where}。再ログインするか、Firestore のルールが最新か（README の手順 4）を確認すること。`;
  }
  if (code.includes('unavailable') || code.includes('network')) return '通信に失敗。ネットワークを確認して再試行すること。';
  if (e instanceof Error && /canceled|cancelled|did not approve|closed/i.test(e.message)) return 'ログインを取り消した。';
  return `処理に失敗。再試行すること。${code ? `（${code}）` : ''}`;
}

function FriendsPage() {
  // ランキングとフレンドは、デモモード中でも、いつも本番のデータで動く
  const { loaded, state, profile, settings } = useView({ real: true });
  const account = useAccount();
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
      return '公開設定を保存';
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
          <h2>フレンド機能は利用不可</h2>
          <p>Firebase が未設定。README の「フレンド機能の準備」に従って設定し、再ビルドすること。</p>
        </section>
      )}

      {stage === 'error' && (
        <section className="card">
          <h2>読み込み失敗</h2>
          <p>ログイン状態は維持。通信を確認して再試行すること。</p>
          <button type="button" className="primary" disabled={busy} onClick={() => void run(async () => undefined)}>
            再読み込み
          </button>
          <button type="button" disabled={busy} onClick={() => void run(async () => void (await signOutAll()))}>
            ログアウト
          </button>
        </section>
      )}

      {stage === 'signed-out' && (
        <section className="card">
          <h2>ログイン</h2>
          <p>Googleアカウントでログインする。他者に公開されるのはニックネームのみ。名前・メールアドレス・アイコンは公開されない。</p>
          <button type="button" className="primary" disabled={busy} onClick={() => void login()}>
            Googleでログイン
          </button>
        </section>
      )}

      {stage === 'no-profile' && (
        <section className="card">
          <h2>ニックネームの設定</h2>
          <p>フレンドに表示される名前（{NICKNAME_MAX}文字まで）。後から変更可能。</p>
          <form
            className="form-row"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await createMyProfile(nickname);
                await syncNow(true);
                return 'プロフィール作成完了';
              });
            }}
          >
            <label>
              <span className="small muted">ニックネーム</span>
              <input value={nickname} maxLength={NICKNAME_MAX * 2} onChange={(e) => setNickname(e.target.value)} autoFocus />
            </label>
            <button type="submit" className="primary" disabled={busy}>
              決定
            </button>
          </form>
          <button type="button" disabled={busy} onClick={() => void run(async () => void (await signOutAll()))}>
            ログアウト
          </button>
        </section>
      )}

      {stage === 'ready' && overview && (
        <>
          <p className="me-line">
            <Avatar url={account?.photoUrl} name={overview.me.nickname} size={30} />
            <span>{overview.me.nickname}</span>
          </p>
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

          {tab === 'ranking' && <Ranking overview={overview} state={state} photoUrl={account?.photoUrl} busy={busy} onReload={() => void run(async () => void (await syncNow()))} />}

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
                  .then(() => say('ok', 'コードをコピーした。'))
              }
            >
              コピー
            </button>

            <h2>ニックネーム</h2>
            <form
              className="form-row"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await changeNickname(nickname);
                  return 'ニックネーム変更完了';
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
            <h2>フレンドへの公開内容</h2>
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
                    {diagnoseJob(preview.genreFinds ?? {}, CATALOG.genres)?.name ?? '未診断'}
                  </li>
                </>
              ) : (
                <li className="muted">図鑑・飾り棚・職業は非公開</li>
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
                  return r === 'accepted' ? '相手の申請を承認。フレンド成立。' : '申請を送信。相手の承認待ち。';
                });
              }}
            >
              <label>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" aria-label="相手のフレンドコード" autoComplete="off" spellCheck={false} />
              </label>
              <button type="submit" className="primary" disabled={busy || code.trim() === ''}>
                申請
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
                        <button type="button" className="primary" disabled={busy} onClick={() => void run(async () => (await respondToRequest(r, true), '承認完了'))}>
                          承認
                        </button>
                        <button type="button" disabled={busy} onClick={() => void run(async () => (await respondToRequest(r, false), '拒否完了'))}>
                          拒否
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
                      <span className="who muted">{r.status === 'declined' ? '拒否された' : '返答待ち'}</span>
                      <span className="acts">
                        <button type="button" disabled={busy} onClick={() => void run(async () => (await cancelRequest(r), '削除完了'))}>
                          {r.status === 'declined' ? '削除' : '取り消し'}
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
            {overview.waiting > 0 && <p className="small muted">相手側の反映待ち: {overview.waiting}人。時間をおいて再度開くこと。</p>}
            {overview.friends.length === 0 ? (
              <p className="muted">フレンドなし</p>
            ) : (
              <ul className="people">
                {overview.friends.map((f) => (
                  <li key={f.uid}>
                    <span className="who">
                      {f.nickname}
                      {f.suspicious && (
                        <span className="warn" title="上限を超える値を検出">
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
                          if (window.confirm(`${f.nickname} とのフレンドを解除する。よろしいか？`)) {
                            void run(async () => (await removeFriend(f.uid), 'フレンド解除完了'));
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
            <p className="small muted">{lastSync ? `最終同期: ${new Date(lastSync).toLocaleString('ja-JP')}` : '未同期'}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(async () => ((await syncNow(true)) === 'synced' ? '同期完了' : '同期対象なし'))}
            >
              同期
            </button>
            <button type="button" disabled={busy} onClick={() => void run(async () => void (await signOutAll()))}>
              ログアウト
            </button>
            <h2>アカウントの削除</h2>
            <p className="small muted">
              Firebase 上の自分のデータ（ニックネーム、フレンドコード、フレンド一覧、申請、同期済みの集計）を全て削除する。この端末のゲームデータ（図鑑など）は削除されない。
            </p>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm('アカウントを削除する。フレンド関係も消え、元に戻せない。よろしいか？')) {
                  void run(async () => (await deleteMyAccount(), 'アカウント削除完了'));
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
