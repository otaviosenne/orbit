import type { TabDirection, TabSteps } from '../../core/devices/session-tab-plan';
import { runCommand } from '../run-command';

// Ctrl+PgDown / Ctrl+PgUp are Chrome's next/previous tab, which Chrome reserves: the page never sees them.
// Ctrl+1..9 would jump straight there, but a page receives those first and may act on them.
const STEP_KEYS: Readonly<Record<TabDirection, string>> = { next: 'Page_Down', previous: 'Page_Up' };
const STEP_MODIFIER: string = 'CTRL';

// Sent to the Chrome window by address, so a key can never land in whatever window has the focus.
export async function pressTabSteps(address: string, steps: TabSteps): Promise<void> {
  const shortcut: string = `${STEP_MODIFIER}, ${STEP_KEYS[steps.direction]}, address:${address}`;
  for (let step: number = 0; step < steps.count; step++) await runCommand('hyprctl', ['dispatch', 'sendshortcut', shortcut]);
}
