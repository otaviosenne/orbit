import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BoardStateStore } from '../src/main/board-state/board-state-store';

async function freshPath(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'orbit-board-')), 'board-state.json');
}

describe('the board state the main process keeps', () => {
  it('saves shared keys to its file and survives a restart', async () => {
    const path: string = await freshPath();
    expect((await new BoardStateStore(path).set('orbit.pinned', '["a"]')).ok).toBe(true);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ 'orbit.pinned': '["a"]' });
    expect((await new BoardStateStore(path).get(null))?.values).toEqual({ 'orbit.pinned': '["a"]' });
  });

  it('refuses other keys and values that are not text', async () => {
    const store: BoardStateStore = new BoardStateStore(await freshPath());
    expect((await store.set('orbit.theme', 'dark')).ok).toBe(false);
    expect((await store.set('orbit.pinned', 42)).ok).toBe(false);
  });

  it('answers null while the caller already has the current version', async () => {
    const store: BoardStateStore = new BoardStateStore(await freshPath());
    const first = await store.get(null);
    expect(await store.get(first?.version)).toBeNull();
    await store.set('orbit.suspended', '[]');
    expect((await store.get(first?.version))?.values).toEqual({ 'orbit.suspended': '[]' });
  });
});
