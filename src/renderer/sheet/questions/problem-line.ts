import { element } from '../../dom';

const GO_TO_CHAT_LABEL: string = 'Go to chat';

// Why an answer did not go through, with a way to finish it in the chat's own window; empty until needed.
export class ProblemLine {
  readonly root: HTMLSpanElement = element('span', 'question-problem');
  private readonly message: HTMLSpanElement = element('span', 'question-problem-text');
  private readonly link: HTMLButtonElement = element('button', 'question-problem-link', GO_TO_CHAT_LABEL);

  constructor(goToChat: () => void) {
    this.link.type = 'button';
    this.link.addEventListener('click', goToChat);
    this.root.append(this.message, this.link);
    this.clear();
  }

  show(problem: string): void {
    this.message.textContent = problem;
    this.root.hidden = false;
  }

  clear(): void {
    this.message.textContent = '';
    this.root.hidden = true;
  }
}
