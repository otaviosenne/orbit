import { element } from '../dom';
import type { SettingsPage } from './settings-pages';
import { renderSettingsNav } from './settings-pages';

export interface SettingsLayout {
  readonly pages: readonly SettingsPage[];
  readonly current: SettingsPage;
  readonly choose: (page: SettingsPage) => void;
}

// The sidebar of pages beside the current page's content.
export function renderSettings(layout: SettingsLayout, content: HTMLElement): HTMLElement {
  const root: HTMLElement = element('div', 'settings');
  const column: HTMLDivElement = element('div', 'settings-column');
  column.append(content);
  root.append(renderSettingsNav(layout.pages, layout.current, layout.choose), column);
  return root;
}
