// Text Claude Code itself writes into user records, shared by everything that tells it apart from what a person typed.

// Harness-injected text that adds nothing a reader of the chat needs.
export const NOISE_PREFIXES: readonly string[] = ['<system-reminder>', '<local-command', '<bash-', 'Caveat:'];
export const COMPACTION_PREFIX: string = 'This session is being continued from a previous conversation';
// Written when the user stops Claude mid-turn; no turn_duration record follows it.
export const INTERRUPTION_PREFIX: string = '[Request interrupted by user';

export function isNoiseText(text: string): boolean {
  return NOISE_PREFIXES.some((prefix: string) => text.startsWith(prefix));
}
