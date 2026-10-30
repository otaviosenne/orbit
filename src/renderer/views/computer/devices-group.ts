import type { ComputerStatus, DeviceBatteries } from '../../../shared/computer';
import { element } from '../../dom';
import type { ComputerControls } from './computer-controls';
import { actionButton, group, row, subheading } from './computer-controls';

// Below this a battery reads in orange, so a dying mouse is noticed before it stops.
const LOW_BATTERY_PERCENT: number = 20;
const DEVICE_NAMES: Readonly<Record<keyof DeviceBatteries, string>> = { mouse: 'Mouse', headset: 'Headset', airpods: 'AirPods' };

export function renderDevicesGroup(status: ComputerStatus, controls: ComputerControls): HTMLElement[] {
  // The level is known only once brightness changed since boot; the buttons work either way.
  const level: string = status.brightness === null ? '—' : `${status.brightness}%`;
  const brightness: HTMLElement = row(
    'computer-buttons',
    element('span', 'computer-row-label', 'Brightness'),
    element('span', 'computer-row-value', level),
    actionButton('−', (): void => controls.act({ kind: 'brightness', step: 'down' })),
    actionButton('+', (): void => controls.act({ kind: 'brightness', step: 'up' })),
  );
  const parts: HTMLElement[] = [subheading('Screen'), group(brightness)];
  const batteries: HTMLElement[] = batteryRows(status.batteries);
  if (batteries.length > 0) parts.push(subheading('Batteries'), group(...batteries));
  return parts;
}

function batteryRows(batteries: DeviceBatteries | null): HTMLElement[] {
  if (batteries === null) return [];
  return (Object.keys(DEVICE_NAMES) as (keyof DeviceBatteries)[]).flatMap((device: keyof DeviceBatteries): HTMLElement[] => {
    const level: number | null = batteries[device];
    if (level === null) return [];
    const meter: HTMLDivElement = element('div', 'meter');
    const fill: HTMLDivElement = element('div', 'meter-fill');
    fill.style.width = `${Math.min(100, level)}%`;
    meter.append(fill);
    return [row(`computer-battery${level < LOW_BATTERY_PERCENT ? ' is-high' : ''}`, element('span', 'computer-row-label', DEVICE_NAMES[device]), meter, element('span', 'computer-row-value', `${level}%`))];
  });
}
