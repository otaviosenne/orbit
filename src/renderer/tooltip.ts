import { element } from './dom';

// What a hover tip says: a bold first line and a few plain ones under it.
export interface Tip {
  readonly title: string;
  readonly lines: readonly string[];
}

const TIP_ATTRIBUTE: string = 'tip';
// Keeps the tip beside the pointer rather than under it, where it would hide what is being explained.
const POINTER_OFFSET_PX: number = 14;
const EDGE_MARGIN_PX: number = 8;

export function setTip(target: HTMLElement, tip: Tip): void {
  target.dataset[TIP_ATTRIBUTE] = JSON.stringify(tip);
}

// One shared tip for the whole window, shown the moment the pointer is over something that has one
// (the native title tooltip waits about a second). Delegated, so views rebuilt every poll keep working.
export function installTooltips(): void {
  const tooltip: HTMLDivElement = element('div', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);
  document.addEventListener('pointermove', (event: PointerEvent): void => follow(tooltip, event));
  document.addEventListener('scroll', (): void => void (tooltip.hidden = true), true);
  window.addEventListener('blur', (): void => void (tooltip.hidden = true));
}

// The browser's own title tooltip waits and looks foreign; any title is taken over the moment the pointer
// reaches it, before the browser would show it, and shown here instead.
function adoptTitle(element: HTMLElement): void {
  const title: string | null = element.getAttribute('title');
  element.removeAttribute('title');
  if (title !== null && title.trim().length > 0) setTip(element, { title, lines: [] });
}

function follow(tooltip: HTMLElement, event: PointerEvent): void {
  const titled: HTMLElement | null = event.target instanceof Element ? event.target.closest<HTMLElement>('[title]') : null;
  if (titled !== null) adoptTitle(titled);
  const source: HTMLElement | null = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tip]') : null;
  const tip: Tip | null = source === null ? null : readTip(source);
  if (tip === null) {
    tooltip.hidden = true;
    return;
  }
  if (tooltip.dataset[TIP_ATTRIBUTE] !== source?.dataset[TIP_ATTRIBUTE]) render(tooltip, tip, source?.dataset[TIP_ATTRIBUTE] ?? '');
  tooltip.hidden = false;
  place(tooltip, event.clientX, event.clientY);
}

function readTip(source: HTMLElement): Tip | null {
  try {
    return JSON.parse(source.dataset[TIP_ATTRIBUTE] ?? 'null') as Tip | null;
  } catch {
    return null;
  }
}

function render(tooltip: HTMLElement, tip: Tip, key: string): void {
  tooltip.dataset[TIP_ATTRIBUTE] = key;
  tooltip.classList.toggle('is-simple', tip.lines.length === 0);
  tooltip.replaceChildren(element('strong', 'tooltip-title', tip.title), ...tip.lines.map((line: string) => element('span', 'tooltip-line', line)));
}

// Right of and below the pointer, flipped to the other side near the window's edges.
function place(tooltip: HTMLElement, x: number, y: number): void {
  const width: number = tooltip.offsetWidth;
  const height: number = tooltip.offsetHeight;
  const fitsRight: boolean = x + POINTER_OFFSET_PX + width + EDGE_MARGIN_PX <= window.innerWidth;
  const fitsBelow: boolean = y + POINTER_OFFSET_PX + height + EDGE_MARGIN_PX <= window.innerHeight;
  tooltip.style.left = `${fitsRight ? x + POINTER_OFFSET_PX : Math.max(EDGE_MARGIN_PX, x - POINTER_OFFSET_PX - width)}px`;
  tooltip.style.top = `${fitsBelow ? y + POINTER_OFFSET_PX : Math.max(EDGE_MARGIN_PX, y - POINTER_OFFSET_PX - height)}px`;
}
