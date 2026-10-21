import { element } from '../dom';

// Inset from the zone's top-right corner, so the label sits inside the zone's rounded edge.
const HINT_INSET_PX: number = 10;

// A small label over the hovered drop zone saying what letting go there does. It is fixed to the window,
// not placed inside the zone, so a column scrolled down still shows it.
export class DropHint {
  private readonly label: HTMLElement = element('div', 'drop-hint');

  show(zone: HTMLElement, text: string): void {
    const box: DOMRect = zone.getBoundingClientRect();
    this.label.textContent = text;
    this.label.style.top = `${box.top + HINT_INSET_PX}px`;
    this.label.style.right = `${window.innerWidth - box.right + HINT_INSET_PX}px`;
    if (!this.label.isConnected) document.body.append(this.label);
  }

  hide(): void {
    this.label.remove();
  }
}
