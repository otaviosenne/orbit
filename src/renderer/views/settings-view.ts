import type { UsageSnapshot } from '../../shared/types';
import { element } from '../dom';
import type { ThemePreference } from '../theme';
import { renderAppearanceSection } from './appearance-section';
import { renderUsageSection } from './usage-section';

// extra: sections that keep their own state between renders (Orbit Web's), appended after Usage.
export function renderSettings(theme: ThemePreference, usage: UsageSnapshot | null, now: number, extra: readonly HTMLElement[] = []): HTMLElement {
  const root: HTMLElement = element('div', 'settings');
  const column: HTMLDivElement = element('div', 'settings-column');
  column.append(renderAppearanceSection(theme), renderUsageSection(usage, now), ...extra);
  root.append(column);
  return root;
}
