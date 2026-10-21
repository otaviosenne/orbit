import type { TerminalSize } from '../../core/questions/picker-fit';
import { pickerShrinkFactor } from '../../core/questions/picker-fit';
import { delay, runCommand } from '../run-command';

// Claude Code redraws on the resize the smaller font causes; the picker is read only after that redraw.
const REDRAW_MS: number = 500;
// kitty's "back to the font size in kitty.conf".
const RESET_FONT_SIZE: string = '0';

// Runs work with the chat's terminal shrunk enough to show the whole picker, then gives the font back.
// Kitty clamps small fonts, so multiplying back by the factor could overshoot; the reset goes to the configured size.
export async function withPickerRoom<T>(target: readonly string[], work: () => Promise<T>): Promise<T> {
  const factor: number = pickerShrinkFactor(await terminalSize(target));
  if (factor === 1) return work();
  await setFontSize(target, `/${factor}`);
  try {
    await delay(REDRAW_MS);
    return await work();
  } finally {
    await setFontSize(target, RESET_FONT_SIZE);
  }
}

async function terminalSize(target: readonly string[]): Promise<TerminalSize> {
  try {
    const listing: unknown = JSON.parse(await runCommand('kitty', [...target, 'ls']));
    return activeWindowSize(listing);
  } catch {
    return { columns: 0, lines: 0 };
  }
}

// The chat runs in the OS window's active kitty window; its size is what the picker gets.
function activeWindowSize(listing: unknown): TerminalSize {
  const windows: unknown = (listing as { tabs?: { windows?: unknown }[] }[])[0]?.tabs?.[0]?.windows;
  const window: { columns?: unknown; lines?: unknown } | undefined = Array.isArray(windows) ? windows[0] : undefined;
  const columns: number = typeof window?.columns === 'number' ? window.columns : 0;
  const lines: number = typeof window?.lines === 'number' ? window.lines : 0;
  return { columns, lines };
}

async function setFontSize(target: readonly string[], change: string): Promise<void> {
  await runCommand('kitty', [...target, 'set-font-size', '--', change]);
}
