import { describe, expect, it } from 'vitest';
import type { SessionFile } from '../src/core/past-chats/session-files';
import { PAST_CHAT_LIMIT, PAST_CHAT_MAX_AGE_DAYS, selectCandidates } from '../src/core/past-chats/candidates';
import { buildResumeCommand } from '../src/main/resume-command';
import { shellQuote } from '../src/main/shell-quote';
import { isSessionId } from '../src/shared/session-id';

const SESSION_ID: string = '0741133d-b615-4084-bdd8-b2cde51f37c6';
const DAY_MS: number = 24 * 60 * 60 * 1000;
const NOW: number = Date.UTC(2026, 9, 20);

describe('isSessionId', () => {
  it('accepts only lowercase uuids', () => {
    expect(isSessionId(SESSION_ID)).toBe(true);
    expect(isSessionId(SESSION_ID.toUpperCase())).toBe(false);
    expect(isSessionId(`${SESSION_ID}; rm -rf ~`)).toBe(false);
    expect(isSessionId('../../etc/passwd')).toBe(false);
    expect(isSessionId(42)).toBe(false);
  });
});

describe('buildResumeCommand', () => {
  it('opens kitty in the chat folder and resumes the session', () => {
    expect(buildResumeCommand('/home/me/code/project', SESSION_ID)).toBe(`kitty --directory '/home/me/code/project' claude --resume '${SESSION_ID}'`);
  });

  it('keeps folders with spaces, quotes and shell characters as one literal word', () => {
    expect(buildResumeCommand("/tmp/it's a $(dir)", SESSION_ID)).toBe(`kitty --directory '/tmp/it'\\''s a $(dir)' claude --resume '${SESSION_ID}'`);
  });
});

describe('shellQuote', () => {
  it('wraps a value in single quotes and escapes embedded ones', () => {
    expect(shellQuote('plain')).toBe("'plain'");
    expect(shellQuote("a'b")).toBe("'a'\\''b'");
  });
});

describe('selectCandidates', () => {
  function file(sessionId: string, ageDays: number): SessionFile {
    return { sessionId, path: `/p/${sessionId}.jsonl`, projectDir: '/p', modifiedAt: NOW - ageDays * DAY_MS, sizeBytes: 1 };
  }

  it('drops live and too-old sessions and sorts newest first', () => {
    const files: SessionFile[] = [file('old', PAST_CHAT_MAX_AGE_DAYS + 1), file('b', 2), file('live', 0), file('a', 1)];
    expect(selectCandidates(files, new Set(['live']), NOW).map((candidate: SessionFile) => candidate.sessionId)).toEqual(['a', 'b']);
  });

  it('caps the list', () => {
    const files: SessionFile[] = Array.from({ length: PAST_CHAT_LIMIT + 5 }, (_unused: unknown, index: number) => file(`s${index}`, 0));
    expect(selectCandidates(files, new Set(), NOW)).toHaveLength(PAST_CHAT_LIMIT);
  });
});
