import { CONFIG } from '../../config';

/** 右端の帯のCSS。アニメーションは transform と opacity だけを動かす（レイアウトを触らない）。 */
export const OVERLAY_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }

/* 画面の縦中央に置く。上端や下端には、固定ヘッダーやメニューがあることが多いため */
.band {
  position: fixed; top: 50%; right: var(--sb, 0px); transform: translateY(-50%);
  width: ${CONFIG.OVERLAY_WIDTH_PX}px; z-index: 2147483647; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 10px 0 12px; border-radius: 10px 0 0 10px; max-height: 96vh; overflow: hidden;
  background: linear-gradient(90deg, rgba(0,0,0,.15) 0%, var(--strata, #8b6b4a) 100%);
  color: #fff; font: 600 11px/1.2 system-ui, "Hiragino Sans", "Yu Gothic UI", sans-serif;
  text-shadow: 0 1px 2px rgba(0,0,0,.6);
  user-select: none;
}
.band.hidden { display: none; }

.depth { font-size: 12px; letter-spacing: -0.02em; }
.strata-name { writing-mode: vertical-rl; font-size: 11px; opacity: .85; margin-top: 4px; }

.mid { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.pick { font-size: 20px; line-height: 1; transform-origin: 80% 80%; opacity: .45; }
.pick.active { opacity: 1; }
.pick.mining { animation: swing .7s ease-in-out infinite; }

.gauge { width: 7px; height: 84px; border-radius: 4px; background: rgba(0,0,0,.35); overflow: hidden; }
.gauge-fill {
  width: 100%; height: 100%; background: #ffd54f; transform-origin: bottom; transform: scaleY(0);
  transition: transform .25s linear;
}

.status { writing-mode: vertical-rl; font-size: 11px; min-height: 1em; }

.oil { width: 7px; height: 64px; border-radius: 4px; background: rgba(0,0,0,.35); overflow: hidden; }
.oil-fill {
  width: 100%; height: 100%; background: #ffb300; transform-origin: bottom; transform: scaleY(1);
  transition: transform .4s linear;
}
.oil.low .oil-fill { background: #ff7043; animation: flicker 1.1s steps(2, end) infinite; }

.pops { position: fixed; top: 38%; right: calc(var(--sb, 0px) + ${CONFIG.OVERLAY_WIDTH_PX + 8}px); z-index: 2147483647; pointer-events: none; }
.pop {
  position: absolute; right: 0; top: 0; white-space: nowrap;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(20, 20, 20, .82); color: #fff;
  font: 600 13px/1.3 system-ui, "Hiragino Sans", "Yu Gothic UI", sans-serif;
  opacity: 0; animation: popIn 2.6s ease-out forwards;
}
.pop .sub { display: block; font-weight: 400; font-size: 11px; opacity: .8; }
.pop.r1 .stars { color: #cfd8dc; }
.pop.r2 .stars { color: #81d4fa; }
.pop.r3 { font-size: 15px; box-shadow: 0 0 14px 2px rgba(255, 213, 79, .8); animation: popInBig 3.4s ease-out forwards; }
.pop.r3 .stars { color: #ffd54f; }
.pop.r3::after {
  content: ""; position: absolute; inset: -2px; border-radius: 10px;
  border: 2px solid #ffd54f; opacity: 0; animation: ring 1.2s ease-out 2;
}
.pop.warn { background: rgba(160, 50, 20, .88); }

@keyframes swing { 0% { transform: rotate(-35deg); } 50% { transform: rotate(15deg); } 100% { transform: rotate(-35deg); } }
@keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes popIn {
  0% { opacity: 0; transform: translateY(8px) scale(.92); }
  10% { opacity: 1; transform: translateY(0) scale(1); }
  80% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-8px) scale(1); }
}
@keyframes popInBig {
  0% { opacity: 0; transform: translateY(10px) scale(.8); }
  8% { opacity: 1; transform: translateY(0) scale(1.15); }
  14% { opacity: 1; transform: translateY(0) scale(1); }
  85% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-10px) scale(1); }
}
@keyframes ring { 0% { opacity: .9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.5); } }

/* 動きを控えめにする: 振り・ちらつき・ふくらみをやめ、ゲージは即時に動かす */
@media (prefers-reduced-motion: reduce) {
  .pick.mining, .oil.low .oil-fill, .pop.r3::after { animation: none; }
  .pick.mining { opacity: 1; }
  .gauge-fill, .oil-fill { transition: none; }
  .pop, .pop.r3 { animation: popFade 2.6s linear forwards; }
}
@keyframes popFade { 0% { opacity: 0; } 8% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
`;
