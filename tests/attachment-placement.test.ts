import { describe, expect, it } from 'vitest';
import { placeAttachments } from '../src/main/attachment-placement';
import type { SavedAttachment } from '../src/main/attachments';

const pdf: SavedAttachment = { path: '/c/attachments/report.pdf', kind: 'file' };
const shot: SavedAttachment = { path: '/c/attachments/1.png', kind: 'image' };
const clip: SavedAttachment = { path: '/c/attachments/clip.mp4', kind: 'file' };

describe('placeAttachments', () => {
  it('writes each file\'s path where its marker was and numbers the images among themselves', () => {
    expect(placeAttachments('read [PDF #1] and see [Image #2] [Video #3]', [pdf, shot, clip])).toEqual({
      text: 'read /c/attachments/report.pdf and see [Image #1] /c/attachments/clip.mp4',
      imagePaths: ['/c/attachments/1.png'],
    });
  });

  it('leaves an image-only message as before', () => {
    expect(placeAttachments('[Image #1] look', [shot])).toEqual({ text: '[Image #1] look', imagePaths: ['/c/attachments/1.png'] });
  });

  it('adds a file without a marker at the end, apart from the last word', () => {
    expect(placeAttachments('hello', [pdf]).text).toBe('hello /c/attachments/report.pdf');
    expect(placeAttachments('', [pdf]).text).toBe('/c/attachments/report.pdf');
  });

  it('keeps markers that point at no attachment as written', () => {
    expect(placeAttachments('[File #9] [PDF #1]', [pdf]).text).toBe('[File #9] /c/attachments/report.pdf');
  });
});
