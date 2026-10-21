import { element } from '../../dom';
import { QUESTION_MARK_ICON } from '../../icons';

// The card's title with its round question badge, shared by the transcript and the screen-read cards.
export function renderQuestionTitle(title: string): HTMLElement[] {
  const badge: HTMLSpanElement = element('span', 'question-badge');
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = QUESTION_MARK_ICON;
  return [badge, element('span', 'question-title', title)];
}

// One segment per question: answered ones filled, the current one strongest, so where you are reads at a glance.
// Each segment is also a way straight to its question, so the set need not be walked one step at a time.
export class QuestionProgress {
  readonly root: HTMLDivElement = element('div', 'question-progress');
  private readonly segments: HTMLButtonElement[];

  constructor(count: number, select: (index: number) => void) {
    this.segments = Array.from({ length: count }, (_: unknown, index: number): HTMLButtonElement => renderSegment(index, count, select));
    this.root.append(...this.segments);
  }

  show(current: number, answered: readonly boolean[]): void {
    this.segments.forEach((segment: HTMLElement, index: number): void => {
      segment.classList.toggle('is-current', index === current);
      segment.classList.toggle('is-done', answered[index] === true);
      segment.setAttribute('aria-current', String(index === current));
    });
  }

  setDisabled(disabled: boolean): void {
    this.segments.forEach((segment: HTMLButtonElement): void => void (segment.disabled = disabled));
  }
}

function renderSegment(index: number, count: number, select: (index: number) => void): HTMLButtonElement {
  const segment: HTMLButtonElement = element('button', 'question-progress-step');
  segment.type = 'button';
  segment.setAttribute('aria-label', `Question ${index + 1} of ${count}`);
  segment.addEventListener('click', (): void => select(index));
  return segment;
}
