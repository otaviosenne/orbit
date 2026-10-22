// Help shows one part at a time: the keyboard shortcuts, the spoken commands or the common questions.
export type HelpTab = 'shortcuts' | 'voice' | 'questions';

export const HELP_TABS: readonly HelpTab[] = ['shortcuts', 'voice', 'questions'];

export const HELP_TAB_LABELS: Readonly<Record<HelpTab, string>> = { shortcuts: 'Shortcuts', voice: 'Voice', questions: 'Questions' };

// How many entries each part has on this host; a part with none gets no tab.
export type HelpTabSizes = Readonly<Record<HelpTab, number>>;

export function isHelpTab(value: string): value is HelpTab {
  return (HELP_TABS as readonly string[]).includes(value);
}

export function parseHelpTab(saved: string | null): HelpTab | null {
  return saved !== null && isHelpTab(saved) ? saved : null;
}

export function availableHelpTabs(sizes: HelpTabSizes): readonly HelpTab[] {
  return HELP_TABS.filter((tab: HelpTab) => sizes[tab] > 0);
}

// The last tab picked wins while this host still has it; with none, a touch screen with no keyboard starts on
// Questions, since shortcuts are of little use there.
export function initialHelpTab(saved: HelpTab | null, available: readonly HelpTab[], prefersQuestions: boolean): HelpTab {
  if (saved !== null && available.includes(saved)) return saved;
  if (prefersQuestions && available.includes('questions')) return 'questions';
  return available[0] ?? 'questions';
}

// The tab a step away (-1 left, +1 right), wrapping around like a macOS tab bar's arrow keys.
export function steppedHelpTab(available: readonly HelpTab[], current: HelpTab, step: number): HelpTab {
  if (available.length === 0) return current;
  const index: number = Math.max(available.indexOf(current), 0);
  const next: number = (index + step + available.length) % available.length;
  return available[next] ?? current;
}

// Offered when a search empties the open tab but finds something in another one.
export function otherTabMatchesLabel(tab: HelpTab, matches: number): string {
  return `${matches} ${matches === 1 ? 'match' : 'matches'} in ${HELP_TAB_LABELS[tab]}`;
}
