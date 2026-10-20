import { kittySocketPath } from '../kitty-remote';
import { delay, runCommand } from '../run-command';
import type { PickerStep } from './picker-keys';

// Claude Code redraws the picker after each input; the next one waits until that has happened.
const STEP_SETTLE_MS: number = 80;

// The chat's terminal seen through its kitty remote-control socket: keys in, the visible screen out.
export class PickerTerminal {
  private readonly target: readonly string[];

  constructor(kittyPid: number) {
    this.target = ['@', '--to', `unix:${kittySocketPath(kittyPid)}`];
  }

  async run(steps: readonly PickerStep[]): Promise<void> {
    for (const step of steps) {
      await this.send(step);
      await delay(STEP_SETTLE_MS);
    }
  }

  // With colors, so the parser can tell which tab is the one on screen.
  screen(): Promise<string> {
    return runCommand('kitty', [...this.target, 'get-text', '--ansi']);
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
