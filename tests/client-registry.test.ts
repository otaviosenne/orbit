import { describe, expect, it } from 'vitest';
import { ClientRegistry } from '../src/main/remote/dictation/client-registry';

const CAPACITY: number = 2;

describe('dictation client registry', () => {
  it('admits up to its capacity', () => {
    const registry: ClientRegistry<string> = new ClientRegistry(CAPACITY);
    expect(registry.admit('phone')).toBe(true);
    expect(registry.admit('tablet')).toBe(true);
    expect(registry.hasRoom).toBe(false);
    expect(registry.admit('laptop')).toBe(false);
    expect(registry.size).toBe(CAPACITY);
  });

  it('frees a slot when a client leaves', () => {
    const registry: ClientRegistry<string> = new ClientRegistry(CAPACITY);
    registry.admit('phone');
    registry.admit('tablet');
    registry.remove('phone');
    expect(registry.admit('laptop')).toBe(true);
  });

  it('hands every client back when drained, and is empty after', () => {
    const registry: ClientRegistry<string> = new ClientRegistry(CAPACITY);
    registry.admit('phone');
    registry.admit('tablet');
    expect(registry.drain()).toEqual(['phone', 'tablet']);
    expect(registry.size).toBe(0);
  });
});
