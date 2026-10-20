import { element } from '../dom';

const MESSAGE: string = 'This chat has ended';
const CLOSE_LABEL: string = 'Close window';

// Covers the panel once the chat's process is gone, so nothing can be sent to it; the window is frameless,
// hence its own close button.
export class EndedNotice {
  private readonly root: HTMLElement = element('div', 'chat-ended');

  constructor(onClose: () => void) {
    const close: HTMLButtonElement = element('button', 'button', CLOSE_LABEL);
    close.type = 'button';
    close.addEventListener('click', onClose);
    this.root.append(element('p', 'chat-ended-text', MESSAGE), close);
    this.root.hidden = true;
    document.body.append(this.root);
  }

  show(): void {
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }
}
