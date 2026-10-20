import { element } from '../dom';
import type { DraftSegment, MarkerSegment } from './marker-segments';
import { splitDraftMarkers } from './marker-segments';
import { watchTextChanges } from './text-changes';
import { copyTextLayout, TEXT_LAYOUT_PROPERTIES } from './text-layout';

const CHIP_CLASS: string = 'composer-chip';
const BRACKET_CLASS: string = 'composer-chip-bracket';
const NUMBER_ATTRIBUTE: string = 'markerNumber';
// A textarea shows an empty last line after a final newline; a div drops it unless something follows it.
const TRAILING_LINE_FILLER: string = '\u200b';
const NEWLINE: string = '\n';
// The line height comes from the stylesheet as a ratio: its computed px value is rounded, and over a long
// draft the rounding adds up to a visible drift between the layer's lines and the textarea's.
const COPIED_PROPERTIES: readonly string[] = TEXT_LAYOUT_PROPERTIES.filter((property: string) => property !== 'line-height');

// Draws the draft behind its (transparent) textarea, glyph for glyph, with each "[Image #N]" as a chip.
// The textarea stays the field the user types in; this layer only paints, so it must wrap and scroll exactly
// like the textarea or the caret drifts from the text.
export class MarkerHighlight {
  constructor(private readonly input: HTMLTextAreaElement, private readonly layer: HTMLElement) {
    watchTextChanges(input, (): void => this.render());
    input.addEventListener('scroll', (): void => this.followScroll());
    new ResizeObserver((): void => this.matchLayout()).observe(input);
    this.render();
  }

  // The number of the marker drawn under a point on screen, or null off every chip. A wrapped chip has two boxes.
  markerAt(clientX: number, clientY: number): number | null {
    for (const chip of this.layer.querySelectorAll<HTMLElement>(`.${CHIP_CLASS}`)) {
      if ([...chip.getClientRects()].some((rect: DOMRect) => contains(rect, clientX, clientY))) return Number(chip.dataset[NUMBER_ATTRIBUTE]);
    }
    return null;
  }

  private render(): void {
    const text: string = this.input.value;
    const filler: string[] = text.endsWith(NEWLINE) ? [TRAILING_LINE_FILLER] : [];
    this.layer.replaceChildren(...splitDraftMarkers(text).map(renderSegment), ...filler);
    this.matchLayout();
  }

  private matchLayout(): void {
    const style: CSSStyleDeclaration = getComputedStyle(this.input);
    copyTextLayout(style, this.layer, COPIED_PROPERTIES);
    // A scrollbar narrows the textarea's text column; the layer has none, so it gives up the same width.
    const borders: number = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const scrollbar: number = this.input.offsetWidth - this.input.clientWidth - borders;
    this.layer.style.paddingRight = `${parseFloat(style.paddingRight) + scrollbar}px`;
    this.followScroll();
  }

  private followScroll(): void {
    this.layer.scrollTop = this.input.scrollTop;
    this.layer.scrollLeft = this.input.scrollLeft;
  }
}

function renderSegment(segment: DraftSegment): Node {
  return segment.kind === 'text' ? document.createTextNode(segment.text) : renderChip(segment);
}

function renderChip(marker: MarkerSegment): HTMLElement {
  const chip: HTMLSpanElement = element('span', CHIP_CLASS);
  chip.dataset[NUMBER_ATTRIBUTE] = String(marker.number);
  chip.append(element('span', BRACKET_CLASS, marker.opening), marker.label, element('span', BRACKET_CLASS, marker.closing));
  return chip;
}

function contains(rect: DOMRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
