import { requireElement } from '../../renderer/dom';
import { isAtThreadEnd } from '../../renderer/sheet/thread-end';

// The keyboard opening shrinks the full-screen chat from below. Someone reading the newest message should keep it
// in sight above the composer, as in Messages, instead of finding it under the keyboard. Whether they were at the
// end is read on every scroll, since by the time the resize is seen the thread is already shorter.
export function keepThreadEndOnResize(): void {
  const thread: HTMLElement = requireElement('#sheet-messages');
  let wasAtEnd: boolean = true;
  thread.addEventListener('scroll', (): void => {
    wasAtEnd = isAtThreadEnd(thread);
  }, { passive: true });
  new ResizeObserver((): void => {
    if (wasAtEnd) thread.scrollTop = thread.scrollHeight;
  }).observe(thread);
}
