import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CHAT_PID: number = 4343;
const ARGS: Record<string, unknown> = { question: 'Deploy now or tomorrow?', options: [{ label: 'Now' }, { label: 'Tomorrow', description: 'After the backup' }] };

let cache: string;

beforeEach(async () => {
  cache = await mkdtemp(join(tmpdir(), 'orbit-ask-'));
  vi.stubEnv('XDG_CACHE_HOME', cache);
  // ASKS_DIR is fixed when the module loads, so it must load again under the stubbed cache folder.
  vi.resetModules();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetModules();
  await rm(cache, { recursive: true, force: true });
});

describe('ask_user', () => {
  it('saves the question for Orbit to pin, and tells the chat to end its turn', async () => {
    const { askUser } = await import('../src/mcp/ask-tool');
    const { readAsk } = await import('../src/core/asks/ask-file');
    const result = await askUser(ARGS, CHAT_PID, 2_000, null);
    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toMatch(/^Shown in Orbit above this chat\. End your turn now/);
    const chat = { pid: CHAT_PID, startedAt: 1_000, status: 'idle', statusUpdatedAt: 3_000 };
    expect(await readAsk(chat)).toEqual({
      question: 'Deploy now or tomorrow?',
      options: [{ label: 'Now', description: '' }, { label: 'Tomorrow', description: 'After the backup' }],
      requestedAt: 2_000,
    });
    // Working again means it was answered some other way.
    expect(await readAsk({ ...chat, status: 'busy', statusUpdatedAt: 9_000 })).toBeNull();
  });

  it('refuses a question without enough options and saves nothing', async () => {
    const { askUser } = await import('../src/mcp/ask-tool');
    const { readAsk } = await import('../src/core/asks/ask-file');
    const result = await askUser({ question: 'Ok?', options: [{ label: 'Yes' }] }, CHAT_PID, 2_000, null);
    expect(result.isError).toBe(true);
    expect(await readAsk({ pid: CHAT_PID, startedAt: 1_000, status: 'idle', statusUpdatedAt: 3_000 })).toBeNull();
  });
});
