import type { MarkerHighlight } from './marker-highlight';

export type MarkerOpener = (number: number) => void;

const OVER_CHIP_CLASS: string = 'is-over-chip';

// The chips are painted under the textarea, so the textarea gets the clicks; they are matched to a chip by
// where they land. A click opens that marker's image; the caret has already been put beside the chip.
export class MarkerChipClicks {
  constructor(private readonly input: HTMLTextAreaElement, private readonly highlight: MarkerHighlight, private readonly open: MarkerOpener) {
    input.addEventListener('click', (event: MouseEvent): void => this.openClicked(event));
    input.addEventListener('pointermove', (event: PointerEvent): void => this.showPointer(event));
    input.addEventListener('pointerleave', (): void => input.classList.remove(OVER_CHIP_CLASS));
  }

  // A drag that ends on a chip selected text; only a plain click opens the image.
  private openClicked(event: MouseEvent): void {
    if (this.input.selectionStart !== this.input.selectionEnd) return;
    const number: number | null = this.highlight.markerAt(event.clientX, event.clientY);
    if (number !== null) this.open(number);
  }

  private showPointer(event: PointerEvent): void {
    this.input.classList.toggle(OVER_CHIP_CLASS, this.highlight.markerAt(event.clientX, event.clientY) !== null);
  }
}
