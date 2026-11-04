import { describe, expect, it } from 'vitest';
import { openQueue, type QueueOperation } from '../src/core/queue/prompt-queue';
import { poppedPrompts, queuedMessages } from '../src/core/queue/queued-prompt-reader';
import { finalPrompts } from '../src/main/queue/queue-hold';

const step = (operation: string, content: string | null, at: number): QueueOperation => ({ operation, content, at });

describe('the queue of prompts a busy chat logs', () => {
  it('keeps what was enqueued and not yet taken, oldest first', () => {
    const queue = openQueue([step('enqueue', 'a', 1), step('enqueue', 'b', 2), step('enqueue', 'c', 3), step('dequeue', null, 4)]);
    expect(queue.map((prompt) => prompt.content)).toEqual(['b', 'c']);
  });

  it('drops a prompt absorbed mid-turn or pulled back into the input by name', () => {
    const queue = openQueue([step('enqueue', 'a', 1), step('enqueue', 'b', 2), step('remove', 'b', 3), step('popAll', 'a', 4), step('enqueue', 'a2', 5)]);
    expect(queue.map((prompt) => prompt.content)).toEqual(['a2']);
  });

  it('ignores a dequeue with nothing known to be queued', () => {
    expect(openQueue([step('dequeue', null, 1), step('enqueue', 'a', 2)])).toEqual([{ content: 'a', enqueuedAt: 2 }]);
  });

  it('shows only the user messages, unwrapped, as queued items', () => {
    const items = queuedMessages([
      { content: '<pasted_content id="ab12">\nhello there\n</pasted_content>', enqueuedAt: 10 },
      { content: '<task-notification><status>completed</status><summary>done</summary></task-notification>', enqueuedAt: 11 },
      { content: '/compact', enqueuedAt: 12 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ text: 'hello there', timestamp: 10, isQueued: true, role: 'user' });
  });
});

describe('editing the queue', () => {
  const line = (operation: string, content: string, at: string): string =>
    JSON.stringify({ type: 'queue-operation', operation, timestamp: at, content });

  it('reads the prompts an Up press pulled back, after the press only', () => {
    const text = [
      line('popAll', 'old', '2026-11-04T14:00:00.000Z'),
      line('popAll', 'first', '2026-11-04T14:43:47.308Z'),
      line('popAll', 'second\nline', '2026-11-04T14:43:47.308Z'),
    ].join('\n');
    expect(poppedPrompts(text, Date.parse('2026-11-04T14:43:47.000Z'))).toEqual(['first', 'second\nline']);
  });

  it('types every prompt back in order, as edited, leaving an emptied one out', () => {
    expect(finalPrompts(['first', 'second'], [' first EDITED ', 'second'])).toEqual(['first EDITED', 'second']);
    expect(finalPrompts(['first', 'second'], ['first', '   '])).toEqual(['first']);
  });

  it('types the prompts back as they were on cancel or when the edits do not line up', () => {
    const wrapped: string = '<pasted_content id="ab12">\nlong paste\n</pasted_content>';
    expect(finalPrompts([wrapped, 'second'], null)).toEqual(['long paste', 'second']);
    expect(finalPrompts(['first', 'second'], ['only one'])).toEqual(['first', 'second']);
  });
});

describe('reading the queue from a transcript', () => {
  const at = (minute: number): string => new Date(Date.UTC(2026, 10, 4, 14, minute)).toISOString();
  const queueLine = (operation: string, minute: number, content?: string): string =>
    JSON.stringify({ type: 'queue-operation', operation, timestamp: at(minute), ...(content === undefined ? {} : { content }) });
  const turnEnd = (minute: number): string => JSON.stringify({ type: 'system', subtype: 'turn_duration', durationMs: 1, timestamp: at(minute) });

  async function queueOf(lines: readonly string[], since: number): Promise<string[]> {
    const { mkdtemp, writeFile } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { QueuedPromptReader } = await import('../src/core/queue/queued-prompt-reader');
    const path: string = join(await mkdtemp(join(tmpdir(), 'queue-')), 'chat.jsonl');
    await writeFile(path, `${lines.join('\n')}\n`);
    return (await new QueuedPromptReader().read(path, since)).map((prompt) => prompt.content);
  }

  it('forgets what an earlier process left queued', async () => {
    expect(await queueOf([queueLine('enqueue', 1, 'left behind'), queueLine('enqueue', 10, 'fresh')], Date.parse(at(5)))).toEqual(['fresh']);
  });

  it('counts a prompt dequeued after the turn that ended as taken in', async () => {
    const lines: string[] = [queueLine('enqueue', 1, 'waited'), turnEnd(2), queueLine('dequeue', 2), queueLine('enqueue', 3, 'still waiting')];
    expect(await queueOf(lines, 0)).toEqual(['still waiting']);
  });
});
