import type { DraftAnchor } from '../dictation-placement';
import type { DictatedSpan, SpanChange } from './dictated-span';

// The drafts the chat panel keeps for chats that are not on screen.
export interface KeptDrafts {
  text(sessionId: string): string;
  // Only replaces the kept draft while it still reads expected, so nothing the user wrote since is lost.
  replace(sessionId: string, expected: string, next: string): void;
}

// Where a span's words show: the composer on screen, the kept draft of a chat that was left mid-sentence, or
// nowhere (the draft was sent, or the user took over by typing).
export type SpanSink = { readonly kind: 'composer' } | { readonly kind: 'draft'; readonly sessionId: string } | { readonly kind: 'dropped' };

export const COMPOSER_SINK: SpanSink = { kind: 'composer' };
export const DROPPED_SINK: SpanSink = { kind: 'dropped' };

export interface SpanBinding {
  readonly span: DictatedSpan;
  sink: SpanSink;
}

// Puts a span's words where its sink says, live words and final text alike.
export class SpanWriter {
  constructor(
    private readonly input: HTMLTextAreaElement,
    private readonly drafts: KeptDrafts,
    private readonly onDraft: () => void,
  ) {}

  write(binding: SpanBinding, segmentId: number, text: string): void {
    const sink: SpanSink = binding.sink;
    if (sink.kind === 'composer') this.writeComposer(binding.span, segmentId, text);
    else if (sink.kind === 'draft') this.writeDraft(binding.span, sink.sessionId, segmentId, text);
  }

  private writeComposer(span: DictatedSpan, segmentId: number, text: string): void {
    // The draft was replaced without an edit event (cleared, restored, put back after a failed send): rewriting
    // it from the old anchor would bring the old text back, so the words move to the caret instead.
    const shown: string | null = span.lastShown;
    if (shown !== null && shown !== this.input.value) span.reanchor(this.caretAnchor());
    const change: SpanChange | null = span.update(segmentId, text, (): DraftAnchor => this.caretAnchor());
    if (change === null) return;
    this.input.value = change.placed.value;
    this.input.setSelectionRange(change.placed.caret, change.placed.caret);
    this.onDraft();
  }

  // A chat left before its last words were final: they finish its kept draft, appended if none were shown yet.
  private writeDraft(span: DictatedSpan, sessionId: string, segmentId: number, text: string): void {
    const change: SpanChange | null = span.update(segmentId, text, (): DraftAnchor => ({ before: this.drafts.text(sessionId), after: '' }));
    if (change !== null) this.drafts.replace(sessionId, change.previous, change.placed.value);
  }

  private caretAnchor(): DraftAnchor {
    return { before: this.input.value.slice(0, this.input.selectionStart), after: this.input.value.slice(this.input.selectionEnd) };
  }
}
