import { describe, expect, it } from 'vitest';
import { showsDot } from '../src/renderer/unseen-dot';

describe('when a chat shows its dot', () => {
  it('keeps the dot on a question that was seen but not answered', () => {
    expect(showsDot('waiting', false)).toBe(true);
    expect(showsDot('waiting', true)).toBe(true);
  });

  it('shows an unread reply until it is opened, then drops it', () => {
    expect(showsDot('idle', true)).toBe(true);
    expect(showsDot('idle', false)).toBe(false);
  });

  it('shows nothing for a working chat that has nothing unread', () => {
    expect(showsDot('busy', false)).toBe(false);
  });
});
