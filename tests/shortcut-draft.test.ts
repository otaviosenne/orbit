import { describe, expect, it } from 'vitest';
import { draftProblem, expandHome, folderProblem, isShortcutDraft, normalizeDraft } from '../src/shared/shortcut-draft';
import type { ShortcutDraft } from '../src/shared/types';

const DRAFT: ShortcutDraft = { label: '  Claude acme ', chatName: ' ', folder: ' /home/me/code/acme ' };

describe('normalizeDraft', () => {
  it('trims fields and names the chat after the label when no chat name is given', () => {
    expect(normalizeDraft(DRAFT)).toEqual({ label: 'Claude acme', chatName: 'Claude acme', folder: '/home/me/code/acme' });
  });

  it('keeps an explicit chat name', () => {
    expect(normalizeDraft({ ...DRAFT, chatName: 'Acme today' }).chatName).toBe('Acme today');
  });
});

describe('draftProblem', () => {
  const valid: ShortcutDraft = normalizeDraft(DRAFT);

  it('accepts a complete draft', () => {
    expect(draftProblem(valid, ['globex'])).toBeNull();
  });

  it('rejects an empty label, a taken label, an empty folder and tabs or line breaks', () => {
    expect(draftProblem({ ...valid, label: '' }, [])).not.toBeNull();
    expect(draftProblem(valid, ['Claude acme'])).not.toBeNull();
    expect(draftProblem({ ...valid, folder: '' }, [])).not.toBeNull();
    expect(draftProblem({ ...valid, chatName: 'a\tb' }, [])).not.toBeNull();
    expect(draftProblem({ ...valid, folder: '/a\nb' }, [])).not.toBeNull();
  });
});

describe('folders', () => {
  it('expands ~ and requires a full path', () => {
    expect(expandHome('~/proj', '/home/me')).toBe('/home/me/proj');
    expect(expandHome('~', '/home/me')).toBe('/home/me');
    expect(expandHome('/abs/~/x', '/home/me')).toBe('/abs/~/x');
    expect(folderProblem('/home/me/proj')).toBeNull();
    expect(folderProblem('proj')).not.toBeNull();
  });
});

describe('isShortcutDraft', () => {
  it('accepts only objects with three string fields', () => {
    expect(isShortcutDraft(DRAFT)).toBe(true);
    expect(isShortcutDraft({ label: 'a', chatName: 'b' })).toBe(false);
    expect(isShortcutDraft('a')).toBe(false);
    expect(isShortcutDraft(null)).toBe(false);
  });
});
