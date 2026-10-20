import type { ChatSnapshot } from '../../../shared/types';
import { element } from '../../dom';
import { CHECK_ICON, PLUS_ICON } from '../../icons';
import { chatColor } from '../../palette';
import { setText, showSpinner } from './in-place';

// One live chat in the grid's sidebar; the whole row adds it to the grid or takes it out.
export class SidebarRow {
  readonly root: HTMLButtonElement = element('button', 'grid-chat');
  private readonly name: HTMLElement = element('span', 'grid-chat-name');
  private readonly spinner: HTMLElement = element('span', 'grid-chat-spinner');
  private readonly repo: HTMLElement = element('span', 'grid-chat-repo');
  private readonly mark: HTMLElement = element('span', 'grid-chat-mark');
  private isAdded: boolean | null = null;

  constructor(sessionId: string, onToggle: (sessionId: string) => void) {
    this.root.type = 'button';
    const title: HTMLDivElement = element('div', 'grid-chat-title');
    title.append(this.name, this.spinner);
    const text: HTMLDivElement = element('div', 'grid-chat-text');
    text.append(title, this.repo);
    this.root.append(text, this.mark);
    this.root.addEventListener('click', (): void => onToggle(sessionId));
  }

  update(chat: ChatSnapshot, isAdded: boolean): void {
    this.root.style.setProperty('--chat', chatColor(chat.color));
    setText(this.name, chat.name);
    setText(this.repo, chat.repository.name);
    showSpinner(this.spinner, chat.status === 'busy');
    this.showAdded(isAdded);
  }

  private showAdded(isAdded: boolean): void {
    if (isAdded === this.isAdded) return;
    this.isAdded = isAdded;
    this.root.classList.toggle('is-added', isAdded);
    this.root.setAttribute('aria-pressed', String(isAdded));
    this.root.title = isAdded ? 'Remove from Panel' : 'Add to Panel';
    this.mark.innerHTML = isAdded ? CHECK_ICON : PLUS_ICON;
  }
}
