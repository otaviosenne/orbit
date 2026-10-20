import { describe, expect, it } from 'vitest';
import { pastePlan } from '../src/main/paste-plan';
import type { PasteStep } from '../src/main/paste-plan';

describe('pastePlan', () => {
  it('pastes text and image paths in the order of the draft, without the composer markers', () => {
    const steps: PasteStep[] = pastePlan('before [Image #1] after [Image #2]', ['/a.png', '/b.png'], true);
    expect(steps.map((step: PasteStep) => step.text)).toEqual(['before ', '/a.png', ' after ', '/b.png']);
    expect(steps.every((step: PasteStep) => step.asPaste)).toBe(true);
  });

  it('gives an image longer to settle than text', () => {
    const [text, image]: PasteStep[] = pastePlan('x [Image #1]', ['/a.png'], true);
    expect(image?.settleMs).toBeGreaterThan(text?.settleMs ?? Infinity);
  });

  it('types a command without bracketed paste', () => {
    expect(pastePlan('/rename x', [], false)).toEqual([{ text: '/rename x', asPaste: false, settleMs: expect.any(Number) }]);
  });

  it('always pastes image paths, so Claude Code reads them as images', () => {
    const steps: PasteStep[] = pastePlan('', ['/a.png'], false);
    expect(steps).toEqual([{ text: '/a.png', asPaste: true, settleMs: expect.any(Number) }]);
  });
});
