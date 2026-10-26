import { CONFIG } from '../../config';
import { BAND_TOP_DEFAULT, STAGE_WIDTH_PX, TRACK_OUTER_PX, trackInset } from '../../core/bandLayout';
import { CELL_PX, WALL_TILE_PX } from './wall';

/** 石壁の左端を、ドット絵のように階段状にギザギザにする（毎回同じ形にするため疑似乱数は固定）。 */
function stairEdge(mirror: boolean): string {
  // 左側に置くときは、左右を入れ替える（階段状の縁が、右側になる）
  const X = (v: number) => (mirror ? `calc(100% - ${v}px)` : `${v}px`);
  const far = mirror ? '0px' : '100%';
  const pts: string[] = [`${X(8)} 0`];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let prev = 8;
  for (let y = 0; y < 100; y += 2) {
    const x = Math.round(rnd() * 3) * CELL_PX * 2; // 0, 4, 8, 12px
    pts.push(`${X(prev)} ${y}%`, `${X(x)} ${y}%`);
    prev = x;
  }
  pts.push(`${X(prev)} 100%`, `${far} 100%`, `${far} 0`);
  return `polygon(${pts.join(',')})`;
}

export const TILE_HEIGHT_PX = WALL_TILE_PX;

/**
 * 右端の帯のCSS。スクロールバーのすぐ左（position: fixed の right: 0 がそこ）に密着させる。
 * 背景は階層ごとの石壁のドット絵を、深く進むほど上へ流して「降りている」ように見せる。
 * アニメーションは transform と opacity だけを動かす（レイアウトを触らない）。
 */
export const OVERLAY_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }

.band {
  position: fixed; top: var(--top, ${BAND_TOP_DEFAULT}vh); bottom: 0; right: 0;
  width: var(--w, ${CONFIG.OVERLAY_WIDTH_PX}px); z-index: 2147483647; pointer-events: none;
  clip-path: ${stairEdge(false)};
  color: #f5f0e6; font: 700 11px/1.2 system-ui, "Hiragino Sans", "Yu Gothic UI", sans-serif;
  text-shadow: 1px 1px 0 #2a1f1a;
  user-select: none; overflow: hidden;
  background: #2b1f16;
}
.band.hidden { display: none; }
/* 設定画面の見本: 画面ではなく、枠の中に置く */
.band.preview { position: absolute; }
.band.left { right: auto; left: 0; clip-path: ${stairEdge(true)}; }

.rock {
  position: absolute; left: 0; right: 0; top: 0; height: calc(100% + ${WALL_TILE_PX}px);
  background-image: var(--wall); background-repeat: repeat; background-size: ${CONFIG.OVERLAY_WIDTH_PX}px ${WALL_TILE_PX}px;
  image-rendering: pixelated; will-change: transform;
}
/* 深さの変化（50mごとに6種類、繰り返す）の色を、壁の明るさを残したまま、はっきり重ねる */
.tint { position: absolute; inset: 0; background: var(--area, transparent); opacity: .62; mix-blend-mode: color; }
/* その変化ごとの飾り（壁と同じ速さで流れる） */
.deco {
  position: absolute; left: 0; right: 0; top: 0; height: calc(100% + ${WALL_TILE_PX}px);
  background-image: var(--deco); background-repeat: repeat; background-size: ${CONFIG.OVERLAY_WIDTH_PX}px ${WALL_TILE_PX}px;
  image-rendering: pixelated; will-change: transform;
}
/* 時間帯の演出（朝の光・夕焼け・夜の暗さ）。色と濃さは、--time で決める */
.time { position: absolute; inset: 0; background: var(--time, transparent); }
/* 上下は暗く、左（奥）も暗くして、通路の中にいるように見せる */
.shade {
  position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0) 86%, rgba(0,0,0,.6) 100%),
    linear-gradient(90deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.1) 45%, rgba(0,0,0,0) 100%);
}
/* ゲージがたまると、ツルハシのまわりがふんわり明るくなる */
.glow {
  position: absolute; left: -12px; right: -12px; top: 40%; height: 120px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,214,120,.8), rgba(255,170,60,.3) 55%, rgba(255,150,40,0) 100%);
  mix-blend-mode: screen; opacity: .3;
}

.torch { position: absolute; left: 0; width: 14px; height: 14px; filter: brightness(calc(1 + var(--torch, 0) * .5)); }
.band.left .torch { left: auto; right: 0; }
.torch.t1 { top: 30%; }
.torch.t2 { top: 70%; }
.torch svg { width: 14px; height: 14px; image-rendering: pixelated; display: block; }
.torch svg .f1 { animation: flameA .6s steps(1, end) infinite; }
.torch svg .f2 { animation: flameB .6s steps(1, end) infinite; opacity: 0; }
.torch .halo {
  position: absolute; left: -10px; top: -10px; width: 34px; height: 34px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,180,70,.5), rgba(255,140,40,0));
  animation: halo 1.2s ease-in-out infinite;
  transform: scale(calc(1 + var(--torch, 0) * .6));
}

