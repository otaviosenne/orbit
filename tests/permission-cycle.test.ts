import { describe, expect, it } from 'vitest';
import { cycleTo } from '../src/main/permissions/permission-cycle';
import type { ModeTerminal } from '../src/main/permissions/permission-reader';
import type { PickerStep } from '../src/main/questions/picker-keys';

const FOOTERS: Readonly<Record<string, string>> = {
  default: '  ⏸ manual mode on · ? for shortcuts',
  acceptEdits: '  ⏵⏵ accept edits on (shift+tab to cycle)',
  plan: '  ⏸ plan mode on (shift+tab to cycle)',
  bypassPermissions: '  ⏵⏵ bypass permissions on (shift+tab to cycle)',
  auto: '  ⏵⏵ auto mode on (shift+tab to cycle)',
};

// A terminal whose Shift+Tab steps through the given modes, as the chat's footer would.
class FakeTerminal implements ModeTerminal {
  presses: number = 0;
  constructor(private readonly cycle: readonly string[], private readonly start: number = 0) {}

  async run(steps: readonly PickerStep[]): Promise<void> {
    this.presses += steps.length;
  }

  async plainScreen(): Promise<string> {
    const mode: string = this.cycle[(this.start + this.presses) % this.cycle.length] ?? 'default';
    return `❯ \n${FOOTERS[mode] ?? ''}\n`;
  }
}

describe('cycleTo', () => {
  it('presses Shift+Tab until the footer shows the wanted mode', async () => {
    const terminal: FakeTerminal = new FakeTerminal(['bypassPermissions', 'auto', 'default', 'acceptEdits', 'plan'], 0);
    expect(await cycleTo(terminal, 'plan')).toMatchObject({ ok: true });
    expect(terminal.presses).toBe(4);
  });

  it('presses nothing when the chat is already in that mode', async () => {
    const terminal: FakeTerminal = new FakeTerminal(['default', 'acceptEdits', 'plan']);
    expect(await cycleTo(terminal, 'default')).toMatchObject({ ok: true });
    expect(terminal.presses).toBe(0);
  });

  it('stops after one round when the chat leaves the mode out of its cycle', async () => {
    const terminal: FakeTerminal = new FakeTerminal(['default', 'acceptEdits', 'plan']);
    expect(await cycleTo(terminal, 'bypassPermissions')).toEqual({ ok: false, method: null, error: 'Bypass is not offered in this chat' });
    expect(terminal.presses).toBe(3);
  });
});
