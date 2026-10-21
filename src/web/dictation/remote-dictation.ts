import { encodeAudioFrame } from '../../shared/dictation-audio-frame';
import { parseDictationReply } from '../../shared/dictation-protocol';
import type { DictationReply, DictationRequest } from '../../shared/dictation-protocol';
import type { DictationStart, DictationTranscript, TranscriptionResult } from '../../shared/types';
import { Outbox } from './outbox';
import type { Outgoing } from './outbox';
import { PendingReplies } from './pending-replies';

export type SocketFactory = (url: string) => WebSocket;
export type TranscriptListener = (transcript: DictationTranscript) => void;

const CONNECTION_LOST: string = 'The connection to Orbit was lost';
const LOST_START: DictationStart = { session: 0, error: CONNECTION_LOST };
const LOST_RESULT: TranscriptionResult = { ok: false, text: '', error: CONNECTION_LOST };

// Orbit Web's dictation: the steps the desktop window sends over IPC, on one WebSocket to Orbit, where the same voice
// engine runs. The socket opens on first use and again after it drops; whatever waited on a dropped one fails.
export class RemoteDictation {
  private socket: WebSocket | null = null;
  private readonly outbox: Outbox = new Outbox();
  private readonly listeners: TranscriptListener[] = [];
  private readonly starts: PendingReplies<DictationStart> = new PendingReplies();
  private readonly finishes: PendingReplies<TranscriptionResult> = new PendingReplies();

  constructor(private readonly url: () => string, private readonly openSocket: SocketFactory) {}

  prepare(): void {
    this.request({ type: 'prepare' });
  }

  start(): Promise<DictationStart> {
    const { id, reply } = this.starts.open();
    this.request({ type: 'start', id });
    return reply;
  }

  feed(session: number, pcm: Uint8Array): void {
    this.send(encodeAudioFrame(session, pcm));
  }

  finish(session: number): Promise<TranscriptionResult> {
    const { id, reply } = this.finishes.open();
    this.request({ type: 'finish', id, session });
    return reply;
  }

  cancel(session: number): void {
    this.request({ type: 'cancel', session });
  }

  // Several parts of the page listen (each composer's push-to-talk, hands-free), so every listener gets each one.
  onTranscript(listener: TranscriptListener): void {
    this.listeners.push(listener);
  }

  private request(request: DictationRequest): void {
    this.send(JSON.stringify(request));
  }

  private send(message: Outgoing): void {
    const socket: WebSocket | null = this.socket ?? this.connect();
    if (socket === null) return;
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
    else this.outbox.push(message);
  }

  // null when the browser refuses to even try (a blocked address throws at once); whatever waits then fails.
  private connect(): WebSocket | null {
    let socket: WebSocket;
    try {
      socket = this.openSocket(this.url());
    } catch {
      queueMicrotask((): void => this.failWaiting());
      return null;
    }
    socket.binaryType = 'arraybuffer';
    socket.addEventListener('open', (): void => this.outbox.drain().forEach((message: Outgoing): void => socket.send(message)));
    socket.addEventListener('message', (event: MessageEvent): void => {
      if (typeof event.data === 'string') this.receive(parseDictationReply(event.data));
    });
    socket.addEventListener('close', (): void => this.dropped(socket));
    this.socket = socket;
    return socket;
  }

  private receive(reply: DictationReply | null): void {
    if (reply?.type === 'started') this.starts.settle(reply.id, reply.start);
    else if (reply?.type === 'finished') this.finishes.settle(reply.id, reply.result);
    else if (reply?.type === 'transcript') this.listeners.forEach((listener: TranscriptListener): void => listener({ session: reply.session, text: reply.text }));
  }

  private dropped(socket: WebSocket): void {
    if (this.socket !== socket) return;
    this.socket = null;
    this.failWaiting();
  }

  private failWaiting(): void {
    this.outbox.drain();
    this.starts.settleAll(LOST_START);
    this.finishes.settleAll(LOST_RESULT);
  }
}
