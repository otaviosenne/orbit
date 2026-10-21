import { describe, expect, it } from 'vitest';
import type { DictationTarget } from '../src/renderer/sheet/hands-free/dictation-target';
import { planRetarget } from '../src/renderer/sheet/hands-free/dictation-target';
import { composerState } from '../src/renderer/sheet/hands-free/composer-state';

const chatA: DictationTarget = { kind: 'chat', sessionId: 'a' };
const chatB: DictationTarget = { kind: 'chat', sessionId: 'b' };
const starting: DictationTarget = { kind: 'starting' };

describe('planRetarget', () => {
  it('keeps going while the same composer stays on screen', () => {
    expect(planRetarget(chatA, { kind: 'chat', sessionId: 'a' })).toBe('none');
    expect(planRetarget(null, null)).toBe('none');
    expect(planRetarget(starting, { kind: 'starting' })).toBe('none');
  });

  it('switches when another chat opens', () => {
    expect(planRetarget(chatA, chatB)).toBe('switch');
    expect(planRetarget(chatA, starting)).toBe('switch');
  });

  it('pauses when no composer is on screen and resumes when one is back', () => {
    expect(planRetarget(chatA, null)).toBe('pause');
    expect(planRetarget(starting, null)).toBe('pause');
    expect(planRetarget(null, chatB)).toBe('resume');
  });

  it('carries the words over when a starting chat goes live', () => {
    expect(planRetarget(starting, chatA)).toBe('carry');
  });
});

describe('composerState', () => {
  it('lets a running hands-free mode decide what the composer shows', () => {
    expect(composerState('live', 'idle')).toBe('listening');
    expect(composerState('finishing', 'idle')).toBe('refining');
    expect(composerState('paused', 'idle')).toBe('idle');
    expect(composerState('off', 'listening')).toBe('listening');
  });
});
