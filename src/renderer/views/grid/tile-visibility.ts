// Whether any of the tile shows inside the grid's scrolled area. Measured on each poll rather than with an
// IntersectionObserver, which reports nothing while the window sits on a hidden workspace.
export function isTileInView(tile: HTMLElement, scroller: HTMLElement): boolean {
  if (!tile.isConnected) return false;
  const view: DOMRect = scroller.getBoundingClientRect();
  const rect: DOMRect = tile.getBoundingClientRect();
  return rect.bottom > view.top && rect.top < view.bottom && rect.right > view.left && rect.left < view.right;
}
