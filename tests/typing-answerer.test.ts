import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '../src/shared/types';

const CHAT_PID: number = 4343;
const SESSION: string = '3f2b9c1e-0d4a-4c55-9a8e-1b2c3d4e5f60';
const SENT: ActionResult = { ok: true, method: 'socket', error: null };
const ARGS: Record<string, unknown> = { title: 'Login do modem', fields: [{ label: 'E-mail' }, { label: 'Senha' }] };
const SECRET: string = 'qx7#zz';

let cache: string;
const sendMessage = vi.fn(async (): Promise<ActionResult> => SENT);
const copySecret = vi.fn(async (): Promise<void> => undefined);

beforeEach(async () => {
  cache = await mkdtemp(join(tmpdir(), 'orbit-typing-'));
  vi.stubEnv('XDG_CACHE_HOME', cache);
  // TYPING_DIR is fixed when the module loads, so it must load again under the stubbed cache folder.
  vi.resetModules();
  vi.doMock('../src/main/chat-actions', () => ({ sendMessage }));
  vi.doMock('../src/main/secret-clipboard/secret-clipboard', () => ({ copySecret }));
  sendMessage.mockClear();
  copySecret.mockClear();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.doUnmock('../src/main/chat-actions');
  vi.doUnmock('../src/main/secret-clipboard/secret-clipboard');
  await rm(cache, { recursive: true, force: true });
});

async function askForTwoFields(): Promise<string> {
  const { requestTyping } = await import('../src/mcp/typing-tool');
  const { typingPath } = await import('../src/core/typing/typing-file');
  await requestTyping(ARGS, CHAT_PID, 1, SESSION);
  return typingPath(CHAT_PID);
}

describe('answerTyping', () => {
  it('copies one field at a time, keeps the request open for the rest, and tells the chat only the label', async () => {
    const path: string = await askForTwoFields();
    const { answerTyping } = await import('../src/main/typing/typing-answerer');

    expect(await answerTyping(CHAT_PID, { field: 1, text: SECRET })).toEqual(SENT);
    expect(copySecret).toHaveBeenCalledWith(SECRET);
    const saved: Record<string, unknown> = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    expect(saved['copied']).toEqual([1]);
    expect(saved['sessionId']).toBe(SESSION);
    const reply: string = String(sendMessage.mock.calls[0]?.at(1));
    expect(reply).toContain('"Senha"');
    expect(reply).not.toContain(SECRET);

    expect((await answerTyping(CHAT_PID, { field: 1, text: SECRET })).ok).toBe(false);
    expect(await answerTyping(CHAT_PID, { field: 0, text: 'a@b.c' })).toEqual(SENT);
    await expect(readFile(path, 'utf8')).rejects.toThrow();
    expect(String(sendMessage.mock.calls.at(-1)?.at(1))).toContain('That was the last field.');
  });

  it('puts the request back when the copy fails, and tells the chat nothing', async () => {
    const path: string = await askForTwoFields();
    const { answerTyping } = await import('../src/main/typing/typing-answerer');
    copySecret.mockRejectedValueOnce(new Error('no wayland'));

    expect((await answerTyping(CHAT_PID, { field: 0, text: SECRET })).ok).toBe(false);
    expect(JSON.parse(await readFile(path, 'utf8'))).toMatchObject({ copied: [] });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('closes the request on a decline', async () => {
    const path: string = await askForTwoFields();
    const { answerTyping } = await import('../src/main/typing/typing-answerer');

    expect(await answerTyping(CHAT_PID, 'decline')).toEqual(SENT);
    await expect(readFile(path, 'utf8')).rejects.toThrow();
    expect(String(sendMessage.mock.calls[0]?.at(1))).toMatch(/^Declined in Orbit/);
  });
});
