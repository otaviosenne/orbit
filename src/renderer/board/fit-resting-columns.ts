import { isPhoneLayout } from '../host';
import type { RestingHeights } from './resting-split';
import { restingHeights } from './resting-split';

const STACK_SELECTOR: string = '.column-stack';
const ACTIVE_SELECTOR: string = '.column-active';
const IDLE_SELECTOR: string = '.column-idle';

// Sizes Active and Idle in the board's third column from how many cards each holds (resting-split.ts). A phone lays
// the board out as one list, so it is left to the stylesheet there.
export function fitRestingColumns(root: HTMLElement): void {
  const stack: HTMLElement | null = root.querySelector<HTMLElement>(STACK_SELECTOR);
  const active: HTMLElement | null = stack?.querySelector<HTMLElement>(ACTIVE_SELECTOR) ?? null;
  const idle: HTMLElement | null = stack?.querySelector<HTMLElement>(IDLE_SELECTOR) ?? null;
  if (stack === null || active === null || idle === null || isPhoneLayout()) return;
  const gap: number = parseFloat(getComputedStyle(stack).rowGap) || 0;
  // scrollHeight is a scrolling column's full content, whatever height it is given now.
  const heights: RestingHeights = restingHeights(stack.clientHeight - gap, active.scrollHeight, idle.scrollHeight);
  active.style.flex = `0 0 ${heights.active}px`;
  idle.style.flex = `0 0 ${heights.idle}px`;
}
