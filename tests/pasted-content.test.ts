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
