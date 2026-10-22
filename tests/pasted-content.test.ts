import { describe, expect, it } from 'vitest';
import { withoutPastedWrappers } from '../src/core/pasted-content';
import { extractTranscript } from '../src/core/transcript-extractor';
import type { TranscriptRecord } from '../src/core/transcript-record';
import { PendingMessages } from '../src/renderer/sheet/pending-messages';

describe('withoutPastedWrappers', () => {
  it('drops the id-tagged wrapper Claude Code puts around a paste', () => {
    expect(withoutPastedWrappers('<pasted_content id="406b">\nStudy the login flow\n</pasted_content id="406b">')).toBe('Study the login flow');
  });

  it('drops the older wrapper without an id, keeping the text around it', () => {
    expect(withoutPastedWrappers('Look:\n<pasted_content>\nerror 42\n</pasted_content>\nwhy?')).toBe('Look:\nerror 42\nwhy?');
  });

  it('leaves ordinary text alone', () => {
    expect(withoutPastedWrappers('nothing pasted here')).toBe('nothing pasted here');
  });
});


const RECENT_ITEMS: number = 10;

describe('a pasted message sent from Orbit', () => {
  it('is confirmed by the transcript copy, so it shows once', () => {
    const sentAt: number = Date.parse('2026-10-22T14:28:00Z');
    const sent: string = 'Study how we can improve the login.\nWatch the video too.';
    const record: TranscriptRecord = {
      type: 'user',
      uuid: 'u1',
      timestamp: '2026-10-22T14:28:01Z',
      message: { role: 'user', content: `<pasted_content id="406b">\n${sent}\n</pasted_content id="406b">` },
    } as unknown as TranscriptRecord;
    const pending: PendingMessages = new PendingMessages();
    pending.add(sent, [], sentAt);
    const result = pending.reconcile(extractTranscript([record], RECENT_ITEMS, () => null));
    expect(result.waiting).toHaveLength(0);
    expect(result.confirmed).toHaveLength(1);
  });
});

describe('a message sent while the chat was working', () => {
  const queued = (prompt: string, at: string): TranscriptRecord =>
    ({ type: 'attachment', uuid: `a-${at}`, timestamp: at, attachment: { type: 'queued_command', prompt, commandMode: 'prompt', origin: { kind: 'human' }, delivery_id: `d-${at}` } }) as unknown as TranscriptRecord;

  it('is shown as a user message and confirms the pending copy at once', () => {
    const sent: string = 'Also check the signup flow.';
    const pending: PendingMessages = new PendingMessages();
    pending.add(sent, [], Date.parse('2026-10-22T19:15:04Z'));
    const result = pending.reconcile(extractTranscript([queued(sent, '2026-10-22T19:15:05Z')], RECENT_ITEMS, () => null));
    expect(result.waiting).toHaveLength(0);
    expect(result.confirmed).toHaveLength(1);
  });

  it('is not shown twice when the user record is written later', () => {
    const user = { type: 'user', uuid: 'u2', timestamp: '2026-10-22T19:16:00Z', message: { role: 'user', content: 'Also check the signup flow.' } } as unknown as TranscriptRecord;
    const items = extractTranscript([queued('Also check the signup flow.', '2026-10-22T19:15:05Z'), user], RECENT_ITEMS, () => null);
    expect(items.filter((item) => item.kind === 'message' && item.role === 'user')).toHaveLength(1);
  });

  it('ignores queued commands that are not human prompts', () => {
    const task = { type: 'attachment', uuid: 'a', timestamp: '2026-10-22T19:15:05Z', attachment: { type: 'queued_command', prompt: 'x', commandMode: 'task-notification' } } as unknown as TranscriptRecord;
    expect(extractTranscript([task], RECENT_ITEMS, () => null)).toHaveLength(0);
  });
});
