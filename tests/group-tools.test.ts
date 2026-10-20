import { describe, expect, it } from 'vitest';
import { groupTools } from '../src/renderer/sheet/transcript/group-tools';
import type { TranscriptItem } from '../src/shared/types';

const tool = (id: string): TranscriptItem => ({ kind: 'tool', id, timestamp: 0, name: 'Bash', summary: '', input: '', output: null, isError: false });
const text = (id: string): TranscriptItem => ({ kind: 'message', id, timestamp: 0, role: 'assistant', text: id, images: [] });

describe('groupTools', () => {
  it('merges back-to-back tool calls and keeps text between them as separators', () => {
    const entries = groupTools([tool('a'), tool('b'), text('x'), tool('c')]);
    expect(entries.map((entry) => (entry.kind === 'tools' ? entry.tools.map((item) => item.id).join('') : entry.kind))).toEqual(['ab', 'message', 'c']);
  });
});
