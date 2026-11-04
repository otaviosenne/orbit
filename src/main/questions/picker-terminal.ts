import { kittySocketPath } from '../kitty-remote';
import { delay, runCommand } from '../run-command';
import type { PickerStep } from './picker-keys';

// Claude Code redraws the picker after each input; the next one waits until that has happened.
const STEP_SETTLE_MS: number = 80;

// The chat's terminal seen through its kitty remote-control socket: keys in, the visible screen out.
export class PickerTerminal {
  readonly target: readonly string[];

  constructor(kittyPid: number) {
    this.target = ['@', '--to', `unix:${kittySocketPath(kittyPid)}`];
  }

  async run(steps: readonly PickerStep[]): Promise<void> {
    for (const step of steps) {
      await this.send(step);
      await delay(STEP_SETTLE_MS);
    }
  }

  // A window scrolled up into its history shows old output where the picker should be, and keys still reach the
  // picker; back at the bottom, what is read is what the keys act on. It only moves the view.
  async scrollToEnd(): Promise<void> {
    await runCommand('kitty', [...this.target, 'scroll-window', 'end']);
  }

  // With colors, so the parser can tell which tab is the one on screen.
  screen(): Promise<string> {
    return runCommand('kitty', [...this.target, 'get-text', '--ansi']);
  }

  // The scrollback too, without colors: a permission prompt for a long command or edit starts above the screen.
  history(): Promise<string> {
    return runCommand('kitty', [...this.target, 'get-text', '--extent', 'all']);
  }

  // Without colors, for screens read by their text alone.
  plainScreen(): Promise<string> {
    return runCommand('kitty', [...this.target, 'get-text']);
  }

  // Text goes through stdin, which kitty passes on verbatim instead of reading escapes in it.
  private async send(step: PickerStep): Promise<void> {
    if (step.kind === 'keys') await runCommand('kitty', [...this.target, 'send-key', ...step.keys]);
    else await runCommand('kitty', [...this.target, 'send-text', '--stdin'], step.text);
  }
}
