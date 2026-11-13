import { describe, expect, it } from 'vitest';
import { extractReplyImages } from '../src/core/reply-images';

describe('pictures a reply points at', () => {
  it('swaps a local markdown image for an image chip and keeps its path', () => {
    const reply = extractReplyImages('Done:\n\n![Revenue chart](/tmp/shots/screenshot-1.jpg)\n\nLooks right.');
    expect(reply.text).toBe('Done:\n\n[Image #1]\n\nLooks right.');
    expect(reply.images).toEqual([{ number: 1, path: '/tmp/shots/screenshot-1.jpg' }]);
  });

  it('numbers several pictures in order and reuses the number of one shown twice', () => {
    const reply = extractReplyImages('![a](/a.png) and ![b](~/b.webp), again ![a again](/a.png)');
    expect(reply.text).toBe('[Image #1] and [Image #2], again [Image #1]');
    expect(reply.images).toEqual([{ number: 1, path: '/a.png' }, { number: 2, path: '~/b.webp' }]);
  });

  it('continues after an image the reply quotes from the user', () => {
    const reply = extractReplyImages('Your [Image #1] vs mine: ![now](/tmp/now.png "after")');
    expect(reply.text).toBe('Your [Image #1] vs mine: [Image #2]');
    expect(reply.images).toEqual([{ number: 2, path: '/tmp/now.png' }]);
  });

  it('leaves web images, relative paths and non-image files as markdown', () => {
    const text: string = '![web](https://x.io/a.png) ![rel](shots/a.png) ![doc](/tmp/report.pdf)';
    expect(extractReplyImages(text)).toEqual({ text, images: [] });
  });
});
