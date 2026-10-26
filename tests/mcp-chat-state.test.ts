import { describe, expect, it } from 'vitest';
import { applyChatMcpState, newestState, NO_CHAT_MCP_STATE } from '../src/core/mcp/chat-mcp-state';
import type { McpServerEntry } from '../src/shared/types';

const STARTED_AT: number = Date.parse('2026-10-26T09:00:00Z');

function delta(timestamp: string, attachment: Record<string, unknown>): string {
  return JSON.stringify({ type: 'attachment', timestamp, attachment: { type: 'deferred_tools_delta', addedNames: [], removedNames: [], ...attachment } });
}

const FAILED: string = delta('2026-10-26T14:59:57.651Z', { failedMcpServers: [{ name: 'browsermcp', errorCode: 'CONNECT_TIMEOUT' }], pendingMcpServers: [] });
const RESYNC: string = delta('2026-10-26T15:30:00.000Z', { addedNames: ['mcp__devhub__get_item'] });
const RECOVERED: string = delta('2026-10-26T16:00:00.000Z', { failedMcpServers: [], pendingMcpServers: [] });

describe('newestState', () => {
  it('reports the servers the newest health update lists as failed or pending', () => {
    const text: string = [FAILED, delta('2026-10-26T15:00:00Z', { failedMcpServers: [], pendingMcpServers: ['devhub'] })].join('\n');
    const result = newestState(text, STARTED_AT);
    expect([...result.value.failed]).toEqual([]);
    expect([...result.value.pending]).toEqual(['devhub']);
    expect(result.satisfied).toBe(true);
  });

  it('skips a full re-send of the tool list, which carries no health field', () => {
    const result = newestState([FAILED, RESYNC].join('\n'), STARTED_AT);
    expect([...result.value.failed]).toEqual(['browsermcp']);
  });

  it('lets a later all-clear replace an earlier failure', () => {
    expect([...newestState([FAILED, RECOVERED].join('\n'), STARTED_AT).value.failed]).toEqual([]);
  });

  it('ignores health reported by an earlier run of the chat: a resume reconnects every server', () => {
    const before: string = delta('2026-10-26T08:00:00Z', { failedMcpServers: [{ name: 'browsermcp' }] });
    const result = newestState(before, STARTED_AT);
    expect(result.value).toBe(NO_CHAT_MCP_STATE);
    expect(result.satisfied).toBe(true);
  });

  it('keeps looking when the window holds no health update', () => {
    expect(newestState([RESYNC, '{"type":"user"}'].join('\n'), STARTED_AT).satisfied).toBe(false);
  });

  it('is not fooled by the field name appearing inside other text', () => {
    const quoted: string = JSON.stringify({ type: 'user', timestamp: '2026-10-26T15:00:00Z', message: { content: 'see "failedMcpServers": [] in the log' } });
    expect(newestState(quoted, STARTED_AT).satisfied).toBe(false);
  });
});

describe('applyChatMcpState', () => {
  const entry = (name: string, status: McpServerEntry['status']): McpServerEntry => ({ name, target: 'x', status, group: 'user' });

  it('marks a server the check reaches but the chat lost as dropped', () => {
    const state = newestState(FAILED, STARTED_AT).value;
    expect(applyChatMcpState([entry('browsermcp', 'connected'), entry('devhub', 'connected')], state).map((e) => e.status)).toEqual(['dropped', 'connected']);
  });

  it('keeps a more specific reason the check already found', () => {
    const state = newestState(FAILED, STARTED_AT).value;
    expect(applyChatMcpState([entry('browsermcp', 'needs-auth')], state)[0]?.status).toBe('needs-auth');
  });
});
