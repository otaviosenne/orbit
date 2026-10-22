import type { AttachmentKind } from '../../shared/attachment-kinds';
import { draftMarker } from '../../shared/draft-markers';
import type { AttachmentTray, TrayChanges } from './attachment-tray';
import type { DraftEdit, Renumbering, TokenRange } from './draft-image-tokens';
import { compacting, insertTokens, presentNumbers, removing, renumberDraft, reordering, widenOverTokens } from './draft-image-tokens';

// Edits that remove text; a replacing paste or typing over a selection removes the selected part too.
const BACKWARD_DELETIONS: ReadonlySet<string> = new Set(['deleteContentBackward', 'deleteWordBackward', 'deleteSoftLineBackward', 'deleteHardLineBackward']);
const FORWARD_DELETIONS: ReadonlySet<string> = new Set(['deleteContentForward', 'deleteWordForward', 'deleteSoftLineForward', 'deleteHardLineForward']);

// Keeps the draft's markers ("[Image #N]", "[PDF #N]", ...) and the tray's attachments in step: each marker is where
// its attachment goes, removing an attachment removes its marker, and deleting a marker removes its attachment.
export class AttachmentMarkers implements TrayChanges {
  private tray: AttachmentTray | null = null;

  constructor(private readonly input: HTMLTextAreaElement) {
    input.addEventListener('input', (): void => this.dropUnmarkedAttachments());
    input.addEventListener('beforeinput', (event: InputEvent): void => this.deleteWholeMarkers(event));
  }

  // The tray reports its changes back here, so it is connected after both exist.
  connect(tray: AttachmentTray): void {
    this.tray = tray;
  }

  // New attachments get their markers where the caret is.
  attach(files: Iterable<File>): void {
    if (this.tray === null) return;
    const first: number = this.tray.count;
    if (this.tray.add(files) === 0) return;
    this.write(insertTokens(this.input.value, this.input.selectionStart, markersFrom(this.tray.kinds(), first)));
  }

  // For attachments put back without their draft: their markers go at the end.
  appendMarkers(count: number): void {
    const kinds: AttachmentKind[] = this.tray?.kinds().slice(0, count) ?? [];
    this.write(insertTokens(this.input.value, this.input.value.length, markersFrom(kinds, 0)));
  }

  // The tray already let the attachment go, so it held one more before.
  removed(index: number): void {
    this.renumber(removing(index + 1, (this.tray?.count ?? 0) + 1));
  }

  reordered(order: readonly number[]): void {
    this.renumber(reordering(order));
  }

  private dropUnmarkedAttachments(): void {
    if (this.tray === null) return;
    const count: number = this.tray.count;
    const present: Set<number> = presentNumbers(this.input.value, count);
    if (present.size === count) return;
    const kept: number[] = [...present].sort((first: number, second: number) => first - second);
    this.tray.keep(new Set(kept.map((number: number) => number - 1)));
    this.renumber(compacting(kept, count));
  }

  // Runs before the browser edits the text, so a marker is never left half deleted.
  private deleteWholeMarkers(event: InputEvent): void {
    const deletion: TokenRange | null = this.deletionOf(event.inputType);
    if (deletion === null) return;
    const widened: TokenRange | null = widenOverTokens(this.input.value, deletion);
    if (widened === null) return;
    event.preventDefault();
    const replacement: string = event.inputType.startsWith('insert') ? (event.data ?? event.dataTransfer?.getData('text/plain') ?? '') : '';
    // A marker sits between spaces of its own; without it, one of them is enough.
    const value: string = this.input.value;
    const spaceAfter: boolean = replacement === '' && value[widened.start - 1] === ' ' && value[widened.end] === ' ';
    this.input.setRangeText(replacement, widened.start, spaceAfter ? widened.end + 1 : widened.end, 'end');
    // setRangeText fires no input event; the draft store and dictation listen for one.
    this.input.dispatchEvent(new Event('input'));
  }

  // The text this edit would remove: the selection, or for a key with no selection, the character beside the
  // caret. A word or line deletion is judged by that character too: if it is a marker's, the marker goes.
  private deletionOf(inputType: string): TokenRange | null {
    const { selectionStart: start, selectionEnd: end } = this.input;
    if (start !== end) return { start, end };
    if (BACKWARD_DELETIONS.has(inputType)) return start === 0 ? null : { start: start - 1, end: start };
    if (FORWARD_DELETIONS.has(inputType)) return end === this.input.value.length ? null : { start: end, end: end + 1 };
    return null;
  }

  private renumber(renumbering: Renumbering): void {
    this.write(renumberDraft({ text: this.input.value, caret: this.input.selectionStart }, renumbering));
  }

  private write(draft: DraftEdit): void {
    if (draft.text === this.input.value) return;
    this.input.value = draft.text;
    this.input.setSelectionRange(draft.caret, draft.caret);
  }
}

// Markers numbered from first + 1, each with its attachment's word.
function markersFrom(kinds: readonly AttachmentKind[], first: number): string[] {
  return kinds.slice(first).map((kind: AttachmentKind, offset: number) => draftMarker(kind, first + offset + 1));
}
