import { requireElement } from '../../renderer/dom';
import { isTextField } from '../../renderer/sheet/space-to-talk';

// A finger pulling the thread down this far is reading back, not a stray touch on the way to the composer.
const PULL_THRESHOLD_PX: number = 12;

// Scrolling up through the chat on a phone puts the keyboard away, like iOS Messages, so the thread gets the whole
// screen; typing again is a tap on the composer.
export function installScrollDismissesKeyboard(): void {
  const thread: HTMLElement = requireElement('#sheet-messages');
  let startY: number | null = null;
  thread.addEventListener('touchstart', (event: TouchEvent): void => {
    startY = event.touches[0]?.clientY ?? null;
  }, { passive: true });
  thread.addEventListener('touchmove', (event: TouchEvent): void => {
    const y: number | undefined = event.touches[0]?.clientY;
    if (startY === null || y === undefined || y - startY < PULL_THRESHOLD_PX) return;
    startY = null;
    const focused: Element | null = document.activeElement;
    if (focused instanceof HTMLElement && isTextField(focused)) focused.blur();
  }, { passive: true });
  thread.addEventListener('touchend', (): void => {
    startY = null;
  });
}
