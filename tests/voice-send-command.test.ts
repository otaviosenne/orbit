import { describe, expect, it } from 'vitest';
import { parseVoiceCommand } from '../src/renderer/sheet/voice/commands/command-parser';
import type { ParseOptions, SpokenCommand, VoiceCommand } from '../src/renderer/sheet/voice/commands/voice-command';

const FINAL: ParseOptions = { isSelectorOpen: false, isFinal: true };

function commandOf(text: string, options: ParseOptions = FINAL): VoiceCommand | null {
  return parseVoiceCommand(text, options)?.command ?? null;
}

// What is left of the draft when it is sent, or null when it does not end with the send command.
function sentText(text: string): string | null {
  const spoken: SpokenCommand | null = parseVoiceCommand(text, FINAL);
  return spoken?.command.action === 'send' ? spoken.remainder : null;
}

describe('the send command', () => {
  it('sends on "chinelo" at the end, in any case and punctuation', () => {
    expect(sentText('corrige o bug chinelo')).toBe('corrige o bug');
    expect(sentText('Corrige o bug. Chinelo.')).toBe('Corrige o bug');
    expect(sentText('corrige o bug, CHINELO!')).toBe('corrige o bug');
  });

  it('drops both words when it is said twice', () => {
    expect(sentText('faz o deploy. Chinelo, chinelo.')).toBe('faz o deploy');
  });

  it('sends on "Orbit enviar", in any case and punctuation', () => {
    expect(sentText('corrige o bug, Orbit enviar')).toBe('corrige o bug');
    expect(sentText('Corrige o bug. Orbit, enviar.')).toBe('Corrige o bug');
  });

  it('sends on the known mis-transcriptions of "Orbit enviar"', () => {
    expect(sentText('corrige o bug OrbitInVR')).toBe('corrige o bug');
    expect(sentText('Corrige o bug. OrbitInVR.')).toBe('Corrige o bug');
    expect(sentText('corrige o bug, orbit in VR')).toBe('corrige o bug');
    expect(sentText('corrige o bug orbit in V R')).toBe('corrige o bug');
    expect(sentText('corrige o bug Orbit VR')).toBe('corrige o bug');
    expect(sentText('corrige o bug Orbit em VR')).toBe('corrige o bug');
    expect(sentText('corrige o bug Orbiting VR')).toBe('corrige o bug');
    expect(sentText('corrige o bug RBTVR')).toBe('corrige o bug');
    expect(sentText('Corrige o bug. Orbiting, VR.')).toBe('Corrige o bug');
    expect(sentText('Corrige o bug. Orbit, em VR.')).toBe('Corrige o bug');
    expect(sentText('Corrige o bug. Orbit, VR.')).toBe('Corrige o bug');
    expect(sentText('corrige o bug orbitvr')).toBe('corrige o bug');
    expect(sentText('Corrige o bug, Orbit, In, VR!')).toBe('Corrige o bug');
  });

  it('sends on "flip", "flipper" and "flippa" as whole words', () => {
    expect(sentText('corrige o bug flip')).toBe('corrige o bug');
    expect(sentText('Corrige o bug. Flip!')).toBe('Corrige o bug');
    expect(sentText('corrige o bug, flipper.')).toBe('corrige o bug');
    expect(sentText('corrige o bug Flippa')).toBe('corrige o bug');
    expect(sentText('corrige o bug flipping')).toBeNull();
    expect(sentText('corrige o bug flipped')).toBeNull();
    expect(sentText('flip the switch and go on')).toBeNull();
  });

  it('does not send on near misses of the mis-transcriptions', () => {
    expect(sentText('corrige o bug orbit vrs')).toBeNull();
    expect(sentText('corrige o bug orbit')).toBeNull();
    expect(sentText('corrige o bug vr')).toBeNull();
    expect(sentText('corrige o bug orbit in')).toBeNull();
  });

  it('does not send on "enviar" alone, nor on "Orbit" in the middle', () => {
    expect(sentText('corrige o bug, enviar')).toBeNull();
    expect(sentText('o Orbit enviar é um comando')).toBeNull();
    expect(sentText('o orbit in vr headset é caro')).toBeNull();
  });

  it('leaves "chinelo" in the middle of a sentence alone', () => {
    expect(sentText('comprei um chinelo novo')).toBeNull();
  });

  it('sends an empty draft when the command is all that was said', () => {
    expect(sentText('Chinelo.')).toBe('');
    expect(sentText('OrbitInVR')).toBe('');
  });
});

describe('the clear command', () => {
  it('clears on "Orbit clear", "Orbit limpar" or "chat clear", whatever the case and punctuation', () => {
    expect(commandOf('texto que eu não quero. Orbit, clear.')).toEqual({ action: 'clear' });
    expect(commandOf('outra coisa chat clear')).toEqual({ action: 'clear' });
    expect(commandOf('outra coisa. Orbit limpar!')).toEqual({ action: 'clear' });
  });

  it('ignores "clear" in the middle of a sentence', () => {
    expect(commandOf('clear the cache and chat clear it later')).toBeNull();
  });
});
