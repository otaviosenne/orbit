import { describe, expect, it } from 'vitest';
import { targetOf } from '../src/main/remote-typing/typing-target';
import { MAX_TYPED_LENGTH, isTypableText } from '../src/shared/remote-typing';

describe('isTypableText', () => {
  it('takes one line of text', () => {
    expect(isTypableText('s3cret!')).toBe(true);
  });

  it('refuses empty, overlong, multi-line or non-text values', () => {
    expect(isTypableText('')).toBe(false);
    expect(isTypableText('x'.repeat(MAX_TYPED_LENGTH + 1))).toBe(false);
    expect(isTypableText('a\nb')).toBe(false);
    expect(isTypableText('a\rb')).toBe(false);
    expect(isTypableText(7)).toBe(false);
  });
});

describe('targetOf', () => {
  it('accepts a browser window and names it', () => {
    expect(targetOf({ class: 'google-chrome', title: 'Router login' })).toEqual({ title: 'Router login', app: 'google-chrome', accepts: true, refusal: null });
  });

  it('refuses everything but a browser: a chat terminal, a messenger, Orbit itself', () => {
    expect(targetOf({ class: 'kitty', title: 'claude' }).accepts).toBe(false);
    expect(targetOf({ class: 'com.rtosta.zapzap', title: 'WhatsApp' }).accepts).toBe(false);
    expect(targetOf({ class: 'claude-radar', title: 'Orbit' }).accepts).toBe(false);
  });

  it('has no target without a focused window', () => {
    expect(targetOf({}).accepts).toBe(false);
  });
});
