import { describe, expect, it } from 'vitest';
import { typingReply } from '../src/shared/typing-reply';
import type { TypingRequest } from '../src/shared/typing-request';
import { MAX_TYPING_FIELDS, answerFits, parseTypingAnswer, parseTypingRequest } from '../src/shared/typing-request';

const ONE_FIELD: TypingRequest = { title: null, fields: [{ label: 'Senha do modem' }], requestedAt: 1 };
const SIGN_IN: TypingRequest = { title: 'Login do modem', fields: [{ label: 'E-mail' }, { label: 'Senha' }, { label: 'Palavra' }], requestedAt: 1 };
// Share no substring with any label, so "never contains" cannot pass or fail by accident.
const SECRETS: readonly string[] = ['qx7#zz', 'hunter2-wq', 'vvk9!m'];

describe('parseTypingRequest', () => {
  it('keeps a title and one-line labels in order', () => {
    expect(parseTypingRequest({ title: ' Login\n do modem ', fields: [{ label: 'E-mail' }, { label: 'Sen\nha' }, { label: 'Palavra' }], requestedAt: 1 }))
      .toEqual({ ...SIGN_IN, fields: [{ label: 'E-mail' }, { label: 'Sen ha' }, { label: 'Palavra' }] });
  });

  it('reads a file from an older server, with one label, as one field', () => {
    expect(parseTypingRequest({ label: 'Senha\n do modem', requestedAt: 1 })).toEqual(ONE_FIELD);
  });

  it('refuses no fields, too many, a blank label, a bad title or a missing time', () => {
    expect(parseTypingRequest({ fields: [], requestedAt: 1 })).toBeNull();
    expect(parseTypingRequest({ fields: Array.from({ length: MAX_TYPING_FIELDS + 1 }, () => ({ label: 'x' })), requestedAt: 1 })).toBeNull();
    expect(parseTypingRequest({ fields: [{ label: 'a' }, { label: '  ' }], requestedAt: 1 })).toBeNull();
    expect(parseTypingRequest({ title: 7, fields: [{ label: 'a' }], requestedAt: 1 })).toBeNull();
    expect(parseTypingRequest({ label: '  ', requestedAt: 1 })).toBeNull();
    expect(parseTypingRequest({ label: 'x' })).toBeNull();
  });
});

describe('parseTypingAnswer', () => {
  it('takes one text per field or a decline', () => {
    expect(parseTypingAnswer({ texts: ['a@b.c', 'p4ss'], pressEnter: false })).toEqual({ texts: ['a@b.c', 'p4ss'], pressEnter: false });
    expect(parseTypingAnswer('decline')).toBe('decline');
  });

  it('refuses the old one-text shape, an empty or multi-line text, or too many texts', () => {
    expect(parseTypingAnswer({ text: 'p4ss', pressEnter: true })).toBeNull();
    expect(parseTypingAnswer({ texts: [], pressEnter: true })).toBeNull();
    expect(parseTypingAnswer({ texts: ['a', ''], pressEnter: true })).toBeNull();
    expect(parseTypingAnswer({ texts: ['a\nb'], pressEnter: true })).toBeNull();
    expect(parseTypingAnswer({ texts: Array.from({ length: MAX_TYPING_FIELDS + 1 }, () => 'x'), pressEnter: true })).toBeNull();
    expect(parseTypingAnswer({ texts: ['a'], pressEnter: 'yes' })).toBeNull();
    expect(parseTypingAnswer('p4ss')).toBeNull();
  });
});

describe('answerFits', () => {
  it('needs exactly one text per field of the claimed request', () => {
    expect(answerFits(SIGN_IN, { texts: [...SECRETS], pressEnter: false })).toBe(true);
    expect(answerFits(SIGN_IN, { texts: SECRETS.slice(0, 2), pressEnter: false })).toBe(false);
    expect(answerFits(ONE_FIELD, { texts: [...SECRETS], pressEnter: false })).toBe(false);
    expect(answerFits(SIGN_IN, 'decline')).toBe(true);
  });
});

describe('typingReply', () => {
  it('names the one field and never the text', () => {
    const reply: string = typingReply(ONE_FIELD, { texts: [SECRETS[0] ?? ''], pressEnter: true });
    expect(reply).toContain('"Senha do modem" into the focused field');
    expect(reply).toContain('pressed Enter');
    expect(reply).not.toContain(SECRETS[0]);
  });

  it('lists every field typed, in order, with Tab between them, and none of the texts', () => {
    const reply: string = typingReply(SIGN_IN, { texts: [...SECRETS], pressEnter: false });
    expect(reply).toContain('"E-mail", "Senha" and "Palavra"');
    expect(reply).toContain('Tab');
    expect(reply).not.toContain('Enter');
    for (const secret of SECRETS) expect(reply).not.toContain(secret);
  });

  it('says a decline and which fields it covered', () => {
    expect(typingReply(SIGN_IN, 'decline')).toBe('Declined in Orbit: the user did not type "E-mail", "Senha" and "Palavra".');
  });
});
