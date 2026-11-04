import type { RadarApi } from '../../../shared/types';
import { element } from '../../dom';
import { renderMarkdown } from '../../markdown';

export type StreamingApi = Pick<RadarApi, 'getStreamingReply'>;

// Claude Code shows a reply growing as it is written, but writes it to the transcript only once the block is done; the
// terminal is read this often meanwhile, so the draft keeps up with it.
const POLL_MS: number = 700;
const DRAFT_LABEL: string = 'Writing…';
// The render key holds the draft's length and end, enough to tell every new chunk apart without the whole text.
const KEY_TAIL_LENGTH: number = 24;

// The reply a working chat is writing, shown dimmed at the end of its thread until the real message arrives; plain
// text read off the terminal, so formatting shows only once the message is written.
export class StreamingDraft {
  private text: string | null = null;
  private sessionId: string | null = null;
  private timer: number | undefined;

  // onChange: the draft grew, appeared or went away, so the thread must render again. isVisible: a thread hidden with its
  // view (the grid behind another view) skips the terminal read.
  constructor(private readonly api: StreamingApi, private readonly onChange: () => void, private readonly isVisible: () => boolean) {}

  get currentText(): string | null {
    return this.text;
  }

  key(): string {
    return this.text === null ? '' : `${this.text.length}:${this.text.slice(-KEY_TAIL_LENGTH)}`;
  }

  render(): HTMLElement[] {
    if (this.text === null) return [];
    const item: HTMLElement = element('div', 'message message-assistant is-streaming');
    const body: HTMLDivElement = element('div', 'message-text markdown');
    renderMarkdown(body, this.text);
    item.append(element('span', 'message-meta', DRAFT_LABEL), body);
    return [item];
  }

  // Polls only while the chat works; any other state, or another chat, drops the draft.
  sync(sessionId: string | null, isBusy: boolean): void {
    const follows: string | null = isBusy ? sessionId : null;
    if (follows === this.sessionId) return;
    this.stop();
    this.sessionId = follows;
    if (follows === null) return;
    this.timer = window.setInterval((): void => void this.poll(follows), POLL_MS);
    void this.poll(follows);
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.timer = undefined;
    this.sessionId = null;
    this.show(null);
  }

  private async poll(sessionId: string): Promise<void> {
    if (!this.isVisible()) return;
    const text: string | null = await this.api.getStreamingReply(sessionId).catch((): null => null);
    if (sessionId === this.sessionId) this.show(text);
  }

  private show(text: string | null): void {
    if (text === this.text) return;
    this.text = text;
    this.onChange();
  }
}
