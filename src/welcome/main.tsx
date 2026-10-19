import { useState } from 'react';
import { GAME_NAME } from '../gameName';
import { loadProfile, saveProfile } from '../storage';
import { mount } from '../ui/mount';

function Welcome() {
  const [done, setDone] = useState(false);

  const confirm = async () => {
    const p = await loadProfile();
    await saveProfile({ ...p, onboarded: true });
    setDone(true);
  };

  return (
    <main className="page narrow">
      <h1>{GAME_NAME}へようこそ</h1>
      <p className="lead">
        いつものようにWebページを下へスクロールすると地面を掘り進み、スクロールを止めると鉱石が掘れるゲームです。
      </p>

      <div className="cols">
        <section className="card ok">
          <h2>記録するもの</h2>
          <ul>
            <li>スクロールした距離と、掘った回数</li>
            <li>集めた鉱石と、図鑑・標本棚の内容</li>
            <li>日ごと・週ごとの集計（回数、ポイント、距離）</li>
          </ul>
          <p className="small">すべてこのブラウザの中に保存します。</p>
        </section>
        <section className="card ng">
          <h2>記録しないもの</h2>
          <ul>
            <li>見たページのURL</li>
            <li>ページのタイトルや本文</li>
            <li>入力した内容</li>
          </ul>
          <p className="small">「同じ場所を2回掘らない」ための場所の記録は、メモリ上だけに持ち、保存しません。</p>
        </section>
      </div>

      <section className="card">
        <h2>これから先の予定</h2>
        <p>
          フレンドやランキングを使うときだけ、Googleでログインします。そのとき外に送るのは、ニックネーム、フレンドの情報、図鑑の所持数、標本棚、週の集計だけです。ログインしなくても、ゲームはそのまま遊べます。
        </p>
      </section>

      <div className="actions">
        {done ? (
          <p className="done" role="status">
            確認しました。このページは閉じて大丈夫です。ページをスクロールして遊んでみてください。
          </p>
        ) : (
          <button type="button" className="primary" onClick={() => void confirm()}>
            わかった、はじめる
          </button>
        )}
      </div>
    </main>
  );
}

mount(<Welcome />);
