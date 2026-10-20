import { mkdtemp, mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SubagentReader } from '../src/core/subagent-reader';
import type { AgentSnapshot } from '../src/shared/types';

const AGENT_ID: string = 'a8cab616f90bf57bd';
const MS_PER_SECOND: number = 1000;
// What Claude Code leaves when the user stops an agent mid-tool: an interruption, never a clean final turn.
const INTERRUPTED: string = [
  JSON.stringify({ type: 'user', timestamp: '2026-10-20T20:12:00Z', message: { content: 'count to 100' } }),
  JSON.stringify({ type: 'user', timestamp: '2026-10-20T20:17:25Z', message: { content: [{ type: 'text', text: '[Request interrupted by user for tool use]' }] } }),
].join('\n');

let root: string;

beforeEach(async (): Promise<void> => {
  root = await mkdtemp(join(tmpdir(), 'orbit-subagents-'));
});

afterEach(async (): Promise<void> => {
  await rm(root, { recursive: true, force: true });
});

// Writes a chat transcript with one agent next to it, last written just now so it counts as this run's.
async function chatWithAgent(meta: object): Promise<string> {
  const directory: string = join(root, 'session', 'subagents');
  await mkdir(directory, { recursive: true });
  const transcript: string = join(directory, `agent-${AGENT_ID}.jsonl`);
  await writeFile(transcript, INTERRUPTED);
  const now: Date = new Date();
  await utimes(transcript, now, now);
  await writeFile(join(directory, `agent-${AGENT_ID}.meta.json`), JSON.stringify(meta));
  return join(root, 'session.jsonl');
}

async function readOnlyAgent(chatTranscript: string): Promise<AgentSnapshot | undefined> {
  const now: number = Date.now();
  return (await new SubagentReader().read(chatTranscript, now - MS_PER_SECOND, now))[0];
}

describe('SubagentReader', () => {
  it('counts an agent the user stopped as finished, though its transcript ends on an interruption', async () => {
    const agent: AgentSnapshot | undefined = await readOnlyAgent(await chatWithAgent({ description: 'Count', stoppedByUser: true }));
    expect(agent?.state).toBe('done');
  });

  it('keeps a live agent with the same transcript running', async () => {
    const agent: AgentSnapshot | undefined = await readOnlyAgent(await chatWithAgent({ description: 'Count' }));
    expect(agent?.state).toBe('running');
  });
});
