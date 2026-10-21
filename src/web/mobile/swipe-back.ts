import { requireElement } from '../../renderer/dom';
import { isNarrowScreen } from './narrow-screen';
import type { SwipeIntent, SwipeSample } from './swipe-back-decision';
import { finishesBack, releaseVelocity, startsAtEdge, swipeIntent } from './swipe-back-decision';

// Set while the finger drives the chat, so CSS drops its slide transition and shows the board behind it.
const DRAGGING_CLASS: string = 'is-swiping';
const OPEN_CLASS: string = 'is-open';
const AGENT_CLASS: string = 'is-agent';

interface Swipe {
  readonly startX: number;
  readonly startY: number;
  intent: SwipeIntent;
  previous: SwipeSample;
  last: SwipeSample;
}

// On a phone the full-screen chat follows a finger dragged in from the left edge, like iPhone's back swipe.
// Released far or fast enough, it goes back the way the back button does: from an agent to its chat, from the
// chat to the board. The listeners only claim a touch that started at the edge and moved right, so the thread's
// scrolling (and sideways scrolling inside code blocks) stays the browser's.
export function installSwipeBack(): void {
  const sheet: HTMLElement = requireElement('#sheet');
  let swipe: Swipe | null = null;
  sheet.addEventListener('touchstart', (event: TouchEvent): void => {
    const touch: Touch | undefined = event.touches[0];
    const canStart: boolean = event.touches.length === 1 && sheet.classList.contains(OPEN_CLASS) && isNarrowScreen();
    swipe = touch !== undefined && canStart && startsAtEdge(touch.clientX) ? startSwipe(touch, event.timeStamp) : null;
  }, { passive: true });
  // Not passive: once the drag is the back gesture, the page must not scroll under it.
  sheet.addEventListener('touchmove', (event: TouchEvent): void => {
    const touch: Touch | undefined = event.touches[0];
    if (swipe === null || touch === undefined) return;
    const dx: number = touch.clientX - swipe.startX;
    if (swipe.intent === 'undecided') swipe.intent = swipeIntent(dx, touch.clientY - swipe.startY);
    if (swipe.intent === 'scroll') return void (swipe = null);
    if (swipe.intent !== 'back') return;
    if (event.cancelable) event.preventDefault();
    swipe.previous = swipe.last;
    swipe.last = { x: touch.clientX, time: event.timeStamp };
    follow(sheet, dx);
  }, { passive: false });
  sheet.addEventListener('touchend', (event: TouchEvent): void => {
    const ended: Swipe | null = swipe;
    swipe = null;
    if (ended?.intent !== 'back') return;
    const dx: number = ended.last.x - ended.startX;
    settle(sheet, finishesBack(dx, sheet.clientWidth, releaseVelocity(ended.previous, ended.last, event.timeStamp)));
  });
  sheet.addEventListener('touchcancel', (): void => {
    if (swipe?.intent === 'back') settle(sheet, false);
    swipe = null;
  });
}

function startSwipe(touch: Touch, time: number): Swipe {
  const sample: SwipeSample = { x: touch.clientX, time };
  return { startX: touch.clientX, startY: touch.clientY, intent: 'undecided', previous: sample, last: sample };
}

function follow(sheet: HTMLElement, dx: number): void {
  sheet.classList.add(DRAGGING_CLASS);
  sheet.style.transform = `translateX(${Math.max(0, dx)}px)`;
}

// The inline offset goes in the same frame as the class change, so the CSS transition carries on from the finger:
// out to the right when going back, or home again.
function settle(sheet: HTMLElement, goBack: boolean): void {
  sheet.classList.remove(DRAGGING_CLASS);
  sheet.style.removeProperty('transform');
  if (goBack) backButton(sheet).click();
}

// The same buttons a tap would use: an agent's transcript backs out to its chat, the chat to the board.
function backButton(sheet: HTMLElement): HTMLElement {
  return sheet.classList.contains(AGENT_CLASS) ? requireElement('#sheet-back') : requireElement('#sheet-close');
}
