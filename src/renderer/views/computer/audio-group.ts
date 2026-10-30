import type { AppStream, AudioOutput, AudioState, ComputerAction } from '../../../shared/computer';
import { element } from '../../dom';
import type { ComputerControls } from './computer-controls';
import { actionButton, group, row, subheading } from './computer-controls';

export function renderAudioGroup(audio: AudioState | null, apps: readonly AppStream[], controls: ComputerControls): HTMLElement[] {
  if (audio === null) return [];
  const master: HTMLElement = sliderRow('Volume', audio.volume, audio.max, audio.muted, controls, {
    change: (percent: number): ComputerAction => ({ kind: 'volume', percent }),
    mute: { kind: 'mute' },
  });
  const rows: HTMLElement[] = [master];
  if (audio.outputs.length > 1) rows.push(outputRow(audio.outputs, controls));
  const parts: HTMLElement[] = [subheading('Sound'), group(...rows)];
  if (apps.length > 0) {
    const appRows: HTMLElement[] = apps.map((app: AppStream) =>
      sliderRow(app.name, app.volume, audio.max, app.muted, controls, {
        change: (percent: number): ComputerAction => ({ kind: 'app-volume', id: app.id, percent }),
        mute: { kind: 'app-mute', id: app.id },
      }),
    );
    parts.push(subheading('Apps'), group(...appRows));
  }
  return parts;
}

interface SliderActions {
  change(percent: number): ComputerAction;
  readonly mute: ComputerAction;
}

// The level is sent once the finger lets go; meanwhile only the number beside it follows.
function sliderRow(label: string, volume: number, max: number, muted: boolean, controls: ComputerControls, actions: SliderActions): HTMLElement {
  const slider: HTMLInputElement = element('input', 'computer-slider');
  slider.type = 'range';
  slider.min = '0';
  slider.max = String(max);
  slider.value = String(volume);
  slider.setAttribute('aria-label', label);
  const value: HTMLElement = element('span', 'computer-row-value', `${volume}%`);
  slider.addEventListener('input', (): void => void (value.textContent = `${slider.value}%`));
  slider.addEventListener('change', (): void => controls.act(actions.change(Number(slider.value))));
  const mute: HTMLButtonElement = actionButton(muted ? 'Unmute' : 'Mute', (): void => controls.act(actions.mute), `button${muted ? ' is-armed' : ''}`);
  const name: HTMLElement = element('span', 'computer-row-label', label);
  return row('computer-volume', name, slider, value, mute);
}

function outputRow(outputs: readonly AudioOutput[], controls: ComputerControls): HTMLElement {
  const select: HTMLSelectElement = element('select', 'computer-select');
  select.setAttribute('aria-label', 'Output');
  for (const output of outputs) {
    const option: HTMLOptionElement = element('option', '', output.description);
    option.value = output.name;
    option.selected = output.active;
    select.append(option);
  }
  select.addEventListener('change', (): void => controls.act({ kind: 'output', name: select.value }));
  return row('computer-output', element('span', 'computer-row-label', 'Output'), select);
}
