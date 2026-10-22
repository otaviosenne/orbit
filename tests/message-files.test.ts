import { describe, expect, it } from 'vitest';
import type { PendingAttachment } from '../src/renderer/sheet/pending-messages';
import { pendingFiles, placeholderPattern, transcriptFiles } from '../src/renderer/sheet/transcript/message-files';

describe('transcriptFiles', () => {
  it('swaps each path for a placeholder markdown leaves alone, with a chip for it', () => {
    const files = transcriptFiles('read /h/.cache/orbit/attachments/my-file_v2.pdf now');
    expect(files.text.replace(placeholderPattern(), '<0>')).toBe('read <0> now');
    expect(files.chips).toEqual([{ kind: 'pdf', name: 'my-file_v2.pdf', path: '/h/.cache/orbit/attachments/my-file_v2.pdf', isAttachment: true, localUrl: null }]);
  });

  it('leaves a message without files as it is', () => {
    expect(transcriptFiles('just words')).toEqual({ text: 'just words', chips: [] });
  });
});

describe('pendingFiles', () => {
  it('shows images as Claude Code will number them and files as chips of their local copies', () => {
    const attachments: PendingAttachment[] = [
      { kind: 'video', name: 'clip.mp4', url: 'blob:v' },
      { kind: 'image', name: 'a.png', url: 'blob:a' },
    ];
    const files = pendingFiles('watch [Video #1] and [Image #2]', attachments);
    expect(files.text.replace(placeholderPattern(), '<$1>')).toBe('watch  <0> and  [Image #1]');
    expect(files.chips).toEqual([{ kind: 'video', name: 'clip.mp4', path: null, isAttachment: true, localUrl: 'blob:v' }]);
  });
});
