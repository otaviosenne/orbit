import type { TranscriptItem } from '../../shared/types';
import { DISCLOSURE_KEY_ATTRIBUTE } from './transcript/disclosure';
import type { TranscriptEntry } from './transcript/group-tools';
import { groupTools } from './transcript/group-tools';
import type { PendingMessage, Reconciliation } from './pending-messages';
import { PendingMessages } from './pending-messages';
import type { QuestionPickerApi } from './questions/live-picker';
import { LivePicker } from './questions/live-picker';
import { renderPendingQuestion } from './questions/pending-question-card';
import { renderQuestionSummary } from './questions/question-summary';
import type { Lightbox } from '../lightbox';
import { ThreadImages } from './thread-images';
import { renderMessage, renderPendingMessage } from './transcript/message-bubble';
import { renderNotice, renderTurn } from './transcript/notice-row';
import { renderPeer } from './transcript/peer-card';
import { renderToolGroup } from './transcript/tool-group';
import { ElementCache } from './transcript/element-cache';
import { entryVersion } from './transcript/entry-version';
import type { ScrollAnchor } from './scroll-anchor';
import { captureScrollAnchor, restoreScrollAnchor } from './scroll-anchor';
import { syncChildren } from '../views/grid/keyed-children';

// Within this distance of the bottom the reader is "following" and new items keep the view pinned.
const FOLLOW_THRESHOLD_PX: number = 48;

// Renders a chat's transcript and remembers which collapsed rows the user opened, across refreshes.
export class TranscriptList {
  private renderedKey: string = '';
  private sessionId: string | null = null;
  // The chat itself or one of its agents; switching threads starts the view fresh.
  private thread: string | null = null;
  private readonly openKeys: Set<string> = new Set();
  private readonly pending: PendingMessages = new PendingMessages();
  private items: readonly TranscriptItem[] = [];
  private readonly images: ThreadImages;
  // Without a picker API (an agent's own view), a question waiting in the terminal is not shown.
  private readonly picker: LivePicker | null;
  private readonly entries: ElementCache<TranscriptEntry> = new ElementCache(
    {
      id: (entry: TranscriptEntry): string => entry.id,
      version: (entry: TranscriptEntry): string => entryVersion(entry, this.picker?.needsStandIn === true),
    },
    (entry: TranscriptEntry): HTMLElement => this.renderEntry(entry),
  );

  constructor(private readonly root: HTMLElement, lightbox: Lightbox, pickerApi: QuestionPickerApi | null = null) {
    this.picker = pickerApi === null ? null : new LivePicker(pickerApi, (): void => this.render(false, true));
    // 'toggle' does not bubble, so listen in the capture phase.
    root.addEventListener('toggle', (event: Event): void => this.rememberToggle(event.target), true);
    this.images = new ThreadImages(root, lightbox, (): string | null => this.sessionId);
  }

  show(sessionId: string, items: readonly TranscriptItem[], thread: string = sessionId): void {
    const isNewThread: boolean = thread !== this.thread;
    this.thread = thread;
    if (isNewThread) this.entries.clear();
    if (sessionId !== this.sessionId) {
      this.openKeys.clear();
      this.images.release(this.pending.clear());
      this.images.clear();
      this.picker?.clear();
    }
    this.sessionId = sessionId;
    this.items = items;
    this.render(isNewThread);
  }

  // Shows a just-sent message at once; returns its id so a failed delivery can take it back.
  // The list owns imageUrls from here on and lets go of them once the message is dropped or confirmed.
  addPending(text: string, imageUrls: readonly string[]): string {
    const id: string = this.pending.add(text, imageUrls, Date.now()).id;
    this.render(false, true);
    return id;
  }

  markPendingDelivered(id: string): void {
    this.pending.markDelivered(id);
    this.render(false);
  }

  removePending(id: string): void {
    const removed: PendingMessage | undefined = this.pending.remove(id);
    this.render(false);
    if (removed !== undefined) this.images.release([removed]);
  }

