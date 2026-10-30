import { describe, expect, it } from 'vitest';
import type { BoardState } from '../src/shared/board-state';
import type { ActionResult } from '../src/shared/types';
import { BoardSync, type BoardStateApi } from '../src/renderer/board/board-sync';
import { saveShared } from '../src/renderer/board/shared-storage';

const SAVED: ActionResult = { ok: true, method: null, error: null };

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values: Map<string, string> = new Map(Object.entries(initial));
  return {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => void values.set(key, value),
  } as unknown as Storage;
}

class FakeMain implements BoardStateApi {
  values: Record<string, string> = {};
  version: number = 1;
  readonly sets: [string, string][] = [];

  async getBoardState(knownVersion: number | null): Promise<BoardState | null> {
    return knownVersion === this.version ? null : { values: { ...this.values }, version: this.version };
  }

  async setBoardState(key: string, value: string): Promise<ActionResult> {
    this.sets.push([key, value]);
    this.values[key] = value;
    this.version += 1;
    return SAVED;
  }
}

describe('the shared board', () => {
  it('copies what the main process holds into this window and says so', async () => {
    const main: FakeMain = new FakeMain();
    main.values = { 'orbit.pinned': '["a"]' };
    const storage: Storage = memoryStorage({ 'orbit.pinned': '[]' });
    let changes: number = 0;
    await new BoardSync(main, storage, (): void => void (changes += 1)).start(false);
    expect(storage.getItem('orbit.pinned')).toBe('["a"]');
    expect(changes).toBe(1);
  });

  it('fills keys the main process never held from the desktop, but not from a phone', async () => {
    const desktop: FakeMain = new FakeMain();
    await new BoardSync(desktop, memoryStorage({ 'orbit.suspended': '[1]' }), (): void => undefined).start(true);
    expect(desktop.sets).toEqual([['orbit.suspended', '[1]']]);
    const phone: FakeMain = new FakeMain();
    await new BoardSync(phone, memoryStorage({ 'orbit.suspended': '[]' }), (): void => undefined).start(false);
    expect(phone.sets).toEqual([]);
  });

  it('sends this window\'s writes, and only the shared ones', async () => {
    const main: FakeMain = new FakeMain();
    globalThis.localStorage = memoryStorage();
    await new BoardSync(main, globalThis.localStorage, (): void => undefined).start(false);
    saveShared('orbit.pinned', '["b"]');
    saveShared('orbit.pinned-info', '[]', false);
    expect(main.sets).toEqual([['orbit.pinned', '["b"]']]);
  });

  it('asks again only when the main process has a new version', async () => {
    const main: FakeMain = new FakeMain();
    main.values = { 'orbit.pinned': '["a"]' };
    let changes: number = 0;
    const sync: BoardSync = new BoardSync(main, memoryStorage(), (): void => void (changes += 1));
    await sync.start(false);
    await sync.refresh();
    expect(changes).toBe(1);
    main.values = { 'orbit.pinned': '["a","c"]' };
    main.version += 1;
    await sync.refresh();
    expect(changes).toBe(2);
  });
});
