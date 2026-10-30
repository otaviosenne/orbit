import type { AppStream, AudioState, ComputerAction, PowerAction } from '../../shared/computer';
import type { Command } from './desktop-commands';
import { BRIGHTNESS_SCRIPT, SCREENS_OFF_SCRIPT, SCREENS_ON_SCRIPT, SHORTCUT_COMMANDS } from './desktop-commands';
import type { StatusPart } from './computer-status';

// run: wait for it and report how it went. launch: start it and answer at once (windows, slow scripts).
// power: answer first and start it a moment later, since it takes the machine, and the reply, with it.
export type ActionMode = 'run' | 'launch' | 'power';

export interface ActionPlan {
  readonly command: Command;
  readonly mode: ActionMode;
  readonly changes: StatusPart | null;
}

// What the action may name (an output, an app's stream) must be one the desktop has right now.
export interface ActionContext {
  readonly audio: AudioState | null;
  readonly apps: readonly AppStream[];
}

const DEFAULT_SINK: string = '@DEFAULT_SINK@';
const TOGGLE: string = 'toggle';

// The same commands the power menu (wlogout) runs; Orbit keeps the chats' state, so nothing is saved first.
const POWER_COMMANDS: Readonly<Record<PowerAction, Command>> = {
  shutdown: { file: 'systemctl', args: ['poweroff'] },
  reboot: { file: 'systemctl', args: ['reboot'] },
  suspend: { file: 'systemctl', args: ['suspend'] },
  lock: { file: 'loginctl', args: ['lock-session'] },
};

// The command for an action, or why it cannot run.
export function planAction(action: ComputerAction, context: ActionContext): ActionPlan | string {
  switch (action.kind) {
    case 'power':
      return { command: POWER_COMMANDS[action.power], mode: 'power', changes: null };
    case 'screens':
      return { command: { file: action.on ? SCREENS_ON_SCRIPT : SCREENS_OFF_SCRIPT, args: [] }, mode: 'launch', changes: null };
    case 'volume':
      return pactl(['set-sink-volume', DEFAULT_SINK, `${action.percent}%`], 'audio');
    case 'mute':
      return pactl(['set-sink-mute', DEFAULT_SINK, TOGGLE], 'audio');
    case 'output':
      return context.audio?.outputs.some((output) => output.name === action.name) === true
        ? pactl(['set-default-sink', action.name], 'audio')
        : 'That audio output is no longer there';
    case 'app-volume':
      return hasApp(context, action.id) ? pactl(['set-sink-input-volume', action.id, `${action.percent}%`], 'apps') : NO_APP;
    case 'app-mute':
      return hasApp(context, action.id) ? pactl(['set-sink-input-mute', action.id, TOGGLE], 'apps') : NO_APP;
    case 'brightness':
      // ddcutil takes seconds over three monitors; the poll shows the new level once the script saved it.
      return { command: { file: BRIGHTNESS_SCRIPT, args: [action.step] }, mode: 'launch', changes: 'brightness' };
    case 'do-not-disturb':
      return { command: { file: 'swaync-client', args: ['--toggle-dnd'] }, mode: 'run', changes: 'notifications' };
    case 'clear-notifications':
      return { command: { file: 'swaync-client', args: ['--close-all'] }, mode: 'run', changes: 'notifications' };
    case 'media':
      return { command: { file: 'playerctl', args: [action.command] }, mode: 'run', changes: 'media' };
    case 'shortcut':
      return { command: SHORTCUT_COMMANDS[action.shortcut], mode: 'launch', changes: null };
  }
}

const NO_APP: string = 'That app is no longer playing';

function pactl(args: string[], changes: StatusPart): ActionPlan {
  return { command: { file: 'pactl', args }, mode: 'run', changes };
}

function hasApp(context: ActionContext, id: string): boolean {
  return context.apps.some((app: AppStream) => app.id === id);
}
