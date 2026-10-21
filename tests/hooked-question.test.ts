import { describe, expect, it } from 'vitest';
import { hookedQuestion } from '../src/core/questions/hooked-question';
import type { QuestionItem, TranscriptItem } from '../src/shared/types';

const SAVED_AT: number = 1_000;

const record = {
  session_id: 's1',
  tool_use_id: 'q1',
  saved_at: SAVED_AT,
  tool_input: { questions: [{ question: 'Pick one?', header: 'Pick', multiSelect: false, options: [{ label: 'A', description: 'first' }] }] },
};

function userMessage(timestamp: number): TranscriptItem {
  return { kind: 'message', id: `m${timestamp}`, timestamp, role: 'user', text: 'hi', images: [] } as unknown as TranscriptItem;
}

function assistantMessage(timestamp: number): TranscriptItem {
  return { kind: 'message', id: `a${timestamp}`, timestamp, role: 'assistant', text: 'asking', images: [] } as unknown as TranscriptItem;
}

function settled(id: string): QuestionItem {
  return { kind: 'question', id, timestamp: SAVED_AT, questions: [], state: 'answered', answers: [], note: null };
}

describe('hookedQuestion', () => {
  it('builds a pending question from the hook record', () => {
    const item: QuestionItem | null = hookedQuestion(record, [userMessage(SAVED_AT - 1)]);
    expect(item?.id).toBe('q1');
    expect(item?.state).toBe('pending');
    expect(item?.questions[0]?.options[0]?.label).toBe('A');
  });

  it('ignores a question the transcript already settled', () => {
    expect(hookedQuestion(record, [settled('q1')])).toBeNull();
  });

  it('ignores a question the user moved past', () => {
    expect(hookedQuestion(record, [userMessage(SAVED_AT + 1)])).toBeNull();
  });

  it('keeps a question when only the assistant wrote after it', () => {
    expect(hookedQuestion(record, [assistantMessage(SAVED_AT + 1)])).not.toBeNull();
  });

  it('rejects malformed records', () => {
    expect(hookedQuestion(null, [])).toBeNull();
    expect(hookedQuestion({ ...record, tool_input: { questions: [] } }, [])).toBeNull();
    expect(hookedQuestion({ ...record, saved_at: 'x' }, [])).toBeNull();
  });
});
