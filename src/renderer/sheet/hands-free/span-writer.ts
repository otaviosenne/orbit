import type { DraftAnchor } from '../dictation-placement';
import type { KeptDraft } from '../voice/kept-draft';
import type { DraftField } from '../voice/voice-field';
import type { DictatedSpan, SpanChange } from './dictated-span';

// Where a span's words show: the composer field it was started in, the kept draft of a composer that was left
// mid-sentence, or nowhere (the draft was sent).
export type SpanSink = { readonly kind: 'field'; readonly field: DraftField } | { readonly kind: 'kept'; readonly draft: KeptDraft } | { readonly kind: 'dropped' };

export const DROPPED_SINK: SpanSink = { kind: 'dropped' };

export interface SpanBinding {
  readonly span: DictatedSpan;
  sink: SpanSink;
}

// Puts a span's words where its sink says, live words and final text alike.
export class SpanWriter {
  write(binding: SpanBinding, segmentId: number, text: string): void {
    const sink: SpanSink = binding.sink;
    if (sink.kind === 'field') this.writeField(binding.span, sink.field, segmentId, text);
    else if (sink.kind === 'kept') this.writeKept(binding.span, sink.draft, segmentId, text);
  }

  private writeField(span: DictatedSpan, field: DraftField, segmentId: number, text: string): void {
    const input: HTMLTextAreaElement = field.input;
    // The draft was replaced without an edit event (cleared, restored, put back after a failed send): rewriting
    // it from the old anchor would bring the old text back, so only words still to come go in, at the caret.
    const shown: string | null = span.lastShown;
    if (shown !== null && shown !== input.value) span.rebase();
    const change: SpanChange | null = span.update(segmentId, text, (): DraftAnchor => caretAnchor(input));
    if (change === null) return;
    input.value = change.placed.value;
    input.setSelectionRange(change.placed.caret, change.placed.caret);
    field.draftChanged();
  }

  // A composer left before its last words were final: they finish its kept draft, appended if none were shown yet.
  private writeKept(span: DictatedSpan, draft: KeptDraft, segmentId: number, text: string): void {
    const change: SpanChange | null = span.update(segmentId, text, (): DraftAnchor => ({ before: draft.text(), after: '' }));
    if (change !== null) draft.replace(change.previous, change.placed.value);
  }
}

function caretAnchor(input: HTMLTextAreaElement): DraftAnchor {
  return { before: input.value.slice(0, input.selectionStart), after: input.value.slice(input.selectionEnd) };
}
