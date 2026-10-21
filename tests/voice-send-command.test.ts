import { describe, expect, it } from 'vitest';
import { stripSendCommand } from '../src/renderer/sheet/voice/send-command';

describe('stripSendCommand', () => {
  it('sends on "chinelo" at the end, in any case and punctuation', () => {
    expect(stripSendCommand('corrige o bug chinelo')).toBe('corrige o bug');
    expect(stripSendCommand('Corrige o bug. Chinelo.')).toBe('Corrige o bug');
    expect(stripSendCommand('corrige o bug, CHINELO!')).toBe('corrige o bug');
  });

  it('drops both words when it is said twice', () => {
    expect(stripSendCommand('faz o deploy. Chinelo, chinelo.')).toBe('faz o deploy');
  });

  it('no longer sends on "enviar"', () => {
    expect(stripSendCommand('corrige o bug, enviar')).toBeNull();
  });

  it('leaves "chinelo" in the middle of a sentence alone', () => {
    expect(stripSendCommand('comprei um chinelo novo')).toBeNull();
  });

  it('sends an empty draft when the command is all that was said', () => {
    expect(stripSendCommand('Chinelo.')).toBe('');
  });
});
