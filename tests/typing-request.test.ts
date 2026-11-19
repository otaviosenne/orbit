import { describe, expect, it } from 'vitest';
import { answerFits, parseTypingAnswer } from '../src/shared/typing-answer';
import { copiedReply, declinedReply } from '../src/shared/typing-reply';
import type { TypingRequest } from '../src/shared/typing-request';
import { MAX_TYPING_FIELDS, isFullyCopied, openSince, parseTypingRequest, withCopied } from '../src/shared/typing-request';

const UNCOPIED: Pick<TypingRequest, 'copied' | 'copiedAt'> = { copied: [], copiedAt: null };
const ONE_FIELD: TypingRequest = { title: null, fields: [{ label: 'Senha do modem' }], requestedAt: 1, ...UNCOPIED };
const SIGN_IN: TypingRequest = { title: 'Login do modem', fields: [{ label: 'E-mail' }, { label: 'Senha' }, { label: 'Palavra' }], requestedAt: 1, ...UNCOPIED };
const COPIED_AT: number = 50;
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

  it('keeps the fields already copied, dropping indexes the request does not have', () => {
    expect(parseTypingRequest({ fields: SIGN_IN.fields, requestedAt: 1, copied: [2, 0, 0, 7, -1, 1.5, 'x'], copiedAt: COPIED_AT }))
      .toEqual({ ...SIGN_IN, title: null, copied: [2, 0], copiedAt: COPIED_AT });
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
  it('reads one field copy or a decline', () => {
    expect(parseTypingAnswer({ field: 1, text: 'p4ss' })).toEqual({ field: 1, text: 'p4ss' });
    expect(parseTypingAnswer('decline')).toBe('decline');
  });

  it('refuses the old typed shape, a bad index, or text Orbit would not copy', () => {
    expect(parseTypingAnswer({ texts: ['a@b.c', 'p4ss'], pressEnter: false })).toBeNull();
    expect(parseTypingAnswer({ field: 0.5, text: 'p4ss' })).toBeNull();
    expect(parseTypingAnswer({ field: '0', text: 'p4ss' })).toBeNull();
    expect(parseTypingAnswer({ field: 0, text: '' })).toBeNull();
    expect(parseTypingAnswer({ field: 0, text: 'a\nb' })).toBeNull();
    expect(parseTypingAnswer('p4ss')).toBeNull();
  });
});

describe('answerFits', () => {
  it('takes a field the request has and has not copied yet', () => {
    expect(answerFits(SIGN_IN, { field: 2, text: 'x' })).toBe(true);
    expect(answerFits(SIGN_IN, { field: 3, text: 'x' })).toBe(false);
    expect(answerFits(SIGN_IN, { field: -1, text: 'x' })).toBe(false);
    expect(answerFits(withCopied(SIGN_IN, 2, COPIED_AT), { field: 2, text: 'x' })).toBe(false);
    expect(answerFits(SIGN_IN, 'decline')).toBe(true);
  });
});

describe('withCopied', () => {
  it('marks the field done once and restarts the wait from the copy', () => {
    const once: TypingRequest = withCopied(SIGN_IN, 1, COPIED_AT);
    expect(withCopied(once, 1, COPIED_AT).copied).toEqual([1]);
    expect(openSince(SIGN_IN)).toBe(SIGN_IN.requestedAt);
    expect(openSince(once)).toBe(COPIED_AT);
  });

  it('is fully copied only when every field is', () => {
    const two: TypingRequest = withCopied(withCopied(SIGN_IN, 0, COPIED_AT), 2, COPIED_AT);
    expect(isFullyCopied(two)).toBe(false);
    expect(isFullyCopied(withCopied(two, 1, COPIED_AT))).toBe(true);
  });
});

describe('copiedReply', () => {
  it('names the field to paste with ctrl+v and what is left, never a text', () => {
    const reply: string = copiedReply(withCopied(SIGN_IN, 1, COPIED_AT), 1);
    expect(reply).toContain('Copied in Orbit: "Senha"');
    expect(reply).toContain('ctrl+v');
    expect(reply).toContain('still to copy: "E-mail" and "Palavra"');
    for (const secret of SECRETS) expect(reply).not.toContain(secret);
  });

  it('says when the field was the last one', () => {
    expect(copiedReply(withCopied(ONE_FIELD, 0, COPIED_AT), 0)).toContain('That was the last field.');
  });
});

describe('declinedReply', () => {
  it('lists only the fields still to copy', () => {
    expect(declinedReply(SIGN_IN)).toBe('Declined in Orbit: the user did not copy "E-mail", "Senha" and "Palavra".');
    expect(declinedReply(withCopied(SIGN_IN, 0, COPIED_AT))).toBe('Declined in Orbit: the user did not copy "Senha" and "Palavra".');
  });
});
