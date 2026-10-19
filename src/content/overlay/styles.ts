import { CONFIG } from '../../config';
import { CELL_PX, WALL_TILE_PX } from './wall';

/** 石壁の左端を、ドット絵のように階段状にギザギザにする（毎回同じ形にするため疑似乱数は固定）。 */
function stairEdge(): string {
  const pts: string[] = ['8px 0'];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let prev = 8;
  for (let y = 0; y < 100; y += 2) {
    const x = Math.round(rnd() * 3) * CELL_PX * 2; // 0, 4, 8, 12px
    pts.push(`${prev}px ${y}%`, `${x}px ${y}%`);
    prev = x;
  }
  pts.push(`${prev}px 100%`, '100% 100%', '100% 0');
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
  position: fixed; top: 7vh; bottom: 7vh; right: 0;
  width: ${CONFIG.OVERLAY_WIDTH_PX}px; z-index: 2147483647; pointer-events: none;
  clip-path: ${stairEdge()};
  color: #f5f0e6; font: 700 11px/1.2 system-ui, "Hiragino Sans", "Yu Gothic UI", sans-serif;
  text-shadow: 1px 1px 0 #2a1f1a;
  user-select: none; overflow: hidden;
  background: #2b1f16;
}
.band.hidden { display: none; }

.rock {
  position: absolute; left: 0; right: 0; top: 0; height: calc(100% + ${WALL_TILE_PX}px);
  background-image: var(--wall); background-repeat: repeat-y; background-size: 100% ${WALL_TILE_PX}px;
  image-rendering: pixelated; will-change: transform;
}
/* 階層の色を、壁に薄くかぶせる（深くなるほど色合いが変わる） */
.tint { position: absolute; inset: 0; background: var(--area, transparent); opacity: .28; mix-blend-mode: multiply; }
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

.torch { position: absolute; left: 0; width: 14px; height: 14px; }
.torch.t1 { top: 30%; }
.torch.t2 { top: 70%; }
.torch svg { width: 14px; height: 14px; image-rendering: pixelated; display: block; }
.torch svg .f1 { animation: flameA .6s steps(1, end) infinite; }
.torch svg .f2 { animation: flameB .6s steps(1, end) infinite; opacity: 0; }
.torch .halo {
  position: absolute; left: -10px; top: -10px; width: 34px; height: 34px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,180,70,.5), rgba(255,140,40,0));
  animation: halo 1.2s ease-in-out infinite;
}

