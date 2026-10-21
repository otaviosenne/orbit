import { element } from './dom';
import { isWebHost } from './host';
import { actionShortcuts, availableShortcuts } from './shortcuts/shortcut-catalog';
import { withShortcut } from './shortcuts/shortcut-hint';
import type { ActionShortcut, ActionShortcutId } from './shortcuts/shortcut-types';

// 'grid' is the tab labelled "Panel": in the code, "panel" and "sheet" already name the side panel of one chat.
export type ViewName = 'board' | 'grid' | 'timeline' | 'list' | 'settings';

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
  { name: 'list', label: 'List', shortcut: 'view-list' },
];

export const VIEW_ATTRIBUTE: string = 'view';

// A view whose key is desktop-only (the Panel) is left out of Orbit Web's tabs too, so its key and tab agree.
export function availableTabs(isWeb: boolean): readonly ViewTab[] {
  const usable: ReadonlySet<ActionShortcutId> = new Set(actionShortcuts(availableShortcuts(isWeb)).map((shortcut: ActionShortcut) => shortcut.id));
  return VIEW_TABS.filter((tab: ViewTab) => usable.has(tab.shortcut));
}

export function renderNav(active: ViewName): HTMLElement[] {
  return availableTabs(isWebHost()).map((tab: ViewTab) => {
    const button: HTMLButtonElement = element('button', `tab${tab.name === active ? ' is-active' : ''}`, tab.label);
    button.dataset[VIEW_ATTRIBUTE] = tab.name;
    button.title = withShortcut(tab.label, tab.shortcut);
    return button;
  });
}
