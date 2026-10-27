import { describe, expect, it } from 'vitest';
import { parseVoiceCommand } from '../src/renderer/sheet/voice/commands/command-parser';
import type { ParseOptions, VoiceCommand } from '../src/renderer/sheet/voice/commands/voice-command';
import { isWakeWord } from '../src/renderer/sheet/voice/commands/wake-word';

const FINAL: ParseOptions = { isSelectorOpen: false, isFinal: true };

function commandOf(text: string): VoiceCommand | null {
  return parseVoiceCommand(text, FINAL)?.command ?? null;
}

const MISHEARD: readonly string[] = ['arbit', 'Arbit', 'orbitt', 'orbite', 'orbita', 'urbit', 'orbit,', 'arbitinho', 'arbitrinho', 'orbiting', 'rbt', 'or bit', 'ar bit', 'orb it'];

describe('the wake word', () => {
  it.each(MISHEARD)('"%s" is read as Orbit', (word: string) => {
    expect(commandOf(`${word} board`)).toEqual({ action: 'view', view: 'board' });
  });

  it('works for every command, not just one', () => {
    expect(commandOf('arbit list')).toEqual({ action: 'view', view: 'list' });
    expect(commandOf('arbit new chat')).toEqual({ action: 'new-chat' });
    expect(commandOf('arbit resume')).toEqual({ action: 'resume' });
    expect(commandOf('arbit cancelar')).toEqual({ action: 'cancel' });
    expect(commandOf('arbit limpar')).toEqual({ action: 'clear' });
    expect(commandOf('arbit enviar')).toEqual({ action: 'send' });
    expect(commandOf('arbit 3')).toEqual({ action: 'choose', number: 3 });
    expect(commandOf('arbit chat 3')).toEqual({ action: 'choose', number: 3 });
  });

  it('keeps the draft before the heard name', () => {
    expect(parseVoiceCommand('fix the bug, arbit suspende.', FINAL)).toEqual({ command: { action: 'suspend' }, remainder: 'fix the bug' });
  });

  it('leaves ordinary words alone', () => {
    for (const word of ['habit', 'bit', 'orbital', 'arbitrary', 'arbitration', 'rabbit']) expect(isWakeWord(word)).toBe(false);
    expect(commandOf('a bad habit board')).toBeNull();
    expect(commandOf('it is arbitrary board')).toBeNull();
  });
});

describe('suspend and pin commands', () => {
  it.each([
    ['orbit suspend', 'suspend'],
    ['Orbit suspende.', 'suspend'],
    ['orbit suspender', 'suspend'],
    ['arbit suspende', 'suspend'],
    ['orbit pin', 'pin'],
    ['orbit pinar', 'pin'],
    ['orbit fixar', 'pin'],
    ['arbit pin', 'pin'],
    ['orbit unpin', 'unpin'],
    ['orbit desafixar', 'unpin'],
  ])('"%s" is %s', (text: string, action: string) => {
    expect(commandOf(text)).toEqual({ action });
  });

  it('needs the name before it, so ordinary talk about pins stays text', () => {
    expect(commandOf('please pin it')).toBeNull();
    expect(commandOf('we should suspend the account')).toBeNull();
  });
});
