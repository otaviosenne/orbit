import type { PickerTab } from '../../../shared/types';
import type { StyledLine } from './ansi-line';

// "←  ☒ Color  ☐ Fruits  ✔ Submit  →", or " ☐ Size " for a lone single-choice question.
const OPEN_BOX: string = '☐';
const TICKED_BOX: string = '☒';
const REVIEW_MARK: string = '✔';
const SCROLL_ARROWS: RegExp = /[←→]/g;
// Tabs are two spaces apart; a header itself may hold single spaces ("Estrutura HD").
const TAB_GAP: RegExp = /\s{2,}/;

export interface TabBar {
  readonly tabs: readonly PickerTab[];
  readonly hasReview: boolean;
  // The tab drawn with a background (the one on screen), when any is.
  readonly current: number | null;
}

export function isTabBar(text: string): boolean {
  return parseTabBar({ text, highlighted: [] }) !== null;
}

export function parseTabBar(line: StyledLine): TabBar | null {
  const tokens: string[] = line.text.replace(SCROLL_ARROWS, ' ').trim().split(TAB_GAP).filter((token: string) => token.length > 0);
  if (tokens.length === 0 || !tokens.every(isTabToken)) return null;
  const tabTokens: string[] = tokens.filter((token: string) => !token.startsWith(REVIEW_MARK));
  if (tabTokens.length === 0) return null;
  const tabs: PickerTab[] = tabTokens.map((token: string): PickerTab => ({ header: token.slice(OPEN_BOX.length).trim(), answered: token.startsWith(TICKED_BOX) }));
  return { tabs, hasReview: tokens.length > tabTokens.length, current: highlightedTab(line, tabTokens) };
}

function isTabToken(token: string): boolean {
  return token.startsWith(OPEN_BOX) || token.startsWith(TICKED_BOX) || token.startsWith(REVIEW_MARK);
}

function highlightedTab(line: StyledLine, tabTokens: readonly string[]): number | null {
  let from: number = 0;
  for (const [index, token] of tabTokens.entries()) {
    const start: number = line.text.indexOf(token, from);
    if (start === -1) return null;
    if (line.highlighted[start] === true) return index;
    from = start + token.length;
  }
  return null;
}
