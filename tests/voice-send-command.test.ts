import { describe, expect, it } from 'vitest';
import { stripSendCommand } from '../src/renderer/sheet/voice/send-command';

describe('stripSendCommand', () => {
  it('sends on a single "enviar" at the end, in any case and punctuation', () => {
    expect(stripSendCommand('corrige o bug enviar')).toBe('corrige o bug');
    expect(stripSendCommand('Corrige o bug. Enviar.')).toBe('Corrige o bug');
    expect(stripSendCommand('corrige o bug, ENVIAR!')).toBe('corrige o bug');
  });

  it('drops every word of the longer spoken forms', () => {
    expect(stripSendCommand('faz o deploy. Enviar, enviar.')).toBe('faz o deploy');
    expect(stripSendCommand('faz o deploy, pode enviar')).toBe('faz o deploy');
    expect(stripSendCommand('faz o deploy. Enviar, pode enviar.')).toBe('faz o deploy');
  });

  it('ignores accents dictation adds', () => {
    expect(stripSendCommand('ok enviár')).toBe('ok');
  });

  it('leaves "enviar" in the middle of a sentence alone', () => {
    expect(stripSendCommand('quero enviar o arquivo')).toBeNull();
    expect(stripSendCommand('enviar é o comando que eu uso')).toBeNull();
  });

  it('sends an empty draft when the command is all that was said', () => {
    expect(stripSendCommand('Enviar.')).toBe('');
  });
});
