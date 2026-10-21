import { element } from '../dom';
import { GAUGE_ICON, GLOBE_SIMPLE_ICON, PALETTE_ICON, CPU_ICON } from '../icons';

export type SettingsPage = 'appearance' | 'usage' | 'resources' | 'web';

interface PageEntry {
  readonly page: SettingsPage;
  readonly label: string;
  readonly icon: string;
}

const PAGES: readonly PageEntry[] = [
  { page: 'appearance', label: 'Appearance', icon: PALETTE_ICON },
  { page: 'usage', label: 'Usage', icon: GAUGE_ICON },
  { page: 'resources', label: 'Resources', icon: CPU_ICON },
  { page: 'web', label: 'Orbit Web', icon: GLOBE_SIMPLE_ICON },
];

export const DEFAULT_SETTINGS_PAGE: SettingsPage = 'appearance';

// The pages this window can show: Orbit Web's own settings exist only on the desktop.
export function availablePages(hasWeb: boolean): readonly SettingsPage[] {
  return PAGES.map((entry: PageEntry) => entry.page).filter((page: SettingsPage) => hasWeb || page !== 'web');
}

export function isSettingsPage(value: unknown): value is SettingsPage {
  return PAGES.some((entry: PageEntry) => entry.page === value);
}

// A sidebar like macOS System Settings: one page at a time instead of every section stacked in one long column.
export function renderSettingsNav(pages: readonly SettingsPage[], current: SettingsPage, choose: (page: SettingsPage) => void): HTMLElement {
  const nav: HTMLElement = element('nav', 'settings-nav');
  nav.setAttribute('aria-label', 'Settings sections');
  nav.append(...PAGES.filter((entry: PageEntry) => pages.includes(entry.page)).map((entry: PageEntry) => renderNavItem(entry, entry.page === current, choose)));
  return nav;
}

function renderNavItem(entry: PageEntry, isCurrent: boolean, choose: (page: SettingsPage) => void): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'settings-nav-item');
  button.type = 'button';
  button.classList.toggle('is-current', isCurrent);
  if (isCurrent) button.setAttribute('aria-current', 'page');
  button.innerHTML = entry.icon;
  button.append(element('span', '', entry.label));
  button.addEventListener('click', (): void => choose(entry.page));
  return button;
}
