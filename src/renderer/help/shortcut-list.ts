import { element } from '../dom';
import type { Shortcut, ShortcutGroup } from '../shortcuts/shortcut-types';
import { SHORTCUT_GROUPS } from '../shortcuts/shortcut-types';
import { highlighted } from './highlight';
import { keySearchWords, renderKeys } from './keycaps';
import { matchesAllTerms } from './text-search';

// The shortcuts a search keeps: its words may name the action, its group or its keys.
export function matchingShortcuts(shortcuts: readonly Shortcut[], terms: readonly string[]): readonly Shortcut[] {
  return shortcuts.filter((shortcut: Shortcut) => matchesAllTerms(terms, [shortcut.description, shortcut.group, ...keySearchWords(shortcut)]));
}

// One card per group, in the registry's group order; groups the search emptied are left out.
export function renderShortcutGroups(shortcuts: readonly Shortcut[], terms: readonly string[]): readonly HTMLElement[] {
  return SHORTCUT_GROUPS.flatMap((group: ShortcutGroup): HTMLElement[] => {
    const inGroup: readonly Shortcut[] = shortcuts.filter((shortcut: Shortcut) => shortcut.group === group);
    return inGroup.length === 0 ? [] : [renderGroup(group, inGroup, terms)];
  });
}

function renderGroup(group: ShortcutGroup, shortcuts: readonly Shortcut[], terms: readonly string[]): HTMLElement {
  const section: HTMLElement = element('section', 'help-group');
  const title: HTMLHeadingElement = element('h4', 'help-group-title');
  title.append(...highlighted(group, terms));
  section.append(title, ...shortcuts.map((shortcut: Shortcut) => renderRow(shortcut, terms)));
  return section;
}

function renderRow(shortcut: Shortcut, terms: readonly string[]): HTMLElement {
  const row: HTMLDivElement = element('div', 'help-row');
  const text: HTMLSpanElement = element('span', 'help-row-text');
  text.append(...highlighted(shortcut.description, terms));
  row.append(text, renderKeys(shortcut, terms));
  return row;
}
