import { describe, expect, it } from 'vitest';
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
