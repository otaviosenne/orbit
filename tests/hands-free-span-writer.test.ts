import { describe, expect, it } from 'vitest';
import { DictatedSpan } from '../src/renderer/sheet/hands-free/dictated-span';
import type { SpanBinding } from '../src/renderer/sheet/hands-free/span-writer';
import { SpanWriter } from '../src/renderer/sheet/hands-free/span-writer';
import type { DraftField } from '../src/renderer/sheet/voice/voice-field';

// Just what the writer reads and writes on a textarea.
class FakeInput {
  value: string = '';
  selectionStart: number = 0;
  selectionEnd: number = 0;

  setSelectionRange(start: number, end: number): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  edit(value: string, caret: number = value.length): void {
    this.value = value;
    this.setSelectionRange(caret, caret);
  }
}

function fieldBinding(input: FakeInput): SpanBinding {
  const field: DraftField = { input: input as unknown as HTMLTextAreaElement, draftChanged: (): void => undefined };
  return { span: new DictatedSpan(), sink: { kind: 'field', field } };
}

describe('SpanWriter into a field the user edits', () => {
  it('keeps a backspaced word deleted while the same segment keeps streaming', () => {
    const input: FakeInput = new FakeInput();
    const binding: SpanBinding = fieldBinding(input);
    const writer: SpanWriter = new SpanWriter();
    writer.write(binding, 1, 'this is a test of');
    input.edit('this is a tes');
    binding.span.rebase();
    writer.write(binding, 1, 'this is a test of the mode');
    expect(input.value).toBe('this is a tes the mode');
    writer.write(binding, 1, 'This is a test of the hands-free mode.');
    expect(input.value).toBe('this is a tes the hands-free mode.');
  });

  it('lets a cleared field stay empty when the final text arrives', () => {
    const input: FakeInput = new FakeInput();
    const binding: SpanBinding = fieldBinding(input);
    const writer: SpanWriter = new SpanWriter();
    writer.write(binding, 1, 'words to delete');
    input.edit('');
    binding.span.rebase();
    writer.write(binding, 1, 'Words to delete.');
    expect(input.value).toBe('');
    writer.write(binding, 2, 'fresh start');
    expect(input.value).toBe('fresh start');
  });

  it('does not bring back text the draft lost without an edit event', () => {
    const input: FakeInput = new FakeInput();
    const binding: SpanBinding = fieldBinding(input);
    const writer: SpanWriter = new SpanWriter();
    writer.write(binding, 1, 'already sent');
    input.edit('');
    writer.write(binding, 1, 'already sent and more');
    expect(input.value).toBe('and more');
  });

  it('puts later words at the caret the user left', () => {
    const input: FakeInput = new FakeInput();
    const binding: SpanBinding = fieldBinding(input);
    const writer: SpanWriter = new SpanWriter();
    writer.write(binding, 1, 'one two');
    input.edit('one two', 3);
    binding.span.rebase();
    writer.write(binding, 1, 'one two three');
    expect(input.value).toBe('one three two');
  });
});
