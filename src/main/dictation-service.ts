import { readAccessToken } from '../core/claude-login';
import type { DictationStart, TranscriptionResult } from '../shared/types';
import { VoiceStream } from './voice-stream';

export type SessionTranscriptListener = (session: number, text: string) => void;

// A connection kept ready this long without being used is closed rather than idling on the service.
const WARM_IDLE_MS: number = 60_000;

// One dictation at a time; audio and results from an older session are ignored.
export class DictationService {
  private session: number = 0;
  private stream: VoiceStream | null = null;
  private warm: Promise<VoiceStream | null> | null = null;
  private warmTimer: NodeJS.Timeout | undefined;

  // Connecting takes most of a second; doing it when the composer is focused makes holding Space feel instant.
  prepare(): void {
    this.scheduleWarmExpiry();
    if (this.warm !== null) return;
    this.warm = readAccessToken().then(
      (token: string): VoiceStream => new VoiceStream(token),
      (): null => null,
    );
  }

  async begin(onTranscript: SessionTranscriptListener): Promise<DictationStart> {
    const session: number = ++this.session;
    this.stream?.close();
    this.stream = null;
    try {
      const stream: VoiceStream = (await this.claimWarm()) ?? new VoiceStream(await readAccessToken());
      stream.listen((text: string): void => onTranscript(session, text));
      this.stream = stream;
      return { session, error: null };
    } catch (error: unknown) {
      return { session, error: errorMessage(error) };
    }
  }

  feed(session: number, pcm: Uint8Array): void {
    if (session === this.session) this.stream?.send(pcm);
  }

  async finish(session: number): Promise<TranscriptionResult> {
    const stream: VoiceStream | null = session === this.session ? this.stream : null;
    this.stream = null;
    if (stream === null) return { ok: false, text: '', error: 'Voice dictation is not running' };
    try {
      return { ok: true, text: await stream.finish(), error: null };
    } catch (error: unknown) {
      return { ok: false, text: '', error: errorMessage(error) };
    }
  }

  // Drops a dictation without a final result, e.g. when the message was sent while still listening.
  cancel(session: number): void {
    if (session !== this.session) return;
    this.stream?.close();
    this.stream = null;
  }

  stop(): void {
    this.stream?.close();
    this.stream = null;
    void this.claimWarm().then((warm: VoiceStream | null): void => warm?.close());
  }

  private async claimWarm(): Promise<VoiceStream | null> {
    const warm: VoiceStream | null = this.warm === null ? null : await this.warm;
    this.warm = null;
    clearTimeout(this.warmTimer);
    if (warm?.isAlive === true) return warm;
    warm?.close();
    return null;
  }

  private scheduleWarmExpiry(): void {
    clearTimeout(this.warmTimer);
    this.warmTimer = setTimeout((): void => {
      void this.claimWarm().then((warm: VoiceStream | null): void => warm?.close());
    }, WARM_IDLE_MS);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
