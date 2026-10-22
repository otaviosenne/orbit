import { element } from '../dom';
import { PIN_FILLED_ICON } from '../icons';

// Pinning happens from the card's right-click menu or by dragging the card onto Pinned; a pinned chat shows a filled pin left of its time.
export function renderPinMark(): HTMLSpanElement {
  const mark: HTMLSpanElement = element('span', 'card-pin');
  mark.setAttribute('aria-label', 'Pinned');
  mark.innerHTML = PIN_FILLED_ICON;
  return mark;
}
