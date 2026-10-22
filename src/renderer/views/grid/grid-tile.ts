import type { ActionResult, AttachmentUpload, ChatDevices, ChatSnapshot, TranscriptItem } from '../../../shared/types';
import type { CardDeviceKind } from '../../board/card-devices';
import { element } from '../../dom';
import type { Lightbox } from '../../lightbox';
import { chatColor, textOnChatColor } from '../../palette';
import { isAtThreadEnd } from '../../sheet/thread-end';
import { TILE_PAGE_ITEMS } from '../../sheet/paging/page-sizes';
import { ThreadFeed } from '../../sheet/paging/thread-feed';
import { pendingAttachmentOf } from '../../sheet/pending-attachments';
import { TranscriptList } from '../../sheet/transcript-list';
import type { DictationPlace } from '../../sheet/voice/dictation-place';
import type { VoiceHub } from '../../sheet/voice/voice-hub';
import { TileComposer } from './tile-composer';
import { TileHeader } from './tile-header';

// Not "session": the board's click and context-menu handlers on the view act on any [data-session].
export const TILE_SESSION_ATTRIBUTE: string = 'gridSession';


export interface GridTileHandlers {
  readonly remove: (sessionId: string) => void;
  readonly openDevice: (kind: CardDeviceKind, sessionId: string) => void;
}

// One chat in the grid: its header, a live copy of its thread, and an optional field to write to it.
// Built once and kept, so its scroll, opened rows and draft survive every poll.
export class GridTile {
  readonly root: HTMLElement = element('article', 'grid-tile');
  readonly header: TileHeader;
  private readonly thread: HTMLElement = element('div', 'tile-messages');
  private readonly transcript: TranscriptList;
  private readonly feed: ThreadFeed;
  private readonly composer: TileComposer;
  private isFetching: boolean = false;

  constructor(private chat: ChatSnapshot, lightbox: Lightbox, voice: VoiceHub, handlers: GridTileHandlers) {
    this.root.dataset[TILE_SESSION_ATTRIBUTE] = chat.sessionId;
    this.transcript = new TranscriptList(this.thread, lightbox, window.radar);
    this.feed = new ThreadFeed(this.thread, this.transcript, TILE_PAGE_ITEMS);
    this.composer = new TileComposer(
      (text: string, attachments: readonly AttachmentUpload[]): Promise<ActionResult> => this.send(text, attachments),
      voice,
      lightbox,
    );
    this.header = new TileHeader({
      remove: (): void => handlers.remove(this.chat.sessionId),
      openDevice: (kind: CardDeviceKind): void => handlers.openDevice(kind, this.chat.sessionId),
    });
    this.root.append(this.header.root, this.thread, this.composer.root);
  }

  get sessionId(): string {
    return this.chat.sessionId;
  }

  update(chat: ChatSnapshot, now: number, devices: ChatDevices): void {
    this.chat = chat;
    this.root.style.setProperty('--chat', chatColor(chat.color));
    this.root.style.setProperty('--on-chat', textOnChatColor(chat.color));
    this.header.update(chat, now, devices);
  }

  // Polls overlap with clicks that also re-render, so a fetch already on its way is not repeated.
  async refresh(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      const sessionId: string = this.chat.sessionId;
      await this.feed.refresh(sessionId, sessionId, (limit: number): Promise<TranscriptItem[]> => window.radar.getTranscript(sessionId, limit));
      await this.transcript.syncPicker(this.chat.status === 'waiting');
      this.composer.setReady(true);
    } catch (error: unknown) {
      console.error(`Could not load the transcript of ${this.chat.name}:`, error);
    } finally {
      this.isFetching = false;
    }
  }

  isAtEnd(): boolean {
    return isAtThreadEnd(this.thread);
  }

  // A tile taken out of the page and put back starts scrolled to the top; the latest messages are what it is for.
  followEnd(): void {
    this.thread.scrollTop = this.thread.scrollHeight;
  }

  setComposerAlwaysOpen(isAlwaysOpen: boolean): void {
    this.composer.setAlwaysOpen(isAlwaysOpen);
  }

  get hasComposerFocus(): boolean {
    return this.composer.hasFocus;
  }

  focusComposer(): void {
    this.composer.focus();
  }

  // The composer as the Panel's hands-free target; a folded one opens for the words.
  becomeDictationTarget(): DictationPlace {
    this.composer.becomeTarget();
    return this.composer.dictationPlace(this.chat.sessionId);
  }

  // Taken out of the grid for good.
  dispose(): void {
    this.composer.dispose();
  }

  // Optimistic like the panel: the message shows at once, then as delivered, or leaves again if sending failed.
  private async send(text: string, attachments: readonly AttachmentUpload[]): Promise<ActionResult> {
    const pendingId: string = this.transcript.addPending(text.trim(), attachments.map(pendingAttachmentOf));
    const result: ActionResult = await this.deliver(text, attachments);
    if (result.ok) this.transcript.markPendingDelivered(pendingId);
    else this.transcript.removePending(pendingId);
    return result;
  }

  private async deliver(text: string, attachments: readonly AttachmentUpload[]): Promise<ActionResult> {
    try {
      return await window.radar.sendMessage(this.chat.pid, text, attachments);
    } catch (error: unknown) {
      return { ok: false, method: null, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
