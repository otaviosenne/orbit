// A finger that slips this little is still tapping; more is a scroll.
const MOVE_TOLERANCE_PX: number = 10;
// Holding this long opens the card's menu, as a right click does on the desktop.
const LONG_PRESS_MS: number = 500;
const PRIMARY_BUTTON: number = 0;
// Cards and timeline lanes, but not the Panel's tiles, which hold their own text fields and buttons.
const CHAT_TARGET: string = '[data-session]';
const OWN_HANDLING: string = '.grid-view';

interface Press {
  readonly x: number;
  readonly y: number;
  readonly timer: number;
  moved: boolean;
  longPressed: boolean;
}

// The app opens a chat on pointerdown, which on a phone would fire at the start of every scroll. Touches on chats are
// held back here and replayed as a mouse press only once they turn out to be a tap; a long press becomes the
// context menu that iOS never sends.
export function installTouchTaps(view: HTMLElement): void {
  let press: Press | null = null;
  view.addEventListener('pointerdown', (event: PointerEvent): void => {
    if (!event.isTrusted || event.pointerType !== 'touch' || !isChatTarget(event.target)) return;
    event.stopPropagation();
    const timer: number = window.setTimeout((): void => {
      if (press === null || press.moved) return;
      press.longPressed = true;
      replay(press.x, press.y, (target: Element) => target.dispatchEvent(contextMenuAt(press?.x ?? 0, press?.y ?? 0)));
    }, LONG_PRESS_MS);
    press = { x: event.clientX, y: event.clientY, timer, moved: false, longPressed: false };
  }, true);
  view.addEventListener('pointermove', (event: PointerEvent): void => {
    if (press === null || event.pointerType !== 'touch') return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > MOVE_TOLERANCE_PX) press.moved = true;
  }, true);
  view.addEventListener('pointerup', (event: PointerEvent): void => {
    if (press === null || event.pointerType !== 'touch') return;
    const ended: Press = press;
    press = null;
    window.clearTimeout(ended.timer);
    if (!ended.moved && !ended.longPressed) replay(ended.x, ended.y, (target: Element) => clickAt(target, ended.x, ended.y));
  }, true);
  view.addEventListener('pointercancel', (): void => {
    if (press !== null) window.clearTimeout(press.timer);
    press = null;
  }, true);
  // Android sends its own context menu on a long press; whichever comes first wins and the other is dropped.
  view.addEventListener('contextmenu', (event: MouseEvent): void => {
    if (!event.isTrusted || press === null) return;
    if (press.longPressed) return void event.stopPropagation();
    press.longPressed = true;
    window.clearTimeout(press.timer);
  }, true);
}

function isChatTarget(target: EventTarget | null): boolean {
  const node: HTMLElement | null = target instanceof HTMLElement ? target : null;
  return node !== null && node.closest(CHAT_TARGET) !== null && node.closest(OWN_HANDLING) === null;
}

// The board may have been rebuilt during the touch, so the element under the finger now gets the event.
function replay(x: number, y: number, send: (target: Element) => void): void {
  const target: Element | null = document.elementFromPoint(x, y);
  if (target !== null) send(target);
}

function clickAt(target: Element, x: number, y: number): void {
  const init: PointerEventInit = { bubbles: true, cancelable: true, button: PRIMARY_BUTTON, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y };
  target.dispatchEvent(new PointerEvent('pointerdown', init));
  target.dispatchEvent(new PointerEvent('pointerup', init));
}

function contextMenuAt(x: number, y: number): MouseEvent {
  return new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y });
}
