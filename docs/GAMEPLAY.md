# <img src="images/icons/sword.png" width="28" height="28" align="absmiddle" alt=""> 遊び方の詳細

[← README に戻る](../README.md)

## 基本の流れ

1. **下にスクロールする。** 迷宮を降りて、深さが増えます。
2. **止める。** 1秒たつと、入れ物が1つ現れます。
3. **物色する。** 探索者が、約4秒かけて、入れ物をあさります。
4. **品が見つかる。** そのまま図鑑に入ります。

深さは、1000px のスクロールで、約 26m 増えます。

> [!IMPORTANT]
> 見つかる品は、**1回の立ち止まりにつき1つ**です。<br>
> 止まり続けても増えません。もう一度スクロールしてから止まると、次の入れ物が現れます。<br>
> 1日の発見数の上限は、300個です。

## <img src="images/icons/chest.png" width="28" height="28" align="absmiddle" alt=""> 入れ物

| | 入れ物 | 確率 | 特徴 |
|:-:|---|--:|---|
| <img src="images/icons/pot.png" width="28" height="28" align="absmiddle" alt=""> | 壺 | 45% | ★1が出やすい |
| <img src="images/icons/room-other.png" width="28" height="28" align="absmiddle" alt=""> | 箱 | 40% | ふつう |
| <img src="images/icons/chest.png" width="28" height="28" align="absmiddle" alt=""> | 宝箱 | 15% | ★3が出やすい |
| <img src="images/icons/mimic.png" width="28" height="28" align="absmiddle" alt=""> | ミミック | 宝箱の12% | 専用の戦利品 |

- 壺・宝箱・ミミックの見た目は、**階層**ごとに変わります。
- 箱の見た目は、**部屋**（サイトの種類）ごとに変わります。
- 階層は、深さ 0・50・150・400・800・1500m で変わります。
- 深い階層ほど、★2・★3が出やすくなります。
- 入れ物ごとの倍率は、全体で見ると、レア度の出方がほぼ変わらない値です。

## 見つかる品

| 種類 | 数 | 内容 |
|---|--:|---|
| 部屋の品 | 66 | 部屋ごとに6種（★1が3、★2が2、★3が1） |
| 階層の秘宝 | 6 | 階層ごとに1つ。約3%の確率 |
| ミミックの戦利品 | 4 | 宝箱に化けた魔物から |

ポイントは、★1 が **1点**、★2 が **3点**、★3 が **10点** です。

### なじみ具合

同じ品を何度も見つけると、図鑑のカードの枠と印が変わります。

| 所持数 | 印 | 枠 |
|--:|---|---|
| 3個 | 見慣れた | 銅 |
| 10個 | 使い込んだ | 銀 |
| 30個 | 極めた | 金 |
| 100個 | 伝説の | 虹 |

## 部屋（サイトの種類）

ページのホスト名を、端末の中で辞書と照合して、部屋を決めます。

| | 部屋 | サイト | 職業 |
|:-:|---|---|---|
| <img src="images/icons/room-video.png" width="28" height="28" align="absmiddle" alt=""> | 劇場 | 動画・配信 | 踊り子 |
| <img src="images/icons/room-sns.png" width="28" height="28" align="absmiddle" alt=""> | 酒場 | SNS・掲示板 | 遊び人 |
| <img src="images/icons/room-news.png" width="28" height="28" align="absmiddle" alt=""> | 情報屋 | ニュース・ブログ | 斥候 |
| <img src="images/icons/room-study.png" width="28" height="28" align="absmiddle" alt=""> | 書庫 | 辞書・学習・技術文書 | 賢者 |
| <img src="images/icons/room-shop.png" width="28" height="28" align="absmiddle" alt=""> | 道具屋 | 買い物 | 商人 |
| <img src="images/icons/room-dev.png" width="28" height="28" align="absmiddle" alt=""> | 工房 | コード・開発者向け | 錬金術師 |
| <img src="images/icons/room-game.png" width="28" height="28" align="absmiddle" alt=""> | 闘技場 | ゲーム・攻略 | 戦士 |
| <img src="images/icons/room-music.png" width="28" height="28" align="absmiddle" alt=""> | 音楽堂 | 音楽 | 吟遊詩人 |
| <img src="images/icons/room-travel.png" width="28" height="28" align="absmiddle" alt=""> | 宿場町 | 地図・旅行・乗換案内 | 旅人 |
| <img src="images/icons/room-work.png" width="28" height="28" align="absmiddle" alt=""> | ギルド | メール・カレンダー・仕事 | 騎士 |
| <img src="images/icons/room-other.png" width="28" height="28" align="absmiddle" alt=""> | 未踏の地 | 上のどれでもないサイト | 放浪者 |

## <img src="images/icons/tome.png" width="28" height="28" align="absmiddle" alt=""> 職業の決まり方

見つけた品が5個たまると、診断されます。<br>
上から順に、当てはまったものになります。

1. **組み合わせの職業**<br>
   上位2つの部屋が、それぞれ3割以上のとき。<br>
   例: 工房 + 書庫 = **魔導技師**
2. **部屋の職業**<br>
   1つの部屋が、4割以上のとき。
3. **勇者**<br>
   どちらでもないとき。

- 1つの部屋が4割以上でも、2位が3割以上なら、組み合わせが優先です。
- 「未踏の地」は、組み合わせに入りません。
- 組み合わせの職業の見た目は、2つの職業を合わせたものです。
  - 先の部屋の職業から、髪・帽子・持ち物
  - 後の部屋の職業から、服・背中・盾

