import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '../src/core/session-registry';
import { allowPending } from '../src/main/questions/permission-auto-allower';
import { plainYes } from '../src/main/questions/permission-answerer';
import type { QuestionSource } from '../src/main/questions/question-lookup';
import type { ActionResult, PickerPermissionView } from '../src/shared/types';

const SOURCE: QuestionSource = { chats: () => Promise.resolve([]), transcript: () => Promise.resolve([]) };
const OK: ActionResult = { ok: true, method: 'socket', error: null };
const FAILED: ActionResult = { ok: false, method: null, error: 'no prompt' };

const session = (sessionId: string, waitingFor: string, statusUpdatedAt: number = 1): SessionRecord => ({
  pid: 1, sessionId, cwd: '/r', startedAt: 0, procStart: '1', name: sessionId, status: 'waiting', statusUpdatedAt, waitingFor,
});

function recorder(result: ActionResult): { allow: (source: QuestionSource, sessionId: string) => Promise<ActionResult>; calls: string[] } {
  const calls: string[] = [];
  return { allow: (_source, sessionId) => (calls.push(sessionId), Promise.resolve(result)), calls };
}

const onlyAllowed = (allowed: string) => (sessionId: string): Promise<boolean> => Promise.resolve(sessionId === allowed);

describe('the permission auto-allower', () => {
  it('answers the permission prompts of an always-approved chat only', async () => {
    const { allow, calls } = recorder(OK);
    const sessions = [session('a', 'permission prompt'), session('b', 'permission prompt'), session('a2', 'input needed')];
    await allowPending(SOURCE, sessions, new Map(), allow, onlyAllowed('a'));
    expect(calls).toEqual(['a']);
  });

  it('never answers a question picker, even in an always-approved chat', async () => {
    const { allow, calls } = recorder(OK);
    await allowPending(SOURCE, [session('a', 'input needed')], new Map(), allow, onlyAllowed('a'));
    expect(calls).toEqual([]);
  });

  it('answers a prompt once, and the next prompt of the chat again', async () => {
    const { allow, calls } = recorder(OK);
    const tries: Map<string, number> = new Map();
    await allowPending(SOURCE, [session('a', 'permission prompt', 1)], tries, allow, onlyAllowed('a'));
    await allowPending(SOURCE, [session('a', 'permission prompt', 1)], tries, allow, onlyAllowed('a'));
    await allowPending(SOURCE, [session('a', 'permission prompt', 2)], tries, allow, onlyAllowed('a'));
    expect(calls).toEqual(['a', 'a']);
  });

  it('leaves a prompt it cannot answer to the user after a few tries', async () => {
    const { allow, calls } = recorder(FAILED);
    const tries: Map<string, number> = new Map();
    for (let check: number = 0; check < 5; check++) await allowPending(SOURCE, [session('a', 'permission prompt')], tries, allow, onlyAllowed('a'));
    expect(calls).toHaveLength(3);
  });
});

describe('the answer Always approve repeats', () => {
  const view = (labels: string[]): PickerPermissionView => ({
    kind: 'permission', fingerprint: 'f', title: null, description: null, detail: null, warnings: [], question: 'Do you want to proceed?',
    options: labels.map((label: string, index: number) => ({ number: index + 1, label })),
  });

  it('is the plain Yes, never the one that stops asking', () => {
    expect(plainYes(view(['Yes', "Yes, and don't ask again for rm commands", 'No']))?.number).toBe(1);
    expect(plainYes(view(["Yes, and don't ask again", 'No']))).toBeUndefined();
  });
});
