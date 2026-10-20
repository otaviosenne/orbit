import type { ActionResult, QuestionAnswer, QuestionPicker, RadarApi } from '../../../shared/types';
import type { PickerActions } from './picker-card';
import { QuestionCards, pickerKey } from './question-cards';

export type QuestionPickerApi = Pick<RadarApi, 'getQuestionPicker' | 'answerQuestion' | 'submitAnswers'>;

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

  get key(): string {
    return pickerKey(this.picker);
  }

  // A question or review read off the screen, which the card can answer.
  get isReadable(): boolean {
    return this.picker !== null && this.picker.kind !== 'unreadable';
  }

  // The chat waits on the user but its picker could not be read; the transcript's copy has to stand in.
  get needsStandIn(): boolean {
    return this.isWaiting && !this.isReadable;
  }

  // The terminal is only read while the chat waits on the user; any other state hides the card.
  async sync(sessionId: string, isWaiting: boolean): Promise<void> {
    this.requestedFor = sessionId;
    const picker: QuestionPicker | null = isWaiting ? await this.read(sessionId) : null;
    if (this.requestedFor !== sessionId) return;
    const waitingChanged: boolean = isWaiting !== this.isWaiting;
    this.isWaiting = isWaiting;
    if (sessionId === this.shownFor && pickerKey(picker) === this.key && !waitingChanged) return;
    this.shownFor = sessionId;
    this.picker = picker;
    this.onChange();
  }

  // knowsQuestion: the transcript already shows the waiting question, which beats a card saying it cannot be read.
  render(knowsQuestion: boolean): HTMLElement[] {
    const { picker, shownFor } = this;
    if (picker === null || shownFor === null || (knowsQuestion && !this.isReadable)) return [];
    return [this.cards.render(picker, this.actionsFor(shownFor))];
  }

  clear(): void {
    this.picker = null;
    this.shownFor = null;
    this.requestedFor = null;
    this.isWaiting = false;
    this.cards.clear();
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
      moved: (): void => void this.sync(sessionId, true),
    };
  }
}
