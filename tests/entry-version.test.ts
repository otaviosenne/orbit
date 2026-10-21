import { describe, expect, it } from 'vitest';
import type { TranscriptEntry } from '../src/renderer/sheet/transcript/group-tools';
import { entryVersion } from '../src/renderer/sheet/transcript/entry-version';
import type { QuestionItem, ToolItem } from '../src/shared/types';

const tool = (id: string, output: string | null, isError: boolean = false): ToolItem => ({
  kind: 'tool', id, timestamp: 0, name: 'Bash', summary: '', input: '', output, isError,
});
const group = (...tools: ToolItem[]): TranscriptEntry => ({ kind: 'tools', id: tools[0]?.id ?? '', tools });

describe('entryVersion', () => {
  it('stays the same for a message, so its markdown is not built again', () => {
    const message: TranscriptEntry = { kind: 'message', id: 'm', timestamp: 0, role: 'assistant', text: 'hi', images: [] };
    expect(entryVersion(message)).toBe(entryVersion({ ...message }));
  });

  it('changes when a tool joins the group or its result arrives', () => {
    const versions: Set<string> = new Set([
      entryVersion(group(tool('a', null))),
      entryVersion(group(tool('a', 'ok'))),
      entryVersion(group(tool('a', 'ok'), tool('b', null))),
      entryVersion(group(tool('a', 'boom', true), tool('b', null))),
    ]);
    expect(versions.size).toBe(4);
  });

  it('changes when a question gets its answer', () => {
    const question: QuestionItem = { kind: 'question', id: 'q', timestamp: 0, state: 'pending', questions: [], answers: [], note: null };
    expect(entryVersion(question)).not.toBe(entryVersion({ ...question, state: 'answered' }));
  });
});
