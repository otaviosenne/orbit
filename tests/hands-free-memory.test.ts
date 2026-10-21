import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rememberHandsFree, wasHandsFreeOn } from '../src/renderer/sheet/hands-free/hands-free-memory';

let store: Map<string, string> = new Map();

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => void store.set(key, value),
    removeItem: (key: string): void => void store.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('hands-free memory', () => {
  it('starts off when nothing was saved', () => {
    expect(wasHandsFreeOn()).toBe(false);
  });

  it('remembers on, then off', () => {
    rememberHandsFree(true);
    expect(wasHandsFreeOn()).toBe(true);
    rememberHandsFree(false);
    expect(wasHandsFreeOn()).toBe(false);
  });

  it('counts unreadable storage as off', () => {
    vi.stubGlobal('localStorage', { getItem: (): never => { throw new Error('blocked'); } });
    expect(wasHandsFreeOn()).toBe(false);
  });
});