<p align="center">
<img src="images/icons/hero-hero.png" width="56" height="56" align="absmiddle" alt=""> <img src="images/icons/hero-warrior.png" width="68" height="68" align="absmiddle" alt=""> <img src="images/icons/hero-knight.png" width="56" height="56" align="absmiddle" alt=""> <img src="images/icons/hero-sage.png" width="68" height="68" align="absmiddle" alt=""> <img src="images/icons/hero-alchemist.png" width="56" height="56" align="absmiddle" alt=""> <img src="images/icons/hero-scout.png" width="68" height="68" align="absmiddle" alt=""> <img src="images/icons/hero-dancer.png" width="56" height="56" align="absmiddle" alt=""> <img src="images/icons/hero-jester.png" width="68" height="68" align="absmiddle" alt=""> <img src="images/icons/hero-merchant.png" width="56" height="56" align="absmiddle" alt=""> <img src="images/icons/hero-bard.png" width="68" height="68" align="absmiddle" alt=""> <img src="images/icons/hero-traveler.png" width="56" height="56" align="absmiddle" alt=""> <img src="images/icons/hero-wanderer.png" width="68" height="68" align="absmiddle" alt="">
</p>

<details>
<summary><b>組み合わせの職業の一覧（45通り）</b></summary>

<br>

<img src="images/hero-sheet-combos.png" alt="組み合わせの職業の一覧" width="760">

| 部屋の組み合わせ | 職業 |
|---|---|
| 劇場 + 酒場 | 芸人 |
| 劇場 + 情報屋 | 実況者 |
| 劇場 + 書庫 | 講談師 |
| 劇場 + 道具屋 | 興行師 |
| 劇場 + 工房 | 幻灯技師 |
| 劇場 + 闘技場 | 剣舞士 |
| 劇場 + 音楽堂 | 歌姫 |
| 劇場 + 宿場町 | 旅芸人 |
| 劇場 + ギルド | 舞台監督 |
| 酒場 + 情報屋 | 噂屋 |
| 酒場 + 書庫 | 論客 |
| 酒場 + 道具屋 | 客引き |
| 酒場 + 工房 | ハッカー |
| 酒場 + 闘技場 | 挑戦者 |
| 酒場 + 音楽堂 | 酒場の歌い手 |
| 酒場 + 宿場町 | 渡り鳥 |
| 酒場 + ギルド | 世話役 |
| 情報屋 + 書庫 | 調査官 |
| 情報屋 + 道具屋 | 情報商人 |
| 情報屋 + 工房 | 解析官 |
| 情報屋 + 闘技場 | 戦場記者 |
| 情報屋 + 音楽堂 | 評論家 |
| 情報屋 + 宿場町 | 冒険記者 |
| 情報屋 + ギルド | 書記官 |
| 書庫 + 道具屋 | 古書商 |
| 書庫 + 工房 | 魔導技師 |
| 書庫 + 闘技場 | 軍師 |
| 書庫 + 音楽堂 | 楽聖 |
| 書庫 + 宿場町 | 探検学者 |
| 書庫 + ギルド | 宮廷学士 |
| 道具屋 + 工房 | 発明商 |
| 道具屋 + 闘技場 | 武器商人 |
| 道具屋 + 音楽堂 | 楽器商 |
| 道具屋 + 宿場町 | 行商人 |
| 道具屋 + ギルド | 交易官 |
| 工房 + 闘技場 | 機械兵 |
| 工房 + 音楽堂 | 音響技師 |
| 工房 + 宿場町 | 測量技師 |
| 工房 + ギルド | 設計官 |
| 闘技場 + 音楽堂 | 戦歌士 |
| 闘技場 + 宿場町 | 傭兵 |
| 闘技場 + ギルド | 近衛兵 |
| 音楽堂 + 宿場町 | 旅の楽士 |
| 音楽堂 + ギルド | 宮廷楽士 |
| 宿場町 + ギルド | 伝令官 |

</details>

## <img src="images/icons/torch.png" width="28" height="28" align="absmiddle" alt=""> 右端の帯

画面の右端（スクロールバーのすぐ左）に出る、細い帯です。

- **探索者**<br>
  診断された職業の見た目です。ページを読み進めるほど、帯の上から下へ降ります。
- **ゲージ**<br>
  物色の進みに合わせて、6つの目盛りが点きます。
- **壁**<br>
  サイトの種類で絵が変わります。劇場は赤いカーテン、書庫は本棚、工房は回路のタイルです。
- **深さによる変化**<br>
  100m ごとに、壁の色と飾りが、なめらかに移ります。<br>
  土と根 → 水と苔 → 坑道の梁 → 水晶 → 溶岩 → 深い闇の順で、600m でひと回りします。
- **目印**<br>
  品を見つけた場所に、開けた入れ物の小さな絵が残ります。<br>
  深く進むと、壁といっしょに上へ流れて、帯から出ると消えます。保存はしません。
- **時間帯の演出**<br>
  端末の時計に合わせて、朝は暖かい光、夕方は夕焼け、夜は青く暗くなります。夜は、松明が明るく燃えます。<br>
  時刻は、保存も送信もしません。
- **位置と幅**<br>
  左右の位置、幅（56〜104px）、上の余白を、設定で変えられます。
- **ページの余白**<br>
  帯と重ならないよう、帯を置いた側のページに、帯の幅ぶんの余白を取ります。設定でオフにできます。

> [!TIP]
> OS の「視覚効果を減らす」がオンのときは、色を混ぜずに、200m ごとに切り替えます。

## ランキング

- 順位は、**今週のポイントの合計**だけで決まります。
- 週は、月曜0時に始まります。
- 深さやスクロールの量では、順位をつけません。
- フレンドは、公開設定で「見せる」にした内容だけ見られます。
