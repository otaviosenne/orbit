import { describe, expect, it } from 'vitest';
import { wordCount, wordsAfter } from '../src/renderer/sheet/hands-free/unseen-words';

describe('wordCount', () => {
  it('counts words separated by any whitespace', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('   ')).toBe(0);
    expect(wordCount(' hello,  world.\n again ')).toBe(3);
  });
});

describe('wordsAfter', () => {
  it('leaves a segment nobody took over untouched', () => {
    expect(wordsAfter('  spaced  text ', 0)).toBe('  spaced  text ');
  });

  it('drops the words the draft already took over', () => {
    expect(wordsAfter('one two three four', 2)).toBe('three four');
    expect(wordsAfter('One, two three.', 1)).toBe('two three.');
  });

  it('has nothing left once every word was taken over', () => {
    expect(wordsAfter('one two', 2)).toBe('');
    expect(wordsAfter('one', 3)).toBe('');
  });
});
