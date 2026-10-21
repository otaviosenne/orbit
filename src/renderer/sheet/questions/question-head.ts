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
export class QuestionProgress {
  readonly root: HTMLDivElement = element('div', 'question-progress');
  private readonly segments: HTMLElement[];

  constructor(count: number) {
    this.segments = Array.from({ length: count }, (): HTMLElement => element('i', 'question-progress-step'));
    this.root.setAttribute('aria-hidden', 'true');
    this.root.append(...this.segments);
  }

  show(current: number, answered: readonly boolean[]): void {
    this.segments.forEach((segment: HTMLElement, index: number): void => {
      segment.classList.toggle('is-current', index === current);
      segment.classList.toggle('is-done', answered[index] === true);
    });
  }
}
