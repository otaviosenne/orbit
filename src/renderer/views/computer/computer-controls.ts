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

// A row's title with a line under it saying what it does or how it stands.
export function rowText(title: string, caption: string): HTMLElement {
  const text: HTMLSpanElement = element('span', 'computer-row-text');
  text.append(element('span', 'computer-row-title', title), element('span', 'computer-row-caption', caption));
  return text;
}

// An on/off switch: one control that shows the state and changes it, instead of an On and an Off button.
export function switchInput(isOn: boolean, onChange: (isOn: boolean) => void, label: string): HTMLInputElement {
  const toggle: HTMLInputElement = element('input', 'switch');
  toggle.type = 'checkbox';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-label', label);
  toggle.checked = isOn;
  toggle.addEventListener('change', (): void => onChange(toggle.checked));
  return toggle;
}

// A whole row that flips its switch when tapped anywhere on it.
export function switchRow(title: string, caption: string, toggle: HTMLInputElement, ...extra: HTMLElement[]): HTMLElement {
  const line: HTMLLabelElement = element('label', 'settings-row computer-switch-row');
  line.append(rowText(title, caption), ...extra, toggle);
  return line;
}