  private render(isNewChat: boolean, scrollToEnd: boolean = false): void {
    // Messages sent from the panel belong to the chat's own thread, not to its agents'.
    const waiting: PendingMessage[] = this.thread === this.sessionId ? this.reconcilePending() : [];
    const key: string = `${this.thread}|${this.items.map(itemVersion).join(',')}|${waiting.map(pendingVersion).join(',')}|${this.picker?.key ?? ''}|${this.picker?.needsStandIn === true}`;
    if (key === this.renderedKey) return;
    const keepsEnd: boolean = isNewChat || scrollToEnd || this.isFollowing();
    const anchor: ScrollAnchor | null = keepsEnd ? null : captureScrollAnchor(this.root);
    this.renderedKey = key;
    // Unchanged entries keep their element (and its markdown, thumbnails and open rows); only the rest is built.
    syncChildren(this.root, [
      ...this.entries.build(groupTools(this.items)),
      ...waiting.map((message: PendingMessage) => renderPendingMessage(message)),
      ...(this.thread === this.sessionId ? (this.picker?.render(this.items.some(isPendingQuestion)) ?? []) : []),
    ]);
    if (anchor === null) this.root.scrollTop = this.root.scrollHeight;
    else restoreScrollAnchor(this.root, anchor);
    this.images.loadMissing();
  }

  private reconcilePending(): PendingMessage[] {
    const reconciliation: Reconciliation = this.pending.reconcile(this.items);
    this.images.adopt(reconciliation.confirmed);
    return reconciliation.waiting;
  }

  clear(): void {
    this.root.replaceChildren();
    this.entries.clear();
    this.renderedKey = '';
    this.sessionId = null;
    this.thread = null;
    this.items = [];
    this.openKeys.clear();
    this.images.release(this.pending.clear());
    this.images.clear();
    this.picker?.clear();
  }

  private renderEntry(entry: TranscriptEntry): HTMLElement {
    const isOpen = (key: string): boolean => this.openKeys.has(key);
    switch (entry.kind) {
      case 'message':
        return renderMessage(entry, this.images.lookup);
      case 'tools':
        return renderToolGroup(entry, isOpen);
      case 'peer':
        return renderPeer(entry, isOpen);
      case 'notice':
        return renderNotice(entry, isOpen);
      case 'turn':
        return renderTurn(entry);
      case 'question':
        // The live card answers it; without one, the transcript's copy shows every question and option.
        if (entry.state === 'pending' && this.picker?.needsStandIn === true) return renderPendingQuestion(entry);
        return renderQuestionSummary(entry, isOpen);
    }
  }

  // Claude Code writes a question into the transcript only once answered, so a waiting one is read off the terminal.
  // Only the chat's own thread shows it; an agent's view never does.
  async syncPicker(isWaiting: boolean): Promise<void> {
    if (this.picker === null || this.sessionId === null) return;
    await this.picker.sync(this.sessionId, isWaiting && this.thread === this.sessionId);
  }

  private rememberToggle(target: EventTarget | null): void {
    if (!(target instanceof HTMLDetailsElement)) return;
    const key: string | undefined = target.dataset[DISCLOSURE_KEY_ATTRIBUTE];
    if (key === undefined) return;
    if (target.open) this.openKeys.add(key);
    else this.openKeys.delete(key);
  }

  private isFollowing(): boolean {
    return this.root.scrollHeight - this.root.scrollTop - this.root.clientHeight < FOLLOW_THRESHOLD_PX;
  }
}

function isPendingQuestion(item: TranscriptItem): boolean {
  return item.kind === 'question' && item.state === 'pending';
}

// A tool's result arriving, or a question being answered, changes the list even though no item was added.
function itemVersion(item: TranscriptItem): string {
  if (item.kind === 'question') return `${item.id}:${item.state}`;
  return item.kind === 'tool' && item.output !== null ? `${item.id}+` : item.id;
}

// Delivery changes how a waiting message looks, so it is part of the render key.
function pendingVersion(message: PendingMessage): string {
  return message.delivered ? `${message.id}+` : message.id;
}
