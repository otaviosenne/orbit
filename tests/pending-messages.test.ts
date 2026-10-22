import { describe, expect, it } from 'vitest';
import { PendingMessages } from '../src/renderer/sheet/pending-messages';
import type { PendingAttachment, PendingMessage, Reconciliation } from '../src/renderer/sheet/pending-messages';
import type { TranscriptItem } from '../src/shared/types';

const images = (...urls: string[]): PendingAttachment[] => urls.map((url: string): PendingAttachment => ({ kind: 'image', name: 'shot.png', url }));
const userMessage = (text: string, timestamp: number): TranscriptItem => ({ kind: 'message', id: text, timestamp, role: 'user', text, images: [] });

describe('PendingMessages', () => {
  it('keeps a sent message until the transcript shows it, even with line breaks flattened', () => {
    const pending: PendingMessages = new PendingMessages();
    pending.add('olá\nmundo', [], 10_000);
    expect(pending.reconcile([userMessage('olá mundo', 1000)]).waiting).toHaveLength(1);
    expect(pending.reconcile([userMessage('olá mundo', 10_500)]).waiting).toHaveLength(0);
  });

  it('matches a message sent with images, whatever numbers Claude gave them', () => {
    const pending: PendingMessages = new PendingMessages();
    pending.add('olha isso', images('blob:a', 'blob:b'), 0);
    expect(pending.reconcile([userMessage('[Image #7] [Image #8] olha isso', 100)]).waiting).toHaveLength(0);
  });

  it('matches markers placed inside the text, though Claude Code numbers them across the chat', () => {
    const pending: PendingMessages = new PendingMessages();
    pending.add('see [Image #1] and this [Image #2]', images('blob:a', 'blob:b'), 0);
    expect(pending.reconcile([userMessage('see [Image #11] and this [Image #12]', 100)]).waiting).toHaveLength(0);
  });

  it('matches a message whose file markers became the saved paths', () => {
    const pending: PendingMessages = new PendingMessages();
    const pdf: PendingAttachment = { kind: 'pdf', name: 'report.pdf', url: 'blob:p' };
    pending.add('read [PDF #1] and look [Image #2]', [pdf, ...images('blob:a')], 0);
    const sent: string = 'read /home/u/.cache/orbit/attachments/report.pdf and look [Image #31]';
    expect(pending.reconcile([userMessage(sent, 100)]).waiting).toHaveLength(0);
  });

  it('reports which transcript message confirmed each sent one, so its images can be handed over', () => {
    const pending: PendingMessages = new PendingMessages();
    const sent: PendingMessage = pending.add('olha isso', images('blob:a'), 0);
    pending.add('still waiting', [], 0);
    const confirming: TranscriptItem = userMessage('[Image #1] olha isso', 100);
    const reconciliation: Reconciliation = pending.reconcile([confirming]);
    expect(reconciliation.confirmed).toEqual([{ message: sent, item: confirming }]);
    expect(reconciliation.waiting.map((message: PendingMessage) => message.text)).toEqual(['still waiting']);
    expect(pending.reconcile([confirming]).confirmed).toHaveLength(0);
  });

  it('drops a message whose delivery failed and returns it, so its images can be released', () => {
    const pending: PendingMessages = new PendingMessages();
    const sent: PendingMessage = pending.add('oi', images('blob:a'), 0);
    expect(pending.remove(sent.id)).toBe(sent);
    expect(pending.remove(sent.id)).toBeUndefined();
    expect(pending.reconcile([]).waiting).toHaveLength(0);
  });

  it('returns every message it clears', () => {
    const pending: PendingMessages = new PendingMessages();
    pending.add('a', [], 0);
    pending.add('b', [], 0);
    expect(pending.clear().map((message: PendingMessage) => message.text)).toEqual(['a', 'b']);
    expect(pending.clear()).toHaveLength(0);
  });

  it('marks a delivered message so it stops reading as sending, and still drops it once the transcript has it', () => {
    const pending: PendingMessages = new PendingMessages();
    const sent: PendingMessage = pending.add('queued while busy', [], 0);
    expect(pending.reconcile([]).waiting[0]?.delivered).toBe(false);
    pending.markDelivered(sent.id);
    expect(pending.reconcile([]).waiting[0]?.delivered).toBe(true);
    expect(pending.reconcile([userMessage('queued while busy', 60_000)]).waiting).toHaveLength(0);
  });
});
