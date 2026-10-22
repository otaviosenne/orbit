import { describe, expect, it } from 'vitest';
import { parseVoiceCommand } from '../src/renderer/sheet/voice/commands/command-parser';
import type { ParseOptions, VoiceCommand } from '../src/renderer/sheet/voice/commands/voice-command';

const FINAL: ParseOptions = { isSelectorOpen: false, isFinal: true };
const LIVE: ParseOptions = { isSelectorOpen: false, isFinal: false };
const SELECTOR: ParseOptions = { isSelectorOpen: true, isFinal: true };

function commandOf(text: string, options: ParseOptions = FINAL): VoiceCommand | null {
  return parseVoiceCommand(text, options)?.command ?? null;
}

describe('view commands', () => {
  it.each([
    ['orbit board', 'board'],
    ['Orbit, panel.', 'grid'],
    ['orbit painel', 'grid'],
    ['Orbit timeline', 'timeline'],
    ['orbit list', 'list'],
    ['Orbit lista', 'list'],
    ['orbit settings', 'settings'],
    ['Orbit configurações', 'settings'],
  ])('"%s" opens %s', (text: string, view: string) => {
    expect(commandOf(text)).toEqual({ action: 'view', view });
  });

  it('takes the phrase off the draft and keeps the rest', () => {
    expect(parseVoiceCommand('fix the bug, orbit board.', FINAL)).toEqual({ command: { action: 'view', view: 'board' }, remainder: 'fix the bug' });
  });

  it('ignores a view word that does not end the draft or lacks "orbit"', () => {
    expect(commandOf('orbit board is a nice view')).toBeNull();
    expect(commandOf('show me the board')).toBeNull();
  });
});

describe('selector and panel commands', () => {
  it('opens New chat, Resume and cancels', () => {
    expect(commandOf('orbit new chat')).toEqual({ action: 'new-chat' });
    expect(commandOf('Orbit novo chat.')).toEqual({ action: 'new-chat' });
    expect(commandOf('orbit resume')).toEqual({ action: 'resume' });
    expect(commandOf('orbit retomar')).toEqual({ action: 'resume' });
    for (const word of ['cancelar', 'fechar', 'voltar']) expect(commandOf(`orbit ${word}`)).toEqual({ action: 'cancel' });
  });
});

describe('chat numbers', () => {
  it('chooses on "chat N", "orbit N" and "orbit chat N", with digits', () => {
    expect(commandOf('chat 3')).toEqual({ action: 'choose', number: 3 });
    expect(commandOf('Orbit 12.')).toEqual({ action: 'choose', number: 12 });
    expect(commandOf('orbit chat 7')).toEqual({ action: 'choose', number: 7 });
  });

  it('removes the whole phrase, "orbit" included', () => {
    expect(parseVoiceCommand('some words orbit chat 7', FINAL)?.remainder).toBe('some words');
    expect(parseVoiceCommand('some words, chat 7', FINAL)?.remainder).toBe('some words');
  });

  it('understands Portuguese and English words', () => {
    expect(commandOf('chat três')).toEqual({ action: 'choose', number: 3 });
    expect(commandOf('chat three')).toEqual({ action: 'choose', number: 3 });
    expect(commandOf('orbit onze')).toEqual({ action: 'choose', number: 11 });
    expect(commandOf('orbit chat vinte e um')).toEqual({ action: 'choose', number: 21 });
    expect(commandOf('chat twenty one')).toEqual({ action: 'choose', number: 21 });
    expect(commandOf('chat noventa e nove')).toEqual({ action: 'choose', number: 99 });
    expect(commandOf('chat sixty')).toEqual({ action: 'choose', number: 60 });
  });

  it('leaves out of range numbers and number-like words in a sentence alone', () => {
    expect(commandOf('chat 0')).toBeNull();
    expect(commandOf('chat 100')).toBeNull();
    expect(commandOf('chat three is great')).toBeNull();
    expect(commandOf('add a three')).toBeNull();
  });

  it('does not take a bare number for a command outside a selector', () => {
    expect(commandOf('3')).toBeNull();
    expect(commandOf('um dois três')).toBeNull();
  });

  it('waits for the final words when live words end in a tens word that may grow', () => {
    expect(commandOf('chat vinte', LIVE)).toBeNull();
    expect(commandOf('chat vinte', FINAL)).toEqual({ action: 'choose', number: 20 });
    expect(commandOf('chat vinte e um', LIVE)).toEqual({ action: 'choose', number: 21 });
    expect(commandOf('chat 20', LIVE)).toEqual({ action: 'choose', number: 20 });
  });
});

describe('numbers while a selector is open', () => {
  it('also picks on just the number when it is all that was said', () => {
    expect(commandOf('3', SELECTOR)).toEqual({ action: 'choose', number: 3 });
    expect(commandOf('Três.', SELECTOR)).toEqual({ action: 'choose', number: 3 });
    expect(commandOf('chat 3', SELECTOR)).toEqual({ action: 'choose', number: 3 });
  });

  it('keeps a number inside a sentence as text', () => {
    expect(commandOf('I need 3', SELECTOR)).toBeNull();
  });
});
