import { element } from '../../dom';

export interface SegmentedChoice<T extends string> {
  readonly options: readonly T[];
  readonly current: T | null;
  readonly label: (option: T) => string;
  readonly pick: (option: T) => void;
  readonly isLocked: boolean;
}

// A macOS-style segmented control; picking the option already shown does nothing.
export function renderSegmented<T extends string>(choice: SegmentedChoice<T>): HTMLDivElement {
  const track: HTMLDivElement = element('div', 'chat-settings-segmented');
  track.setAttribute('role', 'radiogroup');
  track.replaceChildren(...choice.options.map((option: T) => renderSegment(choice, option)));
  return track;
}

function renderSegment<T extends string>(choice: SegmentedChoice<T>, option: T): HTMLButtonElement {
  const isCurrent: boolean = option === choice.current;
  const segment: HTMLButtonElement = element('button', `chat-settings-segment${isCurrent ? ' is-current' : ''}`, choice.label(option));
  segment.type = 'button';
  segment.disabled = choice.isLocked;
  segment.setAttribute('role', 'radio');
  segment.setAttribute('aria-checked', String(isCurrent));
  segment.addEventListener('click', (): void => {
    if (!isCurrent) choice.pick(option);
  });
  return segment;
}
