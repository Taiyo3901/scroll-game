/**
 * 組み合わせの職業。2つの部屋が、それぞれ一定以上の割合を占めると、2つの職業を合わせた職業になる。
 * 「未踏の地」は、組み合わせに入れない。部屋の組み合わせは、部屋の順番（genres.json の並び）で、小さいほうを先に書く。
 */

/** 組み合わせの職業名。キーは「部屋ID+部屋ID」（部屋の並び順）。 */
export const COMBO_JOBS: Record<string, string> = {
  'video+sns': '芸人',
  'video+news': '実況者',
  'video+study': '講談師',
  'video+shop': '興行師',
  'video+dev': '幻灯技師',
  'video+game': '剣舞士',
  'video+music': '歌姫',
  'video+travel': '旅芸人',
  'video+work': '舞台監督',
  'sns+news': '噂屋',
  'sns+study': '論客',
  'sns+shop': '客引き',
  'sns+dev': 'ハッカー',
  'sns+game': '挑戦者',
  'sns+music': '酒場の歌い手',
  'sns+travel': '渡り鳥',
  'sns+work': '世話役',
  'news+study': '調査官',
  'news+shop': '情報商人',
  'news+dev': '解析官',
  'news+game': '戦場記者',
  'news+music': '評論家',
  'news+travel': '冒険記者',
  'news+work': '書記官',
  'study+shop': '古書商',
  'study+dev': '魔導技師',
  'study+game': '軍師',
  'study+music': '楽聖',
  'study+travel': '探検学者',
  'study+work': '宮廷学士',
  'shop+dev': '発明商',
  'shop+game': '武器商人',
  'shop+music': '楽器商',
  'shop+travel': '行商人',
  'shop+work': '交易官',
  'dev+game': '機械兵',
  'dev+music': '音響技師',
  'dev+travel': '測量技師',
  'dev+work': '設計官',
  'game+music': '戦歌士',
  'game+travel': '傭兵',
  'game+work': '近衛兵',
  'music+travel': '旅の楽士',
  'music+work': '宮廷楽士',
  'travel+work': '伝令官',
};

/** 2つの部屋（並び順で渡す）の組み合わせ職業名。なければ null。 */
export function comboJobName(first: string, second: string): string | null {
  return COMBO_JOBS[`${first}+${second}`] ?? null;
}
