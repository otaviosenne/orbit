import type { UsageSnapshot } from '../../shared/types';
import { element } from '../dom';
import type { ThemePreference } from '../theme';
import { renderAppearanceSection } from './appearance-section';
import { renderUsageSection } from './usage-section';

export function renderSettings(theme: ThemePreference, usage: UsageSnapshot | null, now: number): HTMLElement {
  const root: HTMLElement = element('div', 'settings');
  const column: HTMLDivElement = element('div', 'settings-column');
  column.append(renderAppearanceSection(theme), renderUsageSection(usage, now));
  root.append(column);
  return root;
}
