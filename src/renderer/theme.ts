export type ThemePreference = 'light' | 'dark' | 'auto';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'auto'];

const STORAGE_KEY: string = 'claude-radar.theme';
const DEFAULT_THEME: ThemePreference = 'light';

// 'auto' removes the attribute so the stylesheet falls back to prefers-color-scheme, like macOS Auto.
export function applyTheme(preference: ThemePreference): void {
  if (preference === 'auto') delete document.documentElement.dataset['theme'];
  else document.documentElement.dataset['theme'] = preference;
}

export function loadTheme(): ThemePreference {
  try {
    const saved: string | null = localStorage.getItem(STORAGE_KEY);
    return THEME_PREFERENCES.find((preference: ThemePreference) => preference === saved) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // The choice still applies for this run.
  }
}

export function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}
