import { requireElement } from '../../renderer/dom';
import { bottomAnchoredScrollTop } from './bottom-anchor';

// The keyboard opening shrinks the full-screen chat from below. As in Messages, the thread moves up with it: the
// message that was right above the composer is still right above it, at the end of the chat or anywhere else.
export function keepThreadEndOnResize(): void {
  const thread: HTMLElement = requireElement('#sheet-messages');
  let height: number = thread.clientHeight;
  new ResizeObserver((): void => {
    const next: number = thread.clientHeight;
    thread.scrollTop = bottomAnchoredScrollTop(thread.scrollTop, height, next);
    height = next;
  }).observe(thread);
}
