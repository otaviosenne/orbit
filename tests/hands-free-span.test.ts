import { describe, expect, it } from 'vitest';
import type { DraftAnchor } from '../src/renderer/sheet/dictation-placement';
import { DictatedSpan } from '../src/renderer/sheet/hands-free/dictated-span';
import type { SpanChange } from '../src/renderer/sheet/hands-free/dictated-span';

const anchorAt = (before: string, after: string = ''): (() => DraftAnchor) => (): DraftAnchor => ({ before, after });

describe('DictatedSpan', () => {
  it('waits for the first words before taking its place', () => {
    const span: DictatedSpan = new DictatedSpan();
    expect(span.update(1, '', anchorAt('Hi'))).toBeNull();
    expect(span.lastShown).toBeNull();
    const change: SpanChange | null = span.update(1, 'there', anchorAt('Hi', '!'));
    expect(change).toEqual({ previous: 'Hi!', placed: { value: 'Hi there!', caret: 8 } });
  });

  it('keeps an earlier segment in front while it is refined and the next one streams', () => {
    const span: DictatedSpan = new DictatedSpan();
    const anchor: () => DraftAnchor = anchorAt('');
    span.update(1, 'fix the', anchor);
    span.update(2, 'and then', anchor);
    expect(span.update(1, 'fix the parser', anchor)?.placed.value).toBe('fix the parser and then');
    expect(span.update(2, 'and then run tests', anchor)?.placed).toEqual({ value: 'fix the parser and then run tests', caret: 33 });
  });

  it('orders segments by when they started, not by which spoke first', () => {
    const span: DictatedSpan = new DictatedSpan();
    const anchor: () => DraftAnchor = anchorAt('');
    span.update(2, 'second', anchor);
    expect(span.update(1, 'first', anchor)?.placed.value).toBe('first second');
  });

  it('reports what it replaced, so a kept draft is only patched when unchanged', () => {
    const span: DictatedSpan = new DictatedSpan();
    const anchor: () => DraftAnchor = anchorAt('Note:');
    span.update(1, 'hello', anchor);
    expect(span.update(1, 'hello world', anchor)).toEqual({ previous: 'Note: hello', placed: { value: 'Note: hello world', caret: 17 } });
    expect(span.lastShown).toBe('Note: hello world');
  });

  it('places only words still to come once the draft took over, at the caret then', () => {
    const span: DictatedSpan = new DictatedSpan();
    span.update(1, 'old words', anchorAt('before'));
    span.rebase();
    expect(span.lastShown).toBeNull();
    expect(span.update(1, 'old words again', anchorAt('kept '))?.placed.value).toBe('kept again');
    expect(span.textOf(1)).toBe('old words again');
    expect(span.textOf(9)).toBe('');
  });

  it('never brings back deleted words, not even with a recased final text', () => {
    const span: DictatedSpan = new DictatedSpan();
    span.update(1, 'this is a test of', anchorAt(''));
    span.rebase();
    expect(span.update(1, 'this is a test of', anchorAt('this is a tes'))).toBeNull();
    expect(span.update(1, 'This is a test of hands-free mode.', anchorAt('this is a tes'))?.placed.value).toBe('this is a tes hands-free mode.');
  });

  it('keeps every overlapping segment it showed, and the next segment streams in after the edit', () => {
    const span: DictatedSpan = new DictatedSpan();
    span.update(1, 'first sentence', anchorAt(''));
    span.update(2, 'second', anchorAt(''));
    span.rebase();
    expect(span.update(1, 'First sentence.', anchorAt(''))).toBeNull();
    expect(span.update(2, 'second one', anchorAt(''))?.placed.value).toBe('one');
    expect(span.update(3, 'third', anchorAt(''))?.placed.value).toBe('one third');
  });
});
