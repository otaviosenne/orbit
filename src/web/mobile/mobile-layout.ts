import { requireElement } from '../../renderer/dom';
import { BoardColumnPicker } from './board-column-picker';
import { installColumnSwipe } from './column-swipe';
import { installSheetBack } from './sheet-back';
import { installTouchTaps } from './touch-taps';
import { trackViewportHeight } from './viewport-height';

// Everything here only adds to the desktop page; web.css decides at which widths each piece shows.
export function installMobileLayout(): void {
  const view: HTMLElement = requireElement('#view');
  const picker: BoardColumnPicker = new BoardColumnPicker(view);
  installColumnSwipe(view, (direction: 1 | -1): void => picker.step(direction));
  installTouchTaps(view);
  installSheetBack();
  trackViewportHeight();
}
