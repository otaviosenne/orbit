import { DROP_ZONE_SELECTOR, renderPinnedDropZone } from '../views/board-view';
import { renderSuspendedDropZone } from '../views/suspended-row';
import { zoneOf } from './drag-source';
import { DropHint } from './drop-hint';
import type { BoardZone, DragSource, DropAction } from './drop-rules';
import { dropActionFor, dropHint, isZoneInPlay } from './drop-rules';

const ACCEPTS_CLASS: string = 'is-drop-target';
const INERT_CLASS: string = 'is-drop-inert';
const HOVER_CLASS: string = 'is-drop-hover';
const NO_ACTION: DropAction = { kind: 'none' };

interface Zone {
  readonly element: HTMLElement;
  readonly action: DropAction;
}

// The board's drop zones for one drag: which take the card, which are inert, and the one under the pointer.
export class DropZones {
  private readonly zones: readonly Zone[];
  private readonly placeholders: readonly HTMLElement[];
  private readonly hint: DropHint = new DropHint();
  private hovered: Zone | null = null;

  constructor(root: HTMLElement, source: DragSource) {
    this.placeholders = [addMissingPinnedZone(root, source), addMissingSuspendedZone(root, source)].filter(
      (zone: HTMLElement | null): zone is HTMLElement => zone !== null,
    );
    this.zones = [...root.querySelectorAll<HTMLElement>(DROP_ZONE_SELECTOR)].flatMap((zone: HTMLElement): Zone[] => toZone(zone, source));
    this.zones.forEach((zone: Zone) => markZone(zone, source));
  }

  hover(x: number, y: number): void {
    const next: Zone | null = this.zoneAt(x, y);
    if (next !== this.hovered) this.hovered?.element.classList.remove(HOVER_CLASS);
    this.hovered = next;
    const hint: string | null = next === null ? null : dropHint(next.action);
    if (next === null || hint === null) return this.hint.hide();
    next.element.classList.add(HOVER_CLASS);
    this.hint.show(next.element, hint);
  }

  actionAt(x: number, y: number): DropAction {
    return this.zoneAt(x, y)?.action ?? NO_ACTION;
  }

  dispose(): void {
    this.hint.hide();
    this.placeholders.forEach((zone: HTMLElement): void => zone.remove());
    this.zones.forEach((zone: Zone) => zone.element.classList.remove(ACCEPTS_CLASS, INERT_CLASS, HOVER_CLASS));
  }

  // Only zones that take the card count, so passing over an inert one never lights it up.
  private zoneAt(x: number, y: number): Zone | null {
    return this.zones.find((zone: Zone) => zone.action.kind !== 'none' && contains(zone.element.getBoundingClientRect(), x, y)) ?? null;
  }
}

// Pinning needs somewhere to drop on even when nothing is pinned yet.
function addMissingPinnedZone(root: HTMLElement, source: DragSource): HTMLElement | null {
  const layout: HTMLElement | null = root.querySelector<HTMLElement>('.board-layout');
  if (source.isPinned || !isZoneInPlay(source, 'pinned') || layout === null || layout.querySelector('.pinned-row') !== null) return null;
  const zone: HTMLElement = renderPinnedDropZone();
  layout.prepend(zone);
  return zone;
}

// Suspending by drag needs somewhere to drop on even when nothing is suspended yet.
function addMissingSuspendedZone(root: HTMLElement, source: DragSource): HTMLElement | null {
  const layout: HTMLElement | null = root.querySelector<HTMLElement>('.board-layout');
  if (!isZoneInPlay(source, 'suspended') || layout === null || layout.querySelector('.suspended-row') !== null) return null;
  const zone: HTMLElement = renderSuspendedDropZone();
  layout.append(zone);
  return zone;
}

// Zones out of play for this drag are left alone entirely: neither outlined nor faded.
function toZone(element: HTMLElement, source: DragSource): Zone[] {
  const key: BoardZone | null = zoneOf(element);
  return key === null || !isZoneInPlay(source, key) ? [] : [{ element, action: dropActionFor(source, key) }];
}

// The zone the card came from is left as it is: it is where the card goes back to, not a refusal.
function markZone(zone: Zone, source: DragSource): void {
  if (zone.action.kind !== 'none') zone.element.classList.add(ACCEPTS_CLASS);
  else if (zoneOf(zone.element) !== source.zone) zone.element.classList.add(INERT_CLASS);
}

function contains(box: DOMRect, x: number, y: number): boolean {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}
