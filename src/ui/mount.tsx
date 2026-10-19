import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { wallUri } from '../content/overlay/wall';
import { GAME_NAME } from '../gameName';
import './ui.css';

/** 各ページの入り口。タイトルは gameName.ts の名前に合わせ、背景の石壁の絵を CSS に渡す。 */
export function mount(page: ReactNode, title = GAME_NAME): void {
  document.title = title;
  const style = document.documentElement.style;
  style.setProperty('--wall-cave', wallUri('other'));
  style.setProperty('--wall-mine', wallUri('sns'));
  const root = document.getElementById('root');
  if (root) createRoot(root).render(page);
}
