import { element } from './dom';

// 'grid' is the tab labelled "Panel": in the code, "panel" and "sheet" already name the side panel of one chat.
export type ViewName = 'board' | 'grid' | 'timeline' | 'settings';

interface ViewTab {
  readonly name: ViewName;
  readonly label: string;
  readonly key: string;
}

export const VIEW_TABS: readonly ViewTab[] = [
  { name: 'board', label: 'Board', key: '1' },
  { name: 'grid', label: 'Panel', key: '2' },
  { name: 'timeline', label: 'Timeline', key: '3' },
];

// Settings is reached from the gear beside New chat rather than a tab, but keeps its key.
export const SETTINGS_KEY: string = '4';

export const VIEW_ATTRIBUTE: string = 'view';

export function renderNav(active: ViewName): HTMLElement[] {
  return VIEW_TABS.map((tab: ViewTab) => {
    const button: HTMLButtonElement = element('button', `tab${tab.name === active ? ' is-active' : ''}`, tab.label);
    button.dataset[VIEW_ATTRIBUTE] = tab.name;
    button.title = `${tab.label} (${tab.key})`;
    return button;
  });
}

export function viewForKey(key: string): ViewName | null {
  if (key === SETTINGS_KEY) return 'settings';
  return VIEW_TABS.find((tab: ViewTab) => tab.key === key)?.name ?? null;
}
