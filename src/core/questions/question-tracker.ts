import type { Question, QuestionItem } from '../../shared/types';
import type { ToolInput } from '../tool-summary';
import { parseQuestions } from './question-input';
import { recordedAnswers } from './question-result';

type MutableQuestion = { -readonly [K in keyof QuestionItem]: QuestionItem[K] };

export interface QuestionResult {
  readonly isError: boolean;
  readonly text: string;
  readonly toolUseResult: unknown;
}

// Follows each AskUserQuestion from the moment it is asked until it is answered, declined or left behind.
export class QuestionTracker {
  private readonly open: Map<string, MutableQuestion> = new Map();

  // Returns the item to show, or null when the input is not a picker the panel can render.
  ask(id: string, timestamp: number, input: ToolInput): QuestionItem | null {
    const questions: Question[] | null = parseQuestions(input);
    if (questions === null) return null;
    const item: MutableQuestion = { kind: 'question', id, timestamp, questions, state: 'pending', answers: questions.map(() => null), note: null };
    this.open.set(id, item);
    return item;
  }

  // Returns false when the result belongs to some other tool.
  resolve(toolUseId: string, result: QuestionResult): boolean {
    const item: MutableQuestion | undefined = this.open.get(toolUseId);
    if (item === undefined) return false;
    this.open.delete(toolUseId);
    item.state = result.isError ? 'declined' : 'answered';
    item.answers = result.isError ? item.answers : recordedAnswers(result.toolUseResult, item.questions);
    item.note = result.text.trim().length > 0 ? result.text : null;
    return true;
  }

  // The chat cannot go on while a question waits, so anything said after it means it will never be answered.
  expireOpen(): void {
    for (const item of this.open.values()) item.state = 'expired';
    this.open.clear();
  }
}
