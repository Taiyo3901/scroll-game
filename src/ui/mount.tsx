import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { GAME_NAME } from '../gameName';
import './ui.css';

/** 各ページの入り口。タイトルは gameName.ts の名前に合わせる。 */
export function mount(page: ReactNode, title = GAME_NAME): void {
  document.title = title;
  const root = document.getElementById('root');
  if (root) createRoot(root).render(page);
}
