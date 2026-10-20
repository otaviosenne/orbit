// Puts parent's children in the wanted order, touching only nodes that are out of place. Re-inserting a node
// throws away its scroll position, focus and selection, so a node that only moves uses moveBefore, which keeps them.
export function syncChildren(parent: HTMLElement, wanted: readonly HTMLElement[]): void {
  wanted.forEach((child: HTMLElement, index: number): void => {
    const current: Element | null = parent.children[index] ?? null;
    if (current !== child) place(parent, child, current);
  });
  while (parent.children.length > wanted.length) parent.lastElementChild?.remove();
}

function place(parent: HTMLElement, child: HTMLElement, before: Element | null): void {
  if (child.parentElement === parent) {
    try {
      parent.moveBefore(child, before);
      return;
    } catch {
      // Not supported here; a plain insert still gets the order right.
    }
  }
  parent.insertBefore(child, before);
}
