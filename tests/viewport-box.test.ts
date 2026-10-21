import { describe, expect, it } from 'vitest';
import { chatViewportBox } from '../src/web/mobile/viewport-box';

describe('the full-screen chat over the keyboard', () => {
  it('fills the visual viewport while typing, so the composer sits on the keyboard', () => {
    expect(chatViewportBox({ height: 480, offsetTop: 120 }, true)).toEqual({ top: 120, height: 480 });
  });

  it('falls back to the page box with no keyboard, whatever the viewport still reports', () => {
    expect(chatViewportBox({ height: 480, offsetTop: 300 }, false)).toBeNull();
  });
});
