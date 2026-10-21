import { isWebHost } from '../host';

// What the voice service takes: 16 kHz mono.
export const VOICE_SAMPLE_RATE: number = 16000;

export interface CaptureContext {
  readonly context: AudioContext;
  // Called when the recorder stops: the desktop closes its context, the web keeps its one shared context.
  release(): Promise<void>;
}

let shared: AudioContext | null = null;

// The desktop asks Chromium for a 16 kHz context, which resamples the microphone itself. A phone browser runs at the
// device's rate instead (iOS Safari does not reliably honour 16 kHz for microphone input) and the recorder resamples.
export function openCaptureContext(): CaptureContext {
  if (!isWebHost()) {
    const context: AudioContext = new AudioContext({ sampleRate: VOICE_SAMPLE_RATE });
    return { context, release: (): Promise<void> => context.close() };
  }
  return { context: runningSharedContext(), release: (): Promise<void> => Promise.resolve() };
}

// Call inside the tap that turns the mic on: iOS lets audio run only for a context created or resumed during a user
// gesture, and the recorder itself starts a few promises later, outside it. The desktop needs no such thing.
export function primeCaptureAudio(): void {
  if (isWebHost()) runningSharedContext();
}

// A page going to the background stops its audio; the next tap on the mic resumes it.
export function suspendCaptureAudio(): void {
  if (shared?.state === 'running') void shared.suspend();
}

function runningSharedContext(): AudioContext {
  shared ??= new AudioContext();
  if (shared.state !== 'running') void shared.resume();
  return shared;
}
