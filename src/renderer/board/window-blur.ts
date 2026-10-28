// Another window taking focus (an emoji picker, say) blurs a field while the person is still typing in it: the field
// keeps its text and gets focus back with the window. A click elsewhere blurs it with the window still focused, and
// by then another element (or none) is active.
export function isWindowBlur(field: Element, active: Element | null, windowHasFocus: boolean): boolean {
  return active === field && !windowHasFocus;
}
