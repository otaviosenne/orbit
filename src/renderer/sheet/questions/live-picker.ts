import type { ActionResult, ChatSnapshot, QuestionAnswer, QuestionItem, QuestionPicker, RadarApi } from '../../../shared/types';
import type { PickerActions } from './picker-card';
import { QuestionCards, pickerKey } from './question-cards';

export type QuestionPickerApi = Pick<RadarApi, 'getQuestionPicker' | 'answerQuestion' | 'submitAnswers' | 'answerQuestionSet' | 'getChats' | 'focusChat'>;

// The question picker showing in a chat's terminal, kept in step with each poll of the thread.
export class LivePicker {
  private picker: QuestionPicker | null = null;
  private shownFor: string | null = null;
  // The newest chat asked about; a slower read for a chat the thread has since left is dropped.
  private requestedFor: string | null = null;
  private isWaiting: boolean = false;
  private readonly cards: QuestionCards = new QuestionCards();

  // onChange: the card appeared, changed or went away, so the thread must render again.
  constructor(private readonly api: QuestionPickerApi, private readonly onChange: () => void) {}

  // asked: the newest question the transcript shows as waiting; it is part of what the card looks like.
  key(asked: QuestionItem | null): string {
    return pickerKey(this.view(asked));
  }

  // The terminal is only read while the chat waits on the user; any other state hides the card.
  async sync(sessionId: string, isWaiting: boolean): Promise<void> {
    this.requestedFor = sessionId;
    const picker: QuestionPicker | null = isWaiting ? await this.read(sessionId) : null;
    if (this.requestedFor !== sessionId) return;
    const waitingChanged: boolean = isWaiting !== this.isWaiting;
    this.isWaiting = isWaiting;
    if (sessionId === this.shownFor && pickerKey(picker) === pickerKey(this.picker) && !waitingChanged) return;
    this.shownFor = sessionId;
    this.picker = picker;
    this.onChange();
  }

  render(asked: QuestionItem | null): HTMLElement[] {
    const view: QuestionPicker | null = this.view(asked);
    return view === null || this.shownFor === null ? [] : [this.cards.render(view, this.actionsFor(this.shownFor))];
  }

  // While the chat waits, a question the transcript already has is always answerable, even if the terminal could
  // not be read; anything in the way of delivering it shows after Submit.
  private view(asked: QuestionItem | null): QuestionPicker | null {
    if (this.picker?.kind === 'set' || !this.isWaiting || asked === null) return this.picker;
    return { kind: 'set', questionId: asked.id, questions: asked.questions };
  }

  clear(): void {
    this.picker = null;
    this.shownFor = null;
    this.requestedFor = null;
    this.isWaiting = false;
    this.cards.clear();
  }

  private async goToChat(sessionId: string): Promise<void> {
    const chat: ChatSnapshot | undefined = (await this.api.getChats()).find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
    if (chat !== undefined) await this.api.focusChat(chat.pid);
  }

  private async read(sessionId: string): Promise<QuestionPicker | null> {
    try {
      return await this.api.getQuestionPicker(sessionId);
    } catch (error: unknown) {
      console.error('Could not read the question picker:', error);
      return null;
    }
  }

  private actionsFor(sessionId: string): PickerActions {
    return {
      answer: (fingerprint: string, answer: QuestionAnswer): Promise<ActionResult> => this.api.answerQuestion(sessionId, fingerprint, answer),
      submit: (fingerprint: string): Promise<ActionResult> => this.api.submitAnswers(sessionId, fingerprint),
      answerSet: (questionId: string, answers: readonly QuestionAnswer[]): Promise<ActionResult> => this.api.answerQuestionSet(sessionId, questionId, answers),
      moved: (): void => void this.sync(sessionId, true),
      goToChat: (): void => void this.goToChat(sessionId),
    };
  }
}
