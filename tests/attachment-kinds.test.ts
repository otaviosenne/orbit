import { describe, expect, it } from 'vitest';
import { attachmentKindOf, extensionOf, isPastedImage, pastedImageExtension, pathKindOf, viewableMediaType } from '../src/shared/attachment-kinds';

describe('isPastedImage', () => {
  it('takes only the extensions Claude Code turns into [Image #N], by name first', () => {
    expect(isPastedImage('shot.PNG', '')).toBe(true);
    expect(isPastedImage('photo.jpeg', 'image/jpeg')).toBe(true);
    expect(isPastedImage('anim.gif', '')).toBe(true);
    expect(isPastedImage('logo.svg', 'image/svg+xml')).toBe(false);
    expect(isPastedImage('scan.bmp', 'image/bmp')).toBe(false);
    expect(isPastedImage('phone.heic', 'image/heic')).toBe(false);
  });

  it('goes by the type when the name has no extension (a pasted screenshot)', () => {
    expect(isPastedImage('image', 'image/png')).toBe(true);
    expect(isPastedImage('blob', 'application/pdf')).toBe(false);
  });

  it('never sends a video as an image, whatever its type claims', () => {
    expect(isPastedImage('clip.mp4', 'image/png')).toBe(false);
  });
});

describe('pastedImageExtension', () => {
  it('keeps the name\'s extension, or takes it from the type', () => {
    expect(pastedImageExtension('a.JPG', 'image/jpeg')).toBe('jpg');
    expect(pastedImageExtension('image', 'image/webp')).toBe('webp');
    expect(pastedImageExtension('doc.pdf', 'application/pdf')).toBeNull();
  });
});

describe('attachmentKindOf', () => {
  it('tells videos, audio and PDFs apart from other files', () => {
    expect(attachmentKindOf('clip.mp4', '')).toBe('video');
    expect(attachmentKindOf('clip.MKV', '')).toBe('video');
    expect(attachmentKindOf('song.mp3', 'audio/mpeg')).toBe('audio');
    expect(attachmentKindOf('paper.pdf', '')).toBe('pdf');
    expect(attachmentKindOf('notes.txt', 'text/plain')).toBe('file');
    expect(attachmentKindOf('archive', '')).toBe('file');
  });

  it('falls back to the type for a name it does not know', () => {
    expect(attachmentKindOf('recording', 'audio/ogg')).toBe('audio');
    expect(attachmentKindOf('screen', 'video/webm')).toBe('video');
  });
});

describe('paths', () => {
  it('reads the kind and the type to serve from the extension alone', () => {
    expect(pathKindOf('/home/u/.cache/orbit/attachments/talk.webm')).toBe('video');
    expect(viewableMediaType('/x/report.pdf')).toBe('application/pdf');
    expect(viewableMediaType('/x/page.html')).toBeNull();
    expect(extensionOf('/x.y/.hidden')).toBe('');
  });
});
