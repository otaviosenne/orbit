// Where the thread scrolls to when its box changes height, so what sat right above the composer stays there: the
// keyboard opening takes height from the bottom and the content rises with it, and closing gives it back.
// A box that was or becomes empty (the chat hidden or just shown) has nothing on screen to keep.
export function bottomAnchoredScrollTop(scrollTop: number, previousHeight: number, height: number): number {
  if (previousHeight <= 0 || height <= 0) return scrollTop;
  return Math.max(0, scrollTop + previousHeight - height);
}
