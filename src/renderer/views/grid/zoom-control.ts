import { element } from '../../dom';
import { ZOOM_IN_ICON, ZOOM_OUT_ICON } from '../../icons';
import { setText } from './in-place';
import { MAX_TILE_ZOOM, MIN_TILE_ZOOM, zoomPercent } from './zoom-level';

// "Text" with magnifier − and + around the current size, drawn like the columns and rows controls.
export class ZoomControl {
  readonly root: HTMLElement = element('div', 'segmented-field');
  private readonly smaller: HTMLButtonElement;
  private readonly bigger: HTMLButtonElement;
  private readonly percent: HTMLElement = element('span', 'zoom-percent');

  constructor(onStep: (direction: 1 | -1) => void) {
    this.smaller = zoomButton(ZOOM_OUT_ICON, 'Smaller text', (): void => onStep(-1));
    this.bigger = zoomButton(ZOOM_IN_ICON, 'Bigger text', (): void => onStep(1));
    const track: HTMLDivElement = element('div', 'range-control zoom-control');
    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', 'Text size');
    track.append(this.smaller, this.percent, this.bigger);
    this.root.append(element('span', 'segmented-label', 'Text'), track);
  }

  show(zoom: number): void {
    setText(this.percent, zoomPercent(zoom));
    this.smaller.disabled = zoom <= MIN_TILE_ZOOM;
    this.bigger.disabled = zoom >= MAX_TILE_ZOOM;
  }
}

function zoomButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'range-choice zoom-button');
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.innerHTML = icon;
  button.addEventListener('click', onClick);
  return button;
}
