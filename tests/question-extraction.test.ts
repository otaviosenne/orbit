import { describe, expect, it } from 'vitest';
import { extractTranscript } from '../src/core/transcript-extractor';
import type { TranscriptRecord } from '../src/core/transcript-record';
import type { QuestionItem, TranscriptItem } from '../src/shared/types';

const noNames = (): string | null => null;

const COLOR = 'Which color do you prefer?';
const FRUITS = 'Which fruits do you like?';

const askRecord: TranscriptRecord = {
  type: 'assistant',
  uuid: 'a1',
  message: {
    content: [
      {
        type: 'tool_use',
        id: 'q1',
        name: 'AskUserQuestion',
        input: {
          questions: [
            { question: COLOR, header: 'Color', multiSelect: false, options: [{ label: 'Red', description: 'The color red' }, { label: 'Green', description: 'The color green' }] },
            { question: FRUITS, header: 'Fruits', multiSelect: true, options: [{ label: 'Apple', description: 'A crisp apple' }, { label: 'Cherry', description: 'A sweet cherry' }] },
          ],
        },
      },
    ],
  },
};

function resultRecord(content: string, isError: boolean, toolUseResult?: unknown): TranscriptRecord {
  return { type: 'user', uuid: 'r1', toolUseResult, message: { content: [{ type: 'tool_result', tool_use_id: 'q1', content, is_error: isError }] } };
}

function onlyQuestion(items: readonly TranscriptItem[]): QuestionItem {
  const questions: QuestionItem[] = items.filter((item: TranscriptItem): item is QuestionItem => item.kind === 'question');
  expect(questions).toHaveLength(1);
  return questions[0] as QuestionItem;
}

describe('extractTranscript with AskUserQuestion', () => {
  it('shows an unanswered question as a pending picker, not as a tool row', () => {
    const items: TranscriptItem[] = extractTranscript([askRecord], 10, noNames);
    expect(items.some((item: TranscriptItem) => item.kind === 'tool')).toBe(false);
    expect(onlyQuestion(items)).toMatchObject({
      id: 'q1',
      state: 'pending',
      answers: [null, null],
      questions: [
        { question: COLOR, header: 'Color', multiSelect: false, options: [{ label: 'Red' }, { label: 'Green' }] },
        { question: FRUITS, header: 'Fruits', multiSelect: true },
      ],
    });
  });

  it('reads the recorded answers per question once the result arrives', () => {
    const answers = { [COLOR]: 'Purple, dark', [FRUITS]: 'Apple, Cherry' };
    const result: TranscriptRecord = resultRecord('The user answered: ...', false, { questions: [], answers, annotations: {} });
    expect(onlyQuestion(extractTranscript([askRecord, result], 10, noNames))).toMatchObject({
      state: 'answered',
      answers: ['Purple, dark', 'Apple, Cherry'],
      note: 'The user answered: ...',
    });
  });

  it('keeps only the result text when no structured answers were recorded', () => {
    const result: TranscriptRecord = resultRecord('Your questions have been answered: "x"="y".', false);
    expect(onlyQuestion(extractTranscript([askRecord, result], 10, noNames))).toMatchObject({
      state: 'answered',
      answers: [null, null],
      note: 'Your questions have been answered: "x"="y".',
    });
  });

  it('marks a rejected question as declined', () => {
    const result: TranscriptRecord = resultRecord("The user doesn't want to proceed with this tool use.", true, 'User rejected tool use');
    expect(onlyQuestion(extractTranscript([askRecord, result], 10, noNames))).toMatchObject({ state: 'declined', answers: [null, null] });
  });

  it('expires a question the conversation moved past without an answer', () => {
    const later: TranscriptRecord = { type: 'user', uuid: 'u2', message: { content: 'never mind' } };
    expect(onlyQuestion(extractTranscript([askRecord, later], 10, noNames)).state).toBe('expired');
  });

  it('stays pending while another tool asked alongside it finishes', () => {
    const sibling: TranscriptRecord = {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: 'other', content: 'done' }] },
    };
    expect(onlyQuestion(extractTranscript([askRecord, sibling], 10, noNames)).state).toBe('pending');
  });

  it('falls back to a tool row when the input is not a picker', () => {
    const broken: TranscriptRecord = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'q2', name: 'AskUserQuestion', input: { questions: 'oops' } }] } };
    expect(extractTranscript([broken], 10, noNames)).toMatchObject([{ kind: 'tool', name: 'AskUserQuestion' }]);
  });
});
