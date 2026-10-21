import { element } from '../dom';
import { isWebHost } from '../host';
import { CLOSE_ICON, OPEN_OUTSIDE_ICON, TERMINAL_ICON, PENCIL_ICON, PIN_FILLED_ICON, PIN_ICON } from '../icons';

// The chat a right click landed on, and which of its cards (a pinned chat has one in the Pinned row too).
export interface CardMenuTarget {
  readonly sessionId: string;
  readonly name: string;
  readonly isPinned: boolean;
  readonly inPinnedRow: boolean;
  // A pinned chat that is closed: there is nothing to open, rename or close, only to unpin.
  readonly isClosed: boolean;
}

export interface CardMenuActions {
  readonly goToChat: (target: CardMenuTarget) => void;
  readonly openWindow: (target: CardMenuTarget) => void;
  readonly togglePin: (target: CardMenuTarget) => void;
  readonly rename: (target: CardMenuTarget) => void;
  readonly close: (target: CardMenuTarget) => void;
}

interface MenuItem {
  readonly icon: string;
  readonly label: string;
  readonly isDestructive: boolean;
  readonly run: (target: CardMenuTarget) => void;
}

// The small menu a right click on a card opens, at the pointer; any click elsewhere dismisses it.
export class CardMenu {
  private readonly root: HTMLDivElement = element('div', 'card-menu');
  private target: CardMenuTarget | null = null;

  constructor(private readonly actions: CardMenuActions) {
    document.body.append(this.root);
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (!this.root.contains(event.target as Node)) this.dismiss();
    }, true);
    window.addEventListener('blur', (): void => void this.dismiss());
  }

  open(target: CardMenuTarget, x: number, y: number): void {
    this.target = target;
    this.root.replaceChildren(...this.visibleItems(target).map((item: MenuItem) => this.renderItem(item)));
    this.root.classList.add('is-open');
    // Kept inside the window when opened near its right or bottom edge.
    this.root.style.left = `${Math.max(0, Math.min(x, window.innerWidth - this.root.offsetWidth))}px`;
    this.root.style.top = `${Math.max(0, Math.min(y, window.innerHeight - this.root.offsetHeight))}px`;
  }

  // Returns whether there was a menu to dismiss, so Escape closes it before anything else.
  dismiss(): boolean {
    if (this.target === null) return false;
    this.target = null;
    this.root.classList.remove('is-open');
    return true;
  }

  // The close item names the chat, so a right click on the wrong card is caught before it closes anything.
  private items(target: CardMenuTarget): MenuItem[] {
    if (target.isClosed) return [{ icon: PIN_FILLED_ICON, label: 'Unpin', isDestructive: false, run: this.actions.togglePin }];
    return [
      { icon: OPEN_OUTSIDE_ICON, label: 'Open in new window', isDestructive: false, run: this.actions.openWindow },
      { icon: TERMINAL_ICON, label: 'Go to chat', isDestructive: false, run: this.actions.goToChat },
      { icon: target.isPinned ? PIN_FILLED_ICON : PIN_ICON, label: target.isPinned ? 'Unpin' : 'Pin', isDestructive: false, run: this.actions.togglePin },
      { icon: PENCIL_ICON, label: 'Rename', isDestructive: false, run: this.actions.rename },
      { icon: CLOSE_ICON, label: `Close ${target.name} chat`, isDestructive: true, run: this.actions.close },
    ];
  }

  // Orbit Web leaves out what opens or focuses a desktop window or ends a chat's process.
  private visibleItems(target: CardMenuTarget): MenuItem[] {
    if (!isWebHost()) return this.items(target);
    const desktopOnly: ReadonlySet<MenuItem['run']> = new Set([this.actions.openWindow, this.actions.goToChat, this.actions.close]);
    return this.items(target).filter((item: MenuItem) => !desktopOnly.has(item.run));
  }

  private renderItem(item: MenuItem): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', `card-menu-item${item.isDestructive ? ' is-destructive' : ''}`);
    button.type = 'button';
    button.innerHTML = item.icon;
    button.append(element('span', '', item.label));
    button.addEventListener('click', (): void => {
      const target: CardMenuTarget | null = this.target;
      this.dismiss();
      if (target !== null) item.run(target);
    });
    return button;
  }
}
