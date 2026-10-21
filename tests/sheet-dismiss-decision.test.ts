import { describe, expect, it } from 'vitest';
import { shouldDismissSheet } from '../src/renderer/sheet-dismiss-decision';

describe('shouldDismissSheet', () => {
  it('closes past a quarter of the height', () => {
    expect(shouldDismissSheet({ distance: 200, height: 600, velocity: 0.1 })).toBe(true);
  });

  it('springs back from a short slow pull', () => {
    expect(shouldDismissSheet({ distance: 60, height: 600, velocity: 0.1 })).toBe(false);
  });

  it('closes on a fast flick even when short', () => {
    expect(shouldDismissSheet({ distance: 60, height: 600, velocity: 1.2 })).toBe(true);
  });

  it('never closes when pushed upward', () => {
    expect(shouldDismissSheet({ distance: -300, height: 600, velocity: 2 })).toBe(false);
  });
});
