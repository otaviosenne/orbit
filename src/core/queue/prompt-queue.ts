// Claude Code logs its queue of prompts sent while the chat works: enqueue adds one, dequeue takes the oldest as the
// next turn, remove takes one it absorbed mid-turn, and popAll takes each one pulled back into the input to edit.
export interface QueueOperation {
  readonly operation: string;
  readonly content: string | null;
  readonly at: number;
}

export interface QueuedPrompt {
  readonly content: string;
  readonly enqueuedAt: number;
}

const ENQUEUE: string = 'enqueue';
const DEQUEUE: string = 'dequeue';
// Both name the prompt they take out of the queue.
const TAKES_NAMED: ReadonlySet<string> = new Set(['remove', 'popAll']);

// The prompts still waiting after these operations, oldest first. Every operation counts, task notifications and
// slash commands included, so a dequeue takes what Claude Code really took.
export function openQueue(operations: readonly QueueOperation[]): QueuedPrompt[] {
  const queue: QueuedPrompt[] = [];
  for (const step of operations) {
    if (step.operation === ENQUEUE && step.content !== null) queue.push({ content: step.content, enqueuedAt: step.at });
    else if (step.operation === DEQUEUE) queue.shift();
    else if (TAKES_NAMED.has(step.operation)) takeNamed(queue, step.content);
  }
  return queue;
}

function takeNamed(queue: QueuedPrompt[], content: string | null): void {
  const index: number = queue.findIndex((prompt: QueuedPrompt) => prompt.content === content);
  if (index >= 0) queue.splice(index, 1);
}
