import { useState } from 'react';
import { GAME_NAME } from '../gameName';
import { loadProfile, saveProfile } from '../storage';
import { mount } from '../ui/mount';
import { Torch } from '../ui/parts';

function Welcome() {
  const [done, setDone] = useState(false);

  const confirm = async () => {
    const p = await loadProfile();
    await saveProfile({ ...p, onboarded: true });
    setDone(true);
  };

  return (
    <main className="page narrow">
      <h1>
        <Torch />
        {GAME_NAME}へようこそ
        <Torch />
      </h1>
      <p className="lead">
        いつものようにWebページを下へスクロールすると迷宮を降り、スクロールを止めると、いま見ているサイトにまつわる品が見つかるゲームです。操作や管理は要りません。
      </p>

      <div className="cols">
        <section className="card ok">
          <h2>記録するもの</h2>
          <ul>
            <li>スクロールした距離と、見つけた回数</li>
            <li>見つけた品と、図鑑・飾り棚の内容</li>
            <li>サイトの「種類」（劇場・酒場・書庫など）ごとの発見数</li>
            <li>日ごと・週ごとの集計（回数、ポイント、距離）</li>
          </ul>
          <p className="small">すべてこのブラウザの中に保存します。</p>
        </section>
        <section className="card ng">
          <h2>記録しないもの</h2>
          <ul>
            <li>見たページのURLやサイト名（ホスト名）</li>
            <li>ページのタイトルや本文</li>
            <li>入力した内容</li>
          </ul>
          <p className="small">
            サイトの種類は、ページを開いている間だけ端末の中で判定し、「種類」だけを残します。どのサイトを見たかは残りません。
          </p>
        </section>
      </div>

      <section className="card">
        <h2>フレンド機能（使うときだけ）</h2>
        <p>
          フレンドやランキングを使うときだけ、Googleでログインします。そのとき外（Firebase）に送るのは、ニックネーム、フレンドコード、フレンドの一覧、今週のポイントと発見数、そしてあなたが公開を選んだもの（図鑑・飾り棚・部屋の分布）だけです。公開は、初期設定では<strong>しません</strong>。ログインしなくても、ゲームはそのまま遊べます。
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
