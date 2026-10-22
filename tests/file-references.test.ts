import { describe, expect, it } from 'vitest';
import { findFileReferences, isAttachmentPath } from '../src/renderer/sheet/transcript/file-references';

const ATTACHED: string = '/home/u/.cache/orbit/attachments/notes.txt';

describe('findFileReferences', () => {
  it('finds a file Orbit attached, whatever its kind', () => {
    expect(findFileReferences(`see ${ATTACHED} please`)).toEqual([
      { start: 4, end: 4 + ATTACHED.length, path: ATTACHED, name: 'notes.txt', kind: 'file', isAttachment: true },
    ]);
  });

  it('finds a video, audio or PDF anywhere, but not other paths', () => {
    expect(findFileReferences('/tmp/a.mp4 /tmp/b.mp3 (/tmp/c.pdf) /etc/passwd /tmp/d.png').map((reference) => reference.path)).toEqual([
      '/tmp/a.mp4',
      '/tmp/b.mp3',
      '/tmp/c.pdf',
    ]);
  });

  it('leaves out the punctuation that ends a sentence', () => {
    expect(findFileReferences('Look at /tmp/talk.webm.')[0]?.path).toBe('/tmp/talk.webm');
  });

  it('ignores URLs and paths inside other words', () => {
    expect(findFileReferences('https://x.com/a.mp4 and dir/b.pdf')).toEqual([]);
  });
});

describe('isAttachmentPath', () => {
  it('only counts a file directly in the attachments folder', () => {
    expect(isAttachmentPath(ATTACHED)).toBe(true);
    expect(isAttachmentPath('/home/u/.cache/orbit/attachments/')).toBe(false);
    expect(isAttachmentPath('/home/u/.cache/orbit/attachments/../../.ssh/id')).toBe(false);
  });
});
