import { element } from '../dom';

export type StopConfirmed = (agentId: string) => void;

const CLOSE_KEY: string = 'Escape';
// Space between the X and the popover, and the least the popover keeps from the window's edges.
const ANCHOR_GAP_PX: number = 4;
const EDGE_MARGIN_PX: number = 6;

// A tiny confirmation beside an agent's X, in the card menu's look; any click elsewhere or Escape cancels it.
export class AgentStopPopover {
  private readonly root: HTMLDivElement = element('div', 'card-menu agent-stop-menu');
  private agentId: string | null = null;

  constructor(private readonly onConfirm: StopConfirmed, private readonly onDismiss: () => void) {
    document.body.append(this.root);
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (!this.root.contains(event.target as Node)) this.dismiss();
    }, true);
    window.addEventListener('blur', (): void => void this.dismiss());
    // Captured before the app's own Escape, which would otherwise also leave the agent or close the panel.
    window.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== CLOSE_KEY || this.agentId === null) return;
      event.stopPropagation();
      this.dismiss();
    }, true);
  }

  get openFor(): string | null {
    return this.agentId;
  }

  open(agentId: string, description: string, anchor: DOMRect): void {
    this.agentId = agentId;
    this.root.replaceChildren(
      element('div', 'agent-stop-title', description),
      this.renderItem('Cancel', false, (): void => void this.dismiss()),
      this.renderItem('Stop agent', true, (): void => this.confirm()),
    );
    this.root.classList.add('is-open');
    this.place(anchor);
  }

  // Returns whether there was a popover to dismiss.
  dismiss(): boolean {
    if (this.agentId === null) return false;
    this.agentId = null;
    this.root.classList.remove('is-open');
    this.onDismiss();
    return true;
  }

  private confirm(): void {
    const agentId: string | null = this.agentId;
    this.dismiss();
    if (agentId !== null) this.onConfirm(agentId);
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
