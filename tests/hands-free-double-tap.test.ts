import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, DoubleTap } from '../src/renderer/sheet/hands-free/double-tap';

describe('DoubleTap', () => {
  it('reads a second press inside the window as a double tap', () => {
    const taps: DoubleTap = new DoubleTap();
    expect(taps.press(1000)).toBe(false);
    expect(taps.press(1000 + DOUBLE_TAP_MS)).toBe(true);
  });

  it('ignores a second press that comes too late', () => {
    const taps: DoubleTap = new DoubleTap();
    taps.press(1000);
    expect(taps.press(1000 + DOUBLE_TAP_MS + 1)).toBe(false);
  });

  it('uses the pair up, so a third quick press starts a new pair', () => {
    const taps: DoubleTap = new DoubleTap();
    taps.press(0);
    expect(taps.press(100)).toBe(true);
    expect(taps.press(200)).toBe(false);
    expect(taps.press(300)).toBe(true);
  });

  it('forgets the first press when a hold or another key comes between', () => {
    const taps: DoubleTap = new DoubleTap();
    taps.press(0);
    taps.forget();
    expect(taps.press(100)).toBe(false);
  });

  it('measures from the latest press when taps keep coming slowly', () => {
    const taps: DoubleTap = new DoubleTap();
    taps.press(0);
    taps.press(1000);
    expect(taps.press(1200)).toBe(true);
  });
});
