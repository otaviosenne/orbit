import { describe, expect, it } from 'vitest';
import type { SessionMetaRecord, SessionSummary } from '../src/core/past-chats/session-summary';
import { isRealPrompt, summarizeSession } from '../src/core/past-chats/session-summary';

const CWD: string = '/home/me/code/project';

function userText(text: string, extra: Partial<SessionMetaRecord> = {}): SessionMetaRecord {
  return { type: 'user', cwd: CWD, entrypoint: 'cli', message: { role: 'user', content: text }, ...extra };
}

describe('summarizeSession', () => {
  it('prefers the last custom title over agent name, ai title and prompt', () => {
    const summary: SessionSummary = summarizeSession(
      [userText('fix the login bug'), { type: 'custom-title', customTitle: 'OLD' }, { type: 'agent-name', agentName: 'AGENT' }],
      [{ type: 'ai-title', aiTitle: 'Login bug fix' }, { type: 'custom-title', customTitle: 'LOGIN' }],
    );
    expect(summary).toEqual({ title: 'LOGIN', cwd: CWD, isChat: true });
  });

  it('falls back to the agent name, then the ai title', () => {
    expect(summarizeSession([userText('hi'), { type: 'agent-name', agentName: 'AGENT' }, { type: 'ai-title', aiTitle: 'AI' }], []).title).toBe('AGENT');
    expect(summarizeSession([userText('hi'), { type: 'ai-title', aiTitle: 'AI' }], []).title).toBe('AI');
  });

  it('uses the first real prompt, skipping harness text and slash commands', () => {
    const summary: SessionSummary = summarizeSession(
      [
        userText('<local-command-caveat>Caveat: ignore</local-command-caveat>', { isMeta: true }),
        userText('<command-name>/color</command-name><command-args>red</command-args>'),
        userText('<system-reminder>context</system-reminder>'),
        { type: 'user', cwd: CWD, message: { content: [{ type: 'tool_result', tool_use_id: 't', content: 'out' }] } },
        userText('Add a resume button\nwith filters'),
        userText('second prompt'),
      ],
      [],
    );
    expect(summary.title).toBe('Add a resume button');
  });

  it('clips a long prompt title', () => {
    const title: string | null = summarizeSession([userText('x'.repeat(300))], []).title;
    expect(title?.length).toBeLessThan(110);
    expect(title?.endsWith('…')).toBe(true);
  });

  it('takes a task sent by another chat as the prompt', () => {
    const peer: SessionMetaRecord = userText('Another Claude session sent a message', { isMeta: true, origin: { kind: 'peer', body: 'Audit the alerts' } });
    expect(summarizeSession([peer], []).title).toBe('Audit the alerts');
  });

  it('marks a session with no prompt and no title as empty', () => {
    const summary: SessionSummary = summarizeSession([userText('<command-name>/resume</command-name>'), { type: 'system', cwd: CWD } as SessionMetaRecord], []);
    expect(summary).toEqual({ title: null, cwd: CWD, isChat: false });
  });

  it('finds the prompt in the tail when the head could not hold it', () => {
    expect(summarizeSession([{ type: 'system', cwd: CWD } as SessionMetaRecord], [userText('later prompt')]).title).toBe('later prompt');
  });

  it('keeps the folder the chat started in, not where it moved to', () => {
    expect(summarizeSession([userText('a'), userText('b', { cwd: `${CWD}/sub` })], []).cwd).toBe(CWD);
  });

  it('leaves out scripted claude -p runs', () => {
    expect(summarizeSession([userText('Reply with OK.', { entrypoint: 'sdk-cli' })], []).isChat).toBe(false);
  });
});

describe('isRealPrompt', () => {
  it('rejects sidechain and compaction records', () => {
    expect(isRealPrompt(userText('agent work', { isSidechain: true }))).toBe(false);
    expect(isRealPrompt(userText('summary', { isCompactSummary: true }))).toBe(false);
    expect(isRealPrompt(userText('This session is being continued from a previous conversation that ran out'))).toBe(false);
    expect(isRealPrompt(userText('a real question'))).toBe(true);
  });
});
