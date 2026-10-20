import type { SnapBias, TextSelection } from './caret-snapping';
import { sameSelection, snapSelection } from './caret-snapping';
import { tokenRanges } from './draft-image-tokens';

// Up/Down land wherever the line above or below happens to be; the closer edge of a marker is the fair guess.
const VERTICAL_KEYS: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown']);
const PRIMARY_BUTTON: number = 0;

// The caret never stops inside an "[Image #N]" marker: arrows, word and line jumps step over it like one
// character, and a click inside one lands beside it. The browser moves the caret first; this puts it right.
export class AtomicMarkers {
  private previous: TextSelection;
  private bias: SnapBias = 'travel';
  private isDragging: boolean = false;
  private isComposing: boolean = false;

  constructor(private readonly input: HTMLTextAreaElement) {
    this.previous = currentSelection(input);
    input.addEventListener('keydown', (event: KeyboardEvent): void => this.beforeKey(event));
    // selectionchange waits for the next frame, which a hidden or busy window may not draw; the key's own
    // release is the earliest moment its move can be put right.
    input.addEventListener('keyup', (): void => this.snap());
    input.addEventListener('pointerdown', (event: PointerEvent): void => this.startDrag(event));
    // Released anywhere: a drag may end outside the field.
    document.addEventListener('pointerup', (): void => this.endDrag());
    document.addEventListener('pointercancel', (): void => this.endDrag());
    // A release the page never saw (focus taken away mid-drag) must not leave snapping switched off.
    input.addEventListener('blur', (): void => this.endDrag());
    input.addEventListener('compositionstart', (): void => {
      this.isComposing = true;
    });
    input.addEventListener('compositionend', (): void => {
      this.isComposing = false;
      this.snap();
    });
    input.addEventListener('selectionchange', (): void => this.snap());
  }

  // The last move is settled first, so this key (a held arrow repeating, or a letter typed right after one)
  // never acts from inside a marker.
  private beforeKey(event: KeyboardEvent): void {
    this.snap();
    this.bias = VERTICAL_KEYS.has(event.key) ? 'nearest' : 'travel';
  }

  // While the button is held the browser rebuilds the selection from its own anchor on every move,
  // so snapping waits for the release.
  private startDrag(event: PointerEvent): void {
    if (event.button !== PRIMARY_BUTTON) return;
    this.isDragging = true;
    this.bias = 'nearest';
  }

  private endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.snap();
  }

  private snap(): void {
    if (this.isDragging || this.isComposing) return;
    const next: TextSelection = currentSelection(this.input);
    const snapped: TextSelection = snapSelection(tokenRanges(this.input.value), next, this.previous, this.bias);
    this.previous = snapped;
    if (!sameSelection(snapped, next)) this.input.setSelectionRange(snapped.start, snapped.end, snapped.direction);
  }
}

function currentSelection(input: HTMLTextAreaElement): TextSelection {
  return { start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection };
}
