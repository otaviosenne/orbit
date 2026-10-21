import { element } from '../dom';

// What a strip X asks before acting: the thing it names, the destructive word, and what to run on yes.
export interface StripConfirmRequest {
  // Which row asked, so that row's X can stay shown while the popover is open.
  readonly key: string;
  readonly title: string;
  readonly action: string;
  readonly run: () => void;
}

export type ConfirmClosed = () => void;

const CLOSE_KEY: string = 'Escape';
// Space between the X and the popover, and the least the popover keeps from the window's edges.
const ANCHOR_GAP_PX: number = 4;
const EDGE_MARGIN_PX: number = 6;

// A tiny confirmation beside a strip row's X, in the card menu's look; any click elsewhere or Escape cancels it.
export class StripConfirmPopover {
  private readonly root: HTMLDivElement = element('div', 'card-menu strip-confirm');
  private request: StripConfirmRequest | null = null;
  // The popover the press under way closed, so pressing its own X again closes it instead of reopening it.
  private closedByPress: string | null = null;

  constructor(private readonly onClose: ConfirmClosed) {
    document.body.append(this.root);
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      const key: string | null = this.openFor;
      this.closedByPress = !this.root.contains(event.target as Node) && this.dismiss() ? key : null;
    }, true);
    window.addEventListener('blur', (): void => void this.dismiss());
    // Captured before the app's own Escape, which would otherwise also leave the agent or close the panel.
    window.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== CLOSE_KEY || this.request === null) return;
      event.stopPropagation();
      this.dismiss();
    }, true);
  }

  get openFor(): string | null {
    return this.request?.key ?? null;
  }

  justClosed(key: string): boolean {
    return this.closedByPress === key;
  }

  open(request: StripConfirmRequest, anchor: DOMRect): void {
    this.request = request;
    this.root.replaceChildren(
      element('div', 'strip-confirm-title', request.title),
      this.renderItem('Cancel', false, (): void => void this.dismiss()),
      this.renderItem(request.action, true, (): void => this.confirm()),
    );
    this.root.classList.add('is-open');
    this.place(anchor);
  }

  // Returns whether there was a popover to dismiss.
  dismiss(): boolean {
    if (this.request === null) return false;
    this.request = null;
    this.root.classList.remove('is-open');
    this.onClose();
    return true;
  }

  private confirm(): void {
    const request: StripConfirmRequest | null = this.request;
    this.dismiss();
    request?.run();
  }

  // Under the X with right edges lined up; above it when the window has no room below.
  private place(anchor: DOMRect): void {
    const width: number = this.root.offsetWidth;
    const height: number = this.root.offsetHeight;
    const left: number = Math.min(Math.max(EDGE_MARGIN_PX, anchor.right - width), window.innerWidth - width - EDGE_MARGIN_PX);
    const below: number = anchor.bottom + ANCHOR_GAP_PX;
    const top: number = below + height <= window.innerHeight - EDGE_MARGIN_PX ? below : anchor.top - ANCHOR_GAP_PX - height;
    this.root.style.left = `${left}px`;
    this.root.style.top = `${Math.max(EDGE_MARGIN_PX, top)}px`;
  }

  private renderItem(label: string, isDestructive: boolean, run: () => void): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', `card-menu-item${isDestructive ? ' is-destructive' : ''}`);
    button.type = 'button';
    button.append(element('span', '', label));
    button.addEventListener('click', run);
    return button;
  }
}
