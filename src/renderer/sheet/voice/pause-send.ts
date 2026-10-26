interface Waiting {
  readonly value: string;
  readonly timer: ReturnType<typeof setTimeout>;
  readonly dueAt: number;
}

const waiting: WeakMap<HTMLTextAreaElement, Waiting> = new WeakMap();

// Runs `act` once the draft has stayed exactly as it is for afterMs. Live words repeat the same text on every update,
// and that must not restart the count; any change to the draft, spoken or typed, drops the wait.
export function actAfterPause(input: HTMLTextAreaElement, afterMs: number, act: () => void): void {
  if (waiting.get(input)?.value === input.value) return;
  cancelPause(input);
  const value: string = input.value;
  const timer: ReturnType<typeof setTimeout> = setTimeout((): void => {
    waiting.delete(input);
    if (input.value === value) act();
  }, afterMs);
  waiting.set(input, { value, timer, dueAt: Date.now() + afterMs });
}

export function cancelPause(input: HTMLTextAreaElement): void {
  const pending: Waiting | undefined = waiting.get(input);
  if (pending === undefined) return;
  clearTimeout(pending.timer);
  waiting.delete(input);
}

// The field is being left (its chat closed, another one opened, its tile removed) and its text goes with it: the wait
// carries on without the field, and `act` takes over at the same moment to send what was kept.
export function carryPause(input: HTMLTextAreaElement, act: () => void): void {
  const pending: Waiting | undefined = waiting.get(input);
  if (pending === undefined) return;
  cancelPause(input);
  setTimeout(act, Math.max(0, pending.dueAt - Date.now()));
}
