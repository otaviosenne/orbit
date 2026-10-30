import type { ComputerAction } from '../../../shared/computer';
import { element } from '../../dom';

// What every part of the Computer page may do: run an action, and arm a risky one so a second tap confirms it.
export interface ComputerControls {
  act(action: ComputerAction): void;
  readonly armed: string | null;
  arm(key: string): void;
}

export function group(...rows: HTMLElement[]): HTMLElement {
  const box: HTMLDivElement = element('div', 'settings-group');
  box.append(...rows);
  return box;
}

export function row(className: string, ...children: (HTMLElement | string)[]): HTMLElement {
  const line: HTMLDivElement = element('div', `settings-row ${className}`);
  line.append(...children);
  return line;
}

export function actionButton(label: string, onPress: () => void, className: string = 'button'): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', className, label);
  button.type = 'button';
  button.addEventListener('click', onPress);
  return button;
}

export function subheading(text: string): HTMLElement {
  return element('h3', 'settings-subheading', text);
}
