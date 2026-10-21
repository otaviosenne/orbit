import { describe, expect, it } from 'vitest';
import { DraftStore } from '../src/renderer/sheet/draft-store';

describe('DraftStore.replaceText', () => {
  it('finishes a kept draft with late dictated words while it is unchanged', () => {
    const drafts: DraftStore = new DraftStore();
    drafts.set('a', { text: 'fix the', files: [] });
    drafts.replaceText('a', 'fix the', 'fix the parser');
    expect(drafts.get('a').text).toBe('fix the parser');
  });

  it('leaves a draft alone once it changed some other way', () => {
    const drafts: DraftStore = new DraftStore();
    drafts.set('a', { text: 'edited by hand', files: [] });
    drafts.replaceText('a', 'fix the', 'fix the parser');
    expect(drafts.get('a').text).toBe('edited by hand');
  });

  it('starts a draft for a chat that had none', () => {
    const drafts: DraftStore = new DraftStore();
    drafts.replaceText('b', '', 'hello');
    expect(drafts.get('b').text).toBe('hello');
  });
});
