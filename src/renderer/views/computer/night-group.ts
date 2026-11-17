import type { NightShutdownState, NightWindow } from '../../../shared/night-shutdown';
import { hoursText, startChoices } from '../../../shared/night-shutdown';
import { element } from '../../dom';
import { group, row, rowText, subheading } from './computer-controls';

const NOTE: string = 'Only for tonight: the next night starts at the usual hour again.';

// "Night shutdown": how late tonight the PC may power itself off, up to not at all.
export function renderNightGroup(state: NightShutdownState | null, setStart: (hour: number) => void): HTMLElement[] {
  const window: NightWindow | null = state?.window ?? null;
  if (state === null || window === null) return [];
  const picker: HTMLSelectElement = element('select', 'night-start');
  picker.setAttribute('aria-label', 'Tonight\'s shutdown starts at');
  picker.disabled = !state.isEnabled;
  picker.append(...startChoices(window).map((hour: number) => option(hour, window, state.tonightStartHour)));
  picker.addEventListener('change', (): void => setStart(Number(picker.value)));
  return [subheading('Night shutdown'), group(row('computer-action-row', rowText('Tonight', caption(state, window)), picker)), element('p', 'settings-note', NOTE)];
}

function option(hour: number, window: NightWindow, selected: number): HTMLOptionElement {
  const label: string = hour === window.endHour ? 'Not tonight' : `From ${hoursText(hour)}${hour === window.startHour ? ' (usual)' : ''}`;
  const choice: HTMLOptionElement = element('option', '', label);
  choice.value = String(hour);
  choice.selected = hour === selected;
  return choice;
}

function caption(state: NightShutdownState, window: NightWindow): string {
  if (!state.isEnabled) return 'The night auto-shutdown is turned off';
  if (state.tonightStartHour === window.endHour) return 'Stays on all night';
  return `Powers off between ${hoursText(state.tonightStartHour)} and ${hoursText(window.endHour)} once nobody uses it and no chat is working`;
}
