import { CONFIG } from '../../config';

/** 岩肌のタイル（グレースケールの地層・小石・ひび・鉱石のきらめき）。色は地層ごとの色を重ねて付ける。 */
const TILE_H = 220;
const ROCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${CONFIG.OVERLAY_WIDTH_PX}" height="${TILE_H}" viewBox="0 0 44 ${TILE_H}">
<rect width="44" height="${TILE_H}" fill="#888"/>
<path d="M0 0H44V28Q33 20 22 29T0 26Z" fill="#fff" opacity=".10"/>
<path d="M0 26Q11 34 22 29T44 28V58Q30 66 20 58T0 62Z" fill="#000" opacity=".14"/>
<path d="M0 62Q12 55 24 61T44 58V92Q32 86 20 94T0 90Z" fill="#fff" opacity=".07"/>
<path d="M0 90Q10 98 20 94T44 92V128Q30 120 18 129T0 124Z" fill="#000" opacity=".18"/>
<path d="M0 124Q14 132 26 126T44 128V160Q30 168 18 160T0 164Z" fill="#fff" opacity=".09"/>
<path d="M0 164Q12 158 24 164T44 160V196Q32 190 20 198T0 194Z" fill="#000" opacity=".12"/>
<path d="M0 194Q11 202 22 197T44 196V${TILE_H}H0Z" fill="#fff" opacity=".06"/>
<g fill="#000" opacity=".28"><circle cx="8" cy="12" r="2"/><circle cx="31" cy="44" r="1.6"/><circle cx="15" cy="76" r="2.2"/><circle cx="36" cy="108" r="1.8"/><circle cx="10" cy="146" r="2"/><circle cx="29" cy="178" r="2.4"/><circle cx="38" cy="208" r="1.5"/></g>
<g fill="#fff" opacity=".22"><circle cx="24" cy="18" r="1.3"/><circle cx="6" cy="52" r="1.5"/><circle cx="34" cy="84" r="1.2"/><circle cx="20" cy="118" r="1.6"/><circle cx="40" cy="150" r="1.3"/><circle cx="12" cy="188" r="1.5"/></g>
<g fill="none" stroke="#000" stroke-width="1" opacity=".3"><path d="M30 6l-4 9 5 7-3 8"/><path d="M8 96l6 8-2 9 6 6"/><path d="M34 132l-5 10 4 8"/><path d="M14 168l5 7-3 9"/></g>
<g fill="#ffe9a8" opacity=".9"><path d="M36 36l1.4 2.6 2.6 1.4-2.6 1.4-1.4 2.6-1.4-2.6-2.6-1.4 2.6-1.4z"/><path d="M11 112l1.2 2.2 2.2 1.2-2.2 1.2-1.2 2.2-1.2-2.2-2.2-1.2 2.2-1.2z"/><path d="M33 190l1.2 2.2 2.2 1.2-2.2 1.2-1.2 2.2-1.2-2.2-2.2-1.2 2.2-1.2z"/></g>
</svg>`;
const ROCK_URL = `url("data:image/svg+xml,${encodeURIComponent(ROCK_SVG)}")`;

/** 洞窟の壁のようにギザギザにした左端（見た目だけ。毎回同じ形にするため疑似乱数は固定）。 */
function caveEdge(): string {
  const pts: string[] = ['10px 0'];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 2; y <= 98; y += 3) pts.push(`${(rnd() * 7).toFixed(1)}px ${y}%`);
  pts.push('10px 100%', '100% 100%', '100% 0');
  return `polygon(${pts.join(',')})`;
}

export const TILE_HEIGHT_PX = TILE_H;

/**
 * 右端の帯のCSS。スクロールバーのすぐ左（position: fixed の right: 0 がそこ）に密着させる。
 * 背景は岩肌のタイルを、深く進むほど上へ流して「掘り進んでいる」ように見せる。
 * アニメーションは transform と opacity だけを動かす（レイアウトを触らない）。
 */
export const OVERLAY_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }

.band {
  position: fixed; top: 7vh; bottom: 7vh; right: 0;
  width: ${CONFIG.OVERLAY_WIDTH_PX}px; z-index: 2147483647; pointer-events: none;
  clip-path: ${caveEdge()};
  color: #fff; font: 600 11px/1.2 system-ui, "Hiragino Sans", "Yu Gothic UI", sans-serif;
  text-shadow: 0 1px 2px rgba(0,0,0,.8);
  user-select: none; overflow: hidden;
  background: var(--strata, #8b6b4a);
}
.band.hidden { display: none; }

.rock { position: absolute; left: 0; right: 0; top: 0; height: calc(100% + ${TILE_H}px); background: ${ROCK_URL} repeat-y; background-size: 100% ${TILE_H}px; mix-blend-mode: soft-light; opacity: .95; will-change: transform; }
.tint { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,.28) 100%); }
.shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.65) 0%, rgba(0,0,0,.18) 40%, rgba(0,0,0,0) 100%); }
.glow { position: absolute; left: -10px; right: -10px; top: 38%; height: 130px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,214,120,.85), rgba(255,170,60,.35) 55%, rgba(255,150,40,0) 100%); mix-blend-mode: screen; opacity: .6; }
.stalac { position: absolute; left: 0; right: 0; top: 0; height: 14px; background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0)); }

.col {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
  padding: 12px 0 14px; gap: 6px;
}
.depth { font-size: 12px; letter-spacing: -0.02em; padding: 2px 4px; border-radius: 6px; background: rgba(0,0,0,.45); }
.strata-name { writing-mode: vertical-rl; font-size: 11px; opacity: .92; letter-spacing: .08em; }

.mid { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.pick { position: relative; font-size: 20px; line-height: 1; transform-origin: 80% 80%; }
.gauge { width: 7px; height: 96px; border-radius: 4px; background: rgba(0,0,0,.5); overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,.18); }
.gauge-fill {
  width: 100%; height: 100%; background: #ffd54f; transform-origin: bottom; transform: scaleY(0);
  transition: transform .25s linear;
}

.today { white-space: pre; text-align: center; font-size: 10px; line-height: 1.3; padding: 3px 5px; border-radius: 6px; background: rgba(0,0,0,.45); }

.pops { position: fixed; top: 38%; right: ${CONFIG.OVERLAY_WIDTH_PX + 8}px; z-index: 2147483647; pointer-events: none; }
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

@keyframes swing { 0% { transform: rotate(-35deg); } 50% { transform: rotate(15deg); } 100% { transform: rotate(-35deg); } }
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
  .pick.mining, .pop.r3::after { animation: none; }
  .gauge-fill { transition: none; }
  .pop, .pop.r3 { animation: popFade 2.6s linear forwards; }
}
@keyframes popFade { 0% { opacity: 0; } 8% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
`;
