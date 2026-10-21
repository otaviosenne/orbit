import { describe, expect, it } from 'vitest';
import type { DictationTarget } from '../src/renderer/sheet/hands-free/dictation-target';
import { planRetarget } from '../src/renderer/sheet/hands-free/dictation-target';
import { composerState } from '../src/renderer/sheet/hands-free/composer-state';

const chatA: DictationTarget = { kind: 'chat', sessionId: 'a' };
const chatB: DictationTarget = { kind: 'chat', sessionId: 'b' };
const starting: DictationTarget = { kind: 'starting' };
const tileA: DictationTarget = { kind: 'tile', sessionId: 'a' };
const tileB: DictationTarget = { kind: 'tile', sessionId: 'b' };

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

describe('planRetarget between the side panel and the Panel tiles', () => {
  it('keeps going while the same tile stays focused', () => {
    expect(planRetarget(tileA, { kind: 'tile', sessionId: 'a' })).toBe('none');
  });

  it('switches when focus moves to another tile', () => {
    expect(planRetarget(tileA, tileB)).toBe('switch');
  });

  it('switches between the side panel and a tile of the same chat, since they are two composers', () => {
    expect(planRetarget(chatA, tileA)).toBe('switch');
    expect(planRetarget(tileA, chatA)).toBe('switch');
  });

  it('never carries a starting chat into a tile', () => {
    expect(planRetarget(starting, tileA)).toBe('switch');
  });

  it('pauses when no tile has focus and resumes in the tile focused next', () => {
    expect(planRetarget(tileA, null)).toBe('pause');
    expect(planRetarget(null, tileB)).toBe('resume');
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
