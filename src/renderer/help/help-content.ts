import { element } from '../dom';
import { SEARCH_ICON } from '../icons';
import type { Shortcut } from '../shortcuts/shortcut-types';
import type { FaqEntry } from './faq';
import type { ShownFaq } from './faq-list';
import { matchingQuestions, renderQuestionCards } from './faq-list';
import { matchingShortcuts, renderShortcutGroups } from './shortcut-list';

// What Help can show: the shortcuts this host has and the common questions.
export interface HelpSource {
  readonly shortcuts: readonly Shortcut[];
  readonly questions: readonly FaqEntry[];
}

// The modal's scrolling body for a search: shortcuts, then questions, or a friendly empty state.
export function renderHelpContent(source: HelpSource, query: string, terms: readonly string[]): readonly HTMLElement[] {
  const shortcuts: readonly Shortcut[] = matchingShortcuts(source.shortcuts, terms);
  const questions: readonly ShownFaq[] = matchingQuestions(source.questions, terms);
  if (shortcuts.length === 0 && questions.length === 0) return [renderEmpty(query)];
  return [
    ...(shortcuts.length === 0 ? [] : [renderSection('Keyboard shortcuts', 'help-shortcut-grid', renderShortcutGroups(shortcuts, terms))]),
    ...(questions.length === 0 ? [] : [renderSection('Common questions', 'help-faq-grid', renderQuestionCards(questions, terms))]),
  ];
}

function renderSection(title: string, gridClass: string, items: readonly HTMLElement[]): HTMLElement {
  const section: HTMLElement = element('section', 'help-section');
  const grid: HTMLDivElement = element('div', gridClass);
  grid.append(...items);
  section.append(element('h3', 'help-section-title', title), grid);
  return section;
}

function renderEmpty(query: string): HTMLElement {
  const empty: HTMLDivElement = element('div', 'help-empty');
  const icon: HTMLSpanElement = element('span', 'help-empty-icon');
  icon.innerHTML = SEARCH_ICON;
  empty.append(
    icon,
    element('p', 'help-empty-title', `Nothing matches “${query.trim()}”`),
    element('p', 'help-empty-hint', 'Try a shorter word, like “pin”, “close” or “dictate”.'),
  );
  return empty;
}
