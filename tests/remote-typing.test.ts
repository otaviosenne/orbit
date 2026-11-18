import { describe, expect, it } from 'vitest';
import { targetOf } from '../src/main/remote-typing/typing-target';
import { MAX_TYPED_LENGTH, parseTypeRequest } from '../src/shared/remote-typing';

describe('parseTypeRequest', () => {
  it('takes text and the Enter choice', () => {
    expect(parseTypeRequest({ text: 's3cret!', pressEnter: true })).toEqual({ text: 's3cret!', pressEnter: true });
  });

  it('refuses empty, overlong, multi-line or malformed requests', () => {
    expect(parseTypeRequest({ text: '', pressEnter: true })).toBeNull();
    expect(parseTypeRequest({ text: 'x'.repeat(MAX_TYPED_LENGTH + 1), pressEnter: false })).toBeNull();
    expect(parseTypeRequest({ text: 'a\nb', pressEnter: false })).toBeNull();
    expect(parseTypeRequest({ text: 'a', pressEnter: 'yes' })).toBeNull();
    expect(parseTypeRequest('a')).toBeNull();
  });
});

describe('targetOf', () => {
  it('accepts a browser window and names it', () => {
    expect(targetOf({ class: 'google-chrome', title: 'Router login' })).toEqual({ title: 'Router login', app: 'google-chrome', accepts: true, refusal: null });
  });

  it('refuses everything but a browser: a chat terminal, a messenger, Orbit itself', () => {
    expect(targetOf({ class: 'kitty', title: 'claude' }).accepts).toBe(false);
    expect(targetOf({ class: 'com.rtosta.zapzap', title: 'WhatsApp' }).accepts).toBe(false);
    expect(targetOf({ class: 'claude-radar', title: 'Orbit' }).accepts).toBe(false);
  });

  it('has no target without a focused window', () => {
    expect(targetOf({}).accepts).toBe(false);
  });
});
