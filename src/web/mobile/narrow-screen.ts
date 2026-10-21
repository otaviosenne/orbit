import { PHONE_QUERY } from '../../renderer/host';

// Must match the breakpoint in web.css: below it the board is one ordered list and a chat takes the whole screen.
export const NARROW_QUERY: string = PHONE_QUERY;

export function isNarrowScreen(): boolean {
  return window.matchMedia(NARROW_QUERY).matches;
}
