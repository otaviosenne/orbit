// Must match the breakpoint in web.css: below it the board shows one column and a chat takes the whole screen.
export const NARROW_QUERY: string = '(max-width: 700px)';

export function isNarrowScreen(): boolean {
  return window.matchMedia(NARROW_QUERY).matches;
}
