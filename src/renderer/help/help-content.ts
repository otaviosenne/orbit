import { element } from '../dom';
import { SEARCH_ICON } from '../icons';
import type { Shortcut } from '../shortcuts/shortcut-types';
import type { FaqEntry } from './faq';
import { matchingQuestions, renderQuestionCards } from './faq-list';
import type { HelpTab, HelpTabSizes } from './help-tab';
import { HELP_TABS, otherTabMatchesLabel } from './help-tab';
import { matchingShortcuts, renderShortcutGroups } from './shortcut-list';

// What Help can show: the shortcuts this host has and the common questions.
export interface HelpSource {
  readonly shortcuts: readonly Shortcut[];
  readonly questions: readonly FaqEntry[];
}

const GRID_CLASSES: Readonly<Record<HelpTab, string>> = { shortcuts: 'help-shortcut-grid', questions: 'help-faq-grid' };

export function helpTabSizes(source: HelpSource): HelpTabSizes {
  return { shortcuts: source.shortcuts.length, questions: source.questions.length };
}

function tabMatchCount(source: HelpSource, tab: HelpTab, terms: readonly string[]): number {
  return tab === 'shortcuts' ? matchingShortcuts(source.shortcuts, terms).length : matchingQuestions(source.questions, terms).length;
}

function renderTabItems(source: HelpSource, tab: HelpTab, terms: readonly string[]): readonly HTMLElement[] {
  if (tab === 'shortcuts') return renderShortcutGroups(matchingShortcuts(source.shortcuts, terms), terms);
  return renderQuestionCards(matchingQuestions(source.questions, terms), terms);
}

// The open tab's body for a search, or a friendly empty state that points at another tab with matches.
export function renderHelpContent(
  source: HelpSource,
  tab: HelpTab,
  query: string,
  terms: readonly string[],
  showTab: (tab: HelpTab) => void,
): readonly HTMLElement[] {
  const items: readonly HTMLElement[] = renderTabItems(source, tab, terms);
  if (items.length === 0) return [renderEmpty(query, otherTabWithMatches(source, tab, terms), showTab)];
  const grid: HTMLDivElement = element('div', GRID_CLASSES[tab]);
  grid.append(...items);
  return [grid];
}

interface TabMatches {
  readonly tab: HelpTab;
  readonly matches: number;
}

function otherTabWithMatches(source: HelpSource, current: HelpTab, terms: readonly string[]): TabMatches | null {
  const others: readonly TabMatches[] = HELP_TABS.filter((tab: HelpTab) => tab !== current)
    .map((tab: HelpTab): TabMatches => ({ tab, matches: tabMatchCount(source, tab, terms) }));
  return others.find((other: TabMatches) => other.matches > 0) ?? null;
}

function renderEmpty(query: string, elsewhere: TabMatches | null, showTab: (tab: HelpTab) => void): HTMLElement {
  const empty: HTMLDivElement = element('div', 'help-empty');
  const icon: HTMLSpanElement = element('span', 'help-empty-icon');
  icon.innerHTML = SEARCH_ICON;
  empty.append(icon, element('p', 'help-empty-title', `Nothing matches “${query.trim()}”`));
  if (elsewhere === null) empty.append(element('p', 'help-empty-hint', 'Try a shorter word, like “pin”, “close” or “dictate”.'));
  else empty.append(renderElsewhereButton(elsewhere, showTab));
  return empty;
}

function renderElsewhereButton(elsewhere: TabMatches, showTab: (tab: HelpTab) => void): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'help-empty-switch', otherTabMatchesLabel(elsewhere.tab, elsewhere.matches));
  button.type = 'button';
  button.addEventListener('click', (): void => showTab(elsewhere.tab));
  return button;
}
