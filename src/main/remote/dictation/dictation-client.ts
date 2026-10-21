import { decodeAudioFrame } from '../../../shared/dictation-audio-frame';
import type { AudioFrame } from '../../../shared/dictation-audio-frame';
import { parseDictationRequest } from '../../../shared/dictation-protocol';
import type { DictationReply, DictationRequest } from '../../../shared/dictation-protocol';
import type { DictationStart, TranscriptionResult } from '../../../shared/types';
import { CLOSE_GOING_AWAY, CLOSE_UNSUPPORTED_DATA } from './close-codes';
import type { DictationEngine } from './dictation-engine';
import type { DictationLimits } from './dictation-limits';
import { SessionWatch } from './session-watch';

// The socket as the client sees it: replies out, and a way to hang up.
export interface ReplyChannel {
  send(reply: DictationReply): void;
  close(code: number, reason: string): void;
}

// One browser's dictation: its requests drive its own engine, so the sessions it names can only ever be its own.
// Anything malformed hangs up rather than being guessed at; a socket left idle or a session left streaming ends.
export class DictationClient {
  private readonly watch: SessionWatch;
  private idleTimer: NodeJS.Timeout | undefined;
  private isClosed: boolean = false;

  constructor(
    private readonly engine: DictationEngine,
    private readonly channel: ReplyChannel,
    private readonly limits: Pick<DictationLimits, 'audioIdleMs' | 'maxSessionMs' | 'connectionIdleMs'>,
  ) {
    this.watch = new SessionWatch(limits, (session: number): void => this.engine.cancel(session));
    this.armIdle();
  }

  receiveText(raw: string): void {
    const request: DictationRequest | null = parseDictationRequest(raw);
    if (request === null) return this.hangUp(CLOSE_UNSUPPORTED_DATA, 'Malformed dictation message');
    this.armIdle();
    this.handle(request);
  }

  receiveAudio(bytes: Uint8Array): void {
    const frame: AudioFrame | null = decodeAudioFrame(bytes);
    if (frame === null) return this.hangUp(CLOSE_UNSUPPORTED_DATA, 'Malformed audio frame');
    this.armIdle();
    this.watch.heard(frame.session);
    this.engine.feed(frame.session, frame.pcm);
  }

  // The socket is gone: every voice connection this browser held is closed with it.
  closed(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    clearTimeout(this.idleTimer);
    this.watch.clear();
    this.engine.stop();
  }

  private handle(request: DictationRequest): void {
    switch (request.type) {
      case 'prepare':
        return this.engine.prepare();
      case 'start':
        return void this.start(request.id);
      case 'finish':
        return void this.finish(request.id, request.session);
      case 'cancel':
        this.watch.ended(request.session);
        return this.engine.cancel(request.session);
    }
  }

  private async start(id: number): Promise<void> {
    const start: DictationStart = await this.engine.begin((session: number, text: string): void => this.reply({ type: 'transcript', session, text }));
    // The browser left while the voice service was connecting; the stream that just opened must not outlive it.
    if (this.isClosed) return this.engine.stop();
    if (start.error === null) this.watch.started(start.session);
    this.reply({ type: 'started', id, start });
  }

  private async finish(id: number, session: number): Promise<void> {
    this.watch.ended(session);
    const result: TranscriptionResult = await this.engine.finish(session);
    this.reply({ type: 'finished', id, result });
  }

  private reply(reply: DictationReply): void {
    if (!this.isClosed) this.channel.send(reply);
  }

  private hangUp(code: number, reason: string): void {
    this.channel.close(code, reason);
    this.closed();
  }

  // Idle means no message and no session streaming; the browser opens a new socket the next time it dictates.
  private armIdle(): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout((): void => {
      if (this.watch.isLive) this.armIdle();
      else this.hangUp(CLOSE_GOING_AWAY, 'Idle');
    }, this.limits.connectionIdleMs);
  }
}