.col {
  position: absolute; left: 0; right: 0; top: 0; display: flex; flex-direction: column; align-items: center;
  /* 左は階段状の縁（最大12px）と枠の影を避けて、右寄りに置く */
  padding: 12px 3px 0 13px;
}
.band.left .shade {
  background:
    linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0) 86%, rgba(0,0,0,.6) 100%),
    linear-gradient(270deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.1) 45%, rgba(0,0,0,0) 100%);
}
.band.left .col { padding: 12px 13px 0 3px; }
.panel { background: #1b1410; box-shadow: 0 0 0 2px #2a1f1a, 0 0 0 3px #7a6040; }
.depth { font-size: 10px; letter-spacing: -0.05em; padding: 2px 2px; white-space: nowrap; }

/* 帯の長さ = ページの長さ。探索者は、読み進めるほど上から下へ降りていく */
.track { position: absolute; left: var(--inset, ${trackInset(CONFIG.OVERLAY_WIDTH_PX)}px); right: ${TRACK_OUTER_PX}px; top: 46px; bottom: 24px; }
.band.left .track { left: ${TRACK_OUTER_PX}px; right: var(--inset, ${trackInset(CONFIG.OVERLAY_WIDTH_PX)}px); }
/* 10% ごとの目盛り（スクロールバーのすぐ内側） */
.ruler {
  position: absolute; right: -6px; top: 0; bottom: 0; width: 3px;
  background: repeating-linear-gradient(180deg, rgba(245,240,230,.55) 0 2px, transparent 2px 10%);
}
.band.left .ruler { right: auto; left: -${TRACK_OUTER_PX}px; }
.band.left .mark { right: auto; left: -3px; }
.stage { position: absolute; left: 0; top: 0; width: ${STAGE_WIDTH_PX}px; height: 79px; transition: transform .25s steps(5, end); will-change: transform; }
.scene { position: relative; width: ${STAGE_WIDTH_PX}px; height: 61px; }
.marks { position: absolute; inset: 0; }
.mark { position: absolute; right: -3px; top: 0; width: 18px; height: 18px; opacity: .85; }
.mark img { width: 18px; height: 18px; image-rendering: pixelated; display: block; filter: drop-shadow(1px 1px 0 #2a1f1a); }
.mark.r2 img { filter: drop-shadow(0 0 2px rgba(80,160,220,.9)); }
.mark.r3 img { filter: drop-shadow(0 0 3px rgba(255,210,70,1)); }

/* 場面: 下に探索者（34マス x 1px = 34px）、上に入れ物（14マス x 2px = 28px） */
.hero {
  position: absolute; left: 0; bottom: 0; width: 34px; height: 34px;
  background-repeat: no-repeat; image-rendering: pixelated; filter: drop-shadow(1px 1px 0 #2a1f1a);
}
.hero.walk { animation: heroWalk .5s steps(4, end) infinite; }
.hero.search { animation: heroSearch .45s steps(2, end) infinite; }
.hero.scared { animation: scared .3s steps(2, end) 3; }
.cont { position: absolute; right: 0; top: 0; width: 28px; height: 28px; opacity: 0; filter: drop-shadow(1px 1px 0 #2a1f1a); }
.cont.on { opacity: 1; }
.cont img { width: 28px; height: 28px; image-rendering: pixelated; display: block; }
.cont.enter { animation: enter .35s steps(5, end); }
.cont.searching { animation: enter .35s steps(5, end), rummage .5s steps(2, end) .35s infinite; }
.cont.mimic-reveal { animation: shudder .25s steps(2, end) infinite; }
.fly {
  position: absolute; right: 0; top: 0; width: 28px; height: 28px; image-rendering: pixelated;
  animation: fly 1.2s steps(10, end) forwards;
}
.fly.r2 { filter: drop-shadow(0 0 3px rgba(80,160,220,.9)); }
.fly.r3 { filter: drop-shadow(0 0 5px rgba(255,210,70,1)); }

/* ゲージ: 目盛りは6つで固定。進むと、目盛りが1つずつ点く（伸び縮みしない） */
/* 枠の左右に、影（3px）の分の余白を残して、帯の縁や目盛りにかぶらないようにする */
.gauge { width: ${STAGE_WIDTH_PX - 10}px; height: 9px; padding: 2px; margin: 6px 0 0 5px; }
.gauge-inner { display: flex; gap: 1px; width: 100%; height: 100%; background: #1b1410; }
.gauge-inner .cell { flex: 1 1 0; background: #3a2c20; }
.gauge-inner .cell.on { background: #f6d44c; box-shadow: inset 0 -1px 0 #b8870f; }



@keyframes heroWalk { from { background-position-x: 0; } to { background-position-x: -136px; } }
@keyframes heroSearch { from { background-position-x: 0; } to { background-position-x: -68px; } }
@keyframes scared { 0% { transform: translateX(0); } 50% { transform: translateX(-3px); } 100% { transform: translateX(0); } }
@keyframes enter { 0% { transform: translateY(-10px) scale(.4); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes rummage { 0% { transform: translateX(0); } 50% { transform: translateX(-1px) rotate(-3deg); } 100% { transform: translateX(1px) rotate(3deg); } }
@keyframes shudder { 0% { transform: translateX(-2px); } 100% { transform: translateX(2px); } }
@keyframes fly {
  0% { transform: translateY(0) scale(.6); opacity: 0; }
  20% { opacity: 1; }
  60% { transform: translateY(-22px) scale(1.5); opacity: 1; }
  100% { transform: translateY(-30px) scale(1.2); opacity: 0; }
}
@keyframes flameA { 0% { opacity: 1; } 50% { opacity: 0; } }
@keyframes flameB { 0% { opacity: 0; } 50% { opacity: 1; } }
@keyframes halo { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }

/* 動きを控えめにする: 振り・炎のちらつきをやめ、ゲージは即時に動かす */
@media (prefers-reduced-motion: reduce) {
  .stage { transition: none; }
  .hero.walk, .hero.search, .hero.scared, .cont.enter, .cont.searching, .cont.mimic-reveal, .fly, .torch svg .f1, .torch svg .f2, .torch .halo { animation: none; }
  .fly { opacity: 0; }
  .torch svg .f1 { opacity: 1; }
  .torch svg .f2 { opacity: 0; }
  }
`;
