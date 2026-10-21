import { element } from './dom';
import { withShortcut } from './shortcuts/shortcut-hint';
import type { ActionShortcutId } from './shortcuts/shortcut-types';

// 'grid' is the tab labelled "Panel": in the code, "panel" and "sheet" already name the side panel of one chat.
export type ViewName = 'board' | 'grid' | 'timeline' | 'settings';

interface ViewTab {
  readonly name: ViewName;
  readonly label: string;
  // Its key lives in the shortcut registry, which the key handler and Help also read.
  readonly shortcut: ActionShortcutId;
}

export const VIEW_TABS: readonly ViewTab[] = [
  { name: 'board', label: 'Board', shortcut: 'view-board' },
  { name: 'grid', label: 'Panel', shortcut: 'view-panel' },
  { name: 'timeline', label: 'Timeline', shortcut: 'view-timeline' },
];

export const VIEW_ATTRIBUTE: string = 'view';

export function renderNav(active: ViewName): HTMLElement[] {
  return VIEW_TABS.map((tab: ViewTab) => {
    const button: HTMLButtonElement = element('button', `tab${tab.name === active ? ' is-active' : ''}`, tab.label);
    button.dataset[VIEW_ATTRIBUTE] = tab.name;
    button.title = withShortcut(tab.label, tab.shortcut);
    return button;
  });
}
