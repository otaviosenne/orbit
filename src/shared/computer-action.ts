import type { ComputerAction } from './computer';
import { COMPUTER_SHORTCUTS, MAX_VOLUME_PERCENT, MEDIA_COMMANDS, POWER_ACTIONS } from './computer';

// What reaches the desktop from a phone is checked field by field; anything else is no action at all.
export function parseComputerAction(raw: unknown): ComputerAction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value: Record<string, unknown> = raw as Record<string, unknown>;
  switch (value['kind']) {
    case 'power':
      return oneOf(value['power'], POWER_ACTIONS) ? { kind: 'power', power: value['power'] } : null;
    case 'screens':
      return typeof value['on'] === 'boolean' ? { kind: 'screens', on: value['on'] } : null;
    case 'volume':
      return isPercent(value['percent']) ? { kind: 'volume', percent: value['percent'] } : null;
    case 'mute':
      return { kind: 'mute' };
    case 'output':
      return typeof value['name'] === 'string' ? { kind: 'output', name: value['name'] } : null;
    case 'app-volume':
      return typeof value['id'] === 'string' && isPercent(value['percent']) ? { kind: 'app-volume', id: value['id'], percent: value['percent'] } : null;
    case 'app-mute':
      return typeof value['id'] === 'string' ? { kind: 'app-mute', id: value['id'] } : null;
    case 'brightness':
      return value['step'] === 'up' || value['step'] === 'down' ? { kind: 'brightness', step: value['step'] } : null;
    case 'do-not-disturb':
      return { kind: 'do-not-disturb' };
    case 'clear-notifications':
      return { kind: 'clear-notifications' };
    case 'media':
      return oneOf(value['command'], MEDIA_COMMANDS) ? { kind: 'media', command: value['command'] } : null;
    case 'shortcut':
      return oneOf(value['shortcut'], COMPUTER_SHORTCUTS) ? { kind: 'shortcut', shortcut: value['shortcut'] } : null;
    default:
      return null;
  }
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return allowed.includes(value as T);
}

function isPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_VOLUME_PERCENT;
}
