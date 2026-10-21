import { requireElement } from '../../renderer/dom';
import { installScrollDismissesKeyboard } from './scroll-dismiss-keyboard';
import { installSheetBack } from './sheet-back';
import { installSwipeBack } from './swipe-back';
import { keepThreadEndOnResize } from './thread-end-on-resize';
import { installTouchTaps } from './touch-taps';
import { trackViewportHeight } from './viewport-height';

// Everything here only adds to the desktop page; web.css decides at which widths each piece shows.
export function installMobileLayout(): void {
  const view: HTMLElement = requireElement('#view');
  installTouchTaps(view);
  installSheetBack();
  installSwipeBack();
  trackViewportHeight();
  keepThreadEndOnResize();
  installScrollDismissesKeyboard();
}
