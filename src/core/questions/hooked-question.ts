import type { Question, QuestionItem, TranscriptItem } from '../../shared/types';
import { isRecord, parseQuestions } from './question-input';

// A question saved by the PreToolUse hook the moment it was asked, before the transcript may have it.
// Null when the record is malformed, or the transcript shows the chat already went past it.
export function hookedQuestion(record: unknown, items: readonly TranscriptItem[]): QuestionItem | null {
  if (!isRecord(record) || typeof record['tool_use_id'] !== 'string' || typeof record['saved_at'] !== 'number') return null;
  if (!isRecord(record['tool_input'])) return null;
  const id: string = record['tool_use_id'];
  const savedAt: number = record['saved_at'];
  if (items.some((item: TranscriptItem) => isPastQuestion(item, id, savedAt))) return null;
  const questions: Question[] | null = parseQuestions(record['tool_input']);
  if (questions === null) return null;
  return { kind: 'question', id, timestamp: savedAt, questions, state: 'pending', answers: questions.map(() => null), note: null };
}

// Settled in the transcript, or the user spoke or the turn ended after it was asked: either way it no longer waits.
// The assistant's own output is not counted, since its write can land after the hook ran.
function isPastQuestion(item: TranscriptItem, id: string, savedAt: number): boolean {
  if (item.id === id) return item.kind === 'question' && item.state !== 'pending';
  const movesOn: boolean = (item.kind === 'message' && item.role === 'user') || item.kind === 'turn';
  return movesOn && item.timestamp > savedAt;
}
