interface Waiting {
  readonly value: string;
  readonly timer: ReturnType<typeof setTimeout>;
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
  waiting.set(input, { value, timer });
}

export function cancelPause(input: HTMLTextAreaElement): void {
  const pending: Waiting | undefined = waiting.get(input);
  if (pending === undefined) return;
  clearTimeout(pending.timer);
  waiting.delete(input);
}
