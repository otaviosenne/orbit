// Reading the end of the thread: within this distance a layout change should keep the reader there.
const FOLLOW_THRESHOLD_PX: number = 48;

export function isAtThreadEnd(thread: HTMLElement): boolean {
  return thread.scrollHeight - thread.scrollTop - thread.clientHeight < FOLLOW_THRESHOLD_PX;
}

// Room reserved at the thread's end can grow (a taller composer, the working line appearing); someone reading
// the last message should see it move up with that room instead of ending up underneath it.
export function keepingThreadEnd(thread: HTMLElement, change: () => void): void {
  const wasAtEnd: boolean = isAtThreadEnd(thread);
  change();
  if (wasAtEnd) thread.scrollTop = thread.scrollHeight;
}
