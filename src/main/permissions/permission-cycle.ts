import type { CycledPermissionMode, PermissionMode } from '../../shared/permission-modes';
import { CYCLED_PERMISSION_MODES, PERMISSION_MODE_TITLES } from '../../shared/permission-modes';
import type { ActionResult } from '../../shared/types';
import { keys } from '../questions/picker-keys';
import { delay } from '../run-command';
import { failure, success } from '../terminal-input';
import type { ModeTerminal } from './permission-reader';
import { screenMode } from './permission-reader';

const CYCLE_KEY: string = 'shift+tab';
// A full trip round the cycle plus one: past that the footer is not behaving as expected.
const MAX_MODE_PRESSES: number = CYCLED_PERMISSION_MODES.length + 1;
// Claude Code redraws the footer within a frame or two; a press that changes nothing by then is treated as lost.
const REDRAW_POLL_MS: number = 80;
const REDRAW_TIMEOUT_MS: number = 1500;

// Presses Shift+Tab one step at a time, reading the footer after each, until it shows the wanted mode.
export async function cycleTo(terminal: ModeTerminal, wanted: CycledPermissionMode): Promise<ActionResult> {
  const start: PermissionMode | null = await screenMode(terminal);
  if (start === null) return failure('The mode is not visible in the terminal');
  let current: PermissionMode = start;
  for (let press: number = 1; press <= MAX_MODE_PRESSES && current !== wanted; press++) {
    await terminal.run([keys(CYCLE_KEY)]);
    const next: PermissionMode | null = await redrawnMode(terminal, current);
    if (next === null) return failure('Shift+Tab did not change the mode');
    // Back where it started without passing the wanted mode: this chat leaves it out of the cycle.
    if (next === start && next !== wanted) return failure(`${PERMISSION_MODE_TITLES[wanted]} is not offered in this chat`);
    current = next;
  }
  return current === wanted ? success('socket') : failure('The mode did not change as expected');
}

// The mode once the footer shows something other than before; null if it never does.
async function redrawnMode(terminal: ModeTerminal, before: PermissionMode): Promise<PermissionMode | null> {
  for (let waited: number = 0; waited < REDRAW_TIMEOUT_MS; waited += REDRAW_POLL_MS) {
    await delay(REDRAW_POLL_MS);
    const mode: PermissionMode | null = await screenMode(terminal);
    if (mode !== null && mode !== before) return mode;
  }
  return null;
}
