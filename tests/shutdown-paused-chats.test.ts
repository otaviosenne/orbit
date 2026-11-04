import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ShutdownPausedChats } from '../src/main/shutdown/shutdown-paused-chats';

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'orbit-paused-'));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe('chats a safe shutdown paused', () => {
  it('are told to continue once each, after the reboot', async () => {
    const file: string = join(folder, 'paused.json');
    await new ShutdownPausedChats(file).add(['a', 'b'], 0);
    const afterReboot: ShutdownPausedChats = new ShutdownPausedChats(file);
    expect(await afterReboot.take('a', 1)).toBe(true);
    expect(await afterReboot.take('a', 2)).toBe(false);
    expect(await afterReboot.take('c', 3)).toBe(false);
    expect(await afterReboot.take('b', 4)).toBe(true);
  });

  it('forget the ones a cancelled shutdown already told to continue', async () => {
    const chats: ShutdownPausedChats = new ShutdownPausedChats(join(folder, 'paused.json'));
    await chats.add(['a', 'b'], 0);
    await chats.remove(['a'], 1);
    expect(await chats.take('a', 2)).toBe(false);
    expect(await chats.take('b', 3)).toBe(true);
  });

  it('do not carry a shutdown nobody reopened from weeks ago', async () => {
    const chats: ShutdownPausedChats = new ShutdownPausedChats(join(folder, 'paused.json'));
    await chats.add(['a'], 0);
    expect(await chats.take('a', 30 * 24 * 60 * 60_000)).toBe(false);
  });
});
