import { element } from '../dom';
import type { ReorderAxis } from './reorder-target';

const THICKNESS_PX: number = 3;
const MARKER_CLASS: string = 'reorder-marker';

// The bar that shows where the dragged card would land: between two cards, on the side the pointer is closer to.
export class ReorderMarker {
  private readonly node: HTMLDivElement = element('div', MARKER_CLASS);

  constructor() {
    this.node.hidden = true;
    document.body.append(this.node);
  }

  show(card: DOMRect, placement: 'before' | 'after', axis: ReorderAxis): void {
    const isVertical: boolean = axis === 'vertical';
    const edge: number = placement === 'before' ? (isVertical ? card.top : card.left) : isVertical ? card.bottom : card.right;
    this.node.style.left = `${isVertical ? card.left : edge - THICKNESS_PX / 2}px`;
    this.node.style.top = `${isVertical ? edge - THICKNESS_PX / 2 : card.top}px`;
    this.node.style.width = `${isVertical ? card.width : THICKNESS_PX}px`;
    this.node.style.height = `${isVertical ? THICKNESS_PX : card.height}px`;
    this.node.hidden = false;
  }

  hide(): void {
    this.node.hidden = true;
  }

  dispose(): void {
    this.node.remove();
  }
}