.col {
  position: absolute; left: 0; right: 0; top: 0; display: flex; flex-direction: column; align-items: center;
  /* 左は階段状の縁（最大12px）と枠の影を避けて、右寄りに置く */
  padding: 12px 3px 0 13px;
}
.panel { background: #1b1410; box-shadow: 0 0 0 2px #2a1f1a, 0 0 0 3px #7a6040; }
.depth { font-size: 10px; letter-spacing: -0.05em; padding: 2px 2px; white-space: nowrap; }
.strata-name { writing-mode: vertical-rl; font-size: 11px; letter-spacing: .08em; }
.foot { position: absolute; left: 13px; right: 3px; bottom: 14px; display: flex; flex-direction: column; align-items: center; gap: 8px; }

/* 帯の長さ = ページの長さ。探索者は、読み進めるほど上から下へ降りていく */
.track { position: absolute; left: 12px; right: 7px; top: 46px; bottom: 150px; }
/* 10% ごとの目盛り（スクロールバーのすぐ内側） */
.ruler {
  position: absolute; right: -6px; top: 0; bottom: 0; width: 3px;
  background: repeating-linear-gradient(180deg, rgba(245,240,230,.55) 0 2px, transparent 2px 10%);
}
.stage { position: absolute; left: 0; top: 0; width: 41px; height: 86px; transition: transform .25s steps(5, end); will-change: transform; }
.scene { position: relative; width: 41px; height: 62px; }
.marks { position: absolute; inset: 0; }
.mark { position: absolute; right: -3px; top: 0; width: 18px; height: 18px; opacity: .85; }
.mark img { width: 18px; height: 18px; image-rendering: pixelated; display: block; filter: drop-shadow(1px 1px 0 #2a1f1a); }
.mark.r2 img { filter: drop-shadow(0 0 2px rgba(80,160,220,.9)); }
.mark.r3 img { filter: drop-shadow(0 0 3px rgba(255,210,70,1)); }

/* 場面: 左下に探索者、右上に入れ物（ドット絵 14マス x 2px = 28px） */
.hero {
  position: absolute; left: 0; bottom: 0; width: 28px; height: 28px;
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
  position: absolute; right: 6px; top: 0; width: 28px; height: 28px; image-rendering: pixelated;
  animation: fly 1.2s steps(10, end) forwards;
}
.fly.r2 { filter: drop-shadow(0 0 3px rgba(80,160,220,.9)); }
.fly.r3 { filter: drop-shadow(0 0 5px rgba(255,210,70,1)); }

.gauge { width: 41px; height: 12px; padding: 2px; margin-top: 8px; }
.gauge-inner { width: 100%; height: 100%; overflow: hidden; background: #3a2c20; }
.gauge-fill {
  width: 100%; height: 100%; transform-origin: left; transform: scaleX(0);
  background: repeating-linear-gradient(90deg, #f6d44c 0 4px, #b8870f 4px 6px);
  transition: transform .25s linear;
}

.today { white-space: pre; text-align: center; font-size: 10px; line-height: 1.3; padding: 3px 3px; }

.pops { position: fixed; top: 38%; right: ${CONFIG.OVERLAY_WIDTH_PX + 10}px; z-index: 2147483647; pointer-events: none; }
.pop {
  position: absolute; right: 0; top: 0; white-space: nowrap;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px 6px 6px; background: #1b1410; color: #f5f0e6;
  box-shadow: 0 0 0 2px #2a1f1a, 0 0 0 4px #7a6040, 4px 4px 0 4px rgba(0,0,0,.35);
  font: 700 13px/1.3 system-ui, "Hiragino Sans", "Yu Gothic UI", sans-serif;
  opacity: 0; animation: popIn 2.6s steps(12, end) forwards;
}
.pop .ico { flex: none; width: 42px; height: 42px; background: #3a2c20; display: grid; place-items: center; }
.pop .ico img { width: 42px; height: 42px; image-rendering: pixelated; display: block; }
.pop .sub { display: block; font-weight: 400; font-size: 11px; opacity: .8; }
.pop.r1 .stars { color: #cfd8dc; }
.pop.r2 .stars { color: #81d4fa; }
.pop.r2 .ico img { filter: drop-shadow(0 0 3px rgba(80,160,220,.9)); }
.pop.r3 { font-size: 15px; box-shadow: 0 0 0 2px #2a1f1a, 0 0 0 4px #f6d44c, 4px 4px 0 4px rgba(0,0,0,.35), 0 0 14px 4px rgba(246,212,76,.6); animation: popInBig 3.4s steps(14, end) forwards; }
.pop.r3 .stars { color: #f6d44c; }
.pop.r3 .ico img { filter: drop-shadow(0 0 4px rgba(255,210,70,.95)); }

@keyframes heroWalk { from { background-position-x: 0; } to { background-position-x: -112px; } }
@keyframes heroSearch { from { background-position-x: 0; } to { background-position-x: -56px; } }
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
@keyframes popIn {
  0% { opacity: 0; transform: translateY(8px); }
  10% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
}
@keyframes popInBig {
  0% { opacity: 0; transform: translateY(10px) scale(.85); }
  8% { opacity: 1; transform: translateY(0) scale(1.1); }
  14% { opacity: 1; transform: translateY(0) scale(1); }
  85% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-10px) scale(1); }
}

/* 動きを控えめにする: 振り・炎のちらつきをやめ、ゲージは即時に動かす */
@media (prefers-reduced-motion: reduce) {
  .stage { transition: none; }
  .hero.walk, .hero.search, .hero.scared, .cont.enter, .cont.searching, .cont.mimic-reveal, .fly, .torch svg .f1, .torch svg .f2, .torch .halo { animation: none; }
  .fly { opacity: 0; }
  .torch svg .f1 { opacity: 1; }
  .torch svg .f2 { opacity: 0; }
  .gauge-fill { transition: none; }
  .pop, .pop.r3 { animation: popFade 2.6s linear forwards; }
}
@keyframes popFade { 0% { opacity: 0; } 8% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
`;
