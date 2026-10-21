import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VOICE_SEND_GRACE_MS, VoiceSendTimer } from '../src/renderer/sheet/voice/voice-send-timer';

interface FakeField {
  readonly input: HTMLTextAreaElement;
  readonly sent: string[];
}

function fakeField(value: string): FakeField {
  const sent: string[] = [];
  const input = {
    value,
    setSelectionRange: (): void => undefined,
    dispatchEvent: (): boolean => true,
    form: { requestSubmit: (): void => void sent.push(input.value) },
  };
  return { input: input as unknown as HTMLTextAreaElement, sent };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('VoiceSendTimer', () => {
  it('sends the words on screen once "enviar" is the last thing said for the grace time', () => {
    const field: FakeField = fakeField('corrige o bug, enviar');
    new VoiceSendTimer().wordsChanged(field.input);
    vi.advanceTimersByTime(VOICE_SEND_GRACE_MS - 1);
    expect(field.sent).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(field.sent).toEqual(['corrige o bug']);
  });

  it('holds off while more words come after the command', () => {
    const field: FakeField = fakeField('enviar');
    const timer: VoiceSendTimer = new VoiceSendTimer();
    timer.wordsChanged(field.input);
    vi.advanceTimersByTime(VOICE_SEND_GRACE_MS / 2);
    (field.input as { value: string }).value = 'enviar o arquivo';
    timer.wordsChanged(field.input);
    vi.advanceTimersByTime(VOICE_SEND_GRACE_MS * 2);
    expect(field.sent).toEqual([]);
  });

  it('does nothing once cancelled', () => {
    const field: FakeField = fakeField('pronto, enviar');
    const timer: VoiceSendTimer = new VoiceSendTimer();
    timer.wordsChanged(field.input);
    timer.cancel();
    vi.advanceTimersByTime(VOICE_SEND_GRACE_MS * 2);
    expect(field.sent).toEqual([]);
  });
});
