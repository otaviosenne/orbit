import { describe, expect, it } from 'vitest';
import { PendingEdits } from '../src/renderer/pending-edits';
import type { ChatSnapshot } from '../src/shared/types';

const chat: ChatSnapshot = {
  sessionId: 's1', pid: 1, name: 'OLD', color: 'red', repository: { name: 'r', root: '/r' }, cwd: '/r', startedAt: 0, status: 'idle', statusSince: 0, agents: [], shells: [], lastReplyAt: null, isFocused: false, approval: null, localCi: null,
};

describe('PendingEdits', () => {
  it('shows an edit right away and keeps it until the chat reports the same value', () => {
    const edits: PendingEdits = new PendingEdits();
    edits.set('s1', { name: 'NEW', color: 'cyan' }, 0);
    expect(edits.apply([chat], 1000)[0]).toMatchObject({ name: 'NEW', color: 'cyan' });
    expect(edits.apply([{ ...chat, color: 'cyan' }], 2000)[0]).toMatchObject({ name: 'NEW', color: 'cyan' });
    expect(edits.apply([{ ...chat, name: 'NEW', color: 'cyan' }], 3000)[0]).toMatchObject({ name: 'NEW', color: 'cyan' });
    // Confirmed fields are forgotten, so a later outside change is shown as is.
    expect(edits.apply([{ ...chat, name: 'LATER' }], 4000)[0]).toMatchObject({ name: 'LATER', color: 'red' });
  });

  it('drops a failed edit and gives up after the time limit', () => {
    const edits: PendingEdits = new PendingEdits();
    edits.set('s1', { name: 'NEW', color: 'cyan' }, 0);
    edits.drop('s1', 'name');
    expect(edits.apply([chat], 1000)[0]).toMatchObject({ name: 'OLD', color: 'cyan' });
    expect(edits.apply([chat], 60_000)[0]).toMatchObject({ name: 'OLD', color: 'red' });
  });
});
