import { describe, expect, it } from 'vitest';
import { splitOnImageTokens } from '../src/shared/image-tokens';
import type { MessageSegment } from '../src/shared/image-tokens';

describe('splitOnImageTokens', () => {
  it('puts each image where its marker is, between the text around it', () => {
    const segments: MessageSegment[] = splitOnImageTokens('look [Image #2] then [Image #1] done', 2);
    expect(segments).toEqual([
      { kind: 'text', text: 'look ' },
      { kind: 'image', index: 1 },
      { kind: 'text', text: ' then ' },
      { kind: 'image', index: 0 },
      { kind: 'text', text: ' done' },
    ]);
  });

  it('keeps an image placed at the end of the sentence at the end', () => {
    expect(splitOnImageTokens('see this [Image #1]', 1)).toEqual([{ kind: 'text', text: 'see this ' }, { kind: 'image', index: 0 }]);
  });

  it('sends an image-only message as just the image', () => {
    expect(splitOnImageTokens('[Image #1]', 1)).toEqual([{ kind: 'image', index: 0 }]);
  });

  it('leaves markers with no attachment, and repeats of a placed one, as text', () => {
    expect(splitOnImageTokens('[Image #1] and [Image #1] or [Image #5]', 1)).toEqual([
      { kind: 'image', index: 0 },
      { kind: 'text', text: ' and [Image #1] or [Image #5]' },
    ]);
  });

  it('adds attachments with no marker at the end', () => {
    expect(splitOnImageTokens('hello', 2)).toEqual([{ kind: 'text', text: 'hello' }, { kind: 'image', index: 0 }, { kind: 'image', index: 1 }]);
  });

  it('keeps plain text whole when nothing is attached', () => {
    expect(splitOnImageTokens('just [Image #1] text', 0)).toEqual([{ kind: 'text', text: 'just [Image #1] text' }]);
  });
});
