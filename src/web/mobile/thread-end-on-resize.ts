import { requireElement } from '../../renderer/dom';
import { isAtThreadEnd } from '../../renderer/sheet/thread-end';
import { bottomAnchoredScrollTop } from './bottom-anchor';

// The keyboard opening shrinks the full-screen chat from below. As in Messages, the thread moves up with it: the
// message that was right above the composer is still right above it, at the end of the chat or anywhere else.
// The place is read on every scroll, from before the resize: by the time the resize is seen, a box that grew (the
// keyboard closing, after a send) has already been clamped by the browser, and moving it again would hide the end.
export function keepThreadEndOnResize(): void {
  const thread: HTMLElement = requireElement('#sheet-messages');
  let height: number = thread.clientHeight;
  let scrollTop: number = thread.scrollTop;
  let wasAtEnd: boolean = true;
  thread.addEventListener('scroll', (): void => {
    scrollTop = thread.scrollTop;
    wasAtEnd = isAtThreadEnd(thread);
  }, { passive: true });
  new ResizeObserver((): void => {
    const next: number = thread.clientHeight;
    thread.scrollTop = wasAtEnd ? thread.scrollHeight : bottomAnchoredScrollTop(scrollTop, height, next);
    height = next;
    scrollTop = thread.scrollTop;
  }).observe(thread);
}
