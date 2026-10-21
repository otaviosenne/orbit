import { describe, expect, it } from 'vitest';
import { decodeAudioFrame } from '../../src/shared/dictation-audio-frame';
import type { DictationReply } from '../../src/shared/dictation-protocol';
import type { DictationStart, DictationTranscript, TranscriptionResult } from '../../src/shared/types';
import { RemoteDictation } from '../../src/web/dictation/remote-dictation';
import { dictationSocketUrl } from '../../src/web/dictation/socket-url';

const URL: string = 'wss://orbit.example/api/dictation';
const PCM: Uint8Array = new Uint8Array([1, 0, 2, 0]);

// Just enough of a browser WebSocket: the test opens, answers and drops it by hand.
class FakeSocket extends EventTarget {
  readyState: number = WebSocket.CONNECTING;
  binaryType: string = 'blob';
  readonly sent: (string | Uint8Array)[] = [];

  send(message: string | Uint8Array): void {
    this.sent.push(message);
  }

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  reply(reply: DictationReply): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(reply) }));
  }

  drop(): void {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent(new Event('close'));
  }

  requests(): unknown[] {
    return this.sent.filter((message): message is string => typeof message === 'string').map((message: string) => JSON.parse(message));
  }
}

function dictation(): { voice: RemoteDictation; sockets: FakeSocket[] } {
  const sockets: FakeSocket[] = [];
  const voice: RemoteDictation = new RemoteDictation(
    (): string => URL,
    (url: string): WebSocket => {
      expect(url).toBe(URL);
      const socket: FakeSocket = new FakeSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
  );
  return { voice, sockets };
}

describe('Orbit Web dictation over its socket', () => {
  it('opens on first use and sends what waited, in order, once open', () => {
    const { voice, sockets } = dictation();
    voice.prepare();
    void voice.start();
    voice.feed(3, PCM);
    expect(sockets).toHaveLength(1);
    const socket: FakeSocket = sockets[0] as FakeSocket;
    expect(socket.sent).toEqual([]);
    socket.open();
    expect(socket.requests()).toEqual([{ type: 'prepare' }, { type: 'start', id: 1 }]);
    expect(decodeAudioFrame(socket.sent[2] as Uint8Array)?.session).toBe(3);
  });

  it('matches answers to their requests even out of order', async () => {
    const { voice, sockets } = dictation();
    const started: Promise<DictationStart> = voice.start();
    const finished: Promise<TranscriptionResult> = voice.finish(1);
    const socket: FakeSocket = sockets[0] as FakeSocket;
    socket.open();
    socket.reply({ type: 'finished', id: 1, result: { ok: true, text: 'oi', error: null } });
    socket.reply({ type: 'started', id: 1, start: { session: 2, error: null } });
    expect(await started).toEqual({ session: 2, error: null });
    expect((await finished).text).toBe('oi');
  });

  it('gives live words to every listener', () => {
    const { voice, sockets } = dictation();
    const heard: string[] = [];
    voice.onTranscript((transcript: DictationTranscript): void => void heard.push(`a ${transcript.text}`));
    voice.onTranscript((transcript: DictationTranscript): void => void heard.push(`b ${transcript.text}`));
    voice.prepare();
    (sockets[0] as FakeSocket).reply({ type: 'transcript', session: 1, text: 'olá' });
    expect(heard).toEqual(['a olá', 'b olá']);
  });

  it('fails whatever waited on a dropped socket, then reconnects on the next use', async () => {
    const { voice, sockets } = dictation();
    const started: Promise<DictationStart> = voice.start();
    const finished: Promise<TranscriptionResult> = voice.finish(1);
    (sockets[0] as FakeSocket).drop();
    expect((await started).error).not.toBeNull();
    expect((await finished).ok).toBe(false);
    voice.prepare();
    expect(sockets).toHaveLength(2);
  });

  it('fails a start at once when the browser refuses to open the socket', async () => {
    const voice: RemoteDictation = new RemoteDictation(
      (): string => URL,
      (): WebSocket => {
        throw new Error('blocked');
      },
    );
    expect((await voice.start()).error).not.toBeNull();
  });

  it('points at the page’s own host, encrypted behind HTTPS', () => {
    expect(dictationSocketUrl({ protocol: 'https:', host: 'orbit.example' })).toBe('wss://orbit.example/api/dictation');
    expect(dictationSocketUrl({ protocol: 'http:', host: '127.0.0.1:4690' })).toBe('ws://127.0.0.1:4690/api/dictation');
  });
});
