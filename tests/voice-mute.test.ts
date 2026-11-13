import { describe, expect, it, vi } from 'vitest';
import { parseVoiceCommand } from '../src/renderer/sheet/voice/commands/command-parser';
import { MUTE_PAUSE_MS } from '../src/renderer/sheet/voice/commands/phrase-table';
import type { ParseOptions, VoiceCommand } from '../src/renderer/sheet/voice/commands/voice-command';
import { isVoiceMuted, onlyMuteWhile, onVoiceMuteChange, setVoiceMuted } from '../src/renderer/sheet/voice/voice-mute';

const FINAL: ParseOptions = { isSelectorOpen: false, isFinal: true };

function commandOf(text: string): VoiceCommand | null {
  return parseVoiceCommand(text, FINAL)?.command ?? null;
}

describe('mute by voice', () => {
  it.each(['Orbit mute', 'Orbit multi.', 'orbit muti', 'Arbit, Multi!', 'orbit mutar', 'Orbit mudo', 'orbitmulti'])('"%s" mutes', (text: string) => {
    expect(commandOf(text)).toEqual({ action: 'mute' });
  });

  it.each(['Orbit unmute', 'Orbit desmulti', 'orbit dismulti', 'Orbit des multi.', 'Orbit dis multi', 'orbit desmute', 'Arbit desmutar', 'Orbit an mute'])(
    '"%s" unmutes',
    (text: string) => {
      expect(commandOf(text)).toEqual({ action: 'unmute' });
    },
  );

  it('keeps what was said before it', () => {
    expect(parseVoiceCommand('corrige o bug, Orbit multi.', FINAL)).toEqual({ command: { action: 'mute' }, remainder: 'corrige o bug' });
  });

  it.each(['mute', 'Mute.', 'muti', 'mutar', 'corrige o bug, mute', 'multi'])('bare "%s" mutes after a pause', (text: string) => {
    expect(parseVoiceCommand(text, FINAL)).toMatchObject({ command: { action: 'mute' }, afterPauseMs: MUTE_PAUSE_MS });
  });

  it.each(['unmute', 'desmute', 'des multi', 'Dis Muti.'])('bare "%s" unmutes after a pause', (text: string) => {
    expect(parseVoiceCommand(text, FINAL)).toMatchObject({ command: { action: 'unmute' }, afterPauseMs: MUTE_PAUSE_MS });
  });

  it('leaves "multi" in an ordinary sentence alone', () => {
    expect(commandOf('o projeto é multi')).toBeNull();
    expect(commandOf('orbit multi tenant')).toBeNull();
  });

  it('tells its listeners only when it changes', () => {
    const heard: boolean[] = [];
    onVoiceMuteChange((muted: boolean) => heard.push(muted));
    setVoiceMuted(true);
    setVoiceMuted(true);
    expect(isVoiceMuted()).toBe(true);
    setVoiceMuted(false);
    expect(heard).toEqual([true, false]);
  });
});

// Just what the runner touches on a textarea.
class FakeInput extends EventTarget {
  value: string = '';
  form: { requestSubmit: () => void } | null = null;
  setSelectionRange(): void {}
}

function inputWith(text: string, sent: string[] = []): HTMLTextAreaElement {
  const input: FakeInput = new FakeInput();
  input.value = text;
  input.form = { requestSubmit: (): number => sent.push(input.value) };
  return input as unknown as HTMLTextAreaElement;
}

describe('when mute applies', () => {
  it('ignores mute while the always-on mic is off, so it never starts muted', () => {
    let isOn: boolean = false;
    onlyMuteWhile((): boolean => isOn);
    setVoiceMuted(true);
    expect(isVoiceMuted()).toBe(false);
    isOn = true;
    setVoiceMuted(true);
    expect(isVoiceMuted()).toBe(true);
    setVoiceMuted(false);
    onlyMuteWhile((): boolean => true);
  });
});

describe('running mute', () => {
  it('mutes from the composer and keeps the draft before the phrase', async () => {
    const { runVoiceCommand } = await import('../src/renderer/sheet/voice/voice-command-runner');
    setVoiceMuted(false);
    const input: HTMLTextAreaElement = inputWith('corrige o bug Orbit multi');
    expect(runVoiceCommand(input, true)).toBe(true);
    expect(input.value).toBe('corrige o bug');
    expect(isVoiceMuted()).toBe(true);
  });

  it('while muted, hears only unmute: no send, nothing else', async () => {
    const { runMutedVoiceCommand } = await import('../src/renderer/sheet/voice/voice-command-runner');
    setVoiceMuted(true);
    const sent: string[] = [];
    expect(runMutedVoiceCommand(inputWith('pode enviar, chinelo', sent), true)).toBe(false);
    expect(runMutedVoiceCommand(inputWith('orbit board', sent), true)).toBe(false);
    expect(sent).toEqual([]);
    expect(isVoiceMuted()).toBe(true);
    expect(runMutedVoiceCommand(inputWith('blá blá Orbit desmulti', sent), true)).toBe(true);
    expect(isVoiceMuted()).toBe(false);
  });

  it('a bare mute waits for the pause, then mutes and keeps the draft before it', async () => {
    vi.useFakeTimers();
    const { runVoiceCommand } = await import('../src/renderer/sheet/voice/voice-command-runner');
    setVoiceMuted(false);
    const input: HTMLTextAreaElement = inputWith('corrige o bug mute');
    expect(runVoiceCommand(input, true)).toBe(false);
    expect(isVoiceMuted()).toBe(false);
    vi.advanceTimersByTime(MUTE_PAUSE_MS);
    expect(input.value).toBe('corrige o bug');
    expect(isVoiceMuted()).toBe(true);
    vi.useRealTimers();
  });

  it('while muted, a bare mute said again unmutes after the pause', async () => {
    vi.useFakeTimers();
    const { runMutedVoiceCommand } = await import('../src/renderer/sheet/voice/voice-command-runner');
    setVoiceMuted(true);
    const input: HTMLTextAreaElement = inputWith('multi');
    expect(runMutedVoiceCommand(input, true)).toBe(false);
    expect(isVoiceMuted()).toBe(true);
    vi.advanceTimersByTime(MUTE_PAUSE_MS);
    expect(isVoiceMuted()).toBe(false);
    vi.useRealTimers();
  });

  it('while muted, Orbit mute again unmutes: it toggles', async () => {
    const { runMutedVoiceCommand } = await import('../src/renderer/sheet/voice/voice-command-runner');
    setVoiceMuted(true);
    const input: HTMLTextAreaElement = inputWith('Orbit multi');
    expect(runMutedVoiceCommand(input, true)).toBe(true);
    expect(input.value).toBe('');
    expect(isVoiceMuted()).toBe(false);
  });
});
