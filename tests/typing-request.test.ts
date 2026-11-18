import { describe, expect, it } from 'vitest';
import { parseTypingAnswer, parseTypingRequest, typingReply } from '../src/shared/typing-request';

const REQUEST = { label: 'Senha do modem', requestedAt: 1 };

describe('parseTypingRequest', () => {
  it('keeps a one-line label', () => {
    expect(parseTypingRequest({ label: 'Senha\n do modem', requestedAt: 1 })).toEqual(REQUEST);
  });

  it('refuses a missing label or time', () => {
    expect(parseTypingRequest({ label: '  ', requestedAt: 1 })).toBeNull();
    expect(parseTypingRequest({ label: 'x' })).toBeNull();
  });
});

describe('parseTypingAnswer', () => {
  it('takes text to type or a decline', () => {
    expect(parseTypingAnswer({ text: 'p4ss', pressEnter: true })).toEqual({ text: 'p4ss', pressEnter: true });
    expect(parseTypingAnswer('decline')).toBe('decline');
    expect(parseTypingAnswer('p4ss')).toBeNull();
  });
});

describe('typingReply', () => {
  it('tells the chat what happened and never the text', () => {
    const reply: string = typingReply(REQUEST, { text: 'hunter2-secret', pressEnter: true });
    expect(reply).toContain('Senha do modem');
    expect(reply).toContain('pressed Enter');
    expect(reply).not.toContain('hunter2-secret');
    expect(typingReply(REQUEST, 'decline')).toContain('Declined');
  });
});
