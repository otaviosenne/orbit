import { framesPerChunk } from './capture-chunk';
import type { CaptureContext } from './capture-context';
import { openCaptureContext, VOICE_SAMPLE_RATE } from './capture-context';
import { PcmResampler } from './pcm-resampler';

const INT16_MAX: number = 0x7fff;
const MONO: number = 1;
const ANALYSER_FFT_SIZE: number = 512;
// Speech RMS rarely passes ~0.15; this gain maps normal talking to most of the 0..1 range.
const LEVEL_GAIN: number = 6;

export type PcmChunkListener = (pcm: Uint8Array) => void;
// The system took the microphone away (a phone call, Siri, the device unplugged).
export type CaptureInterrupted = () => void;

// Streams the microphone as 16 kHz 16-bit PCM chunks while recording.
export class PcmRecorder {
  private stream: MediaStream | null = null;
  private capture: CaptureContext | null = null;
  // Held on purpose: Chromium may garbage-collect an unreferenced source node and silently stop the audio.
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private samples: Float32Array<ArrayBuffer> = new Float32Array(ANALYSER_FFT_SIZE);

  constructor(private readonly onInterrupted: CaptureInterrupted = (): void => undefined) {}

  async start(onChunk: PcmChunkListener): Promise<void> {
    // The context first: on a phone it is unlocked by the tap that got here, and a permission prompt would end that.
    const capture: CaptureContext = openCaptureContext();
    this.capture = capture;
    try {
      this.stream = await openMicrophone();
    } catch (error: unknown) {
      this.capture = null;
      await capture.release();
      throw error;
    }
    this.stream.getAudioTracks().forEach((track: MediaStreamTrack): void => track.addEventListener('ended', (): void => this.onInterrupted()));
    const context: AudioContext = capture.context;
    const resampler: PcmResampler = new PcmResampler(context.sampleRate, VOICE_SAMPLE_RATE);
    this.source = context.createMediaStreamSource(this.stream);
    this.processor = context.createScriptProcessor(framesPerChunk(context.sampleRate), MONO, MONO);
    this.processor.addEventListener('audioprocess', (event: AudioProcessingEvent): void => {
      const samples: Float32Array = resampler.process(event.inputBuffer.getChannelData(0));
      if (samples.length > 0) onChunk(toInt16(samples));
    });
    this.source.connect(this.processor);
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = ANALYSER_FFT_SIZE;
    this.source.connect(this.analyser);
    // A script processor only runs while connected to an output; it writes silence there.
    this.processor.connect(context.destination);
  }

  // Loudness of the latest audio, 0 (silence) to 1 (loud speech), for the pulsing mic.
  level(): number {
    if (this.analyser === null) return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    const meanSquare: number = this.samples.reduce((sum: number, sample: number) => sum + sample * sample, 0) / this.samples.length;
    return Math.min(1, Math.sqrt(meanSquare) * LEVEL_GAIN);
  }

  async stop(): Promise<void> {
    this.source?.disconnect();
    this.processor?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    await this.capture?.release();
    this.source = null;
    this.processor = null;
    this.analyser = null;
    this.stream = null;
    this.capture = null;
  }
}

// Raw audio, like Claude Code: the browser's echo/noise/gain processing garbles the first words.
function openMicrophone(): Promise<MediaStream> {
  // Browsers expose the microphone to secure pages only; Orbit Web gets there through HTTPS or the local address.
  if (navigator.mediaDevices === undefined) return Promise.reject(new Error('the microphone needs an HTTPS address'));
  return navigator.mediaDevices.getUserMedia({
    audio: { channelCount: MONO, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
}

function toInt16(samples: Float32Array): Uint8Array {
  const pcm: Int16Array = new Int16Array(samples.length);
  for (let index: number = 0; index < samples.length; index++) {
    pcm[index] = Math.max(-1, Math.min(1, samples[index] ?? 0)) * INT16_MAX;
  }
  return new Uint8Array(pcm.buffer);
}
