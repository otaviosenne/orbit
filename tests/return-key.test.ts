import { describe, expect, it } from 'vitest';
import type { KeyPress } from '../src/renderer/sheet/return-key';
import { returnKeyAction } from '../src/renderer/sheet/return-key';

function press(key: string, shiftKey: boolean = false): KeyPress {
  return { key, shiftKey };
}

describe('the composer return key', () => {
  it('sends on Enter and adds a line on Shift+Enter at a desk', () => {
    expect(returnKeyAction(press('Enter'), false)).toBe('send');
    expect(returnKeyAction(press('Enter', true), false)).toBe('new-line');
  });

  it('only ever adds a line on a touch keyboard, so Send is the one way to send', () => {
    expect(returnKeyAction(press('Enter'), true)).toBe('new-line');
    expect(returnKeyAction(press('Enter', true), true)).toBe('new-line');
  });

  it('leaves every other key alone', () => {
    expect(returnKeyAction(press('a'), false)).toBe('other');
    expect(returnKeyAction(press('Tab'), true)).toBe('other');
  });
});
