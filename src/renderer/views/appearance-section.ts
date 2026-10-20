import { element } from '../dom';
import type { ThemePreference } from '../theme';
import { THEME_PREFERENCES } from '../theme';

export const THEME_CHOICE_ATTRIBUTE: string = 'themeChoice';

const THEME_LABELS: Readonly<Record<ThemePreference, string>> = { light: 'Light', dark: 'Dark', auto: 'Auto' };

// Three preview tiles, like the Appearance picker in macOS System Settings.
export function renderAppearanceSection(current: ThemePreference): HTMLElement {
  const section: HTMLElement = element('section', 'settings-section');
  const group: HTMLDivElement = element('div', 'settings-group appearance');
  group.append(...THEME_PREFERENCES.map((preference: ThemePreference) => renderChoice(preference, preference === current)));
  section.append(element('h2', 'settings-heading', 'Appearance'), group);
  return section;
}

function renderChoice(preference: ThemePreference, isSelected: boolean): HTMLButtonElement {
  const choice: HTMLButtonElement = element('button', `theme-choice${isSelected ? ' is-selected' : ''}`);
  choice.dataset[THEME_CHOICE_ATTRIBUTE] = preference;
  const preview: HTMLSpanElement = element('span', `theme-preview theme-preview-${preference}`);
  preview.append(element('span', 'theme-preview-bar'), element('span', 'theme-preview-card'));
  choice.append(preview, element('span', 'theme-label', THEME_LABELS[preference]));
  return choice;
}
