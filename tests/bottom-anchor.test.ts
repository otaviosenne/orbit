import { describe, expect, it } from 'vitest';
import { bottomAnchoredScrollTop } from '../src/web/mobile/bottom-anchor';

describe('the thread under the keyboard', () => {
  it('rises by the height the keyboard takes, wherever it was scrolled', () => {
    expect(bottomAnchoredScrollTop(1200, 700, 400)).toBe(1500);
    expect(bottomAnchoredScrollTop(0, 700, 400)).toBe(300);
  });

  it('comes back down when the keyboard closes', () => {
    expect(bottomAnchoredScrollTop(1500, 400, 700)).toBe(1200);
    expect(bottomAnchoredScrollTop(100, 400, 700)).toBe(0);
  });

  it('keeps its place when the chat is hidden or first shown', () => {
    expect(bottomAnchoredScrollTop(500, 0, 700)).toBe(500);
    expect(bottomAnchoredScrollTop(500, 700, 0)).toBe(500);
  });
});
