import type { IncomingMessage } from 'node:http';
import WebSocket from 'ws';
import { TranscriptAccumulator } from './transcript-accumulator';

// The speech-to-text stream Claude Code's own voice mode uses, so dictation behaves the same here.
const VOICE_STREAM_URL: string = 'wss://api.anthropic.com/api/ws/speech_to_text/voice_stream';
// Same tuning as Claude Code: 16 kHz linear PCM, a pause of 300 ms closes an utterance.
const STREAM_PARAMS: Readonly<Record<string, string>> = {
  encoding: 'linear16',
  sample_rate: '16000',
  channels: '1',
  endpointing_ms: '300',
  utterance_end_ms: '1000',
  language: 'pt',
  use_conversation_engine: 'true',
};
const USER_AGENT: string = 'claude-radar/0.1.0';
// The service routes by client app; this companion speaks for the same Claude Code login, so it uses the CLI tag.
const CLIENT_APP: string = 'cli';
const KEEP_ALIVE: string = '{"type":"KeepAlive"}';
const CLOSE_STREAM: string = '{"type":"CloseStream"}';
// The service drops idle streams; Claude Code pings at this interval.
const KEEP_ALIVE_MS: number = 8000;
// If the closing endpoint never arrives, keep what was transcribed instead of hanging.
const FINALIZE_TIMEOUT_MS: number = 5000;

interface VoiceMessage {
  readonly type?: string;
  readonly data?: string;
  readonly description?: string;
  readonly error_code?: string;
  readonly message?: string;
}

export type TranscriptChanged = (text: string) => void;

// One dictation: audio goes up as it is recorded, the growing transcript comes back word by word.
export class VoiceStream {
  private readonly socket: WebSocket;
  private readonly queued: Buffer[] = [];
  private readonly transcript: TranscriptAccumulator = new TranscriptAccumulator();
  private readonly settledOrClosed: Promise<void>;
  private keepAlive: NodeJS.Timeout | undefined;
  private failure: string | null = null;
  private isClosing: boolean = false;
  private finishWaiter: (() => void) | null = null;
  private markSettled: () => void = (): void => undefined;
  private onTranscript: TranscriptChanged | null = null;

  // Opening does not need a listener yet: a stream can be connected ahead of time and claimed on use.
  constructor(token: string) {
    this.settledOrClosed = new Promise((resolve): void => {
      this.markSettled = resolve;
    });
    this.socket = new WebSocket(`${VOICE_STREAM_URL}?${new URLSearchParams(STREAM_PARAMS).toString()}`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT, 'x-app': CLIENT_APP },
    });
    this.socket.on('open', (): void => this.handleOpen());
    this.socket.on('message', (raw: WebSocket.RawData): void => this.handleMessage(raw.toString()));
    this.socket.on('unexpected-response', (_request: unknown, response: IncomingMessage): void => {
      this.failure = `Voice service refused the connection (HTTP ${response.statusCode ?? 0})`;
      response.resume();
    });
    this.socket.on('error', (error: Error): void => {
      this.failure ??= error.message;
    });
    this.socket.on('close', (): void => this.handleClose());
  }

  listen(listener: TranscriptChanged): void {
    this.onTranscript = listener;
  }

  // Still usable for a new dictation: connecting or open, and nothing has gone wrong.
  get isAlive(): boolean {
    const usable: boolean = this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING;
    return usable && this.failure === null && !this.isClosing;
  }

  send(pcm: Uint8Array): void {
    const chunk: Buffer = Buffer.from(pcm);
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(chunk);
    else if (this.socket.readyState === WebSocket.CONNECTING) this.queued.push(chunk);
  }

  // Asks the service to flush the last words, then returns the whole dictation.
  async finish(): Promise<string> {
    this.isClosing = true;
    const finished: Promise<void> = new Promise((resolve): void => {
      this.finishWaiter = resolve;
    });
    if (this.socket.readyState === WebSocket.CONNECTING) await this.settledOrClosed;
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(CLOSE_STREAM);
    else this.finishWaiter?.();
    await Promise.race([finished, delay(FINALIZE_TIMEOUT_MS)]);
    this.close();
    if (this.failure !== null && this.transcript.text.length === 0) throw new Error(this.failure);
    return this.transcript.text;
  }

  close(): void {
    clearInterval(this.keepAlive);
    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) this.socket.close();
  }

  private handleOpen(): void {
    this.socket.send(KEEP_ALIVE);
    for (const chunk of this.queued.splice(0)) this.socket.send(chunk);
    this.keepAlive = setInterval((): void => this.socket.send(KEEP_ALIVE), KEEP_ALIVE_MS);
    this.markSettled();
  }

  private handleMessage(raw: string): void {
    const message: VoiceMessage = parseMessage(raw);
    if (message.type === 'TranscriptText' || message.type === 'TranscriptInterim') {
      if (message.data === undefined || message.data.length === 0) return;
      this.transcript.update(message.data);
      this.onTranscript?.(this.transcript.text);
    } else if (message.type === 'TranscriptEndpoint') {
      this.transcript.endUtterance();
      if (this.isClosing) this.finishWaiter?.();
    } else if (message.type === 'TranscriptError' || message.type === 'error') {
      this.failure = message.description ?? message.error_code ?? message.message ?? 'Transcription error';
    }
  }

  private handleClose(): void {
    clearInterval(this.keepAlive);
    this.markSettled();
    this.finishWaiter?.();
  }
}

function parseMessage(raw: string): VoiceMessage {
  try {
    return JSON.parse(raw) as VoiceMessage;
  } catch {
    return {};
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout(resolve, ms);
  });
}
