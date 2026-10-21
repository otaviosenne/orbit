import { MAX_WIRE_ID } from '../../shared/dictation-protocol';

// Requests waiting for their answer, by id: answers may come back in any order, and when the socket drops every one
// still waiting gets the same fallback, so nothing waits forever.
export class PendingReplies<T> {
  private readonly waiting: Map<number, (value: T) => void> = new Map();
  private lastId: number = 0;

  open(): { readonly id: number; readonly reply: Promise<T> } {
    this.lastId = this.lastId >= MAX_WIRE_ID ? 1 : this.lastId + 1;
    const id: number = this.lastId;
    const reply: Promise<T> = new Promise((resolve: (value: T) => void): void => {
      this.waiting.set(id, resolve);
    });
    return { id, reply };
  }

  settle(id: number, value: T): void {
    const resolve: ((value: T) => void) | undefined = this.waiting.get(id);
    this.waiting.delete(id);
    resolve?.(value);
  }

  settleAll(value: T): void {
    const all: ((value: T) => void)[] = [...this.waiting.values()];
    this.waiting.clear();
    all.forEach((resolve: (value: T) => void): void => resolve(value));
  }
}
