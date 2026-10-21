import { describe, expect, it } from 'vitest';
import type { DropEffects } from '../src/renderer/board/apply-drop';
import { applyDrop } from '../src/renderer/board/apply-drop';

function recorder(): { readonly calls: string[]; readonly effects: DropEffects } {
  const calls: string[] = [];
  const effects: DropEffects = {
    pin: (id: string): void => void calls.push(`pin ${id}`),
    unpin: (id: string): void => void calls.push(`unpin ${id}`),
    rest: (id: string, column: string): void => void calls.push(`rest ${id} ${column}`),
  };
  return { calls, effects };
}

describe('applyDrop', () => {
  it('pins, unpins, and moves between Active and Idle', () => {
    const { calls, effects } = recorder();
    applyDrop('a', { kind: 'pin' }, effects);
    applyDrop('b', { kind: 'unpin', rest: null }, effects);
    applyDrop('c', { kind: 'rest', column: 'idle' }, effects);
    expect(calls).toEqual(['pin a', 'unpin b', 'rest c idle']);
  });

  it('unpins and rests in one drop out of the Pinned row', () => {
    const { calls, effects } = recorder();
    applyDrop('a', { kind: 'unpin', rest: 'active' }, effects);
    expect(calls).toEqual(['unpin a', 'rest a active']);
  });

  it('does nothing for a drop the rules turned down', () => {
    const { calls, effects } = recorder();
    applyDrop('a', { kind: 'none' }, effects);
    expect(calls).toEqual([]);
  });
});
