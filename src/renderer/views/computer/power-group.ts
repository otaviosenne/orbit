import type { PowerAction } from '../../../shared/computer';
import { POWER_ACTIONS } from '../../../shared/computer';
import { element } from '../../dom';
import type { ComputerControls } from './computer-controls';
import { actionButton, group, row, subheading } from './computer-controls';

const POWER_LABELS: Readonly<Record<PowerAction, string>> = { lock: 'Lock', suspend: 'Suspend', reboot: 'Restart', shutdown: 'Shut down' };
const CONFIRM_LABELS: Readonly<Record<PowerAction, string>> = {
  lock: 'Tap again to lock',
  suspend: 'Tap again to suspend',
  reboot: 'Tap again to restart',
  shutdown: 'Tap again to shut down',
};
// A sleeping or powered-off machine cannot be reached from here, so the page says so before it happens.
const POWER_NOTE: string = 'After Suspend or Shut down, Orbit Web cannot reach this computer until it is woken by hand.';

// Screens off (and back on, since no key can be pressed from here) and the power menu, each risky one armed first.
export function renderPowerGroup(controls: ComputerControls): HTMLElement[] {
  const screens: HTMLElement = row(
    'computer-buttons',
    element('span', 'computer-row-label', 'Screens'),
    actionButton('Turn off', (): void => controls.act({ kind: 'screens', on: false })),
    actionButton('Turn on', (): void => controls.act({ kind: 'screens', on: true })),
  );
  const power: HTMLElement = row('computer-buttons computer-power', ...POWER_ACTIONS.map((action: PowerAction) => powerButton(action, controls)));
  return [subheading('Power'), group(screens, power), element('p', 'settings-note', POWER_NOTE)];
}

function powerButton(action: PowerAction, controls: ComputerControls): HTMLButtonElement {
  const armed: boolean = controls.armed === action;
  const button: HTMLButtonElement = actionButton(armed ? CONFIRM_LABELS[action] : POWER_LABELS[action], (): void => {
    if (controls.armed === action) controls.act({ kind: 'power', power: action });
    else controls.arm(action);
  }, `button${armed ? ' is-armed' : ''}`);
  return button;
}
