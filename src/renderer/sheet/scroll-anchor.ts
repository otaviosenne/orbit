// A few items from the thread's top edge down, and where each sat; older items added above should not move them.
// More than one, because the topmost can be rebuilt by the change itself (a tool group that older tools joined).
export interface ScrollAnchor {
  readonly candidates: readonly AnchorPoint[];
  readonly scrollTop: number;
}

interface AnchorPoint {
  readonly element: Element;
  readonly top: number;
}

const ANCHOR_CANDIDATES: number = 3;

export function captureScrollAnchor(thread: HTMLElement): ScrollAnchor {
  const edge: number = thread.getBoundingClientRect().top;
  const children: Element[] = [...thread.children];
  const first: number = children.findIndex((child: Element) => child.getBoundingClientRect().bottom > edge);
  const candidates: AnchorPoint[] = first === -1 ? [] : children.slice(first, first + ANCHOR_CANDIDATES).map(anchorPoint);
  return { candidates, scrollTop: thread.scrollTop };
}

// Measured after the change, so it also holds when the browser's own scroll anchoring already corrected it.
export function restoreScrollAnchor(thread: HTMLElement, anchor: ScrollAnchor): void {
  const kept: AnchorPoint | undefined = anchor.candidates.find((point: AnchorPoint) => point.element.parentElement === thread);
  if (kept === undefined) thread.scrollTop = anchor.scrollTop;
  else thread.scrollTop += kept.element.getBoundingClientRect().top - kept.top;
}

function anchorPoint(element: Element): AnchorPoint {
  return { element, top: element.getBoundingClientRect().top };
}
