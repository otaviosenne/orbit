// Words keep arriving while the microphone is on, and each one would move the focus back to the composer; focusing
// a field drops the page's selection, so text picked in the thread (to copy a message) vanished mid-drag. While
// the user is picking text, the composer waits for the focus instead.
let isPointerDown: boolean = false;
let isWatching: boolean = false;

// Once per window, before any dictation: a press that began earlier would go unseen.
export function watchTextPicking(): void {
  if (isWatching) return;
  isWatching = true;
  window.addEventListener('pointerdown', (): void => void (isPointerDown = true), true);
  for (const type of ['pointerup', 'pointercancel', 'blur'] as const) window.addEventListener(type, (): void => void (isPointerDown = false), true);
}

// A drag still choosing text, or text already chosen and not yet let go.
export function isPickingText(): boolean {
  return isPointerDown || hasSelectedText();
}

function hasSelectedText(): boolean {
  const selection: Selection | null = window.getSelection();
  return selection !== null && !selection.isCollapsed && selection.toString().length > 0;
}
