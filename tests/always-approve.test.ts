import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alwaysApprove, isAlwaysApproved, isSessionId } from '../src/core/approvals/always-approved';
import { approvalSessionId } from '../src/core/approvals/approval-file';

const SESSION: string = '3f2b9c1e-0d4a-4c55-9a8e-1b2c3d4e5f60';
const CHAT_PID: number = 4242;
const ARGS: Record<string, unknown> = { action: 'release', summary: 'Ships the mute command.' };

let cache: string;

beforeEach(async () => {
  cache = await mkdtemp(join(tmpdir(), 'orbit-always-'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetModules();
  await rm(cache, { recursive: true, force: true });
});

describe('always approve', () => {
  it('remembers a chat by its session, and nothing else', async () => {
    expect(await isAlwaysApproved(SESSION, cache)).toBe(false);
    await alwaysApprove(SESSION, cache);
    expect(await isAlwaysApproved(SESSION, cache)).toBe(true);
    expect(await isAlwaysApproved('another-session', cache)).toBe(false);
    expect(await isAlwaysApproved(null, cache)).toBe(false);
  });

  it('never writes outside its folder', async () => {
    expect(isSessionId('../../etc/passwd')).toBe(false);
    await alwaysApprove('../escape', cache);
    expect(await readdir(cache)).toEqual([]);
  });

  it('reads the session the MCP server put in the request', () => {
    expect(approvalSessionId({ action: 'main', summary: 'x', requestedAt: 1, sessionId: SESSION })).toBe(SESSION);
    expect(approvalSessionId({ action: 'main', summary: 'x', requestedAt: 1 })).toBeNull();
  });

  it('lets an always-approved chat go ahead at once, and shows anyone else\'s request', async () => {
    vi.stubEnv('XDG_CACHE_HOME', cache);
    const { requestApproval } = await import('../src/mcp/approval-tool');
    const { APPROVALS_DIR } = await import('../src/core/approvals/approval-file');
    const asked = await requestApproval(ARGS, CHAT_PID, 1, SESSION);
    expect(asked.content[0]?.text).toMatch(/^Shown in Orbit/);
    expect(await readdir(APPROVALS_DIR)).toContain(`${CHAT_PID}.json`);

    await alwaysApprove(SESSION, join(APPROVALS_DIR, 'always'));
    const approved = await requestApproval(ARGS, CHAT_PID, 2, SESSION);
    expect(approved.content[0]?.text).toMatch(/^Approved in Orbit: go ahead and cut the release\. \(Ships the mute command\.\) The user always approves/);
    expect(approved.isError).toBe(false);
  });
});
