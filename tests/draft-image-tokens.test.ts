import { describe, expect, it } from 'vitest';
import {
  compacting,
  insertTokens,
  orderByTokens,
  presentNumbers,
  removing,
  renumberDraft,
  renumberTokens,
  reordering,
  tokenRanges,
  widenOverTokens,
} from '../src/renderer/sheet/draft-image-tokens';

describe('insertTokens', () => {
  it('adds markers at the caret as words of their own', () => {
    expect(insertTokens('look here', 4, [1])).toEqual({ text: 'look [Image #1] here', caret: 15 });
    expect(insertTokens('', 0, [1, 2])).toEqual({ text: '[Image #1] [Image #2] ', caret: 22 });
    expect(insertTokens('end', 3, [1])).toEqual({ text: 'end [Image #1] ', caret: 15 });
  });
});

describe('renumberTokens', () => {
  it('drops a removed marker with the space after it and renumbers the rest', () => {
    expect(renumberTokens('a [Image #1] b [Image #2] c', removing(1, 2))).toBe('a b [Image #1] c');
  });

  it('follows the tray when images are reordered', () => {
    expect(renumberTokens('[Image #1] x [Image #2]', reordering([1, 0]))).toBe('[Image #2] x [Image #1]');
  });

  it('keeps markers beyond the attachments as written', () => {
    expect(renumberTokens('[Image #1] [Image #9]', removing(1, 1))).toBe('[Image #9]');
    expect(renumberTokens('[Image #3] [Image #9]', compacting([3], 3))).toBe('[Image #1] [Image #9]');
  });

  it('moves the caret with the text before it', () => {
    expect(renumberDraft({ text: '[Image #1] ab', caret: 13 }, removing(1, 1))).toEqual({ text: 'ab', caret: 2 });
  });
});

describe('presentNumbers', () => {
  it('lists the markers that point at an attachment', () => {
    expect([...presentNumbers('[Image #2] [Image #7] [Image #2', 3)]).toEqual([2]);
  });
});

describe('tokenRanges', () => {
  it('finds each marker in reading order', () => {
    expect(tokenRanges('a [Image #1] b [Image #10]')).toEqual([{ start: 2, end: 12 }, { start: 15, end: 26 }]);
    expect(tokenRanges('[Image #x] plain')).toEqual([]);
  });
});

describe('widenOverTokens', () => {
  it('takes the whole marker when Backspace lands on its last character', () => {
    expect(widenOverTokens('hi [Image #12]', { start: 13, end: 14 })).toEqual({ start: 3, end: 14 });
  });

  it('takes the whole marker when a character in its middle is deleted', () => {
    expect(widenOverTokens('hi [Image #1] there', { start: 6, end: 7 })).toEqual({ start: 3, end: 13 });
  });

  it('widens a selection over every marker it touches', () => {
    expect(widenOverTokens('[Image #1] a [Image #2]', { start: 5, end: 16 })).toEqual({ start: 0, end: 23 });
  });

  it('leaves deletions outside markers alone', () => {
    expect(widenOverTokens('hi [Image #12] ', { start: 14, end: 15 })).toBeNull();
    expect(widenOverTokens('plain text', { start: 1, end: 2 })).toBeNull();
  });
});

describe('orderByTokens', () => {
  it('numbers markers in reading order and says which attachment each is', () => {
    expect(orderByTokens('[Image #2] then [Image #1]', 2)).toEqual({ text: '[Image #1] then [Image #2]', order: [1, 0] });
  });

  it('leaves out an attachment whose marker was deleted', () => {
    expect(orderByTokens('only [Image #2]', 2)).toEqual({ text: 'only [Image #1]', order: [1] });
  });
});
