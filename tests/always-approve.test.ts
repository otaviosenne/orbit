import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alwaysApprove, alwaysDirOf, isAlwaysApproved, isSessionId } from '../src/core/approvals/always-approved';
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
    // APPROVALS_DIR is fixed when the module loads, so it must load again under the stubbed cache folder.
    vi.resetModules();
    const { requestApproval } = await import('../src/mcp/approval-tool');
    const { APPROVALS_DIR } = await import('../src/core/approvals/approval-file');
    const asked = await requestApproval(ARGS, CHAT_PID, 1, SESSION);
    expect(asked.content[0]?.text).toMatch(/^Shown in Orbit/);
    expect(await readdir(APPROVALS_DIR)).toContain(`${CHAT_PID}.json`);

    expect(APPROVALS_DIR.startsWith(cache)).toBe(true);
    await alwaysApprove(SESSION, alwaysDirOf(APPROVALS_DIR));
    const approved = await requestApproval(ARGS, CHAT_PID, 2, SESSION);
    expect(approved.content[0]?.text).toMatch(/^Approved in Orbit: go ahead and cut the release\. \(Ships the mute command\.\) The user always approves/);
    expect(approved.isError).toBe(false);
  });
});

describe('Orbit answering for an old MCP server', () => {
  it('approves a fresh request of an always-approved chat once, and leaves the others on screen', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { approvePending } = await import('../src/main/approvals/auto-approver');
    const now: number = 100_000;
    await writeFile(join(cache, '11.json'), JSON.stringify({ action: 'main', summary: 'a', requestedAt: now - 1_000, sessionId: SESSION }));
    await writeFile(join(cache, '12.json'), JSON.stringify({ action: 'main', summary: 'b', requestedAt: now - 1_000, sessionId: 'someone-else' }));
    // Long gone: a chat that asked before Orbit was running.
    await writeFile(join(cache, '13.json'), JSON.stringify({ action: 'main', summary: 'c', requestedAt: 1, sessionId: SESSION }));
    await alwaysApprove(SESSION, alwaysDirOf(cache));
    const answered: number[] = [];
    const answer = async (pid: number): Promise<{ ok: boolean; method: null; error: null }> => {
      answered.push(pid);
      return { ok: true, method: null, error: null };
    };
    const tried: Set<string> = new Set();
    await approvePending(cache, tried, now, answer);
    await approvePending(cache, tried, now, answer);
    expect(answered).toEqual([11]);
  });
});
