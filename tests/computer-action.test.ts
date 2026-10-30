import { describe, expect, it } from 'vitest';
import { parseComputerAction } from '../src/shared/computer-action';
import type { ActionPlan } from '../src/main/computer/action-plan';
import { planAction } from '../src/main/computer/action-plan';
import type { AudioState } from '../src/shared/computer';

const AUDIO: AudioState = { volume: 50, muted: false, max: 150, outputs: [{ name: 'headset', description: 'Headset', active: true }] };
const CONTEXT = { audio: AUDIO, apps: [{ id: '42', name: 'spotify', volume: 80, muted: false }] };

function planOf(raw: unknown): ActionPlan | string {
  const action = parseComputerAction(raw);
  if (action === null) throw new Error('rejected');
  return planAction(action, CONTEXT);
}

describe('computer actions from the phone', () => {
  it('accepts only known actions with valid values', () => {
    expect(parseComputerAction({ kind: 'power', power: 'shutdown' })).toEqual({ kind: 'power', power: 'shutdown' });
    expect(parseComputerAction({ kind: 'power', power: 'logout' })).toBeNull();
    expect(parseComputerAction({ kind: 'volume', percent: 151 })).toBeNull();
    expect(parseComputerAction({ kind: 'volume', percent: 12.5 })).toBeNull();
    expect(parseComputerAction({ kind: 'volume', percent: '50' })).toBeNull();
    expect(parseComputerAction({ kind: 'shortcut', shortcut: 'rm -rf' })).toBeNull();
    expect(parseComputerAction({ kind: 'exec', command: 'ls' })).toBeNull();
    expect(parseComputerAction('mute')).toBeNull();
  });

  it('turns each action into one fixed program with its arguments', () => {
    expect(planOf({ kind: 'power', power: 'shutdown' })).toMatchObject({ command: { file: 'systemctl', args: ['poweroff'] }, mode: 'power' });
    expect(planOf({ kind: 'power', power: 'lock' })).toMatchObject({ command: { file: 'loginctl', args: ['lock-session'] } });
    expect(planOf({ kind: 'volume', percent: 70 })).toMatchObject({ command: { file: 'pactl', args: ['set-sink-volume', '@DEFAULT_SINK@', '70%'] }, changes: 'audio' });
    expect(planOf({ kind: 'app-volume', id: '42', percent: 30 })).toMatchObject({ command: { file: 'pactl', args: ['set-sink-input-volume', '42', '30%'] } });
    expect(planOf({ kind: 'media', command: 'next' })).toMatchObject({ command: { file: 'playerctl', args: ['next'] }, changes: 'media' });
    expect(planOf({ kind: 'screens', on: false })).toMatchObject({ mode: 'launch' });
  });

  it('refuses an output or app the desktop does not have right now', () => {
    expect(planOf({ kind: 'output', name: 'headset' })).toMatchObject({ command: { args: ['set-default-sink', 'headset'] } });
    expect(typeof planOf({ kind: 'output', name: '--help' })).toBe('string');
    expect(typeof planOf({ kind: 'app-mute', id: '7' })).toBe('string');
  });
});
