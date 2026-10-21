import { describe, expect, it } from 'vitest';
import { stripSendCommand } from '../src/renderer/sheet/voice/send-command';

describe('stripSendCommand', () => {
  it('sends on "enviar enviar" in any case and punctuation', () => {
    expect(stripSendCommand('corrige o bug enviar enviar')).toBe('corrige o bug');
    expect(stripSendCommand('Corrige o bug. Enviar, enviar.')).toBe('Corrige o bug');
    expect(stripSendCommand('corrige o bug, ENVIAR. ENVIAR!')).toBe('corrige o bug');
  });

  it('sends on "enviar pode enviar"', () => {
    expect(stripSendCommand('faz o deploy. Enviar, pode enviar.')).toBe('faz o deploy');
  });

  it('ignores accents dictation adds', () => {
    expect(stripSendCommand('ok énviar enviár')).toBe('ok');
  });

  it('leaves a single "enviar" alone', () => {
    expect(stripSendCommand('quero enviar o arquivo')).toBeNull();
    expect(stripSendCommand('pode enviar')).toBeNull();
  });

  it('only acts at the end of the draft', () => {
    expect(stripSendCommand('enviar enviar é o comando que eu uso')).toBeNull();
  });

  it('sends an empty draft when the command is all that was said', () => {
    expect(stripSendCommand('Enviar, enviar.')).toBe('');
  });
});
