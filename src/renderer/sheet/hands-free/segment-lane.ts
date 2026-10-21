import type { DictationStart, DictationTranscript, TranscriptionResult } from '../../../shared/types';

// The slice of the preload bridge a lane needs; tests pass a fake.
export interface VoiceSessions {
  prepareDictation(): void;
  startDictation(): Promise<DictationStart>;
  feedDictation(session: number, pcm: Uint8Array): void;
  finishDictation(session: number): Promise<TranscriptionResult>;
  onDictationTranscript(listener: (transcript: DictationTranscript) => void): void;
}

// One voice session's share of the hands-free audio. Audio that arrives before its session exists waits in early.
export interface LaneSegment {
  readonly id: number;
  session: number | null;
  readonly early: Uint8Array[];
}

export interface LaneEvents {
  readonly onText: (segment: LaneSegment, text: string) => void;
  readonly onFinal: (segment: LaneSegment, result: TranscriptionResult) => void;
  readonly onFailure: (message: string) => void;
}

// Hands-free audio as a chain of voice sessions with no gap between them: from the moment a segment is cut,
// new audio waits for the next session, and the cut one is finalized on its own. The service keeps one current
// session and drops it when another begins, so each step asks the old session to finish before the new one starts.
export class SegmentLane {
  private steps: Promise<void> = Promise.resolve();
  private current: LaneSegment | null = null;
  private readonly bySession: Map<number, LaneSegment> = new Map();
  private lastId: number = 0;

  constructor(private readonly sessions: VoiceSessions, private readonly events: LaneEvents) {
    // Live words keep coming for a segment that is being finalized; they still belong to it.
    sessions.onDictationTranscript((transcript: DictationTranscript): void => {
      const segment: LaneSegment | undefined = this.bySession.get(transcript.session);
      if (segment !== undefined) events.onText(segment, transcript.text);
    });
  }

  get active(): LaneSegment | null {
    return this.current;
  }

  // Audio from now on goes to a new segment; the one before it is finalized once its own session exists.
  next(): LaneSegment {
    const previous: LaneSegment | null = this.current;
    const segment: LaneSegment = { id: ++this.lastId, session: null, early: [] };
    this.current = segment;
    this.enqueue(async (): Promise<void> => {
      void this.finish(previous);
      await this.begin(segment);
    });
    return segment;
  }

  // No more audio: the last segment is finalized. Resolves once its final text was delivered.
  end(): Promise<void> {
    const previous: LaneSegment | null = this.current;
    this.current = null;
    let finished: Promise<void> = Promise.resolve();
    this.enqueue(async (): Promise<void> => {
      finished = this.finish(previous);
    });
    return this.steps.then((): Promise<void> => finished);
  }

  feed(pcm: Uint8Array): void {
    const segment: LaneSegment | null = this.current;
    if (segment === null) return;
    if (segment.session === null) segment.early.push(pcm);
    else this.sessions.feedDictation(segment.session, pcm);
  }

  private enqueue(step: () => Promise<void>): void {
    this.steps = this.steps.then(step).catch((error: unknown): void => this.events.onFailure(String(error)));
  }

  private async begin(segment: LaneSegment): Promise<void> {
    const start: DictationStart = await this.sessions.startDictation();
    if (start.error !== null) return this.events.onFailure(start.error);
    segment.session = start.session;
    this.bySession.set(start.session, segment);
    for (const pcm of segment.early.splice(0)) this.sessions.feedDictation(start.session, pcm);
    // The next cut then claims a connection that is already open instead of waiting for one.
    this.sessions.prepareDictation();
  }

  private async finish(segment: LaneSegment | null): Promise<void> {
    if (segment === null || segment.session === null) return;
    const session: number = segment.session;
    const result: TranscriptionResult = await this.sessions.finishDictation(session);
    this.bySession.delete(session);
    this.events.onFinal(segment, result);
  }
}
