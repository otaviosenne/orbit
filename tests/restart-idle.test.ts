import { describe, expect, it } from 'vitest';
import { isResting, restartIdleChats } from '../src/renderer/restart/restart-idle';
import type { RestartReport } from '../src/renderer/restart/restart-idle';
import type { ActionResult, ChatSnapshot } from '../src/shared/types';

function chat(pid: number, patch: Partial<ChatSnapshot> = {}): ChatSnapshot {
  return { pid, sessionId: `s-${pid}`, status: 'idle', agents: [], shells: [], ...patch } as ChatSnapshot;
}

const OK: ActionResult = { ok: true, method: null, error: null };

describe('restart idle chats', () => {
  it('counts only a quiet chat as resting', () => {
    expect(isResting(chat(1))).toBe(true);
    expect(isResting(chat(2, { status: 'busy' }))).toBe(false);
    expect(isResting(chat(3, { status: 'waiting' }))).toBe(false);
    expect(isResting(chat(4, { shells: [{ status: 'running' }] } as unknown as Partial<ChatSnapshot>))).toBe(false);
  });

  it('restarts the resting chats one by one and reports the rest', async () => {
    const asked: number[] = [];
    const restart: (pid: number) => Promise<ActionResult> = async (pid: number): Promise<ActionResult> => {
      asked.push(pid);
      return pid === 5 ? { ok: false, method: null, error: 'gone' } : OK;
    };
    const report: RestartReport = await restartIdleChats([chat(1), chat(2, { status: 'busy' }), chat(5)], restart);
    expect(asked).toEqual([1, 5]);
    expect(report).toEqual({ restarted: 1, skipped: 1, failed: 1 });
  });
});
