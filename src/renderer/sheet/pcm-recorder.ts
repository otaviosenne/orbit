// Vosk and Whisper both want 16 kHz mono; asking the AudioContext for it makes the browser resample the mic.
const SAMPLE_RATE: number = 16000;
// 1024 frames at 16 kHz is 64 ms: the first word leaves sooner, and 16 small messages a second is cheap.
const FRAMES_PER_CHUNK: number = 1024;
const INT16_MAX: number = 0x7fff;
const MONO: number = 1;
const ANALYSER_FFT_SIZE: number = 512;
// Speech RMS rarely passes ~0.15; this gain maps normal talking to most of the 0..1 range.
const LEVEL_GAIN: number = 6;

export type PcmChunkListener = (pcm: Uint8Array) => void;

// Streams the microphone as 16-bit PCM chunks while recording.
export class PcmRecorder {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  // Held on purpose: Chromium may garbage-collect an unreferenced source node and silently stop the audio.
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private samples: Float32Array<ArrayBuffer> = new Float32Array(ANALYSER_FFT_SIZE);

  async start(onChunk: PcmChunkListener): Promise<void> {
    // Raw audio, like Claude Code: the browser's echo/noise/gain processing garbles the first words.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: MONO, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.context = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(FRAMES_PER_CHUNK, MONO, MONO);
    this.processor.addEventListener('audioprocess', (event: AudioProcessingEvent): void => {
      onChunk(toInt16(event.inputBuffer.getChannelData(0)));
    });
    this.source.connect(this.processor);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = ANALYSER_FFT_SIZE;
    this.source.connect(this.analyser);
    // A script processor only runs while connected to an output; it writes silence there.
    this.processor.connect(this.context.destination);
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
    this.stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    await this.context?.close();
    this.source = null;
    this.processor = null;
    this.analyser = null;
    this.stream = null;
    this.context = null;
  }
}

function toInt16(samples: Float32Array): Uint8Array {
  const pcm: Int16Array = new Int16Array(samples.length);
  for (let index: number = 0; index < samples.length; index++) {
    pcm[index] = Math.max(-1, Math.min(1, samples[index] ?? 0)) * INT16_MAX;
  }
  return new Uint8Array(pcm.buffer);
}
