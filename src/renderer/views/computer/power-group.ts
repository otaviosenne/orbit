import type { PowerAction } from '../../../shared/computer';
import { element } from '../../dom';
import type { ComputerControls } from './computer-controls';
import { actionButton, group, row, rowText, subheading, switchInput, switchRow } from './computer-controls';

type SessionAction = Exclude<PowerAction, 'shutdown'>;

const SESSION_ACTIONS: readonly SessionAction[] = ['lock', 'suspend', 'reboot'];
const SESSION_LABELS: Readonly<Record<SessionAction, string>> = { lock: 'Lock', suspend: 'Suspend', reboot: 'Restart' };
const CONFIRM_LABEL: string = 'Tap again';
const SAFE_SHUTDOWN_KEY: string = 'safe-shutdown';
const SHUTDOWN_NOW_KEY: PowerAction = 'shutdown';
// A sleeping or powered-off machine cannot be reached from here, so the page says so before it happens.
const UNREACHABLE_NOTE: string = 'After Suspend or a shutdown, Orbit Web cannot reach this computer until it is woken by hand.';

export interface ScreensState {
  // null while it is not known yet (Hyprland not asked, or no answer).
  readonly isOn: boolean | null;
  set(isOn: boolean): void;
}

// The monitors as one switch, the session actions side by side, then the two ways to shut down, each with what it does.
export function renderPowerGroup(controls: ComputerControls, screens: ScreensState, shutDownSafely: () => void): HTMLElement[] {
  return [
    subheading('Screens'),
    group(screensRow(screens)),
    subheading('Power'),
    group(row('computer-session', ...SESSION_ACTIONS.map((action: SessionAction) => sessionButton(action, controls)))),
    subheading('Shut down'),
    group(
      shutdownRow('Shut down safely', 'Pauses the working chats and waits up to a minute for them to stop; reopened later, they carry on.', SAFE_SHUTDOWN_KEY, controls, shutDownSafely),
      shutdownRow('Shut down now', 'Powers off at once: working chats are cut off.', SHUTDOWN_NOW_KEY, controls, (): void => controls.act({ kind: 'power', power: 'shutdown' })),
    ),
    element('p', 'settings-note', UNREACHABLE_NOTE),
  ];
}

function screensRow(screens: ScreensState): HTMLElement {
  const caption: string = screens.isOn === null ? 'State unknown' : screens.isOn ? 'On' : 'Off: any key or click on the computer wakes them too';
  const toggle: HTMLInputElement = switchInput(screens.isOn === true, (isOn: boolean): void => screens.set(isOn), 'Screens');
  return switchRow('Monitors', caption, toggle);
}

// Each one arms on the first tap and acts on the second, so a stray tap from the phone never locks or restarts the PC.
function sessionButton(action: SessionAction, controls: ComputerControls): HTMLButtonElement {
  const isArmed: boolean = controls.armed === action;
  return actionButton(isArmed ? CONFIRM_LABEL : SESSION_LABELS[action], (): void => {
    if (controls.armed === action) controls.act({ kind: 'power', power: action });
    else controls.arm(action);
  }, `button computer-session-button${isArmed ? ' is-armed' : ''}`);
}

function shutdownRow(title: string, caption: string, key: string, controls: ComputerControls, shutDown: () => void): HTMLElement {
  const isArmed: boolean = controls.armed === key;
  const button: HTMLButtonElement = actionButton(isArmed ? CONFIRM_LABEL : 'Shut down', (): void => {
    if (controls.armed === key) shutDown();
    else controls.arm(key);
  }, `button computer-shutdown-button${isArmed ? ' is-armed' : ''}`);
  return row('computer-action-row', rowText(title, caption), button);
}
