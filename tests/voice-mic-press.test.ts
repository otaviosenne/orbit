import { describe, expect, it } from 'vitest';
import { micPress } from '../src/renderer/sheet/voice/mic-press';

describe('micPress', () => {
  it('turns hands-free on when it is off, like a double tap of Space', () => {
    expect(micPress(false, false)).toBe('turn-on');
  });

  it('turns hands-free off when it is on', () => {
    expect(micPress(true, true)).toBe('turn-off');
  });

  it('waits while the last hands-free words are still being refined', () => {
    expect(micPress(false, true)).toBe('ignore');
  });
});
