import { describe, expect, it } from 'vitest';
import { MAX_NAME_LENGTH, colorCommand, messageText, renameCommand } from '../src/main/chat-command-text';

describe('renameCommand', () => {
  it('keeps the name on one line so it cannot submit extra input', () => {
    expect(renameCommand('  STORIES\n/clear  ')).toBe('/rename STORIES /clear');
  });

  it('rejects empty names and caps long ones', () => {
    expect(renameCommand('   ')).toBeNull();
    expect(renameCommand('x'.repeat(MAX_NAME_LENGTH + 10))).toBe(`/rename ${'x'.repeat(MAX_NAME_LENGTH)}`);
  });
});

describe('colorCommand', () => {
  it('accepts only the colors /color knows', () => {
    expect(colorCommand('pink')).toBe('/color pink');
    expect(colorCommand('magenta; rm')).toBeNull();
  });
});

describe('messageText', () => {
  it('trims the message and rejects blank ones', () => {
    expect(messageText('  oi\n')).toBe('oi');
    expect(messageText('\n ')).toBeNull();
  });
});
