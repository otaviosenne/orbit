import { beforeEach, describe, expect, it } from 'vitest';
import { DraftStore, storedText } from '../src/renderer/sheet/draft-store';

describe('DraftStore', () => {
  let stored: string | null;

  beforeEach(() => {
    stored = null;
    globalThis.localStorage = {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    } as unknown as Storage;
  });

  it('keeps a draft per chat and its text across a restart', () => {
    new DraftStore().set('a', { text: 'half a thought', files: [] });
    expect(new DraftStore().get('a').text).toBe('half a thought');
    expect(new DraftStore().get('b').text).toBe('');
  });

  it('forgets a draft once it is empty', () => {
    const drafts: DraftStore = new DraftStore();
    drafts.set('a', { text: 'x', files: [] });
    drafts.set('a', { text: '  ', files: [] });
    expect(new DraftStore().get('a').text).toBe('');
  });

  it('stores a draft with images without their markers, since the images do not survive a restart', () => {
    const file: File = new File(['x'], 'a.png', { type: 'image/png' });
    expect(storedText({ text: 'look [Image #1] here', files: [file] })).toBe('look here');
    expect(storedText({ text: 'plain [Image #1]', files: [] })).toBe('plain [Image #1]');
  });
});
