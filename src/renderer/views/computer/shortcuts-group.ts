import type { ComputerShortcut } from '../../../shared/computer';
import { COMPUTER_SHORTCUTS } from '../../../shared/computer';
import { element } from '../../dom';
import type { ComputerControls } from './computer-controls';
import { actionButton, group, subheading } from './computer-controls';

const SHORTCUT_LABELS: Readonly<Record<ComputerShortcut, string>> = {
  network: 'Network',
  orbit: 'Orbit',
  keyboard: 'Virtual keyboard',
  repos: 'Repos',
  layout: 'Keyboard layout',
  mixer: 'Audio mixer',
};
const NOTE: string = 'The status menu’s shortcuts; each opens or switches on the computer’s own screen.';

export function renderShortcutsGroup(controls: ComputerControls): HTMLElement[] {
  const grid: HTMLDivElement = element('div', 'settings-row computer-shortcuts');
  grid.append(...COMPUTER_SHORTCUTS.map((shortcut: ComputerShortcut) => actionButton(SHORTCUT_LABELS[shortcut], (): void => controls.act({ kind: 'shortcut', shortcut }))));
  return [subheading('Shortcuts'), group(grid), element('p', 'settings-note', NOTE)];
}
