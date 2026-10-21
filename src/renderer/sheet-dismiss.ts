import { isPhoneLayout } from './host';
import { shouldDismissSheet } from './sheet-dismiss-decision';

// A finger that moves this little is still a tap on whatever it touched.
const START_THRESHOLD_PX: number = 8;
const DRAGGING_CLASS: string = 'is-pulled';

interface Pull {
  readonly startY: number;
  readonly startAt: number;
  lastY: number;
  lastAt: number;
  pulling: boolean;
}

// On a phone, a bottom sheet (New chat, Resume) follows a finger pulling it down and closes past a point, like iOS.
// A pull only starts while the sheet's own list is scrolled to the top, so scrolling the list still scrolls it.
export function installSheetDismiss(sheet: HTMLElement, scroller: () => HTMLElement, close: () => void): void {
  let pull: Pull | null = null;
  sheet.addEventListener('touchstart', (event: TouchEvent): void => {
    const touch: Touch | undefined = event.touches[0];
    if (!isPhoneLayout() || touch === undefined || event.touches.length > 1) return;
    pull = { startY: touch.clientY, startAt: event.timeStamp, lastY: touch.clientY, lastAt: event.timeStamp, pulling: false };
  }, { passive: true });
  sheet.addEventListener('touchmove', (event: TouchEvent): void => {
    const touch: Touch | undefined = event.touches[0];
    if (pull === null || touch === undefined) return;
    const distance: number = touch.clientY - pull.startY;
    if (!pull.pulling) {
      if (distance < START_THRESHOLD_PX || scroller().scrollTop > 0) return;
      pull.pulling = true;
      sheet.classList.add(DRAGGING_CLASS);
    }
    event.preventDefault();
    pull.lastY = touch.clientY;
    pull.lastAt = event.timeStamp;
    sheet.style.transform = `translateY(${Math.max(distance, 0)}px)`;
  }, { passive: false });
  const end = (event: TouchEvent): void => {
    const current: Pull | null = pull;
    pull = null;
    if (current === null || !current.pulling) return;
    sheet.classList.remove(DRAGGING_CLASS);
    const elapsed: number = Math.max(event.timeStamp - current.startAt, 1);
    const distance: number = current.lastY - current.startY;
    sheet.style.transform = '';
    if (shouldDismissSheet({ distance, height: sheet.offsetHeight, velocity: distance / elapsed })) close();
  };
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
}
