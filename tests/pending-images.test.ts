import { describe, expect, it } from 'vitest';
import { handOverImages } from '../src/renderer/sheet/pending-images';
import type { ImageHandover } from '../src/renderer/sheet/pending-images';
import type { Confirmation, PendingMessage } from '../src/renderer/sheet/pending-messages';
import type { MessageImage, MessageItem } from '../src/shared/types';

const confirmation = (imageUrls: readonly string[], images: readonly MessageImage[]): Confirmation => {
  const message: PendingMessage = { id: 'pending-0', text: 'hi', attachments: [], imageUrls, sentAt: 0, delivered: true };
  const item: MessageItem = { kind: 'message', id: 'm', timestamp: 0, role: 'user', text: 'hi', images };
  return { message, item };
};

describe('handOverImages', () => {
  it('pairs local copies with the transcript keys in attachment order, whatever numbers Claude gave them', () => {
    const handover: ImageHandover = handOverImages(confirmation(['blob:a', 'blob:b'], [{ number: 7, key: 'm#7' }, { number: 8, key: 'm#8' }]));
    expect(handover.seeds).toEqual([{ key: 'm#7', source: 'blob:a' }, { key: 'm#8', source: 'blob:b' }]);
    expect(handover.unused).toEqual([]);
  });

  it('lets go of copies the transcript has no image for', () => {
    const handover: ImageHandover = handOverImages(confirmation(['blob:a', 'blob:b'], [{ number: 1, key: 'm#1' }]));
    expect(handover.seeds).toEqual([{ key: 'm#1', source: 'blob:a' }]);
    expect(handover.unused).toEqual(['blob:b']);
  });

  it('seeds nothing when the message was sent without images', () => {
    expect(handOverImages(confirmation([], [{ number: 1, key: 'm#1' }]))).toEqual({ seeds: [], unused: [] });
  });
});
