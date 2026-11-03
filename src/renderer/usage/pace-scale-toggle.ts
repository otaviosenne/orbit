import { element } from '../dom';
import { PACE_SCALES, type PaceScale } from './pace-scale';

const STORAGE_KEY: string = 'orbit.pace-scale';
const DEFAULT_SCALE: PaceScale = 'work';

const LABELS: Readonly<Record<PaceScale, string>> = { work: 'Work hours', all: 'Whole week', used: 'Used hours' };
const TIPS: Readonly<Record<PaceScale, string>> = {
  work: 'Monday to Friday, 09:00 to 18:00: the pace the week is planned on',
  all: 'Every hour of the week, nights and weekends included',
  used: 'Only the hours your usage went up, whenever they were',
};

// The scale the chart was last left on; a phone and the desktop each keep their own.
export function savedPaceScale(): PaceScale {
  try {
    const saved: string | null = localStorage.getItem(STORAGE_KEY);
    return PACE_SCALES.find((scale: PaceScale) => scale === saved) ?? DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

function savePaceScale(scale: PaceScale): void {
  try {
    localStorage.setItem(STORAGE_KEY, scale);
  } catch {
    // Without storage the choice lasts until the page reloads.
  }
}

export function renderPaceScaleToggle(current: PaceScale, choose: (scale: PaceScale) => void): HTMLElement {
  const control: HTMLDivElement = element('div', 'resume-segmented pace-scale');
  control.setAttribute('role', 'radiogroup');
  control.setAttribute('aria-label', 'Chart span');
  for (const scale of PACE_SCALES) {
    const option: HTMLButtonElement = element('button', `resume-segment${scale === current ? ' is-active' : ''}`, LABELS[scale]);
    option.type = 'button';
    option.title = TIPS[scale];
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(scale === current));
    option.addEventListener('click', (): void => {
      savePaceScale(scale);
      choose(scale);
    });
    control.append(option);
  }
  return control;
}
